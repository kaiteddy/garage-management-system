require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('⚡ TURBO IMPORT - MAXIMUM SPEED');
console.log('===============================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function turboImport() {
  try {
    // 1. CONNECT
    console.log('1️⃣ CONNECTING...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 20000,
      queryTimeoutMillis: 60000
    });
    
    const test = await sql`SELECT NOW() as time`;
    console.log('   ✅ CONNECTED!');
    console.log('');
    
    // 2. CHECK CURRENT STATE
    console.log('2️⃣ CURRENT STATE...');
    const currentVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log('   🚗 Current vehicles:', currentVehicles[0].count);
    console.log('');
    
    // 3. TURBO PROCESS VEHICLES
    console.log('3️⃣ TURBO PROCESSING VEHICLES...');
    const dataDir = path.join(__dirname, 'data');
    const vehicleFile = path.join(dataDir, 'vehicles.csv');
    
    if (!fs.existsSync(vehicleFile)) {
      throw new Error('vehicles.csv not found');
    }
    
    const content = fs.readFileSync(vehicleFile, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const records = parsed.data.filter(r => r.registration || r.Registration);
    
    console.log(`   📋 Found ${records.length} valid vehicle records`);
    console.log('   🚀 Starting TURBO processing...');
    
    const startTime = Date.now();
    let processed = 0;
    const batchSize = 200; // LARGER BATCHES for speed
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        // Build bulk insert query
        const values = [];
        const params = [];
        let paramIndex = 1;
        
        for (const record of batch) {
          const reg = (record.registration || record.Registration || '').trim().toUpperCase();
          const make = record.make || record.Make || 'Unknown';
          const model = record.model || record.Model || 'Unknown';
          const year = record.year || record.Year || null;
          
          if (reg) {
            values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, NOW())`);
            params.push(reg, make, model, year);
            paramIndex += 4;
          }
        }
        
        if (values.length > 0) {
          const query = `
            INSERT INTO vehicles (registration, make, model, year, created_at)
            VALUES ${values.join(', ')}
            ON CONFLICT (registration) DO UPDATE SET
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              updated_at = NOW()
          `;
          
          await sql.unsafe(query, params);
          processed += values.length;
        }
        
        // Progress update every 1000 records
        if (processed % 1000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = Math.round(processed / elapsed);
          console.log(`   ⚡ ${processed}/${records.length} processed (${rate} rec/sec)`);
        }
        
      } catch (error) {
        console.log(`   ⚠️  Batch error at ${i}:`, error.message);
        // Continue with next batch
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ VEHICLES COMPLETE: ${processed} in ${totalTime}s`);
    console.log('');
    
    // 4. VERIFY RESULTS
    console.log('4️⃣ VERIFYING...');
    const finalVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const increase = finalVehicles[0].count - currentVehicles[0].count;
    
    console.log('   🚗 Final vehicles:', finalVehicles[0].count, `(+${increase})`);
    console.log('');
    
    console.log('🎉 TURBO IMPORT COMPLETE!');
    console.log('=========================');
    console.log('⏱️  Total time:', totalTime, 'seconds');
    console.log('📊 Records processed:', processed);
    console.log('🚀 Average speed:', Math.round(processed / totalTime), 'records/second');
    console.log('');
    console.log('✅ VEHICLES IMPORTED SUCCESSFULLY!');
    
    // 5. QUICK SAMPLE CHECK
    console.log('');
    console.log('📋 SAMPLE VEHICLES:');
    const sample = await sql`SELECT registration, make, model, year FROM vehicles LIMIT 5`;
    sample.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.registration} - ${v.make} ${v.model} (${v.year || 'N/A'})`);
    });
    
  } catch (error) {
    console.log('❌ TURBO IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

turboImport();
