#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function createProperJobSheetsQuery() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔧 CREATING PROPER JOB SHEETS QUERY');
    console.log('===================================\n');

    // Test the complete job sheets query
    const jobSheetsQuery = `
      SELECT
        d._id as document_id,
        d.doc_number,
        d.doc_type,
        d._id_customer,
        d.vehicle_registration,
        d.created_at,

        -- Customer information
        CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,

        -- Vehicle information
        CONCAT(COALESCE(v.make, ''), ' ', COALESCE(v.model, '')) as vehicle_make_model,

        -- Document totals from line items
        COALESCE(SUM(li.total_amount), 0) as total_amount,
        COUNT(li.id) as item_count,

        -- Labour description from extras
        de.labour_description,
        de.doc_notes

      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      LEFT JOIN vehicles v ON d.vehicle_registration = v.registration
      LEFT JOIN line_items li ON d._id = li.document_id
      LEFT JOIN document_extras de ON d._id = de.document_id

      WHERE d.doc_type = 'Service'
        AND d.created_at > NOW() - INTERVAL '90 days'  -- Recent documents only

      GROUP BY
        d._id, d.doc_number, d.doc_type, d._id_customer, d.vehicle_registration,
        d.created_at, c.first_name, c.last_name, c.phone, c.email,
        v.make, v.model, de.labour_description, de.doc_notes

      HAVING
        -- Filter for likely job sheets (not completed invoices)
        (de.labour_description IS NOT NULL
         OR COUNT(li.id) > 0)

      ORDER BY d.created_at DESC
      LIMIT 20
    `;

    console.log('🔍 Testing job sheets query...');
    const result = await client.query(jobSheetsQuery);
    
    console.log(`📊 Found ${result.rows.length} potential job sheets\n`);
    
    result.rows.forEach((job: any, i: number) => {
      console.log(`${i + 1}. Doc: ${job.doc_number}`);
      console.log(`   Customer: ${job.customer_name || 'NO NAME'} (${job._id_customer})`);
      console.log(`   Vehicle: ${job.vehicle_registration} - ${job.vehicle_make_model || 'Unknown'}`);
      console.log(`   Total: £${parseFloat(job.total_amount || '0').toFixed(2)} (${job.item_count} items)`);
      console.log(`   Labour: ${job.labour_description ? job.labour_description.substring(0, 80) + '...' : 'None'}`);
      console.log(`   Date: ${new Date(job.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Also check line types to understand the data better
    console.log('📊 Line type analysis:');
    const lineTypes = await client.query(`
      SELECT line_type, COUNT(*) as count, AVG(total_amount) as avg_amount
      FROM line_items 
      GROUP BY line_type 
      ORDER BY count DESC
    `);
    
    lineTypes.rows.forEach((type: any) => {
      console.log(`   Type ${type.line_type}: ${type.count} items, avg £${parseFloat(type.avg_amount || '0').toFixed(2)}`);
    });

    // Check recent vs old documents
    console.log('\n📅 Document age analysis:');
    const ageAnalysis = await client.query(`
      SELECT 
        CASE 
          WHEN created_at > NOW() - INTERVAL '7 days' THEN 'Last 7 days'
          WHEN created_at > NOW() - INTERVAL '30 days' THEN 'Last 30 days'
          WHEN created_at > NOW() - INTERVAL '90 days' THEN 'Last 90 days'
          ELSE 'Older'
        END as age_group,
        COUNT(*) as count
      FROM documents 
      GROUP BY age_group
      ORDER BY 
        CASE 
          WHEN age_group = 'Last 7 days' THEN 1
          WHEN age_group = 'Last 30 days' THEN 2
          WHEN age_group = 'Last 90 days' THEN 3
          ELSE 4
        END
    `);
    
    ageAnalysis.rows.forEach((age: any) => {
      console.log(`   ${age.age_group}: ${age.count} documents`);
    });

  } catch (error: any) {
    console.error('❌ Error creating job sheets query:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the query test
createProperJobSheetsQuery().catch(console.error);
