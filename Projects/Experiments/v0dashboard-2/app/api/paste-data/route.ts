import { type NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"

// Same in-memory store as upload route
const uploadedData: {
  customers: any[]
  vehicles: any[]
  appointments: any[]
  reminders: any[]
  jobSheets: any[]
} = {
  customers: [],
  vehicles: [],
  appointments: [],
  reminders: [],
  jobSheets: [],
}

export async function POST(request: NextRequest) {
  try {
    const { data, dataType } = await request.json()

    if (!data || !dataType) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing data or data type",
        },
        { status: 400 },
      )
    }

    // Parse the pasted data
    const parsedData = await new Promise<any[]>((resolve, reject) => {
      Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as any[]),
        error: reject,
      })
    })

    if (parsedData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid data found",
        },
        { status: 400 },
      )
    }

    // Add to the appropriate data store
    switch (dataType) {
      case "customers":
        uploadedData.customers = [...uploadedData.customers, ...parsedData]
        break
      case "vehicles":
        uploadedData.vehicles = [...uploadedData.vehicles, ...parsedData]
        break
      case "appointments":
        uploadedData.appointments = [...uploadedData.appointments, ...parsedData]
        break
      case "reminders":
        uploadedData.reminders = [...uploadedData.reminders, ...parsedData]
        break
      case "jobSheets":
        uploadedData.jobSheets = [...uploadedData.jobSheets, ...parsedData]
        break
      default:
        return NextResponse.json(
          {
            success: false,
            message: "Invalid data type",
          },
          { status: 400 },
        )
    }

    console.log(`Added ${parsedData.length} ${dataType} records via paste`)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${parsedData.length} ${dataType} records`,
      recordCount: parsedData.length,
      dataType: dataType,
    })
  } catch (error) {
    console.error("Paste processing error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process pasted data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
