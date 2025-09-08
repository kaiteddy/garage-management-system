#!/usr/bin/env node

/**
 * 🔄 NEON KEEPALIVE SERVICE
 * Prevents Neon from suspending by sending periodic queries
 * Run this in background to keep your Scale Plan always active
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🔄 NEON KEEPALIVE SERVICE');
console.log('========================');
console.log('🎯 Mission: Keep Neon Scale Plan always active');
console.log('⏰ Start:', new Date().toLocaleTimeString());

const sql = neon(process.env.DATABASE_URL, {
  connectionTimeoutMillis: 10000,
  queryTimeoutMillis: 5000
});

let queryCount = 0;
let successCount = 0;
let errorCount = 0;

async function keepAlive() {
  try {
    queryCount++;
    const result = await sql`SELECT NOW() as keepalive_time, 'active' as status`;
    successCount++;
    
    console.log(`✅ Keepalive #${queryCount} at ${new Date().toLocaleTimeString()} - Database active`);
    
    if (queryCount % 10 === 0) {
      console.log(`📊 Stats: ${successCount} success, ${errorCount} errors in last ${queryCount} checks`);
    }
    
  } catch (error) {
    errorCount++;
    console.log(`❌ Keepalive #${queryCount} failed: ${error.message}`);
    
    if (errorCount > 5) {
      console.log('🚨 Too many errors - Neon may be having issues');
    }
  }
  
  // Query every 30 seconds to prevent suspension
  setTimeout(keepAlive, 30000);
}

console.log('🚀 Starting keepalive service (query every 30 seconds)...');
console.log('💡 This will prevent Neon from suspending');
console.log('⚠️  Keep this running in background while working');
console.log('');

keepAlive();
