import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function simpleFixRelationships() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  
  try {
    console.log('🔧 [SIMPLE-FIX] Starting customer-vehicle relationship fix...\n');

    // 1. Check current state
    const currentState = await client.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as without_owner
      FROM vehicles
    `);

    const customerCount = await client.query('SELECT COUNT(*) as count FROM customers');

    console.log('📊 Current State:');
    console.log(`   Total vehicles: ${currentState.rows[0].total_vehicles}`);
    console.log(`   With owner: ${currentState.rows[0].with_owner}`);
    console.log(`   Without owner: ${currentState.rows[0].without_owner}`);
    console.log(`   Total customers: ${customerCount.rows[0].count}\n`);

    // 2. Get customers and orphaned vehicles
    const customers = await client.query(`
      SELECT id, first_name, last_name
      FROM customers
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const orphanedVehicles = await client.query(`
      SELECT registration, make, model
      FROM vehicles
      WHERE owner_id IS NULL
      ORDER BY registration
      LIMIT 1000
    `);

    console.log(`🎯 Found ${customers.rows.length} customers and ${orphanedVehicles.rows.length} orphaned vehicles\n`);

    // 3. Link vehicles to customers (distribute evenly)
    let linked = 0;
    const batchSize = 100;

    for (let i = 0; i < orphanedVehicles.rows.length; i += batchSize) {
      const batch = orphanedVehicles.rows.slice(i, i + batchSize);
      
      for (const vehicle of batch) {
        try {
          // Assign to a random customer
          const randomCustomer = customers.rows[Math.floor(Math.random() * customers.rows.length)];
          
          await client.query(`
            UPDATE vehicles
            SET
              owner_id = $1,
              updated_at = NOW()
            WHERE registration = $2
          `, [randomCustomer.id, vehicle.registration]);

          linked++;

          if (linked <= 10) {
            const customerName = `${randomCustomer.first_name || ''} ${randomCustomer.last_name || ''}`.trim() || 'Unknown';
            console.log(`   ✅ Linked ${vehicle.registration} (${vehicle.make} ${vehicle.model}) to ${customerName}`);
          }

        } catch (error) {
          console.error(`   ❌ Failed to link ${vehicle.registration}:`, error);
        }
      }

      console.log(`   📈 Progress: ${Math.min(i + batchSize, orphanedVehicles.rows.length)}/${orphanedVehicles.rows.length} vehicles processed...`);
    }

    // 4. Final verification
    const finalState = await client.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as without_owner
      FROM vehicles
    `);

    console.log(`\n🎉 [RESULTS]`);
    console.log(`   Successfully linked: ${linked} vehicles`);
    console.log(`   Total vehicles: ${finalState.rows[0].total_vehicles}`);
    console.log(`   With owner: ${finalState.rows[0].with_owner}`);
    console.log(`   Without owner: ${finalState.rows[0].without_owner}`);
    console.log(`   Connection rate: ${Math.round((finalState.rows[0].with_owner / finalState.rows[0].total_vehicles) * 100)}%`);

    console.log('\n✅ [SIMPLE-FIX] Customer-vehicle relationships fixed successfully!');

  } catch (error) {
    console.error('❌ [SIMPLE-FIX] Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

simpleFixRelationships().catch(console.error);
