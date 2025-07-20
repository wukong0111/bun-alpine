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
	// Obtener todos los lenguajes ordenados por ranking dinámico
	async getAllLanguagesRanked(): Promise<Language[]> {
		const result = await db`
      SELECT * FROM languages 
      ORDER BY total_votes DESC, name ASC
    `;
		return result as unknown as Language[];
	},

	// Obtener top N lenguajes (dinámico)
	async getTopLanguages(limit: number = 20): Promise<Language[]> {
		const result = await db`
      SELECT * FROM languages 
      ORDER BY total_votes DESC, name ASC
      LIMIT ${limit}
    `;
		return result as unknown as Language[];
	},

	// Obtener lenguajes desde una posición específica
	async getLanguagesFromPosition(
		offset: number,
		limit: number = 35,
	): Promise<Language[]> {
		const result = await db`
      SELECT * FROM languages 
      ORDER BY total_votes DESC, name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
		return result as unknown as Language[];
	},

	// Obtener un lenguaje por ID
	async getLanguageById(id: number): Promise<Language | null> {
		const result = await db`SELECT * FROM languages WHERE id = ${id}`;
		return result.length > 0 ? (result[0] as Language) : null;
	},

	// Obtener todos los lenguajes
	async getAllLanguages(): Promise<Language[]> {
		const result = await db`
      SELECT * FROM languages 
      ORDER BY is_featured DESC, total_votes DESC, name ASC
    `;
		return result as unknown as Language[];
	},

	// Actualizar total de votos de un lenguaje (ya se hace automáticamente con trigger)
	async updateLanguageVotes(languageId: number): Promise<number> {
		const result = await db`
      SELECT COALESCE(SUM(points), 0) as total 
      FROM votes 
      WHERE language_id = ${languageId}
    `;

		const total = parseInt(result[0]?.total as string || "0");

		await db`
      UPDATE languages 
      SET total_votes = ${total}
      WHERE id = ${languageId}
    `;

		return total;
	},

	// Obtener ranking usando vista materializada (si existe)
	async getRankingFromView(): Promise<Language[]> {
		try {
			const result = await db`
        SELECT * FROM language_rankings 
        ORDER BY rank
      `;
			return result as unknown as Language[];
		} catch (_error) {
			// Si la vista no existe, usar consulta normal
			return this.getAllLanguagesRanked();
		}
	},
};

// Consultas para usuarios
export const userQueries = {
	// Crear o actualizar usuario
	async upsertUser(
		githubId: number,
		username: string,
		avatarUrl?: string,
	): Promise<User> {
		const existing =
			await db`SELECT * FROM users WHERE github_id = ${githubId}`;

		if (existing.length > 0) {
			const result = await db`
        UPDATE users 
        SET username = ${username}, avatar_url = ${avatarUrl || null}, updated_at = NOW()
        WHERE github_id = ${githubId}
        RETURNING *
      `;
			return result[0] as User;
		} else {
			const result = await db`
        INSERT INTO users (github_id, username, avatar_url) 
        VALUES (${githubId}, ${username}, ${avatarUrl || null})
        RETURNING *
      `;
			return result[0] as User;
		}
	},

	// Obtener usuario por GitHub ID
	async getUserByGithubId(githubId: number): Promise<User | null> {
		const result = await db`SELECT * FROM users WHERE github_id = ${githubId}`;
		return result.length > 0 ? (result[0] as User) : null;
	},

	// Obtener usuario por ID
	async getUserById(id: number): Promise<User | null> {
		const result = await db`SELECT * FROM users WHERE id = ${id}`;
		return result.length > 0 ? (result[0] as User) : null;
	},
};

// Consultas para votos
export const voteQueries = {
	// Obtener votos de un usuario en un mes específico
	async getUserMonthlyVotes(userId: number, month: string): Promise<Vote[]> {
		const result = await db`
      SELECT * FROM votes 
      WHERE user_id = ${userId} AND vote_month = ${month}
      ORDER BY points DESC
    `;
		return result as unknown as Vote[];
	},

	// Obtener puntos usados por un usuario en un mes
	async getUserMonthlyPoints(
		userId: number,
		month: string,
	): Promise<{ total_points: number; votes_count: number }> {
		const result = await db`
      SELECT 
        COALESCE(SUM(points), 0) as total_points,
        COUNT(*) as votes_count
      FROM votes 
      WHERE user_id = ${userId} AND vote_month = ${month}
    `;

		return {
			total_points: parseInt(result[0]?.total_points as string || "0"),
			votes_count: parseInt(result[0]?.votes_count as string || "0"),
		};
	},

	// Verificar si un usuario puede votar por un lenguaje (para sistema no acumulativo)
	async canUserVoteForLanguage(
		userId: number,
		languageId: number,
		month: string,
	): Promise<boolean> {
		const result = await db`
      SELECT 1 FROM votes 
      WHERE user_id = ${userId} AND language_id = ${languageId} AND vote_month = ${month}
    `;

		return result.length === 0;
	},

	// Obtener estadísticas de votación del mes actual
	async getCurrentMonthStats(): Promise<{
		total_votes: number;
		total_users: number;
		total_points: number;
	}> {
		const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

		const result = await db`
      SELECT 
        COUNT(*) as total_votes,
        COUNT(DISTINCT user_id) as total_users,
        COALESCE(SUM(points), 0) as total_points
      FROM votes 
      WHERE vote_month = ${currentMonth}
    `;

		return {
			total_votes: parseInt(result[0]?.total_votes as string || "0"),
			total_users: parseInt(result[0]?.total_users as string || "0"),
			total_points: parseInt(result[0]?.total_points as string || "0"),
		};
	},

	// Insertar un nuevo voto
	async insertVote(
		userId: number,
		languageId: number,
		points: number,
		month: string,
	): Promise<Vote> {
		const result = await db`
      INSERT INTO votes (user_id, language_id, points, vote_month)
      VALUES (${userId}, ${languageId}, ${points}, ${month})
      RETURNING *
    `;

		return result[0] as Vote;
	},

	// Agregar puntos a un lenguaje (sistema acumulativo)
	async addVote(
		userId: number,
		languageId: number,
		points: number,
		month: string,
	): Promise<Vote> {
		// Simplemente insertar un nuevo voto - el sistema permite múltiples votos por lenguaje
		return this.insertVote(userId, languageId, points, month);
	},

	// Actualizar un voto existente
	async updateVote(
		userId: number,
		languageId: number,
		points: number,
		month: string,
	): Promise<Vote> {
		const result = await db`
      UPDATE votes 
      SET points = ${points}
      WHERE user_id = ${userId} AND language_id = ${languageId} AND vote_month = ${month}
      RETURNING *
    `;

		return result[0] as Vote;
	},

	// Insertar o actualizar voto usando ON CONFLICT (PostgreSQL)
	async upsertVote(
		userId: number,
		languageId: number,
		points: number,
		month: string,
	): Promise<Vote> {
		const result = await db`
      INSERT INTO votes (user_id, language_id, points, vote_month)
      VALUES (${userId}, ${languageId}, ${points}, ${month})
      ON CONFLICT (user_id, language_id, vote_month) 
      DO UPDATE SET points = EXCLUDED.points
      RETURNING *
    `;

		return result[0] as Vote;
	},

	// Obtener votos por lenguaje en un mes específico
	async getLanguageMonthlyVotes(
		languageId: number,
		month: string,
	): Promise<Vote[]> {
		const result = await db`
      SELECT v.*, u.username, u.avatar_url
      FROM votes v
      JOIN users u ON v.user_id = u.id
      WHERE v.language_id = ${languageId} AND v.vote_month = ${month}
      ORDER BY v.points DESC, v.created_at ASC
    `;
		return result as unknown as Vote[];
	},

	// Obtener estadísticas mensuales por lenguaje
	async getLanguageMonthlyStats(
		languageId: number,
		month: string,
	): Promise<{
		total_points: number;
		total_votes: number;
		unique_voters: number;
		average_points: number;
	}> {
		const result = await db`
      SELECT 
        COALESCE(SUM(points), 0) as total_points,
        COUNT(*) as total_votes,
        COUNT(DISTINCT user_id) as unique_voters,
        COALESCE(AVG(points), 0) as average_points
      FROM votes 
      WHERE language_id = ${languageId} AND vote_month = ${month}
    `;

		return {
			total_points: parseInt(result[0]?.total_points as string || "0"),
			total_votes: parseInt(result[0]?.total_votes as string || "0"),
			unique_voters: parseInt(result[0]?.unique_voters as string || "0"),
			average_points: parseFloat(result[0]?.average_points as string || "0"),
		};
	},
};

// Utilidades
export const dbUtils = {
	// Obtener mes actual en formato YYYY-MM
	getCurrentMonth(): string {
		return new Date().toISOString().slice(0, 7);
	},

	// Obtener ranking completo con estadísticas del mes actual
	async getCompleteRanking() {
		const currentMonth = this.getCurrentMonth();

		const result = await db`
      SELECT 
        l.*,
        COALESCE(current_month_votes.points, 0) as current_month_points,
        COALESCE(current_month_votes.voters, 0) as current_month_voters,
        ROW_NUMBER() OVER (ORDER BY l.total_votes DESC, l.name ASC) as rank_position
      FROM languages l
      LEFT JOIN (
        SELECT 
          language_id,
          SUM(points) as points,
          COUNT(DISTINCT user_id) as voters
        FROM votes 
        WHERE vote_month = ${currentMonth}
        GROUP BY language_id
      ) current_month_votes ON l.id = current_month_votes.language_id
      ORDER BY l.total_votes DESC, l.name ASC
    `;

		return result;
	},

	// Obtener ranking del top N con estadísticas
	async getTopRankingWithStats(limit: number = 20) {
		const currentMonth = this.getCurrentMonth();

		const result = await db`
      SELECT 
        l.*,
        COALESCE(current_month_votes.points, 0) as current_month_points,
        COALESCE(current_month_votes.voters, 0) as current_month_voters,
        ROW_NUMBER() OVER (ORDER BY l.total_votes DESC, l.name ASC) as rank_position
      FROM languages l
      LEFT JOIN (
        SELECT 
          language_id,
          SUM(points) as points,
          COUNT(DISTINCT user_id) as voters
        FROM votes 
        WHERE vote_month = ${currentMonth}
        GROUP BY language_id
      ) current_month_votes ON l.id = current_month_votes.language_id
      ORDER BY l.total_votes DESC, l.name ASC
      LIMIT ${limit}
    `;

		return result;
	},

	// Obtener estadísticas generales de la base de datos
	async getDatabaseStats() {
		const result = await db`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM languages) as total_languages,
        (SELECT COUNT(*) FROM votes) as total_votes,
        (SELECT COUNT(DISTINCT vote_month) FROM votes) as total_months,
        (SELECT SUM(total_votes) FROM languages) as total_language_points
    `;

		return {
			total_users: parseInt(result[0]?.total_users as string || "0"),
			total_languages: parseInt(result[0]?.total_languages as string || "0"),
			total_votes: parseInt(result[0]?.total_votes as string || "0"),
			total_months: parseInt(result[0]?.total_months as string || "0"),
			total_language_points: parseInt(
				result[0]?.total_language_points as string || "0",
			),
		};
	},

	// Obtener historial de meses con actividad
	async getActiveMonths(): Promise<string[]> {
		const result = await db`
      SELECT DISTINCT vote_month
      FROM votes
      ORDER BY vote_month DESC
    `;

		return result.map((row) => row.vote_month as string);
	},

	// Obtener ranking histórico por mes
	async getMonthlyRanking(month: string) {
		const result = await db`
      SELECT 
        l.*,
        COALESCE(monthly_votes.points, 0) as month_points,
        COALESCE(monthly_votes.voters, 0) as month_voters,
        ROW_NUMBER() OVER (ORDER BY COALESCE(monthly_votes.points, 0) DESC, l.name ASC) as month_rank
      FROM languages l
      LEFT JOIN (
        SELECT 
          language_id,
          SUM(points) as points,
          COUNT(DISTINCT user_id) as voters
        FROM votes 
        WHERE vote_month = ${month}
        GROUP BY language_id
      ) monthly_votes ON l.id = monthly_votes.language_id
      ORDER BY COALESCE(monthly_votes.points, 0) DESC, l.name ASC
    `;

		return result;
	},
};
