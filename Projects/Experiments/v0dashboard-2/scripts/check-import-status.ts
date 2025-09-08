#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkImportStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🎉 FINAL IMPORT STATUS REPORT');
    console.log('================================\n');

    // Count all records
    const customers = await client.query('SELECT COUNT(*) FROM customers');
    const vehicles = await client.query('SELECT COUNT(*) FROM vehicles');
    const documents = await client.query('SELECT COUNT(*) FROM documents');
    
    console.log('📊 TOTAL RECORDS:');
    console.log(`👤 Customers: ${customers.rows[0].count}`);
    console.log(`🚗 Vehicles: ${vehicles.rows[0].count}`);
    console.log(`📄 Documents: ${documents.rows[0].count}`);
    console.log(`📈 TOTAL: ${parseInt(customers.rows[0].count) + parseInt(vehicles.rows[0].count) + parseInt(documents.rows[0].count)} records\n`);
    
    // Check customer-vehicle links
    const linkedVehicles = await client.query('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL');
    const unlinkedVehicles = await client.query('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL');
    
    console.log('🔗 CUSTOMER-VEHICLE RELATIONSHIPS:');
    console.log(`✅ Linked vehicles: ${linkedVehicles.rows[0].count}`);
    console.log(`⚪ Unlinked vehicles: ${unlinkedVehicles.rows[0].count}`);
    console.log(`📊 Link rate: ${Math.round((parseInt(linkedVehicles.rows[0].count) / parseInt(vehicles.rows[0].count)) * 100)}%\n`);
    
    // Check recent additions (last 24 hours)
    const recentCustomers = await client.query("SELECT COUNT(*) FROM customers WHERE created_at > NOW() - INTERVAL '24 hours'");
    const recentVehicles = await client.query("SELECT COUNT(*) FROM vehicles WHERE created_at > NOW() - INTERVAL '24 hours'");
    const recentDocuments = await client.query("SELECT COUNT(*) FROM documents WHERE created_at > NOW() - INTERVAL '24 hours'");
    
    console.log('🆕 RECENT ADDITIONS (Last 24 hours):');
    console.log(`👤 New customers: ${recentCustomers.rows[0].count}`);
    console.log(`🚗 New vehicles: ${recentVehicles.rows[0].count}`);
    console.log(`📄 New documents: ${recentDocuments.rows[0].count}\n`);
    
    // Sample some data
    const sampleCustomers = await client.query('SELECT first_name, last_name, email FROM customers ORDER BY created_at DESC LIMIT 3');
    const sampleVehicles = await client.query('SELECT registration, make, model, customer_id FROM vehicles WHERE customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 3');
    
    console.log('📝 SAMPLE DATA:');
    console.log('Recent customers:');
    sampleCustomers.rows.forEach((customer, i) => {
      console.log(`  ${i + 1}. ${customer.first_name} ${customer.last_name} (${customer.email})`);
    });
    
    console.log('\nRecent linked vehicles:');
    sampleVehicles.rows.forEach((vehicle, i) => {
      console.log(`  ${i + 1}. ${vehicle.registration} - ${vehicle.make} ${vehicle.model} (Customer: ${vehicle.customer_id})`);
    });
    
    console.log('\n✅ Import appears to be successful!');
    console.log('💡 APIs will continue to enhance records with additional data as needed.');

  } catch (error: any) {
    console.error('❌ Error checking status:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the status check
checkImportStatus().catch(console.error);
