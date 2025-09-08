const fs = require('fs');
const path = require('path');

console.log('🔍 SEARCHING FOR IMPORT SOLUTIONS');
console.log('==================================');

// Check the specific path you mentioned
const prosearchPath = '/Users/adamrutstein/Downloads/ProSearch Intelligence';

console.log('1️⃣ Checking ProSearch Intelligence folder...');
try {
  if (fs.existsSync(prosearchPath)) {
    console.log('✅ Found ProSearch Intelligence folder!');
    
    const items = fs.readdirSync(prosearchPath);
    console.log(`📁 Contains ${items.length} items:`);
    
    items.forEach(item => {
      const itemPath = path.join(prosearchPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`   📁 ${item}/`);
        
        // Check for import solutions
        if (item.toLowerCase().includes('garage') || 
            item.toLowerCase().includes('import') || 
            item.toLowerCase().includes('solution')) {
          console.log(`      🎯 POTENTIAL IMPORT SOLUTION!`);
          
          try {
            const subItems = fs.readdirSync(itemPath);
            console.log(`      📋 Contains:`);
            subItems.slice(0, 15).forEach(subItem => {
              console.log(`         - ${subItem}`);
            });
          } catch (e) {
            console.log(`      ⚠️  Cannot read: ${e.message}`);
          }
        }
      } else {
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`   📄 ${item} (${sizeKB}KB)`);
      }
    });
  } else {
    console.log('❌ ProSearch Intelligence folder not found');
  }
} catch (error) {
  console.log('❌ Error accessing ProSearch folder:', error.message);
}

console.log('');
console.log('2️⃣ Searching Downloads for import-related folders...');

try {
  const downloadsPath = '/Users/adamrutstein/Downloads';
  if (fs.existsSync(downloadsPath)) {
    const downloads = fs.readdirSync(downloadsPath);
    
    const importRelated = downloads.filter(item => 
      item.toLowerCase().includes('garage') ||
      item.toLowerCase().includes('import') ||
      item.toLowerCase().includes('solution') ||
      item.toLowerCase().includes('prosearch') ||
      item.toLowerCase().includes('pro')
    );
    
    if (importRelated.length > 0) {
      console.log('🎯 Found import-related items:');
      importRelated.forEach(item => {
        const itemPath = path.join(downloadsPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          console.log(`   📁 ${item}/`);
          
          // Check contents
          try {
            const contents = fs.readdirSync(itemPath);
            if (contents.length > 0) {
              console.log(`      📋 Contains ${contents.length} items:`);
              contents.slice(0, 10).forEach(subItem => {
                console.log(`         - ${subItem}`);
              });
            }
          } catch (e) {
            console.log(`      ⚠️  Cannot read contents`);
          }
        } else {
          const sizeMB = Math.round(stats.size / 1024 / 1024);
          console.log(`   📄 ${item} (${sizeMB}MB)`);
        }
      });
    } else {
      console.log('❌ No import-related folders found in Downloads');
    }
  }
} catch (error) {
  console.log('❌ Error searching Downloads:', error.message);
}

console.log('');
console.log('✅ Search complete!');
