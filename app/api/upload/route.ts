import { NextResponse } from "next/server"
import { setUploadedData, getUploadedData, csvFileToJSON } from "@/lib/database/upload-store"
import { sql } from "@/lib/database/neon-client"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file || !type) {
      return NextResponse.json({ success: false, error: "Missing file or type" }, { status: 400 })
    }

    console.log(`[api/upload] Received file: ${file.name}, type: ${type}`)

    const json = await csvFileToJSON(file)
    const currentData = getUploadedData()

    // Save to database if type is 'documents' or 'document_extras'
    if (type === 'documents' || type === 'document_extras') {
      console.log(`[api/upload] Attempting to save ${json.length} ${type} to database...`)
      
      try {
        // Begin a transaction
        await sql`BEGIN`
        
        if (type === 'documents') {
          // Insert each document
          for (const doc of json) {
            await sql`
              INSERT INTO documents (
                customer_id, 
                vehicle_id, 
                document_type, 
                file_name, 
                file_path, 
                file_size,
                created_at,
                updated_at
              ) VALUES (
                ${doc.customer_id || null},
                ${doc.vehicle_id || null},
                ${doc.document_type || 'other'},
                ${doc.file_name || 'document'},
                ${doc.file_path || ''},
                ${parseInt(doc.file_size) || 0},
                NOW(),
                NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                vehicle_id = EXCLUDED.vehicle_id,
                document_type = EXCLUDED.document_type,
                file_name = EXCLUDED.file_name,
                file_path = EXCLUDED.file_path,
                file_size = EXCLUDED.file_size,
                updated_at = NOW()
            `
          }
        } else if (type === 'document_extras') {
          // Insert document extras
          for (const extra of json) {
            await sql`
              INSERT INTO document_extras (
                document_id,
                name,
                type,
                data,
                created_at,
                updated_at
              ) VALUES (
                ${extra.document_id || null},
                ${extra.name || 'Untitled'},
                ${extra.type || null},
                ${extra.data ? JSON.stringify(extra.data) : null},
                NOW(),
                NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                document_id = EXCLUDED.document_id,
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                data = EXCLUDED.data,
                updated_at = NOW()
            `
          }
        }
        
        // Commit the transaction
        await sql`COMMIT`
        console.log(`[api/upload] Successfully saved ${json.length} documents to database`)
        
      } catch (dbError) {
        await sql`ROLLBACK`
        console.error('[api/upload] Database error:', dbError)
        throw new Error(`Failed to save documents to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }
    }
    
    // Still keep in memory for backward compatibility
    const updatedData = { ...currentData, [type]: json }
    setUploadedData(updatedData)
    console.log(`[api/upload] Stored ${json.length} records in memory for type: ${type}`)

    return NextResponse.json({ success: true, count: json.length })
  } catch (error) {
    console.error("[api/upload] error:", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  // Handy for debugging / verifying an upload in the preview
  return NextResponse.json({ success: true, data: getUploadedData() })
}
