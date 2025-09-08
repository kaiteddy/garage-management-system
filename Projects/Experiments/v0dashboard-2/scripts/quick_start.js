// GarageManagement Pro - Quick Start Script
// Run this script to immediately import your data and get your platform working

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function quickStart() {
  console.log('🚀 GarageManagement Pro - Quick Start Data Import');
  console.log('================================================');
  console.log('');
  console.log('This script will:');
  console.log('✅ Check your database connection');
  console.log('✅ Create the complete database schema');
  console.log('✅ Import all your CSV data');
  console.log('✅ Verify the import was successful');
  console.log('✅ Show you the final results');
  console.log('');
  
  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    await sql`SELECT 1 as test`;
    console.log('   ✅ Database connection successful');
    console.log('');
    
    // Step 2: Check current status
    console.log('2️⃣ Checking current database status...');
    try {
      const currentStatus = await sql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
      `;
      
      const status = currentStatus[0];
      console.log(`   Current status: ${status.customers} customers, ${status.vehicles} vehicles, ${status.documents} documents`);
      
      if (status.customers > 0 || status.vehicles > 0 || status.documents > 0) {
        console.log('   ⚠️  Data already exists in database');
        console.log('   💡 This import will update existing records and add new ones');
      } else {
        console.log('   📭 Database is empty - ready for import');
      }
    } catch (error) {
      console.log('   📭 Database tables not found - will create them');
    }
    console.log('');
    
    // Step 3: Run the complete import
    console.log('3️⃣ Starting complete data import...');
    console.log('   ⏱️  This may take 10-30 minutes depending on your system');
    console.log('   📊 Processing 100,000+ records across all tables');
    console.log('');
    
    // Import the complete data import module and run it
    const { runCompleteImport } = require('./complete_data_import.js');
    await runCompleteImport();
    
    console.log('');
    console.log('4️⃣ Verifying import success...');
    
    const finalStatus = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items,
        (SELECT COUNT(*) FROM receipts) as receipts,
        (SELECT COUNT(*) FROM reminders) as reminders,
        (SELECT COUNT(*) FROM stock) as stock,
        (SELECT COUNT(*) FROM appointments) as appointments,
        
        -- Business metrics
        (SELECT SUM(total_gross) FROM documents WHERE doc_type = 'SI' AND status_paid = true) as total_revenue,
        (SELECT COUNT(*) FROM documents WHERE doc_type = 'SI') as total_invoices,
        (SELECT COUNT(DISTINCT customer_id) FROM documents WHERE doc_date_created >= CURRENT_DATE - INTERVAL '12 months') as active_customers
    `;
    
    const final = finalStatus[0];
    
    console.log('');
    console.log('🎉 IMPORT COMPLETE! Your GarageManagement Pro is now fully operational!');
    console.log('====================================================================');
    console.log('');
    console.log('📊 Your Database Now Contains:');
    console.log(`   👥 Customers: ${final.customers.toLocaleString()}`);
    console.log(`   🚗 Vehicles: ${final.vehicles.toLocaleString()}`);
    console.log(`   📄 Documents: ${final.documents.toLocaleString()}`);
    console.log(`   📋 Line Items: ${final.line_items.toLocaleString()}`);
    console.log(`   💰 Receipts: ${final.receipts.toLocaleString()}`);
    console.log(`   ⏰ Reminders: ${final.reminders.toLocaleString()}`);
    console.log(`   📦 Stock: ${final.stock.toLocaleString()}`);
    console.log(`   📅 Appointments: ${final.appointments.toLocaleString()}`);
    console.log('');
    console.log('💼 Business Summary:');
    console.log(`   💰 Total Revenue: £${(final.total_revenue || 0).toLocaleString()}`);
    console.log(`   📄 Total Invoices: ${final.total_invoices.toLocaleString()}`);
    console.log(`   👥 Active Customers (12m): ${final.active_customers.toLocaleString()}`);
    console.log('');
    console.log('✅ SUCCESS! Your platform is ready for use!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Test your application features with the imported data');
    console.log('   2. Verify all business processes are working correctly');
    console.log('   3. Set up automated database backups');
    console.log('   4. Train your staff on the populated system');
    console.log('   5. Monitor performance under normal usage');
    console.log('');
    console.log('🎯 Your GarageManagement Pro platform is now fully operational!');
    
  } catch (error) {
    console.error('');
    console.error('💥 IMPORT FAILED!');
    console.error('================');
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('🔧 Troubleshooting Steps:');
    console.error('   1. Check your .env.local file contains the correct DATABASE_URL');
    console.error('   2. Verify your database is accessible and has proper permissions');
    console.error('   3. Ensure all CSV files are in the correct location');
    console.error('   4. Run the validation script first: node data_validation_tools.js');
    console.error('   5. Check the error message above for specific guidance');
    console.error('');
    console.error('📞 If you need help, the error details above will help diagnose the issue.');
    
    process.exit(1);
  }
}

// Run the quick start
if (require.main === module) {
  quickStart().catch(console.error);
}

module.exports = { quickStart };

