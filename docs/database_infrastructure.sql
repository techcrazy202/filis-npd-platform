-- backend/src/database/schema.sql
-- Fi-Lis NPD Platform Database Schema (PostgreSQL 17 Compatible)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types/enums
DO $$ BEGIN
    CREATE TYPE user_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status AS ENUM ('pending', 'partial', 'complete', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('pending', 'processing', 'approved', 'rejected', 'duplicate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reward_status AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE image_type AS ENUM ('front', 'back', 'ingredients', 'nutrition', 'packaging', 'receipt', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('submission_reward', 'bonus_reward', 'tier_bonus', 'referral_bonus');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_provider AS ENUM ('azure', 'openai', 'anthropic', 'google');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    -- KYC Information
    pan_number VARCHAR(10),
    aadhaar_number VARCHAR(12), -- Encrypted
    pan_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified BOOLEAN DEFAULT FALSE,

    -- Payment Information
    upi_id VARCHAR(255),
    bank_account_number VARCHAR(20), -- Encrypted
    bank_ifsc VARCHAR(11),
    bank_holder_name VARCHAR(255),

    -- User Metrics
    total_earnings DECIMAL(10,2) DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    user_tier user_tier DEFAULT 'bronze',
    quality_score DECIMAL(3,2) DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    last_submission_date DATE,

    -- Status & Metadata
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status kyc_status DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCTS TABLE (Enhanced Fi-Lis Schema + NPD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Product Info (Fi-Lis Compatible)
    name VARCHAR(500) NOT NULL,
    product_id VARCHAR(100), -- Original "Product Id" from Excel
    brand VARCHAR(255) NOT NULL,
    description TEXT,

    -- Enhanced Categorization
    industry VARCHAR(100),
    sector VARCHAR(100),
    sub_sector VARCHAR(100),
    segment VARCHAR(100),
    sub_segment VARCHAR(100),
    category VARCHAR(100),

    -- Geographic & Market Data (From Fi-Lis Excel)
    continents VARCHAR(255),
    country VARCHAR(100),
    geo VARCHAR(255),
    country_of_origin VARCHAR(100),
    availability_regions JSONB,
    is_regional_exclusive BOOLEAN DEFAULT FALSE,

    -- Product Identification
    barcode VARCHAR(50),
    product_code VARCHAR(100),
    sku VARCHAR(100),

    -- Ingredients & Nutrition (From Fi-Lis Excel)
    ingredients_list TEXT,
    standardized_ingredients JSONB,
    nutritional_info JSONB,
    calories VARCHAR(50),
    claims TEXT,
    flavour VARCHAR(255),
    allergen_info JSONB,
    dietary_preferences JSONB,

    -- Commercial Information (From Fi-Lis Excel)
    price VARCHAR(50),
    volume_scale VARCHAR(100),
    volume_subscale VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'INR',
    mrp DECIMAL(10,2),
    pack_size VARCHAR(50),

    -- Supply Chain (From Fi-Lis Excel)
    company_name VARCHAR(255),
    standardized_company_name VARCHAR(255),
    manufacturer VARCHAR(255),
    distributor VARCHAR(255),
    retailer VARCHAR(255),

    -- Source & Links (From Fi-Lis Excel)
    product_link TEXT,
    source_name VARCHAR(255),
    website_address TEXT,

    -- Dates (From Fi-Lis Excel)
    manufacture_date DATE,
    expiry_date DATE,
    year VARCHAR(4),
    date_of_entry DATE,
    remarks TEXT,

    -- Platform Metadata
    verification_status verification_status DEFAULT 'pending',
    ai_confidence_score DECIMAL(3,2) DEFAULT 0,
    submission_count INTEGER DEFAULT 0,
    last_verified_at TIMESTAMP WITH TIME ZONE,

    -- NPD Specific
    first_discovered_by UUID REFERENCES users(id),
    discovery_date TIMESTAMP WITH TIME ZONE,
    is_npd BOOLEAN DEFAULT FALSE,
    regional_popularity_score DECIMAL(3,2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NPD SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS npd_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),

    -- Submission Data
    submitted_product_name VARCHAR(500) NOT NULL,
    submitted_brand VARCHAR(255) NOT NULL,
    submitted_category VARCHAR(100),
    raw_submission_data JSONB,

    -- Location & Context
    submission_location JSONB, -- GPS coordinates, address
    store_name VARCHAR(255),
    store_type VARCHAR(100),
    purchase_price DECIMAL(10,2),
    purchase_date DATE,

    -- Processing Status
    status submission_status DEFAULT 'pending',
    ai_verification_data JSONB,
    ai_confidence_score DECIMAL(3,2) DEFAULT 0,
    human_review_notes TEXT,

    -- Rewards
    base_reward DECIMAL(10,2) DEFAULT 300,
    bonus_reward DECIMAL(10,2) DEFAULT 0,
    total_reward DECIMAL(10,2) DEFAULT 300,
    reward_status reward_status DEFAULT 'pending',

    -- Verification Trail
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    auto_approved BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES npd_submissions(id) ON DELETE CASCADE,

    image_url VARCHAR(1000) NOT NULL,
    image_type image_type NOT NULL,
    file_size INTEGER,
    dimensions VARCHAR(20), -- "1920x1080"
    
    -- AI Analysis
    extracted_text JSONB,
    detected_objects JSONB,
    quality_score DECIMAL(3,2) DEFAULT 0,

    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AI MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    provider ai_provider NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    cost_per_token DECIMAL(8,6),
    capabilities JSONB, -- ["text", "vision", "analysis"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(model_id, provider)
);

-- ============================================================================
-- SCRAPING SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraping_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    base_url VARCHAR(255) NOT NULL,
    search_endpoint VARCHAR(500),
    selectors JSONB, -- CSS selectors for data extraction
    rate_limit INTEGER DEFAULT 10, -- requests per minute
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped TIMESTAMP WITH TIME ZONE,
    success_rate DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER TIER CONFIGURATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tier_configs (
    tier user_tier PRIMARY KEY,
    min_submissions INTEGER NOT NULL,
    min_quality_score DECIMAL(3,2) NOT NULL,
    min_approval_rate DECIMAL(3,2) NOT NULL,
    reward_multiplier DECIMAL(3,2) DEFAULT 1.0,
    bonus_threshold INTEGER, -- submissions needed for tier bonus
    tier_bonus DECIMAL(8,2) DEFAULT 0,
    benefits JSONB
);

-- ============================================================================
-- REWARD TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES npd_submissions(id),

    amount DECIMAL(10,2) NOT NULL,
    transaction_type transaction_type NOT NULL,
    payment_method VARCHAR(50), -- upi, bank_transfer
    payment_reference VARCHAR(255),

    status payment_status DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SUBMISSION ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS submission_analytics (
    date DATE PRIMARY KEY,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    rejected_submissions INTEGER DEFAULT 0,
    total_rewards_paid DECIMAL(12,2) DEFAULT 0,
    unique_contributors INTEGER DEFAULT 0,
    new_products_added INTEGER DEFAULT 0,
    avg_processing_time INTERVAL
);

-- ============================================================================
-- SYSTEM CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_phone ON users(email, phone);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_user_tier ON users(user_tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Products table indexes  
CREATE INDEX IF NOT EXISTS idx_products_name_brand ON products(name, brand);
CREATE INDEX IF NOT EXISTS idx_products_category_segment ON products(category, segment);
CREATE INDEX IF NOT EXISTS idx_products_country_origin ON products(country, country_of_origin);
CREATE INDEX IF NOT EXISTS idx_products_verification_confidence ON products(verification_status, ai_confidence_score);
CREATE INDEX IF NOT EXISTS idx_products_npd_discovery ON products(is_npd, discovery_date);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Full-text search index for products
CREATE INDEX IF NOT EXISTS idx_products_fulltext ON products USING gin(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(brand, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(ingredients_list, '')
    )
);

-- NPD submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user_status ON npd_submissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_product_status ON npd_submissions(product_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON npd_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_reward_status ON npd_submissions(reward_status);

-- Product images indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product_type ON product_images(product_id, image_type);
CREATE INDEX IF NOT EXISTS idx_product_images_submission ON product_images(submission_id);
CREATE INDEX IF NOT EXISTS idx_product_images_uploaded_by ON product_images(uploaded_by);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- AI models indexes
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_active ON ai_models(provider, is_active);

-- Scraping sources indexes
CREATE INDEX IF NOT EXISTS idx_scraping_sources_active ON scraping_sources(is_active);

-- Reward transactions indexes
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_status ON reward_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_payment_ref ON reward_transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON reward_transactions(created_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_npd_submissions_updated_at ON npd_submissions;
CREATE TRIGGER update_npd_submissions_updated_at 
    BEFORE UPDATE ON npd_submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user quality score
CREATE OR REPLACE FUNCTION calculate_user_quality_score(user_uuid UUID)
RETURNS DECIMAL(3,2) AS $
DECLARE
    quality_score DECIMAL(3,2);
BEGIN
    SELECT 
        ROUND(
            CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE 
                    (COUNT(CASE WHEN status = 'approved' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 10
            END, 2
        )
    INTO quality_score
    FROM npd_submissions
    WHERE user_id = user_uuid
    AND status IN ('approved', 'rejected');
    
    RETURN COALESCE(quality_score, 0);
END;
$ LANGUAGE plpgsql;

-- Function to update user tier based on performance
CREATE OR REPLACE FUNCTION update_user_tier(user_uuid UUID)
RETURNS user_tier AS $
DECLARE
    new_tier user_tier;
    user_stats RECORD;
BEGIN
    -- Get user statistics
    SELECT 
        total_submissions,
        approved_submissions,
        calculate_user_quality_score(user_uuid) as quality_score,
        CASE 
            WHEN total_submissions = 0 THEN 0
            ELSE (approved_submissions::DECIMAL / total_submissions::DECIMAL) * 100
        END as approval_rate
    INTO user_stats
    FROM users
    WHERE id = user_uuid;
    
    -- Determine tier based on tier configurations
    SELECT tier INTO new_tier
    FROM user_tier_configs
    WHERE user_stats.total_submissions >= min_submissions
    AND user_stats.quality_score >= min_quality_score
    AND user_stats.approval_rate >= min_approval_rate
    ORDER BY min_submissions DESC, min_quality_score DESC
    LIMIT 1;
    
    -- Default to bronze if no tier matches
    new_tier := COALESCE(new_tier, 'bronze');
    
    -- Update user tier
    UPDATE users 
    SET user_tier = new_tier, quality_score = user_stats.quality_score
    WHERE id = user_uuid;
    
    RETURN new_tier;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for product search with rankings
CREATE OR REPLACE VIEW product_search_view AS
SELECT 
    p.*,
    COUNT(pi.id) as image_count,
    AVG(pi.quality_score) as avg_image_quality,
    CASE 
        WHEN p.verification_status = 'verified' THEN 1.0
        WHEN p.verification_status = 'pending' THEN 0.5
        ELSE 0.0
    END as search_boost
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
GROUP BY p.id;

-- View for user statistics
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.user_tier,
    u.total_earnings,
    u.total_submissions,
    u.approved_submissions,
    calculate_user_quality_score(u.id) as current_quality_score,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_submissions,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_submissions,
    COALESCE(SUM(CASE WHEN rt.status = 'completed' THEN rt.amount ELSE 0 END), 0) as total_rewards_received,
    COALESCE(MAX(s.created_at), u.created_at) as last_activity
FROM users u
LEFT JOIN npd_submissions s ON u.id = s.user_id
LEFT JOIN reward_transactions rt ON u.id = rt.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.full_name, u.user_tier, u.total_earnings, u.total_submissions, u.approved_submissions;

-- View for submission analytics
CREATE OR REPLACE VIEW submission_analytics_view AS
SELECT 
    DATE(s.created_at) as date,
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_submissions,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_submissions,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_submissions,
    COUNT(DISTINCT s.user_id) as unique_contributors,
    AVG(s.ai_confidence_score) as avg_ai_confidence,
    SUM(s.total_reward) as total_rewards_allocated
FROM npd_submissions s
GROUP BY DATE(s.created_at)
ORDER BY date DESC;

-- ============================================================================
-- INITIAL DATA CONSTRAINTS
-- ============================================================================

-- Add check constraints
ALTER TABLE users ADD CONSTRAINT check_quality_score_range 
    CHECK (quality_score >= 0 AND quality_score <= 10);

ALTER TABLE users ADD CONSTRAINT check_total_earnings_positive 
    CHECK (total_earnings >= 0);

ALTER TABLE users ADD CONSTRAINT check_submissions_positive 
    CHECK (total_submissions >= 0 AND approved_submissions >= 0 AND approved_submissions <= total_submissions);

ALTER TABLE products ADD CONSTRAINT check_ai_confidence_range 
    CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1);

ALTER TABLE products ADD CONSTRAINT check_regional_popularity_range 
    CHECK (regional_popularity_score >= 0 AND regional_popularity_score <= 1);

ALTER TABLE npd_submissions ADD CONSTRAINT check_ai_confidence_range 
    CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1);

ALTER TABLE npd_submissions ADD CONSTRAINT check_reward_amounts_positive 
    CHECK (base_reward >= 0 AND bonus_reward >= 0 AND total_reward >= 0);

ALTER TABLE product_images ADD CONSTRAINT check_quality_score_range 
    CHECK (quality_score >= 0 AND quality_score <= 1);

ALTER TABLE reward_transactions ADD CONSTRAINT check_amount_positive 
    CHECK (amount > 0);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ============================================================================

-- Optimize for full-text search
ALTER SYSTEM SET default_text_search_config = 'english';

-- Set up automatic vacuum and analyze
ALTER TABLE products SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE npd_submissions SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE users SET (autovacuum_analyze_scale_factor = 0.1);

-- ============================================================================
-- SECURITY SETTINGS
-- ============================================================================

-- Create roles for different access levels
DO $
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'filis_app_user') THEN
        CREATE ROLE filis_app_user WITH LOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'filis_readonly') THEN
        CREATE ROLE filis_readonly WITH LOGIN;
    END IF;
END
$;

-- Grant appropriate permissions
GRANT CONNECT ON DATABASE filis_npd_dev TO filis_app_user;
GRANT USAGE ON SCHEMA public TO filis_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO filis_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO filis_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO filis_app_user;

-- Read-only access for analytics
GRANT CONNECT ON DATABASE filis_npd_dev TO filis_readonly;
GRANT USAGE ON SCHEMA public TO filis_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO filis_readonly;

-- Enable Row Level Security (for future use)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE npd_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE '✅ Fi-Lis NPD Platform database schema initialized successfully!';
    RAISE NOTICE '📊 Tables created: users, products, npd_submissions, product_images, user_sessions, ai_models, scraping_sources, user_tier_configs, reward_transactions, submission_analytics, system_config';
    RAISE NOTICE '🔍 Indexes created for optimal search performance';
    RAISE NOTICE '⚡ Functions and triggers set up for automatic updates';
    RAISE NOTICE '📈 Views created for analytics and reporting';
    RAISE NOTICE '🔒 Security constraints and roles configured';
    RAISE NOTICE '🚀 Ready to import 275K+ product records!';
END $;