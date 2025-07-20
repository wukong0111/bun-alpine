#!/usr/bin/env bun

import { resetDatabase } from "../src/database/init";

// Prevenir reset accidental en producción
if (process.env.NODE_ENV === "production") {
	console.error("❌ Cannot reset database in production environment");
	console.error("💡 This script is only available in development mode");
	process.exit(1);
}

console.log("🔄 Starting database reset...");

try {
	resetDatabase();
	console.log("✅ Database reset completed successfully!");
	process.exit(0);
} catch (error) {
	console.error("❌ Database reset failed:", error);
	process.exit(1);
}
