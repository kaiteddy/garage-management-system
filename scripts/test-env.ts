import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('Environment Variables:');
console.log('DVSA_API_KEY:', process.env.DVSA_API_KEY ? '***' : 'Not Found');
console.log('NEXT_PUBLIC_DVSA_API_KEY:', process.env.NEXT_PUBLIC_DVSA_API_KEY ? '***' : 'Not Found');
console.log('All environment variables:', Object.keys(process.env).filter(key => key.includes('DVSA')));
