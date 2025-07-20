import { db } from "./database";
import { createTables } from "./schema";

// Tabla para tracking de migraciones en PostgreSQL
async function createMigrationsTable() {
	await db`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version TEXT UNIQUE NOT NULL,
      description TEXT,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// Verificar si una migración ya fue ejecutada
async function isMigrationExecuted(version: string): Promise<boolean> {
	try {
		const result =
			await db`SELECT 1 FROM migrations WHERE version = ${version}`;
		return result.length > 0;
	} catch (error) {
		console.error("Error checking migration:", error);
		return false;
	}
}

// Marcar migración como ejecutada
async function markMigrationExecuted(version: string, description: string) {
	await db`INSERT INTO migrations (version, description) VALUES (${version}, ${description})`;
}

// Migración inicial - crear todas las tablas
async function migration001_initial() {
	if (await isMigrationExecuted("001")) return;

	console.log("🔄 Running migration 001: Initial PostgreSQL schema");
	await createTables();
	await markMigrationExecuted("001", "Initial PostgreSQL database schema");
	console.log("✅ Migration 001 completed");
}

// Migración 002 - Sistema acumulativo de votos (ya implementado en schema inicial)
async function migration002_cumulative_voting() {
	if (await isMigrationExecuted("002")) return;

	console.log("🔄 Running migration 002: Cumulative voting system");

	// En PostgreSQL, la migración es más simple - no necesitamos recrear tablas
	// Solo agregamos un índice adicional para optimizar consultas acumulativas
	await db`
    CREATE INDEX IF NOT EXISTS idx_votes_user_language_month 
    ON votes (user_id, language_id, vote_month)
  `;

	// Agregar función para calcular total de votos por lenguaje
	await db`
    CREATE OR REPLACE FUNCTION update_language_total_votes()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE languages 
        SET total_votes = (
          SELECT COALESCE(SUM(points), 0) 
          FROM votes 
          WHERE language_id = NEW.language_id
        )
        WHERE id = NEW.language_id;
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        UPDATE languages 
        SET total_votes = (
          SELECT COALESCE(SUM(points), 0) 
          FROM votes 
          WHERE language_id = NEW.language_id
        )
        WHERE id = NEW.language_id;
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE languages 
        SET total_votes = (
          SELECT COALESCE(SUM(points), 0) 
          FROM votes 
          WHERE language_id = OLD.language_id
        )
        WHERE id = OLD.language_id;
        RETURN OLD;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `;

	// Trigger para actualizar total_votes automáticamente
	await db`DROP TRIGGER IF EXISTS update_language_total_votes_trigger ON votes`;
	await db`
    CREATE TRIGGER update_language_total_votes_trigger
      AFTER INSERT OR UPDATE OR DELETE ON votes
      FOR EACH ROW
      EXECUTE FUNCTION update_language_total_votes()
  `;

	await markMigrationExecuted(
		"002",
		"Cumulative voting system with automatic total_votes calculation",
	);
	console.log("✅ Migration 002 completed");
}

// Migración 003 - Optimizaciones adicionales para PostgreSQL
async function migration003_postgresql_optimizations() {
	if (await isMigrationExecuted("003")) return;

	console.log("🔄 Running migration 003: PostgreSQL optimizations");

	// Agregar índices parciales para consultas comunes
	await db`
    CREATE INDEX IF NOT EXISTS idx_languages_featured_true 
    ON languages (total_votes DESC) 
    WHERE is_featured = true
  `;

	// Índice para consultas de ranking mensual
	await db`
    CREATE INDEX IF NOT EXISTS idx_votes_month_points 
    ON votes (vote_month, points)
  `;

	// Vista materializada para ranking de lenguajes (opcional, para mejor performance)
	await db`DROP MATERIALIZED VIEW IF EXISTS language_rankings`;
	await db`
    CREATE MATERIALIZED VIEW language_rankings AS
    SELECT 
      l.id,
      l.name,
      l.description,
      l.color,
      l.logo_url,
      l.is_featured,
      l.total_votes,
      l.created_at,
      ROW_NUMBER() OVER (ORDER BY l.total_votes DESC, l.name ASC) as rank
    FROM languages l
    WHERE l.total_votes > 0
    ORDER BY l.total_votes DESC, l.name ASC
  `;

	// Índice en la vista materializada
	await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_language_rankings_id 
    ON language_rankings (id)
  `;

	await markMigrationExecuted(
		"003",
		"PostgreSQL performance optimizations and materialized views",
	);
	console.log("✅ Migration 003 completed");
}

// Función para refrescar la vista materializada (debe ser llamada después de cambios significativos)
export async function refreshLanguageRankings() {
	try {
		await db`REFRESH MATERIALIZED VIEW CONCURRENTLY language_rankings`;
		console.log("🔄 Language rankings view refreshed");
	} catch (error) {
		console.error("Error refreshing language rankings:", error);
	}
}

// Ejecutar todas las migraciones
export async function runMigrations() {
	console.log("🚀 Starting PostgreSQL database migrations...");

	await createMigrationsTable();

	// Ejecutar migraciones en orden
	await migration001_initial();
	await migration002_cumulative_voting();
	await migration003_postgresql_optimizations();

	console.log("✅ All PostgreSQL migrations completed");
}

// Función para obtener historial de migraciones
export async function getMigrationHistory() {
	try {
		const result = await db`
      SELECT version, description, executed_at 
      FROM migrations 
      ORDER BY executed_at DESC
    `;
		return result;
	} catch (error) {
		console.error("Error getting migration history:", error);
		return [];
	}
}

// Función para hacer rollback de una migración (implementación básica)
export async function rollbackMigration(version: string) {
	console.log(`⚠️ Rolling back migration ${version}`);

	try {
		// Implementar rollback específico por versión
		switch (version) {
			case "003":
				await db`DROP MATERIALIZED VIEW IF EXISTS language_rankings`;
				await db`DROP INDEX IF EXISTS idx_languages_featured_true`;
				await db`DROP INDEX IF EXISTS idx_votes_month_points`;
				break;
			case "002":
				await db`DROP TRIGGER IF EXISTS update_language_total_votes_trigger ON votes`;
				await db`DROP FUNCTION IF EXISTS update_language_total_votes()`;
				await db`DROP INDEX IF EXISTS idx_votes_user_language_month`;
				break;
			case "001":
				await db`DROP TABLE IF EXISTS votes CASCADE`;
				await db`DROP TABLE IF EXISTS user_monthly_votes CASCADE`;
				await db`DROP TABLE IF EXISTS users CASCADE`;
				await db`DROP TABLE IF EXISTS languages CASCADE`;
				break;
			default:
				throw new Error(`Rollback not implemented for migration ${version}`);
		}

		await db`DELETE FROM migrations WHERE version = ${version}`;
		console.log(`✅ Migration ${version} rolled back`);
	} catch (error) {
		console.error(`Error rolling back migration ${version}:`, error);
		throw error;
	}
}
