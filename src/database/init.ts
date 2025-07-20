import { testConnection } from "./database";
import { runMigrations } from "./migrations";
import { seedLanguages } from "./seeds";

// Inicializar base de datos PostgreSQL completa
export async function initDatabase() {
	console.log("🚀 Initializing PostgreSQL database...");

	try {
		// Verificar conexión a PostgreSQL
		const connected = await testConnection();
		if (!connected) {
			throw new Error("Failed to connect to PostgreSQL database");
		}

		// Ejecutar migraciones
		await runMigrations();

		// Poblar datos iniciales
		await seedLanguages();

		console.log("✅ PostgreSQL database initialization completed");
	} catch (error) {
		console.error("❌ Database initialization failed:", error);
		throw error;
	}
}

// Función para reinicializar base de datos (desarrollo)
export async function resetDatabase() {
	console.log("⚠️  Resetting PostgreSQL database...");

	try {
		const { db } = await import("./database");

		// Eliminar todas las tablas en orden correcto (respetando foreign keys)
		await db`DROP TABLE IF EXISTS votes CASCADE`;
		await db`DROP TABLE IF EXISTS user_monthly_votes CASCADE`;
		await db`DROP TABLE IF EXISTS users CASCADE`;
		await db`DROP TABLE IF EXISTS languages CASCADE`;
		await db`DROP TABLE IF EXISTS migrations CASCADE`;

		// Eliminar funciones y vistas
		await db`DROP MATERIALIZED VIEW IF EXISTS language_rankings CASCADE`;
		await db`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`;
		await db`DROP FUNCTION IF EXISTS update_language_total_votes() CASCADE`;

		// Reinicializar
		await initDatabase();

		console.log("✅ PostgreSQL database reset completed");
	} catch (error) {
		console.error("❌ Database reset failed:", error);
		throw error;
	}
}

// Función para verificar el estado de la base de datos
export async function checkDatabaseHealth(): Promise<{
	connected: boolean;
	tablesExist: boolean;
	migrationsCount: number;
	error?: string;
}> {
	try {
		const { db } = await import("./database");

		// Verificar conexión
		const connected = await testConnection();
		if (!connected) {
			return {
				connected: false,
				tablesExist: false,
				migrationsCount: 0,
				error: "Connection failed",
			};
		}

		// Verificar si las tablas principales existen
		const tablesResult = await db`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'languages', 'votes', 'user_monthly_votes')
    `;
		const tablesExist = parseInt(tablesResult[0]?.count as string || "0") === 4;

		// Contar migraciones ejecutadas
		let migrationsCount = 0;
		try {
			const migrationsResult =
				await db`SELECT COUNT(*) as count FROM migrations`;
			migrationsCount = parseInt(migrationsResult[0]?.count as string || "0");
		} catch (_error) {
			// Tabla migrations no existe aún
			migrationsCount = 0;
		}

		return {
			connected: true,
			tablesExist,
			migrationsCount,
		};
	} catch (error) {
		return {
			connected: false,
			tablesExist: false,
			migrationsCount: 0,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Función para exportar estructura de la base de datos (útil para backup)
export async function exportDatabaseSchema(): Promise<string> {
	try {
		const { db } = await import("./database");

		// Obtener todas las tablas, funciones, índices, etc.
		const result = await db`
      SELECT 
        schemaname,
        tablename,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

		return JSON.stringify(result, null, 2);
	} catch (error) {
		console.error("Error exporting database schema:", error);
		throw error;
	}
}

// Función para optimizar la base de datos (ejecutar ANALYZE, VACUUM, etc.)
export async function optimizeDatabase(): Promise<void> {
	try {
		console.log("🔧 Optimizing PostgreSQL database...");
		const { db } = await import("./database");

		// Actualizar estadísticas de la base de datos
		await db`ANALYZE`;

		// Limpiar espacio no utilizado (solo en development)
		if (process.env.NODE_ENV !== "production") {
			await db`VACUUM`;
		}

		// Refrescar vista materializada si existe
		try {
			await db`REFRESH MATERIALIZED VIEW CONCURRENTLY language_rankings`;
			console.log("📊 Language rankings view refreshed");
		} catch (_error) {
			// La vista puede no existir aún
			console.log("ℹ️  Language rankings view not found, skipping refresh");
		}

		console.log("✅ Database optimization completed");
	} catch (error) {
		console.error("Error optimizing database:", error);
		throw error;
	}
}
