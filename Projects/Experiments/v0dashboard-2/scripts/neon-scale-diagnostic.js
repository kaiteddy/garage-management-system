require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

class NeonScaleDiagnostic {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  async runDiagnostic() {
    console.log('🔍 NEON SCALE PLAN DIAGNOSTIC');
    console.log('=============================');
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    console.log('🎯 Identifying Scale plan performance issues\n');

    try {
      // Test 1: Basic connectivity and response time
      console.log('1️⃣ Testing basic connectivity and response time...');
      await this.testConnectivity();

      // Test 2: Connection pool analysis
      console.log('2️⃣ Analyzing connection pool configuration...');
      await this.analyzeConnectionPool();

      // Test 3: Database configuration analysis
      console.log('3️⃣ Checking database configuration...');
      await this.analyzeDatabaseConfig();

      // Test 4: Table and index analysis
      console.log('4️⃣ Analyzing table structure and indexes...');
      await this.analyzeTableStructure();

      // Test 5: Query performance analysis
      console.log('5️⃣ Testing query performance...');
      await this.analyzeQueryPerformance();

      // Test 6: Concurrent connection test
      console.log('6️⃣ Testing concurrent connections...');
      await this.testConcurrentConnections();

      // Test 7: UPSERT performance test
      console.log('7️⃣ Testing UPSERT performance...');
      await this.testUpsertPerformance();

      // Generate recommendations
      console.log('8️⃣ Generating recommendations...');
      this.generateRecommendations();

    } catch (error) {
      console.log(`❌ Diagnostic failed: ${error.message}`);
    }
  }

  async testConnectivity() {
    try {
      const start = Date.now();
      const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
      const responseTime = Date.now() - start;
      
      console.log(`   ✅ Response time: ${responseTime}ms`);
      console.log(`   📅 Database time: ${result[0].current_time}`);
      console.log(`   🗄️  PostgreSQL version: ${result[0].pg_version.split(' ')[0]} ${result[0].pg_version.split(' ')[1]}`);
      
      if (responseTime > 500) {
        this.issues.push(`HIGH_LATENCY: ${responseTime}ms response time`);
        console.log(`   ⚠️  High latency detected: ${responseTime}ms`);
      }
      
    } catch (error) {
      this.issues.push(`CONNECTIVITY_FAILED: ${error.message}`);
      console.log(`   ❌ Connectivity failed: ${error.message}`);
    }
  }

  async analyzeConnectionPool() {
    try {
      // Check current connections
      const connections = await sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      
      const conn = connections[0];
      console.log(`   📊 Total connections: ${conn.total_connections}`);
      console.log(`   🔄 Active connections: ${conn.active_connections}`);
      console.log(`   💤 Idle connections: ${conn.idle_connections}`);
      console.log(`   ⏳ Idle in transaction: ${conn.idle_in_transaction}`);
      
      if (parseInt(conn.idle_in_transaction) > 0) {
        this.issues.push(`IDLE_TRANSACTIONS: ${conn.idle_in_transaction} idle transactions detected`);
        console.log(`   ⚠️  Idle transactions detected: ${conn.idle_in_transaction}`);
      }
      
      // Check for long-running queries
      const longQueries = await sql`
        SELECT 
          count(*) as long_running_queries
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '30 seconds'
        AND datname = current_database()
      `;
      
      if (parseInt(longQueries[0].long_running_queries) > 0) {
        this.issues.push(`LONG_QUERIES: ${longQueries[0].long_running_queries} long-running queries`);
        console.log(`   ⚠️  Long-running queries: ${longQueries[0].long_running_queries}`);
      }
      
    } catch (error) {
      this.issues.push(`CONNECTION_ANALYSIS_FAILED: ${error.message}`);
      console.log(`   ❌ Connection analysis failed: ${error.message}`);
    }
  }

  async analyzeDatabaseConfig() {
    try {
      // Check key PostgreSQL settings
      const settings = await sql`
        SELECT name, setting, unit, context 
        FROM pg_settings 
        WHERE name IN (
          'max_connections',
          'shared_buffers',
          'effective_cache_size',
          'work_mem',
          'maintenance_work_mem',
          'checkpoint_completion_target',
          'wal_buffers',
          'default_statistics_target'
        )
        ORDER BY name
      `;
      
      console.log('   📋 Key database settings:');
      settings.forEach(setting => {
        console.log(`      ${setting.name}: ${setting.setting}${setting.unit || ''}`);
      });
      
      // Check for potential issues
      const maxConn = settings.find(s => s.name === 'max_connections');
      if (maxConn && parseInt(maxConn.setting) < 100) {
        this.issues.push(`LOW_MAX_CONNECTIONS: Only ${maxConn.setting} max connections`);
      }
      
    } catch (error) {
      this.issues.push(`CONFIG_ANALYSIS_FAILED: ${error.message}`);
      console.log(`   ❌ Config analysis failed: ${error.message}`);
    }
  }

  async analyzeTableStructure() {
    try {
      // Check table sizes and indexes
      const tableInfo = await sql`
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND tablename IN ('customers', 'vehicles', 'documents')
        ORDER BY tablename, attname
      `;
      
      console.log(`   📊 Found ${tableInfo.length} column statistics`);
      
      // Check indexes
      const indexes = await sql`
        SELECT 
          t.tablename,
          i.indexname,
          i.indexdef
        FROM pg_tables t
        LEFT JOIN pg_indexes i ON t.tablename = i.tablename
        WHERE t.schemaname = 'public' 
        AND t.tablename IN ('customers', 'vehicles', 'documents')
        AND i.indexname IS NOT NULL
        ORDER BY t.tablename, i.indexname
      `;
      
      console.log(`   🔍 Found ${indexes.length} indexes`);
      
      // Check for missing primary key indexes
      const tables = ['customers', 'vehicles', 'documents'];
      const primaryKeys = ['id', 'registration', 'id'];
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const pkColumn = primaryKeys[i];
        const hasIndex = indexes.some(idx => 
          idx.tablename === table && 
          idx.indexdef && 
          idx.indexdef.includes(pkColumn)
        );
        
        if (!hasIndex) {
          this.issues.push(`MISSING_INDEX: ${table} table missing ${pkColumn} index`);
          console.log(`   ⚠️  Missing index on ${table}.${pkColumn}`);
        }
      }
      
    } catch (error) {
      this.issues.push(`TABLE_ANALYSIS_FAILED: ${error.message}`);
      console.log(`   ❌ Table analysis failed: ${error.message}`);
    }
  }

  async analyzeQueryPerformance() {
    try {
      // Test simple SELECT performance
      const start1 = Date.now();
      await sql`SELECT COUNT(*) FROM customers`;
      const selectTime = Date.now() - start1;
      console.log(`   📊 SELECT COUNT performance: ${selectTime}ms`);
      
      if (selectTime > 1000) {
        this.issues.push(`SLOW_SELECT: SELECT COUNT took ${selectTime}ms`);
      }
      
      // Test INSERT performance
      const testId = `test_${Date.now()}`;
      const start2 = Date.now();
      await sql`
        INSERT INTO customers (id, first_name, last_name, email, created_at, updated_at) 
        VALUES (${testId}, 'Test', 'User', 'test@example.com', NOW(), NOW())
      `;
      const insertTime = Date.now() - start2;
      console.log(`   📝 INSERT performance: ${insertTime}ms`);
      
      if (insertTime > 500) {
        this.issues.push(`SLOW_INSERT: INSERT took ${insertTime}ms`);
      }
      
      // Test UPSERT performance
      const start3 = Date.now();
      await sql`
        INSERT INTO customers (id, first_name, last_name, email, created_at, updated_at) 
        VALUES (${testId}, 'Test', 'Updated', 'test@example.com', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          first_name = EXCLUDED.first_name,
          updated_at = NOW()
      `;
      const upsertTime = Date.now() - start3;
      console.log(`   🔄 UPSERT performance: ${upsertTime}ms`);
      
      if (upsertTime > 1000) {
        this.issues.push(`SLOW_UPSERT: UPSERT took ${upsertTime}ms`);
      }
      
      // Clean up test record
      await sql`DELETE FROM customers WHERE id = ${testId}`;
      
    } catch (error) {
      this.issues.push(`QUERY_PERFORMANCE_FAILED: ${error.message}`);
      console.log(`   ❌ Query performance test failed: ${error.message}`);
    }
  }

  async testConcurrentConnections() {
    try {
      console.log('   🔄 Testing 5 concurrent connections...');
      
      const concurrentQueries = Array(5).fill().map((_, i) => 
        sql`SELECT ${i} as query_id, pg_sleep(0.1), NOW() as completed_at`
      );
      
      const start = Date.now();
      const results = await Promise.all(concurrentQueries);
      const concurrentTime = Date.now() - start;
      
      console.log(`   ⚡ Concurrent query time: ${concurrentTime}ms`);
      
      if (concurrentTime > 2000) {
        this.issues.push(`SLOW_CONCURRENT: Concurrent queries took ${concurrentTime}ms`);
      }
      
    } catch (error) {
      this.issues.push(`CONCURRENT_TEST_FAILED: ${error.message}`);
      console.log(`   ❌ Concurrent connection test failed: ${error.message}`);
    }
  }

  async testUpsertPerformance() {
    try {
      console.log('   🔄 Testing batch UPSERT performance...');
      
      const testRecords = Array(10).fill().map((_, i) => ({
        id: `batch_test_${i}`,
        first_name: `Test${i}`,
        last_name: 'Batch',
        email: `test${i}@batch.com`
      }));
      
      const start = Date.now();
      
      // Test individual UPSERTs (simulating our import approach)
      for (const record of testRecords) {
        await sql`
          INSERT INTO customers (id, first_name, last_name, email, created_at, updated_at) 
          VALUES (${record.id}, ${record.first_name}, ${record.last_name}, ${record.email}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET 
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            updated_at = NOW()
        `;
      }
      
      const batchTime = Date.now() - start;
      console.log(`   📦 Batch UPSERT time (10 records): ${batchTime}ms`);
      console.log(`   ⚡ Average per record: ${Math.round(batchTime / 10)}ms`);
      
      if (batchTime > 5000) {
        this.issues.push(`SLOW_BATCH_UPSERT: 10 UPSERTs took ${batchTime}ms`);
      }
      
      // Clean up test records
      for (const record of testRecords) {
        await sql`DELETE FROM customers WHERE id = ${record.id}`;
      }
      
    } catch (error) {
      this.issues.push(`UPSERT_TEST_FAILED: ${error.message}`);
      console.log(`   ❌ UPSERT performance test failed: ${error.message}`);
    }
  }

  generateRecommendations() {
    console.log('\n🎯 DIAGNOSTIC RESULTS');
    console.log('====================');
    
    if (this.issues.length === 0) {
      console.log('✅ No issues detected - database should perform well');
      console.log('🤔 The import deadlock issue may be in the application logic');
      this.recommendations.push('CHECK_APPLICATION_LOGIC');
    } else {
      console.log('⚠️  Issues detected:');
      this.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    
    // Generate specific recommendations based on issues
    if (this.issues.some(i => i.includes('HIGH_LATENCY'))) {
      console.log('   🚀 Consider using connection pooling');
      console.log('   📍 Check your geographic location vs Neon region');
      this.recommendations.push('OPTIMIZE_CONNECTION_POOLING');
    }
    
    if (this.issues.some(i => i.includes('MISSING_INDEX'))) {
      console.log('   🔍 Create missing indexes for better performance');
      this.recommendations.push('CREATE_INDEXES');
    }
    
    if (this.issues.some(i => i.includes('SLOW_UPSERT'))) {
      console.log('   ⚡ UPSERT operations are slow - this explains the import issues');
      console.log('   💡 Consider using bulk operations or smaller batches');
      this.recommendations.push('OPTIMIZE_UPSERT_STRATEGY');
    }
    
    if (this.issues.some(i => i.includes('IDLE_TRANSACTIONS'))) {
      console.log('   🔄 Kill idle transactions to free up connections');
      this.recommendations.push('KILL_IDLE_TRANSACTIONS');
    }
    
    if (this.issues.some(i => i.includes('LONG_QUERIES'))) {
      console.log('   ⏹️  Kill long-running queries that may be blocking imports');
      this.recommendations.push('KILL_LONG_QUERIES');
    }
    
    // Always recommend these for Scale plan
    console.log('   📊 Monitor Neon dashboard for compute usage');
    console.log('   🔧 Consider upgrading compute size if CPU/memory constrained');
    console.log('   ⚡ Use prepared statements for better performance');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('Based on this diagnostic, we can implement targeted fixes');
    console.log('for your specific Neon Scale plan configuration.');
  }
}

// Run the diagnostic
async function runDiagnostic() {
  const diagnostic = new NeonScaleDiagnostic();
  await diagnostic.runDiagnostic();
}

if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { NeonScaleDiagnostic };
