require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function findNatanielRealVehicle() {
  try {
    console.log('🔍 Finding NATANIEL\'s REAL vehicle...\n');

    // 1. Search documents for NATANIEL by name and phone
    const natanielDocs = await sql`
      SELECT DISTINCT
        d.vehicle_registration,
        d.customer_name,
        d.doc_type,
        d.doc_date_issued,
        d._id_customer,
        c.first_name,
        c.last_name,
        c.phone
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d.customer_name ILIKE '%nataniel%'
         OR c.first_name ILIKE '%nataniel%'
         OR c.phone = '07894902066'
      ORDER BY d.doc_date_issued DESC
      LIMIT 10
    `;
    
    console.log('Documents for NATANIEL:');
    if (natanielDocs.length === 0) {
      console.log('❌ No documents found for NATANIEL');
    } else {
      natanielDocs.forEach(doc => {
        console.log(`  - ${doc.vehicle_registration}: ${doc.customer_name} (${doc.doc_type}) - ${doc.doc_date_issued}`);
      });
    }

    // 2. Check if any of the 22 assigned vehicles actually have service records for OTHER customers
    console.log('\n2. Checking if assigned vehicles belong to OTHER customers:\n');
    
    const assignedVehicles = await sql`
      SELECT registration, make, model
      FROM vehicles 
      WHERE owner_id = '1FA093E387AEF549A5B64117154DA223'
      ORDER BY registration
      LIMIT 5
    `;
    
    for (const vehicle of assignedVehicles) {
      const realOwners = await sql`
        SELECT DISTINCT
          d.customer_name,
          c.first_name,
          c.last_name,
          c.phone,
          COUNT(*) as service_count
        FROM documents d
        LEFT JOIN customers c ON d._id_customer = c.id
        WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(${vehicle.registration}, ' ', ''))
        GROUP BY d.customer_name, c.first_name, c.last_name, c.phone
        ORDER BY COUNT(*) DESC
      `;
      
      console.log(`${vehicle.registration} (${vehicle.make || 'Unknown'} ${vehicle.model || ''})`);
      if (realOwners.length > 0) {
        console.log('  REAL owner(s) from service records:');
        realOwners.forEach(owner => {
          const name = owner.first_name ? `${owner.first_name} ${owner.last_name}` : owner.customer_name;
          console.log(`    - ${name} (${owner.service_count} services) - Phone: ${owner.phone || 'N/A'}`);
        });
      } else {
        console.log('  ❌ No service records (orphaned vehicle)');
      }
      console.log('');
    }

    // 3. Find vehicles that should be unassigned (orphaned)
    console.log('3. Summary of incorrectly assigned vehicles:\n');
    
    const orphanedCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      WHERE v.owner_id = '1FA093E387AEF549A5B64117154DA223'
        AND NOT EXISTS (
          SELECT 1 FROM documents d 
          WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
        )
    `;
    
    console.log(`${orphanedCount[0].count} vehicles assigned to NATANIEL have NO service records at all`);
    console.log('These should be unassigned or reassigned to correct owners');

    // 4. Recommendation
    console.log('\n📋 RECOMMENDATION:');
    console.log('1. Remove all 22 vehicles from NATANIEL (set owner_id = NULL)');
    console.log('2. Only assign vehicles that have actual service records with his phone number');
    console.log('3. Re-run vehicle-customer matching based on service history');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findNatanielRealVehicle();
