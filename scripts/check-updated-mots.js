import { sql } from '../lib/database/neon-client.js';

async function checkUpdatedMOTs() {
  try {
    // Get the latest 10 updated vehicles with MOT info
    const result = await sql`
      SELECT 
        registration, 
        mot_status, 
        mot_expiry_date, 
        updated_at 
      FROM vehicles 
      WHERE updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY updated_at DESC 
      LIMIT 10;
    `;

    console.log('Recently updated MOT records:');
    if (result.rows.length === 0) {
      console.log('No vehicles have been updated in the last hour.');
    } else {
      console.table(result.rows);
    }
  } catch (error) {
    console.error('Error checking updated MOTs:', error);
  } finally {
    process.exit(0);
  }
}

checkUpdatedMOTs();
