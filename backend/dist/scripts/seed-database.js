// backend/src/scripts/seed-database.ts
import { initDatabase } from '@/database/connection';
import { dbConfig } from '@/config/environment';
import { logger } from '@/utils/logger';
import { UserRepository } from '@/database/repositories/UserRepository';
async function seedDatabase() {
    logger.info('🌱 Seeding database...');
    try {
        const db = initDatabase(dbConfig);
        const userRepo = new UserRepository();
        // Create admin user
        const adminExists = await userRepo.findByEmail('admin@fi-lis.com');
        if (!adminExists) {
            await userRepo.createUser({
                email: 'admin@fi-lis.com',
                phone: '+919999999999',
                password: 'Admin@123',
                full_name: 'System Administrator'
            });
            // Update admin user with additional permissions
            const admin = await userRepo.findByEmail('admin@fi-lis.com');
            if (admin) {
                await userRepo.update(admin.id, {
                    email_verified: true,
                    phone_verified: true,
                    kyc_status: 'complete',
                    is_active: true
                });
            }
            logger.info('✅ Admin user created: admin@fi-lis.com / Admin@123');
        }
        else {
            logger.info('ℹ️  Admin user already exists');
        }
        // Seed user tier configurations
        await db.query(`
      INSERT INTO user_tier_configs (tier, min_submissions, min_quality_score, min_approval_rate, reward_multiplier, tier_bonus) 
      VALUES 
        ('bronze', 0, 0.0, 0.0, 1.0, 0),
        ('silver', 10, 7.0, 0.8, 1.1, 100),
        ('gold', 25, 8.0, 0.85, 1.2, 250),
        ('platinum', 50, 8.5, 0.9, 1.3, 500),
        ('diamond', 100, 9.0, 0.95, 1.5, 1000)
      ON CONFLICT (tier) DO UPDATE SET
        min_submissions = EXCLUDED.min_submissions,
        min_quality_score = EXCLUDED.min_quality_score,
        min_approval_rate = EXCLUDED.min_approval_rate,
        reward_multiplier = EXCLUDED.reward_multiplier,
        tier_bonus = EXCLUDED.tier_bonus
    `);
        logger.info('✅ User tier configurations seeded');
        // Seed AI model configurations
        await db.query(`
      INSERT INTO ai_models (name, provider, model_id, api_endpoint, is_active, cost_per_token, capabilities)
      VALUES 
        ('GPT-4 Turbo', 'azure', 'gpt-4', 'https://api.openai.com/v1/chat/completions', true, 0.00003, '["text", "vision", "analysis"]'),
        ('GPT-4 Vision', 'openai', 'gpt-4-vision-preview', 'https://api.openai.com/v1/chat/completions', true, 0.00010, '["text", "vision", "analysis"]'),
        ('Claude 3.5 Sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', 'https://api.anthropic.com/v1/messages', false, 0.00015, '["text", "analysis"]'),
        ('Gemini Pro Vision', 'google', 'gemini-pro-vision', 'https://generativelanguage.googleapis.com/v1beta/models', false, 0.00025, '["text", "vision", "analysis"]')
      ON CONFLICT (model_id, provider) DO UPDATE SET
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active,
        cost_per_token = EXCLUDED.cost_per_token,
        capabilities = EXCLUDED.capabilities
    `);
        logger.info('✅ AI model configurations seeded');
        // Seed scraping sources
        await db.query(`
      INSERT INTO scraping_sources (name, base_url, search_endpoint, selectors, rate_limit, is_active)
      VALUES 
        ('Amazon India', 'https://www.amazon.in', '/s?k={query}', '{"title": ".a-size-medium", "price": ".a-price-whole", "image": ".s-image"}', 5, true),
        ('Flipkart', 'https://www.flipkart.com', '/search?q={query}', '{"title": "._4rR01T", "price": "._30jeq3", "image": "._396cs4"}', 5, true),
        ('BigBasket', 'https://www.bigbasket.com', '/ps/?q={query}', '{"title": ".break-words", "price": ".discnt-price", "image": ".product-image"}', 3, true),
        ('Grofers/Blinkit', 'https://blinkit.com', '/search?q={query}', '{"title": ".Product__ProductName", "price": ".Product__UpdatedPrice", "image": ".Product__ProductImage"}', 3, false)
      ON CONFLICT (name) DO UPDATE SET
        base_url = EXCLUDED.base_url,
        search_endpoint = EXCLUDED.search_endpoint,
        selectors = EXCLUDED.selectors,
        rate_limit = EXCLUDED.rate_limit,
        is_active = EXCLUDED.is_active
    `);
        logger.info('✅ Web scraping sources seeded');
        // Seed system configuration
        await db.query(`
      INSERT INTO system_config (key, value)
      VALUES 
        ('default_reward_amount', '300'),
        ('regional_bonus_amount', '50'),
        ('max_daily_submissions', '10'),
        ('auto_approval_threshold', '0.85'),
        ('image_quality_threshold', '0.7'),
        ('duplicate_similarity_threshold', '0.8')
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `);
        logger.info('✅ System configuration seeded');
        logger.info('🎉 Database seeding completed successfully');
    }
    catch (error) {
        logger.error('❌ Database seeding failed:', error);
        throw error;
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
        logger.error(error);
        process.exit(1);
    });
}
export { seedDatabase };
//# sourceMappingURL=seed-database.js.map