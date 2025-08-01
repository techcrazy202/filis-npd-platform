# Step-by-Step Backend Setup - Exact Instructions

## 🎯 **Prerequisites**
- You should have created: `C:\Projects\filis-npd-platform\`
- PostgreSQL 15 running with pgAdmin
- VS Code installed

## 📁 **Step 1: Create Exact Folder Structure**

Open **PowerShell as Administrator** and run **each command one by one**:

```powershell
cd C:\Projects\filis-npd-platform
mkdir backend
cd backend
mkdir src
cd src
mkdir config, database, middleware, routes, utils, scripts, types
cd database
mkdir repositories
cd ..\..
```

Verify your structure looks like this:
```
C:\Projects\filis-npd-platform\
└── backend\
    └── src\
        ├── config\
        ├── database\
        │   └── repositories\
        ├── middleware\
        ├── routes\
        ├── scripts\
        ├── types\
        └── utils\
```

## 📄 **Step 2: Create Files One by One**

### **File 1: Root package.json**
```powershell
cd C:\Projects\filis-npd-platform
code package.json
```

**Copy this EXACT content:**
```json
{
  "name": "filis-npd-platform",
  "version": "1.0.0",
  "description": "Fi-Lis NPD Platform - Local Development",
  "private": true,
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "install:backend": "cd backend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Save and close the file** (Ctrl+S, then close VS Code)

### **File 2: Environment Configuration**
```powershell
code .env.development
```

**Copy this EXACT content:**
```bash
DB_NAME=filis_npd_dev
DB_USER=filis_dev
DB_PASSWORD=dev_password_123
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://filis_dev:dev_password_123@localhost:5432/filis_npd_dev

NODE_ENV=development
BACKEND_PORT=3001

JWT_SECRET=dev_jwt_secret_for_local_development_only_256_bits_long
JWT_REFRESH_SECRET=dev_refresh_secret_for_local_development_only_256_bits
ENCRYPTION_KEY=dev_encryption_key_for_local_development_only_256_bits

CORS_ORIGIN=http://localhost:3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

**Save and close**

### **File 3: Backend package.json**
```powershell
cd backend
code package.json
```

**Copy this EXACT content:**
```json
{
  "name": "@filis/backend",
  "version": "1.0.0",
  "description": "Fi-Lis NPD Platform Backend API",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:init": "tsx src/scripts/init-database.ts",
    "db:seed": "tsx src/scripts/seed-database.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "express-rate-limit": "^7.1.5",
    "express-async-errors": "^3.1.1",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "winston": "^3.11.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/pg": "^8.10.7",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/morgan": "^1.9.9",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.1.4",
    "typescript": "^5.2.2"
  }
}
```

**Save and close**

### **File 4: TypeScript Configuration**
```powershell
code tsconfig.json
```

**Copy this EXACT content:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/config/*": ["config/*"],
      "@/database/*": ["database/*"],
      "@/middleware/*": ["middleware/*"],
      "@/routes/*": ["routes/*"],
      "@/utils/*": ["utils/*"],
      "@/types/*": ["types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "ts-node": {
    "esm": true
  }
}
```

**Save and close**

## 📦 **Step 3: Install Dependencies**

```powershell
# Make sure you're in the backend directory
cd C:\Projects\filis-npd-platform\backend

# Install all dependencies (this will take 2-3 minutes)
npm install
```

**Wait for installation to complete.** You should see no error messages.

## 🗄️ **Step 4: Setup Database in pgAdmin**

1. **Open pgAdmin**
2. **Connect to your PostgreSQL server**
3. **Right-click on "Databases"** → **Create** → **Database**
4. **Database name:** `filis_npd_dev`
5. **Click Save**

6. **Right-click on `filis_npd_dev`** → **Query Tool**
7. **Copy and paste this EXACT SQL:**

```sql
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

8. **Click Execute (F5)**
9. **You should see "Query returned successfully"**

## 📄 **Step 5: Create Essential Backend Files**

### **File 5: Environment Config**
```powershell
cd src\config
code environment.ts
```

**Copy this EXACT content:**
```typescript
import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3001),
  
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DATABASE_URL: z.string().url(),
  
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default(10485760),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parseResult.data;

export const dbConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};
```

**Save and close**

### **File 6: Logger**
```powershell
cd ..\utils
code logger.ts
```

**Copy this EXACT content:**
```typescript
import winston from 'winston';
import { env } from '@/config/environment';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'filis-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  exitOnError: false
});
```

**Save and close**

### **File 7: Database Connection**
```powershell
cd ..\database
code connection.ts
```

**Copy this EXACT content:**
```typescript
import { Pool, PoolClient, QueryResult } from 'pg';

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
    });

    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
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
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.rows[0]?.health_check === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

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

export const initDatabase = (config: DatabaseConfig): DatabaseConnection => {
  return DatabaseConnection.getInstance(config);
};

export const getDatabase = (): DatabaseConnection => {
  return DatabaseConnection.getInstance();
};

export { DatabaseConfig, PoolClient };
```

**Save and close**

### **File 8: Health Route**
```powershell
cd ..\routes
code health.ts
```

**Copy this EXACT content:**
```typescript
import { Router } from 'express';
import { getDatabase } from '@/database/connection';

const router = Router();

router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const db = getDatabase();
    const dbHealthy = await db.healthCheck();
    
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
        pool: db.getPoolStatus()
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
      responseTime: `${Date.now() - startTime}ms`
    };

    res.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

export default router;
```

**Save and close**

### **File 9: Main Server**
```powershell
cd ..
code server.ts
```

**Copy this EXACT content:**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import 'express-async-errors';

import { env, dbConfig } from '@/config/environment';
import { initDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';
import healthRoutes from '@/routes/health';

const app = express();
const PORT = env.PORT;

// Initialize database connection
const db = initDatabase(dbConfig);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Health check
app.use('/health', healthRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Fi-Lis NPD Platform Backend API',
    version: '1.0.0',
    environment: env.NODE_ENV
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    method: req.method
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Fi-Lis NPD Platform Backend`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 Server running on port ${PORT}`);
  logger.info(`🗄️  Database: ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT}`);
});

export default app;
```

**Save and close**

## 🚀 **Step 6: Test the Server**

```powershell
# Make sure you're in backend directory
cd C:\Projects\filis-npd-platform\backend

# Start the development server
npm run dev
```

**You should see:**
```
🚀 Fi-Lis NPD Platform Backend
📍 Environment: development
🌐 Server running on port 3001
🗄️  Database: filis_npd_dev@localhost:5432
```

**If you see errors, STOP HERE and tell me the exact error message.**

## 🔍 **Step 7: Test Health Endpoint**

**Open a new PowerShell window** (keep the server running):

```powershell
# Test the health endpoint
curl http://localhost:3001/health
```

**You should see something like:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-16T...",
  "database": {
    "status": "connected"
  }
}
```

## ✅ **Success Indicators**

- ✅ Server starts without errors
- ✅ Health endpoint returns "OK"
- ✅ Database status shows "connected"
- ✅ No red error messages in console

## 🚨 **If Something Goes Wrong**

**Common Error 1: "Cannot find module"**
```powershell
# Delete node_modules and reinstall
cd C:\Projects\filis-npd-platform\backend
rmdir /s node_modules
npm install
```

**Common Error 2: "Database connection failed"**
- Check PostgreSQL service is running
- Verify database `filis_npd_dev` exists in pgAdmin
- Check username/password in `.env.development`

**Common Error 3: "Port 3001 in use"**
```powershell
# Find what's using port 3001
netstat -ano | findstr :3001
# Kill the process (replace XXXX with actual PID)
taskkill /PID XXXX /F
```

**Tell me EXACTLY what happens when you run `npm run dev` - copy the full output!**