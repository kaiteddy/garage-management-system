import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

async function getVehicleRegistrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('Fetching vehicle registrations from database...');
    const result = await client.query<{registration: string}>(
      'SELECT registration FROM vehicles ORDER BY registration'
    );
    
    const registrations = result.rows.map(row => row.registration);
    console.log(`Found ${registrations.length} vehicle registrations`);
    
    // Save to a file
    const outputPath = join(__dirname, '../data/vehicle_registrations.txt');
    fs.writeFileSync(outputPath, registrations.join('\n'), 'utf-8');
    console.log(`Saved registrations to ${outputPath}`);
    
    return registrations;
  } catch (error) {
    console.error('Error fetching vehicle registrations:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  getVehicleRegistrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { getVehicleRegistrations };
