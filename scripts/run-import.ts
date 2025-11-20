import { spawn } from 'child_process';
import * as path from 'path';
import * as url from 'url';
import * as dotenv from 'dotenv';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in environment variables');
  process.exit(1);
}

console.log('🚀 Starting data import...');
console.log(`📊 Database: ${process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'unknown'}`);

// Run the import script
const child = spawn('tsx', [path.join(__dirname, 'import-data.ts')], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: '--no-warnings'
  }
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Data import completed successfully!');
  } else {
    console.error(`❌ Data import failed with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Terminating...');
  child.kill('SIGINT');
});
