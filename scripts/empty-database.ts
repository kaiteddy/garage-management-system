import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
try {
  const env = dotenv.config({ path: '.env.local' });
  dotenvExpand.expand(env);
} catch (error) {
  // .env.local might not exist, that's okay if DATABASE_URL is set via environment
}

class DatabaseCleaner {
  private pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async confirmDatabaseConnection(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const dbInfo = await client.query('SELECT current_database() as db_name, current_user as username');
      console.log(`🔍 Connected to database: ${dbInfo.rows[0].db_name}`);
      console.log(`   User: ${dbInfo.rows[0].username}`);
      
      // Get connection details to confirm we're on the right database
      const connInfo = await client.query(`
        SELECT 
          inet_server_addr() as server_ip,
          inet_server_port() as server_port
      `);
      console.log(`   Server: ${connInfo.rows[0].server_ip || 'localhost'}:${connInfo.rows[0].server_port}`);
      
    } finally {
      client.release();
    }
  }

  async getTableCounts(): Promise<Record<string, number>> {
    const client = await this.pool.connect();
    const counts: Record<string, number> = {};
    
    try {
      // Get all tables in the public schema
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      console.log('📊 Current table record counts:');
      
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = parseInt(countResult.rows[0].count);
          counts[tableName] = count;
          console.log(`   ${tableName.padEnd(20)}: ${count.toLocaleString()} records`);
        } catch (error) {
          counts[tableName] = -1;
          console.log(`   ${tableName.padEnd(20)}: Error reading table`);
        }
      }

      const totalRecords = Object.values(counts).filter(c => c >= 0).reduce((sum, count) => sum + count, 0);
      console.log(`   ${'TOTAL'.padEnd(20)}: ${totalRecords.toLocaleString()} records`);
      
    } finally {
      client.release();
    }

    return counts;
  }

  async dropAllTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🗑️  Dropping all tables...');
      
      // Get all tables with their dependencies
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      if (tablesResult.rows.length === 0) {
        console.log('   No tables found to drop');
        return;
      }

      // Drop all tables with CASCADE to handle foreign key constraints
      await client.query('BEGIN');
      
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        try {
          await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
          console.log(`   ✅ Dropped table: ${tableName}`);
        } catch (error) {
          console.log(`   ❌ Failed to drop table: ${tableName} - ${error.message}`);
        }
      }

      await client.query('COMMIT');
      console.log('   🎉 All tables dropped successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error dropping tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async dropAllSequences(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🔢 Dropping all sequences...');
      
      const sequencesResult = await client.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
      `);

      if (sequencesResult.rows.length === 0) {
        console.log('   No sequences found to drop');
        return;
      }

      for (const row of sequencesResult.rows) {
        const sequenceName = row.sequence_name;
        try {
          await client.query(`DROP SEQUENCE IF EXISTS ${sequenceName} CASCADE`);
          console.log(`   ✅ Dropped sequence: ${sequenceName}`);
        } catch (error) {
          console.log(`   ❌ Failed to drop sequence: ${sequenceName} - ${error.message}`);
        }
      }
      
    } finally {
      client.release();
    }
  }

  async dropAllViews(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n👁️  Dropping all views...');
      
      const viewsResult = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
      `);

      if (viewsResult.rows.length === 0) {
        console.log('   No views found to drop');
        return;
      }

      for (const row of viewsResult.rows) {
        const viewName = row.table_name;
        try {
          await client.query(`DROP VIEW IF EXISTS ${viewName} CASCADE`);
          console.log(`   ✅ Dropped view: ${viewName}`);
        } catch (error) {
          console.log(`   ❌ Failed to drop view: ${viewName} - ${error.message}`);
        }
      }
      
    } finally {
      client.release();
    }
  }

  async dropAllFunctions(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n⚙️  Dropping all functions...');
      
      const functionsResult = await client.query(`
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      `);

      if (functionsResult.rows.length === 0) {
        console.log('   No functions found to drop');
        return;
      }

      for (const row of functionsResult.rows) {
        const functionName = row.routine_name;
        try {
          await client.query(`DROP FUNCTION IF EXISTS ${functionName} CASCADE`);
          console.log(`   ✅ Dropped function: ${functionName}`);
        } catch (error) {
          console.log(`   ❌ Failed to drop function: ${functionName} - ${error.message}`);
        }
      }
      
    } finally {
      client.release();
    }
  }

  async verifyCleanDatabase(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🔍 Verifying database is clean...');
      
      // Check for remaining tables
      const tablesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const tableCount = parseInt(tablesResult.rows[0].count);
      
      // Check for remaining sequences
      const sequencesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
      `);
      
      const sequenceCount = parseInt(sequencesResult.rows[0].count);
      
      // Check for remaining views
      const viewsResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.views 
        WHERE table_schema = 'public'
      `);
      
      const viewCount = parseInt(viewsResult.rows[0].count);

      console.log(`   Tables remaining: ${tableCount}`);
      console.log(`   Sequences remaining: ${sequenceCount}`);
      console.log(`   Views remaining: ${viewCount}`);
      
      if (tableCount === 0 && sequenceCount === 0 && viewCount === 0) {
        console.log('   ✅ Database is completely clean!');
      } else {
        console.log('   ⚠️  Some objects may still remain');
      }
      
    } finally {
      client.release();
    }
  }

  async performCompleteCleanup(): Promise<void> {
    console.log('🧹 Starting Complete Database Cleanup...\n');

    try {
      // Confirm connection and show current state
      await this.confirmDatabaseConnection();
      
      console.log('\n📊 BEFORE CLEANUP:');
      const beforeCounts = await this.getTableCounts();
      
      const totalRecords = Object.values(beforeCounts).filter(c => c >= 0).reduce((sum, count) => sum + count, 0);
      
      if (totalRecords === 0) {
        console.log('\n✅ Database is already empty - nothing to clean!');
        return;
      }

      console.log(`\n⚠️  WARNING: About to delete ${totalRecords.toLocaleString()} records from ${Object.keys(beforeCounts).length} tables!`);
      console.log('   This action cannot be undone.');
      
      // Perform cleanup in order
      await this.dropAllViews();
      await this.dropAllFunctions();
      await this.dropAllTables();
      await this.dropAllSequences();
      
      // Verify cleanup
      await this.verifyCleanDatabase();
      
      console.log('\n🎉 Database cleanup completed successfully!');
      console.log('   The database is now completely empty and ready for fresh data.');
      
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const forceClean = args.includes('--force') || args.includes('-f');
  
  if (!forceClean) {
    console.log('🚨 DANGER: This will completely empty the database!');
    console.log('   Use --force flag to confirm you want to proceed');
    console.log('   Example: npx tsx scripts/empty-database.ts --force');
    process.exit(1);
  }

  const cleaner = new DatabaseCleaner();
  
  try {
    await cleaner.performCompleteCleanup();
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  } finally {
    await cleaner.close();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseCleaner };
