import Alpine from 'alpinejs';
import ajax from '@imacrayon/alpine-ajax';

Alpine.plugin(ajax);

// Interfaces para el sistema de ranking
interface Language {
  id: number;
  name: string;
  description: string;
  color: string;
  is_featured: boolean;
  total_votes: number;
  current_month_points?: number;
  current_month_voters?: number;
}

interface RankingStats {
  total_votes: number;
  total_users: number;
  total_points: number | null;
}

interface RankingResponse {
  month: string;
  ranking: Language[];
  stats: RankingStats;
}

interface LanguagesResponse {
  featured: Language[];
  additional: Language[];
}

interface VoteResponse {
  success: boolean;
  message: string;
  remaining_points: number;
}

interface RankingApp {
  // Estado de carga
  loading: boolean;
  
  // Datos principales
  featuredLanguages: Language[];
  additionalLanguages: Language[];
  stats: RankingStats | null;
  currentMonth: string;
  
  // Sistema de votación
  votePoints: Record<number, number>;
  pointsUsed: number;
  votingInProgress: boolean;
  
  // Métodos principales
  init(): Promise<void>;
  loadRanking(): Promise<void>;
  loadLanguages(): Promise<void>;
  
  // Sistema de votación
  getMaxPointsForRank(rank: number): number;
  canVote(languageId: number, points: number): boolean;
  getVoteButtonText(languageId: number, points: number): string;
  voteForLanguage(languageId: number, points: number): Promise<void>;
  updatePointsUsed(): void;
  
  // Lenguajes adicionales
  selectAdditionalLanguage(language: Language): void;
}

declare global {
  interface Window {
    rankingApp: RankingApp;
  }
}

const rankingApp: RankingApp = {
  // Estado inicial
  loading: true,
  featuredLanguages: [],
  additionalLanguages: [],
  stats: null,
  currentMonth: '',
  votePoints: {},
  pointsUsed: 0,
  votingInProgress: false,

  // Inicialización
  async init() {
    this.loading = true;
    await Promise.all([
      this.loadRanking(),
      this.loadLanguages()
    ]);
    this.loading = false;
  },

  // Cargar ranking actual
  async loadRanking() {
    try {
      const response = await fetch('/app/ranking');
      if (!response.ok) throw new Error('Failed to load ranking');
      
      const data: RankingResponse = await response.json();
      this.featuredLanguages = data.ranking;
      this.stats = data.stats;
      this.currentMonth = data.month;
    } catch (error) {
      console.error('Error loading ranking:', error);
    }
  },

  // Cargar todos los lenguajes
  async loadLanguages() {
    try {
      const response = await fetch('/app/languages');
      if (!response.ok) throw new Error('Failed to load languages');
      
      const data: LanguagesResponse = await response.json();
      // Los featured ya los tenemos del ranking, usar los additional
      this.additionalLanguages = data.additional;
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  },

  // Obtener máximo de puntos según posición en ranking
  getMaxPointsForRank(rank: number): number {
    if (rank === 1) return 5;
    if (rank === 2) return 3;
    if (rank === 3) return 2;
    if (rank <= 10) return 1;
    return 1; // Para el resto también máximo 1 punto
  },

  // Verificar si puede votar
  canVote(languageId: number, points: number): boolean {
    if (!points || points <= 0) return false;
    if (this.votingInProgress) return false;
    
    // Verificar que no exceda el total de puntos
    const currentPoints = this.votePoints[languageId] || 0;
    const newTotal = this.pointsUsed - currentPoints + points;
    
    return newTotal <= 10;
  },

  // Texto del botón de voto
  getVoteButtonText(languageId: number, points: number): string {
    if (this.votingInProgress) return 'Voting...';
    if (!points || points <= 0) return 'Enter points';
    if (!this.canVote(languageId, points)) return 'Not enough points';
    return `Vote ${points} point${points > 1 ? 's' : ''}`;
  },

  // Votar por un lenguaje
  async voteForLanguage(languageId: number, points: number) {
    if (!this.canVote(languageId, points)) return;
    
    this.votingInProgress = true;
    
    try {
      // Por ahora simulamos la votación (hasta implementar GitHub OAuth)
      const response = await fetch('/app/test/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // Mock user ID
          languageId,
          points
        })
      });
      
      if (!response.ok) throw new Error('Vote failed');
      
      const result: VoteResponse = await response.json();
      
      if (result.success) {
        // Actualizar puntos localmente
        this.votePoints[languageId] = points;
        this.updatePointsUsed();
        
        // Mostrar mensaje de éxito (temporal)
        alert(`Successfully voted ${points} points! ${result.remaining_points} points remaining.`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    } finally {
      this.votingInProgress = false;
    }
  },

  // Actualizar puntos usados
  updatePointsUsed() {
    this.pointsUsed = Object.values(this.votePoints).reduce((sum, points) => sum + (points || 0), 0);
  },

  // Seleccionar lenguaje adicional
  selectAdditionalLanguage(language: Language) {
    // Por ahora solo mostrar alerta, luego implementar modal o funcionalidad
    alert(`Selected ${language.name}! Feature coming soon with GitHub OAuth.`);
  }
};

// Configurar reactividad para votePoints
const originalVotePoints = rankingApp.votePoints;
rankingApp.votePoints = new Proxy(originalVotePoints, {
  set(target, property, value) {
    target[property as number] = value;
    rankingApp.updatePointsUsed();
    return true;
  }
});

// Registrar la app globalmente
window.rankingApp = rankingApp;

// Inicializar Alpine.js con auto-init
Alpine.data('rankingApp', () => rankingApp);

Alpine.start();

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  rankingApp.init();
});