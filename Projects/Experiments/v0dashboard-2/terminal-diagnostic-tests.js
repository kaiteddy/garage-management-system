#!/usr/bin/env node

/**
 * 🧪 TERMINAL DIAGNOSTIC TEST SUITE
 * Comprehensive testing to identify the exact terminal issue
 */

console.log('🧪 TERMINAL DIAGNOSTIC TEST SUITE');
console.log('==================================');
console.log('⏰ Start Time:', new Date().toISOString());
console.log('🖥️  Platform:', process.platform);
console.log('📦 Node Version:', process.version);
console.log('💾 Memory Usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
console.log('');

// Test 1: Basic JavaScript execution
console.log('TEST 1: Basic JavaScript Execution');
console.log('===================================');
try {
  const testVar = 'Hello World';
  console.log('✅ Variable assignment:', testVar);
  console.log('✅ Console.log working');
  console.log('✅ Basic JS execution: PASS');
} catch (e) {
  console.log('❌ Basic JS execution: FAIL -', e.message);
}
console.log('');

// Test 2: Process information
console.log('TEST 2: Process Information');
console.log('===========================');
try {
  console.log('✅ Process ID:', process.pid);
  console.log('✅ Working Directory:', process.cwd());
  console.log('✅ Platform:', process.platform);
  console.log('✅ Architecture:', process.arch);
  console.log('✅ Node Path:', process.execPath);
  console.log('✅ Process info: PASS');
} catch (e) {
  console.log('❌ Process info: FAIL -', e.message);
}
console.log('');

// Test 3: File system access
console.log('TEST 3: File System Access');
console.log('===========================');
try {
  const fs = require('fs');
  const path = require('path');
  
  // Test current directory
  const currentDir = process.cwd();
  console.log('✅ Current directory access:', currentDir);
  
  // Test directory listing
  const files = fs.readdirSync('.');
  console.log('✅ Directory listing: Found', files.length, 'items');
  
  // Test file existence
  const packageExists = fs.existsSync('package.json');
  console.log('✅ File existence check:', packageExists ? 'package.json found' : 'package.json not found');
  
  console.log('✅ File system access: PASS');
} catch (e) {
  console.log('❌ File system access: FAIL -', e.message);
}
console.log('');

// Test 4: Environment variables
console.log('TEST 4: Environment Variables');
console.log('==============================');
try {
  console.log('✅ HOME:', process.env.HOME || 'Not set');
  console.log('✅ PATH length:', (process.env.PATH || '').length, 'characters');
  console.log('✅ NODE_ENV:', process.env.NODE_ENV || 'Not set');
  console.log('✅ Environment variables: PASS');
} catch (e) {
  console.log('❌ Environment variables: FAIL -', e.message);
}
console.log('');

// Test 5: Async operations
console.log('TEST 5: Async Operations');
console.log('========================');
try {
  setTimeout(() => {
    console.log('✅ setTimeout: PASS');
  }, 100);
  
  setImmediate(() => {
    console.log('✅ setImmediate: PASS');
  });
  
  Promise.resolve('test').then(result => {
    console.log('✅ Promise resolution: PASS -', result);
  });
  
  console.log('✅ Async operations scheduled');
} catch (e) {
  console.log('❌ Async operations: FAIL -', e.message);
}
console.log('');

// Test 6: Module loading
console.log('TEST 6: Module Loading');
console.log('======================');
try {
  const os = require('os');
  console.log('✅ OS module loaded');
  console.log('✅ OS Type:', os.type());
  console.log('✅ OS Platform:', os.platform());
  console.log('✅ OS Release:', os.release());
  console.log('✅ Total Memory:', Math.round(os.totalmem() / 1024 / 1024 / 1024), 'GB');
  console.log('✅ Free Memory:', Math.round(os.freemem() / 1024 / 1024 / 1024), 'GB');
  console.log('✅ CPU Count:', os.cpus().length);
  console.log('✅ Module loading: PASS');
} catch (e) {
  console.log('❌ Module loading: FAIL -', e.message);
}
console.log('');

// Test 7: Network/DNS (if available)
console.log('TEST 7: Network Capabilities');
console.log('=============================');
try {
  const dns = require('dns');
  console.log('✅ DNS module loaded');
  
  // Test DNS resolution (non-blocking)
  dns.lookup('google.com', (err, address) => {
    if (err) {
      console.log('⚠️  DNS lookup: Limited -', err.code);
    } else {
      console.log('✅ DNS lookup: PASS -', address);
    }
  });
  
  console.log('✅ Network modules: PASS');
} catch (e) {
  console.log('❌ Network capabilities: FAIL -', e.message);
}
console.log('');

// Test 8: Database connection (if env available)
console.log('TEST 8: Database Connection Test');
console.log('=================================');
try {
  // Try to load dotenv
  require('dotenv').config({ path: '.env.local' });
  
  if (process.env.DATABASE_URL) {
    console.log('✅ Database URL found');
    
    // Try to load neon
    const { neon } = require('@neondatabase/serverless');
    console.log('✅ Neon module loaded');
    
    const sql = neon(process.env.DATABASE_URL);
    console.log('✅ SQL client created');
    
    // Test connection (async)
    sql`SELECT NOW() as current_time, 'test' as message`
      .then(result => {
        console.log('✅ Database connection: PASS');
        console.log('✅ Database time:', result[0].current_time);
        console.log('✅ Database message:', result[0].message);
      })
      .catch(err => {
        console.log('❌ Database connection: FAIL -', err.message);
      });
    
  } else {
    console.log('⚠️  Database URL not found in environment');
  }
} catch (e) {
  console.log('❌ Database test: FAIL -', e.message);
}
console.log('');

// Test 9: Child process capabilities
console.log('TEST 9: Child Process Test');
console.log('===========================');
try {
  const { spawn } = require('child_process');
  console.log('✅ Child process module loaded');
  
  // Test simple command
  const child = spawn('echo', ['Hello from child process']);
  
  child.stdout.on('data', (data) => {
    console.log('✅ Child process output:', data.toString().trim());
  });
  
  child.on('close', (code) => {
    console.log('✅ Child process: PASS - Exit code:', code);
  });
  
  child.on('error', (err) => {
    console.log('❌ Child process: FAIL -', err.message);
  });
  
} catch (e) {
  console.log('❌ Child process test: FAIL -', e.message);
}
console.log('');

// Test 10: Final summary
setTimeout(() => {
  console.log('🏁 TERMINAL DIAGNOSTIC COMPLETE');
  console.log('================================');
  console.log('⏰ End Time:', new Date().toISOString());
  console.log('');
  console.log('📊 SUMMARY:');
  console.log('- If you see this message, basic Node.js execution works');
  console.log('- If tests hang, the issue is with specific operations');
  console.log('- If no output appears, the terminal interface is blocked');
  console.log('');
  console.log('💡 NEXT STEPS:');
  console.log('- Compare results with expected behavior');
  console.log('- Identify which specific test fails or hangs');
  console.log('- Use this info to determine the root cause');
  console.log('');
  console.log('✅ Diagnostic script completed successfully!');
}, 2000);
