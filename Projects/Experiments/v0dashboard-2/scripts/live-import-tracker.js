import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Clear screen and move cursor to top
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

// Create progress bar
function createProgressBar(current, total, width = 50) {
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${colors.cyan}[${bar}]${colors.reset} ${percentage.toFixed(1)}%`;
}

// Format large numbers
function formatNumber(num) {
  return num.toLocaleString();
}

// Format currency
function formatCurrency(amount) {
  return `£${parseFloat(amount || 0).toLocaleString()}`;
}

// Calculate ETA
function calculateETA(current, total, startTime) {
  if (current === 0) return 'Calculating...';
  
  const elapsed = (Date.now() - startTime) / 1000; // seconds
  const rate = current / elapsed; // items per second
  const remaining = total - current;
  const eta = remaining / rate; // seconds
  
  if (eta < 60) return `${Math.round(eta)}s`;
  if (eta < 3600) return `${Math.round(eta / 60)}m ${Math.round(eta % 60)}s`;
  return `${Math.round(eta / 3600)}h ${Math.round((eta % 3600) / 60)}m`;
}

async function trackImportProgress() {
  const TARGET_TOTAL = 90063; // Total lines in CSV
  const startTime = Date.now();
  let lastCount = 0;
  let lastTime = startTime;
  
  console.log(`${colors.bright}${colors.blue}🚀 LIVE IMPORT TRACKER${colors.reset}`);
  console.log(`${colors.yellow}Target: ${formatNumber(TARGET_TOTAL)} line items${colors.reset}\n`);

  while (true) {
    try {
      clearScreen();
      
      // Header
      console.log(`${colors.bright}${colors.blue}🚀 LIVE PARTS DATA IMPORT TRACKER${colors.reset}`);
      console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
      
      // Get current stats
      const stats = await sql`
        SELECT 
          COUNT(*) as total_items,
          SUM(total_amount) as total_value,
          COUNT(CASE WHEN description NOT ILIKE '%labour%' AND total_amount > 0 THEN 1 END) as parts_count,
          COUNT(DISTINCT document_id) as unique_documents,
          AVG(total_amount) as avg_value,
          MAX(total_amount) as max_value
        FROM line_items
      `;
      
      const current = parseInt(stats[0].total_items);
      const totalValue = parseFloat(stats[0].total_value || 0);
      const partsCount = parseInt(stats[0].parts_count || 0);
      const uniqueDocs = parseInt(stats[0].unique_documents || 0);
      const avgValue = parseFloat(stats[0].avg_value || 0);
      const maxValue = parseFloat(stats[0].max_value || 0);
      
      // Calculate progress
      const percentage = (current / TARGET_TOTAL) * 100;
      const progressBar = createProgressBar(current, TARGET_TOTAL, 40);
      
      // Calculate speed
      const currentTime = Date.now();
      const timeDiff = (currentTime - lastTime) / 1000; // seconds
      const itemsDiff = current - lastCount;
      const speed = timeDiff > 0 ? itemsDiff / timeDiff : 0;
      
      // Calculate ETA
      const eta = calculateETA(current, TARGET_TOTAL, startTime);
      
      // Display progress
      console.log(`${colors.bright}📊 IMPORT PROGRESS${colors.reset}`);
      console.log(`${progressBar}`);
      console.log(`${colors.green}${formatNumber(current)}${colors.reset} / ${colors.yellow}${formatNumber(TARGET_TOTAL)}${colors.reset} line items imported`);
      console.log(`${colors.magenta}Speed: ${speed.toFixed(1)} items/sec${colors.reset} | ${colors.cyan}ETA: ${eta}${colors.reset}\n`);
      
      // Display value stats
      console.log(`${colors.bright}💰 VALUE STATISTICS${colors.reset}`);
      console.log(`Total Value: ${colors.green}${formatCurrency(totalValue)}${colors.reset}`);
      console.log(`Average Item: ${colors.yellow}${formatCurrency(avgValue)}${colors.reset}`);
      console.log(`Highest Item: ${colors.red}${formatCurrency(maxValue)}${colors.reset}\n`);
      
      // Display data breakdown
      console.log(`${colors.bright}📦 DATA BREAKDOWN${colors.reset}`);
      console.log(`Parts Found: ${colors.green}${formatNumber(partsCount)}${colors.reset} non-labour items`);
      console.log(`Documents: ${colors.cyan}${formatNumber(uniqueDocs)}${colors.reset} unique invoices/jobs`);
      console.log(`Labour Items: ${colors.yellow}${formatNumber(current - partsCount)}${colors.reset} service entries\n`);
      
      // Get recent high-value items
      const recentItems = await sql`
        SELECT description, unit_price, total_amount
        FROM line_items 
        WHERE total_amount > 100
        AND description NOT ILIKE '%labour%'
        ORDER BY id DESC
        LIMIT 5
      `;
      
      if (recentItems.length > 0) {
        console.log(`${colors.bright}🔧 RECENT HIGH-VALUE PARTS${colors.reset}`);
        recentItems.forEach((item, i) => {
          console.log(`  ${i + 1}. ${colors.white}${item.description}${colors.reset} - ${colors.green}${formatCurrency(item.unit_price)}${colors.reset}`);
        });
        console.log('');
      }
      
      // Status indicator
      if (current >= TARGET_TOTAL) {
        console.log(`${colors.bright}${colors.green}✅ IMPORT COMPLETE!${colors.reset}`);
        console.log(`${colors.cyan}🎉 All ${formatNumber(TARGET_TOTAL)} line items imported successfully!${colors.reset}`);
        break;
      } else {
        console.log(`${colors.bright}${colors.yellow}⚡ IMPORTING...${colors.reset} ${colors.cyan}Press Ctrl+C to stop tracker${colors.reset}`);
      }
      
      // Update for next iteration
      lastCount = current;
      lastTime = currentTime;
      
      // Wait 2 seconds before next update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}📊 Tracker stopped by user${colors.reset}`);
  process.exit(0);
});

// Start tracking
trackImportProgress().catch(error => {
  console.error(`${colors.red}❌ Tracker failed: ${error.message}${colors.reset}`);
  process.exit(1);
});
