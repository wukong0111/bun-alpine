import { jwt } from '@elysiajs/jwt';
import { cookie } from '@elysiajs/cookie';
import { User } from '../database/queries';

export interface SessionData {
  userId: number;
  githubId: number;
  username: string;
  avatarUrl?: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  user?: SessionData;
  isAuthenticated: boolean;
}

// Configuración JWT
export const jwtConfig = {
  name: 'jwt',
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  exp: '7d', // Token válido por 7 días
};

// Configuración de cookies
export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
  path: '/',
};

// Crear token JWT para un usuario
export async function createSessionToken(user: User, jwt: any): Promise<string> {
  const payload: Omit<SessionData, 'iat' | 'exp'> = {
    userId: user.id,
    githubId: user.github_id,
    username: user.username,
    avatarUrl: user.avatar_url || undefined,
  };

  const token = await jwt.sign(payload);
  return token;
}

// Verificar y extraer datos del token JWT
export async function verifySessionToken(token: string, jwt: any): Promise<SessionData | null> {
  try {
    const payload = await jwt.verify(token);
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

// Middleware para obtener usuario autenticado
export function getAuthenticatedUser(context: any): AuthContext {
  const token = context.cookie?.auth_token;
  
  if (!token) {
    return { isAuthenticated: false };
  }

  // El token se verificará en el middleware de autenticación
  const user = context.user as SessionData | undefined;
  
  return {
    user,
    isAuthenticated: !!user,
  };
}

// Middleware para rutas protegidas
export function requireAuth(context: any) {
  const auth = getAuthenticatedUser(context);
  
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return auth.user!;
}