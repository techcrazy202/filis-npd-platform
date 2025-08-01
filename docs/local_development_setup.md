# Fi-Lis NPD Platform - Local Development Setup (Windows 11)

## 🎯 **Prerequisites Checklist**
- ✅ Windows 11
- ✅ VS Code
- ✅ PostgreSQL 15 (we'll upgrade to PostgreSQL 17 for production)
- ✅ pgAdmin

## 📁 **Project Structure to Create**

Create this folder structure on your Windows machine:

```
C:\Projects\filis-npd-platform\
├── 📁 backend\
│   ├── 📁 src\
│   │   ├── 📁 config\
│   │   ├── 📁 controllers\
│   │   ├── 📁 database\
│   │   ├── 📁 middleware\
│   │   ├── 📁 routes\
│   │   ├── 📁 services\
│   │   ├── 📁 utils\
│   │   ├── 📁 scripts\
│   │   └── 📄 server.ts
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   └── 📄 .env.development
├── 📁 frontend\
│   ├── 📁 src\
│   │   ├── 📁 app\
│   │   ├── 📁 components\
│   │   ├── 📁 lib\
│   │   ├── 📁 hooks\
│   │   └── 📁 stores\
│   ├── 📄 package.json
│   ├── 📄 next.config.js
│   └── 📄 tailwind.config.js
├── 📁 admin\
├── 📁 shared\
├── 📁 data\ (for your 275K Excel file)
├── 📄 package.json (root)
├── 📄 .env.development
└── 📄 README.md
```

## 🚀 **Step-by-Step Setup**

### **Step 1: Install Required Software**

```powershell
# Install Node.js 20+ (if not already installed)
# Download from: https://nodejs.org/

# Install Git (if not already installed)
# Download from: https://git-scm.com/

# Verify installations
node --version  # Should be 20+
npm --version   # Should be 9+
git --version
```

### **Step 2: Create Project Directory**

```powershell
# Open PowerShell as Administrator
cd C:\Projects
mkdir filis-npd-platform
cd filis-npd-platform

# Initialize git repository
git init
```

### **Step 3: Setup Local PostgreSQL Database**

Open **pgAdmin** and create:

```sql
-- Create development database
CREATE DATABASE filis_npd_dev;

-- Create user
CREATE USER filis_dev WITH PASSWORD 'dev_password_123';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE filis_npd_dev TO filis_dev;

-- Connect to the database and enable extensions
\c filis_npd_dev;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

### **Step 4: Create Environment Configuration**

Create `.env.development` in the root directory:

```bash
# .env.development - Local Development Configuration

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
ADMIN_PORT=3002

# Security Configuration (development only)
JWT_SECRET=dev_jwt_secret_256_bit_key_for_development_only
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_256_bit_key_for_development
ENCRYPTION_KEY=dev_encryption_key_for_sensitive_data_development

# AI Configuration (use your actual keys)
AZURE_AI_ENDPOINT=https://your-azure-endpoint.openai.azure.com
AZURE_AI_KEY=your_azure_ai_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here
GITHUB_TOKEN=ghp_your_github_token_here

# Storage Configuration (for development, use local storage)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Email Configuration (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_dev_email@gmail.com
SMTP_PASS=your_app_password

# SMS Configuration (optional for development)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Development URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

### **Step 5: Setup Root Package.json**

Create `package.json` in root directory:

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
    "dev:admin": "cd admin && npm run dev",
    "dev:all": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:admin\"",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install && cd ../admin && npm install",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "db:init": "cd backend && npm run db:init",
    "db:migrate": "cd backend && npm run db:migrate",
    "db:seed": "cd backend && npm run db:seed",
    "data:import": "cd backend && npm run data:import",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm run test",
    "test:frontend": "cd frontend && npm run test",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd backend && npm run lint",
    "lint:frontend": "cd frontend && npm run lint"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "@types/node": "^20.8.0",
    "typescript": "^5.2.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```

### **Step 6: VS Code Workspace Setup**

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "eslint.workingDirectories": [
    "backend",
    "frontend",
    "admin"
  ]
}
```

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.PowerShell"
  ]
}
```

### **Step 7: Initialize Project**

```powershell
# Navigate to project root
cd C:\Projects\filis-npd-platform

# Install root dependencies
npm install

# Create workspace directories
mkdir backend, frontend, admin, shared, data

# Install all workspace dependencies
npm run install:all
```

## 📋 **Artifact Implementation Order**

Now that your environment is ready, implement artifacts in this order:

### **Phase 1: Backend Foundation (Start Here)**
1. **Backend Package.json & TypeScript Setup**
2. **Database Schema & Migration Scripts**
3. **Custom Database Layer (No ORM)**
4. **Authentication System**

### **Phase 2: API Development**
5. **Search API Implementation**
6. **NPD Submission API**
7. **AI Integration System**

### **Phase 3: Frontend Development**
8. **Frontend Foundation (Next.js)**
9. **Authentication UI**
10. **Search Interface**
11. **NPD Submission Interface**

### **Phase 4: Admin & Deployment**
12. **Admin Dashboard**
13. **Production Deployment Scripts**

## 🎯 **Quick Start Commands**

After setup, use these commands for daily development:

```powershell
# Start development servers
npm run dev  # Starts backend + frontend

# Database operations
npm run db:init     # Initialize database schema
npm run db:migrate  # Run migrations
npm run db:seed     # Seed initial data
npm run data:import # Import your 275K records

# Testing
npm test           # Run all tests
npm run lint       # Check code quality

# Build for production
npm run build      # Build all applications
```

## 🔧 **Development Tools Setup**

### **VS Code Extensions to Install:**
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
- PostgreSQL (for database queries)
- Thunder Client (for API testing)

### **Windows-specific Notes:**
- Use **PowerShell** (not Command Prompt) for better npm support
- Consider **Windows Terminal** for better developer experience
- Set up **WSL2** if you encounter any Unix-specific issues (optional)

## 🚀 **Ready to Start!**

Your development environment is now configured. The **first artifact to implement** is:

**Backend Package.json & TypeScript Setup** → **Database Schema** → **Authentication System**

Would you like me to create the **Backend Foundation** artifact first? This will include:
- Complete package.json with all dependencies
- TypeScript configuration
- Database initialization scripts
- Project structure setup

This will get your local development environment running immediately!