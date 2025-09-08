#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function analyzeJobSheetAges() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 ANALYZING JOB SHEET AGES');
    console.log('===========================\n');

    // Since all documents are from the same import date, let's check the actual date range
    const dateRange = await client.query(`
      SELECT 
        MIN(created_at) as oldest,
        MAX(created_at) as newest,
        COUNT(*) as total
      FROM documents
      WHERE doc_type = 'Service'
    `);
    
    console.log('📅 Document date range:');
    const range = dateRange.rows[0];
    console.log(`   Oldest: ${new Date(range.oldest).toLocaleDateString()}`);
    console.log(`   Newest: ${new Date(range.newest).toLocaleDateString()}`);
    console.log(`   Total Service documents: ${range.total}`);
    
    // Since all documents are from the same date (import date), let's look at the actual business logic
    // We need to identify which job sheets should be considered "old" based on their content
    
    console.log('\n🔍 ANALYZING JOB SHEET CONTENT FOR AGE INDICATORS:');
    
    // Get job sheets with their details
    const jobSheets = await client.query(`
      SELECT 
        d.doc_number,
        d.created_at,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        d.vehicle_registration,
        COALESCE(SUM(li.total_amount), 0) as total_amount,
        de.labour_description,
        COUNT(li.id) as item_count,
        -- Look for completion indicators in labour description
        CASE 
          WHEN de.labour_description ILIKE '%completed%' 
            OR de.labour_description ILIKE '%finished%'
            OR de.labour_description ILIKE '%done%'
            OR de.labour_description ILIKE '%invoiced%'
          THEN 'COMPLETED'
          WHEN de.labour_description ILIKE '%mot%' 
            AND de.labour_description ILIKE '%test%'
          THEN 'MOT_SCHEDULED'
          WHEN de.labour_description IS NOT NULL 
            AND LENGTH(de.labour_description) > 50
          THEN 'IN_PROGRESS'
          WHEN COUNT(li.id) > 0 
          THEN 'ESTIMATE_WITH_PARTS'
          ELSE 'ESTIMATE_ONLY'
        END as job_status
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      LEFT JOIN line_items li ON d.doc_number = li.document_id
      LEFT JOIN document_extras de ON d.doc_number = de.document_id
      WHERE d.doc_type = 'Service'
      GROUP BY 
        d.doc_number, d.created_at, c.first_name, c.last_name, 
        d.vehicle_registration, de.labour_description
      HAVING 
        (de.labour_description IS NOT NULL OR COUNT(li.id) > 0)
      ORDER BY total_amount DESC
      LIMIT 50
    `);
    
    // Group by status
    const statusGroups: { [key: string]: any[] } = {};
    jobSheets.rows.forEach((job: any) => {
      const status = job.job_status;
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(job);
    });
    
    console.log('📊 JOB SHEET STATUS ANALYSIS:');
    Object.entries(statusGroups).forEach(([status, jobs]) => {
      console.log(`\n${status}: ${jobs.length} job sheets`);
      
      if (status === 'COMPLETED') {
        console.log('   ✅ These appear to be completed and should be converted to invoices:');
        jobs.slice(0, 5).forEach((job: any, i: number) => {
          console.log(`     ${i + 1}. ${job.customer_name} - £${parseFloat(job.total_amount).toFixed(2)}`);
          console.log(`        Work: ${job.labour_description?.substring(0, 60)}...`);
        });
      } else if (status === 'IN_PROGRESS') {
        console.log('   🔧 Active work in progress:');
        jobs.slice(0, 5).forEach((job: any, i: number) => {
          console.log(`     ${i + 1}. ${job.customer_name} - £${parseFloat(job.total_amount).toFixed(2)}`);
          console.log(`        Work: ${job.labour_description?.substring(0, 60)}...`);
        });
      } else if (status === 'MOT_SCHEDULED') {
        console.log('   📅 MOT tests scheduled:');
        jobs.slice(0, 5).forEach((job: any, i: number) => {
          console.log(`     ${i + 1}. ${job.customer_name} - £${parseFloat(job.total_amount).toFixed(2)}`);
        });
      }
    });
    
    // Summary
    const totalJobs = jobSheets.rows.length;
    const completedJobs = statusGroups['COMPLETED']?.length || 0;
    const inProgressJobs = statusGroups['IN_PROGRESS']?.length || 0;
    const motJobs = statusGroups['MOT_SCHEDULED']?.length || 0;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total job sheets analyzed: ${totalJobs}`);
    console.log(`   Completed (should convert): ${completedJobs} (${((completedJobs/totalJobs)*100).toFixed(1)}%)`);
    console.log(`   In Progress: ${inProgressJobs} (${((inProgressJobs/totalJobs)*100).toFixed(1)}%)`);
    console.log(`   MOT Scheduled: ${motJobs} (${((motJobs/totalJobs)*100).toFixed(1)}%)`);
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (completedJobs > 0) {
      console.log(`   • Convert ${completedJobs} completed job sheets to invoices`);
    }
    console.log(`   • Review in-progress jobs for completion status`);
    console.log(`   • Implement 60-day age limit for future job sheets`);

  } catch (error: any) {
    console.error('❌ Error analyzing job sheet ages:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeJobSheetAges().catch(console.error);
