import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

dotenv.config();

interface VerificationResult {
  table: string;
  exists: boolean;
  rowCount: number;
  sampleData?: any[];
  error?: string;
}

async function verifyData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  // Helper function to ensure pool is properly closed
  const cleanup = async () => {
    try {
      client.release();
      await pool.end();
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  };
  
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down...');
    await cleanup();
    process.exit(0);
  });
  
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled rejection:', reason);
    await cleanup();
    process.exit(1);
  });
  const results: VerificationResult[] = [];
  
  const tables = [
    'customers',
    'vehicles',
    'documents',
    'document_extras',
    'line_items',
    'receipts',
    'appointments'
  ];

  // 1. Check table existence and row counts
  console.log('\n=== Table Verification ===');
  for (const table of tables) {
    try {
      const { rows } = await client.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = $1`,
        [table]
      );
      
      const exists = rows[0].count > 0;
      let rowCount = 0;
      
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        rowCount = parseInt(countResult.rows[0].count as string);
      }
      
      console.log(`✅ ${table.padEnd(16)}: ${exists ? 'EXISTS' : 'MISSING'} (${rowCount} rows)`);
      
      results.push({
        table,
        exists,
        rowCount,
        error: exists ? undefined : 'Table does not exist'
      });
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error checking table ${table}:`, errorMessage);
      results.push({
        table,
        exists: false,
        rowCount: 0,
        error: errorMessage
      });
    }
  }

  // 2. Check relationships
  console.log('\n=== Relationship Verification ===');
  const relationshipChecks = [
    {
      name: 'Vehicles with invalid customer_id',
      query: `SELECT COUNT(*) FROM vehicles v LEFT JOIN customers c ON v.customer_id = c.id WHERE c.id IS NULL AND v.customer_id IS NOT NULL`
    },
    {
      name: 'Documents with invalid customer_id',
      query: `SELECT COUNT(*) FROM documents d LEFT JOIN customers c ON d.customer_id = c.id WHERE c.id IS NULL AND d.customer_id IS NOT NULL`
    },
    {
      name: 'Documents with invalid vehicle_id',
      query: `SELECT COUNT(*) FROM documents d LEFT JOIN vehicles v ON d.vehicle_id = v.id WHERE v.id IS NULL AND d.vehicle_id IS NOT NULL`
    },
    {
      name: 'Document_Extras with invalid document_id',
      query: `SELECT COUNT(*) FROM document_extras de LEFT JOIN documents d ON de.document_id = d.id WHERE d.id IS NULL`
    },
    {
      name: 'Line_Items with invalid document_id',
      query: `SELECT COUNT(*) FROM line_items li LEFT JOIN documents d ON li.document_id = d.id WHERE d.id IS NULL`
    },
    {
      name: 'Receipts with invalid document_id',
      query: `SELECT COUNT(*) FROM receipts r LEFT JOIN documents d ON r.document_id = d.id WHERE d.id IS NULL`
    },
    {
      name: 'Appointments with invalid customer_id',
      query: `SELECT COUNT(*) FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id WHERE c.id IS NULL AND a.customer_id IS NOT NULL`
    },
    {
      name: 'Appointments with invalid vehicle_id',
      query: `SELECT COUNT(*) FROM appointments a LEFT JOIN vehicles v ON a.vehicle_id = v.id WHERE v.id IS NULL AND a.vehicle_id IS NOT NULL`
    }
  ];

  for (const check of relationshipChecks) {
    try {
      const result = await client.query(check.query);
      const count = parseInt(result.rows[0].count as string);
      console.log(`✅ ${check.name.padEnd(50)}: ${count} issues found`);
      
      // If there are issues, log some examples
      if (count > 0 && count < 100) {
        const exampleQuery = check.query.replace('COUNT(*)', '*');
        const examples = (await client.query(exampleQuery + ' LIMIT 3')).rows;
        console.log('   Examples:', JSON.stringify(examples, null, 2));
      }
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error checking ${check.name}:`, errorMessage);
    }
  }

  // 3. Data quality checks
  console.log('\n=== Data Quality Checks ===');
  const qualityChecks = [
    {
      name: 'Customers with missing contact info',
      query: `SELECT COUNT(*) FROM customers WHERE (email IS NULL OR email = '') AND (phone IS NULL OR phone = '')`
    },
    {
      name: 'Vehicles without registration',
      query: `SELECT COUNT(*) FROM vehicles WHERE registration IS NULL OR registration = ''`
    },
    {
      name: 'Documents without customer or vehicle',
      query: `SELECT COUNT(*) FROM documents WHERE customer_id IS NULL AND vehicle_id IS NULL`
    },
    {
      name: 'Documents with negative amounts',
      query: `SELECT COUNT(*) FROM documents WHERE total_amount < 0`
    },
    {
      name: 'Line items with zero or negative quantity',
      query: `SELECT COUNT(*) FROM line_items WHERE quantity <= 0`
    },
    {
      name: 'Receipts with zero or negative amounts',
      query: `SELECT COUNT(*) FROM receipts WHERE amount <= 0`
    }
  ];

  for (const check of qualityChecks) {
    try {
      const result = await client.query(check.query);
      const count = parseInt(result.rows[0].count as string);
      console.log(`🔍 ${check.name.padEnd(45)}: ${count} potential issues`);
      
      // If there are issues, log some examples
      if (count > 0 && count < 100) {
        const exampleQuery = check.query.replace('COUNT(*)', '*');
        const examples = (await client.query(exampleQuery + ' LIMIT 3')).rows;
        console.log('   Examples:', JSON.stringify(examples, null, 2));
      }
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error running quality check "${check.name}":`, errorMessage);
    }
  }

  // 4. Save results to file
  await fs.writeFile(
    'verification-results.json',
    JSON.stringify(results, null, 2)
  );
  
  await cleanup();
  console.log('\n✅ Verification complete. Results saved to verification-results.json');
  return results;
}

// Run the verification
verifyData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
