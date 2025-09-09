#!/usr/bin/env node

// Automated MOT Scanner - Runs bulk MOT checks on a schedule
const { scheduleJob } = require('node-schedule');
const { spawn } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Configuration
const CONFIG = {
  // Schedule: Run every day at 2:00 AM
  dailySchedule: '0 2 * * *',
  
  // Schedule: Run every 6 hours
  frequentSchedule: '0 */6 * * *',
  
  // Schedule: Run every Monday at 9:00 AM (weekly)
  weeklySchedule: '0 9 * * 1',
  
  // Path to the bulk MOT check script
  scriptPath: path.resolve(__dirname, 'bulk-mot-check-optimized.cjs'),
  
  // Enable different schedules
  enableDaily: true,
  enableWeekly: false,
  enableFrequent: false,
};

console.log('🚗 Starting Automated MOT Scanner 🚗\n');

// Validate required environment variables
const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID', 'DATABASE_URL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Error: The following required environment variables are not set:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  process.exit(1);
}

console.log('✅ All required environment variables are configured');

// Function to run MOT scan
function runMOTScan(scheduleType = 'manual') {
  console.log(`\n🔍 Starting ${scheduleType} MOT scan...`);
  console.log(`⏰ ${new Date().toISOString()}`);
  
  const motProcess = spawn('node', [CONFIG.scriptPath], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: path.dirname(CONFIG.scriptPath)
  });
  
  let outputBuffer = '';
  let errorBuffer = '';
  
  // Handle stdout
  motProcess.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer += output;
    process.stdout.write(output);
  });
  
  // Handle stderr
  motProcess.stderr.on('data', (data) => {
    const error = data.toString();
    errorBuffer += error;
    process.stderr.write(error);
  });
  
  // Handle process completion
  motProcess.on('close', (code) => {
    const endTime = new Date().toISOString();
    
    if (code === 0) {
      console.log(`\n✅ ${scheduleType} MOT scan completed successfully at ${endTime}`);
      
      // Extract statistics from output if available
      const successMatch = outputBuffer.match(/✅ Success: (\d+)/);
      const failedMatch = outputBuffer.match(/❌ Failed: (\d+)/);
      const totalMatch = outputBuffer.match(/Total vehicles processed: (\d+)/);
      
      if (totalMatch) {
        console.log(`📊 Scan Results:`);
        console.log(`   Total processed: ${totalMatch[1]}`);
        if (successMatch) console.log(`   Successful: ${successMatch[1]}`);
        if (failedMatch) console.log(`   Failed: ${failedMatch[1]}`);
      }
    } else {
      console.error(`\n❌ ${scheduleType} MOT scan failed with exit code ${code} at ${endTime}`);
      if (errorBuffer) {
        console.error('Error details:', errorBuffer.slice(-500)); // Last 500 chars
      }
    }
  });
  
  // Handle process errors
  motProcess.on('error', (error) => {
    console.error(`\n❌ Failed to start ${scheduleType} MOT scan:`, error.message);
  });
  
  return motProcess;
}

// Schedule jobs
const jobs = [];

if (CONFIG.enableDaily) {
  const dailyJob = scheduleJob('Daily MOT Scan', CONFIG.dailySchedule, () => {
    runMOTScan('daily');
  });
  jobs.push(dailyJob);
  console.log(`📅 Daily MOT scan scheduled for: ${dailyJob.nextInvocation()}`);
}

if (CONFIG.enableWeekly) {
  const weeklyJob = scheduleJob('Weekly MOT Scan', CONFIG.weeklySchedule, () => {
    runMOTScan('weekly');
  });
  jobs.push(weeklyJob);
  console.log(`📅 Weekly MOT scan scheduled for: ${weeklyJob.nextInvocation()}`);
}

if (CONFIG.enableFrequent) {
  const frequentJob = scheduleJob('Frequent MOT Scan', CONFIG.frequentSchedule, () => {
    runMOTScan('frequent');
  });
  jobs.push(frequentJob);
  console.log(`📅 Frequent MOT scan scheduled for: ${frequentJob.nextInvocation()}`);
}

// Show next scheduled runs
console.log('\n📋 Scheduled MOT Scans:');
jobs.forEach((job, index) => {
  console.log(`${index + 1}. ${job.name}: ${job.nextInvocation()}`);
});

// Handle manual trigger via command line argument
if (process.argv.includes('--run-now')) {
  console.log('\n🚀 Running immediate MOT scan...');
  runMOTScan('manual');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Automated MOT Scanner...');
  jobs.forEach(job => job.cancel());
  console.log('✅ All scheduled jobs cancelled');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping Automated MOT Scanner...');
  jobs.forEach(job => job.cancel());
  process.exit(0);
});

console.log('\n✅ Automated MOT Scanner is running');
console.log('   - Press Ctrl+C to stop');
console.log('   - Run with --run-now to trigger immediate scan');
console.log('   - Logs will show scan progress and results\n');

// Keep the process alive
setInterval(() => {
  // Check if any jobs are still scheduled
  const activeJobs = jobs.filter(job => job.nextInvocation());
  if (activeJobs.length === 0) {
    console.log('⚠️  No active scheduled jobs found');
  }
}, 60000); // Check every minute
