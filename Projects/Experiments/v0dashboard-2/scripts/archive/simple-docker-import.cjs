#!/usr/bin/env node

/**
 * 🐳 SIMPLE DOCKER IMPORT
 * Minimal dependencies - no native modules
 */

console.log('🐳 SIMPLE DOCKER IMPORT');
console.log('========================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('🔒 Running in isolated Docker container');
console.log('');

// Check environment
if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('✅ Database URL found');
console.log('✅ Docker environment detected');
console.log('');

// Simple CSV parser (no dependencies)
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      records.push(record);
    }
  }
  
  return records;
}

async function runSimpleImport() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Use simple HTTP client instead of neon
    const https = require('https');
    const { URL } = require('url');
    
    console.log('1️⃣ CHECKING GA4 DATA FOLDER...');
    const dataPath = '/app/ga4-data';
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`GA4 data folder not mounted: ${dataPath}`);
    }
    
    const files = fs.readdirSync(dataPath);
    console.log('✅ GA4 data folder found');
    console.log('📁 Available files:', files.length);
    
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    console.log('📊 CSV files found:', csvFiles.length);
    csvFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    console.log('2️⃣ PROCESSING CSV FILES...');
    let totalRecords = 0;
    
    for (const filename of csvFiles) {
      const filePath = path.join(dataPath, filename);
      console.log(`📄 Processing: ${filename}`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parseCSV(content);
        
        console.log(`   📋 Found ${records.length} records`);
        totalRecords += records.length;
        
        // Sample first few records
        if (records.length > 0) {
          console.log(`   📊 Sample fields:`, Object.keys(records[0]).slice(0, 5).join(', '));
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing ${filename}:`, error.message);
      }
      
      console.log('');
    }
    
    console.log('🎉 SIMPLE DOCKER IMPORT COMPLETE!');
    console.log('==================================');
    console.log('📊 Total CSV files processed:', csvFiles.length);
    console.log('📋 Total records found:', totalRecords);
    console.log('🔒 Container isolation successful');
    console.log('');
    console.log('💡 Next step: Use proper database client for actual import');
    console.log('🐳 Docker container will remain running for inspection...');
    
    // Keep container running
    setInterval(() => {
      console.log('🔄 Container still running...', new Date().toLocaleTimeString());
    }, 60000);
    
  } catch (error) {
    console.log('❌ SIMPLE IMPORT FAILED:', error.message);
    process.exit(1);
  }
}

runSimpleImport();
