import type { Context } from 'elysia';

export function adminAuth() {
  return async (context: Context) => {
    const { headers } = context;
    
    // Verificar que existe la API key de admin
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      throw new Error('Admin API key not configured');
    }
    
    // Obtener el header de autorización
    const authHeader = headers.authorization;
    if (!authHeader) {
      context.set.status = 401;
      throw new Error('Authorization header required');
    }
    
    // Verificar formato Bearer token
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      context.set.status = 401;
      throw new Error('Invalid authorization format. Use: Bearer <token>');
    }
    
    // Verificar que el token coincide con la API key
    if (token !== adminApiKey) {
      context.set.status = 401;
      throw new Error('Invalid admin API key');
    }
    
    // Agregar información de admin al contexto
    context.admin = {
      authenticated: true,
      timestamp: new Date().toISOString()
    };
    
    return context;
  };
}

// Middleware específico para rutas de admin
export function requireAdmin() {
  return async (context: Context) => {
    try {
      return await adminAuth()(context);
    } catch (error) {
      console.error('Admin authentication failed:', error);
      context.set.status = 401;
      return {
        error: 'Admin access required',
        message: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  };
}

// Tipos para TypeScript
declare global {
  namespace Express {
    interface Request {
      admin?: {
        authenticated: boolean;
        timestamp: string;
      };
    }
  }
}

export type AdminContext = {
  admin: {
    authenticated: boolean;
    timestamp: string;
  };
};