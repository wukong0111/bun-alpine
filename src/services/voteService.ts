import { voteQueries } from "../database/queries";

export interface VoteValidationResult {
	isValid: boolean;
	error?: string;
}

/**
 * Valida las reglas básicas de votación
 */
export function validateBasicRules(points: number): VoteValidationResult {
	if (points < 1 || points > 5) {
		return {
			isValid: false,
			error: "Points must be between 1 and 5",
		};
	}

	return { isValid: true };
}

/**
 * Valida el límite por lenguaje (máximo 5 puntos por lenguaje por mes)
 */
export async function validateLanguageLimit(
	userId: number,
	languageId: number,
	pointsToAdd: number,
	month: string,
): Promise<VoteValidationResult> {
	const existingVotes = await voteQueries.getUserMonthlyVotes(userId, month);
	const languageVotes = existingVotes.filter(
		(v: { language_id: number }) => v.language_id === languageId,
	);
	const currentLanguagePoints = languageVotes.reduce(
		(sum: number, vote: { points: number }) => sum + vote.points,
		0,
	);

	if (currentLanguagePoints + pointsToAdd > 5) {
		const remaining = 5 - currentLanguagePoints;
		return {
			isValid: false,
			error: `Cannot exceed 5 points per language. This language has ${currentLanguagePoints} points, you can add ${remaining} more.`,
		};
	}

	return { isValid: true };
}

/**
 * Valida el total de puntos disponibles para un usuario (máximo 10 por mes)
 */
export async function validateTotalPoints(
	userId: number,
	pointsToAdd: number,
	month: string,
): Promise<VoteValidationResult> {
	const monthlyPoints = await voteQueries.getUserMonthlyPoints(userId, month);

	if (monthlyPoints.total_points + pointsToAdd > 10) {
		const remaining = 10 - monthlyPoints.total_points;
		return {
			isValid: false,
			error: `Not enough points remaining. You have ${remaining} points left this month.`,
		};
	}

	return { isValid: true };
}

/**
 * Validación completa para agregar puntos - sistema acumulativo
 */
export async function validateAddVote(
	userId: number,
	languageId: number,
	pointsToAdd: number,
	month: string,
): Promise<VoteValidationResult> {
	// Validar reglas básicas
	const basicValidation = validateBasicRules(pointsToAdd);
	if (!basicValidation.isValid) {
		return basicValidation;
	}

	// Validar límite por lenguaje (máximo 5 puntos por lenguaje)
	const languageValidation = await validateLanguageLimit(
		userId,
		languageId,
		pointsToAdd,
		month,
	);
	if (!languageValidation.isValid) {
		return languageValidation;
	}

	// Validar total de puntos disponibles (máximo 10 por mes)
	const totalValidation = await validateTotalPoints(userId, pointsToAdd, month);
	if (!totalValidation.isValid) {
		return totalValidation;
	}

	return { isValid: true };
}

/**
 * Validación completa de un voto - sistema simplificado (mantener para compatibilidad)
 * @deprecated Use validateAddVote for the new cumulative system
 */
export async function validateVote(
	userId: number,
	languageId: number,
	points: number,
	month: string,
): Promise<VoteValidationResult> {
	// Por ahora delegamos al nuevo sistema
	return await validateAddVote(userId, languageId, points, month);
}
