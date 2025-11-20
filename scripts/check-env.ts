import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// List all environment variables (be careful with sensitive data)
console.log('\nAll environment variables:');
Object.keys(process.env).forEach(key => {
  console.log(`${key}: ${key.includes('PASS') || key.includes('SECRET') || key.includes('KEY') ? '***' : process.env[key]}`);
});
