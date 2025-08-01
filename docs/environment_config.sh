# .env.production - Production Environment Configuration
# Copy to .env and fill in your actual values

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DB_NAME=filis_npd
DB_USER=filis_user
DB_PASSWORD=your_secure_database_password_here
DB_PORT=5432

# Redis Configuration
REDIS_PORT=6379

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
NODE_ENV=production
BACKEND_PORT=3001
FRONTEND_PORT=3000
ADMIN_PORT=3002
QUEUE_DASHBOARD_PORT=3003

# Domain Configuration
DOMAIN=app.fi-lis.com
NEXT_PUBLIC_API_URL=https://app.fi-lis.com/api
NEXT_PUBLIC_APP_URL=https://app.fi-lis.com
CORS_ORIGIN=https://app.fi-lis.com

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================
JWT_SECRET=your_jwt_secret_256_bit_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_256_bit_key_here
ENCRYPTION_KEY=your_encryption_key_for_sensitive_data_here

# ============================================================================
# AI CONFIGURATION
# ============================================================================
# Azure AI Configuration
AZURE_AI_ENDPOINT=https://your-azure-endpoint.openai.azure.com
AZURE_AI_KEY=your_azure_ai_key_here

# OpenAI Configuration (Backup)
OPENAI_API_KEY=sk-your_openai_api_key_here

# GitHub Models (if using)
GITHUB_TOKEN=ghp_your_github_token_here

# Google Vision API (for image analysis)
GOOGLE_CLOUD_PROJECT_ID=your_google_project_id
GOOGLE_CLOUD_KEY_FILE=/app/config/google-service-account.json

# ============================================================================
# STORAGE CONFIGURATION (DigitalOcean Spaces)
# ============================================================================
DO_SPACES_ENDPOINT=sgp1.digitaloceanspaces.com
DO_SPACES_KEY=your_do_spaces_key_here
DO_SPACES_SECRET=your_do_spaces_secret_here
DO_SPACES_BUCKET=filis-assets
DO_SPACES_REGION=sgp1
NEXT_PUBLIC_DO_SPACES_URL=https://filis-assets.sgp1.digitaloceanspaces.com

# ============================================================================
# PAYMENT CONFIGURATION (Razorpay)
# ============================================================================
RAZORPAY_KEY_ID=rzp_live_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fi-lis.com
SMTP_PASS=your_email_app_password_here

# ============================================================================
# SMS CONFIGURATION (Twilio for OTP)
# ============================================================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ============================================================================
# MONITORING & LOGGING
# ============================================================================
LOG_LEVEL=info
SENTRY_DSN=https://your_sentry_dsn_here

# ============================================================================
# DEVELOPMENT OVERRIDES (for .env.development)
# ============================================================================
# NODE_ENV=development
# DOMAIN=localhost
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# CORS_ORIGIN=http://localhost:3000
# LOG_LEVEL=debug