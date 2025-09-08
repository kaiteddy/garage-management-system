#!/usr/bin/env node

/**
 * 🔍 STANDALONE PROSEARCH ACCESS
 * Direct file system access without web server
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 STANDALONE PROSEARCH INTELLIGENCE ACCESS');
console.log('============================================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function accessProSearchFolder() {
  try {
    const prosearchPath = '/Users/adamrutstein/Downloads/ProSearch Intelligence';
    
    console.log('1️⃣ CHECKING PROSEARCH FOLDER...');
    console.log('📍 Path:', prosearchPath);
    console.log('');
    
    if (fs.existsSync(prosearchPath)) {
      console.log('✅ ProSearch Intelligence folder FOUND!');
      console.log('');
      
      const items = fs.readdirSync(prosearchPath);
      console.log(`📁 Contains ${items.length} items:`);
      console.log('');
      
      const importSolutions = [];
      
      items.forEach((item, index) => {
        const itemPath = path.join(prosearchPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          console.log(`${index + 1}. 📁 ${item}/`);
          
          // Check for import solutions
          if (item.toLowerCase().includes('garage') ||
              item.toLowerCase().includes('import') ||
              item.toLowerCase().includes('solution')) {
            
            console.log('   🎯 POTENTIAL IMPORT SOLUTION!');
            importSolutions.push({ name: item, path: itemPath });
            
            try {
              const subItems = fs.readdirSync(itemPath);
              console.log(`   📋 Contains ${subItems.length} items:`);
              
              subItems.slice(0, 15).forEach(subItem => {
                console.log(`      - ${subItem}`);
              });
              
              if (subItems.length > 15) {
                console.log(`      ... and ${subItems.length - 15} more items`);
              }
            } catch (e) {
              console.log(`   ⚠️  Cannot read contents: ${e.message}`);
            }
          }
        } else {
          const sizeKB = Math.round(stats.size / 1024);
          console.log(`${index + 1}. 📄 ${item} (${sizeKB}KB)`);
        }
        console.log('');
      });
      
      if (importSolutions.length > 0) {
        console.log('🎉 IMPORT SOLUTIONS FOUND!');
        console.log('==========================');
        importSolutions.forEach((solution, index) => {
          console.log(`${index + 1}. ${solution.name}`);
          console.log(`   📍 Path: ${solution.path}`);
        });
        console.log('');
        
        // Ask user which solution to explore
        console.log('💡 NEXT STEPS:');
        console.log('1. Choose which import solution to use');
        console.log('2. Copy the solution to your project directory');
        console.log('3. Run the import scripts');
        console.log('');
        
        return { success: true, solutions: importSolutions, allItems: items };
      } else {
        console.log('⚠️  No obvious import solutions found');
        console.log('💡 All items listed above - check manually for import scripts');
        return { success: true, solutions: [], allItems: items };
      }
      
    } else {
      console.log('❌ ProSearch Intelligence folder NOT FOUND');
      console.log('');
      
      // Check Downloads folder
      const downloadsPath = '/Users/adamrutstein/Downloads';
      if (fs.existsSync(downloadsPath)) {
        console.log('📁 Checking Downloads folder for alternatives...');
        const downloads = fs.readdirSync(downloadsPath);
        
        const related = downloads.filter(item => 
          item.toLowerCase().includes('prosearch') ||
          item.toLowerCase().includes('garage') ||
          item.toLowerCase().includes('import') ||
          item.toLowerCase().includes('solution')
        );
        
        if (related.length > 0) {
          console.log('🔍 Found related items in Downloads:');
          related.forEach(item => {
            console.log(`   - ${item}`);
          });
        } else {
          console.log('❌ No related items found in Downloads');
        }
      }
      
      return { success: false, error: 'Folder not found' };
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the access function
accessProSearchFolder().then(result => {
  console.log('');
  console.log('🏁 STANDALONE ACCESS COMPLETE');
  console.log('==============================');
  
  if (result.success) {
    console.log('✅ Successfully accessed ProSearch Intelligence folder');
    if (result.solutions.length > 0) {
      console.log(`🎯 Found ${result.solutions.length} import solution(s)`);
    }
  } else {
    console.log('❌ Failed to access folder:', result.error);
  }
  
  console.log('');
  console.log('💡 This standalone script bypasses all server/terminal issues!');
}).catch(error => {
  console.log('💥 Unexpected error:', error.message);
});
