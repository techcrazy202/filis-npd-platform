# Fi-Lis NPD Platform - Local Windows 11 Setup Guide

## 🎯 **Current Environment Check**
✅ Windows 11  
✅ VS Code  
✅ PostgreSQL 15 + pgAdmin  
🆕 Node.js 20+ (we'll verify/install)  
🆕 Git (we'll verify/install)  

## 📁 **Step 1: Create Project Structure**

Open **PowerShell as Administrator** and run:

```powershell
# Navigate to your preferred development directory
cd C:\
mkdir Projects
cd Projects

# Create the main project directory
mkdir filis-npd-platform
cd filis-npd-platform

# Create all required directories
mkdir backend, frontend, admin, shared, data, logs

# Navigate to backend
cd backend
mkdir src
cd src
mkdir config, controllers, database, middleware, routes, services, utils, scripts, types
cd database
mkdir repositories
cd ..\..\..\

# Verify structure
tree /F
```

## 📋 **Step 2: Verify/Install Required Software**

```powershell
# Check Node.js version (must be 20+)
node --version
npm --version

# If Node.js is not installed or < 20:
# Download from: https://nodejs.org/en/download/
# Install the LTS version (20.x.x)

# Check Git
git --version

# If Git is not installed:
# Download from: https://git-scm.com/download/win
```

## 🗄️ **Step 3: Database Setup in pgAdmin**

1. **Open pgAdmin**
2. **Connect to your PostgreSQL 15 server**
3. **Create Development Database:**

```sql
-- Right-click on Databases → Create → Database
-- Database name: filis_npd_dev
-- Owner: postgres (or your preferred user)

-- After creating, connect to filis_npd_dev and run:

-- Create development user
CREATE USER filis_dev WITH PASSWORD 'dev_password_123';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE filis_npd_dev TO filis_dev;
GRANT ALL ON SCHEMA public TO filis_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO filis_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO filis_dev;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

## 📄 **Step 4: Create Project Files**

### **Root package.json**
```powershell
# In C:\Projects\filis-npd-platform\
code package.json
```

Copy this content:
```json
{
  "name": "filis-npd-platform",
  "version": "1.0.0",
  "description": "Fi-Lis NPD Platform - Local Development",
  "private": true,
  "workspaces": [
    "backend",
    "frontend",
    "admin",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "db:init": "cd backend && npm run db:init",
    "db:seed": "cd backend && npm run db:seed",
    "data:import": "cd backend && npm run data:import"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```

### **Environment Configuration**
```powershell
# Create .env.development file
code .env.development
```

Copy this content:
```bash
# Database Configuration
DB_NAME=filis_npd_dev
DB_USER=filis_dev
DB_PASSWORD=dev_password_123
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://filis_dev:dev_password_123@localhost:5432/filis_npd_dev

# Application Configuration
NODE_ENV=development
BACKEND_PORT=3001
FRONTEND_PORT=3000

# Security Configuration (development only)
JWT_SECRET=dev_jwt_secret_for_local_development_only_256_bits
JWT_REFRESH_SECRET=dev_refresh_secret_for_local_development_only_256_bits
ENCRYPTION_KEY=dev_encryption_key_for_local_development_only_256_bits

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# AI Configuration (add your real keys here)
AZURE_AI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_AI_KEY=your_azure_key_here
OPENAI_API_KEY=sk-your_openai_key_here

# Email Configuration (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### **Backend Package.json**
```powershell
cd backend
code package.json
```

Use the **Backend Foundation** artifact content I created earlier.

### **Backend TypeScript Config**
```powershell
# Still in backend directory
code tsconfig.json
```

Use the **tsconfig.json** from the Backend Foundation artifact.

## 🔧 **Step 5: Install Dependencies**

```powershell
# Go back to root directory
cd C:\Projects\filis-npd-platform

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Create basic directories
mkdir uploads, logs

# Go back to root
cd ..
```

## 🗄️ **Step 6: Initialize Database Schema**

```powershell
# Copy database schema
cd backend\src\database
code schema.sql
```

Copy the **Database Infrastructure** schema.sql content I created.

Then in pgAdmin, run the schema:
1. Open **Query Tool** for `filis_npd_dev` database
2. Copy and paste the entire schema.sql content
3. **Execute** (F5)
4. Verify tables were created

## 🏃 **Step 7: Create Essential Backend Files**

### **Database Connection**
```powershell
cd C:\Projects\filis-npd-platform\backend\src\database
code connection.ts
```

Copy the **Custom Database Layer** connection.ts content.

### **Environment Config**
```powershell
cd ..\config
code environment.ts
```

Copy the environment.ts from **Backend Foundation**.

### **Server Setup**
```powershell
cd ..
code server.ts
```

Copy the server.ts from **Backend Foundation**.

### **Add Missing Tables**
In pgAdmin, add these tables (they're missing from our schema):

```sql
-- OTP codes table for authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(phone, purpose)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

## 🚀 **Step 8: Test the Setup**

```powershell
# Navigate to backend directory
cd C:\Projects\filis-npd-platform\backend

# Initialize database with schema
npm run db:init

# Seed initial data (admin user, configurations)
npm run db:seed

# Start the development server
npm run dev
```

You should see output like:
```
🚀 Fi-Lis NPD Platform Backend
📍 Environment: development
🌐 Server running on port 3001
🗄️  Database: filis_npd_dev@localhost:5432
```

## 🔍 **Step 9: Test API Endpoints**

Open a new PowerShell window and test:

```powershell
# Test health endpoint
curl http://localhost:3001/health

# Should return JSON with status: "OK"
```

Or use VS Code's **Thunder Client** extension:
1. Install Thunder Client extension
2. Create new request: `GET http://localhost:3001/health`
3. Send request

## 📝 **Step 10: VS Code Workspace Setup**

Create `.vscode/settings.json`:
```powershell
cd C:\Projects\filis-npd-platform
mkdir .vscode
cd .vscode
code settings.json
```

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  },
  "eslint.workingDirectories": ["backend", "frontend"],
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

## 🎯 **Next Steps - Authentication Testing**

Once the basic setup works, test authentication:

```powershell
# Create a test user via API
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+919999999998",
    "password": "Test@123456",
    "confirmPassword": "Test@123456",
    "full_name": "Test User"
  }'
```

## 🐛 **Common Issues & Solutions**

### **Issue: Port 3001 already in use**
```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### **Issue: Database connection failed**
1. Check PostgreSQL service is running
2. Verify credentials in .env.development
3. Test connection in pgAdmin first

### **Issue: Import errors in TypeScript**
```powershell
# Make sure you're in backend directory
cd backend

# Install dependencies
npm install

# Check TypeScript compilation
npx tsc --noEmit
```

### **Issue: Permission denied**
- Run PowerShell as Administrator
- Check Windows Defender/Antivirus settings

## 📁 **Final Local Structure**

Your working directory should look like:
```
C:\Projects\filis-npd-platform\
├── backend\
│   ├── src\
│   │   ├── server.ts ✅
│   │   ├── config\environment.ts ✅
│   │   ├── database\
│   │   │   ├── connection.ts ✅
│   │   │   ├── schema.sql ✅
│   │   │   └── repositories\
│   │   └── ... (other files from artifacts)
│   ├── package.json ✅
│   ├── tsconfig.json ✅
│   └── uploads\ (created automatically)
├── data\ (for your 275K Excel file)
├── .env.development ✅
└── package.json ✅
```

## 🎉 **Success Indicators**

- ✅ `npm run dev` starts server without errors
- ✅ `curl http://localhost:3001/health` returns OK
- ✅ Database tables exist in pgAdmin
- ✅ No TypeScript compilation errors
- ✅ VS Code intellisense works

This setup gives you a solid local development environment that matches the production architecture but runs natively on Windows without Docker complexity.

Ready to proceed with **Search API** and **NPD Submission** implementations?