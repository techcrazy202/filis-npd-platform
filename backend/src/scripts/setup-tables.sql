-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    pan_number VARCHAR(10),
    aadhaar_number VARCHAR(12),
    pan_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    upi_id VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(11),
    bank_holder_name VARCHAR(255),
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    user_tier VARCHAR(20) DEFAULT 'bronze',
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    streak_count INTEGER DEFAULT 0,
    last_submission_date TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create demo user
INSERT INTO users (email, phone, password_hash, full_name, email_verified, is_active) 
VALUES (
    'demo@filis.com', 
    '+919999999999', 
    '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yqBWVHxkd0LQ4YCOuLQv3c1y', -- demo123
    'Demo User',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Grant permissions to current user
GRANT ALL PRIVILEGES ON TABLE users TO CURRENT_USER;
GRANT ALL PRIVILEGES ON TABLE filis_data TO CURRENT_USER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_filis_data_search ON filis_data USING gin(to_tsvector('english', 
    COALESCE(continentsdb::text, '') || ' ' || 
    COALESCE(country::text, '') || ' ' || 
    COALESCE(industry::text, '') || ' ' || 
    COALESCE(sector::text, '') || ' ' ||
    COALESCE(sub_sector::text, '')
));