import { initDatabase } from '@/database/connection';
import { dbConfig } from '@/config/environment';
import { logger } from '@/utils/logger';
async function setupTierConfigurations() {
    logger.info('🏆 Setting up user tier configurations...');
    try {
        const db = initDatabase(dbConfig);
        // Insert tier configurations
        await db.query(`
      INSERT INTO user_tier_configs (tier, min_submissions, min_quality_score, min_approval_rate, reward_multiplier, tier_bonus, benefits) VALUES
      ('bronze', 0, 0.0, 0.0, 1.0, 0, '{"description": "Entry level", "features": ["Basic rewards", "Standard support"]}'),
      ('silver', 10, 6.0, 70.0, 1.2, 500, '{"description": "Active contributor", "features": ["20% bonus rewards", "Priority support", "Early access"]}'),
      ('gold', 50, 7.5, 80.0, 1.5, 1500, '{"description": "Quality contributor", "features": ["50% bonus rewards", "Premium support", "Beta features"]}'),
      ('platinum', 200, 8.5, 85.0, 2.0, 5000, '{"description": "Expert contributor", "features": ["100% bonus rewards", "VIP support", "Exclusive events"]}'),
      ('diamond', 500, 9.0, 90.0, 2.5, 15000, '{"description": "Elite contributor", "features": ["150% bonus rewards", "Personal account manager", "Special recognition"]"}')
      ON CONFLICT (tier) DO UPDATE SET
        min_submissions = EXCLUDED.min_submissions,
        min_quality_score = EXCLUDED.min_quality_score,
        min_approval_rate = EXCLUDED.min_approval_rate,
        reward_multiplier = EXCLUDED.reward_multiplier,
        tier_bonus = EXCLUDED.tier_bonus,
        benefits = EXCLUDED.benefits
    `);
        logger.info('✅ Tier configurations set up successfully');
        // Verify setup
        const result = await db.query('SELECT tier, min_submissions, reward_multiplier FROM user_tier_configs ORDER BY min_submissions');
        logger.info('📋 Configured tiers:');
        result.rows.forEach(row => {
            logger.info(`   ${row.tier}: ${row.min_submissions} submissions, ${row.reward_multiplier}x multiplier`);
        });
    }
    catch (error) {
        logger.error('❌ Tier configuration setup failed:', error);
        throw error;
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupTierConfigurations()
        .then(() => process.exit(0))
        .catch((error) => {
        logger.error(error);
        process.exit(1);
    });
}
export { setupTierConfigurations };
//# sourceMappingURL=setup-tiers.js.map