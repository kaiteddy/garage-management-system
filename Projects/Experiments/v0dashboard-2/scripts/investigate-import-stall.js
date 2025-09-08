require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function investigateImportStall() {
  try {
    console.log('🔍 INVESTIGATING IMPORT STALL AT 360 CUSTOMERS\n');

    // 1. Analyze the 360 customers that were imported
    console.log('1. Analyzing imported customers...');
    await analyzeImportedCustomers();

    // 2. Check what customer records 361+ look like in CSV
    console.log('\n2. Analyzing CSV records around position 360...');
    await analyzeCSVAroundStall();

    // 3. Test importing a few records after 360
    console.log('\n3. Testing import of records after position 360...');
    await testImportAfterStall();

    // 4. Check for database constraints or issues
    console.log('\n4. Checking database constraints and limits...');
    await checkDatabaseConstraints();

    // 5. Check for memory or connection issues
    console.log('\n5. Checking for system resource issues...');
    await checkSystemResources();

    // 6. Analyze the exact failure point
    console.log('\n6. Finding the exact failure point...');
    await findExactFailurePoint();

    console.log('\n🎯 INVESTIGATION COMPLETE - Check results above for root cause');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

async function analyzeImportedCustomers() {
  // Check the last few imported customers
  const lastCustomers = await sql`
    SELECT id, first_name, last_name, email, created_at
    FROM customers 
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log('   📋 Last 10 imported customers:');
  lastCustomers.forEach((customer, index) => {
    console.log(`      ${index + 1}. ID: ${customer.id} - ${customer.first_name} ${customer.last_name} (${customer.created_at})`);
  });

  // Check for any patterns in the imported customer IDs
  const customerIds = await sql`
    SELECT id FROM customers ORDER BY id
  `;

  console.log(`   📊 Total customers imported: ${customerIds.length}`);
  
  if (customerIds.length > 0) {
    console.log(`   📋 ID range: ${customerIds[0].id} to ${customerIds[customerIds.length - 1].id}`);
  }

  // Check for any duplicate emails that might cause issues
  const duplicateEmails = await sql`
    SELECT email, COUNT(*) as count
    FROM customers 
    GROUP BY email
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 5
  `;

  if (duplicateEmails.length > 0) {
    console.log('   ⚠️  Found duplicate emails:');
    duplicateEmails.forEach(dup => {
      console.log(`      - ${dup.email}: ${dup.count} times`);
    });
  } else {
    console.log('   ✅ No duplicate emails found');
  }
}

async function analyzeCSVAroundStall() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`   📊 Total CSV records: ${records.length}`);

  // Look at records around position 360
  const startIndex = 355;
  const endIndex = 365;

  console.log(`   🔍 Analyzing CSV records ${startIndex}-${endIndex}:`);
  
  for (let i = startIndex; i < Math.min(endIndex, records.length); i++) {
    const record = records[i];
    const customerId = record._ID;
    const email = record.contactEmail || '';
    const name = `${record.nameForename || ''} ${record.nameSurname || ''}`.trim();
    
    // Check if this customer was imported
    const imported = await sql`
      SELECT id FROM customers WHERE id = ${customerId} LIMIT 1
    `;
    
    const status = imported.length > 0 ? '✅ IMPORTED' : '❌ NOT IMPORTED';
    console.log(`      ${i + 1}. ID: ${customerId} - ${name} - Email: ${email} - ${status}`);
    
    // Look for potential issues in this record
    if (imported.length === 0) {
      console.log(`         🔍 Analyzing failed record:`);
      console.log(`            - ID length: ${customerId ? customerId.length : 'NULL'}`);
      console.log(`            - Email: ${email || 'EMPTY'}`);
      console.log(`            - Name: ${name || 'EMPTY'}`);
      console.log(`            - Special chars in ID: ${customerId ? /[^\w-]/.test(customerId) : 'N/A'}`);
      
      // Check all fields for potential issues
      Object.entries(record).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.length > 255) {
          console.log(`            - Long field ${key}: ${value.length} chars`);
        }
        if (value && typeof value === 'string' && /[^\x00-\x7F]/.test(value)) {
          console.log(`            - Non-ASCII in ${key}: ${value.substring(0, 50)}...`);
        }
      });
    }
  }
}

async function testImportAfterStall() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  // Try to import records 361-365 individually
  console.log('   🧪 Testing individual import of records 361-365...');
  
  for (let i = 360; i < Math.min(365, records.length); i++) {
    const record = records[i];
    const customerId = record._ID;
    
    if (!customerId) {
      console.log(`      ${i + 1}. SKIPPED - No customer ID`);
      continue;
    }

    try {
      let email = record.contactEmail || '';
      if (!email) {
        email = `customer.${customerId}@placeholder.com`;
      }

      await sql`
        INSERT INTO customers (
          id, first_name, last_name, email, phone, 
          address_line1, city, postcode, created_at, updated_at
        ) VALUES (
          ${customerId},
          ${record.nameForename || ''},
          ${record.nameSurname || ''},
          ${email},
          ${record.contactTelephone || record.contactMobile || ''},
          ${record.addressRoad || ''},
          ${record.addressTown || ''},
          ${record.addressPostCode || ''},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;

      console.log(`      ${i + 1}. ✅ SUCCESS - Customer ${customerId} imported`);

    } catch (error) {
      console.log(`      ${i + 1}. ❌ FAILED - Customer ${customerId}: ${error.message}`);
      
      // This is likely our culprit - analyze this record in detail
      console.log(`         🔍 DETAILED ANALYSIS OF FAILING RECORD:`);
      console.log(`            - Customer ID: "${customerId}"`);
      console.log(`            - Email: "${record.contactEmail || 'EMPTY'}"`);
      console.log(`            - First Name: "${record.nameForename || 'EMPTY'}"`);
      console.log(`            - Last Name: "${record.nameSurname || 'EMPTY'}"`);
      console.log(`            - Phone: "${record.contactTelephone || record.contactMobile || 'EMPTY'}"`);
      console.log(`            - Address: "${record.addressRoad || 'EMPTY'}"`);
      console.log(`            - City: "${record.addressTown || 'EMPTY'}"`);
      console.log(`            - Postcode: "${record.addressPostCode || 'EMPTY'}"`);
      
      // Check for problematic characters
      Object.entries(record).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          if (value.includes("'")) {
            console.log(`            - Single quotes in ${key}: ${value}`);
          }
          if (value.includes('"')) {
            console.log(`            - Double quotes in ${key}: ${value}`);
          }
          if (value.includes('\\')) {
            console.log(`            - Backslashes in ${key}: ${value}`);
          }
          if (/[\x00-\x1F\x7F]/.test(value)) {
            console.log(`            - Control characters in ${key}`);
          }
        }
      });
      
      break; // Stop at first failure to focus on the issue
    }
  }
}

async function checkDatabaseConstraints() {
  // Check customers table constraints
  const constraints = await sql`
    SELECT 
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'customers'::regclass
  `;

  console.log('   📋 Customers table constraints:');
  constraints.forEach(constraint => {
    console.log(`      - ${constraint.constraint_name} (${constraint.constraint_type}): ${constraint.definition}`);
  });

  // Check for any unique constraint violations
  const uniqueViolations = await sql`
    SELECT 
      schemaname, tablename, attname, n_distinct, correlation
    FROM pg_stats 
    WHERE tablename = 'customers' AND schemaname = 'public'
    ORDER BY n_distinct DESC
  `;

  if (uniqueViolations.length > 0) {
    console.log('   📊 Column statistics:');
    uniqueViolations.forEach(stat => {
      console.log(`      - ${stat.attname}: ${stat.n_distinct} distinct values`);
    });
  }

  // Check current database size and limits
  const dbSize = await sql`
    SELECT 
      pg_size_pretty(pg_database_size(current_database())) as db_size,
      current_database() as db_name
  `;

  console.log(`   💾 Database size: ${dbSize[0].db_size}`);
}

async function checkSystemResources() {
  // Check active connections
  const connections = await sql`
    SELECT 
      count(*) as active_connections,
      max(query_start) as latest_query
    FROM pg_stat_activity 
    WHERE state = 'active'
  `;

  console.log(`   🔗 Active database connections: ${connections[0].active_connections}`);

  // Check for long-running queries
  const longQueries = await sql`
    SELECT 
      pid, 
      now() - query_start as duration,
      left(query, 100) as query_preview
    FROM pg_stat_activity 
    WHERE state != 'idle' 
      AND query_start < now() - interval '1 minute'
    ORDER BY duration DESC
  `;

  if (longQueries.length > 0) {
    console.log('   ⏱️  Long-running queries found:');
    longQueries.forEach(query => {
      console.log(`      - PID ${query.pid}: ${query.duration} - ${query.query_preview}...`);
    });
  } else {
    console.log('   ✅ No long-running queries');
  }

  // Check for locks
  const locks = await sql`
    SELECT 
      mode, 
      count(*) as lock_count
    FROM pg_locks 
    WHERE granted = true
    GROUP BY mode
    ORDER BY lock_count DESC
  `;

  if (locks.length > 0) {
    console.log('   🔒 Database locks:');
    locks.forEach(lock => {
      console.log(`      - ${lock.mode}: ${lock.lock_count} locks`);
    });
  }
}

async function findExactFailurePoint() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log('   🎯 Binary search for exact failure point...');

  // Get all imported customer IDs
  const importedIds = await sql`
    SELECT id FROM customers ORDER BY id
  `;
  const importedIdSet = new Set(importedIds.map(row => row.id));

  // Find the exact cutoff point
  let lastImported = -1;
  let firstFailed = -1;

  for (let i = 0; i < records.length; i++) {
    const customerId = records[i]._ID;
    if (!customerId) continue;

    if (importedIdSet.has(customerId)) {
      lastImported = i;
    } else {
      if (firstFailed === -1) {
        firstFailed = i;
      }
      break;
    }
  }

  console.log(`   📊 Import cutoff analysis:`);
  console.log(`      - Last successfully imported: Record ${lastImported + 1} (ID: ${records[lastImported]?._ID})`);
  console.log(`      - First failed record: Record ${firstFailed + 1} (ID: ${records[firstFailed]?._ID})`);

  if (firstFailed !== -1 && firstFailed < records.length) {
    const failedRecord = records[firstFailed];
    console.log(`   🔍 First failed record details:`);
    console.log(`      - Customer ID: "${failedRecord._ID}"`);
    console.log(`      - Email: "${failedRecord.contactEmail || 'EMPTY'}"`);
    console.log(`      - Name: "${failedRecord.nameForename || ''} ${failedRecord.nameSurname || ''}"`);
    
    // Check if this record has any obvious issues
    const issues = [];
    
    if (!failedRecord._ID) issues.push('Missing customer ID');
    if (failedRecord.contactEmail && importedIdSet.has(failedRecord.contactEmail)) issues.push('Duplicate email');
    if (failedRecord._ID && failedRecord._ID.length > 50) issues.push('Customer ID too long');
    
    Object.entries(failedRecord).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.length > 255) {
        issues.push(`${key} field too long (${value.length} chars)`);
      }
    });

    if (issues.length > 0) {
      console.log(`   ⚠️  Potential issues found:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log(`   🤔 No obvious issues found - may be a batch processing problem`);
    }
  }

  console.log(`\n🎯 INVESTIGATION SUMMARY:`);
  console.log(`   - Import stopped at record ${lastImported + 1} out of ${records.length}`);
  console.log(`   - Success rate: ${Math.round(((lastImported + 1) / records.length) * 100)}%`);
  console.log(`   - Likely cause: Check the detailed analysis above`);
}

investigateImportStall();
