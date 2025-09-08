require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function checkGA4ExportFiles() {
  try {
    console.log('🔍 Checking GA4 Export files for update import...\n');

    // 1. Check if GA4 Export directory exists
    if (!fs.existsSync(GA4_EXPORT_PATH)) {
      console.log(`❌ GA4 Export directory not found: ${GA4_EXPORT_PATH}`);
      console.log('Please ensure the GA4 Export folder is in the correct location.');
      return;
    }

    console.log(`✅ GA4 Export directory found: ${GA4_EXPORT_PATH}\n`);

    // 2. List all CSV files in the directory
    const files = fs.readdirSync(GA4_EXPORT_PATH).filter(file => file.endsWith('.csv'));
    
    console.log('📁 Available CSV files:');
    files.forEach(file => {
      const filePath = path.join(GA4_EXPORT_PATH, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      const modifiedDate = stats.mtime.toLocaleDateString();
      console.log(`   - ${file} (${sizeKB} KB, modified: ${modifiedDate})`);
    });

    // 3. Check specific files we need for import
    const expectedFiles = [
      'Customers.csv',
      'Vehicles.csv', 
      'Documents.csv',
      'LineItems.csv',
      'Document_Extras.csv',
      'Receipts.csv'
    ];

    console.log('\n📋 Expected files status:');
    for (const expectedFile of expectedFiles) {
      const filePath = path.join(GA4_EXPORT_PATH, expectedFile);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`   ✅ ${expectedFile} - ${sizeKB} KB`);
      } else {
        console.log(`   ❌ ${expectedFile} - NOT FOUND`);
      }
    }

    // 4. Sample data from key files
    console.log('\n📊 Sample data from key files:');
    
    for (const fileName of ['Customers.csv', 'Vehicles.csv', 'Documents.csv']) {
      const filePath = path.join(GA4_EXPORT_PATH, fileName);
      
      if (fs.existsSync(filePath)) {
        try {
          console.log(`\n${fileName}:`);
          
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
            relax_column_count: true
          });

          console.log(`   📈 Total records: ${records.length}`);
          
          if (records.length > 0) {
            console.log('   📝 Column headers:');
            Object.keys(records[0]).slice(0, 10).forEach(header => {
              console.log(`      - ${header}`);
            });
            
            if (Object.keys(records[0]).length > 10) {
              console.log(`      ... and ${Object.keys(records[0]).length - 10} more columns`);
            }

            // Show sample record
            console.log('   📄 Sample record:');
            const sampleRecord = records[0];
            Object.keys(sampleRecord).slice(0, 5).forEach(key => {
              const value = sampleRecord[key];
              const displayValue = value && value.length > 30 ? value.substring(0, 30) + '...' : value;
              console.log(`      ${key}: ${displayValue || 'NULL'}`);
            });
          }
          
        } catch (error) {
          console.log(`   ❌ Error reading ${fileName}: ${error.message}`);
        }
      }
    }

    // 5. Check for potential data freshness
    console.log('\n📅 Data freshness check:');
    const customerFile = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    if (fs.existsSync(customerFile)) {
      const stats = fs.statSync(customerFile);
      const daysSinceModified = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceModified === 0) {
        console.log('   ✅ Data is fresh (modified today)');
      } else if (daysSinceModified <= 7) {
        console.log(`   ✅ Data is recent (modified ${daysSinceModified} days ago)`);
      } else {
        console.log(`   ⚠️  Data may be stale (modified ${daysSinceModified} days ago)`);
      }
    }

    // 6. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    const criticalFiles = ['Customers.csv', 'Vehicles.csv'];
    const missingCritical = criticalFiles.filter(file => !fs.existsSync(path.join(GA4_EXPORT_PATH, file)));
    
    if (missingCritical.length > 0) {
      console.log('❌ CANNOT PROCEED - Missing critical files:');
      missingCritical.forEach(file => console.log(`   - ${file}`));
      console.log('\nPlease export the latest data from GA4 system first.');
    } else {
      console.log('✅ Ready to proceed with update import!');
      console.log('\nNext steps:');
      console.log('1. Run: node scripts/smart-update-import.js');
      console.log('2. This will preserve your clean database state');
      console.log('3. Only update existing records and add new ones');
      console.log('4. Maintain NATANIEL\'s correct vehicle assignment');
    }

  } catch (error) {
    console.error('❌ Error checking GA4 Export files:', error);
  }
}

checkGA4ExportFiles();
