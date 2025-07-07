import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";
import { elysiaHelmet } from "elysiajs-helmet";
import { rateLimit } from "elysia-rate-limit";
import { initDatabase } from "./src/database/init";
import { getDbStats } from "./src/database/schema";
import { languageQueries, userQueries, voteQueries, dbUtils } from "./src/database/queries";
import { db } from "./src/database/database";
import { GitHubAuth } from "./src/auth/github";
import { jwtConfig, cookieConfig, createSessionToken, verifySessionToken, requireAuth } from "./src/auth/session";
import { VoteService } from "./src/services/voteService";
import { requireAdmin } from "./src/middleware/admin";
import { createDatabaseBackup } from "./src/utils/backup";

const isDevelopment = process.env.NODE_ENV !== "production";

// Inicializar base de datos al arrancar
initDatabase();

// Configurar GitHub OAuth
const githubAuth = new GitHubAuth({
  clientId: process.env.GITHUB_CLIENT_ID || 'your-github-client-id',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret',
  redirectUri: `${process.env.BASE_URL || 'http://localhost:3000'}/app/auth/callback`,
});

const app = new Elysia()
	.use(
		elysiaHelmet({
			csp: isDevelopment
				? {
						defaultSrc: ["'self'"],
						styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
						scriptSrc: ["'self'", "'unsafe-eval'"], // Necesario para Alpine.js en desarrollo
						imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com"],
						connectSrc: ["'self'"],
						fontSrc: ["'self'", "https://fonts.gstatic.com"],
						objectSrc: ["'none'"],
						frameSrc: ["'none'"],
					}
				: {
						defaultSrc: ["'self'"],
						styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
						scriptSrc: ["'self'", "'unsafe-eval'"], // Necesario para Alpine.js también en producción
						imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com"],
						connectSrc: ["'self'"],
						fontSrc: ["'self'", "https://fonts.gstatic.com"],
						objectSrc: ["'none'"],
						frameSrc: ["'none'"],
					},
		}),
	)
	.use(
		rateLimit({
			max: isDevelopment ? 1000 : 100, // Más permisivo en desarrollo
			duration: 15 * 60 * 1000, // 15 minutes
			headers: true,
		}),
	)
	.use(cors())
	.use(jwt(jwtConfig))
	.use(cookie({
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 7 * 24 * 60 * 60, // 7 días
		path: '/',
	}))
	.use(swagger())
	// Middleware de autenticación
	.derive(async ({ headers, cookie, jwt }) => {
		const token = cookie?.auth_token?.value;
		let user = null;

		// Debug logs removidos para limpiar consola

		if (token && typeof token === 'string') {
			user = await verifySessionToken(token, jwt);
		}

		return { user };
	})
	.use(
		staticPlugin({
			assets: "frontend/dist",
			prefix: "/",
		}),
	)
	.get("/", () => Bun.file("frontend/public/index.html"))
	.group("/app", (app) =>
		app
			.get("/health", () => ({
				status: "ok",
				timestamp: new Date().toISOString(),
				database: getDbStats(),
				current_month: dbUtils.getCurrentMonth(),
				stats: voteQueries.getCurrentMonthStats(),
			}))
			
			// Endpoints para ranking dinámico
			.get("/languages", () => {
				const completeRanking = dbUtils.getCompleteRanking();
				return {
					top20: completeRanking.slice(0, 20),
					additional: completeRanking.slice(20),
					total: completeRanking.length
				};
			})
			
			.get("/languages/all", () => languageQueries.getAllLanguagesRanked())
			
			.get("/languages/top/:limit", ({ params }: { params: any }) => {
				const limit = parseInt(params.limit) || 20;
				return languageQueries.getTopLanguages(limit);
			})
			
			.get("/languages/:id", ({ params }: { params: any }) => {
				const language = languageQueries.getLanguageById(parseInt(params.id));
				if (!language) {
					throw new Error("Language not found");
				}
				return language;
			})
			
			// Endpoint para obtener ranking actual
			.get("/ranking", () => ({
				month: dbUtils.getCurrentMonth(),
				ranking: dbUtils.getTopRankingWithStats(20),
				stats: voteQueries.getCurrentMonthStats(),
			}))
			
			// Endpoints de prueba para usuarios (mock)
			.post("/test/create-user", ({ body }: { body: any }) => {
				const { githubId, username, avatarUrl } = body;
				if (!githubId || !username) {
					throw new Error("githubId and username are required");
				}
				
				const user = userQueries.upsertUser(githubId, username, avatarUrl);
				return { success: true, user };
			})
			
			.get("/test/user/:githubId", ({ params }: { params: any }) => {
				const user = userQueries.getUserByGithubId(parseInt(params.githubId));
				if (!user) {
					throw new Error("User not found");
				}
				return user;
			})
			
			// Endpoints de autenticación
			.get("/auth/login", ({ query }) => {
				const state = crypto.randomUUID();
				const authUrl = githubAuth.getAuthUrl(state);
				
				// En un sistema real, guardaríamos el state en una sesión temporal
				// Por simplicidad, lo omitimos por ahora
				
				return Response.redirect(authUrl, 302);
			})
			
			.get("/auth/callback", async ({ query, cookie, jwt }) => {
				try {
					const { code } = query as { code?: string };
					
					if (!code) {
						throw new Error("No authorization code received");
					}
					
					// Autenticar usuario con GitHub
					const githubUser = await githubAuth.authenticateUser(code);
					
					// Crear o actualizar usuario en nuestra base de datos
					const user = userQueries.upsertUser(
						githubUser.id,
						githubUser.login,
						githubUser.avatar_url
					);
					
					// Crear token JWT
					const token = await createSessionToken(user, jwt);
					
					// Establecer cookie de autenticación
					cookie.auth_token.value = token;
					cookie.auth_token.httpOnly = true;
					cookie.auth_token.secure = process.env.NODE_ENV === 'production';
					cookie.auth_token.sameSite = 'lax';
					cookie.auth_token.maxAge = 7 * 24 * 60 * 60; // 7 días
					cookie.auth_token.path = '/';
					
					// Redirigir a la página principal
					return Response.redirect("/", 302);
					
				} catch (error) {
					console.error("Auth callback error:", error);
					return Response.redirect("/?error=auth_failed", 302);
				}
			})
			
			.post("/auth/logout", ({ cookie }) => {
				// Limpiar cookie de autenticación configurándola para que expire
				cookie.auth_token.value = '';
				cookie.auth_token.httpOnly = true;
				cookie.auth_token.secure = process.env.NODE_ENV === 'production';
				cookie.auth_token.sameSite = 'lax';
				cookie.auth_token.maxAge = 0; // Expira inmediatamente
				cookie.auth_token.path = '/';
				
				return { success: true, message: "Logged out successfully" };
			})
			
			.get("/auth/me", ({ user }) => {
				if (!user) {
					return { authenticated: false };
				}
				
				return {
					authenticated: true,
					user: {
						id: user.userId,
						githubId: user.githubId,
						username: user.username,
						avatarUrl: user.avatarUrl,
					}
				};
			})
			
			.get("/user/votes", ({ user }) => {
				try {
					if (!user) {
						throw new Error("Authentication required");
					}
					
					const authenticatedUser = user;
					const month = dbUtils.getCurrentMonth();
					
					// Obtener votos del usuario para el mes actual
					const votes = voteQueries.getUserMonthlyVotes(authenticatedUser.userId, month);
					const monthlyPoints = voteQueries.getUserMonthlyPoints(authenticatedUser.userId, month);
					
					// Convertir a formato que espera el frontend
					const votePoints: Record<number, number> = {};
					votes.forEach(vote => {
						votePoints[vote.language_id] = vote.points;
					});
					
					return {
						votePoints,
						totalPoints: monthlyPoints.total_points,
						remainingPoints: 10 - monthlyPoints.total_points,
						votesCount: monthlyPoints.votes_count,
						month
					};
				} catch (error) {
					throw error;
				}
			})
			
			// Endpoint para votar (requiere autenticación)
			.post("/vote", ({ body, user, set }: { body: any; user: any; set: any }) => {
				if (!user) {
					set.status = 401;
					return { error: "Authentication required" };
				}
				const authenticatedUser = user;
				const { languageId, points } = body;
				const month = dbUtils.getCurrentMonth();
				
				if (!languageId || !points) {
					set.status = 400;
					return { error: "languageId and points are required" };
				}
				
				// Validar voto usando el nuevo sistema acumulativo
				const validation = VoteService.validateAddVote(authenticatedUser.userId, languageId, points, month);
				if (!validation.isValid) {
					set.status = 400;
					return { error: validation.error };
				}
				
				try {
					// Agregar voto (sistema acumulativo)
					const vote = voteQueries.addVote(authenticatedUser.userId, languageId, points, month);
					
					// Actualizar total de votos del lenguaje
					languageQueries.updateLanguageVotes(languageId);
					
					// Calcular puntos restantes
					const newMonthlyPoints = voteQueries.getUserMonthlyPoints(authenticatedUser.userId, month);
					const remainingPoints = 10 - newMonthlyPoints.total_points;
					
					// Calcular puntos actuales del lenguaje
					const languageVotes = voteQueries.getUserMonthlyVotes(authenticatedUser.userId, month)
						.filter(v => v.language_id === languageId);
					const languagePoints = languageVotes.reduce((sum, v) => sum + v.points, 0);
					
					return {
						success: true,
						message: `Added ${points} points! Language now has ${languagePoints} points.`,
						vote: {
							id: vote.id,
							userId: vote.user_id,
							languageId: vote.language_id,
							points: vote.points,
							month: vote.vote_month
						},
						remaining_points: remainingPoints,
						language_total_points: languagePoints
					};
				} catch (error) {
					console.error("Error recording vote:", error);
					set.status = 500;
					return { error: "Failed to record vote. Please try again." };
				}
			})
			
			// Endpoint para simular votación (mock - solo para desarrollo)
			.post("/test/vote", ({ body }: { body: any }) => {
				if (!isDevelopment) {
					throw new Error("Test endpoints only available in development");
				}
				
				const { userId, languageId, points } = body;
				const month = dbUtils.getCurrentMonth();
				
				if (!userId || !languageId || !points) {
					throw new Error("userId, languageId and points are required");
				}
				
				if (points < 1 || points > 5) {
					throw new Error("Points must be between 1 and 5");
				}
				
				// Verificar si ya votó por este lenguaje este mes
				if (!voteQueries.canUserVoteForLanguage(userId, languageId, month)) {
					throw new Error("User already voted for this language this month");
				}
				
				// Verificar puntos disponibles
				const monthlyPoints = voteQueries.getUserMonthlyPoints(userId, month);
				if (monthlyPoints.total_points + points > 10) {
					throw new Error(`Not enough points. Used: ${monthlyPoints.total_points}/10`);
				}
				
				// Insertar voto (mock - sin todas las validaciones aún)
				return {
					success: true,
					message: "Vote would be recorded",
					vote: { userId, languageId, points, month },
					remaining_points: 10 - monthlyPoints.total_points - points
				};
			})
			
			// Endpoints de administración
			.group("/admin", (app) =>
				app
					.get("/backup", async ({ headers }) => {
						try {
							// Verificar autenticación de admin
							const adminApiKey = process.env.ADMIN_API_KEY;
							if (!adminApiKey) {
								throw new Error('Admin API key not configured');
							}
							
							const authHeader = headers.authorization;
							if (!authHeader) {
								throw new Error('Authorization header required');
							}
							
							const [scheme, token] = authHeader.split(' ');
							if (scheme !== 'Bearer' || !token || token !== adminApiKey) {
								throw new Error('Invalid admin API key');
							}
							
							// Crear backup
							const backup = await createDatabaseBackup();
							
							// Retornar archivo comprimido
							return new Response(backup.data, {
								headers: {
									'Content-Type': 'application/gzip',
									'Content-Disposition': `attachment; filename="${backup.filename}"`,
									'Content-Length': backup.data.length.toString(),
									'X-Backup-Timestamp': backup.metadata.timestamp,
									'X-Backup-Version': backup.metadata.version,
									'X-Backup-Records': JSON.stringify(backup.metadata.recordCount),
								}
							});
						} catch (error) {
							console.error('Backup error:', error);
							return {
								error: 'Backup failed',
								message: error instanceof Error ? error.message : 'Unknown error'
							};
						}
					})
					
					.get("/stats", async ({ headers }) => {
						try {
							// Verificar autenticación de admin
							const adminApiKey = process.env.ADMIN_API_KEY;
							if (!adminApiKey) {
								throw new Error('Admin API key not configured');
							}
							
							const authHeader = headers.authorization;
							if (!authHeader) {
								throw new Error('Authorization header required');
							}
							
							const [scheme, token] = authHeader.split(' ');
							if (scheme !== 'Bearer' || !token || token !== adminApiKey) {
								throw new Error('Invalid admin API key');
							}
							
							// Obtener estadísticas detalladas
							const stats = getDbStats();
							const currentMonth = dbUtils.getCurrentMonth();
							const monthlyStats = voteQueries.getCurrentMonthStats();
							
							return {
								timestamp: new Date().toISOString(),
								environment: process.env.NODE_ENV || 'development',
								database: stats,
								current_month: currentMonth,
								monthly_stats: monthlyStats,
								system: {
									platform: process.platform,
									version: process.version,
									uptime: process.uptime()
								}
							};
						} catch (error) {
							console.error('Stats error:', error);
							return {
								error: 'Stats failed',
								message: error instanceof Error ? error.message : 'Unknown error'
							};
						}
					})
			),
	)
	.listen(process.env.PORT ?? 3000);

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
