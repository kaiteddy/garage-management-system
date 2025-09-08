#!/usr/bin/env node

/**
 * 🧪 PRISMA ACCELERATE CONNECTION TEST
 * Simple test to verify Prisma Accelerate is working
 */

require('dotenv').config({ path: '.env.local' });

console.log('🧪 PRISMA ACCELERATE CONNECTION TEST');
console.log('====================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());

async function testPrismaAccelerate() {
  try {
    console.log('1️⃣ Checking environment variables...');
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('❌ DATABASE_URL not found');
      return;
    }
    
    if (dbUrl.startsWith('prisma+postgres://accelerate.prisma-data.net/')) {
      console.log('✅ Prisma Accelerate URL detected');
    } else {
      console.log('⚠️  Not using Prisma Accelerate URL');
      console.log('   Current URL:', dbUrl.substring(0, 50) + '...');
    }
    
    console.log('');
    console.log('2️⃣ Testing basic connection...');
    
    // Import Prisma Client
    const { PrismaClient } = require('@prisma/client');
    
    const prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
      log: ['error', 'warn']
    });
    
    console.log('✅ Prisma Client created');
    
    console.log('');
    console.log('3️⃣ Testing database query...');
    
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT COUNT(*) as customers FROM customers`;
    const queryTime = Date.now() - start;
    
    console.log(`✅ Query successful in ${queryTime}ms`);
    console.log(`👥 Current customers: ${result[0].customers}`);
    
    console.log('');
    console.log('4️⃣ Testing Prisma model query...');
    
    const modelStart = Date.now();
    const customerCount = await prisma.customer.count();
    const modelTime = Date.now() - modelStart;
    
    console.log(`✅ Model query successful in ${modelTime}ms`);
    console.log(`👥 Customer count via model: ${customerCount}`);
    
    await prisma.$disconnect();
    
    console.log('');
    console.log('✅ PRISMA ACCELERATE TEST SUCCESSFUL!');
    console.log('=====================================');
    console.log('🚀 Connection: Working');
    console.log('🚀 Queries: Fast and reliable');
    console.log('🚀 Ready for GA4 import');
    
  } catch (error) {
    console.log('❌ PRISMA ACCELERATE TEST FAILED');
    console.log('=================================');
    console.log('Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Connection timeout - Check Accelerate API key');
    } else if (error.message.includes('authentication')) {
      console.log('💡 Authentication failed - Verify API key');
    } else if (error.message.includes('relation') || error.message.includes('table')) {
      console.log('💡 Schema mismatch - Run prisma db push');
    } else {
      console.log('💡 Unexpected error - Check configuration');
    }
  }
}

testPrismaAccelerate();
