#!/usr/bin/env node

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check customers table structure
    console.log('📋 CUSTOMERS table structure:');
    const customersSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position;
    `;
    
    customersSchema.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    console.log('\n📋 VEHICLES table structure:');
    const vehiclesSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      ORDER BY ordinal_position;
    `;
    
    vehiclesSchema.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    console.log('\n📊 Sample customer data:');
    const sampleCustomers = await sql`SELECT * FROM customers LIMIT 3`;
    console.log(sampleCustomers);

    console.log('\n📊 Sample vehicle data:');
    const sampleVehicles = await sql`SELECT * FROM vehicles LIMIT 3`;
    console.log(sampleVehicles);

  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema().catch(console.error);
