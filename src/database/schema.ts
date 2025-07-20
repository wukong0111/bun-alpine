import { db } from "./database";

// Esquema PostgreSQL de la base de datos
export async function createTables() {
	// Tabla de usuarios (GitHub OAuth)
	await db`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      github_id BIGINT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

	// Tabla de lenguajes de programación
	await db`
    CREATE TABLE IF NOT EXISTS languages (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#64748b',
      logo_url TEXT,
      is_featured BOOLEAN DEFAULT false,
      total_votes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

	// Tabla de votos mensuales
	await db`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      language_id INTEGER NOT NULL,
      points INTEGER NOT NULL CHECK (points >= 1 AND points <= 5),
      vote_month TEXT NOT NULL, -- Formato: 'YYYY-MM'
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES languages (id) ON DELETE CASCADE
    )
  `;

	// Tabla para tracking de puntos mensuales del usuario
	await db`
    CREATE TABLE IF NOT EXISTS user_monthly_votes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      vote_month TEXT NOT NULL, -- Formato: 'YYYY-MM'
      total_points_used INTEGER DEFAULT 0,
      votes_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, vote_month)
    )
  `;

	// Índices para optimizar consultas
	await db`CREATE INDEX IF NOT EXISTS idx_votes_month ON votes (vote_month)`;
	await db`CREATE INDEX IF NOT EXISTS idx_votes_user_month ON votes (user_id, vote_month)`;
	await db`CREATE INDEX IF NOT EXISTS idx_votes_language_month ON votes (language_id, vote_month)`;
	await db`CREATE INDEX IF NOT EXISTS idx_languages_featured ON languages (is_featured)`;
	await db`CREATE INDEX IF NOT EXISTS idx_user_monthly_votes ON user_monthly_votes (user_id, vote_month)`;
	await db`CREATE INDEX IF NOT EXISTS idx_languages_total_votes ON languages (total_votes DESC)`;

	// Función para actualizar updated_at automáticamente
	await db`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;

	// Trigger para actualizar updated_at en users
	await db`DROP TRIGGER IF EXISTS update_users_updated_at ON users`;
	await db`
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
  `;

	// Trigger para actualizar updated_at en user_monthly_votes
	await db`DROP TRIGGER IF EXISTS update_user_monthly_votes_updated_at ON user_monthly_votes`;
	await db`
    CREATE TRIGGER update_user_monthly_votes_updated_at
        BEFORE UPDATE ON user_monthly_votes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
  `;

	console.log("📋 PostgreSQL database tables created successfully");
}

// Función para obtener estadísticas de la base de datos
export async function getDbStats() {
	try {
		const usersResults = await db`SELECT COUNT(*) as count FROM users`;
		const languagesResults = await db`SELECT COUNT(*) as count FROM languages`;
		const votesResults = await db`SELECT COUNT(*) as count FROM votes`;

		return {
			users: parseInt(usersResults[0]?.count as string || "0"),
			languages: parseInt(languagesResults[0]?.count as string || "0"),
			votes: parseInt(votesResults[0]?.count as string || "0"),
		};
	} catch (error) {
		console.error("Error getting database stats:", error);
		return {
			users: 0,
			languages: 0,
			votes: 0,
		};
	}
}

// Función para verificar si las tablas existen
export async function tablesExist(): Promise<boolean> {
	try {
		const result = await db`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'languages', 'votes', 'user_monthly_votes')
    `;
		return parseInt(result[0]?.count as string || "0") === 4;
	} catch (error) {
		console.error("Error checking if tables exist:", error);
		return false;
	}
}

// Función para limpiar todas las tablas (desarrollo)
export async function cleanTables() {
	try {
		await db`TRUNCATE TABLE votes, user_monthly_votes, users, languages RESTART IDENTITY CASCADE`;
		console.log("🧹 Database tables cleaned");
	} catch (error) {
		console.error("Error cleaning tables:", error);
		throw error;
	}
}

// Función para eliminar todas las tablas (desarrollo)
export async function dropTables() {
	try {
		await db`DROP TABLE IF EXISTS votes CASCADE`;
		await db`DROP TABLE IF EXISTS user_monthly_votes CASCADE`;
		await db`DROP TABLE IF EXISTS users CASCADE`;
		await db`DROP TABLE IF EXISTS languages CASCADE`;
		await db`DROP TABLE IF EXISTS migrations CASCADE`;
		await db`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`;
		console.log("🗑️ Database tables dropped");
	} catch (error) {
		console.error("Error dropping tables:", error);
		throw error;
	}
}
