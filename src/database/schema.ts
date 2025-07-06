import { db } from "./database";

// Esquema de la base de datos
export function createTables() {
  // Tabla de usuarios (GitHub OAuth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id INTEGER UNIQUE NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de lenguajes de programación
  db.exec(`
    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#64748b',
      logo_url TEXT,
      is_featured BOOLEAN DEFAULT false,
      total_votes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de votos mensuales
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      language_id INTEGER NOT NULL,
      points INTEGER NOT NULL CHECK (points >= 1 AND points <= 5),
      vote_month TEXT NOT NULL, -- Formato: 'YYYY-MM'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES languages (id) ON DELETE CASCADE,
      UNIQUE(user_id, language_id, vote_month)
    )
  `);

  // Tabla para tracking de puntos mensuales del usuario
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_monthly_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vote_month TEXT NOT NULL, -- Formato: 'YYYY-MM'
      total_points_used INTEGER DEFAULT 0,
      votes_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, vote_month)
    )
  `);

  // Índices para optimizar consultas
  db.exec(`CREATE INDEX IF NOT EXISTS idx_votes_month ON votes (vote_month)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_votes_user_month ON votes (user_id, vote_month)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_languages_featured ON languages (is_featured)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_monthly_votes ON user_monthly_votes (user_id, vote_month)`);

  console.log("📋 Database tables created successfully");
}

// Función para obtener estadísticas de la base de datos
export function getDbStats() {
  const users = db.query("SELECT COUNT(*) as count FROM users").get() as { count: number };
  const languages = db.query("SELECT COUNT(*) as count FROM languages").get() as { count: number };
  const votes = db.query("SELECT COUNT(*) as count FROM votes").get() as { count: number };
  
  return {
    users: users.count,
    languages: languages.count,
    votes: votes.count
  };
}