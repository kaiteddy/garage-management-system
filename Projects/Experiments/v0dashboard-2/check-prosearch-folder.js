const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKING PROSEARCH INTELLIGENCE FOLDER');
console.log('==========================================');

const targetPath = '/Users/adamrutstein/Downloads/ProSearch Intelligence';

try {
  if (fs.existsSync(targetPath)) {
    console.log('✅ Folder found!');
    console.log('📁 Path:', targetPath);
    console.log('');
    
    const items = fs.readdirSync(targetPath);
    console.log('📋 Contents:');
    
    items.forEach(item => {
      const itemPath = path.join(targetPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`   📁 ${item}/`);
        
        // Check if it contains GarageManagement_Pro_Import_Solutions
        if (item.includes('GarageManagement') || item.includes('Import')) {
          console.log(`      🎯 FOUND IMPORT SOLUTION: ${item}`);
          
          try {
            const subItems = fs.readdirSync(itemPath);
            console.log(`      📋 Contains ${subItems.length} items:`);
            subItems.slice(0, 10).forEach(subItem => {
              console.log(`         - ${subItem}`);
            });
            if (subItems.length > 10) {
              console.log(`         ... and ${subItems.length - 10} more items`);
            }
          } catch (e) {
            console.log(`      ⚠️  Cannot read contents: ${e.message}`);
          }
        }
      } else {
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`   📄 ${item} (${sizeKB}KB)`);
      }
    });
    
  } else {
    console.log('❌ Folder not found at:', targetPath);
    
    // Check if Downloads folder exists
    const downloadsPath = '/Users/adamrutstein/Downloads';
    if (fs.existsSync(downloadsPath)) {
      console.log('');
      console.log('📁 Downloads folder contents:');
      const downloads = fs.readdirSync(downloadsPath);
      downloads.forEach(item => {
        if (item.includes('ProSearch') || item.includes('Garage') || item.includes('Import')) {
          console.log(`   🎯 ${item}`);
        }
      });
    }
  }
  
} catch (error) {
  console.log('❌ Error:', error.message);
}
