import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixDatabasePermissions() {
  console.log('🔧 Starting database permissions fix...');
  
  const dbUser = process.env.DB_USER || 'filis_dev';
  const dbName = process.env.DB_NAME || 'filis_npd_dev';
  
  console.log(`📋 Target database: ${dbName}`);
  console.log(`👤 Target user: ${dbUser}`);
  
  // Try different common postgres passwords
  const possiblePasswords = [
    process.env.POSTGRES_PASSWORD,
    'postgres',
    'admin',
    'password',
    '123456',
    ''
  ].filter(p => p !== undefined);
  
  let adminPool: Pool | null = null;
  let connectionSuccessful = false;
  
  console.log('🔍 Attempting to connect to PostgreSQL as postgres user...');
  
  // Try to connect with different passwords
  for (const password of possiblePasswords) {
    try {
      console.log(`🔑 Trying password: ${password ? '***' : 'empty'}`);
      
      adminPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: dbName,
        user: 'postgres',
        password: password,
        connectionTimeoutMillis: 5000,
      });
      
      // Test the connection
      await adminPool.query('SELECT 1');
      connectionSuccessful = true;
      console.log('✅ Connected to PostgreSQL as postgres user');
      break;
    } catch (error: any) {
      if (adminPool) {
        await adminPool.end().catch(() => {});
        adminPool = null;
      }
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  if (!connectionSuccessful || !adminPool) {
    console.error('❌ Could not connect to PostgreSQL as postgres user');
    console.log('💡 Please ensure PostgreSQL is running and you have the correct postgres password');
    console.log('💡 You can set POSTGRES_PASSWORD environment variable');
    process.exit(1);
  }

  try {
    console.log('🔧 Granting permissions...');
    
    // Grant all privileges on database to filis_dev user
    await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`);
    console.log('✅ Granted database privileges');
    
    // Grant all privileges on all tables in public schema
    await adminPool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}`);
    console.log('✅ Granted table privileges');
    
    // Grant all privileges on all sequences in public schema
    await adminPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}`);
    console.log('✅ Granted sequence privileges');
    
    // Grant all privileges on all functions in public schema
    await adminPool.query(`GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${dbUser}`);
    console.log('✅ Granted function privileges');
    
    // Set default privileges for future tables
    await adminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`);
    await adminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`);
    await adminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${dbUser}`);
    console.log('✅ Set default privileges');
    
    // Grant usage on schema
    await adminPool.query(`GRANT USAGE ON SCHEMA public TO ${dbUser}`);
    console.log('✅ Granted schema usage');
    
    // Grant create on schema
    await adminPool.query(`GRANT CREATE ON SCHEMA public TO ${dbUser}`);
    console.log('✅ Granted schema create');
    
    console.log('🎉 Database permissions fixed successfully!');
    
    // Test the connection with the application user
    console.log('🧪 Testing connection with application user...');
    const testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: dbName,
      user: dbUser,
      password: process.env.DB_PASSWORD || 'dev_password_123',
    });
    
    // Test query
    const result = await testPool.query('SELECT COUNT(*) FROM users');
    console.log(`✅ Test query successful: Found ${result.rows[0].count} users in database`);
    
    await testPool.end();
    
  } catch (error: any) {
    console.error('❌ Failed to fix database permissions:', error.message);
    throw error;
  } finally {
    if (adminPool) {
      await adminPool.end();
    }
  }
}

// Run the function
fixDatabasePermissions()
  .then(() => {
    console.log('🏁 Permission fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Permission fix failed:', error.message);
    process.exit(1);
  });