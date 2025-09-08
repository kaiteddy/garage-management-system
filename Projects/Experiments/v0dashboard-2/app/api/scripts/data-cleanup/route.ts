import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🧹 [DATA-CLEANUP] Analyzing data for cleanup opportunities...')

    // 1. Duplicate customers analysis
    const duplicateCustomers = await sql`
      SELECT 
        phone,
        COUNT(*) as duplicate_count,
        STRING_AGG(id::text, ', ') as customer_ids,
        STRING_AGG(first_name || ' ' || last_name, ' | ') as names
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 20
    `

    // 2. Incomplete customer records
    const incompleteCustomers = await sql`
      SELECT
        COUNT(*) as total_incomplete,
        COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as missing_first_name,
        COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as missing_last_name,
        COUNT(CASE WHEN phone IS NULL OR phone = '' THEN 1 END) as missing_phone,
        COUNT(CASE WHEN email IS NULL OR email = '' OR email LIKE '%placeholder%' THEN 1 END) as missing_email
      FROM customers
      WHERE (first_name IS NULL OR first_name = '')
         OR (last_name IS NULL OR last_name = '')
         OR (phone IS NULL OR phone = '')
         OR (email IS NULL OR email = '' OR email LIKE '%placeholder%')
    `

    // 3. Orphaned line items
    const orphanedLineItems = await sql`
      SELECT 
        document_id,
        COUNT(*) as item_count,
        SUM(total_price) as total_value
      FROM document_line_items
      WHERE document_id NOT IN (SELECT id::text FROM documents)
      GROUP BY document_id
      ORDER BY item_count DESC
      LIMIT 10
    `

    // 4. Invalid vehicle registrations
    const invalidRegistrations = await sql`
      SELECT 
        registration,
        make,
        model,
        CASE 
          WHEN LENGTH(REPLACE(registration, ' ', '')) < 3 THEN 'too_short'
          WHEN registration ~ '[^A-Z0-9 ]' THEN 'invalid_characters'
          WHEN registration IS NULL OR registration = '' THEN 'empty'
          ELSE 'other'
        END as issue_type
      FROM vehicles
      WHERE registration IS NULL 
         OR registration = ''
         OR LENGTH(REPLACE(registration, ' ', '')) < 3
         OR registration ~ '[^A-Z0-9 ]'
      LIMIT 20
    `

    // 5. Documents without customers
    const documentsWithoutCustomers = await sql`
      SELECT 
        doc_number,
        doc_type,
        customer_name,
        total_gross,
        doc_date_issued
      FROM documents
      WHERE _id_customer IS NULL
      AND customer_name IS NOT NULL
      AND customer_name != ''
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `

    // 6. Vehicles without basic info
    const incompleteVehicles = await sql`
      SELECT
        COUNT(*) as total_incomplete,
        COUNT(CASE WHEN make IS NULL OR make = '' THEN 1 END) as missing_make,
        COUNT(CASE WHEN model IS NULL OR model = '' THEN 1 END) as missing_model,
        COUNT(CASE WHEN year IS NULL THEN 1 END) as missing_year,
        COUNT(CASE WHEN color IS NULL OR color = '' THEN 1 END) as missing_color
      FROM vehicles
      WHERE (make IS NULL OR make = '')
         OR (model IS NULL OR model = '')
         OR year IS NULL
         OR (color IS NULL OR color = '')
    `

    // 7. Potential data inconsistencies
    const dataInconsistencies = await sql`
      SELECT
        'customer_vehicle_mismatch' as issue_type,
        COUNT(*) as count
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.customer_id != v.owner_id
      UNION ALL
      SELECT
        'future_dates',
        COUNT(*)
      FROM documents
      WHERE doc_date_issued > CURRENT_DATE
      UNION ALL
      SELECT
        'negative_amounts',
        COUNT(*)
      FROM document_line_items
      WHERE total_price < 0
    `

    // Calculate cleanup priority score
    const totalDuplicates = duplicateCustomers.reduce((sum, dup) => sum + parseInt(dup.duplicate_count), 0)
    const totalOrphaned = orphanedLineItems.reduce((sum, item) => sum + parseInt(item.item_count), 0)
    const totalIncomplete = parseInt(incompleteCustomers[0].total_incomplete)

    const cleanupScore = Math.min(100, Math.max(0, 100 - (totalDuplicates + totalOrphaned/100 + totalIncomplete/50)))

    console.log('✅ [DATA-CLEANUP] Analysis completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cleanup_score: Math.round(cleanupScore),
      summary: {
        duplicate_customers: duplicateCustomers.length,
        orphaned_line_items: totalOrphaned,
        incomplete_records: totalIncomplete,
        invalid_registrations: invalidRegistrations.length
      },
      analysis: {
        duplicate_customers: duplicateCustomers,
        incomplete_customers: incompleteCustomers[0],
        orphaned_line_items: orphanedLineItems,
        invalid_registrations: invalidRegistrations,
        documents_without_customers: documentsWithoutCustomers,
        incomplete_vehicles: incompleteVehicles[0],
        data_inconsistencies: dataInconsistencies
      },
      recommendations: generateCleanupRecommendations(duplicateCustomers, totalOrphaned, totalIncomplete)
    })

  } catch (error) {
    console.error('❌ [DATA-CLEANUP] Error:', error)
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
    console.log(`🔧 [DATA-CLEANUP] Executing cleanup action: ${action}`)

    let result = { success: false, message: '', records_affected: 0 }

    switch (action) {
      case 'merge_duplicate_customers':
        result = await mergeDuplicateCustomers(options)
        break
      
      case 'clean_orphaned_line_items':
        result = await cleanOrphanedLineItems(options)
        break
      
      case 'fix_incomplete_customers':
        result = await fixIncompleteCustomers(options)
        break
      
      case 'standardize_registrations':
        result = await standardizeRegistrations(options)
        break
      
      case 'link_documents_to_customers':
        result = await linkDocumentsToCustomers(options)
        break
      
      default:
        throw new Error(`Unknown cleanup action: ${action}`)
    }

    return NextResponse.json({
      success: result.success,
      action,
      message: result.message,
      records_affected: result.records_affected,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [DATA-CLEANUP] Action error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function mergeDuplicateCustomers(options: any) {
  try {
    // Find customers with same phone number
    const duplicates = await sql`
      SELECT phone, ARRAY_AGG(id ORDER BY created_at) as customer_ids
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
      GROUP BY phone
      HAVING COUNT(*) > 1
      LIMIT ${options?.limit || 10}
    `

    let mergedCount = 0

    for (const duplicate of duplicates) {
      const customerIds = duplicate.customer_ids
      const keepId = customerIds[0] // Keep the oldest customer
      const mergeIds = customerIds.slice(1) // Merge the rest

      // Update vehicles to point to the kept customer
      await sql`
        UPDATE vehicles 
        SET customer_id = ${keepId}, owner_id = ${keepId}, updated_at = NOW()
        WHERE customer_id = ANY(${mergeIds}) OR owner_id = ANY(${mergeIds})
      `

      // Update documents to point to the kept customer
      await sql`
        UPDATE documents 
        SET _id_customer = ${keepId}, updated_at = NOW()
        WHERE _id_customer = ANY(${mergeIds})
      `

      // Delete duplicate customers
      await sql`DELETE FROM customers WHERE id = ANY(${mergeIds})`

      mergedCount += mergeIds.length
    }

    return {
      success: true,
      message: `Merged ${mergedCount} duplicate customers`,
      records_affected: mergedCount
    }
  } catch (error) {
    return {
      success: false,
      message: `Error merging customers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      records_affected: 0
    }
  }
}

async function cleanOrphanedLineItems(options: any) {
  try {
    const action = options?.action || 'delete' // 'delete' or 'create_documents'

    if (action === 'delete') {
      const result = await sql`
        DELETE FROM document_line_items
        WHERE document_id NOT IN (SELECT id::text FROM documents)
      `
      
      return {
        success: true,
        message: `Deleted ${result.count} orphaned line items`,
        records_affected: result.count
      }
    } else {
      // Create placeholder documents for orphaned line items
      const orphanedGroups = await sql`
        SELECT document_id, COUNT(*) as item_count, SUM(total_price) as total_value
        FROM document_line_items
        WHERE document_id NOT IN (SELECT id::text FROM documents)
        GROUP BY document_id
        LIMIT ${options?.limit || 50}
      `

      let documentsCreated = 0

      for (const group of orphanedGroups) {
        await sql`
          INSERT INTO documents (
            id, doc_number, doc_type, doc_date_issued, 
            customer_name, total_gross, created_at, updated_at
          ) VALUES (
            ${group.document_id}::uuid,
            'RECOVERED-' || ${group.document_id},
            'Service',
            CURRENT_DATE,
            'Recovered Document',
            ${group.total_value},
            NOW(), NOW()
          )
        `
        documentsCreated++
      }

      return {
        success: true,
        message: `Created ${documentsCreated} placeholder documents for orphaned line items`,
        records_affected: documentsCreated
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error cleaning line items: ${error instanceof Error ? error.message : 'Unknown error'}`,
      records_affected: 0
    }
  }
}

async function fixIncompleteCustomers(options: any) {
  try {
    let fixedCount = 0

    // Fix customers with missing names but have phone
    const nameResult = await sql`
      UPDATE customers 
      SET 
        first_name = CASE WHEN first_name IS NULL OR first_name = '' THEN 'Customer' ELSE first_name END,
        last_name = CASE WHEN last_name IS NULL OR last_name = '' THEN SUBSTRING(phone, -4) ELSE last_name END,
        updated_at = NOW()
      WHERE (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '')
      AND phone IS NOT NULL AND phone != ''
    `
    fixedCount += nameResult.count

    // Fix placeholder emails
    const emailResult = await sql`
      UPDATE customers 
      SET email = NULL, updated_at = NOW()
      WHERE email LIKE '%placeholder%' OR email = ''
    `
    fixedCount += emailResult.count

    return {
      success: true,
      message: `Fixed ${fixedCount} incomplete customer records`,
      records_affected: fixedCount
    }
  } catch (error) {
    return {
      success: false,
      message: `Error fixing customers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      records_affected: 0
    }
  }
}

async function standardizeRegistrations(options: any) {
  try {
    // Standardize vehicle registrations to uppercase and proper spacing
    const result = await sql`
      UPDATE vehicles 
      SET 
        registration = UPPER(TRIM(registration)),
        updated_at = NOW()
      WHERE registration IS NOT NULL 
      AND registration != UPPER(TRIM(registration))
    `

    return {
      success: true,
      message: `Standardized ${result.count} vehicle registrations`,
      records_affected: result.count
    }
  } catch (error) {
    return {
      success: false,
      message: `Error standardizing registrations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      records_affected: 0
    }
  }
}

async function linkDocumentsToCustomers(options: any) {
  try {
    // Link documents to customers based on customer name matching
    const result = await sql`
      UPDATE documents 
      SET _id_customer = c.id, updated_at = NOW()
      FROM customers c
      WHERE documents._id_customer IS NULL
      AND documents.customer_name IS NOT NULL
      AND documents.customer_name != ''
      AND (
        LOWER(documents.customer_name) = LOWER(c.first_name || ' ' || c.last_name)
        OR LOWER(documents.customer_name) = LOWER(c.last_name || ', ' || c.first_name)
        OR LOWER(documents.customer_name) LIKE LOWER('%' || c.last_name || '%')
      )
    `

    return {
      success: true,
      message: `Linked ${result.count} documents to customers`,
      records_affected: result.count
    }
  } catch (error) {
    return {
      success: false,
      message: `Error linking documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      records_affected: 0
    }
  }
}

function generateCleanupRecommendations(duplicates: any[], orphanedCount: number, incompleteCount: number) {
  const recommendations = []

  if (duplicates.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'merge_duplicate_customers',
      message: `${duplicates.length} sets of duplicate customers found`,
      description: 'Merge customers with identical phone numbers to reduce data redundancy'
    })
  }

  if (orphanedCount > 100) {
    recommendations.push({
      priority: 'medium',
      action: 'clean_orphaned_line_items',
      message: `${orphanedCount} orphaned line items without parent documents`,
      description: 'Either create placeholder documents or remove orphaned line items'
    })
  }

  if (incompleteCount > 50) {
    recommendations.push({
      priority: 'low',
      action: 'fix_incomplete_customers',
      message: `${incompleteCount} customers have incomplete information`,
      description: 'Fill in missing names and clean up placeholder data'
    })
  }

  recommendations.push({
    priority: 'maintenance',
    action: 'standardize_registrations',
    message: 'Standardize vehicle registration formats',
    description: 'Ensure consistent uppercase formatting and spacing'
  })

  return recommendations
}
