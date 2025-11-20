import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

const execAsync = promisify(exec);

const SCRIPTS = [
  // First fix and import vehicles
  'tsx --tsconfig tsconfig.scripts.json ./scripts/import-real-data.ts',
  
  // Then import documents and line items
  'tsx --tsconfig tsconfig.scripts.json ./scripts/import-documents.ts',
  
  // Then import appointments
  'tsx --tsconfig tsconfig.scripts.json ./scripts/import-appointments.ts',
  
  // Then import reminders
  'tsx --tsconfig tsconfig.scripts.json ./scripts/import-reminders.ts',
  
  // Then import receipts
  'tsx --tsconfig tsconfig.scripts.json ./scripts/import-receipts.ts',
  
  // Finally import document extras
  'tsx --tsconfig tsconfig.scripts.json ./scripts/import-document-extras.ts',
];

async function runScript(script: string) {
  console.log(`\n=== Running: ${script} ===\n`);
  
  try {
    const { stdout, stderr } = await execAsync(script, {
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error running script: ${script}`);
    console.error(error.message);
    return { success: false, error };
  }
}

async function main() {
  console.log('Starting all imports...');
  
  for (const script of SCRIPTS) {
    const { success } = await runScript(script);
    
    if (!success) {
      console.error(`\n❌ Failed to run: ${script}`);
      console.log('\nStopping further imports due to error.');
      process.exit(1);
    }
    
    console.log(`\n✅ Successfully completed: ${script}\n`);
    console.log('='.repeat(80) + '\n');
  }
  
  console.log('🎉 All imports completed successfully!');
}

main().catch(console.error);
