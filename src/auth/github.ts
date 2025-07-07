export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface GitHubAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GitHubAuth {
  constructor(private config: GitHubAuthConfig) {}

  // Generar URL de autorización de GitHub
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Intercambiar código por token de acceso
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json() as { access_token?: string; error?: string };
    
    if (data.error || !data.access_token) {
      throw new Error(data.error || 'No access token received');
    }

    return data.access_token;
  }

  // Obtener información del usuario desde GitHub
  async getUserInfo(accessToken: string): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user = await response.json() as GitHubUser;
    return user;
  }

  // Flujo completo de autenticación
  async authenticateUser(code: string): Promise<GitHubUser> {
    const accessToken = await this.exchangeCodeForToken(code);
    const user = await this.getUserInfo(accessToken);
    return user;
  }
}