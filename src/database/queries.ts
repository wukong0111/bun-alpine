import { db } from "./database";

// Interfaces para tipos de datos
export interface Language {
  id: number;
  name: string;
  description: string;
  color: string;
  is_featured: boolean;
  total_votes: number;
}

export interface User {
  id: number;
  github_id: number;
  username: string;
  avatar_url?: string;
}

export interface Vote {
  id: number;
  user_id: number;
  language_id: number;
  points: number;
  vote_month: string;
}

// Consultas para lenguajes
export const languageQueries = {
  // Obtener top 20 lenguajes (featured)
  getFeaturedLanguages(): Language[] {
    return db.query(`
      SELECT * FROM languages 
      WHERE is_featured = true 
      ORDER BY total_votes DESC, name ASC
      LIMIT 20
    `).all() as Language[];
  },

  // Obtener lenguajes adicionales (no featured)
  getAdditionalLanguages(): Language[] {
    return db.query(`
      SELECT * FROM languages 
      WHERE is_featured = false 
      ORDER BY name ASC
    `).all() as Language[];
  },

  // Obtener un lenguaje por ID
  getLanguageById(id: number): Language | null {
    return db.query("SELECT * FROM languages WHERE id = ?").get(id) as Language | null;
  },

  // Obtener todos los lenguajes
  getAllLanguages(): Language[] {
    return db.query(`
      SELECT * FROM languages 
      ORDER BY is_featured DESC, total_votes DESC, name ASC
    `).all() as Language[];
  },

  // Actualizar total de votos de un lenguaje
  updateLanguageVotes(languageId: number) {
    const result = db.query(`
      SELECT COALESCE(SUM(points), 0) as total 
      FROM votes 
      WHERE language_id = ?
    `).get(languageId) as { total: number };

    db.query(`
      UPDATE languages 
      SET total_votes = ? 
      WHERE id = ?
    `).run(result.total, languageId);

    return result.total;
  }
};

// Consultas para usuarios
export const userQueries = {
  // Crear o actualizar usuario
  upsertUser(githubId: number, username: string, avatarUrl?: string): User {
    const existing = db.query("SELECT * FROM users WHERE github_id = ?").get(githubId) as User | null;
    
    if (existing) {
      db.query(`
        UPDATE users 
        SET username = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE github_id = ?
      `).run(username, avatarUrl || null, githubId);
      return { ...existing, username, avatar_url: avatarUrl };
    } else {
      const result = db.query(`
        INSERT INTO users (github_id, username, avatar_url) 
        VALUES (?, ?, ?) 
        RETURNING *
      `).get(githubId, username, avatarUrl || null) as User;
      return result;
    }
  },

  // Obtener usuario por GitHub ID
  getUserByGithubId(githubId: number): User | null {
    return db.query("SELECT * FROM users WHERE github_id = ?").get(githubId) as User | null;
  },

  // Obtener usuario por ID
  getUserById(id: number): User | null {
    return db.query("SELECT * FROM users WHERE id = ?").get(id) as User | null;
  }
};

// Consultas para votos
export const voteQueries = {
  // Obtener votos de un usuario en un mes específico
  getUserMonthlyVotes(userId: number, month: string): Vote[] {
    return db.query(`
      SELECT * FROM votes 
      WHERE user_id = ? AND vote_month = ?
      ORDER BY points DESC
    `).all(userId, month) as Vote[];
  },

  // Obtener puntos usados por un usuario en un mes
  getUserMonthlyPoints(userId: number, month: string): { total_points: number; votes_count: number } {
    const result = db.query(`
      SELECT 
        COALESCE(SUM(points), 0) as total_points,
        COUNT(*) as votes_count
      FROM votes 
      WHERE user_id = ? AND vote_month = ?
    `).get(userId, month) as { total_points: number; votes_count: number };
    
    return result;
  },

  // Verificar si un usuario puede votar por un lenguaje
  canUserVoteForLanguage(userId: number, languageId: number, month: string): boolean {
    const existing = db.query(`
      SELECT 1 FROM votes 
      WHERE user_id = ? AND language_id = ? AND vote_month = ?
    `).get(userId, languageId, month);
    
    return !existing;
  },

  // Obtener estadísticas de votación del mes actual
  getCurrentMonthStats(): { total_votes: number; total_users: number; total_points: number } {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const result = db.query(`
      SELECT 
        COUNT(*) as total_votes,
        COUNT(DISTINCT user_id) as total_users,
        SUM(points) as total_points
      FROM votes 
      WHERE vote_month = ?
    `).get(currentMonth) as { total_votes: number; total_users: number; total_points: number };
    
    return result;
  }
};

// Utilidades
export const dbUtils = {
  // Obtener mes actual en formato YYYY-MM
  getCurrentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  },

  // Obtener ranking actual con estadísticas
  getCurrentRanking() {
    return db.query(`
      SELECT 
        l.*,
        COALESCE(current_month_votes.points, 0) as current_month_points,
        COALESCE(current_month_votes.voters, 0) as current_month_voters
      FROM languages l
      LEFT JOIN (
        SELECT 
          language_id,
          SUM(points) as points,
          COUNT(DISTINCT user_id) as voters
        FROM votes 
        WHERE vote_month = ?
        GROUP BY language_id
      ) current_month_votes ON l.id = current_month_votes.language_id
      WHERE l.is_featured = true
      ORDER BY l.total_votes DESC, l.name ASC
      LIMIT 20
    `).all(dbUtils.getCurrentMonth());
  }
};