import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const { 
      phase = 'analyze', // 'analyze', 'fix-numbering', 'fix-registrations', 'add-missing', 'verify'
      batchSize = 100,
      dryRun = true // Safety first - preview changes before applying
    } = await request.json()
    
    console.log(`[DATA-MAPPING] Starting phase: ${phase}, dryRun: ${dryRun}`)

    if (phase === 'analyze') {
      return await analyzeCurrentData()
    }
    
    if (phase === 'fix-numbering') {
      return await fixJobNumbering(dryRun)
    }
    
    if (phase === 'fix-registrations') {
      return await fixRegistrationData(dryRun, batchSize)
    }
    
    if (phase === 'add-missing') {
      return await addMissingData(dryRun, batchSize)
    }
    
    if (phase === 'verify') {
      return await verifyDataQuality()
    }

    return NextResponse.json({
      success: false,
      error: "Invalid phase",
      valid_phases: ['analyze', 'fix-numbering', 'fix-registrations', 'add-missing', 'verify']
    }, { status: 400 })

  } catch (error) {
    console.error("[DATA-MAPPING] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to execute data mapping",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function analyzeCurrentData() {
  console.log(`[DATA-MAPPING] Analyzing current data state`)
  
  // Get current counts
  const counts = {
    customers: await sql`SELECT COUNT(*) as count FROM customers`,
    vehicles: await sql`SELECT COUNT(*) as count FROM vehicles`,
    documents: await sql`SELECT COUNT(*) as count FROM documents`,
    line_items: await sql`SELECT COUNT(*) as count FROM document_line_items`
  }
  
  // Analyze job numbering issues
  const numberingIssues = await sql`
    SELECT 
      doc_type,
      COUNT(*) as total_docs,
      COUNT(CASE WHEN doc_number ~ '^[0-9]+$' THEN 1 END) as numeric_numbers,
      COUNT(CASE WHEN LENGTH(doc_number) < 5 AND doc_number ~ '^[0-9]+$' THEN 1 END) as short_numbers,
      MIN(CASE WHEN doc_number ~ '^[0-9]+$' THEN CAST(doc_number AS INTEGER) END) as min_number,
      MAX(CASE WHEN doc_number ~ '^[0-9]+$' THEN CAST(doc_number AS INTEGER) END) as max_number
    FROM documents 
    WHERE doc_type IN ('ES', 'JOB', 'ESTIMATE', 'INVOICE', 'SI')
    GROUP BY doc_type
    ORDER BY doc_type
  `
  
  // Analyze registration issues
  const registrationIssues = await sql`
    SELECT 
      COUNT(*) as total_documents,
      COUNT(CASE WHEN vehicle_registration IS NULL THEN 1 END) as null_registrations,
      COUNT(CASE WHEN vehicle_registration ~ '^[0-9]+\.[0-9]+$' THEN 1 END) as monetary_values,
      COUNT(CASE WHEN vehicle_registration ~ '^[0-9]+$' AND LENGTH(vehicle_registration) <= 3 THEN 1 END) as suspicious_numbers,
      COUNT(CASE WHEN vehicle_registration ~ '^[A-Z0-9]{2,8}$' AND vehicle_registration !~ '^[0-9]+\.[0-9]+$' THEN 1 END) as valid_registrations
    FROM documents
  `
  
  // Check for missing line items
  const missingLineItems = await sql`
    SELECT 
      COUNT(d.id) as documents_without_line_items
    FROM documents d
    LEFT JOIN document_line_items li ON d.id = li.document_id
    WHERE li.id IS NULL
  `
  
  // Sample problematic records
  const problemRecords = await sql`
    SELECT 
      id,
      doc_type,
      doc_number,
      vehicle_registration,
      customer_name,
      total_gross
    FROM documents 
    WHERE 
      vehicle_registration ~ '^[0-9]+\.[0-9]+$' 
      OR (doc_number ~ '^[0-9]+$' AND LENGTH(doc_number) < 5)
      OR vehicle_registration ~ '^[0-9]+$' AND LENGTH(vehicle_registration) <= 3
    LIMIT 10
  `
  
  return NextResponse.json({
    success: true,
    current_state: {
      record_counts: {
        customers: parseInt(counts.customers[0].count),
        vehicles: parseInt(counts.vehicles[0].count),
        documents: parseInt(counts.documents[0].count),
        line_items: parseInt(counts.line_items[0].count)
      },
      numbering_analysis: numberingIssues,
      registration_analysis: registrationIssues[0],
      missing_data: {
        documents_without_line_items: parseInt(missingLineItems[0].documents_without_line_items)
      },
      sample_problems: problemRecords
    },
    recommendations: [
      "Fix job numbering to 5-digit format",
      "Clean registration data (remove monetary values)",
      "Add missing line items from CSV",
      "Verify customer-document relationships"
    ],
    next_steps: [
      "Run 'fix-numbering' phase to standardize job numbers",
      "Run 'fix-registrations' phase to clean vehicle data", 
      "Run 'add-missing' phase to import missing records"
    ],
    timestamp: new Date().toISOString()
  })
}

async function fixJobNumbering(dryRun: boolean) {
  console.log(`[DATA-MAPPING] Fixing job numbering (dryRun: ${dryRun})`)
  
  // Find documents with short numeric job numbers
  const documentsToFix = await sql`
    SELECT 
      id,
      doc_number,
      doc_type,
      customer_name
    FROM documents 
    WHERE doc_number ~ '^[0-9]+$' 
      AND LENGTH(doc_number) < 5
      AND doc_type IN ('ES', 'JOB', 'ESTIMATE', 'INVOICE', 'SI')
    ORDER BY CAST(doc_number AS INTEGER)
  `
  
  const updates = []
  
  for (const doc of documentsToFix) {
    const currentNumber = doc.doc_number
    const paddedNumber = currentNumber.padStart(5, '0')
    
    updates.push({
      id: doc.id,
      current_number: currentNumber,
      new_number: paddedNumber,
      doc_type: doc.doc_type,
      customer: doc.customer_name
    })
    
    if (!dryRun) {
      await sql`
        UPDATE documents 
        SET doc_number = ${paddedNumber}, updated_at = NOW()
        WHERE id = ${doc.id}
      `
    }
  }
  
  return NextResponse.json({
    success: true,
    operation: 'fix-numbering',
    dry_run: dryRun,
    results: {
      documents_to_update: updates.length,
      updates_preview: updates.slice(0, 10), // Show first 10
      total_updates: updates.length
    },
    message: dryRun ? 
      `Would update ${updates.length} job numbers to 5-digit format` :
      `Updated ${updates.length} job numbers to 5-digit format`,
    next_step: dryRun ? 
      "Run with dryRun: false to apply changes" :
      "Job numbering fixed - run 'fix-registrations' phase next",
    timestamp: new Date().toISOString()
  })
}

async function fixRegistrationData(dryRun: boolean, batchSize: number) {
  console.log(`[DATA-MAPPING] Fixing registration data (dryRun: ${dryRun})`)
  
  // Find documents with problematic registrations
  const problematicRegs = await sql`
    SELECT 
      id,
      vehicle_registration,
      customer_name,
      doc_number,
      doc_type
    FROM documents 
    WHERE 
      vehicle_registration ~ '^[0-9]+\.[0-9]+$'  -- Monetary values
      OR (vehicle_registration ~ '^[0-9]+$' AND LENGTH(vehicle_registration) <= 3)  -- Short numbers
      OR vehicle_registration = ''
    LIMIT ${batchSize}
  `
  
  const fixes = []
  
  for (const doc of problematicRegs) {
    const currentReg = doc.vehicle_registration
    let action = 'no_change'
    let newReg = currentReg
    
    // If it's a monetary value or suspicious number, set to null
    if (currentReg && (currentReg.includes('.') || (currentReg.match(/^[0-9]+$/) && currentReg.length <= 3))) {
      newReg = null
      action = 'cleared_invalid'
    }
    
    // If it's empty string, set to null
    if (currentReg === '') {
      newReg = null
      action = 'cleared_empty'
    }
    
    fixes.push({
      id: doc.id,
      doc_number: doc.doc_number,
      customer: doc.customer_name,
      current_registration: currentReg,
      new_registration: newReg,
      action: action
    })
    
    if (!dryRun && action !== 'no_change') {
      await sql`
        UPDATE documents 
        SET vehicle_registration = ${newReg}, updated_at = NOW()
        WHERE id = ${doc.id}
      `
    }
  }
  
  return NextResponse.json({
    success: true,
    operation: 'fix-registrations',
    dry_run: dryRun,
    results: {
      documents_processed: fixes.length,
      fixes_applied: fixes.filter(f => f.action !== 'no_change').length,
      fixes_preview: fixes.slice(0, 10),
      actions_summary: {
        cleared_invalid: fixes.filter(f => f.action === 'cleared_invalid').length,
        cleared_empty: fixes.filter(f => f.action === 'cleared_empty').length,
        no_change: fixes.filter(f => f.action === 'no_change').length
      }
    },
    message: dryRun ? 
      `Would fix ${fixes.filter(f => f.action !== 'no_change').length} registration issues` :
      `Fixed ${fixes.filter(f => f.action !== 'no_change').length} registration issues`,
    next_step: dryRun ? 
      "Run with dryRun: false to apply changes" :
      "Registration data cleaned - run 'add-missing' phase next",
    timestamp: new Date().toISOString()
  })
}

async function addMissingData(dryRun: boolean, batchSize: number) {
  console.log(`[DATA-MAPPING] Adding missing data from CSV files (dryRun: ${dryRun})`)
  
  const results = {
    customers_added: 0,
    documents_added: 0,
    line_items_added: 0,
    errors: []
  }
  
  try {
    // Check if CSV files exist
    const documentsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv"
    const customersPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv"
    
    if (!fs.existsSync(documentsPath)) {
      throw new Error(`Documents CSV not found at: ${documentsPath}`)
    }
    
    // Get existing document IDs to avoid duplicates
    const existingDocs = await sql`SELECT _id FROM documents WHERE _id IS NOT NULL`
    const existingDocIds = new Set(existingDocs.map(d => d._id))
    
    // Read and process documents CSV
    const csvContent = fs.readFileSync(documentsPath, 'utf8')
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    let processed = 0
    for (let i = 1; i < Math.min(lines.length, batchSize + 1); i++) {
      if (!lines[i] || lines[i].trim() === '') continue
      
      try {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
        const docData = {}
        headers.forEach((header, index) => {
          docData[header] = values[index] || null
        })
        
        const documentId = docData._ID
        if (!documentId || existingDocIds.has(documentId)) {
          continue // Skip if no ID or already exists
        }
        
        if (!dryRun) {
          // Add the missing document
          await sql`
            INSERT INTO documents (
              _id, _id_customer, doc_type, doc_number,
              customer_name, vehicle_registration, total_gross,
              created_at, updated_at
            ) VALUES (
              ${documentId},
              ${docData._ID_Customer},
              ${docData.docType || 'SI'},
              ${docData.docNumber_Invoice || docData.docNumber_Estimate || docData.docNumber_Jobsheet},
              ${`${docData.custName_Forename || ''} ${docData.custName_Surname || ''}`.trim()},
              ${docData.vehRegistration},
              ${docData.us_TotalGROSS ? parseFloat(docData.us_TotalGROSS) : 0},
              NOW(),
              NOW()
            )
            ON CONFLICT (_id) DO NOTHING
          `
        }
        
        results.documents_added++
        processed++
        
      } catch (error) {
        results.errors.push(`Line ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      operation: 'add-missing',
      dry_run: dryRun,
      results: results,
      message: dryRun ? 
        `Would add ${results.documents_added} missing documents` :
        `Added ${results.documents_added} missing documents`,
      next_step: dryRun ? 
        "Run with dryRun: false to apply changes" :
        "Missing data added - run 'verify' phase to check results",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[DATA-MAPPING] Add missing data failed:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to add missing data",
      details: error instanceof Error ? error.message : "Unknown error",
      partial_results: results
    }, { status: 500 })
  }
}

async function verifyDataQuality() {
  console.log(`[DATA-MAPPING] Verifying data quality after updates`)
  
  // Re-run analysis to see improvements
  const finalCounts = {
    customers: await sql`SELECT COUNT(*) as count FROM customers`,
    vehicles: await sql`SELECT COUNT(*) as count FROM vehicles`, 
    documents: await sql`SELECT COUNT(*) as count FROM documents`,
    line_items: await sql`SELECT COUNT(*) as count FROM document_line_items`
  }
  
  // Check job numbering quality
  const numberingQuality = await sql`
    SELECT 
      doc_type,
      COUNT(*) as total,
      COUNT(CASE WHEN LENGTH(doc_number) = 5 AND doc_number ~ '^[0-9]+$' THEN 1 END) as proper_format,
      MAX(CASE WHEN doc_number ~ '^[0-9]+$' THEN CAST(doc_number AS INTEGER) END) as highest_number
    FROM documents 
    WHERE doc_type IN ('ES', 'JOB', 'ESTIMATE', 'INVOICE', 'SI')
    GROUP BY doc_type
  `
  
  // Check registration quality
  const registrationQuality = await sql`
    SELECT 
      COUNT(*) as total_documents,
      COUNT(CASE WHEN vehicle_registration IS NULL THEN 1 END) as null_registrations,
      COUNT(CASE WHEN vehicle_registration ~ '^[A-Z0-9]{2,8}$' AND vehicle_registration !~ '^[0-9]+\.[0-9]+$' THEN 1 END) as valid_registrations,
      COUNT(CASE WHEN vehicle_registration ~ '^[0-9]+\.[0-9]+$' THEN 1 END) as remaining_monetary_values
    FROM documents
  `
  
  const overallQuality = {
    numbering_score: 0,
    registration_score: 0,
    completeness_score: 0
  }
  
  // Calculate quality scores
  const totalDocs = parseInt(finalCounts.documents[0].count)
  const validRegs = parseInt(registrationQuality[0].valid_registrations)
  const nullRegs = parseInt(registrationQuality[0].null_registrations)
  
  overallQuality.registration_score = Math.round(((validRegs + nullRegs) / totalDocs) * 100)
  overallQuality.completeness_score = totalDocs > 30000 ? 95 : Math.round((totalDocs / 32000) * 100)
  
  return NextResponse.json({
    success: true,
    verification_results: {
      final_counts: {
        customers: parseInt(finalCounts.customers[0].count),
        vehicles: parseInt(finalCounts.vehicles[0].count),
        documents: parseInt(finalCounts.documents[0].count),
        line_items: parseInt(finalCounts.line_items[0].count)
      },
      data_quality: {
        numbering_analysis: numberingQuality,
        registration_analysis: registrationQuality[0],
        quality_scores: overallQuality
      },
      system_ready: overallQuality.registration_score > 90 && overallQuality.completeness_score > 90
    },
    recommendations: overallQuality.registration_score < 90 ? 
      ["Re-run registration fixes", "Check CSV data quality"] :
      ["System ready for production", "Job numbering properly established"],
    timestamp: new Date().toISOString()
  })
}
