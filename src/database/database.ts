import { Database } from "bun:sqlite";
import path from "path";

// Configurar ruta de la base de datos
const dbPath = process.env.DATABASE_PATH || (
  process.env.NODE_ENV === "production" 
    ? "./data/ranking.db" 
    : "./src/database/ranking.db"
);

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!await Bun.file(dbDir).exists()) {
  await Bun.write(path.join(dbDir, ".gitkeep"), "");
}

// Inicializar base de datos
export const db = new Database(dbPath);

// Configurar WAL mode para mejor rendimiento
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

console.log(`📦 Database connected: ${dbPath}`);