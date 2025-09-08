import { NextResponse } from "next/server"
import { testConnection, getJobSheets, getTableInfo } from "@/lib/database/simple-db-client"

export async function GET() {
  try {
    console.log('[JOB-SHEETS-API] Fetching job sheets...')

    // Test database connection first
    const isConnected = await testConnection()

    if (!isConnected) {
      console.log('[JOB-SHEETS-API] Database connection failed, using mock data')
      return getMockJobSheets()
    }

    // Try to get real job sheets from database
    try {
      const jobSheets = await getJobSheets()

      if (jobSheets.length === 0) {
        console.log('[JOB-SHEETS-API] No job sheets found in database, using mock data')
        return getMockJobSheets()
      }

      console.log(`[JOB-SHEETS-API] Successfully fetched ${jobSheets.length} real job sheets`)

      return NextResponse.json({
        success: true,
        jobSheets: jobSheets,
        count: jobSheets.length,
        timestamp: new Date().toISOString(),
        source: "Real Database"
      })

    } catch (dbError) {
      console.error('[JOB-SHEETS-API] Database query failed:', dbError)

      // Get table info for debugging
      try {
        const tableInfo = await getTableInfo()
        console.log('[JOB-SHEETS-API] Table info for debugging:', tableInfo)
      } catch (infoError) {
        console.error('[JOB-SHEETS-API] Could not get table info:', infoError)
      }

      console.log('[JOB-SHEETS-API] Falling back to mock data')
      return getMockJobSheets()
    }

  } catch (error) {
    console.error('[JOB-SHEETS-API] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch job sheets",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

function getMockJobSheets() {
  const mockJobSheets = [
    {
      id: "D69674AF2C5FEB4382954FD98B327C2E",
      document_number: "90941",
      vehicle_registration: "LX06XJW",
      customer_id: "6C5A1B2E08A11A4A830825D98C71D114",
      created_at: new Date().toISOString(),
      status: "1",
      total_gross: 0,
      customer: "Anna Reynolds",
      customerPhone: "07768586027",
      customerEmail: "anna@example.com",
      addressInfo: {
        houseNumber: "21",
        road: "Aprey Gardens",
        locality: "",
        town: "London",
        county: "",
        postCode: "NW4 2RH",
        country: "UK"
      },
      vehicleMakeModel: "2006 Volkswagen Golf"
    },
    {
      id: "E79785BF3D6FFC5493065GE09C438D3F",
      document_number: "90942",
      vehicle_registration: "LN64XFG",
      customer_id: "7D6B2C3F19B22B5B941936E0AD82E225",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      status: "1",
      total_gross: 0,
      customer: "John Smith",
      customerPhone: "07123456789",
      customerEmail: "john@example.com",
      addressInfo: {
        houseNumber: "45",
        road: "High Street",
        locality: "",
        town: "London",
        county: "",
        postCode: "SW1A 1AA",
        country: "UK"
      },
      vehicleMakeModel: "2014 Volkswagen Golf"
    }
  ]

  console.log(`[JOB-SHEETS-API] Returning ${mockJobSheets.length} mock job sheets`)

  return NextResponse.json({
    success: true,
    jobSheets: mockJobSheets,
    count: mockJobSheets.length,
    timestamp: new Date().toISOString(),
    source: "Mock Data (Database connection issue)"
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create") {
      // Create new job sheet
      const { jobNumber, customerId, vehicleRegistration, items, totalAmount } = body

      // Generate a unique ID for the document (32-character hex string like existing records)
      const documentId = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')

      const result = await sql`
        INSERT INTO customer_documents (
          id,
          document_number,
          document_type,
          customer_id,
          vehicle_registration,
          total_gross,
          created_at,
          status
        ) VALUES (
          ${documentId},
          ${jobNumber},
          'JS',
          ${customerId},
          ${vehicleRegistration},
          ${totalAmount},
          NOW(),
          '1'
        )
        RETURNING id
      `

      return NextResponse.json({
        success: true,
        jobSheet: { id: result[0].id, jobNumber },
        message: "Job sheet created successfully"
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[JOB-SHEETS-API] Error creating job sheet:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create job sheet",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
