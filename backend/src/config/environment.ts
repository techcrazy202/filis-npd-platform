import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432').transform(Number),
  DB_NAME: z.string().default('filis_npd_dev'),
  DB_USER: z.string().default('filis_dev'),
  DB_PASSWORD: z.string().default('dev_password_123'),
  DATABASE_URL: z.string().default('postgresql://filis_dev:dev_password_123@localhost:5432/filis_npd_dev'),
  
  JWT_SECRET: z.string().default('dev_jwt_secret_for_local_development_only_256_bits_long'),
  JWT_REFRESH_SECRET: z.string().default('dev_refresh_secret_for_local_development_only_256_bits'),
  ENCRYPTION_KEY: z.string().default('dev_encryption_key_for_local_development_only_256_bits'),
  
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
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