# Bun + Alpine.js Full-Stack Application

A modern full-stack TypeScript application using **Bun**, **Elysia.js**, and **Alpine.js** with separated backend/frontend architecture.

## 🚀 Tech Stack

### Backend
- **[Bun](https://bun.sh)** - Fast JavaScript runtime and package manager
- **[Elysia.js](https://elysiajs.com/)** - Ergonomic web framework for Bun
- **TypeScript** - Type safety and modern JavaScript features
- **Security middleware** - Helmet and rate limiting for production security

### Frontend  
- **[Alpine.js](https://alpinejs.dev/)** - Lightweight reactive framework
- **[Alpine AJAX](https://alpine-ajax.js.org/)** - Server communication plugin
- **[esbuild](https://esbuild.github.io/)** - Fast bundler and build tool
- **TypeScript** - Type safety for frontend code

## 📁 Project Structure

```
/
├── package.json              # Backend dependencies & scripts
├── tsconfig.json            # Backend TypeScript config  
├── index.ts                 # Backend entry point (Elysia.js server)
├── src/                     # Backend source code
│   ├── routes/             # API routes (/app/ prefix)
│   ├── services/           # Business logic
│   ├── middleware/         # Custom middleware
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

- `GET /app/health` - Health check endpoint
- `GET /app/users` - Get users list
- `POST /app/users` - Create new user

Frontend static files are served from `/` (root path).

## 🏗️ Architecture Highlights

### Backend Features
- **Direct TypeScript execution** - No build step needed
- **CORS enabled** - Ready for frontend communication
- **API documentation** - Auto-generated Swagger docs
- **Static file serving** - Serves frontend assets
- **Security headers** - Content Security Policy, XSS protection
- **Rate limiting** - 100 requests per 15 minutes protection

### Frontend Features  
- **No CDN dependencies** - All libraries bundled
- **Official TypeScript types** - Full type safety
- **IIFE format** - Compatible with Alpine.js
- **ES2022 target** - Modern JavaScript features
- **CSS bundling** - Optimized stylesheets

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

### Environment Variables
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
