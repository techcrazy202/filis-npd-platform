// Check the actual columns in filis_data table
// Save as check-schema.mjs and run: node check-schema.mjs

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'filis_dev',
  host: 'localhost',
  database: 'filis_npd_dev',
  password: 'dev_password_123',
  port: 5432,
});

async function checkSchema() {
  try {
    console.log('🔍 Checking filis_data table schema...\n');
    
    // Get all column names and types
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'filis_data' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(schemaQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ Table filis_data not found!');
      
      // Check what tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tablesResult = await pool.query(tablesQuery);
      console.log('📋 Available tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
    } else {
      console.log('📋 filis_data table columns:');
      console.log('');
      result.rows.forEach((row, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable}`);
      });
      
      // Get sample data to see what's in the table
      console.log('\n🔍 Sample data (first 3 rows):');
      const sampleQuery = 'SELECT * FROM filis_data LIMIT 3';
      const sampleResult = await pool.query(sampleQuery);
      
      if (sampleResult.rows.length > 0) {
        console.log('\nColumns with sample values:');
        const firstRow = sampleResult.rows[0];
        Object.keys(firstRow).forEach(key => {
          const value = firstRow[key];
          const displayValue = value ? String(value).substring(0, 50) : 'NULL';
          console.log(`${key.padEnd(25)}: ${displayValue}`);
        });
      }
      
      // Check total row count
      const countQuery = 'SELECT COUNT(*) as total FROM filis_data';
      const countResult = await pool.query(countQuery);
      console.log(`\n📊 Total records: ${countResult.rows[0].total}`);
    }
    
  } catch (error) {
    console.error('💥 Schema check error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();