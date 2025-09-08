import { sql } from '../lib/database/neon-client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkMOTData() {
  try {
    console.log('Fetching MOT data from database...');
    
    // Get vehicle count
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log(`\nTotal vehicles in database: ${vehicleCount[0].count}`);
    
    // Get vehicles with MOT data
    const vehiclesWithMOT = await sql`
      SELECT 
        registration, 
        make, 
        model, 
        mot_status,
        mot_expiry_date,
        mot_last_checked,
        mot_test_number
      FROM vehicles 
      WHERE mot_status IS NOT NULL
      ORDER BY mot_expiry_date DESC
    `;
    
    console.log(`\nVehicles with MOT data (${vehiclesWithMOT.length}):`);
    console.table(vehiclesWithMOT);
    
    // Get MOT history count
    const motHistoryCount = await sql`SELECT COUNT(*) as count FROM mot_history`;
    console.log(`\nTotal MOT history records: ${motHistoryCount[0].count}`);
    
    // Get latest MOT history entries
    const recentMOTs = await sql`
      SELECT 
        registration,
        test_date,
        expiry_date,
        test_result,
        odometer_value,
        odometer_unit,
        test_number
      FROM mot_history 
      ORDER BY test_date DESC 
      LIMIT 10
    `;
    
    console.log('\nRecent MOT history:');
    console.table(recentMOTs);
    
  } catch (error) {
    console.error('Error checking MOT data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkMOTData();
