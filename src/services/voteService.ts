import { voteQueries } from '../database/queries';

export interface VoteValidationResult {
  isValid: boolean;
  error?: string;
}

export interface VoteSlotValidation {
  slot5Used: boolean;
  slot3Used: boolean;
  slot2Used: boolean;
}

export class VoteService {
  /**
   * Valida si un usuario puede votar con la cantidad de puntos especificada
   * siguiendo la lógica de slots: 1 voto de 5, 1 voto de 3, 1 voto de 2 puntos
   */
  static validateVoteSlots(
    userId: number,
    languageId: number,
    points: number,
    month: string
  ): VoteValidationResult {
    // Validaciones básicas
    if (points < 1 || points > 5) {
      return {
        isValid: false,
        error: "Points must be between 1 and 5"
      };
    }

    // Obtener votos existentes del usuario (excluyendo el lenguaje actual)
    const userVotes = voteQueries.getUserMonthlyVotes(userId, month);
    const otherVotes = userVotes.filter(v => v.language_id !== languageId);

    // Verificar qué slots están ocupados por otros lenguajes
    const slotValidation = this.getSlotValidation(otherVotes);

    // Validar el slot específico que se quiere usar
    if (points === 5 && slotValidation.slot5Used) {
      return {
        isValid: false,
        error: "5-point slot already used by another language"
      };
    }

    if (points === 3 && slotValidation.slot3Used) {
      return {
        isValid: false,
        error: "3-point slot already used by another language"
      };
    }

    if (points === 2 && slotValidation.slot2Used) {
      return {
        isValid: false,
        error: "2-point slot already used by another language"
      };
    }

    return { isValid: true };
  }

  /**
   * Determina qué slots están ocupados por otros lenguajes
   */
  static getSlotValidation(votes: Array<{ points: number }>): VoteSlotValidation {
    return {
      slot5Used: votes.some(v => v.points === 5),
      slot3Used: votes.some(v => v.points === 3),
      slot2Used: votes.some(v => v.points === 2)
    };
  }

  /**
   * Valida el total de puntos disponibles para un usuario
   */
  static validateTotalPoints(
    userId: number,
    languageId: number,
    points: number,
    month: string
  ): VoteValidationResult {
    const monthlyPoints = voteQueries.getUserMonthlyPoints(userId, month);
    
    // Calcular diferencia si es un voto existente
    const existingVote = voteQueries.getUserMonthlyVotes(userId, month)
      .find(v => v.language_id === languageId);
    
    const currentVotePoints = existingVote ? existingVote.points : 0;
    const pointsDifference = points - currentVotePoints;

    if (monthlyPoints.total_points + pointsDifference > 10) {
      return {
        isValid: false,
        error: `Not enough points. Used: ${monthlyPoints.total_points}/10, trying to add: ${pointsDifference}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validación completa de un voto
   */
  static validateVote(
    userId: number,
    languageId: number,
    points: number,
    month: string
  ): VoteValidationResult {
    // Validar total de puntos primero
    const totalValidation = this.validateTotalPoints(userId, languageId, points, month);
    if (!totalValidation.isValid) {
      return totalValidation;
    }

    // Luego validar slots
    const slotValidation = this.validateVoteSlots(userId, languageId, points, month);
    if (!slotValidation.isValid) {
      return slotValidation;
    }

    return { isValid: true };
  }
}