require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐘 DIRECT POSTGRESQL IMPORT');
console.log('============================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function directPsqlImport() {
  try {
    // 1. CHECK CONNECTION STRING
    console.log('1️⃣ CHECKING CONNECTION...');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in environment');
    }
    
    console.log('   ✅ Connection string found');
    console.log('   🔗 URL:', dbUrl.replace(/:([^:]*?)@/, ':***@'));
    console.log('');
    
    // 2. CHECK DATA FILES
    console.log('2️⃣ CHECKING DATA FILES...');
    const dataDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(dataDir)) {
      throw new Error('Data directory not found');
    }
    
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    console.log('   📁 Data directory found');
    console.log('   📄 CSV files:', files.length);
    files.forEach(f => {
      const stats = fs.statSync(path.join(dataDir, f));
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`      - ${f} (${sizeKB}KB)`);
    });
    console.log('');
    
    // 3. CREATE IMPORT SQL SCRIPT
    console.log('3️⃣ CREATING IMPORT SCRIPT...');
    
    const importScript = `
-- DIRECT POSTGRESQL IMPORT SCRIPT
-- Generated: ${new Date().toISOString()}

-- Check current state
SELECT 'BEFORE IMPORT - Current counts:' as status;
SELECT 'Vehicles: ' || COUNT(*) FROM vehicles;
SELECT 'Customers: ' || COUNT(*) FROM customers;
SELECT 'Documents: ' || COUNT(*) FROM customer_documents;

-- Import vehicles using COPY (fastest method)
\\echo 'Importing vehicles...'
\\COPY vehicles(registration, make, model, year, created_at) 
FROM '${path.join(dataDir, 'vehicles.csv')}' 
DELIMITER ',' CSV HEADER
ON_ERROR_STOP;

-- Import customers
\\echo 'Importing customers...'
\\COPY customers(first_name, last_name, phone, email, created_at) 
FROM '${path.join(dataDir, 'customers.csv')}' 
DELIMITER ',' CSV HEADER
ON_ERROR_STOP;

-- Import documents
\\echo 'Importing documents...'
\\COPY customer_documents(doc_number, doc_type, total_gross, _id_customer, vehicle_registration, created_at) 
FROM '${path.join(dataDir, 'Documents.csv')}' 
DELIMITER ',' CSV HEADER
ON_ERROR_STOP;

-- Check final state
SELECT 'AFTER IMPORT - Final counts:' as status;
SELECT 'Vehicles: ' || COUNT(*) FROM vehicles;
SELECT 'Customers: ' || COUNT(*) FROM customers;
SELECT 'Documents: ' || COUNT(*) FROM customer_documents;

-- Show sample data
SELECT 'Sample vehicles:' as status;
SELECT registration, make, model FROM vehicles LIMIT 5;

\\echo 'Import completed successfully!'
`;
    
    const scriptPath = path.join(__dirname, 'import-script.sql');
    fs.writeFileSync(scriptPath, importScript);
    
    console.log('   ✅ Import script created');
    console.log('   📄 Script location:', scriptPath);
    console.log('');
    
    // 4. PROVIDE MANUAL INSTRUCTIONS
    console.log('4️⃣ MANUAL EXECUTION INSTRUCTIONS:');
    console.log('==================================');
    console.log('');
    console.log('🎯 OPTION 1: Direct psql command');
    console.log('Run this in your terminal:');
    console.log('');
    console.log(`psql "${dbUrl}" -f import-script.sql`);
    console.log('');
    console.log('🎯 OPTION 2: Interactive psql session');
    console.log('1. Connect to database:');
    console.log(`   psql "${dbUrl}"`);
    console.log('2. Run the import script:');
    console.log('   \\i import-script.sql');
    console.log('');
    console.log('🎯 OPTION 3: Individual COPY commands');
    console.log('Connect to psql and run:');
    console.log(`\\COPY vehicles FROM '${path.join(dataDir, 'vehicles.csv')}' CSV HEADER;`);
    console.log(`\\COPY customers FROM '${path.join(dataDir, 'customers.csv')}' CSV HEADER;`);
    console.log(`\\COPY customer_documents FROM '${path.join(dataDir, 'Documents.csv')}' CSV HEADER;`);
    console.log('');
    
    // 5. TRY AUTOMATIC EXECUTION
    console.log('5️⃣ ATTEMPTING AUTOMATIC EXECUTION...');
    console.log('');
    
    return new Promise((resolve, reject) => {
      const psql = spawn('psql', [dbUrl, '-f', scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      psql.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });
      
      psql.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error('Error:', text);
      });
      
      psql.on('close', (code) => {
        if (code === 0) {
          console.log('');
          console.log('🎉 AUTOMATIC IMPORT SUCCESSFUL!');
          console.log('✅ Your database is now fully loaded!');
          resolve({ success: true, output });
        } else {
          console.log('');
          console.log('⚠️  Automatic execution failed (code:', code, ')');
          console.log('💡 Please run the manual commands above');
          resolve({ success: false, error: errorOutput, manualInstructions: true });
        }
      });
      
      psql.on('error', (error) => {
        console.log('');
        console.log('⚠️  psql not available or connection failed');
        console.log('💡 Please run the manual commands above');
        resolve({ success: false, error: error.message, manualInstructions: true });
      });
    });
    
  } catch (error) {
    console.log('❌ SETUP FAILED:', error.message);
    return { success: false, error: error.message };
  }
}

directPsqlImport().then(result => {
  if (result.success) {
    console.log('🎊 IMPORT COMPLETED SUCCESSFULLY!');
  } else if (result.manualInstructions) {
    console.log('📋 Manual execution required - see instructions above');
  } else {
    console.log('💥 Import failed:', result.error);
  }
});
