// backend/src/scripts/init-database.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { initDatabase } from '@/database/connection';
import { dbConfig } from '@/config/environment';
import { logger } from '@/utils/logger';

async function initDatabaseSchema() {
  logger.info('🗄️  Initializing database schema...');
  
  try {
    const db = initDatabase(dbConfig);
    
    // Read schema file
    const schemaPath = join(__dirname, '../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await db.query(schema);
    
    logger.info('✅ Database schema initialized successfully');
    
    // Verify tables were created
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    logger.info(`📋 Created tables: ${tables.join(', ')}`);
    
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabaseSchema()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export { initDatabaseSchema };