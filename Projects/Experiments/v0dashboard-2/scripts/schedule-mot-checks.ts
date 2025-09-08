import { scheduleJob } from 'node-schedule';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Configuration
const CHECK_INTERVAL = '0 9 * * *'; // Every day at 9:00 AM
const SCRIPT_PATH = join(__dirname, 'import-and-check-mots.ts');

console.log('🚀 Starting MOT check scheduler...');
console.log(`📅 Next check scheduled for: ${new Date(scheduleJob(CHECK_INTERVAL, () => {}).nextInvocation())}`);

// Schedule the MOT check job
const job = scheduleJob(CHECK_INTERVAL, async () => {
  console.log('\n🔍 Running scheduled MOT check...');
  console.log(`⏰ ${new Date().toISOString()}`);
  
  // Run the import and check script
  const motCheck = exec(`npx tsx ${SCRIPT_PATH}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error running MOT check: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️  stderr: ${stderr}`);
      return;
    }
    console.log(`✅ MOT check completed at ${new Date().toISOString()}`);
  });
  
  // Log script output in real-time
  motCheck.stdout?.on('data', (data) => {
    console.log(data.toString().trim());
  });
  
  motCheck.stderr?.on('data', (data) => {
    console.error(data.toString().trim());
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping MOT check scheduler...');
  job.cancel();
  process.exit(0);
});

console.log('✅ MOT check scheduler is running. Press Ctrl+C to stop.');
