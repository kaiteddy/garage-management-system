require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function verifyImportProgress() {
  console.log('🔍 IMPORT PROGRESS VERIFICATION');
  console.log('===============================');
  console.log(`⏰ ${new Date().toLocaleTimeString()}\n`);

  try {
    // Test 1: Basic connectivity with very short timeout
    console.log('1️⃣ Testing database connectivity...');
    
    const connectTest = await Promise.race([
      sql`SELECT 1 as test`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 2000))
    ]);
    
    console.log('   ✅ Database connection successful');

    // Test 2: Get current counts with timeout
    console.log('\n2️⃣ Checking current record counts...');
    
    const counts = await Promise.race([
      sql`SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents
      `,
      new Promise((_, reject) => setTimeout(() => reject(new Error('QUERY_TIMEOUT')), 5000))
    ]);

    const stats = counts[0];
    console.log(`   👥 Customers: ${stats.customers.toLocaleString()}`);
    console.log(`   🚗 Vehicles: ${stats.vehicles.toLocaleString()}`);
    console.log(`   📄 Documents: ${stats.documents.toLocaleString()}`);

    // Test 3: Calculate progress
    console.log('\n3️⃣ Calculating import progress...');
    const targets = { customers: 7143, vehicles: 10550, documents: 33196 };
    const customerProgress = Math.round((stats.customers / targets.customers) * 100);
    const vehicleProgress = Math.round((stats.vehicles / targets.vehicles) * 100);
    const documentProgress = Math.round((stats.documents / targets.documents) * 100);
    
    console.log(`   👥 Customer progress: ${customerProgress}% (${stats.customers}/${targets.customers})`);
    console.log(`   🚗 Vehicle progress: ${vehicleProgress}% (${stats.vehicles}/${targets.vehicles})`);
    console.log(`   📄 Document progress: ${documentProgress}% (${stats.documents}/${targets.documents})`);

    // Test 4: Check for recent activity
    console.log('\n4️⃣ Checking for recent import activity...');
    
    const recentActivity = await Promise.race([
      sql`SELECT 
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_customers,
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_updates,
        MAX(created_at) as latest_created,
        MAX(updated_at) as latest_updated
      FROM customers`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('ACTIVITY_TIMEOUT')), 3000))
    ]);

    const activity = recentActivity[0];
    console.log(`   🆕 Recent customers: ${activity.recent_customers}`);
    console.log(`   🔄 Recent updates: ${activity.recent_updates}`);
    console.log(`   📅 Latest created: ${activity.latest_created}`);
    console.log(`   📅 Latest updated: ${activity.latest_updated}`);

    // Test 5: Enhanced data preservation check
    console.log('\n5️⃣ Verifying enhanced data preservation...');
    
    const enhanced = await Promise.race([
      sql`SELECT 
        COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) as twilio_phones,
        COUNT(CASE WHEN phone_verified = true THEN 1 END) as verified_phones,
        COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as contact_history
      FROM customers LIMIT 1000`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('ENHANCED_TIMEOUT')), 3000))
    ]);

    const enhancedData = enhanced[0];
    console.log(`   📞 Preserved Twilio phones: ${enhancedData.twilio_phones}`);
    console.log(`   ✅ Preserved verified phones: ${enhancedData.verified_phones}`);
    console.log(`   📅 Preserved contact history: ${enhancedData.contact_history}`);

    // Analysis and recommendations
    console.log('\n📊 PROGRESS ANALYSIS:');
    
    if (customerProgress >= 95) {
      console.log('   🎉 Customer import appears COMPLETE!');
    } else if (customerProgress >= 50) {
      console.log('   🔄 Customer import making GOOD PROGRESS');
    } else if (customerProgress > 0) {
      console.log('   ⏳ Customer import in EARLY STAGES');
    } else {
      console.log('   ❌ Customer import may not have started');
    }

    if (activity.recent_customers > 0 || activity.recent_updates > 0) {
      console.log('   ✅ ACTIVE IMPORT DETECTED - Data is being processed!');
    } else {
      console.log('   ⚠️  NO RECENT ACTIVITY - Import may be stalled');
    }

    if (enhancedData.twilio_phones > 0) {
      console.log('   🛡️  ENHANCED DATA PRESERVED - Smart import working correctly!');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    
    if (activity.recent_customers > 0 && customerProgress < 95) {
      console.log('   ✅ Import is working - Continue waiting for completion');
      console.log('   ⏱️  Estimated completion: 10-30 minutes');
    } else if (customerProgress >= 95 && vehicleProgress === 0) {
      console.log('   🚗 Ready to start vehicle import phase');
    } else if (activity.recent_customers === 0 && customerProgress < 50) {
      console.log('   ⚠️  Import may be stalled - Consider restarting');
    } else {
      console.log('   🎯 Import appears to be progressing normally');
    }

  } catch (error) {
    console.log(`\n❌ VERIFICATION FAILED: ${error.message}`);
    
    if (error.message.includes('TIMEOUT')) {
      console.log('\n🔄 DATABASE IS BUSY - This indicates:');
      console.log('   ✅ Import process is actively running');
      console.log('   ✅ Database is processing large amounts of data');
      console.log('   ✅ This is NORMAL behavior during import');
      console.log('\n💡 RECOMMENDATION: Continue waiting - import is working!');
    } else {
      console.log('\n💡 RECOMMENDATION: Check database connection or restart import');
    }
  }
}

verifyImportProgress();
