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
- **Business Logic Only in Backend** - All validation, authentication, authorization, and business rules must be implemented on the server
- **Frontend is UI/UX Only** - The client should only handle user interactions, display logic, and API calls
- **Security by Design** - Never trust the frontend; validate everything server-side
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
- **UI/UX Only** - No business logic, validation, or security checks in frontend code
- **API Communication** - Only makes AJAX calls to backend endpoints and handles responses
- **Client-Side Validation** - For user experience only (not security); all validation must be duplicated server-side
- **State Management** - Local state for UI reactivity only; server state is source of truth
- Self-contained with own package.json
- esbuild config located in frontend/
- Uses official Alpine.js TypeScript types
- No CDN dependencies - everything bundled

## Code Architecture & Separation of Concerns

### Backend Structure

#### Controllers/Routes (`index.ts`, `/src/routes/`)
- **Responsibility**: HTTP request/response handling, routing, middleware
- **What to include**: Route definitions, request parsing, response formatting
- **What NOT to include**: Business logic, complex validation, data processing

```typescript
// ✅ Good - Route handler delegates to service
.post("/vote", ({ body, user }) => {
  const validation = VoteService.validateVote(user.id, body.languageId, body.points, month);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  const result = VoteService.processVote(user.id, body.languageId, body.points, month);
  return result;
})

// ❌ Bad - Business logic in route handler
.post("/vote", ({ body, user }) => {
  if (body.points < 1 || body.points > 5) throw new Error("Invalid points");
  const votes = getUserVotes(user.id);
  const slot5Used = votes.some(v => v.points === 5);
  // ... complex logic here
})
```

#### Services (`/src/services/`)
- **Responsibility**: Business logic, complex validation, data orchestration
- **What to include**: Validation rules, business workflows, data transformation
- **What NOT to include**: HTTP-specific code, direct database queries

```typescript
// ✅ Good - Service handles business logic
export class VoteService {
  static validateVoteSlots(userId: number, languageId: number, points: number): ValidationResult {
    const userVotes = voteQueries.getUserMonthlyVotes(userId, month);
    const slot5Used = userVotes.some(v => v.points === 5 && v.language_id !== languageId);
    
    if (points === 5 && slot5Used) {
      return { isValid: false, error: "5-point slot already used" };
    }
    return { isValid: true };
  }
}
```

#### Database Layer (`/src/database/`)
- **Responsibility**: Data access, database operations, schema management
- **What to include**: SQL queries, database utilities, migrations
- **What NOT to include**: Business validation, HTTP responses

### Frontend Structure

#### Alpine.js Components (`/frontend/src/js/`)
- **Responsibility**: UI interactions, display logic, user experience
- **What to include**: DOM manipulation, client-side state, API calls, user feedback
- **What NOT to include**: Business validation, security checks, complex business rules

```typescript
// ✅ Good - Frontend handles UI, backend handles validation
async voteForLanguage(languageId: number, points: number) {
  try {
    const response = await fetch('/app/vote', {
      method: 'POST',
      body: JSON.stringify({ languageId, points })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(error.message); // Show backend error to user
      return;
    }
    
    // Update UI with success
    await this.loadUserVotes();
  } catch (error) {
    alert('Network error');
  }
}

// ❌ Bad - Business logic in frontend
canVote(languageId: number, points: number): boolean {
  const slot5Used = Object.values(this.votes).includes(5);
  if (points === 5 && slot5Used) return false; // Business logic belongs in backend
  return true;
}
```

### Security Guidelines

1. **Authentication & Authorization**: Always validate tokens and permissions server-side
2. **Input Validation**: Backend must validate all inputs, regardless of frontend validation
3. **Business Rules**: All business logic enforcement happens in backend services
4. **Data Integrity**: Database constraints and server-side checks prevent invalid data
5. **API Security**: Rate limiting, CORS, and security headers configured server-side

### Anti-Patterns to Avoid

❌ **Frontend-Only Validation**: Relying on client-side checks for security
❌ **Business Logic in Routes**: Complex logic directly in HTTP handlers  
❌ **Mixed Responsibilities**: Services that handle both HTTP and business logic
❌ **Client-Side Security**: Authentication or authorization logic in frontend
❌ **Trusting Client Data**: Accepting frontend validation as sufficient

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

### Development Tools & Scripts

#### Database Management
```bash
bun run reset-db           # Reset database (development only)
```

#### Security Testing
```bash
# Test API endpoints with curl
curl -X POST http://localhost:3000/app/vote \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{"languageId": 1, "points": 5}'

# Test without authentication (should fail)
curl -X POST http://localhost:3000/app/vote \
  -H "Content-Type: application/json" \
  -d '{"languageId": 1, "points": 5}'
```

#### Architecture Validation
- All business logic must be testable independently of HTTP layer
- Frontend validation should be duplicated in backend services
- Database queries should be abstracted in dedicated query modules
- Services should not directly depend on HTTP request/response objects

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
