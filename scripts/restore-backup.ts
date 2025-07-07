#!/usr/bin/env bun

import { db } from '../src/database/database';
import { gunzipSync } from 'zlib';
import { existsSync } from 'fs';

// Prevenir restore accidental en producción
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot restore backup in production environment');
  console.error('💡 This script is only available in development mode');
  process.exit(1);
}

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Please provide a backup file path');
  console.error('Usage: bun scripts/restore-backup.ts <backup-file.sql.gz>');
  console.error('');
  console.error('Examples:');
  console.error('  bun scripts/restore-backup.ts backup-2025-01-07-02-00-00.sql.gz');
  console.error('  bun scripts/restore-backup.ts /path/to/backup.sql');
  process.exit(1);
}

async function restoreBackup(filePath: string) {
  try {
    console.log(`🔄 Starting backup restore from: ${filePath}`);
    
    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }
    
    // Leer el archivo
    const fileContent = await Bun.file(filePath).arrayBuffer();
    let backupData: any;
    
    // Intentar descomprimir si es .gz
    if (filePath.endsWith('.gz')) {
      console.log('📦 Decompressing backup file...');
      const decompressed = gunzipSync(Buffer.from(fileContent));
      backupData = JSON.parse(decompressed.toString('utf-8'));
    } else {
      // Asumir que es un archivo SQL plano
      const sqlContent = Buffer.from(fileContent).toString('utf-8');
      backupData = { sqlDump: sqlContent };
    }
    
    // Mostrar información del backup
    if (backupData.metadata) {
      console.log('📋 Backup Information:');
      console.log(`  - Date: ${backupData.metadata.timestamp}`);
      console.log(`  - Environment: ${backupData.metadata.nodeEnv}`);
      console.log(`  - Database Size: ${backupData.metadata.databaseSize} bytes`);
      console.log(`  - Total Tables: ${backupData.metadata.tableCount}`);
      console.log(`  - Records:`);
      console.log(`    - Users: ${backupData.metadata.recordCount.users}`);
      console.log(`    - Languages: ${backupData.metadata.recordCount.languages}`);
      console.log(`    - Votes: ${backupData.metadata.recordCount.votes}`);
      console.log(`    - Monthly Votes: ${backupData.metadata.recordCount.user_monthly_votes}`);
    }
    
    // Confirmar antes de proceder
    console.log('');
    console.log('⚠️  This will completely replace your current database!');
    console.log('Press Ctrl+C to cancel or Enter to continue...');
    
    // Esperar confirmación del usuario
    const confirmation = prompt('Type "yes" to confirm restore:');
    if (confirmation !== 'yes') {
      console.log('❌ Restore cancelled');
      process.exit(0);
    }
    
    // Ejecutar el SQL
    console.log('🔄 Restoring database...');
    
    // Deshabilitar foreign keys temporalmente
    db.exec('PRAGMA foreign_keys = OFF;');
    
    // Ejecutar el SQL dump
    const sqlStatements = backupData.sqlDump.split(';');
    let executedStatements = 0;
    
    for (const statement of sqlStatements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        try {
          db.exec(trimmed);
          executedStatements++;
        } catch (error) {
          console.warn(`⚠️  Warning executing statement: ${trimmed}`);
          console.warn(`Error: ${error}`);
        }
      }
    }
    
    // Rehabilitar foreign keys
    db.exec('PRAGMA foreign_keys = ON;');
    
    console.log(`✅ Backup restored successfully!`);
    console.log(`📊 Executed ${executedStatements} SQL statements`);
    
    // Mostrar estadísticas de la base de datos restaurada
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number },
      languages: db.prepare('SELECT COUNT(*) as count FROM languages').get() as { count: number },
      votes: db.prepare('SELECT COUNT(*) as count FROM votes').get() as { count: number },
      user_monthly_votes: db.prepare('SELECT COUNT(*) as count FROM user_monthly_votes').get() as { count: number }
    };
    
    console.log('📈 Database statistics after restore:');
    console.log(`  - Users: ${stats.users.count}`);
    console.log(`  - Languages: ${stats.languages.count}`);
    console.log(`  - Votes: ${stats.votes.count}`);
    console.log(`  - Monthly Votes: ${stats.user_monthly_votes.count}`);
    
  } catch (error) {
    console.error('❌ Backup restore failed:', error);
    throw error;
  }
}

// Ejecutar restore
restoreBackup(backupFile)
  .then(() => {
    console.log('🎉 Restore completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Restore failed:', error);
    process.exit(1);
  });