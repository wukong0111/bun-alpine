import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { elysiaHelmet } from "elysiajs-helmet";
import { rateLimit } from "elysia-rate-limit";

const isDevelopment = process.env.NODE_ENV !== "production";

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
			}))
			.get("/users", () => ({
				users: [
					{ id: 1, name: "John Doe" },
					{ id: 2, name: "Jane Smith" },
				],
			}))
			.post("/users", ({ body }: { body: any }) => ({
				success: true,
				user: body,
			})),
	)
	.listen(process.env.PORT ?? 3000);

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
