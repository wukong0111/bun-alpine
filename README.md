# Programming Languages Ranking 2025

A modern full-stack TypeScript application for community-driven programming language ranking using **Bun**, **Elysia.js**, and **Alpine.js**. Features GitHub OAuth authentication, real-time voting, and reactive UI updates.

## ✨ Features

- **📊 Monthly Rankings** - Community-driven ranking of 55+ programming languages
- **🔐 GitHub Authentication** - Secure OAuth login with GitHub accounts
- **🗳️ Cumulative Voting System** - 10 points per month, max 5 points per language, add 1-5 points at a time
- **⚡ Real-time Updates** - Reactive UI updates without page reloads
- **🔒 Server-side Validation** - All business logic secured in backend
- **📱 Responsive Design** - Modern UI that works on all devices
- **🔄 Refresh Button** - Manual ranking updates with visual feedback
- **📈 Live Statistics** - Real-time vote counts and user participation

## 🚀 Tech Stack

### Backend
- **[Bun](https://bun.sh)** - Fast JavaScript runtime and package manager
- **[Elysia.js](https://elysiajs.com/)** - Ergonomic web framework for Bun
- **PostgreSQL** - Server database with postgres client
- **GitHub OAuth** - Authentication via GitHub accounts
- **JWT Sessions** - Secure session management with HTTP-only cookies
- **TypeScript** - Type safety and modern JavaScript features
- **Security middleware** - Helmet, rate limiting, and CORS protection

### Frontend  
- **[Alpine.js](https://alpinejs.dev/)** - Lightweight reactive framework for real-time UI updates
- **[Alpine AJAX](https://alpine-ajax.js.org/)** - Server communication plugin
- **[esbuild](https://esbuild.github.io/)** - Fast bundler and build tool
- **TypeScript** - Type safety for frontend code
- **Reactive Voting** - Real-time ranking updates without page reloads

## 📁 Project Structure

```
/
├── package.json              # Backend dependencies & scripts
├── tsconfig.json            # Backend TypeScript config  
├── index.ts                 # Backend entry point (Elysia.js server)
├── src/                     # Backend source code
│   ├── auth/               # GitHub OAuth & JWT session management
│   ├── database/           # PostgreSQL queries, migrations & schema
│   ├── services/           # Business logic (vote validation, etc.)
│   └── utils/              # Utilities
└── frontend/                # Frontend project (self-contained)
    ├── package.json         # Frontend dependencies
    ├── tsconfig.json        # Frontend TypeScript config
    ├── esbuild.config.ts    # Build configuration
    ├── public/              # Static HTML files
    ├── src/                 # Frontend source code
    │   ├── js/             # TypeScript/JavaScript
    │   ├── css/            # Stylesheets
    │   └── components/     # Alpine.js components
    └── dist/               # Built assets (served by backend)
```

## 🛠️ Setup

### Prerequisites
- [Bun](https://bun.sh) v1.2.18 or later

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bun-alpine
   ```

2. **Install backend dependencies**
   ```bash
   bun install
   ```

3. **Install frontend dependencies**
   ```bash
   bun install:frontend
   # or manually: cd frontend && bun install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub OAuth credentials
   ```
   
   Required environment variables:
   - `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
   - `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret  
   - `BASE_URL` - Base URL for OAuth redirects (default: http://localhost:3000)
   - `JWT_SECRET` - Secret key for JWT tokens (generate a strong random string)

## 🚦 Development

### Start Development Server
```bash
bun run dev
```
This starts:
- Backend server with hot reload on `http://localhost:3000`
- Frontend build process with watch mode

### Other Commands
```bash
bun run build          # Build frontend for production
bun run start          # Start production server (NODE_ENV=production)
bun run start:dev      # Start development server (NODE_ENV=development)
bun run type-check     # TypeScript checking (both projects)
bun run lint           # Code linting with Biome
bun run format         # Code formatting with Biome
bun run reset-db       # Reset database (development only)
```

### Working with Individual Projects

**Backend only:**
```bash
bun index.ts                # Run server directly
bun run type-check         # Check backend types
```

**Frontend only:**
```bash
cd frontend
bun run build              # Build frontend
bun run dev               # Frontend watch mode  
bun run type-check        # Check frontend types
```

## 🌐 API Endpoints

The backend serves API endpoints under the `/app/` prefix:

### Public Endpoints
- `GET /app/health` - Health check and database stats
- `GET /app/languages` - Get all programming languages with rankings
- `GET /app/ranking` - Get current month's top 20 ranking

### Authentication
- `GET /app/auth/login` - Initiate GitHub OAuth login
- `GET /app/auth/callback` - GitHub OAuth callback handler
- `POST /app/auth/logout` - Logout and clear session
- `GET /app/auth/me` - Get current user info

### Protected Endpoints (Require Authentication)
- `POST /app/vote` - Submit vote for a programming language
- `GET /app/user/votes` - Get current user's votes for this month

Frontend static files are served from `/` (root path).

## 🏗️ Architecture Highlights

### Backend Features
- **GitHub OAuth Integration** - Secure authentication with GitHub accounts
- **JWT Session Management** - HTTP-only cookies with secure token handling
- **Vote Validation System** - Server-side business logic for cumulative voting limits
- **PostgreSQL Database** - Server database with migrations and seeding
- **Direct TypeScript execution** - No build step needed
- **API documentation** - Auto-generated Swagger docs
- **Security headers** - Content Security Policy, XSS protection, CORS
- **Rate limiting** - 100 requests per 15 minutes protection

### Frontend Features  
- **Reactive UI Updates** - Real-time ranking changes without page reloads
- **Interactive Voting** - Immediate feedback with vote validation
- **Alpine.js Reactivity** - Efficient DOM updates and state management
- **GitHub OAuth UI** - Seamless login/logout experience
- **No CDN dependencies** - All libraries bundled
- **Official TypeScript types** - Full type safety
- **ES2022 target** - Modern JavaScript features

### Development Experience
- **Hot reload** - Both backend and frontend
- **Type checking** - Separate configs for each project
- **Linting & formatting** - Consistent code style
- **Source maps** - Easy debugging in development

## 🚀 Deployment

### Production Build
```bash
bun run build    # Build frontend assets
bun run start    # Start production server (with production security)
```

### Environment-Specific Security
- **Development**: Permissive CSP with `'unsafe-eval'` for Alpine.js, 1000 req/15min rate limit
- **Production**: Strict CSP without `'unsafe-eval'`, 100 req/15min rate limit

### Railway Deployment

This project is ready for Railway deployment with zero configuration:

#### Quick Deploy
1. **Connect GitHub repository** to Railway
2. **Deploy automatically** - Railway will detect Bun and build using `nixpacks.toml`
3. **Environment variables** - Set `NODE_ENV=production` in Railway dashboard

#### Manual Deploy Steps
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

#### Railway Configuration
- **Port**: Automatically configured via `process.env.PORT`
- **Build**: Uses `nixpacks.toml` with latest Bun version
- **Environment**: Set `NODE_ENV=production` for production security
- **Ignore files**: `.railwayignore` optimizes deployment size

#### Environment Variables
- `NODE_ENV=production` (for production security settings)
- `PORT` (automatically set by Railway)

### Local Environment Variables
The server runs on port `3000` by default. Configure via environment or modify `index.ts`.

## 📚 Learn More

- [Bun Documentation](https://bun.sh/docs)
- [Elysia.js Documentation](https://elysiajs.com/introduction)
- [Alpine.js Documentation](https://alpinejs.dev/start-here)
- [Alpine AJAX Documentation](https://alpine-ajax.js.org/)

## 🤝 Contributing

This project follows the guidelines in `CLAUDE.md` for consistent development practices.

---

Built with ❤️ using [Bun](https://bun.sh) - the fast all-in-one JavaScript runtime.
