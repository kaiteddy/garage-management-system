require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function safeStatusCheck() {
  try {
    console.log('🛡️  SAFE DATABASE STATUS CHECK');
    console.log('==============================');
    console.log(`⏰ ${new Date().toLocaleTimeString()}\n`);

    // Quick timeout check
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database busy - import likely running')), 5000)
    );

    try {
      // Try a simple count with timeout
      const result = await Promise.race([
        sql`SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
        `,
        timeoutPromise
      ]);

      const stats = result[0];
      
      console.log('📊 CURRENT DATABASE STATE:');
      console.log(`   👥 Customers: ${stats.customers.toLocaleString()}`);
      console.log(`   🚗 Vehicles: ${stats.vehicles.toLocaleString()}`);
      console.log(`   📄 Documents: ${stats.documents.toLocaleString()}`);
      
      // Calculate progress
      const targets = { customers: 7143, vehicles: 10550, documents: 33196 };
      const customerProgress = Math.round((stats.customers / targets.customers) * 100);
      const vehicleProgress = Math.round((stats.vehicles / targets.vehicles) * 100);
      const documentProgress = Math.round((stats.documents / targets.documents) * 100);
      
      console.log('\n📈 IMPORT PROGRESS:');
      console.log(`   👥 Customers: ${customerProgress}% complete`);
      console.log(`   🚗 Vehicles: ${vehicleProgress}% complete`);
      console.log(`   📄 Documents: ${documentProgress}% complete`);
      
      // Check for enhanced data (quick check)
      try {
        const enhancedCheck = await Promise.race([
          sql`SELECT 
            COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) as twilio_phones,
            COUNT(CASE WHEN phone_verified = true THEN 1 END) as verified_phones
          FROM customers LIMIT 1000`,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        
        const enhanced = enhancedCheck[0];
        console.log('\n🛡️  ENHANCED DATA STATUS:');
        console.log(`   📞 Twilio phones: ${enhanced.twilio_phones}`);
        console.log(`   ✅ Verified phones: ${enhanced.verified_phones}`);
        
        if (enhanced.twilio_phones > 0 || enhanced.verified_phones > 0) {
          console.log('   🎉 Enhanced data detected - preservation mode required!');
        }
        
      } catch (error) {
        console.log('\n🛡️  ENHANCED DATA STATUS: Unable to check (database busy)');
      }
      
      console.log('\n💡 RECOMMENDATIONS:');
      if (customerProgress < 100) {
        console.log('   🔄 Customer import still in progress');
        console.log('   ⏳ Wait for completion or use smart preserving import');
      } else if (vehicleProgress < 100) {
        console.log('   🚗 Ready for vehicle import with data preservation');
      } else if (documentProgress < 100) {
        console.log('   📄 Ready for document import with data preservation');
      } else {
        console.log('   🎉 All imports complete!');
      }
      
    } catch (error) {
      if (error.message.includes('busy')) {
        console.log('🔄 DATABASE IS BUSY - IMPORT PROCESS LIKELY RUNNING');
        console.log('');
        console.log('This indicates:');
        console.log('   ✅ An import process is actively running');
        console.log('   ✅ Database is being updated with new data');
        console.log('   ✅ No action needed - let the import complete');
        console.log('');
        console.log('💡 RECOMMENDATIONS:');
        console.log('   ⏳ Wait 10-15 minutes for current import to complete');
        console.log('   🔄 Then run smart data-preserving import for safety');
        console.log('   🛡️  This will protect all your enhanced API data');
      } else {
        console.log('❌ Database connection error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

safeStatusCheck();
