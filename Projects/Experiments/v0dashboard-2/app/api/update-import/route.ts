import { NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { sql } from '@/lib/database/neon-client'

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export'

export async function POST(request: Request) {
  try {
    const {
      updateMode = true,
      files = ['customers', 'vehicles'],
      batchSize = 500
    } = await request.json()

    console.log(`[UPDATE-IMPORT] Starting update import from GA4 Export`)
    console.log(`[UPDATE-IMPORT] Mode: ${updateMode ? 'UPDATE' : 'REPLACE'}, Files: ${files.join(', ')}`)

    const results = []

    // Process each requested file
    for (const fileType of files) {
      const result = await processFile(fileType, updateMode, batchSize)
      results.push(result)
    }

    // After import, fix the LN64XFG connection
    console.log(`[UPDATE-IMPORT] Fixing LN64XFG connection...`)
    try {
      await sql`
        UPDATE vehicles
        SET
          customer_id = 'OOTOSBT1OWYUHR1B81UY',
          owner_id = 'OOTOSBT1OWYUHR1B81UY',
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      `
      console.log(`[UPDATE-IMPORT] LN64XFG connection fixed`)
    } catch (fixError) {
      console.log(`[UPDATE-IMPORT] LN64XFG fix error:`, fixError)
    }

    return NextResponse.json({
      success: true,
      message: "Update import completed successfully",
      results: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[UPDATE-IMPORT] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Update import failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function processFile(fileType: string, updateMode: boolean, batchSize: number) {
  const fileMap = {
    customers: 'Customers.csv',
    vehicles: 'Vehicles.csv',
    documents: 'Documents.csv',
    lineItems: 'LineItems.csv',
    receipts: 'Receipts.csv',
    documentExtras: 'Document_Extras.csv'
  }

  const fileName = fileMap[fileType]
  if (!fileName) {
    throw new Error(`Unknown file type: ${fileType}`)
  }

  const filePath = path.join(GA4_EXPORT_PATH, fileName)

  if (!fs.existsSync(filePath)) {
    return {
      file: fileName,
      status: 'skipped',
      reason: 'File not found',
      records: 0
    }
  }

  console.log(`[UPDATE-IMPORT] Processing ${fileName}...`)

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  console.log(`[UPDATE-IMPORT] Found ${records.length} records in ${fileName}`)

  let processed = 0
  let updated = 0
  let inserted = 0
  let errors = 0

  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    for (const record of batch) {
      try {
        const result = await processRecord(fileType, record, updateMode)
        if (result === 'upserted') {
          updated++
        }
        processed++

        // Log progress every 100 records
        if (processed % 100 === 0) {
          console.log(`[UPDATE-IMPORT] ${fileName}: ${processed}/${records.length} processed (${Math.round(processed/records.length*100)}%)`)
        }
      } catch (error) {
        console.error(`[UPDATE-IMPORT] Error processing record in ${fileName}:`, error)
        errors++
      }
    }

    console.log(`[UPDATE-IMPORT] ${fileName}: Batch completed - ${processed}/${records.length} processed`)
  }

  return {
    file: fileName,
    status: 'completed',
    totalRecords: records.length,
    processed: processed,
    updated: updated,
    inserted: inserted,
    errors: errors
  }
}

async function processRecord(fileType: string, record: any, updateMode: boolean) {
  switch (fileType) {
    case 'customers':
      return await processCustomerRecord(record, updateMode)
    case 'vehicles':
      return await processVehicleRecord(record, updateMode)
    case 'documents':
      return await processDocumentRecord(record, updateMode)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

async function processCustomerRecord(record: any, updateMode: boolean) {
  const customerId = record._ID || record.id

  if (!customerId) {
    throw new Error('Customer ID is required')
  }

  // Use UPSERT (INSERT ... ON CONFLICT) for efficiency
  const result = await sql`
    INSERT INTO customers (
      id, first_name, last_name, phone, email, address_line1, city, postcode, created_at, updated_at
    ) VALUES (
      ${customerId},
      ${record.nameForename || record.forename || record.first_name || ''},
      ${record.nameSurname || record.surname || record.last_name || ''},
      ${record.contactTelephone || record.phone || ''},
      ${record.contactEmail || record.email || ''},
      ${record.addressRoad || record.address_line1 || ''},
      ${record.addressTown || record.city || ''},
      ${record.addressPostCode || record.postcode || ''},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      address_line1 = EXCLUDED.address_line1,
      city = EXCLUDED.city,
      postcode = EXCLUDED.postcode,
      updated_at = NOW()
  `

  return 'upserted'
}

async function processVehicleRecord(record: any, updateMode: boolean) {
  const registration = record.registration

  if (!registration) {
    throw new Error('Vehicle registration is required')
  }

  // Use UPSERT (INSERT ... ON CONFLICT) for efficiency
  const result = await sql`
    INSERT INTO vehicles (
      registration, make, model, year, color, fuel_type, engine_size, vin, customer_id, owner_id, created_at, updated_at
    ) VALUES (
      ${registration},
      ${record.Make || record.make || ''},
      ${record.Model || record.model || ''},
      ${record.year ? parseInt(record.year) : null},
      ${record.Colour || record.color || record.colour || ''},
      ${record.FuelType || record.fuel_type || record.fuelType || ''},
      ${record.EngineCC || record.engine_size || record.engineSize || ''},
      ${record.VIN || record.vin || ''},
      ${record._ID_Customer || record.customer_id || null},
      ${record._ID_Customer || record.owner_id || null},
      NOW(),
      NOW()
    )
    ON CONFLICT (registration) DO UPDATE SET
      make = EXCLUDED.make,
      model = EXCLUDED.model,
      year = EXCLUDED.year,
      color = EXCLUDED.color,
      fuel_type = EXCLUDED.fuel_type,
      engine_size = EXCLUDED.engine_size,
      vin = EXCLUDED.vin,
      customer_id = EXCLUDED.customer_id,
      owner_id = EXCLUDED.owner_id,
      updated_at = NOW()
  `

  return 'upserted'
}

async function processDocumentRecord(record: any, updateMode: boolean) {
  const documentId = record.id || record._ID

  if (updateMode) {
    // Try to update first
    const updateResult = await sql`
      UPDATE customer_documents
      SET
        customer_id = ${record.customer_id || record._id_customer || ''},
        vehicle_registration = ${record.vehicle_registration || record.vehicleRegistration || ''},
        document_type = ${record.document_type || record.type || ''},
        document_number = ${record.document_number || record.number || ''},
        document_date = ${record.document_date || record.date || null},
        total_gross = ${record.total_gross || record.totalGross ? parseFloat(record.total_gross || record.totalGross) : null},
        updated_at = NOW()
      WHERE id = ${documentId}
    `

    if (updateResult.rowCount > 0) {
      return 'updated'
    }
  }

  // Insert if not found or not in update mode
  await sql`
    INSERT INTO customer_documents (
      id, customer_id, vehicle_registration, document_type, document_number, document_date, total_gross, created_at, updated_at
    ) VALUES (
      ${documentId},
      ${record.customer_id || record._id_customer || ''},
      ${record.vehicle_registration || record.vehicleRegistration || ''},
      ${record.document_type || record.type || ''},
      ${record.document_number || record.number || ''},
      ${record.document_date || record.date || null},
      ${record.total_gross || record.totalGross ? parseFloat(record.total_gross || record.totalGross) : null},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      vehicle_registration = EXCLUDED.vehicle_registration,
      document_type = EXCLUDED.document_type,
      document_number = EXCLUDED.document_number,
      document_date = EXCLUDED.document_date,
      total_gross = EXCLUDED.total_gross,
      updated_at = NOW()
  `

  return 'inserted'
}

export async function GET() {
  return NextResponse.json({
    name: "Update Import API",
    description: "Updates database with new data from GA4 Export folder",
    path: GA4_EXPORT_PATH,
    usage: "POST with { files: ['customers', 'vehicles'], updateMode: true }",
    availableFiles: [
      "customers (Customers.csv)",
      "vehicles (Vehicles.csv)",
      "documents (Documents.csv)",
      "lineItems (LineItems.csv)",
      "receipts (Receipts.csv)",
      "documentExtras (Document_Extras.csv)"
    ]
  })
}
