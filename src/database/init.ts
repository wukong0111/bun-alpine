import { runMigrations } from "./migrations";
import { seedLanguages } from "./seeds";

// Inicializar base de datos completa
export function initDatabase() {
  console.log("🚀 Initializing database...");
  
  // Ejecutar migraciones
  runMigrations();
  
  // Poblar datos iniciales
  seedLanguages();
  
  console.log("✅ Database initialization completed");
}

// Función para reinicializar base de datos (desarrollo)
export function resetDatabase() {
  console.log("⚠️  Resetting database...");
  const { db } = require("./database");
  
  // Eliminar todas las tablas
  db.exec("DROP TABLE IF EXISTS votes");
  db.exec("DROP TABLE IF EXISTS user_monthly_votes");
  db.exec("DROP TABLE IF EXISTS users");
  db.exec("DROP TABLE IF EXISTS languages");
  db.exec("DROP TABLE IF EXISTS migrations");
  
  // Reinicializar
  initDatabase();
  
  console.log("✅ Database reset completed");
}