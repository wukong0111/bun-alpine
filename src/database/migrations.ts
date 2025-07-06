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

// Ejecutar todas las migraciones
export function runMigrations() {
  console.log("🚀 Starting database migrations...");
  
  createMigrationsTable();
  
  // Ejecutar migraciones en orden
  migration001_initial();
  
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