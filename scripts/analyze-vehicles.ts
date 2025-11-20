import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { createPool as createDbPool } from './utils/db-utils';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Create database connection pool
const dbPool = createDbPool();

interface VehicleRecord {
  id: string;
  registration: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuel_type: string | null;
  engine_size: string | null;
  mot_status: string | null;
  mot_expiry_date: string | null;
  tax_status: string | null;
  tax_due_date: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

async function getTotalVehiclesCount(): Promise<number> {
  const client = await dbPool.connect();
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM vehicles');
    return parseInt(result.rows[0].count, 10);
  } finally {
    client.release();
  }
}

async function getVehicles(limit: number = 100, offset: number = 0): Promise<VehicleRecord[]> {
  const client = await dbPool.connect();
  try {
    const query = `
      SELECT 
        id,
        registration,
        make,
        model,
        year,
        color,
        fuel_type,
        engine_size,
        mot_status,
        mot_expiry_date,
        tax_status,
        tax_due_date,
        owner_id,
        created_at,
        updated_at
      FROM vehicles
      ORDER BY updated_at DESC NULLS LAST, registration
      LIMIT $1 OFFSET $2;
    `;

    const result = await client.query<VehicleRecord>(query, [limit, offset]);
    return result.rows;
  } finally {
    client.release();
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
}

function displayTop(title: string, items: Map<string, number>, limit: number = 5) {
  const sorted = Array.from(items.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  const total = Array.from(items.values()).reduce((sum, count) => sum + count, 0);
  
  console.log(`\n🏆 Top ${limit} ${title}:`);
  console.table(
    sorted.map(([name, count]) => ({
      [title]: name,
      'Count': count,
      'Percentage': `${((count / total) * 100).toFixed(1)}%`
    }))
  );
}

async function analyzeVehicles() {
  console.log('Starting vehicle database analysis...\n');
  
  const batchSize = 100;
  let offset = 0;
  let hasMore = true;
  
  // Initialize statistics
  const stats = {
    totalVehicles: 0,
    withMake: 0,
    withModel: 0,
    withMOT: 0,
    withTax: 0,
    withOwner: 0,
    expiredMOT: 0,
    expiredTax: 0,
    expiringSoonMOT: 0,
    expiringSoonTax: 0,
    makes: new Map<string, number>(),
    models: new Map<string, number>(),
    fuelTypes: new Map<string, number>(),
    motStatuses: new Map<string, number>(),
    taxStatuses: new Map<string, number>(),
    byYear: new Map<number, number>(),
    sampleVehicles: [] as VehicleRecord[]
  };

  // Get total count first
  stats.totalVehicles = await getTotalVehiclesCount();
  console.log(`Found ${stats.totalVehicles} vehicles in the database.\n`);
  
  if (stats.totalVehicles === 0) {
    console.log('No vehicles found in the database.');
    return;
  }
  
  // Process in batches
  while (hasMore) {
    const vehicles = await getVehicles(batchSize, offset);
    if (vehicles.length === 0) {
      hasMore = false;
      break;
    }
    
    // Process this batch
    for (const vehicle of vehicles) {
      // Update statistics
      if (vehicle.make) {
        stats.withMake++;
        stats.makes.set(vehicle.make, (stats.makes.get(vehicle.make) || 0) + 1);
      }
      
      if (vehicle.model) {
        stats.withModel++;
        stats.models.set(vehicle.model, (stats.models.get(vehicle.model) || 0) + 1);
      }
      
      if (vehicle.mot_expiry_date) {
        stats.withMOT++;
        const motDate = new Date(vehicle.mot_expiry_date);
        const today = new Date();
        
        if (motDate < today) {
          stats.expiredMOT++;
        } else {
          const daysToExpiry = Math.ceil((motDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysToExpiry <= 30) {
            stats.expiringSoonMOT++;
          }
        }
      }
      
      if (vehicle.tax_due_date) {
        stats.withTax++;
        const taxDate = new Date(vehicle.tax_due_date);
        const today = new Date();
        
        if (taxDate < today) {
          stats.expiredTax++;
        } else {
          const daysToExpiry = Math.ceil((taxDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysToExpiry <= 30) {
            stats.expiringSoonTax++;
          }
        }
      }
      
      if (vehicle.owner_id) stats.withOwner++;
      
      // Track fuel types
      if (vehicle.fuel_type) {
        stats.fuelTypes.set(vehicle.fuel_type, (stats.fuelTypes.get(vehicle.fuel_type) || 0) + 1);
      }
      
      // Track MOT statuses
      if (vehicle.mot_status) {
        stats.motStatuses.set(vehicle.mot_status, (stats.motStatuses.get(vehicle.mot_status) || 0) + 1);
      }
      
      // Track tax statuses
      if (vehicle.tax_status) {
        stats.taxStatuses.set(vehicle.tax_status, (stats.taxStatuses.get(vehicle.tax_status) || 0) + 1);
      }
      
      // Track by year
      if (vehicle.year) {
        stats.byYear.set(vehicle.year, (stats.byYear.get(vehicle.year) || 0) + 1);
      }
      
      // Keep a sample of vehicles
      if (stats.sampleVehicles.length < 5) {
        stats.sampleVehicles.push(vehicle);
      }
    }
    
    // Update progress
    const processed = Math.min(offset + batchSize, stats.totalVehicles);
    const progress = ((processed / stats.totalVehicles) * 100).toFixed(1);
    process.stdout.write(`\rProcessed ${processed} of ${stats.totalVehicles} vehicles (${progress}%)...`);
    
    // Prepare for next batch
    offset += batchSize;
    
    // Small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n\n=== Database Analysis Complete ===\n');
  
  // Display summary
  console.log('📊 Summary Statistics:');
  console.table({
    'Total Vehicles': stats.totalVehicles,
    'With Make': `${stats.withMake} (${((stats.withMake / stats.totalVehicles) * 100).toFixed(1)}%)`,
    'With Model': `${stats.withModel} (${((stats.withModel / stats.totalVehicles) * 100).toFixed(1)}%)`,
    'With MOT': `${stats.withMOT} (${stats.withMOT ? ((stats.withMOT / stats.totalVehicles) * 100).toFixed(1) : 0}%)`,
    'With Tax': `${stats.withTax} (${stats.withTax ? ((stats.withTax / stats.totalVehicles) * 100).toFixed(1) : 0}%)`,
    'With Owner': `${stats.withOwner} (${((stats.withOwner / stats.totalVehicles) * 100).toFixed(1)}%)`,
    'Expired MOT': `${stats.expiredMOT} (${stats.withMOT ? ((stats.expiredMOT / stats.withMOT) * 100).toFixed(1) : 0}% of MOTs)`,
    'Expiring Soon (MOT)': `${stats.expiringSoonMOT} (${stats.withMOT ? ((stats.expiringSoonMOT / stats.withMOT) * 100).toFixed(1) : 0}% of MOTs)`,
    'Expired Tax': `${stats.expiredTax} (${stats.withTax ? ((stats.expiredTax / stats.withTax) * 100).toFixed(1) : 0}% of tax)`,
    'Expiring Soon (Tax)': `${stats.expiringSoonTax} (${stats.withTax ? ((stats.expiringSoonTax / stats.withTax) * 100).toFixed(1) : 0}% of tax)`
  });
  
  // Display distributions
  if (stats.makes.size > 0) displayTop('Makes', stats.makes);
  if (stats.models.size > 0) displayTop('Models', stats.models);
  if (stats.fuelTypes.size > 0) displayTop('Fuel Types', stats.fuelTypes);
  if (stats.motStatuses.size > 0) displayTop('MOT Statuses', stats.motStatuses);
  if (stats.taxStatuses.size > 0) displayTop('Tax Statuses', stats.taxStatuses);
  
  // Display sample records
  if (stats.sampleVehicles.length > 0) {
    console.log('\n📋 Sample Vehicle Records:');
    console.table(
      stats.sampleVehicles.map(vehicle => ({
        'Registration': vehicle.registration,
        'Make': vehicle.make || 'N/A',
        'Model': vehicle.model || 'N/A',
        'Year': vehicle.year || 'N/A',
        'Color': vehicle.color || 'N/A',
        'Fuel': vehicle.fuel_type || 'N/A',
        'Engine': vehicle.engine_size || 'N/A',
        'MOT Status': vehicle.mot_status || 'N/A',
        'MOT Expiry': formatDate(vehicle.mot_expiry_date),
        'Tax Status': vehicle.tax_status || 'N/A',
        'Tax Due': formatDate(vehicle.tax_due_date),
        'Last Updated': vehicle.updated_at ? new Date(vehicle.updated_at).toLocaleString('en-GB') : 'Never'
      }))
    );
  }
  
  // Display data quality issues
  const dataQualityIssues: string[] = [];
  
  if (stats.withMake / stats.totalVehicles < 0.9) {
    dataQualityIssues.push(`⚠️  Low make completion: Only ${((stats.withMake / stats.totalVehicles) * 100).toFixed(1)}% of vehicles have make information`);
  }
  
  if (stats.withModel / stats.totalVehicles < 0.9) {
    dataQualityIssues.push(`⚠️  Low model completion: Only ${((stats.withModel / stats.totalVehicles) * 100).toFixed(1)}% of vehicles have model information`);
  }
  
  if (stats.expiredMOT > 0) {
    dataQualityIssues.push(`⚠️  ${stats.expiredMOT} vehicles have expired MOTs`);
  }
  
  if (stats.expiredTax > 0) {
    dataQualityIssues.push(`⚠️  ${stats.expiredTax} vehicles have expired tax`);
  }
  
  if (dataQualityIssues.length > 0) {
    console.log('\n🚨 Data Quality Issues:');
    dataQualityIssues.forEach(issue => console.log(`- ${issue}`));
  }
  
  console.log('\n✅ Vehicle analysis complete!');
}

async function main() {
  try {
    await analyzeVehicles();
  } catch (error) {
    console.error('Error during vehicle analysis:', error);
    process.exit(1);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

// Run the analysis
main().catch(console.error);
