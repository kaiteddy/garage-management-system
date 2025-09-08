const fs = require('fs');
const path = require('path');

console.log('🖥️ CHECKING DESKTOP FOR IMPORT SOLUTIONS');
console.log('=========================================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function checkDesktop() {
  try {
    const desktopPath = '/Users/adamrutstein/Desktop';
    
    console.log('1️⃣ CHECKING DESKTOP...');
    console.log('📍 Path:', desktopPath);
    console.log('');
    
    if (fs.existsSync(desktopPath)) {
      console.log('✅ Desktop folder found!');
      
      const items = fs.readdirSync(desktopPath);
      console.log(`📁 Contains ${items.length} items:`);
      console.log('');
      
      const importRelated = [];
      const garageRelated = [];
      const csvFiles = [];
      
      items.forEach((item, index) => {
        const itemPath = path.join(desktopPath, item);
        const stats = fs.statSync(itemPath);
        
        // Check for import/garage related items
        const itemLower = item.toLowerCase();
        if (itemLower.includes('garage') || 
            itemLower.includes('import') || 
            itemLower.includes('solution') ||
            itemLower.includes('prosearch') ||
            itemLower.includes('ga4') ||
            itemLower.includes('export')) {
          
          if (stats.isDirectory()) {
            console.log(`🎯 ${index + 1}. 📁 ${item}/ (POTENTIAL SOLUTION)`);
            importRelated.push({ name: item, path: itemPath, type: 'directory' });
            
            try {
              const subItems = fs.readdirSync(itemPath);
              console.log(`   📋 Contains ${subItems.length} items:`);
              
              subItems.slice(0, 10).forEach(subItem => {
                console.log(`      - ${subItem}`);
                if (subItem.toLowerCase().endsWith('.csv')) {
                  csvFiles.push({ name: subItem, parent: item, path: path.join(itemPath, subItem) });
                }
              });
              
              if (subItems.length > 10) {
                console.log(`      ... and ${subItems.length - 10} more items`);
              }
            } catch (e) {
              console.log(`   ⚠️  Cannot read contents: ${e.message}`);
            }
          } else {
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`🎯 ${index + 1}. 📄 ${item} (${sizeKB}KB) (POTENTIAL SOLUTION)`);
            importRelated.push({ name: item, path: itemPath, type: 'file', size: sizeKB });
          }
        } else if (itemLower.endsWith('.csv')) {
          const sizeMB = Math.round(stats.size / 1024 / 1024);
          console.log(`📊 ${index + 1}. 📄 ${item} (${sizeMB}MB CSV)`);
          csvFiles.push({ name: item, path: itemPath, size: sizeMB });
        } else {
          // Regular item
          if (stats.isDirectory()) {
            console.log(`${index + 1}. 📁 ${item}/`);
          } else {
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`${index + 1}. 📄 ${item} (${sizeKB}KB)`);
          }
        }
        console.log('');
      });
      
      // Summary
      console.log('🎉 DESKTOP SCAN COMPLETE!');
      console.log('=========================');
      
      if (importRelated.length > 0) {
        console.log(`🎯 Found ${importRelated.length} potential import solution(s):`);
        importRelated.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.name} (${item.type})`);
        });
        console.log('');
      }
      
      if (csvFiles.length > 0) {
        console.log(`📊 Found ${csvFiles.length} CSV file(s):`);
        csvFiles.forEach((file, i) => {
          console.log(`   ${i + 1}. ${file.name}${file.parent ? ` (in ${file.parent})` : ''}`);
        });
        console.log('');
      }
      
      // Check for GA4 Export specifically
      const ga4Export = items.find(item => item.toLowerCase().includes('ga4') && item.toLowerCase().includes('export'));
      if (ga4Export) {
        console.log('🎯 FOUND GA4 EXPORT FOLDER!');
        console.log('===========================');
        console.log(`📁 Name: ${ga4Export}`);
        console.log(`📍 Path: ${path.join(desktopPath, ga4Export)}`);
        
        try {
          const ga4Path = path.join(desktopPath, ga4Export);
          const ga4Items = fs.readdirSync(ga4Path);
          console.log(`📋 Contains ${ga4Items.length} items:`);
          
          ga4Items.forEach(item => {
            const itemPath = path.join(ga4Path, item);
            const stats = fs.statSync(itemPath);
            const sizeMB = Math.round(stats.size / 1024 / 1024);
            console.log(`   📄 ${item} (${sizeMB}MB)`);
          });
        } catch (e) {
          console.log(`   ⚠️  Cannot read GA4 Export contents: ${e.message}`);
        }
      }
      
      return { 
        success: true, 
        totalItems: items.length,
        importSolutions: importRelated,
        csvFiles: csvFiles,
        hasGA4Export: !!ga4Export
      };
      
    } else {
      console.log('❌ Desktop folder not found');
      return { success: false, error: 'Desktop not found' };
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the check
checkDesktop().then(result => {
  console.log('');
  console.log('🏁 DESKTOP CHECK COMPLETE');
  console.log('==========================');
  
  if (result.success) {
    console.log(`✅ Successfully scanned desktop (${result.totalItems} items)`);
    if (result.importSolutions.length > 0) {
      console.log(`🎯 Found ${result.importSolutions.length} potential import solution(s)`);
    }
    if (result.csvFiles.length > 0) {
      console.log(`📊 Found ${result.csvFiles.length} CSV file(s)`);
    }
    if (result.hasGA4Export) {
      console.log('🎉 GA4 Export folder detected!');
    }
  } else {
    console.log('❌ Failed to scan desktop:', result.error);
  }
  
  console.log('');
  console.log('💡 Desktop scan bypasses all terminal issues!');
}).catch(error => {
  console.log('💥 Unexpected error:', error.message);
});
