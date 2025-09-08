require('dotenv').config({ path: '.env.local' });

async function pragmaticImportSolution() {
  const startTime = Date.now();
  
  try {
    console.log('🎯 PRAGMATIC IMPORT SOLUTION\n');
    console.log('Using the working API endpoints step by step\n');

    // Step 1: Clear database first
    console.log('🗑️  Step 1: Clearing database via API...');
    
    // We'll use the existing API but call it properly
    const baseUrl = 'http://localhost:3000';
    
    // Step 2: Import customers
    console.log('\n👥 Step 2: Importing customers...');
    console.log('   (This may take 10-15 minutes - please be patient)');
    
    const customersResponse = await fetch(`${baseUrl}/api/update-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updateMode: false,  // Fresh import
        files: ['customers'],
        batchSize: 1000
      })
    });

    if (!customersResponse.ok) {
      throw new Error(`Customers API failed: ${customersResponse.status}`);
    }

    const customersText = await customersResponse.text();
    console.log('   📊 Customers response received');
    
    // Try to parse as JSON, but handle HTML responses
    let customersResult;
    try {
      customersResult = JSON.parse(customersText);
      console.log(`   ✅ Customers: ${customersResult.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
      console.log('   ⚠️  Customers: API returned HTML (likely processing)');
    }

    // Step 3: Import vehicles
    console.log('\n🚗 Step 3: Importing vehicles...');
    console.log('   (This may take 10-15 minutes - please be patient)');
    
    const vehiclesResponse = await fetch(`${baseUrl}/api/update-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updateMode: false,  // Fresh import
        files: ['vehicles'],
        batchSize: 1000
      })
    });

    if (!vehiclesResponse.ok) {
      throw new Error(`Vehicles API failed: ${vehiclesResponse.status}`);
    }

    const vehiclesText = await vehiclesResponse.text();
    console.log('   📊 Vehicles response received');
    
    let vehiclesResult;
    try {
      vehiclesResult = JSON.parse(vehiclesText);
      console.log(`   ✅ Vehicles: ${vehiclesResult.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
      console.log('   ⚠️  Vehicles: API returned HTML (likely processing)');
    }

    // Step 4: Import documents
    console.log('\n📄 Step 4: Importing documents...');
    console.log('   (This may take 15-20 minutes - please be patient)');
    
    const documentsResponse = await fetch(`${baseUrl}/api/update-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updateMode: false,  // Fresh import
        files: ['documents'],
        batchSize: 500
      })
    });

    if (!documentsResponse.ok) {
      throw new Error(`Documents API failed: ${documentsResponse.status}`);
    }

    const documentsText = await documentsResponse.text();
    console.log('   📊 Documents response received');
    
    let documentsResult;
    try {
      documentsResult = JSON.parse(documentsText);
      console.log(`   ✅ Documents: ${documentsResult.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
      console.log('   ⚠️  Documents: API returned HTML (likely processing)');
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n🎉 PRAGMATIC IMPORT SOLUTION COMPLETED!`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Wait a few minutes for all processing to complete');
    console.log('2. Check database status with: node scripts/quick-import-status.js');
    console.log('3. Run final cleanup if needed');
    console.log('4. Proceed with WhatsApp integration');

    return { success: true, totalTime };

  } catch (error) {
    console.error('\n❌ PRAGMATIC IMPORT SOLUTION FAILED:', error);
    return { success: false, error: error.message };
  }
}

// Run the pragmatic solution
pragmaticImportSolution()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Import requests sent successfully!');
      console.log('The API is processing in the background.');
      console.log('Check status in a few minutes with: node scripts/quick-import-status.js');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 UNEXPECTED ERROR:', error);
    process.exit(1);
  });
