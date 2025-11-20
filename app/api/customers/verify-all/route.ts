import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFY-ALL] Starting comprehensive customer data verification...")

    // Get all customers with their vehicles
    const customers = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.city,
        c.postcode,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, c.address_line1, c.city, c.postcode
      ORDER BY c.last_name, c.first_name
      LIMIT 50
    `

    console.log(`[VERIFY-ALL] Found ${customers.length} customers to verify`)

    const verificationResults = []

    for (const customer of customers) {
      console.log(`[VERIFY-ALL] Verifying customer: ${customer.first_name} ${customer.last_name}`)

      // Get customer's vehicles
      const vehicles = await sql`
        SELECT
          registration,
          make,
          model,
          year,
          color,
          fuel_type,
          engine_size,
          mot_status,
          mot_expiry_date,
          tax_status
        FROM vehicles
        WHERE owner_id = ${customer.id}
      `

      // Get customer's documents
      const documents = await sql`
        SELECT
          doc_number,
          doc_type,
          doc_date_issued,
          vehicle_registration,
          total_gross,
          status
        FROM documents
        WHERE _id_customer = ${customer.id}
        ORDER BY doc_date_issued DESC
      `

      // Get MOT history for customer's vehicles
      const motHistory = await sql`
        SELECT
          vehicle_registration,
          test_date,
          expiry_date,
          test_result
        FROM mot_history
        WHERE vehicle_registration IN (
          SELECT registration FROM vehicles WHERE owner_id = ${customer.id}
        )
      `

      // Analyze data completeness
      const vehicleAnalysis = vehicles.map(vehicle => ({
        registration: vehicle.registration,
        data_complete: {
          basic_info: !!(vehicle.make && vehicle.model),
          year: !!vehicle.year,
          color: !!vehicle.color,
          fuel_type: !!vehicle.fuel_type,
          engine_size: !!vehicle.engine_size,
          mot_status: !!vehicle.mot_status,
          tax_status: !!vehicle.tax_status
        },
        missing_fields: [
          !vehicle.year ? 'year' : null,
          !vehicle.color ? 'color' : null,
          !vehicle.fuel_type ? 'fuel_type' : null,
          !vehicle.engine_size ? 'engine_size' : null,
          !vehicle.mot_status ? 'mot_status' : null,
          !vehicle.tax_status ? 'tax_status' : null
        ].filter(Boolean)
      }))

      const customerResult = {
        customer: {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone,
          email: customer.email,
          address: `${customer.address_line1}, ${customer.city}, ${customer.postcode}`
        },
        summary: {
          vehicle_count: parseInt(customer.vehicle_count),
          document_count: documents.length,
          mot_history_count: motHistory.length,
          vehicles_with_complete_data: vehicleAnalysis.filter(v =>
            v.data_complete.year && v.data_complete.color && v.data_complete.fuel_type
          ).length,
          vehicles_missing_data: vehicleAnalysis.filter(v =>
            !v.data_complete.year || !v.data_complete.color || !v.data_complete.fuel_type
          ).length
        },
        vehicles: vehicleAnalysis,
        recent_documents: documents.slice(0, 5),
        mot_history: motHistory,
        data_issues: {
          no_vehicles: parseInt(customer.vehicle_count) === 0,
          no_documents: documents.length === 0,
          no_mot_history: motHistory.length === 0,
          incomplete_vehicle_data: vehicleAnalysis.some(v => v.missing_fields.length > 0)
        }
      }

      verificationResults.push(customerResult)
    }

    // Generate overall statistics
    const overallStats = {
      total_customers: customers.length,
      customers_with_vehicles: verificationResults.filter(r => r.summary.vehicle_count > 0).length,
      customers_with_documents: verificationResults.filter(r => r.summary.document_count > 0).length,
      customers_with_mot_history: verificationResults.filter(r => r.summary.mot_history_count > 0).length,
      customers_with_complete_data: verificationResults.filter(r =>
        r.summary.vehicles_missing_data === 0 && r.summary.vehicle_count > 0
      ).length,
      total_vehicles: verificationResults.reduce((sum, r) => sum + r.summary.vehicle_count, 0),
      total_documents: verificationResults.reduce((sum, r) => sum + r.summary.document_count, 0),
      vehicles_missing_data: verificationResults.reduce((sum, r) => sum + r.summary.vehicles_missing_data, 0)
    }

    // Identify customers needing attention
    const customersNeedingAttention = verificationResults.filter(customer =>
      customer.data_issues.no_documents ||
      customer.data_issues.incomplete_vehicle_data ||
      customer.data_issues.no_mot_history
    )

    return NextResponse.json({
      success: true,
      verification_summary: {
        timestamp: new Date().toISOString(),
        customers_verified: customers.length,
        overall_statistics: overallStats,
        data_completeness: {
          percentage_with_vehicles: Math.round((overallStats.customers_with_vehicles / overallStats.total_customers) * 100),
          percentage_with_documents: Math.round((overallStats.customers_with_documents / overallStats.total_customers) * 100),
          percentage_with_complete_vehicle_data: Math.round((overallStats.customers_with_complete_data / overallStats.customers_with_vehicles) * 100),
          vehicles_needing_dvla_update: overallStats.vehicles_missing_data
        },
        customers_needing_attention: customersNeedingAttention.length,
        priority_fixes: [
          overallStats.vehicles_missing_data > 0 ? `${overallStats.vehicles_missing_data} vehicles need DVLA data updates` : null,
          customersNeedingAttention.filter(c => c.data_issues.no_documents).length > 0 ?
            `${customersNeedingAttention.filter(c => c.data_issues.no_documents).length} customers have no service documents` : null,
          customersNeedingAttention.filter(c => c.data_issues.no_mot_history).length > 0 ?
            `${customersNeedingAttention.filter(c => c.data_issues.no_mot_history).length} customers have no MOT history` : null
        ].filter(Boolean)
      },
      detailed_results: verificationResults,
      customers_needing_attention: customersNeedingAttention.map(c => ({
        customer: c.customer,
        issues: c.data_issues,
        summary: c.summary
      }))
    })

  } catch (error) {
    console.error("[VERIFY-ALL] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify all customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
