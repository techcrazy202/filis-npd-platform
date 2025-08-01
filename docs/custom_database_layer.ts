// backend/src/database/connection.ts
// Custom Database Layer - No ORM, Direct PostgreSQL

import { Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseError } from './errors';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });

    // Handle pool connection events
    this.pool.on('connect', (client) => {
      console.log('New client connected to database');
    });

    this.pool.on('remove', (client) => {
      console.log('Client removed from database pool');
    });
  }

  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  // Execute a query with parameters
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log('Query executed:', {
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Query failed:', {
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw new DatabaseError(error.message, error.code);
    }
  }

  // Execute a query with a specific client (for transactions)
  async queryWithClient<T = any>(client: PoolClient, text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      console.log('Transaction query executed:', {
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Transaction query failed:', {
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw new DatabaseError(error.message, error.code);
    }
  }

  // Get a client for transactions
  async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      throw new DatabaseError('Failed to get database client', error.code);
    }
  }

  // Execute multiple queries in a transaction
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.rows[0]?.health_check === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Get pool status
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Close all connections
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }
}

// Database initialization
export const initDatabase = (config: DatabaseConfig): DatabaseConnection => {
  return DatabaseConnection.getInstance(config);
};

// Get existing database instance
export const getDatabase = (): DatabaseConnection => {
  return DatabaseConnection.getInstance();
};

// Export types
export { DatabaseConfig, PoolClient };

---

// backend/src/database/errors.ts
// Custom Database Error Classes

export class DatabaseError extends Error {
  public code?: string;
  public severity?: string;
  public detail?: string;

  constructor(message: string, code?: string, severity?: string, detail?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.severity = severity;
    this.detail = detail;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends Error {
  constructor(resource: string, field?: string) {
    super(`${resource}${field ? ` with ${field}` : ''} already exists`);
    this.name = 'DuplicateError';
  }
}

---

// backend/src/database/schema.sql
-- Fi-Lis NPD Platform Database Schema
-- Direct PostgreSQL implementation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types/enums
CREATE TYPE user_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE kyc_status AS ENUM ('pending', 'partial', 'complete', 'rejected');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'flagged');
CREATE TYPE submission_status AS ENUM ('pending', 'processing', 'approved', 'rejected', 'duplicate');
CREATE TYPE reward_status AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed');
CREATE TYPE image_type AS ENUM ('front', 'back', 'ingredients', 'nutrition', 'packaging', 'receipt', 'other');
CREATE TYPE transaction_type AS ENUM ('submission_reward', 'bonus_reward', 'tier_bonus', 'referral_bonus');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE ai_provider AS ENUM ('azure', 'openai', 'anthropic', 'google');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
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

-- Indexes for users table
CREATE INDEX idx_users_email_phone ON users(email, phone);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_user_tier ON users(user_tier);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- PRODUCTS TABLE (Enhanced Fi-Lis Schema)
-- ============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Product Info (Fi-Lis Compatible)
    name VARCHAR(500) NOT NULL,
    product_id VARCHAR(100), -- Original "Product Id"
    brand VARCHAR(255) NOT NULL,
    description TEXT,

    -- Enhanced Categorization
    industry VARCHAR(100),
    sector VARCHAR(100),
    sub_sector VARCHAR(100),
    segment VARCHAR(100),
    sub_segment VARCHAR(100),
    category VARCHAR(100),

    -- Geographic & Market Data (From Fi-Lis)
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

    -- Ingredients & Nutrition (From Fi-Lis)
    ingredients_list TEXT,
    standardized_ingredients JSONB,
    nutritional_info JSONB,
    calories VARCHAR(50),
    claims TEXT,
    flavour VARCHAR(255),
    allergen_info JSONB,
    dietary_preferences JSONB,

    -- Commercial Information (From Fi-Lis)
    price VARCHAR(50),
    volume_scale VARCHAR(100),
    volume_subscale VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'INR',
    mrp DECIMAL(10,2),
    pack_size VARCHAR(50),

    -- Supply Chain (From Fi-Lis)
    company_name VARCHAR(255),
    standardized_company_name VARCHAR(255),
    manufacturer VARCHAR(255),
    distributor VARCHAR(255),
    retailer VARCHAR(255),

    -- Source & Links (From Fi-Lis)
    product_link TEXT,
    source_name VARCHAR(255),
    website_address TEXT,

    -- Dates (From Fi-Lis)
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

-- Indexes for products table
CREATE INDEX idx_products_name_brand ON products(name, brand);
CREATE INDEX idx_products_category_segment ON products(category, segment);
CREATE INDEX idx_products_country_origin ON products(country, country_of_origin);
CREATE INDEX idx_products_verification_confidence ON products(verification_status, ai_confidence_score);
CREATE INDEX idx_products_npd_discovery ON products(is_npd, discovery_date);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Full-text search index
CREATE INDEX idx_products_fulltext ON products USING gin(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(brand, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(ingredients_list, '')
    )
);

-- ============================================================================
-- NPD SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE npd_submissions (
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

-- Indexes for npd_submissions table
CREATE INDEX idx_submissions_user_status ON npd_submissions(user_id, status);
CREATE INDEX idx_submissions_product_status ON npd_submissions(product_id, status);
CREATE INDEX idx_submissions_created_at ON npd_submissions(created_at);
CREATE INDEX idx_submissions_reward_status ON npd_submissions(reward_status);

-- ============================================================================
-- REMAINING TABLES (Product Images, AI Models, etc.)
-- ============================================================================

CREATE TABLE product_images (
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

CREATE INDEX idx_product_images_product_type ON product_images(product_id, image_type);
CREATE INDEX idx_product_images_submission ON product_images(submission_id);

-- User Sessions Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_npd_submissions_updated_at BEFORE UPDATE ON npd_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();