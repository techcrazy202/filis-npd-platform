# Fi-Lis NPD Platform - Complete Development Plan

## Project Overview
A unified platform combining Fi-Lis food industry analytics with NPD (New Product Development) crowdsourcing capabilities. The platform will handle 275K+ food product records, enable AI-powered analysis, and incentivize users to discover and submit new products through a comprehensive reward system.

## Architecture for DigitalOcean Deployment

### Technology Stack
```
Backend:
- Runtime: Node.js 20 with TypeScript
- Framework: Express.js with modern middleware
- Database: Self-hosted PostgreSQL 15 with Redis cache
- ORM: Prisma (better for complex schemas than Drizzle)
- Authentication: JWT with refresh tokens + session management
- File Storage: DigitalOcean Spaces (S3-compatible)
- Queue: Bull.js with Redis for background jobs

Frontend:
- Framework: Next.js 14 (App Router) with TypeScript
- Styling: Tailwind CSS with shadcn/ui components
- State: Zustand for client state + TanStack Query for server state
- Forms: React Hook Form with Zod validation
- Charts: Recharts for analytics

Mobile (Progressive Web App):
- Next.js PWA with mobile-optimized UI
- Camera integration via browser APIs
- Offline capability for submissions

AI & Automation:
- Primary: Azure AI/GitHub Models (configurable dropdown)
- Backup: OpenAI GPT-4, Anthropic Claude (UI configurable)
- Image Analysis: Google Vision API / Azure Computer Vision
- Web Scraping: Puppeteer cluster for e-commerce verification

Infrastructure:
- Server: DigitalOcean Droplet (4-8GB RAM)
- Database: DO Managed PostgreSQL (optional upgrade path)
- CDN: DigitalOcean CDN for static assets
- Load Balancer: nginx reverse proxy
- Monitoring: PM2 + Custom health checks
- Backups: Automated DB snapshots
```

## Database Schema

### Core Tables
```sql
-- Users table with comprehensive profile
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    
    -- KYC Information
    pan_number VARCHAR(10),
    aadhaar_number VARCHAR(12) ENCRYPTED,
    pan_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    
    -- Payment Information
    upi_id VARCHAR(255),
    bank_account_number VARCHAR(20) ENCRYPTED,
    bank_ifsc VARCHAR(11),
    bank_holder_name VARCHAR(255),
    
    -- User Metrics
    total_earnings DECIMAL(10,2) DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    user_tier tier_enum DEFAULT 'bronze',
    quality_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Status & Metadata
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status kyc_status_enum DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Products table for 275K+ records
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Product Info (Fi-Lis compatible)
    name VARCHAR(500) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Enhanced Categorization
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    segment VARCHAR(100),
    sub_segment VARCHAR(100),
    
    -- Geographic & Market Data
    country_of_origin VARCHAR(100),
    manufacturing_location VARCHAR(255),
    availability_regions JSONB,
    is_regional_exclusive BOOLEAN DEFAULT FALSE,
    
    -- Product Identification
    barcode VARCHAR(50),
    product_code VARCHAR(100),
    sku VARCHAR(100),
    
    -- Ingredients & Nutrition
    ingredients_list TEXT,
    standardized_ingredients JSONB,
    nutritional_info JSONB,
    allergen_info JSONB,
    dietary_preferences JSONB, -- vegan, gluten-free, etc.
    
    -- Commercial Information
    mrp DECIMAL(10,2),
    volume_weight VARCHAR(50),
    pack_size VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Supply Chain
    manufacturer VARCHAR(255),
    distributor VARCHAR(255),
    retailer VARCHAR(255),
    
    -- Platform Metadata
    verification_status verification_enum DEFAULT 'pending',
    ai_confidence_score DECIMAL(3,2) DEFAULT 0,
    submission_count INTEGER DEFAULT 0,
    last_verified_at TIMESTAMP,
    
    -- NPD Specific
    first_discovered_by UUID REFERENCES users(id),
    discovery_date TIMESTAMP,
    is_npd BOOLEAN DEFAULT FALSE,
    regional_popularity_score DECIMAL(3,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_products_search (name, brand, category),
    INDEX idx_products_location (country_of_origin, manufacturing_location),
    INDEX idx_products_verification (verification_status, ai_confidence_score),
    FULLTEXT INDEX idx_products_fulltext (name, brand, description, ingredients_list)
);

-- NPD Submissions with comprehensive tracking
CREATE TABLE npd_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
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
    
    -- Processing Status
    status submission_status_enum DEFAULT 'pending',
    ai_verification_data JSONB,
    ai_confidence_score DECIMAL(3,2) DEFAULT 0,
    human_review_notes TEXT,
    
    -- Rewards
    base_reward DECIMAL(10,2) DEFAULT 300,
    bonus_reward DECIMAL(10,2) DEFAULT 0,
    total_reward DECIMAL(10,2) DEFAULT 300,
    reward_status reward_status_enum DEFAULT 'pending',
    
    -- Verification Trail
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    auto_approved BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product Images with metadata
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES npd_submissions(id),
    
    image_url VARCHAR(1000) NOT NULL,
    image_type image_type_enum NOT NULL, -- front, back, ingredients, nutrition, packaging
    file_size INTEGER,
    dimensions VARCHAR(20), -- "1920x1080"
    
    -- AI Analysis
    extracted_text JSONB,
    detected_objects JSONB,
    quality_score DECIMAL(3,2) DEFAULT 0,
    
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Model Configuration
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- azure, openai, anthropic
    model_id VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    cost_per_token DECIMAL(8,6),
    capabilities JSONB, -- text, vision, analysis
    created_at TIMESTAMP DEFAULT NOW()
);

-- Web Scraping Sources
CREATE TABLE scraping_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    search_endpoint VARCHAR(500),
    selectors JSONB, -- CSS selectors for data extraction
    rate_limit INTEGER DEFAULT 10, -- requests per minute
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped TIMESTAMP,
    success_rate DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Tier System
CREATE TABLE user_tiers (
    tier tier_enum PRIMARY KEY,
    min_submissions INTEGER NOT NULL,
    min_quality_score DECIMAL(3,2) NOT NULL,
    reward_multiplier DECIMAL(3,2) DEFAULT 1.0,
    bonus_threshold INTEGER, -- submissions needed for tier bonus
    tier_bonus DECIMAL(8,2) DEFAULT 0,
    benefits JSONB
);

-- Reward Transactions
CREATE TABLE reward_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    submission_id UUID REFERENCES npd_submissions(id),
    
    amount DECIMAL(10,2) NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    payment_method VARCHAR(50), -- upi, bank_transfer
    payment_reference VARCHAR(255),
    
    status payment_status_enum DEFAULT 'pending',
    processed_at TIMESTAMP,
    failure_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics & Reporting
CREATE TABLE submission_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    rejected_submissions INTEGER DEFAULT 0,
    total_rewards_paid DECIMAL(12,2) DEFAULT 0,
    unique_contributors INTEGER DEFAULT 0,
    new_products_added INTEGER DEFAULT 0,
    avg_processing_time INTERVAL,
    
    PRIMARY KEY (date)
);

-- Enums
CREATE TYPE tier_enum AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE kyc_status_enum AS ENUM ('pending', 'partial', 'complete', 'rejected');
CREATE TYPE verification_enum AS ENUM ('pending', 'verified', 'rejected', 'flagged');
CREATE TYPE submission_status_enum AS ENUM ('pending', 'processing', 'approved', 'rejected', 'duplicate');
CREATE TYPE reward_status_enum AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed');
CREATE TYPE image_type_enum AS ENUM ('front', 'back', 'ingredients', 'nutrition', 'packaging', 'receipt', 'other');
CREATE TYPE transaction_type_enum AS ENUM ('submission_reward', 'bonus_reward', 'tier_bonus', 'referral_bonus');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
```

## Key Features Implementation

### 1. Advanced Search Engine (Fi-Lis Core)
```typescript
// Multi-field search with advanced filtering
interface SearchFilters {
  query?: string;
  category?: string[];
  brand?: string[];
  countryOfOrigin?: string[];
  priceRange?: [number, number];
  isRegional?: boolean;
  verificationStatus?: string[];
  dateRange?: [Date, Date];
  nutritionalFilters?: {
    isVegan?: boolean;
    isGlutenFree?: boolean;
    maxCalories?: number;
  };
}

// Search implementation with full-text and faceted search
const searchProducts = async (filters: SearchFilters, pagination: PaginationParams) => {
  // PostgreSQL full-text search + faceted filtering
  // Redis caching for popular searches
  // Real-time autocomplete with debouncing
};
```

### 2. NPD Submission Flow
```typescript
// NPD submission process
interface NPDSubmission {
  productInfo: {
    name: string;
    brand: string;
    category: string;
    description?: string;
  };
  images: {
    front: File;
    back: File;
    ingredients: File;
    nutrition?: File;
    packaging?: File;
  };
  location: {
    coordinates: [number, number];
    storeName?: string;
    storeType?: string;
    address: string;
  };
  purchaseInfo: {
    price?: number;
    purchaseDate: Date;
  };
}

// Submission processing pipeline
const processNPDSubmission = async (submission: NPDSubmission) => {
  // 1. Image upload to DO Spaces
  // 2. AI image analysis (extract text, detect objects)
  // 3. Duplicate detection against existing products
  // 4. Web scraping verification
  // 5. Confidence scoring
  // 6. Auto-approval if confidence > 8.0
  // 7. Queue for human review if needed
};
```

### 3. AI Integration with Model Selection
```typescript
// Configurable AI model system
interface AIModelConfig {
  provider: 'azure' | 'openai' | 'anthropic';
  modelId: string;
  capabilities: ('text' | 'vision' | 'analysis')[];
  costPerToken: number;
}

// AI service with fallback support
class AIService {
  async analyzeProduct(images: string[], text: string, modelPreference?: string) {
    const models = await this.getActiveModels();
    const primaryModel = modelPreference ? 
      models.find(m => m.id === modelPreference) : 
      models[0];
    
    try {
      return await this.callModel(primaryModel, images, text);
    } catch (error) {
      // Fallback to next available model
      return await this.callFallbackModel(models, images, text);
    }
  }
}
```

### 4. Reward System
```typescript
// Dynamic reward calculation
interface RewardCalculation {
  baseReward: number; // ₹300
  qualityBonus: number; // Based on image quality and completeness
  regionalBonus: number; // ₹50 for regional exclusive products
  tierMultiplier: number; // User tier bonus
  duplicateCheck: boolean; // Penalty for duplicates
}

const calculateReward = (submission: NPDSubmission, userTier: string): number => {
  let reward = 300; // Base reward
  
  // Quality bonus (0-50 based on AI confidence and image quality)
  reward += Math.floor(submission.aiConfidence * 50);
  
  // Regional exclusivity bonus
  if (submission.isRegionalExclusive) {
    reward += 50;
  }
  
  // User tier multiplier
  const tierMultipliers = { bronze: 1.0, silver: 1.1, gold: 1.2, platinum: 1.3 };
  reward *= tierMultipliers[userTier] || 1.0;
  
  return Math.floor(reward);
};
```

### 5. User Tier System
```typescript
// User progression system
interface UserTier {
  name: string;
  requirements: {
    minSubmissions: number;
    minQualityScore: number;
    minApprovalRate: number;
  };
  benefits: {
    rewardMultiplier: number;
    priorityReview: boolean;
    betaFeatures: boolean;
    monthlyBonus: number;
  };
}

const userTiers: UserTier[] = [
  {
    name: 'bronze',
    requirements: { minSubmissions: 0, minQualityScore: 0, minApprovalRate: 0 },
    benefits: { rewardMultiplier: 1.0, priorityReview: false, betaFeatures: false, monthlyBonus: 0 }
  },
  {
    name: 'silver',
    requirements: { minSubmissions: 10, minQualityScore: 7.0, minApprovalRate: 80 },
    benefits: { rewardMultiplier: 1.1, priorityReview: false, betaFeatures: false, monthlyBonus: 100 }
  },
  // ... more tiers
];
```

## Development Phases

### Phase 1: Core Platform (Weeks 1-4)
**Week 1-2: Infrastructure & Database**
- DigitalOcean droplet setup with Docker
- PostgreSQL database with full schema
- Redis setup for caching and queues
- nginx reverse proxy configuration
- Basic authentication system

**Week 3-4: Fi-Lis Analytics Core**
- Product database with 275K+ records import
- Advanced search API with full-text search
- Real-time autocomplete system
- Basic admin dashboard
- User management system

### Phase 2: NPD Submission System (Weeks 5-8)
**Week 5-6: Submission Infrastructure**
- Image upload to DigitalOcean Spaces
- Mobile-optimized camera interface
- NPD submission form and validation
- Basic duplicate detection

**Week 7-8: AI Integration**
- Configurable AI model system
- Image analysis pipeline
- Text extraction and product matching
- Confidence scoring algorithm

### Phase 3: Advanced Features (Weeks 9-12)
**Week 9-10: Reward System**
- User tier calculation
- Reward calculation engine
- Payment integration (Razorpay/UPI)
- Transaction management

**Week 11-12: Web Scraping & Verification**
- E-commerce scraping system
- Configurable scraping sources
- Product verification pipeline
- Admin interface for source management

### Phase 4: Analytics & Optimization (Weeks 13-14)
**Week 13: Analytics Dashboard**
- Comprehensive admin analytics
- User performance tracking
- Revenue and cost analysis
- Real-time monitoring

**Week 14: Performance & Deployment**
- Database optimization and indexing
- CDN integration for images
- Production deployment and testing
- Load testing and optimization

## Deployment Architecture

### DigitalOcean Infrastructure
```yaml
# docker-compose.yml for DO deployment
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/filis_npd
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: filis_npd
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Performance Optimizations
1. **Database**: Connection pooling, read replicas, query optimization
2. **Caching**: Redis for search results, user sessions, AI responses
3. **CDN**: DigitalOcean CDN for image delivery
4. **Background Jobs**: Bull.js queues for AI processing and scraping
5. **Monitoring**: PM2 for process management, health checks

## Security Considerations
1. **Data Protection**: Encryption for PAN/Aadhaar, secure password hashing
2. **API Security**: Rate limiting, JWT validation, input sanitization
3. **Image Security**: Virus scanning, content moderation
4. **Payment Security**: PCI compliance, secure payment processing
5. **Access Control**: Role-based permissions, admin audit trails

## Success Metrics
1. **User Growth**: Monthly active users, retention rate
2. **Product Discovery**: New products added per day/week
3. **Quality Metrics**: Submission approval rate, AI accuracy
4. **Engagement**: Average submissions per user, time spent
5. **Financial**: Total rewards paid, cost per valid submission
6. **Search Performance**: Query response time, user satisfaction

This comprehensive plan merges Fi-Lis analytics with NPD crowdsourcing, optimized for DigitalOcean deployment with scalability and performance in mind.