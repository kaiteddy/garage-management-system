import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-ESSENTIAL-ONLY] Starting essential document import for customer activity tracking...")

    const documentsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv'
    
    if (!fs.existsSync(documentsPath)) {
      return NextResponse.json({
        success: false,
        error: "Documents.csv file not found"
      }, { status: 404 })
    }

    // Create simple customer activity table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_activity (
        customer_id TEXT PRIMARY KEY,
        first_document_date DATE,
        last_document_date DATE,
        total_documents INTEGER DEFAULT 0,
        total_spent DECIMAL(12,2) DEFAULT 0,
        vehicles_serviced INTEGER DEFAULT 0,
        mot_services INTEGER DEFAULT 0,
        last_mot_date DATE,
        activity_level TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_activity_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `

    // Clear existing data
    await sql`DELETE FROM customer_activity`

    // Read and parse CSV with limited records for speed
    const fileContent = fs.readFileSync(documentsPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[IMPORT-ESSENTIAL-ONLY] Processing first 10,000 lines for speed...`)
    
    // Process header
    const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim())
    const idIndex = header.indexOf('_ID')
    const customerIdIndex = header.indexOf('_ID_Customer')
    const dateIndex = header.indexOf('docDate_Created')
    const totalIndex = header.indexOf('us_TotalGROSS')
    const vehicleIndex = header.indexOf('vehRegistration')
    const typeIndex = header.indexOf('docType')

    console.log(`[IMPORT-ESSENTIAL-ONLY] Column indices: ID=${idIndex}, Customer=${customerIdIndex}, Date=${dateIndex}, Total=${totalIndex}`)

    const customerData = new Map()

    // Process lines (limit to 10,000 for speed)
    const maxLines = Math.min(lines.length, 10001) // +1 for header
    for (let i = 1; i < maxLines; i++) {
      try {
        const line = lines[i].trim()
        if (!line) continue

        // Simple CSV parsing
        const fields = line.split(',').map(field => field.replace(/^"|"$/g, '').trim())
        
        const customerId = fields[customerIdIndex]
        const docDate = fields[dateIndex]
        const total = fields[totalIndex]
        const vehicle = fields[vehicleIndex]
        const docType = fields[typeIndex]

        if (!customerId || customerId === '') continue

        // Parse date
        let parsedDate = null
        if (docDate) {
          try {
            parsedDate = new Date(docDate)
            if (isNaN(parsedDate.getTime())) parsedDate = null
          } catch (e) {
            parsedDate = null
          }
        }

        // Parse amount
        let parsedTotal = 0
        if (total) {
          try {
            const cleaned = total.replace(/[£$,]/g, '')
            parsedTotal = parseFloat(cleaned) || 0
          } catch (e) {
            parsedTotal = 0
          }
        }

        // Aggregate customer data
        if (!customerData.has(customerId)) {
          customerData.set(customerId, {
            customerId,
            firstDate: parsedDate,
            lastDate: parsedDate,
            totalDocs: 0,
            totalSpent: 0,
            vehicles: new Set(),
            motServices: 0,
            lastMotDate: null
          })
        }

        const customer = customerData.get(customerId)
        customer.totalDocs++
        customer.totalSpent += parsedTotal

        if (parsedDate) {
          if (!customer.firstDate || parsedDate < customer.firstDate) {
            customer.firstDate = parsedDate
          }
          if (!customer.lastDate || parsedDate > customer.lastDate) {
            customer.lastDate = parsedDate
          }
        }

        if (vehicle && vehicle !== '') {
          customer.vehicles.add(vehicle)
        }

        if (docType && docType.toLowerCase().includes('mot')) {
          customer.motServices++
          if (parsedDate && (!customer.lastMotDate || parsedDate > customer.lastMotDate)) {
            customer.lastMotDate = parsedDate
          }
        }

      } catch (error) {
        // Skip problematic lines
        continue
      }
    }

    console.log(`[IMPORT-ESSENTIAL-ONLY] Processed ${customerData.size} unique customers`)

    // Insert aggregated data
    let imported = 0
    for (const [customerId, data] of customerData) {
      try {
        // Determine activity level
        let activityLevel = 'no_activity'
        if (data.lastDate) {
          const daysSinceLastActivity = Math.floor((new Date().getTime() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysSinceLastActivity <= 180) { // 6 months
            activityLevel = 'very_recent'
          } else if (daysSinceLastActivity <= 365) { // 1 year
            activityLevel = 'recent'
          } else if (daysSinceLastActivity <= 730) { // 2 years
            activityLevel = 'moderate'
          } else if (daysSinceLastActivity <= 1825) { // 5 years
            activityLevel = 'old'
          } else {
            activityLevel = 'very_old'
          }
        }

        await sql`
          INSERT INTO customer_activity (
            customer_id, first_document_date, last_document_date,
            total_documents, total_spent, vehicles_serviced,
            mot_services, last_mot_date, activity_level
          ) VALUES (
            ${customerId},
            ${data.firstDate},
            ${data.lastDate},
            ${data.totalDocs},
            ${data.totalSpent},
            ${data.vehicles.size},
            ${data.motServices},
            ${data.lastMotDate},
            ${activityLevel}
          )
          ON CONFLICT (customer_id) DO UPDATE SET
            first_document_date = EXCLUDED.first_document_date,
            last_document_date = EXCLUDED.last_document_date,
            total_documents = EXCLUDED.total_documents,
            total_spent = EXCLUDED.total_spent,
            vehicles_serviced = EXCLUDED.vehicles_serviced,
            mot_services = EXCLUDED.mot_services,
            last_mot_date = EXCLUDED.last_mot_date,
            activity_level = EXCLUDED.activity_level,
            updated_at = NOW()
        `
        imported++

      } catch (error) {
        console.error(`[IMPORT-ESSENTIAL-ONLY] Error importing customer ${customerId}:`, error)
      }
    }

    // Update customer last_contact_date
    await sql`
      UPDATE customers 
      SET last_contact_date = (
        SELECT last_document_date 
        FROM customer_activity 
        WHERE customer_activity.customer_id = customers.id
      )
      WHERE id IN (
        SELECT customer_id FROM customer_activity
      )
    `

    // Get statistics
    const activityStats = await sql`
      SELECT 
        COUNT(*) as total_customers_with_activity,
        COUNT(CASE WHEN activity_level = 'very_recent' THEN 1 END) as very_recent,
        COUNT(CASE WHEN activity_level = 'recent' THEN 1 END) as recent,
        COUNT(CASE WHEN activity_level = 'moderate' THEN 1 END) as moderate,
        COUNT(CASE WHEN activity_level = 'old' THEN 1 END) as old,
        COUNT(CASE WHEN activity_level = 'very_old' THEN 1 END) as very_old,
        SUM(total_spent) as total_revenue,
        AVG(total_spent) as average_spent,
        SUM(total_documents) as total_documents,
        SUM(vehicles_serviced) as total_vehicles_serviced,
        SUM(mot_services) as total_mot_services
      FROM customer_activity
    `

    // Get top customers
    const topCustomers = await sql`
      SELECT 
        c.first_name,
        c.last_name,
        c.twilio_phone,
        ca.total_documents,
        ca.total_spent,
        ca.last_document_date,
        ca.vehicles_serviced,
        ca.mot_services,
        ca.activity_level
      FROM customer_activity ca
      INNER JOIN customers c ON ca.customer_id = c.id
      ORDER BY ca.total_spent DESC
      LIMIT 20
    `

    // Get customer activity summary for all customers
    const customerActivitySummary = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as with_activity,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as very_recent_all,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '1 year' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as recent_all,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '2 years' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as moderate_all
      FROM customers
    `

    const stats = activityStats[0]
    const summary = customerActivitySummary[0]

    return NextResponse.json({
      success: true,
      message: "Essential document import completed successfully",
      results: {
        linesProcessed: maxLines - 1,
        customersWithActivity: imported,
        totalCustomers: parseInt(summary.total_customers),
        customersWithActivityData: parseInt(summary.with_activity)
      },
      activityBreakdown: {
        veryRecent: parseInt(stats.very_recent), // Last 6 months
        recent: parseInt(stats.recent), // 6 months - 1 year
        moderate: parseInt(stats.moderate), // 1-2 years
        old: parseInt(stats.old), // 2-5 years
        veryOld: parseInt(stats.very_old) // 5+ years
      },
      businessMetrics: {
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        averageSpent: parseFloat(stats.average_spent) || 0,
        totalDocuments: parseInt(stats.total_documents),
        totalVehiclesServiced: parseInt(stats.total_vehicles_serviced),
        totalMotServices: parseInt(stats.total_mot_services)
      },
      topCustomers: topCustomers.slice(0, 10),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-ESSENTIAL-ONLY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import essential documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
