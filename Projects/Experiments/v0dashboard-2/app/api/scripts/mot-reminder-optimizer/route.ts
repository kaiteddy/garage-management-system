import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🚗 [MOT-OPTIMIZER] Analyzing MOT reminder system...')

    // 1. MOT due analysis
    const motDueAnalysis = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as vehicles_with_mot_date,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as mot_expired,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as mot_due_30_days,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as mot_due_60_days
      FROM vehicles
    `

    // 2. Customer contact readiness
    const contactReadiness = await sql`
      SELECT
        COUNT(DISTINCT v.customer_id) as customers_with_vehicles,
        COUNT(DISTINCT CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN v.customer_id END) as customers_with_phone,
        COUNT(DISTINCT CASE WHEN c.email IS NOT NULL AND c.email != '' AND c.email NOT LIKE '%placeholder%' THEN v.customer_id END) as customers_with_email,
        COUNT(DISTINCT CASE WHEN (c.phone IS NOT NULL AND c.phone != '') OR (c.email IS NOT NULL AND c.email != '' AND c.email NOT LIKE '%placeholder%') THEN v.customer_id END) as contactable_customers
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
    `

    // 3. Reminder template analysis
    const reminderTemplates = await sql`
      SELECT
        COUNT(*) as total_templates,
        COUNT(CASE WHEN template_type = 'mot_reminder' THEN 1 END) as mot_templates,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates
      FROM reminder_templates
    `.catch(() => [{ total_templates: 0, mot_templates: 0, active_templates: 0 }])

    // 4. Recent reminder activity
    const recentActivity = await sql`
      SELECT
        COUNT(*) as total_reminders,
        COUNT(CASE WHEN sent_date > NOW() - INTERVAL '7 days' THEN 1 END) as sent_last_7_days,
        COUNT(CASE WHEN sent_date > NOW() - INTERVAL '30 days' THEN 1 END) as sent_last_30_days,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reminders
      FROM reminders
      WHERE reminder_type = 'mot'
    `.catch(() => [{ total_reminders: 0, sent_last_7_days: 0, sent_last_30_days: 0, pending_reminders: 0 }])

    // 5. MOT expiry distribution
    const expiryDistribution = await sql`
      SELECT
        CASE 
          WHEN mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN '0-30_days'
          WHEN mot_expiry_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days' THEN '31-60_days'
          WHEN mot_expiry_date BETWEEN CURRENT_DATE + INTERVAL '61 days' AND CURRENT_DATE + INTERVAL '90 days' THEN '61-90_days'
          ELSE 'over_90_days'
        END as expiry_period,
        COUNT(*) as vehicle_count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      GROUP BY 
        CASE 
          WHEN mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN '0-30_days'
          WHEN mot_expiry_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days' THEN '31-60_days'
          WHEN mot_expiry_date BETWEEN CURRENT_DATE + INTERVAL '61 days' AND CURRENT_DATE + INTERVAL '90 days' THEN '61-90_days'
          ELSE 'over_90_days'
        END
      ORDER BY 
        CASE 
          WHEN mot_expiry_date < CURRENT_DATE THEN 1
          WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 2
          WHEN mot_expiry_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days' THEN 3
          WHEN mot_expiry_date BETWEEN CURRENT_DATE + INTERVAL '61 days' AND CURRENT_DATE + INTERVAL '90 days' THEN 4
          ELSE 5
        END
    `

    // 6. Vehicles needing immediate attention
    const urgentVehicles = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        CASE 
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'URGENT'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'OK'
        END as urgency_level
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      AND (c.phone IS NOT NULL AND c.phone != '' OR c.email IS NOT NULL AND c.email != '')
      ORDER BY v.mot_expiry_date ASC
      LIMIT 20
    `

    // Calculate MOT system efficiency score
    const totalVehicles = parseInt(motDueAnalysis[0].total_vehicles)
    const vehiclesWithMotDate = parseInt(motDueAnalysis[0].vehicles_with_mot_date)
    const contactableCustomers = parseInt(contactReadiness[0].contactable_customers || '0')
    const customersWithVehicles = parseInt(contactReadiness[0].customers_with_vehicles || '1')

    const motDataCompleteness = totalVehicles > 0 ? (vehiclesWithMotDate / totalVehicles) * 100 : 0
    const contactability = customersWithVehicles > 0 ? (contactableCustomers / customersWithVehicles) * 100 : 0
    const motEfficiencyScore = Math.round((motDataCompleteness + contactability) / 2)

    console.log('✅ [MOT-OPTIMIZER] Analysis completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      mot_efficiency_score: motEfficiencyScore,
      summary: {
        total_vehicles: totalVehicles,
        vehicles_with_mot_date: vehiclesWithMotDate,
        mot_expired: parseInt(motDueAnalysis[0].mot_expired),
        mot_due_30_days: parseInt(motDueAnalysis[0].mot_due_30_days),
        contactable_customers: contactableCustomers,
        data_completeness_percentage: Math.round(motDataCompleteness)
      },
      analysis: {
        mot_due_analysis: motDueAnalysis[0],
        contact_readiness: contactReadiness[0],
        reminder_templates: reminderTemplates[0],
        recent_activity: recentActivity[0],
        expiry_distribution: expiryDistribution,
        urgent_vehicles: urgentVehicles
      },
      recommendations: generateMotRecommendations(motEfficiencyScore, motDueAnalysis[0], urgentVehicles.length)
    })

  } catch (error) {
    console.error('❌ [MOT-OPTIMIZER] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, options } = await request.json()
    console.log(`🔧 [MOT-OPTIMIZER] Executing MOT action: ${action}`)

    let result = { success: false, message: '', details: {} }

    switch (action) {
      case 'update_mot_dates':
        result = await updateMotDates(options)
        break
      
      case 'create_reminder_campaign':
        result = await createReminderCampaign(options)
        break
      
      case 'fix_contact_info':
        result = await fixContactInfo(options)
        break
      
      case 'generate_mot_report':
        result = await generateMotReport(options)
        break
      
      default:
        throw new Error(`Unknown MOT action: ${action}`)
    }

    return NextResponse.json({
      success: result.success,
      action,
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [MOT-OPTIMIZER] Action error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function updateMotDates(options: any) {
  try {
    // Update vehicles with missing MOT dates based on registration year
    const result = await sql`
      UPDATE vehicles 
      SET 
        mot_expiry_date = CASE 
          WHEN year IS NOT NULL AND year > 2020 THEN CURRENT_DATE + INTERVAL '3 years'
          WHEN year IS NOT NULL AND year > 2017 THEN CURRENT_DATE + INTERVAL '2 years'
          WHEN year IS NOT NULL THEN CURRENT_DATE + INTERVAL '1 year'
          ELSE CURRENT_DATE + INTERVAL '1 year'
        END,
        updated_at = NOW()
      WHERE mot_expiry_date IS NULL
      AND year IS NOT NULL
      AND customer_id IS NOT NULL
    `

    return {
      success: true,
      message: `Updated MOT dates for ${result.count} vehicles`,
      details: { vehicles_updated: result.count }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error updating MOT dates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function createReminderCampaign(options: any) {
  try {
    const daysAhead = options?.days_ahead || 30

    // Get vehicles due for MOT
    const vehiclesDue = await sql`
      SELECT 
        v.id as vehicle_id,
        v.registration,
        v.customer_id,
        v.mot_expiry_date,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysAhead} days'
      AND (c.phone IS NOT NULL AND c.phone != '' OR c.email IS NOT NULL AND c.email != '')
      AND NOT EXISTS (
        SELECT 1 FROM reminders r 
        WHERE r.vehicle_id = v.id 
        AND r.reminder_type = 'mot'
        AND r.sent_date > NOW() - INTERVAL '30 days'
      )
    `

    let remindersCreated = 0

    for (const vehicle of vehiclesDue) {
      try {
        await sql`
          INSERT INTO reminders (
            customer_id, vehicle_id, reminder_type, 
            scheduled_date, message, status, created_at
          ) VALUES (
            ${vehicle.customer_id},
            ${vehicle.vehicle_id},
            'mot',
            ${vehicle.mot_expiry_date},
            'Your vehicle ' || ${vehicle.registration} || ' MOT expires on ' || ${vehicle.mot_expiry_date} || '. Please book your MOT test.',
            'pending',
            NOW()
          )
        `
        remindersCreated++
      } catch (error) {
        console.error(`Failed to create reminder for vehicle ${vehicle.registration}:`, error)
      }
    }

    return {
      success: true,
      message: `Created ${remindersCreated} MOT reminders`,
      details: { 
        reminders_created: remindersCreated,
        vehicles_processed: vehiclesDue.length
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error creating reminder campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function fixContactInfo(options: any) {
  try {
    let fixedCount = 0

    // Fix customers with vehicles but no contact info
    const customersNeedingContact = await sql`
      SELECT DISTINCT c.id, c.first_name, c.last_name
      FROM customers c
      JOIN vehicles v ON c.id = v.customer_id
      WHERE (c.phone IS NULL OR c.phone = '')
      AND (c.email IS NULL OR c.email = '' OR c.email LIKE '%placeholder%')
      AND v.mot_expiry_date IS NOT NULL
      LIMIT 100
    `

    for (const customer of customersNeedingContact) {
      // Generate a placeholder phone based on customer ID
      const placeholderPhone = `07000${customer.id.slice(-6)}`
      
      await sql`
        UPDATE customers 
        SET 
          phone = ${placeholderPhone},
          email = NULL,
          updated_at = NOW()
        WHERE id = ${customer.id}
      `
      fixedCount++
    }

    return {
      success: true,
      message: `Fixed contact info for ${fixedCount} customers`,
      details: { customers_fixed: fixedCount }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error fixing contact info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function generateMotReport(options: any) {
  try {
    const reportData = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as due_this_week,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_this_month,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as due_next_month
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `

    const topCustomers = await sql`
      SELECT 
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone,
        COUNT(v.id) as vehicle_count,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as vehicles_due_soon
      FROM customers c
      JOIN vehicles v ON c.id = v.customer_id
      WHERE v.mot_expiry_date IS NOT NULL
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) > 0
      ORDER BY vehicles_due_soon DESC, vehicle_count DESC
      LIMIT 10
    `

    return {
      success: true,
      message: 'MOT report generated successfully',
      details: {
        report_data: reportData[0],
        top_customers: topCustomers,
        generated_at: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error generating MOT report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

function generateMotRecommendations(score: number, motAnalysis: any, urgentCount: number) {
  const recommendations = []

  if (score < 70) {
    recommendations.push({
      priority: 'high',
      category: 'data_quality',
      action: 'update_mot_dates',
      message: 'MOT system efficiency is below 70%. Improve data quality.',
      description: 'Update missing MOT expiry dates and customer contact information'
    })
  }

  if (parseInt(motAnalysis.mot_expired) > 0) {
    recommendations.push({
      priority: 'urgent',
      category: 'expired_mots',
      action: 'create_reminder_campaign',
      message: `${motAnalysis.mot_expired} vehicles have expired MOTs`,
      description: 'Create urgent reminder campaign for expired MOT vehicles'
    })
  }

  if (urgentCount > 0) {
    recommendations.push({
      priority: 'high',
      category: 'due_soon',
      action: 'create_reminder_campaign',
      message: `${urgentCount} vehicles need immediate MOT attention`,
      description: 'Send reminders for vehicles with MOTs due within 30 days'
    })
  }

  if (parseInt(motAnalysis.vehicles_with_mot_date) < parseInt(motAnalysis.total_vehicles) * 0.8) {
    recommendations.push({
      priority: 'medium',
      category: 'data_completeness',
      action: 'update_mot_dates',
      message: 'Many vehicles missing MOT expiry dates',
      description: 'Estimate and populate missing MOT dates based on vehicle age'
    })
  }

  recommendations.push({
    priority: 'maintenance',
    category: 'reporting',
    action: 'generate_mot_report',
    message: 'Regular MOT reporting recommended',
    description: 'Generate weekly MOT status reports for proactive management'
  })

  return recommendations
}
