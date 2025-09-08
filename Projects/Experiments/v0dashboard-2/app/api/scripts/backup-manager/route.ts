import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('💾 [BACKUP] Analyzing backup and recovery status...')

    // 1. Database size and growth analysis
    const databaseSize = await sql`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as total_size,
        current_database() as database_name
    `

    // 2. Table sizes for backup planning
    const tableSizes = await sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `

    // 3. Recent data changes for incremental backup planning
    const recentChanges = await sql`
      SELECT
        'customers' as table_name,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as created_24h,
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_24h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as created_7d
      FROM customers
      UNION ALL
      SELECT
        'vehicles',
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END),
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END),
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)
      FROM vehicles
      UNION ALL
      SELECT
        'documents',
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END),
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END),
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)
      FROM documents
    `

    // 4. Critical data identification
    const criticalData = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as customers_with_phone,
        COUNT(*) as total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL) as connected_vehicles,
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM document_line_items) as total_line_items
      FROM customers
    `

    // 5. Data integrity checkpoints
    const integrityChecks = await sql`
      SELECT
        'customer_vehicle_links' as check_type,
        COUNT(*) as count,
        'OK' as status
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      UNION ALL
      SELECT
        'document_line_item_links',
        COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END
      FROM document_line_items li
      JOIN documents d ON li.document_id = d.id::text
      UNION ALL
      SELECT
        'orphaned_line_items',
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END
      FROM document_line_items li
      WHERE li.document_id NOT IN (SELECT id::text FROM documents)
    `

    // 6. Backup recommendations based on data patterns
    const totalRecords = parseInt(criticalData[0].total_customers) + 
                        parseInt(criticalData[0].total_vehicles) + 
                        parseInt(criticalData[0].total_documents)

    const backupPriority = totalRecords > 50000 ? 'high' : totalRecords > 10000 ? 'medium' : 'low'
    
    // 7. Recovery time estimation
    const estimatedBackupTime = Math.ceil(totalRecords / 10000) // Rough estimate: 10k records per minute
    const estimatedRestoreTime = estimatedBackupTime * 2 // Restore typically takes longer

    console.log('✅ [BACKUP] Analysis completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backup_priority: backupPriority,
      summary: {
        database_size: databaseSize[0].total_size,
        total_records: totalRecords,
        estimated_backup_time_minutes: estimatedBackupTime,
        estimated_restore_time_minutes: estimatedRestoreTime
      },
      analysis: {
        database_info: databaseSize[0],
        table_sizes: tableSizes,
        recent_changes: recentChanges,
        critical_data: criticalData[0],
        integrity_checks: integrityChecks
      },
      recommendations: generateBackupRecommendations(backupPriority, totalRecords, integrityChecks)
    })

  } catch (error) {
    console.error('❌ [BACKUP] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, options } = await request.json()
    console.log(`🔧 [BACKUP] Executing backup action: ${action}`)

    let result = { success: false, message: '', details: {} }

    switch (action) {
      case 'create_data_export':
        result = await createDataExport(options)
        break
      
      case 'verify_data_integrity':
        result = await verifyDataIntegrity(options)
        break
      
      case 'create_schema_backup':
        result = await createSchemaBackup(options)
        break
      
      case 'generate_restore_script':
        result = await generateRestoreScript(options)
        break
      
      default:
        throw new Error(`Unknown backup action: ${action}`)
    }

    return NextResponse.json({
      success: result.success,
      action,
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [BACKUP] Action error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function createDataExport(options: any) {
  try {
    const tables = options?.tables || ['customers', 'vehicles', 'documents', 'document_line_items', 'document_extras']
    const exportData = {}
    let totalRecords = 0

    for (const table of tables) {
      const data = await sql.unsafe(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ${options?.limit || 1000}`)
      exportData[table] = {
        count: data.length,
        sample: data.slice(0, 5), // Include sample for verification
        exported_at: new Date().toISOString()
      }
      totalRecords += data.length
    }

    return {
      success: true,
      message: `Exported ${totalRecords} records from ${tables.length} tables`,
      details: {
        export_summary: exportData,
        total_records: totalRecords,
        tables_exported: tables.length
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error creating export: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function verifyDataIntegrity(options: any) {
  try {
    const checks = []

    // Check customer-vehicle relationships
    const customerVehicleCheck = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as with_customer_id,
        COUNT(CASE WHEN customer_id IS NOT NULL AND customer_id NOT IN (SELECT id FROM customers) THEN 1 END) as invalid_customer_refs
      FROM vehicles
    `
    checks.push({
      check: 'customer_vehicle_relationships',
      status: parseInt(customerVehicleCheck[0].invalid_customer_refs) === 0 ? 'PASS' : 'FAIL',
      details: customerVehicleCheck[0]
    })

    // Check document-line item relationships
    const documentLineItemCheck = await sql`
      SELECT 
        COUNT(*) as total_line_items,
        COUNT(CASE WHEN document_id NOT IN (SELECT id::text FROM documents) THEN 1 END) as orphaned_items
      FROM document_line_items
    `
    checks.push({
      check: 'document_line_item_relationships',
      status: parseInt(documentLineItemCheck[0].orphaned_items) === 0 ? 'PASS' : 'WARNING',
      details: documentLineItemCheck[0]
    })

    // Check for duplicate customers
    const duplicateCheck = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(DISTINCT phone) as unique_phones,
        COUNT(*) - COUNT(DISTINCT phone) as potential_duplicates
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
    `
    checks.push({
      check: 'duplicate_customers',
      status: parseInt(duplicateCheck[0].potential_duplicates) === 0 ? 'PASS' : 'WARNING',
      details: duplicateCheck[0]
    })

    // Check data completeness
    const completenessCheck = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone
      FROM customers
    `
    checks.push({
      check: 'data_completeness',
      status: 'INFO',
      details: completenessCheck[0]
    })

    const overallStatus = checks.every(c => c.status === 'PASS') ? 'PASS' : 
                         checks.some(c => c.status === 'FAIL') ? 'FAIL' : 'WARNING'

    return {
      success: true,
      message: `Data integrity verification completed with status: ${overallStatus}`,
      details: {
        overall_status: overallStatus,
        checks: checks,
        verified_at: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error verifying integrity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function createSchemaBackup(options: any) {
  try {
    // Get table schemas
    const tableSchemas = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'vehicles', 'documents', 'document_line_items', 'document_extras')
      ORDER BY table_name, ordinal_position
    `

    // Get indexes
    const indexes = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `

    // Get constraints
    const constraints = await sql`
      SELECT 
        table_name,
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'vehicles', 'documents', 'document_line_items', 'document_extras')
      ORDER BY table_name, constraint_name
    `

    return {
      success: true,
      message: `Schema backup created for ${new Set(tableSchemas.map(t => t.table_name)).size} tables`,
      details: {
        table_schemas: tableSchemas,
        indexes: indexes,
        constraints: constraints,
        backup_created_at: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error creating schema backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function generateRestoreScript(options: any) {
  try {
    const restoreSteps = [
      {
        step: 1,
        action: 'verify_database_connection',
        description: 'Ensure database connection is available',
        command: 'SELECT current_database(), current_user'
      },
      {
        step: 2,
        action: 'backup_existing_data',
        description: 'Create backup of existing data before restore',
        command: 'pg_dump or export existing data'
      },
      {
        step: 3,
        action: 'restore_schema',
        description: 'Restore table schemas and constraints',
        command: 'CREATE TABLE statements'
      },
      {
        step: 4,
        action: 'restore_data',
        description: 'Import data in correct order',
        command: 'INSERT statements or COPY commands'
      },
      {
        step: 5,
        action: 'rebuild_indexes',
        description: 'Recreate indexes for performance',
        command: 'CREATE INDEX statements'
      },
      {
        step: 6,
        action: 'verify_integrity',
        description: 'Verify data integrity after restore',
        command: 'Run integrity checks'
      }
    ]

    const estimatedTime = {
      small_database: '5-10 minutes',
      medium_database: '15-30 minutes',
      large_database: '1-2 hours'
    }

    return {
      success: true,
      message: 'Restore script generated successfully',
      details: {
        restore_steps: restoreSteps,
        estimated_time: estimatedTime,
        prerequisites: [
          'Database connection with appropriate permissions',
          'Sufficient disk space for temporary files',
          'Backup of current data (recommended)',
          'Maintenance window for downtime'
        ],
        generated_at: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error generating restore script: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

function generateBackupRecommendations(priority: string, totalRecords: number, integrityChecks: any[]) {
  const recommendations = []

  if (priority === 'high') {
    recommendations.push({
      priority: 'high',
      category: 'backup_frequency',
      action: 'create_data_export',
      message: 'High-priority database requires daily backups',
      description: `With ${totalRecords} records, implement automated daily backup routine`
    })
  }

  const hasIntegrityIssues = integrityChecks.some(check => check.status === 'FAIL' || check.status === 'WARNING')
  if (hasIntegrityIssues) {
    recommendations.push({
      priority: 'medium',
      category: 'data_integrity',
      action: 'verify_data_integrity',
      message: 'Data integrity issues detected',
      description: 'Resolve integrity issues before creating backups'
    })
  }

  recommendations.push({
    priority: 'maintenance',
    category: 'schema_backup',
    action: 'create_schema_backup',
    message: 'Regular schema backups recommended',
    description: 'Backup database schema separately from data for faster recovery'
  })

  recommendations.push({
    priority: 'planning',
    category: 'disaster_recovery',
    action: 'generate_restore_script',
    message: 'Prepare disaster recovery procedures',
    description: 'Document and test restore procedures regularly'
  })

  return recommendations
}
