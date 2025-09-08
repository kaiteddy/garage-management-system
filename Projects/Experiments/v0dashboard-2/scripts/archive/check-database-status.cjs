#!/usr/bin/env node

/**
 * 📊 DATABASE STATUS CHECK
 * Quick check of current database state
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('📊 DATABASE STATUS CHECK');
console.log('========================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function checkDatabaseStatus() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 60000
    });
    
    // Test connection
    const testResult = await sql`SELECT NOW() as time, 'Status Check' as message`;
    console.log('✅ Database connected:', testResult[0].time);
    console.log('✅ Connection test:', testResult[0].message);
    console.log('');
    
    console.log('2️⃣ CHECKING TABLE COUNTS...');
    
    // Check main tables
    const tables = [
      { name: 'vehicles', icon: '🚗' },
      { name: 'customers', icon: '👥' },
      { name: 'customer_documents', icon: '📄' },
      { name: 'document_line_items', icon: '📋' },
      { name: 'receipts', icon: '🧾' },
      { name: 'reminders', icon: '⏰' },
      { name: 'stock', icon: '📦' },
      { name: 'appointments', icon: '📅' }
    ];
    
    const counts = {};
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
        const count = parseInt(result[0].count);
        counts[table.name] = count;
        totalRecords += count;
        console.log(`${table.icon} ${table.name}: ${count.toLocaleString()}`);
      } catch (e) {
        console.log(`❌ ${table.name}: Table not found or error`);
        counts[table.name] = 0;
      }
    }
    
    console.log('');
    console.log('3️⃣ DATABASE SUMMARY...');
    console.log('📊 Total records across all tables:', totalRecords.toLocaleString());
    console.log('');
    
    // Check for recent activity
    try {
      const recentVehicles = await sql`
        SELECT COUNT(*) as count 
        FROM vehicles 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      
      const recentCustomers = await sql`
        SELECT COUNT(*) as count 
        FROM customers 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      
      const recentDocs = await sql`
        SELECT COUNT(*) as count 
        FROM customer_documents 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      
      console.log('4️⃣ RECENT ACTIVITY (Last Hour)...');
      console.log('🚗 New vehicles:', recentVehicles[0].count);
      console.log('👥 New customers:', recentCustomers[0].count);
      console.log('📄 New documents:', recentDocs[0].count);
      console.log('');
      
    } catch (e) {
      console.log('⚠️  Could not check recent activity');
    }
    
    // Sample data check
    try {
      console.log('5️⃣ SAMPLE DATA CHECK...');
      
      const sampleVehicle = await sql`
        SELECT registration, make, model, year 
        FROM vehicles 
        WHERE registration IS NOT NULL 
        LIMIT 1
      `;
      
      if (sampleVehicle.length > 0) {
        const v = sampleVehicle[0];
        console.log(`🚗 Sample vehicle: ${v.registration} - ${v.make} ${v.model} (${v.year || 'Unknown year'})`);
      }
      
      const sampleCustomer = await sql`
        SELECT first_name, last_name, email 
        FROM customers 
        WHERE first_name IS NOT NULL 
        LIMIT 1
      `;
      
      if (sampleCustomer.length > 0) {
        const c = sampleCustomer[0];
        console.log(`👥 Sample customer: ${c.first_name} ${c.last_name} (${c.email || 'No email'})`);
      }
      
      const sampleDoc = await sql`
        SELECT document_number, document_type, total_gross 
        FROM customer_documents 
        WHERE document_number IS NOT NULL 
        LIMIT 1
      `;
      
      if (sampleDoc.length > 0) {
        const d = sampleDoc[0];
        console.log(`📄 Sample document: ${d.document_number} - ${d.document_type} (£${d.total_gross || 0})`);
      }
      
    } catch (e) {
      console.log('⚠️  Could not retrieve sample data');
    }
    
    console.log('');
    console.log('🎯 STATUS SUMMARY:');
    console.log('==================');
    
    if (totalRecords === 0) {
      console.log('📊 Database Status: EMPTY - No data imported yet');
      console.log('💡 Ready for import process');
    } else if (totalRecords < 1000) {
      console.log('📊 Database Status: MINIMAL DATA - Basic import completed');
      console.log('💡 Ready for full import process');
    } else if (totalRecords < 50000) {
      console.log('📊 Database Status: PARTIAL DATA - Some imports completed');
      console.log('💡 May need additional imports');
    } else {
      console.log('📊 Database Status: FULL DATA - Major imports completed');
      console.log('💡 Database appears well populated');
    }
    
    console.log('');
    console.log('✅ DATABASE STATUS CHECK COMPLETE');
    
  } catch (error) {
    console.log('❌ DATABASE STATUS CHECK FAILED:', error.message);
    console.log('💡 Check your .env.local file and database connection');
  }
}

checkDatabaseStatus();
