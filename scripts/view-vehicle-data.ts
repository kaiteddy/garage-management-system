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

interface VehicleStats {
  totalVehicles: number;
  withMake: number;
  withModel: number;
  withMOT: number;
  withTax: number;
  withOwner: number;
  expiredMOT: number;
  expiredTax: number;
  expiringSoonMOT: number;
  expiringSoonTax: number;
  makes: Map<string, number>;
  models: Map<string, number>;
  fuelTypes: Map<string, number>;
  sampleVehicles: VehicleRecord[];
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
    console.log(`Fetching vehicles ${offset + 1} to ${offset + limit}...`);
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
      WHERE registration IS NOT NULL
        AND registration != ''
      ORDER BY updated_at DESC NULLS LAST, registration
      LIMIT $1;
    `;

    const result = await client.query<VehicleRecord>(query, [limit]);
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

function maskSensitiveData(text: string | null): string {
  if (!text) return 'N/A';
  
  // Mask email addresses
  if (text.includes('@')) {
    const [user, domain] = text.split('@');
    const maskedUser = user.length > 2 
      ? user.substring(0, 2) + '*'.repeat(user.length - 2)
      : '*'.repeat(user.length);
    return `${maskedUser}@${domain}`;
  }
  
  // Mask phone numbers
  if (/^[0-9\s\-+()]+$/.test(text)) {
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `${digits.substring(0, 2)}****${digits.slice(-2)}`;
    }
    return '****';
  }
  
  // Mask names (only show first letter of first name and last initial)
  if (text.trim().includes(' ')) {
    const [first, ...rest] = text.trim().split(' ');
    const lastName = rest[rest.length - 1] || '';
    return `${first.charAt(0)}. ${lastName.charAt(0)}.`;
  }
  
  // For other text, show first 2 characters and mask the rest
  return text.length > 2 
    ? text.substring(0, 2) + '*'.repeat(text.length - 2)
    : '*'.repeat(text.length);
}

async function processAllVehicles() {
  console.log('Starting full database scan...\n');
  
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
    sampleVehicles: []
  };

  const totalVehicles = await getTotalVehiclesCount();
  stats.totalVehicles = totalVehicles;
  console.log(`Found ${totalVehicles} vehicles in the database`);

  const batchSize = 100;
  let offset = 0;
  let processed = 0;

  while (processed < totalVehicles) {
    const vehicles = await getVehicles(batchSize, offset);
    if (vehicles.length === 0) break;

    for (const vehicle of vehicles) {
      // Process vehicle data
      if (vehicle.make) stats.withMake++;
      if (vehicle.model) stats.withModel++;
      if (vehicle.mot_status) stats.withMOT++;
      if (vehicle.tax_status) stats.withTax++;
      if (vehicle.owner_id) stats.withOwner++;

      // Track makes and models
      if (vehicle.make) {
        stats.makes.set(vehicle.make, (stats.makes.get(vehicle.make) || 0) + 1);
      }
      if (vehicle.model) {
        stats.models.set(vehicle.model, (stats.models.get(vehicle.model) || 0) + 1);
      }
      if (vehicle.fuel_type) {
        stats.fuelTypes.set(vehicle.fuel_type, (stats.fuelTypes.get(vehicle.fuel_type) || 0) + 1);
      }

      // Track expired/expiring MOTs and tax
      if (vehicle.mot_expiry_date) {
        const expiryDate = new Date(vehicle.mot_expiry_date);
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (expiryDate < today) {
          stats.expiredMOT++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          stats.expiringSoonMOT++;
        }
      }

      if (vehicle.tax_due_date) {
        const dueDate = new Date(vehicle.tax_due_date);
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (dueDate < today) {
          stats.expiredTax++;
        } else if (dueDate <= thirtyDaysFromNow) {
          stats.expiringSoonTax++;
        }
      }

      // Add to sample vehicles if we don't have enough yet
      if (stats.sampleVehicles.length < 5) {
        stats.sampleVehicles.push(vehicle);
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} of ${totalVehicles} vehicles...`);
      }
    }

    offset += batchSize;
  }

  return stats;
}

async function main() {
  try {
    const stats = await processAllVehicles();
    
    // Display summary
    console.log('\n\n=== Database Analysis Complete ===\n');
    
    // Display summary statistics
    console.log('📊 Summary Statistics:');
    console.table({
      'Total Vehicles': stats.totalVehicles,
      'With Make': `${stats.withMake} (${((stats.withMake / stats.totalVehicles) * 100).toFixed(1)}%)`,
      'With Model': `${stats.withModel} (${((stats.withModel / stats.totalVehicles) * 100).toFixed(1)}%)`,
      'With MOT': `${stats.withMOT} (${((stats.withMOT / stats.totalVehicles) * 100).toFixed(1)}%)`,
      'With Tax': `${stats.withTax} (${((stats.withTax / stats.totalVehicles) * 100).toFixed(1)}%)`,
      'With Owner': `${stats.withOwner} (${((stats.withOwner / stats.totalVehicles) * 100).toFixed(1)}%)`,
      'Expired MOT': `${stats.expiredMOT} (${((stats.expiredMOT / stats.withMOT) * 100).toFixed(1)}% of MOTs)`,
      'Expiring Soon (MOT)': `${stats.expiringSoonMOT} (${((stats.expiringSoonMOT / stats.withMOT) * 100).toFixed(1)}% of MOTs)`,
      'Expired Tax': `${stats.expiredTax} (${((stats.expiredTax / stats.withTax) * 100).toFixed(1)}% of tax)`,
      'Expiring Soon (Tax)': `${stats.expiringSoonTax} (${((stats.expiringSoonTax / stats.withTax) * 100).toFixed(1)}% of tax)`
    });

    // Display top makes and models
    if (stats.makes.size > 0) {
      const displayTop = (title: string, map: Map<string, number>, limit: number = 5) => {
        const sorted = Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit);
        
        const total = Array.from(map.values()).reduce((sum, count) => sum + count, 0);
        
        console.log(`\n🏆 Top ${limit} ${title}:`);
        console.table(
          sorted.map(([name, count]) => ({
            [title]: name,
            'Count': count,
            'Percentage': `${((count / total) * 100).toFixed(1)}%`
          }))
        );
      };

      displayTop('Makes', stats.makes);
      displayTop('Models', stats.models);
      displayTop('Fuel Types', stats.fuelTypes);
    }

    // Display sample vehicles
    if (stats.sampleVehicles.length > 0) {
      console.log('\n🚗 Sample Vehicles:');
      console.table(
        stats.sampleVehicles.map(vehicle => ({
          Registration: vehicle.registration,
          Make: vehicle.make || 'N/A',
          Model: vehicle.model || 'N/A',
          Year: vehicle.year || 'N/A',
          'MOT Status': vehicle.mot_status || 'N/A',
          'MOT Expiry': vehicle.mot_expiry_date ? formatDate(vehicle.mot_expiry_date) : 'N/A',
          'Tax Status': vehicle.tax_status || 'N/A',
          'Tax Due': vehicle.tax_due_date ? formatDate(vehicle.tax_due_date) : 'N/A'
        }))
      );
    }

    // Check for data quality issues
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

    console.log('\n✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
    console.error('Error processing vehicle data:', error);
  } finally {
    await dbPool.end();
  }
}

// Run the analysis
main().catch(console.error);
