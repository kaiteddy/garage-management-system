import { NextRequest, NextResponse } from 'next/server'
import { JobSheetService } from '@/lib/job-sheet-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobSheetId = searchParams.get('jobSheetId')

    if (!jobSheetId) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet ID is required'
      }, { status: 400 })
    }

    console.log(`[JOB-SHEET-AUDIT-API] Getting audit trail for job sheet: ${jobSheetId}`)

    const auditTrail = await JobSheetService.getJobSheetAuditTrail(jobSheetId)

    return NextResponse.json({
      success: true,
      auditTrail,
      message: `Retrieved ${auditTrail.length} audit entries`
    })

  } catch (error) {
    console.error('[JOB-SHEET-AUDIT-API] Error getting audit trail:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while retrieving audit trail'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      jobSheetId,
      action,
      tableName,
      recordId,
      fieldName,
      oldValue,
      newValue,
      changeReason,
      userName,
      userId,
      userRole
    } = body

    console.log(`[JOB-SHEET-AUDIT-API] Logging audit entry for job sheet: ${jobSheetId}`)

    // Validate required fields
    if (!jobSheetId || !action || !tableName || !recordId || !userName) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet ID, action, table name, record ID, and user name are required'
      }, { status: 400 })
    }

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log the audit entry
    await JobSheetService.logAuditEntry({
      jobSheetId,
      action,
      tableName,
      recordId,
      fieldName,
      oldValue,
      newValue,
      changeReason,
      userId,
      userName,
      userRole,
      ipAddress: clientIP,
      userAgent: userAgent
    })

    console.log(`[JOB-SHEET-AUDIT-API] ✅ Audit entry logged successfully`)

    return NextResponse.json({
      success: true,
      message: 'Audit entry logged successfully'
    })

  } catch (error) {
    console.error('[JOB-SHEET-AUDIT-API] Error logging audit entry:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while logging audit entry'
    }, { status: 500 })
  }
}
