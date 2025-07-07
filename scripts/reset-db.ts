#!/usr/bin/env bun

import { resetDatabase } from '../src/database/init';

console.log('🔄 Starting database reset...');

try {
  resetDatabase();
  console.log('✅ Database reset completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Database reset failed:', error);
  process.exit(1);
}