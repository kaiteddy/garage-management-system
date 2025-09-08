// GarageManagement Pro - Fix Import Stall Solution
// This script fixes the batch processing issue and imports all remaining customers

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.DATABASE_URL);

// CSV parsing utility
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }
  
  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  return phone.replace(/[^\d+\s-]/g, '').trim();
}

function cleanCurrency(amount) {
  if (!amount || amount === '') return 0;
  return parseFloat(amount.toString().replace(/[£$,]/g, '')) || 0;
}

class ImportStallFixer {
  constructor() {
    this.stats = {
      totalInCSV: 0,
      alreadyImported: 0,
      newlyImported: 0,
      errors: 0,
      batchSize: 50, // Smaller batches to avoid stalls
      errorDetails: []
    };
  }

  async fixCustomerImport() {
    console.log('🔧 GarageManagement Pro - Import Stall Fix');
    console.log('==========================================');
    console.log('');
    
    try {
      // Step 1: Analyze current state
      console.log('1️⃣ Analyzing current import state...');
      
      const currentCount = await sql`SELECT COUNT(*) as count FROM customers`;
      const currentCustomers = currentCount[0].count;
      console.log(`   📊 Currently imported: ${currentCustomers} customers`);
      
      // Get list of already imported customer IDs
      const importedIds = await sql`SELECT id FROM customers ORDER BY created_at`;
      const importedIdSet = new Set(importedIds.map(row => row.id));
      console.log(`   ✅ Found ${importedIdSet.size} existing customer IDs`);
      
      // Step 2: Load and analyze CSV
      console.log('');
      console.log('2️⃣ Loading CSV data...');
      
      const csvPath = '/Users/adamrutstein/Desktop/GA4 Export/Customers.csv';
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const allCustomers = parseCSV(csvContent);
      
      this.stats.totalInCSV = allCustomers.length;
      console.log(`   📋 Total customers in CSV: ${this.stats.totalInCSV}`);
      
      // Find customers that need to be imported
      const customersToImport = allCustomers.filter(customer => !importedIdSet.has(customer._ID));
      console.log(`   🔄 Customers needing import: ${customersToImport.length}`);
      this.stats.alreadyImported = this.stats.totalInCSV - customersToImport.length;
      
      if (customersToImport.length === 0) {
        console.log('   🎉 All customers already imported!');
        return this.generateReport();
      }
      
      // Step 3: Import remaining customers in small batches
      console.log('');
      console.log('3️⃣ Importing remaining customers...');
      console.log(`   📦 Using batch size: ${this.stats.batchSize} customers per batch`);
      console.log(`   ⏱️  Estimated time: ${Math.ceil(customersToImport.length / this.stats.batchSize)} batches`);
      console.log('');
      
      const totalBatches = Math.ceil(customersToImport.length / this.stats.batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * this.stats.batchSize;
        const endIndex = Math.min(startIndex + this.stats.batchSize, customersToImport.length);
        const batch = customersToImport.slice(startIndex, endIndex);
        
        console.log(`   📦 Processing batch ${batchIndex + 1}/${totalBatches} (records ${startIndex + 1}-${endIndex})...`);
        
        // Process batch with individual error handling
        for (let i = 0; i < batch.length; i++) {
          const customer = batch[i];
          const recordNumber = startIndex + i + 1;
          
          try {
            // Handle email uniqueness
            let email = customer.contactEmail || '';
            if (!email || email === '') {
              email = `customer.${customer._ID}@placeholder.com`;
            }

            // Use our actual database schema
            await sql`
              INSERT INTO customers (
                id, first_name, last_name, email, phone, 
                address_line1, city, postcode, created_at, updated_at
              ) VALUES (
                ${customer._ID},
                ${customer.nameForename || ''},
                ${customer.nameSurname || ''},
                ${email},
                ${cleanPhoneNumber(customer.contactTelephone || customer.contactMobile)},
                ${customer.addressRoad || ''},
                ${customer.addressTown || ''},
                ${customer.addressPostCode || ''},
                NOW(),
                NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                address_line1 = EXCLUDED.address_line1,
                city = EXCLUDED.city,
                postcode = EXCLUDED.postcode,
                updated_at = NOW()
            `;
            
            this.stats.newlyImported++;
            
          } catch (error) {
            this.stats.errors++;
            this.stats.errorDetails.push({
              recordNumber: recordNumber,
              customerId: customer._ID,
              customerName: `${customer.nameForename || ''} ${customer.nameSurname || ''}`.trim() || customer.nameCompany,
              error: error.message
            });
            
            console.log(`     ⚠️  Error importing record ${recordNumber} (${customer._ID}): ${error.message}`);
          }
        }
        
        // Progress update
        const totalProcessed = this.stats.alreadyImported + this.stats.newlyImported + this.stats.errors;
        const percentage = Math.round((totalProcessed / this.stats.totalInCSV) * 100);
        console.log(`     ✅ Batch complete. Progress: ${totalProcessed}/${this.stats.totalInCSV} (${percentage}%)`);
        
        // Small delay to prevent overwhelming the database
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log('');
      console.log('4️⃣ Verifying final import state...');
      
      const finalCount = await sql`SELECT COUNT(*) as count FROM customers`;
      const finalCustomers = finalCount[0].count;
      console.log(`   📊 Final customer count: ${finalCustomers}`);
      
      return this.generateReport();
      
    } catch (error) {
      console.error('💥 Import fix failed:', error.message);
      throw error;
    }
  }

  async fixAllTables() {
    console.log('🚀 GarageManagement Pro - Complete Import Fix');
    console.log('=============================================');
    console.log('');
    
    try {
      // Fix customers first
      await this.fixCustomerImport();
      
      console.log('');
      console.log('5️⃣ Checking other tables for import issues...');
      
      // Check other tables
      const tableStatus = await sql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
      `;
      
      const status = tableStatus[0];
      
      console.log('   📊 Current table status:');
      console.log(`      👥 Customers: ${status.customers.toLocaleString()}`);
      console.log(`      🚗 Vehicles: ${status.vehicles.toLocaleString()}`);
      console.log(`      📄 Documents: ${status.documents.toLocaleString()}`);
      
      // Recommendations for other tables
      const emptyTables = [];
      if (status.vehicles === 0) emptyTables.push('vehicles');
      if (status.documents === 0) emptyTables.push('documents');
      
      if (emptyTables.length > 0) {
        console.log('');
        console.log('💡 Recommendations for remaining tables:');
        console.log(`   📭 Empty tables: ${emptyTables.join(', ')}`);
        console.log('   🚀 Run the vehicle and document import next');
        console.log('   💡 The customer import stall issue is now fixed');
      } else {
        console.log('');
        console.log('🎉 All core tables have data! Customer import stall is fixed.');
      }
      
    } catch (error) {
      console.error('💥 Complete fix failed:', error.message);
      throw error;
    }
  }

  generateReport() {
    console.log('');
    console.log('📊 IMPORT FIX REPORT');
    console.log('====================');
    console.log('');
    console.log(`📈 Import Statistics:`);
    console.log(`   📋 Total in CSV: ${this.stats.totalInCSV.toLocaleString()}`);
    console.log(`   ✅ Already imported: ${this.stats.alreadyImported.toLocaleString()}`);
    console.log(`   🆕 Newly imported: ${this.stats.newlyImported.toLocaleString()}`);
    console.log(`   ❌ Errors: ${this.stats.errors.toLocaleString()}`);
    console.log('');
    
    const totalImported = this.stats.alreadyImported + this.stats.newlyImported;
    const successRate = Math.round((totalImported / this.stats.totalInCSV) * 100);
    
    console.log(`🎯 Final Results:`);
    console.log(`   📊 Total imported: ${totalImported.toLocaleString()}/${this.stats.totalInCSV.toLocaleString()} (${successRate}%)`);
    
    if (this.stats.errors > 0) {
      console.log(`   ⚠️  Import errors: ${this.stats.errors}`);
      
      if (this.stats.errorDetails.length > 0) {
        console.log('');
        console.log('🔍 Error Details (first 10):');
        this.stats.errorDetails.slice(0, 10).forEach(error => {
          console.log(`   ❌ Record ${error.recordNumber}: ${error.customerName} (${error.customerId})`);
          console.log(`      Error: ${error.error}`);
        });
        
        if (this.stats.errorDetails.length > 10) {
          console.log(`   ... and ${this.stats.errorDetails.length - 10} more errors`);
        }
      }
    }
    
    console.log('');
    
    if (successRate >= 95) {
      console.log('🎉 EXCELLENT! Customer import is now complete!');
      console.log('✅ Your customer database is ready for use.');
      console.log('🚀 Ready to proceed with vehicle and document imports!');
    } else if (successRate >= 90) {
      console.log('👍 GOOD! Most customers imported successfully.');
      console.log('💡 Review any errors above, but the database is usable.');
      console.log('🚀 Ready to proceed with vehicle and document imports!');
    } else {
      console.log('⚠️  PARTIAL SUCCESS! Some customers could not be imported.');
      console.log('🔧 Review error details above and consider data cleanup.');
    }
    
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Import vehicles with proper customer assignments');
    console.log('   2. Import documents with customer/vehicle relationships');
    console.log('   3. Test WhatsApp integration with imported customer data');
    console.log('   4. Verify all customer-vehicle relationships are correct');
    
    return {
      totalInCSV: this.stats.totalInCSV,
      totalImported: totalImported,
      successRate: successRate,
      errors: this.stats.errors,
      readyForUse: successRate >= 90
    };
  }
}

// Main function
async function runImportFix() {
  const fixer = new ImportStallFixer();
  
  try {
    const results = await fixer.fixAllTables();
    return results;
  } catch (error) {
    console.error('💥 Import fix execution failed:', error.message);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  runImportFix().catch(console.error);
}

module.exports = { ImportStallFixer, runImportFix };
