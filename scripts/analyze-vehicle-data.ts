import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { createPool as createDbPool } from './utils/db-utils';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Create database connection pool
const dbPool = createDbPool();

interface VehicleStats {
  total: number;
  withMake: number;
  withModel: number;
  withYear: number;
  withMot: number;
  withTax: number;
  withColor: number;
  withFuelType: number;
  withEngineSize: number;
  withCustomer: number;
  completeRecords: number;
}

async function getVehicleStats(): Promise<VehicleStats> {
  const client = await dbPool.connect();
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN make IS NOT NULL AND make != '' THEN 1 END) as with_make,
        COUNT(CASE WHEN model IS NOT NULL AND model != '' THEN 1 END) as with_model,
        COUNT(CASE WHEN year IS NOT NULL THEN 1 END) as with_year,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as with_mot,
        COUNT(CASE WHEN tax_due_date IS NOT NULL THEN 1 END) as with_tax,
        COUNT(CASE WHEN color IS NOT NULL AND color != '' THEN 1 END) as with_color,
        COUNT(CASE WHEN fuel_type IS NOT NULL AND fuel_type != '' THEN 1 END) as with_fuel_type,
        COUNT(CASE WHEN engine_size IS NOT NULL THEN 1 END) as with_engine_size,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer,
        COUNT(CASE 
          WHEN make IS NOT NULL AND make != '' AND
               model IS NOT NULL AND model != '' AND
               year IS NOT NULL AND
               color IS NOT NULL AND color != '' AND
               fuel_type IS NOT NULL AND fuel_type != '' AND
               engine_size IS NOT NULL AND
               customer_id IS NOT NULL
          THEN 1 
        END) as complete_records
      FROM vehicles;
    `;

    const result = await client.query(query);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      withMake: parseInt(stats.with_make),
      withModel: parseInt(stats.with_model),
      withYear: parseInt(stats.with_year),
      withMot: parseInt(stats.with_mot),
      withTax: parseInt(stats.with_tax),
      withColor: parseInt(stats.with_color),
      withFuelType: parseInt(stats.with_fuel_type),
      withEngineSize: parseInt(stats.with_engine_size),
      withCustomer: parseInt(stats.with_customer),
      completeRecords: parseInt(stats.complete_records)
    };
  } finally {
    client.release();
  }
}

async function findIncompleteRecords(limit: number = 10) {
  const client = await dbPool.connect();
  try {
    const query = `
      SELECT 
        v.id,
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        v.fuel_type,
        v.engine_size,
        v.mot_expiry_date,
        v.tax_due_date,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        CASE 
          WHEN v.make IS NULL OR v.make = '' THEN 'missing_make,'
          ELSE ''
        END ||
        CASE 
          WHEN v.model IS NULL OR v.model = '' THEN 'missing_model,'
          ELSE ''
        END ||
        CASE 
          WHEN v.year IS NULL THEN 'missing_year,'
          ELSE ''
        END ||
        CASE 
          WHEN v.color IS NULL OR v.color = '' THEN 'missing_color,'
          ELSE ''
        END ||
        CASE 
          WHEN v.fuel_type IS NULL OR v.fuel_type = '' THEN 'missing_fuel_type,'
          ELSE ''
        END ||
        CASE 
          WHEN v.engine_size IS NULL THEN 'missing_engine_size,'
          ELSE ''
        END ||
        CASE 
          WHEN v.mot_expiry_date IS NULL THEN 'missing_mot,'
          ELSE ''
        END ||
        CASE 
          WHEN v.tax_due_date IS NULL THEN 'missing_tax,'
          ELSE ''
        END ||
        CASE 
          WHEN v.customer_id IS NULL THEN 'missing_customer,'
          ELSE ''
        END as missing_fields
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE 
        v.make IS NULL OR v.make = '' OR
        v.model IS NULL OR v.model = '' OR
        v.year IS NULL OR
        v.color IS NULL OR v.color = '' OR
        v.fuel_type IS NULL OR v.fuel_type = '' OR
        v.engine_size IS NULL OR
        v.mot_expiry_date IS NULL OR
        v.tax_due_date IS NULL OR
        v.customer_id IS NULL
      ORDER BY v.last_checked NULLS FIRST, v.registration
      LIMIT $1;
    `;

    const result = await client.query(query, [limit]);
    return result.rows;
  } finally {
    client.release();
  }
}

function formatPercentage(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%';
}

async function analyzeData() {
  console.log('Analyzing vehicle data...\n');
  
  try {
    // Get overall statistics
    const stats = await getVehicleStats();
    
    console.log('=== Vehicle Data Completeness ===\n');
    console.log(`Total vehicles: ${stats.total}`);
    console.log(`Complete records: ${stats.completeRecords} (${formatPercentage(stats.completeRecords, stats.total)})`);
    console.log('\nField completion rates:');
    console.log(`- Make: ${stats.withMake} (${formatPercentage(stats.withMake, stats.total)})`);
    console.log(`- Model: ${stats.withModel} (${formatPercentage(stats.withModel, stats.total)})`);
    console.log(`- Year: ${stats.withYear} (${formatPercentage(stats.withYear, stats.total)})`);
    console.log(`- Color: ${stats.withColor} (${formatPercentage(stats.withColor, stats.total)})`);
    console.log(`- Fuel Type: ${stats.withFuelType} (${formatPercentage(stats.withFuelType, stats.total)})`);
    console.log(`- Engine Size: ${stats.withEngineSize} (${formatPercentage(stats.withEngineSize, stats.total)})`);
    console.log(`- MOT Expiry: ${stats.withMot} (${formatPercentage(stats.withMot, stats.total)})`);
    console.log(`- Tax Due: ${stats.withTax} (${formatPercentage(stats.withTax, stats.total)})`);
    console.log(`- Customer: ${stats.withCustomer} (${formatPercentage(stats.withCustomer, stats.total)})\n`);
    
    // Find incomplete records
    console.log('=== Incomplete Records ===\n');
    const incompleteRecords = await findIncompleteRecords(20);
    
    if (incompleteRecords.length === 0) {
      console.log('No incomplete records found!');
    } else {
      console.log(`Found ${incompleteRecords.length} incomplete records (showing first 20):\n`);
      
      // Group by missing fields for better analysis
      const missingFieldsCount: Record<string, number> = {};
      
      console.log('Sample of incomplete records:');
      console.table(incompleteRecords.map(record => ({
        registration: record.registration,
        make: record.make || 'MISSING',
        model: record.model || 'MISSING',
        year: record.year || 'MISSING',
        customer: record.customer_name || 'MISSING',
        missing: record.missing_fields.split(',').filter(Boolean).join(', ')
      })));
      
      // Count missing fields
      incompleteRecords.forEach(record => {
        record.missing_fields.split(',').filter(Boolean).forEach((field: string) => {
          missingFieldsCount[field] = (missingFieldsCount[field] || 0) + 1;
        });
      });
      
      console.log('\nMissing fields count:');
      console.table(Object.entries(missingFieldsCount).map(([field, count]) => ({
        field: field.replace('_', ' ').replace(/^./, str => str.toUpperCase()),
        count,
        percentage: formatPercentage(count, incompleteRecords.length)
      })));
    }
    
    // Check for potential data quality issues
    console.log('\n=== Data Quality Issues ===\n');
    
    // Check for vehicles with invalid year
    const invalidYear = await dbPool.query(`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE year < 1900 OR year > EXTRACT(YEAR FROM CURRENT_DATE) + 1
    `);
    
    if (invalidYear.rows[0].count > 0) {
      console.log(`⚠️  Found ${invalidYear.rows[0].count} vehicles with potentially invalid year`);
    }
    
    // Check for vehicles with future MOT dates
    const futureMot = await dbPool.query(`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE mot_expiry_date > (CURRENT_DATE + INTERVAL '2 years')
    `);
    
    if (futureMot.rows[0].count > 0) {
      console.log(`⚠️  Found ${futureMot.rows[0].count} vehicles with MOT dates more than 2 years in the future`);
    }
    
    // Check for vehicles with very old first registration
    const oldVehicles = await dbPool.query(`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE year < 1970
    `);
    
    if (oldVehicles.rows[0].count > 0) {
      console.log(`ℹ️  Found ${oldVehicles.rows[0].count} vehicles registered before 1970`);
    }
    
  } catch (error) {
    console.error('Error analyzing vehicle data:', error);
  } finally {
    await dbPool.end();
  }
}

// Run the analysis
analyzeData().catch(console.error);
