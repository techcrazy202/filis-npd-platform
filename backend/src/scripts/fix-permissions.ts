import { Pool } from 'pg';

async function fixDatabasePermissions() {
  console.log('🔧 Fixing database permissions...');
  
  // Try different common postgres passwords
  const possiblePasswords = [
    process.env.POSTGRES_PASSWORD,
    'postgres',
    'admin',
    'password',
    '123456',
    ''
  ].filter(Boolean);
  
  let adminPool: Pool | null = null;
  let connectionSuccessful = false;
  
  // Try to connect with different passwords
  for (const password of possiblePasswords) {
    try {
      adminPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'filis_npd_dev',
        user: 'postgres',
        password: password,
        connectionTimeoutMillis: 5000,
      });
      
      // Test the connection
      await adminPool.query('SELECT 1');
      connectionSuccessful = true;
      console.log('✅ Connected to PostgreSQL as postgres user');
      break;
    } catch (error) {
      if (adminPool) {
        await adminPool.end().catch(() => {});
        adminPool = null;
      }
      console.log(`❌ Failed to connect with password: ${password ? '***' : 'empty'}`);
    }
  }
  
  if (!connectionSuccessful || !adminPool) {
    console.error('❌ Could not connect to PostgreSQL as postgres user');
    console.log('💡 Please ensure PostgreSQL is running and you have the correct postgres password');
    console.log('💡 You can set POSTGRES_PASSWORD environment variable');
    throw new Error('Failed to connect to PostgreSQL as superuser');
  }

  try {
    // Grant all privileges on database to filis_dev user
    await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB_NAME || 'filis_npd_dev'} TO ${process.env.DB_USER || 'filis_dev'}`);
    
    // Grant all privileges on all tables in public schema
    await adminPool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env.DB_USER || 'filis_dev'}`);
    
    // Grant all privileges on all sequences in public schema
    await adminPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env.DB_USER || 'filis_dev'}`);
    
    // Grant all privileges on all functions in public schema
    await adminPool.query(`GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${process.env.DB_USER || 'filis_dev'}`);
    
    // Set default privileges for future tables
    await adminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${process.env.DB_USER || 'filis_dev'}`);
    await adminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${process.env.DB_USER || 'filis_dev'}`);
    await adminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${process.env.DB_USER || 'filis_dev'}`);
    
    // Grant usage on schema
    await adminPool.query(`GRANT USAGE ON SCHEMA public TO ${process.env.DB_USER || 'filis_dev'}`);
    
    // Grant create on schema
    await adminPool.query(`GRANT CREATE ON SCHEMA public TO ${process.env.DB_USER || 'filis_dev'}`);
    
    console.log('✅ Database permissions fixed successfully');
    
    // Test the connection with the application user
    const testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'filis_npd_dev',
      user: process.env.DB_USER || 'filis_dev',
      password: process.env.DB_PASSWORD || 'dev_password_123',
    });
    
    // Test query
    const result = await testPool.query('SELECT COUNT(*) FROM users');
    console.log(`🧪 Test query successful: Found ${result.rows[0].count} users in database`);
    
    await testPool.end();
    
  } catch (error) {
    console.error('❌ Failed to fix database permissions:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDatabasePermissions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixDatabasePermissions };