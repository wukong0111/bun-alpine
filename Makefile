# Development Makefile for bun-alpine project

.PHONY: help install dev build start stop clean db-up db-down db-reset db-logs type-check lint format test

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install all dependencies (backend + frontend)"
	@echo "  dev         - Start development environment (database + server)"
	@echo "  build       - Build frontend for production"
	@echo "  start       - Start production server"
	@echo ""
	@echo "Database commands:"
	@echo "  db-up       - Start PostgreSQL database"
	@echo "  db-down     - Stop PostgreSQL database"
	@echo "  db-reset    - Reset database (down + up + migrate)"
	@echo "  db-logs     - Show database logs"
	@echo ""
	@echo "Development tools:"
	@echo "  type-check  - Run TypeScript type checking"
	@echo "  lint        - Run code linting"
	@echo "  format      - Format code"
	@echo "  test        - Run tests"
	@echo ""
	@echo "Cleanup:"
	@echo "  stop        - Stop all services"
	@echo "  clean       - Remove containers and volumes"

# Installation
install:
	@echo "Installing backend dependencies..."
	bun install
	@echo "Installing frontend dependencies..."
	bun install:frontend

# Development
dev: db-up
	@echo "Starting development server..."
	bun run dev

# Production
build:
	@echo "Building frontend for production..."
	bun run build

start:
	@echo "Starting production server..."
	bun run start

# Database management
db-up:
	@echo "Starting PostgreSQL database..."
	docker compose up -d postgres
	@echo "Waiting for database to be ready..."
	@sleep 3
	@docker compose exec postgres pg_isready -U dev_user -d ranking_dev || (echo "Database not ready, waiting..." && sleep 5)

db-down:
	@echo "Stopping PostgreSQL database..."
	docker compose down postgres

db-reset: db-down db-up
	@echo "Database reset complete"

db-logs:
	@echo "Showing database logs..."
	docker compose logs -f postgres

# Development tools
type-check:
	@echo "Running TypeScript type checking..."
	bun run type-check

lint:
	@echo "Running code linting..."
	bun run lint

format:
	@echo "Formatting code..."
	bun run format

test:
	@echo "Running tests..."
	bun test

# Cleanup
stop:
	@echo "Stopping all services..."
	docker compose down

clean:
	@echo "Removing containers and volumes..."
	docker compose down -v
	docker compose rm -f