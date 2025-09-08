import * as fs from 'fs';
import * as path from 'path';

// Simple CSV parser function that handles quoted values
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const result: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length && i <= 5; i++) { // Only parse first 5 rows for scanning
    try {
      const values = parseCSVLine(lines[i]);
      const obj: Record<string, string> = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        obj[header] = values[j] || '';
      }
      
      result.push(obj);
    } catch (error) {
      console.error(`Error parsing line ${i + 1}: ${lines[i]}`);
    }
  }
  
  return result;
}

// Helper function to parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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
  
  return result.map(field => 
    field.startsWith('"') && field.endsWith('"') 
      ? field.slice(1, -1) 
      : field
  );
}

async function scanCSVStructure() {
  console.log('🔍 SCANNING CSV FILES FOR STRUCTURE AND AVAILABLE FIELDS');
  console.log('='.repeat(60));
  
  const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports';
  
  const files = [
    'Documents.csv',
    'LineItems.csv',
    'Document_Extras.csv',
    'Receipts.csv'
  ];
  
  for (const fileName of files) {
    const filePath = path.join(basePath, fileName);
    
    console.log(`\n📄 ${fileName}`);
    console.log('-'.repeat(40));
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found');
      continue;
    }
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      if (lines.length === 0) {
        console.log('❌ Empty file');
        continue;
      }
      
      // Get headers
      const headers = parseCSVLine(lines[0]);
      console.log(`📊 Total columns: ${headers.length}`);
      console.log(`📝 Total rows: ${lines.length - 1}`);
      
      // Show all headers
      console.log('\n🏷️  Available columns:');
      headers.forEach((header, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${header}`);
      });
      
      // Look for job sheet related fields
      const jsFields = headers.filter(h => 
        h.toLowerCase().includes('job') || 
        h.toLowerCase().includes('js') ||
        h.toLowerCase().includes('docnumber') ||
        h.toLowerCase().includes('doc_number') ||
        h.toLowerCase().includes('reference') ||
        h.toLowerCase().includes('ref') ||
        h.toLowerCase().includes('docdepartment') ||
        h.toLowerCase().includes('docorderref')
      );
      
      if (jsFields.length > 0) {
        console.log('\n🎯 Job Sheet / Reference related fields found:');
        jsFields.forEach(field => {
          console.log(`   ✅ ${field}`);
        });
      }
      
      // Sample first few rows for job sheet documents
      if (fileName === 'Documents.csv') {
        console.log('\n📋 Sample Job Sheet documents (first 5):');
        const records = parseCSV(fileContent);
        const jsRecords = records.filter(r => 
          r.docType === 'JS' || 
          r.doc_type === 'JS' ||
          r.document_type === 'JS'
        );
        
        console.log(`Found ${jsRecords.length} Job Sheet records in sample`);
        
        if (jsRecords.length > 0) {
          jsRecords.slice(0, 3).forEach((record, index) => {
            console.log(`\n   📝 Job Sheet Record ${index + 1}:`);
            Object.entries(record).forEach(([key, value]) => {
              if (value && value.trim() !== '') {
                console.log(`     ${key}: ${value}`);
              }
            });
          });
        } else {
          console.log('   ❌ No Job Sheet documents found in sample');
          
          // Show sample of any document type
          if (records.length > 0) {
            console.log('\n   📋 Sample document (any type):');
            const sampleRecord = records[0];
            Object.entries(sampleRecord).forEach(([key, value]) => {
              if (value && value.trim() !== '') {
                console.log(`     ${key}: ${value}`);
              }
            });
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error reading file: ${error}`);
    }
  }
}

// Run the scan
scanCSVStructure().then(() => {
  console.log('\n✅ CSV structure scan completed!');
}).catch(error => {
  console.error('❌ Error scanning CSV files:', error);
});
