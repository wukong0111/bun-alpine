import postgres from "postgres";

// Configuración de la base de datos PostgreSQL
const isDevelopment = process.env.NODE_ENV !== "production";

const dbConfig = {
	host: process.env.DATABASE_HOST || "localhost",
	port: parseInt(process.env.DATABASE_PORT || "5432"),
	database:
		process.env.DATABASE_NAME ||
		(isDevelopment ? "ranking_dev" : "ranking_prod"),
	username: process.env.DATABASE_USER || "postgres",
	password: process.env.DATABASE_PASSWORD || "postgres",
	ssl:
		process.env.NODE_ENV === "production"
			? { rejectUnauthorized: false }
			: false,
};

// Crear conexión a PostgreSQL usando postgres
export const db = postgres({
	host: dbConfig.host,
	port: dbConfig.port,
	database: dbConfig.database,
	username: dbConfig.username,
	password: dbConfig.password,
	ssl: dbConfig.ssl,
});

// Función para test de conexión
export async function testConnection(): Promise<boolean> {
	try {
		await db`SELECT 1 as test`;
		console.log(
			`📦 PostgreSQL connected: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`,
		);
		return true;
	} catch (error) {
		console.error("❌ Database connection failed:", error);
		return false;
	}
}

// Función para cerrar la conexión (útil para testing)
export async function closeConnection(): Promise<void> {
	try {
		await db.end();
		console.log("🔌 Database connection closed");
	} catch (error) {
		console.error("Error closing database connection:", error);
	}
}

// Función para ejecutar queries con manejo de errores
export async function executeQuery<T = unknown>(
	query: string,
	params: unknown[] = [],
): Promise<T[]> {
	try {
		// Use template literal syntax for postgres
		if (params.length === 0) {
			return await db.unsafe(query) as T[];
		}
		return await db.unsafe(query, params as never[]) as T[];
	} catch (error) {
		console.error("Database query error:", error);
		throw error;
	}
}

// Función para ejecutar una query y obtener un solo resultado
export async function executeQueryOne<T = unknown>(
	query: string,
	params: unknown[] = [],
): Promise<T | null> {
	try {
		const results = await executeQuery<T>(query, params);
		return results.length > 0 ? results[0] || null : null;
	} catch (error) {
		console.error("Database query error:", error);
		throw error;
	}
}

// Función para ejecutar statements (INSERT, UPDATE, DELETE)
export async function executeStatement(
	query: string,
	params: unknown[] = [],
): Promise<{ affectedRows: number; insertId?: number }> {
	try {
		// Use template literal syntax for postgres
		let result;
		if (params.length === 0) {
			result = await db.unsafe(query);
		} else {
			result = await db.unsafe(query, params as never[]);
		}
		return {
			affectedRows: Array.isArray(result) ? result.length : 1,
			insertId: undefined, // PostgreSQL doesn't have insertId like MySQL
		};
	} catch (error) {
		console.error("Database statement error:", error);
		throw error;
	}
}

// Función para transacciones
export async function withTransaction<T>(
	callback: () => Promise<T>,
): Promise<T> {
	await db`BEGIN`;
	try {
		const result = await callback();
		await db`COMMIT`;
		return result;
	} catch (error) {
		await db`ROLLBACK`;
		throw error;
	}
}

// Inicializar conexión
testConnection();
