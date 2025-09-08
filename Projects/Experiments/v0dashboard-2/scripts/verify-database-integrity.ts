import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables (try .env.local first, then fallback to process.env)
try {
  const env = dotenv.config({ path: '.env.local' });
  dotenvExpand.expand(env);
} catch (error) {
  // .env.local might not exist, that's okay if DATABASE_URL is set via environment
}

interface IntegrityResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ForeignKeyInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

class DatabaseIntegrityChecker {
  private pool: Pool;
  private results: IntegrityResult[] = [];

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  private addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
    this.results.push({ category, test, status, message, details });
  }

  private logResult(result: IntegrityResult) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} [${result.category}] ${result.test}: ${result.message}`);
    if (result.details) {
      console.log('   Details:', result.details);
    }
  }

  async checkConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT 1 as test');
      client.release();

      if (result.rows.length > 0 && result.rows[0].test === 1) {
        this.addResult('Connection', 'Database Connection', 'PASS', 'Successfully connected to database');
      } else {
        this.addResult('Connection', 'Database Connection', 'FAIL', 'Unexpected response from database');
      }
    } catch (error) {
      this.addResult('Connection', 'Database Connection', 'FAIL', `Failed to connect: ${error.message}`);
    }
  }

  async checkTablesExist(): Promise<void> {
    const expectedTables = [
      'customers',
      'vehicles',
      'documents',
      'line_items',
      'appointments',
      'reminders',
      'reminder_templates',
      'receipts',
      'stock',
      'document_extras',
      'mot_history'
    ];

    try {
      const client = await this.pool.connect();

      for (const tableName of expectedTables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          ) as exists
        `, [tableName]);

        if (result.rows[0].exists) {
          // Get row count
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = parseInt(countResult.rows[0].count);
          this.addResult('Schema', `Table ${tableName}`, 'PASS', `Table exists with ${count} records`);
        } else {
          this.addResult('Schema', `Table ${tableName}`, 'FAIL', 'Table does not exist');
        }
      }

      client.release();
    } catch (error) {
      this.addResult('Schema', 'Table Existence Check', 'FAIL', `Error checking tables: ${error.message}`);
    }
  }

  async checkTableStructures(): Promise<void> {
    const expectedStructures = {
      customers: [
        { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'name', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'email', data_type: 'text', is_nullable: 'YES' },
        { column_name: 'phone', data_type: 'text', is_nullable: 'YES' },
      ],
      vehicles: [
        { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'customer_id', data_type: 'text', is_nullable: 'YES' },
        { column_name: 'registration', data_type: 'text', is_nullable: 'YES' },
        { column_name: 'make', data_type: 'text', is_nullable: 'YES' },
        { column_name: 'model', data_type: 'text', is_nullable: 'YES' },
      ]
    };

    try {
      const client = await this.pool.connect();

      for (const [tableName, expectedColumns] of Object.entries(expectedStructures)) {
        const result = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        const actualColumns: TableInfo[] = result.rows;

        for (const expectedCol of expectedColumns) {
          const actualCol = actualColumns.find(col => col.column_name === expectedCol.column_name);

          if (!actualCol) {
            this.addResult('Schema', `Column ${tableName}.${expectedCol.column_name}`, 'FAIL', 'Column does not exist');
          } else {
            // Check data type (simplified check)
            const dataTypeMatch = actualCol.data_type.includes(expectedCol.data_type) ||
                                 expectedCol.data_type.includes(actualCol.data_type);

            if (!dataTypeMatch) {
              this.addResult('Schema', `Column ${tableName}.${expectedCol.column_name}`, 'WARNING',
                `Data type mismatch: expected ${expectedCol.data_type}, got ${actualCol.data_type}`);
            } else if (actualCol.is_nullable !== expectedCol.is_nullable) {
              this.addResult('Schema', `Column ${tableName}.${expectedCol.column_name}`, 'WARNING',
                `Nullable constraint mismatch: expected ${expectedCol.is_nullable}, got ${actualCol.is_nullable}`);
            } else {
              this.addResult('Schema', `Column ${tableName}.${expectedCol.column_name}`, 'PASS', 'Column structure correct');
            }
          }
        }
      }

      client.release();
    } catch (error) {
      this.addResult('Schema', 'Table Structure Check', 'FAIL', `Error checking table structures: ${error.message}`);
    }
  }

  async checkForeignKeyConstraints(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // Get all foreign key constraints
      const result = await client.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `);

      const foreignKeys: ForeignKeyInfo[] = result.rows;

      if (foreignKeys.length === 0) {
        this.addResult('Constraints', 'Foreign Keys', 'WARNING', 'No foreign key constraints found');
      } else {
        this.addResult('Constraints', 'Foreign Keys', 'PASS', `Found ${foreignKeys.length} foreign key constraints`);

        // Check for orphaned records
        for (const fk of foreignKeys) {
          const orphanCheck = await client.query(`
            SELECT COUNT(*) as count
            FROM ${fk.table_name} t
            LEFT JOIN ${fk.foreign_table_name} f ON t.${fk.column_name} = f.${fk.foreign_column_name}
            WHERE t.${fk.column_name} IS NOT NULL AND f.${fk.foreign_column_name} IS NULL
          `);

          const orphanCount = parseInt(orphanCheck.rows[0].count);
          if (orphanCount > 0) {
            this.addResult('Data Integrity', `Orphaned Records ${fk.table_name}`, 'FAIL',
              `Found ${orphanCount} orphaned records in ${fk.table_name}.${fk.column_name}`);
          } else {
            this.addResult('Data Integrity', `Orphaned Records ${fk.table_name}`, 'PASS',
              `No orphaned records found`);
          }
        }
      }

      client.release();
    } catch (error) {
      this.addResult('Constraints', 'Foreign Key Check', 'FAIL', `Error checking foreign keys: ${error.message}`);
    }
  }

  async checkIndexes(): Promise<void> {
    try {
      const client = await this.pool.connect();

      const result = await client.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      const indexes = result.rows;
      const expectedIndexes = [
        'idx_vehicles_customer_id',
        'idx_vehicles_registration',
        'idx_documents_customer_id',
        'idx_documents_vehicle_id',
        'idx_line_items_document_id'
      ];

      const foundIndexes = indexes.map(idx => idx.indexname);

      for (const expectedIndex of expectedIndexes) {
        if (foundIndexes.includes(expectedIndex)) {
          this.addResult('Performance', `Index ${expectedIndex}`, 'PASS', 'Index exists');
        } else {
          this.addResult('Performance', `Index ${expectedIndex}`, 'WARNING', 'Expected index missing');
        }
      }

      this.addResult('Performance', 'Total Indexes', 'PASS', `Found ${indexes.length} total indexes`);

      client.release();
    } catch (error) {
      this.addResult('Performance', 'Index Check', 'FAIL', `Error checking indexes: ${error.message}`);
    }
  }

  async checkDataConsistency(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // Check for duplicate vehicle registrations
      const duplicateRegs = await client.query(`
        SELECT registration, COUNT(*) as count
        FROM vehicles
        WHERE registration IS NOT NULL
        GROUP BY registration
        HAVING COUNT(*) > 1
      `);

      if (duplicateRegs.rows.length > 0) {
        this.addResult('Data Integrity', 'Duplicate Vehicle Registrations', 'FAIL',
          `Found ${duplicateRegs.rows.length} duplicate registrations`, duplicateRegs.rows);
      } else {
        this.addResult('Data Integrity', 'Duplicate Vehicle Registrations', 'PASS', 'No duplicate registrations found');
      }

      // Check for invalid dates
      const invalidDates = await client.query(`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE mot_expiry_date IS NOT NULL
        AND (mot_expiry_date < '1900-01-01' OR mot_expiry_date > '2100-01-01')
      `);

      const invalidDateCount = parseInt(invalidDates.rows[0].count);
      if (invalidDateCount > 0) {
        this.addResult('Data Integrity', 'Invalid MOT Dates', 'FAIL',
          `Found ${invalidDateCount} vehicles with invalid MOT expiry dates`);
      } else {
        this.addResult('Data Integrity', 'Invalid MOT Dates', 'PASS', 'All MOT dates are valid');
      }

      // Check for empty required fields
      const emptyNames = await client.query(`
        SELECT COUNT(*) as count
        FROM customers
        WHERE name IS NULL OR name = ''
      `);

      const emptyNameCount = parseInt(emptyNames.rows[0].count);
      if (emptyNameCount > 0) {
        this.addResult('Data Integrity', 'Empty Customer Names', 'FAIL',
          `Found ${emptyNameCount} customers with empty names`);
      } else {
        this.addResult('Data Integrity', 'Empty Customer Names', 'PASS', 'All customers have names');
      }

      client.release();
    } catch (error) {
      this.addResult('Data Integrity', 'Data Consistency Check', 'FAIL', `Error checking data consistency: ${error.message}`);
    }
  }

  async checkBusinessLogic(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // Check vehicle registration format (UK format)
      const invalidRegs = await client.query(`
        SELECT registration, COUNT(*) as count
        FROM vehicles
        WHERE registration IS NOT NULL
        AND registration != ''
        AND NOT (
          registration ~ '^[A-Z]{2}[0-9]{2}[A-Z]{3}$' OR  -- Standard format: AB12CDE
          registration ~ '^[A-Z][0-9]{1,3}[A-Z]{3}$' OR   -- Older format: A123BCD
          registration ~ '^[A-Z]{3}[0-9]{1,3}[A-Z]$'      -- Very old format: ABC123D
        )
        GROUP BY registration
        LIMIT 10
      `);

      if (invalidRegs.rows.length > 0) {
        this.addResult('Business Logic', 'Vehicle Registration Format', 'WARNING',
          `Found ${invalidRegs.rows.length} vehicles with non-standard registration formats`,
          invalidRegs.rows.slice(0, 5));
      } else {
        this.addResult('Business Logic', 'Vehicle Registration Format', 'PASS',
          'All registrations follow expected formats');
      }

      // Check for reasonable vehicle years
      const currentYear = new Date().getFullYear();
      const unreasonableYears = await client.query(`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE year IS NOT NULL
        AND (year < 1900 OR year > $1)
      `, [currentYear + 1]);

      const unreasonableYearCount = parseInt(unreasonableYears.rows[0].count);
      if (unreasonableYearCount > 0) {
        this.addResult('Business Logic', 'Vehicle Years', 'WARNING',
          `Found ${unreasonableYearCount} vehicles with unreasonable years`);
      } else {
        this.addResult('Business Logic', 'Vehicle Years', 'PASS', 'All vehicle years are reasonable');
      }

      client.release();
    } catch (error) {
      this.addResult('Business Logic', 'Business Logic Check', 'FAIL', `Error checking business logic: ${error.message}`);
    }
  }

  async generateSummaryReport(): Promise<void> {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const warningTests = this.results.filter(r => r.status === 'WARNING').length;

    console.log('\n' + '='.repeat(80));
    console.log('DATABASE INTEGRITY VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⚠️  Warnings: ${warningTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   • [${result.category}] ${result.test}: ${result.message}`);
      });
    }

    if (warningTests > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.filter(r => r.status === 'WARNING').forEach(result => {
        console.log(`   • [${result.category}] ${result.test}: ${result.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  async runAllChecks(): Promise<void> {
    console.log('🔍 Starting Database Integrity Verification...\n');

    const checks = [
      { name: 'Connection Test', fn: () => this.checkConnection() },
      { name: 'Table Existence', fn: () => this.checkTablesExist() },
      { name: 'Table Structures', fn: () => this.checkTableStructures() },
      { name: 'Foreign Key Constraints', fn: () => this.checkForeignKeyConstraints() },
      { name: 'Index Verification', fn: () => this.checkIndexes() },
      { name: 'Data Consistency', fn: () => this.checkDataConsistency() },
      { name: 'Business Logic', fn: () => this.checkBusinessLogic() },
    ];

    for (const check of checks) {
      console.log(`\n🔍 Running ${check.name}...`);
      try {
        await check.fn();
        // Log results for this category
        const categoryResults = this.results.filter(r =>
          r.category.toLowerCase().includes(check.name.toLowerCase().split(' ')[0])
        );
        categoryResults.slice(-10).forEach(result => this.logResult(result)); // Show last 10 results
      } catch (error) {
        console.error(`❌ Error in ${check.name}:`, error.message);
        this.addResult('System', check.name, 'FAIL', `Check failed: ${error.message}`);
      }
    }

    await this.generateSummaryReport();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const checker = new DatabaseIntegrityChecker();

  try {
    await checker.runAllChecks();
  } catch (error) {
    console.error('❌ Database integrity check failed:', error);
    process.exit(1);
  } finally {
    await checker.close();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseIntegrityChecker };
