import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: NextRequest,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = params.registration
    console.log(`[VEHICLE-HISTORY] Fetching history for ${registration}`)

    // Get vehicle service history from documents
    const serviceHistory = await sql`
      SELECT
        d.doc_number,
        d.doc_type,
        d.doc_date_issued as doc_date,
        d.customer_name,
        d.vehicle_registration as vehicle_reg,
        d.total_gross as total_amount,
        d.created_at,
        -- Determine service type from document type
        CASE
          WHEN d.doc_type = 'SI' THEN 'Service Invoice'
          WHEN d.doc_type = 'JS' THEN 'Job Sheet'
          WHEN d.doc_type = 'ES' THEN 'Estimate'
          ELSE 'General'
        END as service_type
      FROM documents d
      WHERE UPPER(d.vehicle_registration) = UPPER(${registration})
        AND d.doc_type IN ('SI', 'JS', 'ES') -- Service Invoice, Job Sheet, Estimate
      ORDER BY d.doc_date_issued DESC, d.created_at DESC
      LIMIT 50
    `

    // Get MOT history from external API or database
    let motHistory = []
    try {
      // Try to get MOT history from DVLA API
      const motResponse = await fetch(`https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${registration}`, {
        headers: {
          'X-API-Key': process.env.DVLA_API_KEY || '',
          'Accept': 'application/json+v6'
        }
      })

      if (motResponse.ok) {
        const motData = await motResponse.json()
        motHistory = motData.motTests || []
      }
    } catch (error) {
      console.log('[VEHICLE-HISTORY] Could not fetch MOT history from DVLA:', error)
    }

    // Get vehicle ownership changes (temporarily disabled due to table structure issues)
    const ownershipChanges: any[] = []
    // const ownershipChanges = await sql`
    //   SELECT
    //     voc.id,
    //     voc.change_type,
    //     voc.change_date,
    //     voc.reported_by,
    //     voc.new_contact_info,
    //     voc.verified,
    //     c.first_name,
    //     c.last_name,
    //     c.phone,
    //     c.email
    //   FROM vehicle_ownership_changes voc
    //   LEFT JOIN customers c ON voc.previous_owner_id = c.id
    //   WHERE UPPER(voc.vehicle_registration) = UPPER(${registration})
    //   ORDER BY voc.change_date DESC
    // `

    // Get current vehicle details
    const vehicleDetails = await sql`
      SELECT
        v.*,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE UPPER(v.registration) = UPPER(${registration})
      ORDER BY v.created_at DESC
      LIMIT 1
    `

    // Calculate summary statistics
    const totalServices = serviceHistory.length
    const totalSpent = serviceHistory.reduce((sum, record) => sum + (parseFloat(record.total_amount) || 0), 0)
    const lastService = serviceHistory.length > 0 ? serviceHistory[0] : null
    const serviceTypes = serviceHistory.reduce((acc, record) => {
      acc[record.service_type] = (acc[record.service_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get mileage progression (no mileage data available in documents table)
    const mileageHistory: any[] = []

    const response = {
      success: true,
      registration: registration,
      vehicle: vehicleDetails[0] || null,
      history: {
        services: serviceHistory.map(record => ({
          id: record.doc_number,
          date: record.doc_date,
          type: record.service_type,
          docType: record.doc_type,
          docNumber: record.doc_number,
          description: `${record.service_type} - ${record.doc_number}`, // Fallback description
          customer: record.customer_name,
          amount: parseFloat(record.total_amount) || 0,
          mileage: null, // No mileage data available in documents table
          createdAt: record.created_at
        })),
        mot: motHistory.map((test: any) => ({
          testDate: test.completedDate,
          expiryDate: test.expiryDate,
          result: test.testResult,
          mileage: test.odometerValue,
          testNumber: test.motTestNumber,
          defects: test.rfrAndComments || [],
          advisories: test.minorDefects || []
        })),
        ownership: ownershipChanges.map(change => ({
          id: change.id,
          changeType: change.change_type,
          changeDate: change.change_date,
          reportedBy: change.reported_by,
          verified: change.verified,
          previousOwner: change.first_name && change.last_name
            ? `${change.first_name} ${change.last_name}`
            : null,
          contactInfo: change.new_contact_info
        })),
        mileage: mileageHistory
      },
      summary: {
        totalServices,
        totalSpent,
        lastServiceDate: lastService?.doc_date || null,
        lastServiceType: lastService?.service_type || null,
        serviceTypes,
        averageSpendPerService: totalServices > 0 ? totalSpent / totalServices : 0,
        currentMileage: mileageHistory.length > 0 ? mileageHistory[mileageHistory.length - 1].mileage : null
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[VEHICLE-HISTORY] Error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
