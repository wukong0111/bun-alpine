import { db } from "./database";
import { createTables } from "./schema";

// Tabla para tracking de migraciones
function createMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT UNIQUE NOT NULL,
      description TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Verificar si una migración ya fue ejecutada
function isMigrationExecuted(version: string): boolean {
  const result = db.query("SELECT 1 FROM migrations WHERE version = ?").get(version);
  return !!result;
}

// Marcar migración como ejecutada
function markMigrationExecuted(version: string, description: string) {
  db.query("INSERT INTO migrations (version, description) VALUES (?, ?)")
    .run(version, description);
}

// Migración inicial - crear todas las tablas
function migration001_initial() {
  if (isMigrationExecuted("001")) return;
  
  console.log("🔄 Running migration 001: Initial schema");
  createTables();
  markMigrationExecuted("001", "Initial database schema");
  console.log("✅ Migration 001 completed");
}

// Migración 002 - Permitir múltiples votos por lenguaje (sistema acumulativo)
function migration002_remove_unique_constraint() {
  if (isMigrationExecuted("002")) return;
  
  console.log("🔄 Running migration 002: Remove unique constraint for cumulative voting");
  
  // SQLite no permite DROP CONSTRAINT directamente, necesitamos recrear la tabla
  db.exec(`
    -- Crear tabla temporal sin la constraint unique
    CREATE TABLE votes_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      language_id INTEGER NOT NULL,
      points INTEGER NOT NULL CHECK (points >= 1 AND points <= 5),
      vote_month TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES languages (id) ON DELETE CASCADE
    );
    
    -- Copiar datos existentes
    INSERT INTO votes_new (id, user_id, language_id, points, vote_month, created_at)
    SELECT id, user_id, language_id, points, vote_month, created_at FROM votes;
    
    -- Eliminar tabla antigua
    DROP TABLE votes;
    
    -- Renombrar tabla nueva
    ALTER TABLE votes_new RENAME TO votes;
    
    -- Recrear índices para mejor performance
    CREATE INDEX idx_votes_user_month ON votes(user_id, vote_month);
    CREATE INDEX idx_votes_language_month ON votes(language_id, vote_month);
  `);
  
  markMigrationExecuted("002", "Remove unique constraint to allow cumulative voting");
  console.log("✅ Migration 002 completed");
}

// Ejecutar todas las migraciones
export function runMigrations() {
  console.log("🚀 Starting database migrations...");
  
  createMigrationsTable();
  
  // Ejecutar migraciones en orden
  migration001_initial();
  migration002_remove_unique_constraint();
  
  console.log("✅ All migrations completed");
}

// Función para obtener historial de migraciones
export function getMigrationHistory() {
  return db.query(`
    SELECT version, description, executed_at 
    FROM migrations 
    ORDER BY executed_at DESC
  `).all();
}