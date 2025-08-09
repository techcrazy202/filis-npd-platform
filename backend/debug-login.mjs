// Debug script to check the password hash and compare
// Save this as debug-login.mjs and run: node debug-login.mjs

import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'filis_dev',
  host: 'localhost',
  database: 'filis_npd_dev',
  password: 'dev_password_123',
  port: 5432,
});

async function debugLogin() {
  try {
    console.log('🔍 Debugging login issue...\n');
    
    // 1. Check if user exists and get their hash
    const userQuery = `
      SELECT id, email, password_hash, is_active, email_verified, phone_verified 
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await pool.query(userQuery, ['demo@filis.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Email Verified: ${user.email_verified}`);
    console.log(`   Phone Verified: ${user.phone_verified}`);
    console.log(`   Password Hash: ${user.password_hash.substring(0, 20)}...`);
    console.log('');
    
    // 2. Test the password comparison
    const testPassword = 'demo123';
    console.log(`🔒 Testing password: "${testPassword}"`);
    
    // Test with bcrypt.compare (async)
    const isMatchAsync = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`   Async compare result: ${isMatchAsync}`);
    
    // Test with bcrypt.compareSync (sync)
    const isMatchSync = bcrypt.compareSync(testPassword, user.password_hash);
    console.log(`   Sync compare result: ${isMatchSync}`);
    
    // 3. Test creating a new hash with the same password
    console.log('\n🔨 Creating new hash for comparison:');
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log(`   New hash: ${newHash.substring(0, 20)}...`);
    
    const newHashMatch = await bcrypt.compare(testPassword, newHash);
    console.log(`   New hash matches: ${newHashMatch}`);
    
    // 4. Check hash format
    console.log('\n📋 Hash analysis:');
    console.log(`   Hash length: ${user.password_hash.length}`);
    console.log(`   Hash format: ${user.password_hash.substring(0, 4)}`);
    console.log(`   Expected bcrypt format: $2a$ or $2b$`);
    
    // 5. If the hash doesn't work, let's reset it
    if (!isMatchAsync) {
      console.log('\n🔄 Password hash doesn\'t match. Creating new hash...');
      const correctHash = await bcrypt.hash(testPassword, 12);
      
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, is_active = true, email_verified = true, phone_verified = true
        WHERE email = $2
      `;
      
      await pool.query(updateQuery, [correctHash, 'demo@filis.com']);
      
      console.log('✅ Password hash updated successfully!');
      console.log('   User is now active and verified');
      
      // Test again
      const finalTest = await bcrypt.compare(testPassword, correctHash);
      console.log(`   Final test result: ${finalTest}`);
    } else {
      console.log('\n✅ Password hash is working correctly!');
    }
    
  } catch (error) {
    console.error('💥 Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugLogin();