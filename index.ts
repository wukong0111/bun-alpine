import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { elysiaHelmet } from "elysiajs-helmet";
import { rateLimit } from "elysia-rate-limit";
import { initDatabase } from "./src/database/init";
import { getDbStats } from "./src/database/schema";
import { languageQueries, userQueries, voteQueries, dbUtils } from "./src/database/queries";

const isDevelopment = process.env.NODE_ENV !== "production";

// Inicializar base de datos al arrancar
initDatabase();

const app = new Elysia()
	.use(
		elysiaHelmet({
			csp: isDevelopment
				? {
						defaultSrc: ["'self'"],
						styleSrc: ["'self'", "'unsafe-inline'"],
						scriptSrc: ["'self'", "'unsafe-eval'"], // Necesario para Alpine.js en desarrollo
						imgSrc: ["'self'", "data:", "https:"],
						connectSrc: ["'self'"],
						fontSrc: ["'self'"],
						objectSrc: ["'none'"],
						frameSrc: ["'none'"],
					}
				: {
						defaultSrc: ["'self'"],
						styleSrc: ["'self'", "'unsafe-inline'"],
						scriptSrc: ["'self'", "'unsafe-eval'"], // Necesario para Alpine.js también en producción
						imgSrc: ["'self'", "data:"],
						connectSrc: ["'self'"],
						fontSrc: ["'self'"],
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
	.use(swagger())
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
			
			// Endpoints de prueba para lenguajes
			.get("/languages", () => ({
				featured: languageQueries.getFeaturedLanguages(),
				additional: languageQueries.getAdditionalLanguages(),
			}))
			
			.get("/languages/featured", () => languageQueries.getFeaturedLanguages())
			
			.get("/languages/additional", () => languageQueries.getAdditionalLanguages())
			
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
				ranking: dbUtils.getCurrentRanking(),
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
			
			// Endpoint para simular votación (mock)
			.post("/test/vote", ({ body }: { body: any }) => {
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
			}),
	)
	.listen(process.env.PORT ?? 3000);

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
