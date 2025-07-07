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
  top20: Language[];
  additional: Language[];
  total: number;
}

interface VoteResponse {
  success: boolean;
  message: string;
  remaining_points: number;
}

interface AuthUser {
  id: number;
  githubId: number;
  username: string;
  avatarUrl?: string;
}

interface AuthResponse {
  authenticated: boolean;
  user?: AuthUser;
}

interface UserVotesResponse {
  votePoints: Record<number, number>;
  totalPoints: number;
  remainingPoints: number;
  votesCount: number;
  month: string;
}

// Toast notification types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  duration?: number;
  closable?: boolean;
}

interface RankingApp {
  // Estado de carga
  loading: boolean;
  
  // Autenticación
  user: AuthUser | null;
  isAuthenticated: boolean;
  
  // Datos principales
  featuredLanguages: Language[];
  additionalLanguages: Language[];
  stats: RankingStats | null;
  currentMonth: string;
  
  // Sistema de votación
  votePoints: Record<number, number>;
  pointsUsed: number;
  votingInProgress: boolean;
  refreshingRanking: boolean;
  
  // Métodos principales
  init(): Promise<void>;
  checkUrlErrors(): void;
  loadRankingStats(): Promise<void>;
  loadLanguages(): Promise<void>;
  
  // Autenticación
  checkAuth(): Promise<void>;
  loadUserVotes(): Promise<void>;
  login(): void;
  logout(): Promise<void>;
  
  // Sistema de votación
  getMaxPointsForVote(voteOrder: number): number;
  getCurrentVoteOrder(languageId: number): number;
  getMaxPointsForLanguage(_languageId: number): number;
  canVote(languageId: number, points: number): boolean;
  getVoteButtonText(languageId: number, points: number): string;
  voteForLanguage(languageId: number, points: number): Promise<void>;
  updatePointsUsed(): void;
  updateLanguageRanking(): Promise<void>;
  refreshRanking(): Promise<void>;
  
  // Sistema de notificaciones toast
  showToast(message: string, type?: ToastType, options?: ToastOptions): string | undefined;
  hideToast(toastId: string): void;
  getToastIcon(type: ToastType): string;
  getToastTitle(type: ToastType): string;
  showSuccessMessage(message: string, options?: ToastOptions): void;
  showErrorMessage(message: string, options?: ToastOptions): void;
  showWarningMessage(message: string, options?: ToastOptions): void;
  showInfoMessage(message: string, options?: ToastOptions): void;
  
}

declare global {
  interface Window {
    rankingApp: RankingApp;
  }
}

const rankingApp: RankingApp = {
  // Estado inicial
  loading: true,
  user: null,
  isAuthenticated: false,
  featuredLanguages: [],
  additionalLanguages: [],
  stats: null,
  currentMonth: '',
  votePoints: {},
  pointsUsed: 0,
  votingInProgress: false,
  refreshingRanking: false,

  // Inicialización
  async init() {
    this.loading = true;
    
    // Verificar si hay errores en la URL (ej: callback de auth fallido)
    this.checkUrlErrors();
    
    // Verificar autenticación primero
    await this.checkAuth();
    // Cargar votos existentes si está autenticado
    if (this.isAuthenticated) {
      await this.loadUserVotes();
    }
    // Solo cargar lenguajes, ya que contiene tanto top20 como additional
    await this.loadLanguages();
    // También cargar stats del mes actual
    await this.loadRankingStats();
    this.loading = false;
  },

  // Verificar errores en la URL
  checkUrlErrors() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error === 'auth_failed') {
      this.showErrorMessage('Authentication failed. Please try again.');
      // Limpiar la URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },

  // Cargar estadísticas del ranking actual
  async loadRankingStats() {
    try {
      const response = await fetch('/app/ranking');
      if (!response.ok) throw new Error('Failed to load ranking stats');
      
      const data: RankingResponse = await response.json();
      this.stats = data.stats;
      this.currentMonth = data.month;
    } catch (error) {
      console.error('Error loading ranking stats:', error);
    }
  },

  // Cargar todos los lenguajes
  async loadLanguages() {
    try {
      const response = await fetch('/app/languages');
      if (!response.ok) throw new Error('Failed to load languages');
      
      const data: LanguagesResponse = await response.json();
      // Usar tanto top20 como additional para ranking unificado
      this.featuredLanguages = data.top20;
      this.additionalLanguages = data.additional;
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  },

  // Obtener máximo de puntos según orden de votación
  getMaxPointsForVote(voteOrder: number): number {
    if (voteOrder === 1) return 5; // Primer voto: 5 puntos
    if (voteOrder === 2) return 3; // Segundo voto: 3 puntos
    if (voteOrder === 3) return 2; // Tercer voto: 2 puntos
    return 1; // Resto de votos: 1 punto
  },

  // Obtener orden actual de voto para un lenguaje
  getCurrentVoteOrder(languageId: number): number {
    const currentPoints = this.votePoints[languageId] || 0;
    if (currentPoints === 0) {
      // Nuevo voto - calcular orden basado en votos existentes
      return Object.keys(this.votePoints).length + 1;
    }
    // Ya tiene voto - mantener orden
    return 1; // Simplificado por ahora
  },

  // Obtener máximo de puntos permitido para un lenguaje
  getMaxPointsForLanguage(_languageId: number): number {
    // El frontend solo permite hasta 5 puntos, el backend valida la lógica de slots
    return 5;
  },

  // Verificar si puede votar
  canVote(languageId: number, points: number): boolean {
    if (!this.isAuthenticated) return false;
    
    // Convertir a número para asegurar tipo correcto
    const numPoints = typeof points === 'string' ? parseInt(points) : points;
    
    if (!numPoints || numPoints <= 0 || numPoints > 5) return false;
    if (this.votingInProgress) return false;
    
    // Solo verificar límite total de puntos (la lógica de slots la maneja el backend)
    const currentPoints = this.votePoints[languageId] || 0;
    const newTotal = this.pointsUsed - currentPoints + numPoints;
    
    return newTotal <= 10;
  },

  // Texto del botón de voto
  getVoteButtonText(languageId: number, points: number): string {
    if (!this.isAuthenticated) return 'Sign in to vote';
    if (this.votingInProgress) return 'Voting...';
    if (!points || points <= 0) return 'Enter points';
    if (!this.canVote(languageId, points)) return 'Not enough points';
    return `Vote ${points} point${points > 1 ? 's' : ''}`;
  },

  // Votar por un lenguaje
  async voteForLanguage(languageId: number, points: number) {
    if (!this.isAuthenticated) {
      this.login();
      return;
    }
    
    // Convertir a número para asegurar tipo correcto
    const numPoints = typeof points === 'string' ? parseInt(points) : points;
    
    if (!this.canVote(languageId, numPoints)) return;
    
    this.votingInProgress = true;
    
    try {
      const response = await fetch('/app/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageId,
          points: numPoints
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Vote failed');
      }
      
      const result: VoteResponse = await response.json();
      
      if (result.success) {
        console.log('✅ Vote successful, updating UI...');
        
        // Actualizar puntos localmente (esto ya es reactivo gracias al proxy)
        this.votePoints[languageId] = numPoints;
        this.updatePointsUsed();
        console.log('📊 Points updated:', { languageId, points: numPoints, totalUsed: this.pointsUsed });
        
        // Actualizar el ranking de forma reactiva sin recargar toda la página
        await this.updateLanguageRanking();
        await this.loadRankingStats();
        
        // Mostrar mensaje de éxito más elegante
        this.showSuccessMessage(`Successfully voted ${numPoints} points! ${result.remaining_points} points remaining.`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error submitting vote. Please try again.';
      this.showErrorMessage(errorMessage);
    } finally {
      this.votingInProgress = false;
    }
  },

  // Actualizar puntos usados
  updatePointsUsed() {
    this.pointsUsed = Object.values(this.votePoints).reduce((sum, points) => sum + (points || 0), 0);
  },
  
  // Actualizar ranking de lenguajes (reactivo)
  async updateLanguageRanking() {
    try {
      console.log('🔄 Updating language ranking...');
      const response = await fetch('/app/languages');
      if (!response.ok) throw new Error('Failed to load languages');
      
      const data: LanguagesResponse = await response.json();
      console.log('📊 New data received:', { top20: data.top20.length, additional: data.additional.length });
      
      // En Alpine.js v3, simplemente reasignar arrays funciona mejor
      this.featuredLanguages = data.top20;
      this.additionalLanguages = data.additional;
      
      console.log('✅ Arrays updated:', { 
        featured: this.featuredLanguages.length, 
        additional: this.additionalLanguages.length 
      });
      
      // Forzar actualización de Alpine.js
      setTimeout(() => {
        console.log('🔄 Forcing Alpine refresh...');
      }, 100);
    } catch (error) {
      console.error('Error updating language ranking:', error);
    }
  },
  
  // Refrescar ranking completo (botón manual)
  async refreshRanking() {
    if (this.refreshingRanking) return;
    
    this.refreshingRanking = true;
    try {
      await Promise.all([
        this.updateLanguageRanking(),
        this.loadRankingStats(),
        this.isAuthenticated ? this.loadUserVotes() : Promise.resolve()
      ]);
      this.showSuccessMessage('Ranking updated successfully!');
    } catch (error) {
      console.error('Error refreshing ranking:', error);
      this.showErrorMessage('Failed to refresh ranking. Please try again.');
    } finally {
      this.refreshingRanking = false;
    }
  },
  
  // Sistema de Toast Notifications
  showToast(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    const {
      title = this.getToastTitle(type),
      duration = 5000,
      closable = true
    } = options;

    const container = document.getElementById('toast-container');
    if (!container) return;

    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Generar ID único para el toast
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    toast.id = toastId;

    // Crear contenido del toast
    toast.innerHTML = `
      <div class="toast-icon">${this.getToastIcon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      ${closable ? '<button class="toast-close" aria-label="Close">&times;</button>' : ''}
    `;

    // Agregar al container
    container.appendChild(toast);

    // Configurar cierre manual
    if (closable) {
      const closeBtn = toast.querySelector('.toast-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideToast(toastId));
      }
    }

    // Mostrar toast con animación
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto-ocultar después del duration
    if (duration > 0) {
      setTimeout(() => {
        this.hideToast(toastId);
      }, duration);
    }

    return toastId;
  },

  hideToast(toastId: string) {
    const toast = document.getElementById(toastId);
    if (!toast) return;

    toast.classList.remove('show');
    toast.classList.add('hide');

    // Remover del DOM después de la animación
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  getToastIcon(type: ToastType): string {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'i'
    };
    return icons[type] || icons.info;
  },

  getToastTitle(type: ToastType): string {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    return titles[type] || titles.info;
  },

  // Métodos de conveniencia para diferentes tipos de toast
  showSuccessMessage(message: string, options?: ToastOptions) {
    this.showToast(message, 'success', options);
  },
  
  showErrorMessage(message: string, options?: ToastOptions) {
    this.showToast(message, 'error', { duration: 7000, ...options });
  },

  showWarningMessage(message: string, options?: ToastOptions) {
    this.showToast(message, 'warning', options);
  },

  showInfoMessage(message: string, options?: ToastOptions) {
    this.showToast(message, 'info', options);
  },

  // Verificar estado de autenticación
  async checkAuth() {
    try {
      const response = await fetch('/app/auth/me');
      if (!response.ok) throw new Error('Failed to check auth');
      
      const data: AuthResponse = await response.json();
      this.isAuthenticated = data.authenticated;
      this.user = data.user || null;
    } catch (error) {
      console.error('Error checking auth:', error);
      this.isAuthenticated = false;
      this.user = null;
    }
  },

  // Cargar votos existentes del usuario
  async loadUserVotes() {
    if (!this.isAuthenticated) return;
    
    try {
      const response = await fetch('/app/user/votes');
      
      if (!response.ok) {
        throw new Error(`Failed to load user votes: ${response.status}`);
      }
      
      const data: UserVotesResponse = await response.json();
      this.votePoints = data.votePoints;
      this.pointsUsed = data.totalPoints;
    } catch (error) {
      console.error('Error loading user votes:', error);
      // No es crítico, continúa con votos vacíos
      this.votePoints = {};
      this.pointsUsed = 0;
    }
  },

  // Iniciar sesión con GitHub
  login() {
    window.location.href = '/app/auth/login';
  },

  // Cerrar sesión
  async logout() {
    try {
      const response = await fetch('/app/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        this.isAuthenticated = false;
        this.user = null;
        this.votePoints = {};
        this.pointsUsed = 0;
        
        // Mostrar confirmación de logout
        this.showSuccessMessage('Logged out successfully');
        
        // No recargar la página, solo limpiar estado
        // Alpine.js se encargará de actualizar la UI reactivamente
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
};

// Configurar reactividad para votePoints
const originalVotePoints = rankingApp.votePoints;
rankingApp.votePoints = new Proxy(originalVotePoints, {
  set(target, property, value) {
    if (typeof property === 'string') {
      const numKey = parseInt(property);
      if (!isNaN(numKey)) {
        target[numKey] = value as number;
        rankingApp.updatePointsUsed();
      }
    }
    return true;
  }
});

// Registrar la app globalmente
window.rankingApp = rankingApp;

// Inicializar Alpine.js con auto-init
Alpine.data('rankingApp', () => ({
  ...rankingApp,
  // Funciones que operan directamente en el contexto de Alpine (this se refiere al estado de Alpine)
  async voteForLanguage(languageId: number, points: number) {
    return rankingApp.voteForLanguage.call(this, languageId, points);
  },
  async refreshRanking() {
    return rankingApp.refreshRanking.call(this);
  },
  async updateLanguageRanking() {
    return rankingApp.updateLanguageRanking.call(this);
  },
  async logout() {
    return rankingApp.logout.call(this);
  },
  // Otras funciones que no modifican estado pueden usar bind
  getMaxPointsForLanguage: rankingApp.getMaxPointsForLanguage.bind(rankingApp),
  canVote: rankingApp.canVote.bind(rankingApp),
  getVoteButtonText: rankingApp.getVoteButtonText.bind(rankingApp),
  login: rankingApp.login.bind(rankingApp)
  // logout usa la implementación personalizada arriba
}));

Alpine.start();

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  rankingApp.init();
});