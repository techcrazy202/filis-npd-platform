import { initDatabaseSchema } from './init-database';
import { setupTierConfigurations } from './setup-tiers';
import { setupSystemConfiguration } from './setup-system';
import { logger } from '@/utils/logger';

async function completeSetup() {
  logger.info('🚀 Starting complete database setup...');
  
  try {
    // Step 1: Initialize database schema
    logger.info('📊 Step 1: Initializing database schema...');
    await initDatabaseSchema();
    
    // Step 2: Setup tier configurations
    logger.info('🏆 Step 2: Setting up tier configurations...');
    await setupTierConfigurations();
    
    // Step 3: Setup system configuration
    logger.info('⚙️ Step 3: Setting up system configuration...');
    await setupSystemConfiguration();
    
    logger.info('✅ Complete database setup finished successfully!');
    logger.info('🎯 Next steps:');
    logger.info('   1. Run: npm run data:import <path-to-excel-file>');
    logger.info('   2. Start the server: npm run dev');
    
  } catch (error) {
    logger.error('❌ Complete setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeSetup()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export { completeSetup };