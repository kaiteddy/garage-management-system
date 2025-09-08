#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkColumnTypes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 CHECKING COLUMN TYPES');
    console.log('========================\n');

    // Check documents table columns
    const docColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `);
    
    console.log('📄 Documents table columns:');
    docColumns.rows.forEach((col: any) => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check vehicles table columns
    const vehicleColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n🚗 Vehicles table columns:');
    vehicleColumns.rows.forEach((col: any) => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check customers table columns
    const customerColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👤 Customers table columns:');
    customerColumns.rows.forEach((col: any) => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test a simple join to see what works
    console.log('\n🔗 Testing simple joins:');
    
    // Test documents to customers join
    const docCustomerTest = await client.query(`
      SELECT d._id, d._id_customer, c.id, c.first_name
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d._id_customer IS NOT NULL
      LIMIT 3
    `);
    
    console.log('Documents to customers join:');
    docCustomerTest.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. Doc: ${row._id}, Customer ID: ${row._id_customer}, Customer: ${row.first_name || 'NO NAME'}`);
    });

    // Test documents to vehicles join
    const docVehicleTest = await client.query(`
      SELECT d._id, d.vehicle_registration, v.registration, v.make, v.model
      FROM documents d
      LEFT JOIN vehicles v ON d.vehicle_registration = v.registration
      WHERE d.vehicle_registration IS NOT NULL
      LIMIT 3
    `);
    
    console.log('\nDocuments to vehicles join:');
    docVehicleTest.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. Doc: ${row._id}, Reg: ${row.vehicle_registration}, Vehicle: ${row.make} ${row.model}`);
    });

  } catch (error: any) {
    console.error('❌ Error checking column types:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkColumnTypes().catch(console.error);
