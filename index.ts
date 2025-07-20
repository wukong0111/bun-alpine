import { cookie } from "@elysiajs/cookie";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { elysiaHelmet } from "elysiajs-helmet";
import { GitHubAuth } from "./src/auth/github";
import {
	createSessionToken,
	jwtConfig,
	verifySessionToken,
} from "./src/auth/session";
import { initDatabase } from "./src/database/init";
import {
	dbUtils,
	languageQueries,
	userQueries,
	voteQueries,
} from "./src/database/queries";
import { getDbStats } from "./src/database/schema";
import { validateAddVote } from "./src/services/voteService";
// import { createDatabaseBackup } from "./src/utils/backup"; // Disabled for PostgreSQL server

const isDevelopment = process.env.NODE_ENV !== "production";

// Interfaces para tipos
interface ElysiaContext {
	body: { languageId: number; points: number };
	user: {
		userId: number;
		githubId: number;
		username: string;
		avatarUrl?: string;
	} | null;
	set: {
		status: number;
	};
}

// Inicializar base de datos al arrancar
initDatabase();

// Configurar GitHub OAuth
const githubAuth = new GitHubAuth({
	clientId: process.env.GITHUB_CLIENT_ID || "your-github-client-id",
	clientSecret: process.env.GITHUB_CLIENT_SECRET || "your-github-client-secret",
	redirectUri: `${process.env.BASE_URL || "http://localhost:3000"}/app/auth/callback`,
});

const app = new Elysia()
	.use(
		elysiaHelmet({
			csp: isDevelopment
				? {
						defaultSrc: ["'self'"],
						styleSrc: [
							"'self'",
							"'unsafe-inline'",
							"https://fonts.googleapis.com",
						],
						scriptSrc: ["'self'", "'unsafe-eval'"], // Necesario para Alpine.js en desarrollo
						imgSrc: [
							"'self'",
							"data:",
							"https://avatars.githubusercontent.com",
						],
						connectSrc: ["'self'"],
						fontSrc: ["'self'", "https://fonts.gstatic.com"],
						objectSrc: ["'none'"],
						frameSrc: ["'none'"],
					}
				: {
						defaultSrc: ["'self'"],
						styleSrc: [
							"'self'",
							"'unsafe-inline'",
							"https://fonts.googleapis.com",
						],
						scriptSrc: ["'self'", "'unsafe-eval'"], // Necesario para Alpine.js también en producción
						imgSrc: [
							"'self'",
							"data:",
							"https://avatars.githubusercontent.com",
						],
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
	.use(
		cookie({
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 7 * 24 * 60 * 60, // 7 días
			path: "/",
		}),
	)
	.use(swagger())
	// Middleware de autenticación
	.derive(async ({ cookie, jwt }) => {
		const token = cookie?.auth_token?.value;
		let user = null;

		// Debug logs removidos para limpiar consola

		if (token && typeof token === "string") {
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
			.get("/health", async () => ({
				status: "ok",
				timestamp: new Date().toISOString(),
				database: await getDbStats(),
				current_month: dbUtils.getCurrentMonth(),
				stats: await voteQueries.getCurrentMonthStats(),
			}))

			// Endpoints para ranking dinámico
			.get("/languages", async () => {
				const completeRanking = await dbUtils.getCompleteRanking();
				return {
					top20: completeRanking.slice(0, 20),
					additional: completeRanking.slice(20),
					total: completeRanking.length,
				};
			})

			.get("/languages/all", async () => await languageQueries.getAllLanguagesRanked())

			.get(
				"/languages/top/:limit",
				({ params }: { params: { limit: string } }) => {
					const limit = parseInt(params.limit) || 20;
					return languageQueries.getTopLanguages(limit);
				},
			)

			.get("/languages/:id", ({ params }: { params: { id: string } }) => {
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
			.post(
				"/test/create-user",
				({
					body,
				}: {
					body: { githubId: number; username: string; avatarUrl?: string };
				}) => {
					const { githubId, username, avatarUrl } = body;
					if (!githubId || !username) {
						throw new Error("githubId and username are required");
					}

					const user = userQueries.upsertUser(githubId, username, avatarUrl);
					return { success: true, user };
				},
			)

			.get(
				"/test/user/:githubId",
				({ params }: { params: { githubId: string } }) => {
					const user = userQueries.getUserByGithubId(parseInt(params.githubId));
					if (!user) {
						throw new Error("User not found");
					}
					return user;
				},
			)

			// Endpoints de autenticación
			.get("/auth/login", () => {
				const state = crypto.randomUUID();
				const authUrl = githubAuth.getAuthUrl(state);

				// En un sistema real, guardaríamos el state en una sesión temporal
				// Por simplicidad, lo omitimos por ahora

				return Response.redirect(authUrl, 302);
			})

			.get("/auth/callback", async ({ query, cookie, jwt }: { query: Record<string, string>; cookie: any; jwt: any }) => {
				try {
					const { code } = query as { code?: string };

					if (!code) {
						throw new Error("No authorization code received");
					}

					// Autenticar usuario con GitHub
					const githubUser = await githubAuth.authenticateUser(code);

					// Crear o actualizar usuario en nuestra base de datos
					const user = await userQueries.upsertUser(
						githubUser.id,
						githubUser.login,
						githubUser.avatar_url,
					);

					// Crear token JWT
					const token = await createSessionToken(user, jwt);

					// Establecer cookie de autenticación
					cookie.auth_token.value = token;
					cookie.auth_token.httpOnly = true;
					cookie.auth_token.secure = process.env.NODE_ENV === "production";
					cookie.auth_token.sameSite = "lax";
					cookie.auth_token.maxAge = 7 * 24 * 60 * 60; // 7 días
					cookie.auth_token.path = "/";

					// Redirigir a la página principal
					return Response.redirect("/", 302);
				} catch (error) {
					console.error("Auth callback error:", error);
					return Response.redirect("/?error=auth_failed", 302);
				}
			})

			.post("/auth/logout", ({ cookie }: { cookie: any }) => {
				// Limpiar cookie de autenticación configurándola para que expire
				cookie.auth_token.value = "";
				cookie.auth_token.httpOnly = true;
				cookie.auth_token.secure = process.env.NODE_ENV === "production";
				cookie.auth_token.sameSite = "lax";
				cookie.auth_token.maxAge = 0; // Expira inmediatamente
				cookie.auth_token.path = "/";

				return { success: true, message: "Logged out successfully" };
			})

			.get("/auth/me", ({ user }: { user: any }) => {
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
					},
				};
			})

			.get("/user/votes", async ({ user }: { user: any }) => {
				if (!user) {
					throw new Error("Authentication required");
				}

				const authenticatedUser = user;
				const month = dbUtils.getCurrentMonth();

				// Obtener votos del usuario para el mes actual
				const votes = await voteQueries.getUserMonthlyVotes(
					authenticatedUser.userId,
					month,
				);
				const monthlyPoints = await voteQueries.getUserMonthlyPoints(
					authenticatedUser.userId,
					month,
				);

				// Convertir a formato que espera el frontend
				const votePoints: Record<number, number> = {};
				votes.forEach((vote: { language_id: number; points: number }) => {
					votePoints[vote.language_id] = vote.points;
				});

				return {
					votePoints,
					totalPoints: monthlyPoints.total_points,
					remainingPoints: 10 - monthlyPoints.total_points,
					votesCount: monthlyPoints.votes_count,
					month,
				};
			})

			// Endpoint para votar (requiere autenticación)
			.post(
				"/vote",
				async ({
					body,
					user,
					set,
				}: ElysiaContext) => {
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
					const validation = await validateAddVote(
						authenticatedUser.userId,
						languageId,
						points,
						month,
					);
					if (!validation.isValid) {
						set.status = 400;
						return { error: validation.error };
					}

					try {
						// Agregar voto (sistema acumulativo)
						const vote = await voteQueries.addVote(
							authenticatedUser.userId,
							languageId,
							points,
							month,
						);

						// Actualizar total de votos del lenguaje
						languageQueries.updateLanguageVotes(languageId);

						// Calcular puntos restantes
						const newMonthlyPoints = await voteQueries.getUserMonthlyPoints(
							authenticatedUser.userId,
							month,
						);
						const remainingPoints = 10 - newMonthlyPoints.total_points;

						// Calcular puntos actuales del lenguaje
						const allLanguageVotes = await voteQueries.getUserMonthlyVotes(authenticatedUser.userId, month);
						const languageVotes = allLanguageVotes.filter((v: { language_id: number }) => v.language_id === languageId);
						const languagePoints = languageVotes.reduce(
							(sum: number, v: { points: number }) => sum + v.points,
							0,
						);

						return {
							success: true,
							message: `Added ${points} points! Language now has ${languagePoints} points.`,
							vote: {
								id: (vote as { id: number }).id,
								userId: (vote as { user_id: number }).user_id,
								languageId: (vote as { language_id: number }).language_id,
								points: (vote as { points: number }).points,
								month: (vote as { vote_month: string }).vote_month,
							},
							remaining_points: remainingPoints,
							language_total_points: languagePoints,
						};
					} catch (error) {
						console.error("Error recording vote:", error);
						set.status = 500;
						return { error: "Failed to record vote. Please try again." };
					}
				},
			)

			// Endpoint para simular votación (mock - solo para desarrollo)
			.post(
				"/test/vote",
				async ({
					body,
				}: {
					body: { languageId: number; points: number; userId: number };
				}) => {
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
					if (!(await voteQueries.canUserVoteForLanguage(userId, languageId, month))) {
						throw new Error("User already voted for this language this month");
					}

					// Verificar puntos disponibles
					const monthlyPoints = await voteQueries.getUserMonthlyPoints(userId, month);
					if (monthlyPoints.total_points + points > 10) {
						throw new Error(
							`Not enough points. Used: ${monthlyPoints.total_points}/10`,
						);
					}

					// Insertar voto (mock - sin todas las validaciones aún)
					return {
						success: true,
						message: "Vote would be recorded",
						vote: { userId, languageId, points, month },
						remaining_points: 10 - monthlyPoints.total_points - points,
					};
				},
			)

			// Endpoints de administración
			.group("/admin", (app) =>
				app
					// Backup endpoint disabled for PostgreSQL server setup - use pg_dump directly on server

					.get("/stats", async ({ headers }: { headers: Record<string, string> }) => {
						try {
							// Verificar autenticación de admin
							const adminApiKey = process.env.ADMIN_API_KEY;
							if (!adminApiKey) {
								throw new Error("Admin API key not configured");
							}

							const authHeader = headers.authorization;
							if (!authHeader) {
								throw new Error("Authorization header required");
							}

							const [scheme, token] = authHeader.split(" ");
							if (scheme !== "Bearer" || !token || token !== adminApiKey) {
								throw new Error("Invalid admin API key");
							}

							// Obtener estadísticas detalladas
							const stats = await getDbStats();
							const currentMonth = dbUtils.getCurrentMonth();
							const monthlyStats = await voteQueries.getCurrentMonthStats();

							return {
								timestamp: new Date().toISOString(),
								environment: process.env.NODE_ENV || "development",
								database: stats,
								current_month: currentMonth,
								monthly_stats: monthlyStats,
								system: {
									platform: process.platform,
									version: process.version,
									uptime: process.uptime(),
								},
							};
						} catch (error) {
							console.error("Stats error:", error);
							return {
								error: "Stats failed",
								message:
									error instanceof Error ? error.message : "Unknown error",
							};
						}
					}),
			),
	)
	.listen(process.env.PORT ?? 3000);

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
