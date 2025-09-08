import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

console.log('🔍 TESTING VEHICLE LOOKUP INTEGRATION');
console.log('====================================');

async function testVehicleLookup() {
  const registration = 'LN64XFG';
  
  try {
    console.log(`📊 Testing vehicle lookup for: ${registration}`);
    
    // 1. Test DVLA API
    console.log('\n🔍 STEP 1: Test DVLA API');
    const dvlaResponse = await fetch('http://localhost:3001/api/dvla-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration })
    });
    
    let dvlaData = null;
    if (dvlaResponse.ok) {
      const dvlaResult = await dvlaResponse.json();
      dvlaData = dvlaResult.data;
      console.log(`  ✅ DVLA API Success:`, {
        make: dvlaData.make,
        model: dvlaData.model || 'NOT PROVIDED',
        year: dvlaData.yearOfManufacture,
        color: dvlaData.colour,
        engineCapacity: dvlaData.engineCapacity,
        fuelType: dvlaData.fuelType
      });
    } else {
      console.log(`  ❌ DVLA API Failed: ${dvlaResponse.status}`);
    }

    // 2. Test Database API
    console.log('\n📊 STEP 2: Test Database API');
    const dbResponse = await fetch(`http://localhost:3001/api/vehicles/${encodeURIComponent(registration)}`);
    
    let dbData = null;
    if (dbResponse.ok) {
      const dbResult = await dbResponse.json();
      dbData = dbResult.vehicle;
      console.log(`  ✅ Database API Success:`, {
        make: dbData.make,
        model: dbData.model,
        year: dbData.year,
        color: dbData.color,
        engineSize: dbData.engineSize,
        fuelType: dbData.fuelType,
        vin: dbData.vin
      });
    } else {
      console.log(`  ❌ Database API Failed: ${dbResponse.status}`);
    }

    // 3. Test MOT API
    console.log('\n🔍 STEP 3: Test MOT API');
    const motResponse = await fetch('http://localhost:3001/api/mot-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration })
    });
    
    let motData = null;
    if (motResponse.ok) {
      const motResult = await motResponse.json();
      motData = motResult.vehicleData;
      console.log(`  ✅ MOT API Success:`, {
        make: motData?.make || 'NOT PROVIDED',
        model: motData?.model || 'NOT PROVIDED',
        primaryColour: motData?.primaryColour || 'NOT PROVIDED',
        engineSize: motData?.engineSize || 'NOT PROVIDED',
        fuelType: motData?.fuelType || 'NOT PROVIDED'
      });
    } else {
      console.log(`  ❌ MOT API Failed: ${motResponse.status}`);
    }

    // 4. Simulate the combined logic
    console.log('\n🔄 STEP 4: Simulate Combined Logic');
    
    // Parse database model using the same logic as the form
    let databaseModel = '';
    if (dbData?.model && dbData.model.toLowerCase().includes('golf')) {
      const words = dbData.model.split(' ');
      const modelWord = words.find(word => 
        ['golf', 'polo', 'passat', 'tiguan', 'touran', 'sharan', 'arteon', 'jetta'].includes(word.toLowerCase())
      );
      databaseModel = modelWord || '';
    }
    
    const combinedData = {
      make: dvlaData?.make || motData?.make || dbData?.make || '',
      model: dvlaData?.model || databaseModel || motData?.model || '',
      year: dvlaData?.yearOfManufacture || (motData?.manufactureDate ? new Date(motData.manufactureDate).getFullYear() : null) || dbData?.year,
      color: dvlaData?.colour || motData?.primaryColour || dbData?.color || '',
      engineCapacity: dvlaData?.engineCapacity || (motData?.engineSize ? parseInt(motData.engineSize) : null) || dbData?.engineSize,
      fuelType: dvlaData?.fuelType || motData?.fuelType || dbData?.fuelType || '',
      motStatus: dvlaData?.motStatus || 'Unknown',
      taxStatus: dvlaData?.taxStatus || 'Unknown'
    };

    console.log(`  🎯 Combined Result:`, combinedData);

    // 5. Test results
    console.log('\n🎯 TEST RESULTS:');
    console.log('================');
    
    if (combinedData.make && combinedData.make !== 'N/A') {
      console.log(`✅ MAKE: ${combinedData.make} (from ${dvlaData?.make ? 'DVLA' : motData?.make ? 'MOT' : 'Database'})`);
    } else {
      console.log(`❌ MAKE: Missing or N/A`);
    }
    
    if (combinedData.model && combinedData.model !== 'N/A') {
      console.log(`✅ MODEL: ${combinedData.model} (from ${dvlaData?.model ? 'DVLA' : databaseModel ? 'Database (parsed)' : 'MOT'})`);
    } else {
      console.log(`❌ MODEL: Missing or N/A`);
    }
    
    if (combinedData.year && combinedData.year !== 'N/A') {
      console.log(`✅ YEAR: ${combinedData.year} (from ${dvlaData?.yearOfManufacture ? 'DVLA' : motData?.manufactureDate ? 'MOT' : 'Database'})`);
    } else {
      console.log(`❌ YEAR: Missing or N/A`);
    }

    console.log('\n🎉 VEHICLE LOOKUP TEST COMPLETE!');
    console.log(`📊 The job sheet should now display: ${combinedData.year} ${combinedData.make} ${combinedData.model}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

await testVehicleLookup();
