import { Pool } from 'pg';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
try {
  const env = dotenv.config({ path: '.env.local' });
  dotenvExpand.expand(env);
} catch (error) {
  // .env.local might not exist, that's okay if DATABASE_URL is set via environment
}

interface DatabaseComparison {
  source: string;
  customers: number;
  vehicles: number;
  documents: number;
  lineItems: number;
  appointments: number;
  reminders: number;
}

class DatabaseComparator {
  private pool: Pool;
  private googleDrivePath: string;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.googleDrivePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports';
  }

  async getCurrentDatabaseInfo(): Promise<DatabaseComparison> {
    const client = await this.pool.connect();
    
    try {
      console.log('🔍 Analyzing current database connection...');
      
      // Get database connection info
      const dbInfo = await client.query('SELECT current_database() as db_name, version() as version');
      console.log(`   Database: ${dbInfo.rows[0].db_name}`);
      console.log(`   Version: ${dbInfo.rows[0].version.split(' ')[0]}`);
      
      // Get connection details
      const connInfo = await client.query(`
        SELECT 
          inet_server_addr() as server_ip,
          inet_server_port() as server_port,
          current_user as username
      `);
      console.log(`   Server: ${connInfo.rows[0].server_ip || 'localhost'}:${connInfo.rows[0].server_port}`);
      console.log(`   User: ${connInfo.rows[0].username}`);

      // Count records in each table
      const tables = ['customers', 'vehicles', 'documents', 'line_items', 'appointments', 'reminders'];
      const counts: any = {};

      for (const table of tables) {
        try {
          const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          counts[table] = parseInt(result.rows[0].count);
        } catch (error) {
          counts[table] = 0; // Table doesn't exist
        }
      }

      return {
        source: 'Current Neon Database',
        customers: counts.customers,
        vehicles: counts.vehicles,
        documents: counts.documents,
        lineItems: counts.line_items,
        appointments: counts.appointments,
        reminders: counts.reminders,
      };
    } finally {
      client.release();
    }
  }

  async getOriginalFileInfo(): Promise<DatabaseComparison> {
    console.log('🔍 Analyzing original CSV files...');
    console.log(`   Path: ${this.googleDrivePath}`);

    const files = [
      { name: 'Customers.csv', key: 'customers' },
      { name: 'Vehicles.csv', key: 'vehicles' },
      { name: 'Documents.csv', key: 'documents' },
      { name: 'LineItems.csv', key: 'lineItems' },
      { name: 'Appointments.csv', key: 'appointments' },
      { name: 'Reminders.csv', key: 'reminders' },
    ];

    const counts: any = {};

    for (const file of files) {
      const filePath = `${this.googleDrivePath}/${file.name}`;
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim().length > 0);
          // Subtract 1 for header row
          counts[file.key] = Math.max(0, lines.length - 1);
          console.log(`   ${file.name}: ${counts[file.key]} records`);
        } else {
          counts[file.key] = 0;
          console.log(`   ${file.name}: File not found`);
        }
      } catch (error) {
        counts[file.key] = 0;
        console.log(`   ${file.name}: Error reading file`);
      }
    }

    return {
      source: 'Original CSV Files (Google Drive)',
      customers: counts.customers,
      vehicles: counts.vehicles,
      documents: counts.documents,
      lineItems: counts.lineItems,
      appointments: counts.appointments,
      reminders: counts.reminders,
    };
  }

  async sampleDataComparison(): Promise<void> {
    console.log('\n🔍 Sample data comparison...');
    
    const client = await this.pool.connect();
    
    try {
      // Sample customers from database
      const dbCustomers = await client.query(`
        SELECT name, email, phone 
        FROM customers 
        WHERE name IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log('\n📊 Sample customers from current database:');
      dbCustomers.rows.forEach((customer, i) => {
        console.log(`   ${i + 1}. ${customer.name} | ${customer.email || 'No email'} | ${customer.phone || 'No phone'}`);
      });

      // Sample vehicles from database
      const dbVehicles = await client.query(`
        SELECT registration, make, model, year 
        FROM vehicles 
        WHERE registration IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log('\n🚗 Sample vehicles from current database:');
      dbVehicles.rows.forEach((vehicle, i) => {
        console.log(`   ${i + 1}. ${vehicle.registration} | ${vehicle.make} ${vehicle.model} (${vehicle.year || 'Unknown year'})`);
      });

      // Sample from original CSV files
      const customersPath = `${this.googleDrivePath}/Customers.csv`;
      if (fs.existsSync(customersPath)) {
        const csvContent = fs.readFileSync(customersPath, 'utf8');
        const records = parse(csvContent, { 
          columns: true, 
          skip_empty_lines: true,
          delimiter: ','
        });

        console.log('\n📊 Sample customers from original CSV:');
        records.slice(0, 5).forEach((customer: any, i: number) => {
          const name = customer.Name || customer.name || customer.customer_name || 'Unknown';
          const email = customer.Email || customer.email || 'No email';
          const phone = customer.Phone || customer.phone || customer.telephone || 'No phone';
          console.log(`   ${i + 1}. ${name} | ${email} | ${phone}`);
        });
      }

      const vehiclesPath = `${this.googleDrivePath}/Vehicles.csv`;
      if (fs.existsSync(vehiclesPath)) {
        const csvContent = fs.readFileSync(vehiclesPath, 'utf8');
        const records = parse(csvContent, { 
          columns: true, 
          skip_empty_lines: true,
          delimiter: ','
        });

        console.log('\n🚗 Sample vehicles from original CSV:');
        records.slice(0, 5).forEach((vehicle: any, i: number) => {
          const reg = vehicle.Registration || vehicle.registration || vehicle.reg || 'Unknown';
          const make = vehicle.Make || vehicle.make || 'Unknown';
          const model = vehicle.Model || vehicle.model || 'Unknown';
          const year = vehicle.Year || vehicle.year || 'Unknown';
          console.log(`   ${i + 1}. ${reg} | ${make} ${model} (${year})`);
        });
      }

    } finally {
      client.release();
    }
  }

  generateComparisonReport(current: DatabaseComparison, original: DatabaseComparison): void {
    console.log('\n' + '='.repeat(80));
    console.log('DATABASE COMPARISON REPORT');
    console.log('='.repeat(80));

    const formatNumber = (num: number) => num.toLocaleString();

    console.log(`\n📊 RECORD COUNTS COMPARISON:`);
    console.log(`${'Table'.padEnd(15)} | ${'Current DB'.padEnd(12)} | ${'Original CSV'.padEnd(12)} | ${'Difference'.padEnd(12)} | Status`);
    console.log('-'.repeat(80));

    const tables = [
      { key: 'customers', name: 'Customers' },
      { key: 'vehicles', name: 'Vehicles' },
      { key: 'documents', name: 'Documents' },
      { key: 'lineItems', name: 'Line Items' },
      { key: 'appointments', name: 'Appointments' },
      { key: 'reminders', name: 'Reminders' },
    ];

    let totalCurrentRecords = 0;
    let totalOriginalRecords = 0;
    let matchingTables = 0;

    tables.forEach(table => {
      const currentCount = (current as any)[table.key] || 0;
      const originalCount = (original as any)[table.key] || 0;
      const difference = currentCount - originalCount;
      
      totalCurrentRecords += currentCount;
      totalOriginalRecords += originalCount;

      let status = '';
      if (currentCount === originalCount) {
        status = '✅ Match';
        matchingTables++;
      } else if (currentCount > originalCount) {
        status = '📈 More in DB';
      } else if (currentCount === 0 && originalCount > 0) {
        status = '❌ Missing in DB';
      } else {
        status = '📉 Less in DB';
      }

      console.log(
        `${table.name.padEnd(15)} | ${formatNumber(currentCount).padEnd(12)} | ${formatNumber(originalCount).padEnd(12)} | ${difference.toString().padStart(12)} | ${status}`
      );
    });

    console.log('-'.repeat(80));
    console.log(
      `${'TOTAL'.padEnd(15)} | ${formatNumber(totalCurrentRecords).padEnd(12)} | ${formatNumber(totalOriginalRecords).padEnd(12)} | ${(totalCurrentRecords - totalOriginalRecords).toString().padStart(12)} | ${matchingTables}/${tables.length} match`
    );

    console.log('\n🔍 ANALYSIS:');
    
    if (totalCurrentRecords === 0) {
      console.log('❌ Current database appears to be empty or not properly connected');
    } else if (totalOriginalRecords === 0) {
      console.log('❌ Original CSV files not found or empty');
    } else if (matchingTables === tables.length) {
      console.log('✅ Perfect match! Current database matches original CSV files exactly');
    } else {
      console.log(`⚠️  Partial match: ${matchingTables}/${tables.length} tables match exactly`);
      
      if (current.customers > original.customers * 10) {
        console.log('🔍 Current database has significantly more customers - might be a different dataset');
      }
      
      if (current.documents === 0 && original.documents > 0) {
        console.log('📋 Documents table is empty in current database but has data in original CSV');
      }
    }

    console.log('\n💡 RECOMMENDATIONS:');
    if (current.customers !== original.customers) {
      console.log('• Verify if you\'re connected to the correct database');
      console.log('• Check if data has been imported from a different source');
    }
    if (current.documents === 0 && original.documents > 0) {
      console.log('• Consider importing documents data from original CSV files');
    }
    if (current.lineItems === 0 && original.lineItems > 0) {
      console.log('• Consider importing line items data from original CSV files');
    }

    console.log('\n' + '='.repeat(80));
  }

  async runComparison(): Promise<void> {
    console.log('🔍 Starting Database Comparison Analysis...\n');

    try {
      const currentDb = await this.getCurrentDatabaseInfo();
      const originalFiles = await this.getOriginalFileInfo();

      await this.sampleDataComparison();

      this.generateComparisonReport(currentDb, originalFiles);

    } catch (error) {
      console.error('❌ Comparison failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const comparator = new DatabaseComparator();
  
  try {
    await comparator.runComparison();
  } catch (error) {
    console.error('❌ Database comparison failed:', error);
    process.exit(1);
  } finally {
    await comparator.close();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseComparator };
