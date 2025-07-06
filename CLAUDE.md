---

## General Rules

**ALWAYS use the latest stable versions** of all dependencies, tools, and frameworks in the project. Before adding any dependency, research and verify you're using the most current stable release available. This includes:

- Alpine.js (latest stable version)
- Elysia.js and all its plugins
- esbuild
- Database libraries (PostgreSQL, SQLite, Redis clients)
- TypeScript
- Testing frameworks
- CSS frameworks
- Any other dependencies

When in doubt, search for the latest stable version and confirm it's the most recent release.

## Runtime Preference

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Framework & API Preferences

### Backend
- Use **Elysia.js** with Bun for HTTP servers instead of `Bun.serve()` directly or `express`
- `@elysiajs/cors` for CORS middleware
- `@elysiajs/static` for serving static files
- `@elysiajs/swagger` for API documentation
- API routes should use `/app/` prefix for frontend consumption

### Database & Storage
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.

### File System & Process
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- `Bun.$`ls`` instead of execa.
- `WebSocket` is built-in. Don't use `ws`.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Project Architecture

This project uses a **separated backend/frontend architecture** with independent package.json files and TypeScript configurations.

### Overall Structure
```
/
├── package.json              # Backend dependencies & scripts
├── tsconfig.json            # Backend TypeScript config
├── index.ts                 # Backend entry point (Elysia.js)
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

## Backend Architecture

### Tech Stack
- **Bun runtime** - Executes TypeScript directly
- **Elysia.js** - HTTP framework with middleware support
- **TypeScript** - Type safety for server code

### Dependencies
- `elysia` - Core HTTP framework
- `@elysiajs/cors` - CORS middleware
- `@elysiajs/static` - Static file serving
- `@elysiajs/swagger` - API documentation
- `elysiajs-helmet` - Security headers middleware
- `elysia-rate-limit` - Rate limiting protection

### Key Principles
- API routes use `/app/` prefix (not `/api/`)
- Serves frontend static files from `frontend/dist/`
- No bundling needed - Bun runs TypeScript directly
- TypeScript config excludes frontend code
- Security middleware with CSP configured for Alpine.js
- Rate limiting: 100 requests per 15 minutes

## Frontend Architecture

### Tech Stack
- **Alpine.js v3.14.9** - Reactive frontend framework
- **Alpine AJAX v0.12.4** - Backend communication
- **esbuild v0.25.5** - Build tool and bundler
- **TypeScript** - Type safety for frontend code

### Dependencies
- `alpinejs` - Core frontend framework
- `@imacrayon/alpine-ajax` - AJAX plugin
- `@types/alpinejs` - Official TypeScript types
- `esbuild` - Build tool (frontend only)

### Build Configuration
- **IIFE format** - For Alpine.js compatibility
- **ES2022 target** - Modern browser support
- **TypeScript compilation** - With browser DOM types
- **CSS bundling** - Processed with esbuild
- **Source maps** - For development debugging

### Key Principles
- Self-contained with own package.json
- esbuild config located in frontend/
- Uses official Alpine.js TypeScript types
- No CDN dependencies - everything bundled

## Development Workflow

### Setup
```bash
bun install              # Install backend dependencies
bun install:frontend     # Install frontend dependencies
```

### Development
```bash
bun run dev             # Start backend + frontend watch mode
bun run type-check      # TypeScript checking (both projects)
bun run lint            # Code linting
bun run format          # Code formatting
```

### Production
```bash
bun run build          # Build frontend for production
bun run start          # Start production server
```

### Individual Projects
```bash
# Backend only
bun index.ts
bun run type-check

# Frontend only
cd frontend
bun run build
bun run dev
bun run type-check
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
