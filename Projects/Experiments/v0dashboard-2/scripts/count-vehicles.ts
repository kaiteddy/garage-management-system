import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Then import database modules
const { sql } = await import('../lib/database/neon-client.js');

async function countVehicles() {
  try {
    console.log('🔍 Counting vehicles in the database...');
    
    // Count total vehicles
    const totalResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const totalCount = totalResult[0]?.count || 0;
    
    // Count vehicles with valid MOTs
    const withMOTResult = await sql`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL 
      AND mot_expiry_date > CURRENT_DATE
    `;
    const withMOTCount = withMOTResult[0]?.count || 0;
    
    // Count vehicles with expired MOTs
    const expiredMOTResult = await sql`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL 
      AND mot_expiry_date <= CURRENT_DATE
    `;
    const expiredMOTCount = expiredMOTResult[0]?.count || 0;
    
    console.log('\n📊 Vehicle Statistics:');
    console.log('----------------------');
    console.log(`🚗 Total Vehicles: ${totalCount}`);
    console.log(`✅ With Valid MOT: ${withMOTCount} (${totalCount > 0 ? Math.round((withMOTCount / totalCount) * 100) : 0}%)`);
    console.log(`❌ Expired MOT: ${expiredMOTCount} (${totalCount > 0 ? Math.round((expiredMOTCount / totalCount) * 100) : 0}%)`);
    
    return {
      total: totalCount,
      withValidMOT: withMOTCount,
      withExpiredMOT: expiredMOTCount
    };
  } catch (error) {
    console.error('❌ Error counting vehicles:', error);
    throw error;
  }
}

// Run the function
countVehicles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
