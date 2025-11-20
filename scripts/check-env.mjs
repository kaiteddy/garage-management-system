// This script will load Next.js environment variables and log them (masking sensitive data)
import { loadEnvConfig } from '@next/env';

// Load environment variables the same way Next.js does
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Log environment variables (masking sensitive data)
const envVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
  'DATABASE_URL': process.env.DATABASE_URL ? '***' : 'Not set',
  'PGHOST': process.env.PGHOST ? '***' : 'Not set',
  'PGDATABASE': process.env.PGDATABASE ? '***' : 'Not set',
  'DOCUMENTS_TABLE_EXISTS': process.env.DOCUMENTS_TABLE_EXISTS || 'Not set'
};

console.log('Environment variables:');
console.table(envVars);
