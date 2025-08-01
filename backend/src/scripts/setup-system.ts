import { initDatabase } from '@/database/connection';
import { dbConfig } from '@/config/environment';
import { logger } from '@/utils/logger';

async function setupSystemConfiguration() {
  logger.info('⚙️ Setting up system configuration...');
  
  try {
    const db = initDatabase(dbConfig);
    
    // Insert system configuration values
    await db.query(`
      INSERT INTO system_config (key, value) VALUES
      ('base_submission_reward', '300'),
      ('max_daily_submissions', '50'),
      ('ai_confidence_threshold', '0.7'),
      ('auto_approval_threshold', '0.9'),
      ('duplicate_detection_threshold', '0.85'),
      ('image_quality_threshold', '0.6'),
      ('max_file_size_mb', '10'),
      ('supported_image_formats', '["jpg", "jpeg", "png", "webp"]'),
      ('reward_processing_delay_hours', '24'),
      ('tier_calculation_frequency_hours', '6'),
      ('analytics_retention_days', '365'),
      ('session_timeout_hours', '24'),
      ('otp_expiry_minutes', '10'),
      ('password_reset_expiry_hours', '2'),
      ('rate_limit_per_minute', '60'),
      ('search_results_limit', '50')
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `);
    
    // Insert AI model configurations
    await db.query(`
      INSERT INTO ai_models (name, provider, model_id, api_endpoint, is_active, capabilities) VALUES
      ('GPT-4 Vision', 'openai', 'gpt-4-vision-preview', 'https://api.openai.com/v1/chat/completions', true, '["text", "vision", "analysis"]'),
      ('Azure OpenAI GPT-4', 'azure', 'gpt-4', null, true, '["text", "analysis"]'),
      ('Claude 3 Vision', 'anthropic', 'claude-3-opus-20240229', 'https://api.anthropic.com/v1/messages', false, '["text", "vision", "analysis"]')
      ON CONFLICT (model_id, provider) DO UPDATE SET
        name = EXCLUDED.name,
        api_endpoint = EXCLUDED.api_endpoint,
        is_active = EXCLUDED.is_active,
        capabilities = EXCLUDED.capabilities
    `);
    
    logger.info('✅ System configuration set up successfully');
    
    // Verify setup
    const configResult = await db.query('SELECT key, value FROM system_config ORDER BY key');
    logger.info('📋 System configurations:');
    configResult.rows.forEach(row => {
      logger.info(`   ${row.key}: ${JSON.stringify(row.value)}`);
    });
    
    const modelsResult = await db.query('SELECT name, provider, is_active FROM ai_models ORDER BY provider, name');
    logger.info('🤖 AI Models:');
    modelsResult.rows.forEach(row => {
      logger.info(`   ${row.name} (${row.provider}): ${row.is_active ? 'Active' : 'Inactive'}`);
    });
    
  } catch (error) {
    logger.error('❌ System configuration setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSystemConfiguration()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export { setupSystemConfiguration };