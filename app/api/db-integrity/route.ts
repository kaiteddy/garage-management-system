import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a new connection pool
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Test basic connection
    const connectionTest = await sql`SELECT 1 as test`;

    // Check all table counts
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
    const documentCount = await sql`SELECT COUNT(*) as count FROM documents`;
    const motHistoryCount = await sql`SELECT COUNT(*) as count FROM mot_history`;

    // Check for any data in any table
    const tableStats = await sql`
      SELECT
        schemaname,
        relname as tablename,
        n_tup_ins as total_inserts,
        n_tup_upd as total_updates,
        n_tup_del as total_deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;

    // Get sample data from vehicles if any exist
    let sampleVehicles = [];
    if (vehicleCount[0]?.count > 0) {
      sampleVehicles = await sql`
        SELECT registration, make, model, mot_expiry_date, created_at, updated_at
        FROM vehicles
        ORDER BY created_at DESC
        LIMIT 5
      `;
    }

    // Get sample data from customers if any exist
    let sampleCustomers = [];
    if (customerCount[0]?.count > 0) {
      sampleCustomers = await sql`
        SELECT *
        FROM customers
        ORDER BY id DESC
        LIMIT 5
      `;
    }

    // Check database size and activity
    const dbInfo = await sql`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        current_database() as database_name,
        current_user as current_user,
        version() as postgres_version
    `;

    return NextResponse.json({
      success: true,
      connection: connectionTest,
      counts: {
        vehicles: parseInt(vehicleCount[0]?.count || '0'),
        customers: parseInt(customerCount[0]?.count || '0'),
        documents: parseInt(documentCount[0]?.count || '0'),
        motHistory: parseInt(motHistoryCount[0]?.count || '0')
      },
      tableStats,
      sampleData: {
        vehicles: sampleVehicles,
        customers: sampleCustomers
      },
      databaseInfo: dbInfo[0]
    });

  } catch (error) {
    console.error('Database integrity check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database integrity check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
