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

interface RepairAction {
  category: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  message: string;
  recordsAffected?: number;
}

class DatabaseRepairService {
  private pool: Pool;
  private actions: RepairAction[] = [];
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.dryRun = dryRun;
  }

  private addAction(category: string, action: string, status: 'SUCCESS' | 'FAILED' | 'SKIPPED', message: string, recordsAffected?: number) {
    this.actions.push({ category, action, status, message, recordsAffected });
  }

  private logAction(action: RepairAction) {
    const statusIcon = action.status === 'SUCCESS' ? '✅' : action.status === 'FAILED' ? '❌' : '⏭️';
    const dryRunPrefix = this.dryRun ? '[DRY RUN] ' : '';
    console.log(`${statusIcon} ${dryRunPrefix}[${action.category}] ${action.action}: ${action.message}`);
    if (action.recordsAffected !== undefined) {
      console.log(`   Records affected: ${action.recordsAffected}`);
    }
  }

  async createMissingIndexes(): Promise<void> {
    const expectedIndexes = [
      {
        name: 'idx_vehicles_customer_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)'
      },
      {
        name: 'idx_vehicles_registration',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)'
      },
      {
        name: 'idx_documents_customer_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id)'
      },
      {
        name: 'idx_documents_vehicle_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(vehicle_id)'
      },
      {
        name: 'idx_line_items_document_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_line_items_document_id ON line_items(document_id)'
      }
    ];

    try {
      const client = await this.pool.connect();

      // Get existing indexes
      const existingIndexes = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);

      const existingIndexNames = existingIndexes.rows.map(row => row.indexname);

      for (const index of expectedIndexes) {
        if (!existingIndexNames.includes(index.name)) {
          if (!this.dryRun) {
            await client.query(index.sql);
          }
          this.addAction('Performance', `Create Index ${index.name}`, 'SUCCESS',
            `Index ${index.name} ${this.dryRun ? 'would be' : 'was'} created`);
        } else {
          this.addAction('Performance', `Create Index ${index.name}`, 'SKIPPED', 'Index already exists');
        }
      }

      client.release();
    } catch (error) {
      this.addAction('Performance', 'Create Missing Indexes', 'FAILED', `Error: ${error.message}`);
    }
  }

  async cleanupOrphanedRecords(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // Clean up vehicles with invalid customer_id references
      const orphanedVehiclesQuery = `
        SELECT COUNT(*) as count
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.id
        WHERE v.customer_id IS NOT NULL AND c.id IS NULL
      `;

      const orphanedVehicles = await client.query(orphanedVehiclesQuery);
      const orphanedVehicleCount = parseInt(orphanedVehicles.rows[0].count);

      if (orphanedVehicleCount > 0) {
        if (!this.dryRun) {
          const result = await client.query(`
            UPDATE vehicles
            SET customer_id = NULL
            WHERE customer_id IS NOT NULL
            AND customer_id NOT IN (SELECT id FROM customers)
          `);
          this.addAction('Data Integrity', 'Fix Orphaned Vehicles', 'SUCCESS',
            `Fixed ${result.rowCount} orphaned vehicle records`, result.rowCount);
        } else {
          this.addAction('Data Integrity', 'Fix Orphaned Vehicles', 'SUCCESS',
            `Would fix ${orphanedVehicleCount} orphaned vehicle records`, orphanedVehicleCount);
        }
      } else {
        this.addAction('Data Integrity', 'Fix Orphaned Vehicles', 'SKIPPED', 'No orphaned vehicles found');
      }

      // Clean up documents with invalid customer_id references
      const orphanedDocsQuery = `
        SELECT COUNT(*) as count
        FROM documents d
        LEFT JOIN customers c ON d.customer_id = c.id
        WHERE d.customer_id IS NOT NULL AND c.id IS NULL
      `;

      const orphanedDocs = await client.query(orphanedDocsQuery);
      const orphanedDocCount = parseInt(orphanedDocs.rows[0].count);

      if (orphanedDocCount > 0) {
        if (!this.dryRun) {
          const result = await client.query(`
            DELETE FROM documents
            WHERE customer_id IS NOT NULL
            AND customer_id NOT IN (SELECT id FROM customers)
          `);
          this.addAction('Data Integrity', 'Remove Orphaned Documents', 'SUCCESS',
            `Removed ${result.rowCount} orphaned document records`, result.rowCount);
        } else {
          this.addAction('Data Integrity', 'Remove Orphaned Documents', 'SUCCESS',
            `Would remove ${orphanedDocCount} orphaned document records`, orphanedDocCount);
        }
      } else {
        this.addAction('Data Integrity', 'Remove Orphaned Documents', 'SKIPPED', 'No orphaned documents found');
      }

      client.release();
    } catch (error) {
      this.addAction('Data Integrity', 'Cleanup Orphaned Records', 'FAILED', `Error: ${error.message}`);
    }
  }

  async fixDuplicateRegistrations(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // Find duplicate registrations
      const duplicatesQuery = `
        SELECT registration, array_agg(id) as ids, COUNT(*) as count
        FROM vehicles
        WHERE registration IS NOT NULL AND registration != ''
        GROUP BY registration
        HAVING COUNT(*) > 1
      `;

      const duplicates = await client.query(duplicatesQuery);

      if (duplicates.rows.length > 0) {
        let totalFixed = 0;

        for (const duplicate of duplicates.rows) {
          const ids = duplicate.ids;
          const registration = duplicate.registration;

          // Keep the first record, modify others
          for (let i = 1; i < ids.length; i++) {
            const newRegistration = `${registration}_DUP_${i}`;

            if (!this.dryRun) {
              await client.query(
                'UPDATE vehicles SET registration = $1 WHERE id = $2',
                [newRegistration, ids[i]]
              );
            }
            totalFixed++;
          }
        }

        this.addAction('Data Integrity', 'Fix Duplicate Registrations', 'SUCCESS',
          `${this.dryRun ? 'Would fix' : 'Fixed'} ${totalFixed} duplicate registrations`, totalFixed);
      } else {
        this.addAction('Data Integrity', 'Fix Duplicate Registrations', 'SKIPPED', 'No duplicate registrations found');
      }

      client.release();
    } catch (error) {
      this.addAction('Data Integrity', 'Fix Duplicate Registrations', 'FAILED', `Error: ${error.message}`);
    }
  }

  async normalizeVehicleRegistrations(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // Normalize registration formats (uppercase, remove spaces)
      const unnormalizedQuery = `
        SELECT id, registration
        FROM vehicles
        WHERE registration IS NOT NULL
        AND registration != ''
        AND (registration != UPPER(REPLACE(registration, ' ', '')) OR registration ~ '\\s')
      `;

      const unnormalized = await client.query(unnormalizedQuery);

      if (unnormalized.rows.length > 0) {
        let normalizedCount = 0;

        for (const vehicle of unnormalized.rows) {
          const normalizedReg = vehicle.registration.toUpperCase().replace(/\s+/g, '');

          if (!this.dryRun) {
            await client.query(
              'UPDATE vehicles SET registration = $1 WHERE id = $2',
              [normalizedReg, vehicle.id]
            );
          }
          normalizedCount++;
        }

        this.addAction('Data Quality', 'Normalize Vehicle Registrations', 'SUCCESS',
          `${this.dryRun ? 'Would normalize' : 'Normalized'} ${normalizedCount} vehicle registrations`, normalizedCount);
      } else {
        this.addAction('Data Quality', 'Normalize Vehicle Registrations', 'SKIPPED', 'All registrations already normalized');
      }

      client.release();
    } catch (error) {
      this.addAction('Data Quality', 'Normalize Vehicle Registrations', 'FAILED', `Error: ${error.message}`);
    }
  }

  async updateTableStatistics(): Promise<void> {
    try {
      const client = await this.pool.connect();

      const tables = ['customers', 'vehicles', 'documents', 'line_items', 'appointments', 'reminders'];

      if (!this.dryRun) {
        for (const table of tables) {
          try {
            await client.query(`ANALYZE ${table}`);
          } catch (error) {
            // Table might not exist, continue with others
          }
        }
      }

      this.addAction('Performance', 'Update Table Statistics', 'SUCCESS',
        `${this.dryRun ? 'Would update' : 'Updated'} statistics for ${tables.length} tables`);

      client.release();
    } catch (error) {
      this.addAction('Performance', 'Update Table Statistics', 'FAILED', `Error: ${error.message}`);
    }
  }

  async generateRepairReport(): Promise<void> {
    const totalActions = this.actions.length;
    const successfulActions = this.actions.filter(a => a.status === 'SUCCESS').length;
    const failedActions = this.actions.filter(a => a.status === 'FAILED').length;
    const skippedActions = this.actions.filter(a => a.status === 'SKIPPED').length;

    console.log('\n' + '='.repeat(80));
    console.log(`DATABASE REPAIR ${this.dryRun ? '(DRY RUN) ' : ''}SUMMARY`);
    console.log('='.repeat(80));
    console.log(`Total Actions: ${totalActions}`);
    console.log(`✅ Successful: ${successfulActions}`);
    console.log(`❌ Failed: ${failedActions}`);
    console.log(`⏭️  Skipped: ${skippedActions}`);

    if (this.dryRun) {
      console.log('\n💡 This was a DRY RUN - no changes were made to the database.');
      console.log('   Run with --execute flag to apply the changes.');
    }

    if (failedActions > 0) {
      console.log('\n❌ FAILED ACTIONS:');
      this.actions.filter(a => a.status === 'FAILED').forEach(action => {
        console.log(`   • [${action.category}] ${action.action}: ${action.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  async runAllRepairs(): Promise<void> {
    console.log(`🔧 Starting Database Repair ${this.dryRun ? '(DRY RUN)' : ''}...\n`);

    const repairs = [
      { name: 'Create Missing Indexes', fn: () => this.createMissingIndexes() },
      { name: 'Cleanup Orphaned Records', fn: () => this.cleanupOrphanedRecords() },
      { name: 'Fix Duplicate Registrations', fn: () => this.fixDuplicateRegistrations() },
      { name: 'Normalize Vehicle Registrations', fn: () => this.normalizeVehicleRegistrations() },
      { name: 'Update Table Statistics', fn: () => this.updateTableStatistics() },
    ];

    for (const repair of repairs) {
      console.log(`\n🔧 ${repair.name}...`);
      try {
        await repair.fn();
        // Log recent actions for this repair
        const recentActions = this.actions.slice(-5);
        recentActions.forEach(action => this.logAction(action));
      } catch (error) {
        console.error(`❌ Error in ${repair.name}:`, error.message);
        this.addAction('System', repair.name, 'FAILED', `Repair failed: ${error.message}`);
      }
    }

    await this.generateRepairReport();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('-e');
  const dryRun = !execute;

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
    console.log('   Use --execute flag to apply repairs\n');
  }

  const repairer = new DatabaseRepairService(dryRun);

  try {
    await repairer.runAllRepairs();
  } catch (error) {
    console.error('❌ Database repair failed:', error);
    process.exit(1);
  } finally {
    await repairer.close();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseRepairService };
