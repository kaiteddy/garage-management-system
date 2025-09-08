import { NextRequest, NextResponse } from 'next/server'
import { JobSheetService, JobSheetData, JobSheetLineItem } from '@/lib/job-sheet-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      jobSheetData, 
      lineItems = [], 
      auditInfo 
    }: {
      jobSheetData: JobSheetData
      lineItems?: JobSheetLineItem[]
      auditInfo: {
        userId?: string
        userName: string
        changeReason?: string
      }
    } = body

    console.log(`[JOB-SHEET-API] Creating job sheet for customer: ${jobSheetData.customerName}`)

    // Validate required fields
    if (!jobSheetData.customerId || !jobSheetData.customerName) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID and name are required'
      }, { status: 400 })
    }

    if (!jobSheetData.vehicleId || !jobSheetData.vehicleRegistration) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle ID and registration are required'
      }, { status: 400 })
    }

    if (!jobSheetData.jobType || !jobSheetData.workRequested) {
      return NextResponse.json({
        success: false,
        error: 'Job type and work requested are required'
      }, { status: 400 })
    }

    if (!auditInfo.userName) {
      return NextResponse.json({
        success: false,
        error: 'User name is required for audit trail'
      }, { status: 400 })
    }

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create the job sheet
    const result = await JobSheetService.createJobSheet(
      jobSheetData,
      lineItems,
      {
        ...auditInfo,
        ipAddress: clientIP,
        userAgent: userAgent
      }
    )

    if (result.success) {
      console.log(`[JOB-SHEET-API] ✅ Job sheet created successfully: ${result.jobNumber}`)
      
      return NextResponse.json({
        success: true,
        jobSheetId: result.jobSheetId,
        jobNumber: result.jobNumber,
        message: `Job sheet ${result.jobNumber} created successfully`
      })
    } else {
      console.error(`[JOB-SHEET-API] Failed to create job sheet:`, result.error)
      
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create job sheet'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[JOB-SHEET-API] Error in create endpoint:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while creating job sheet'
    }, { status: 500 })
  }
}
