import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[SMS-TEMPLATES] 🔍 Getting SMS message templates")

    // Create templates table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        urgency_level TEXT NOT NULL,
        template_text TEXT NOT NULL,
        variables TEXT[], -- Array of variable names like {name}, {vehicle}, {days}
        estimated_segments INTEGER DEFAULT 1,
        estimated_cost DECIMAL(10,4) DEFAULT 0.0075,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Get existing templates
    const existingTemplates = await sql`
      SELECT * FROM sms_templates ORDER BY urgency_level, name
    `

    // If no templates exist, create default ones
    if (existingTemplates.length === 0) {
      await sql`
        INSERT INTO sms_templates (name, urgency_level, template_text, variables, estimated_segments, estimated_cost) VALUES
        (
          'Expired MOT - Urgent',
          'expired',
          'Hi {name}, 🚨 URGENT: Your {vehicle} MOT expired {days} day{s} ago. Driving without valid MOT is illegal. Book immediately!

🔗 Check MOT: https://www.check-mot.service.gov.uk/results?registration={registration}
📞 Book with us: Call {business_phone}
📧 Email: {business_email}

{last_visit}

Reply: SOLD (if no longer yours), EMAIL address (to add email), STOP (opt out)',
          ARRAY['name', 'vehicle', 'days', 's', 'registration', 'business_phone', 'business_email', 'last_visit'],
          2,
          0.015
        ),
        (
          'Critical MOT - 7 Days',
          'critical',
          'Hi {name}, ⚠️ CRITICAL: Your {vehicle} MOT expires in {days} day{s}. Book your MOT now to avoid penalties.

🔗 Check MOT: https://www.check-mot.service.gov.uk/results?registration={registration}
📞 Book with us: Call {business_phone}
📧 Email: {business_email}

{last_visit}

Reply: SOLD (if no longer yours), EMAIL address (to add email), STOP (opt out)',
          ARRAY['name', 'vehicle', 'days', 's', 'registration', 'business_phone', 'business_email', 'last_visit'],
          1,
          0.0075
        ),
        (
          'Due Soon MOT - 30 Days',
          'due-soon',
          'Hi {name}, 📅 Your {vehicle} MOT expires in {days} days. Book your MOT to stay legal.

🔗 Check MOT: https://www.check-mot.service.gov.uk/results?registration={registration}
📞 Book with us: Call {business_phone}
📧 Email: {business_email}

{last_visit}

Reply: SOLD (if no longer yours), EMAIL address (to add email), STOP (opt out)',
          ARRAY['name', 'vehicle', 'days', 'registration', 'business_phone', 'business_email', 'last_visit'],
          1,
          0.0075
        ),
        (
          'Upcoming MOT - 60 Days',
          'upcoming',
          'Hi {name}, 📋 Reminder: Your {vehicle} MOT expires in {days} days. Consider booking your MOT soon.

🔗 Check MOT: https://www.check-mot.service.gov.uk/results?registration={registration}
📞 Book with us: Call {business_phone}

{last_visit}

Reply: SOLD (if no longer yours), STOP (opt out)',
          ARRAY['name', 'vehicle', 'days', 'registration', 'business_phone', 'last_visit'],
          1,
          0.0075
        ),
        (
          'Contact Update Request',
          'contact-update',
          'Hi {name}, we''re updating our records. Please reply with your current email address to receive MOT reminders via email too.

Example: EMAIL john@email.com

Or call us on {business_phone} to update your details.

Reply STOP to opt out of SMS reminders.',
          ARRAY['name', 'business_phone'],
          1,
          0.0075
        ),
        (
          'Service Reminder',
          'service',
          'Hi {name}, your {vehicle} is due for a service. Last service: {last_service_date}.

📞 Book service: Call {business_phone}
📧 Email: {business_email}

Reply STOP to opt out.',
          ARRAY['name', 'vehicle', 'last_service_date', 'business_phone', 'business_email'],
          1,
          0.0075
        )
      `
    }

    // Get all templates
    const templates = await sql`
      SELECT * FROM sms_templates ORDER BY urgency_level, name
    `

    // Get template usage statistics
    const templateUsage = await sql`
      SELECT 
        urgency_level,
        COUNT(*) as usage_count,
        AVG(estimated_cost) as avg_cost,
        MAX(sent_at) as last_used
      FROM sms_log
      WHERE sent_at > NOW() - INTERVAL '90 days'
      GROUP BY urgency_level
    `

    // Business settings for template variables
    const businessSettings = {
      business_phone: process.env.BUSINESS_PHONE || '[YOUR_PHONE]',
      business_email: process.env.BUSINESS_EMAIL || '[YOUR_EMAIL]',
      business_name: process.env.BUSINESS_NAME || 'Your Garage',
      website_url: process.env.WEBSITE_URL || 'https://yourgarage.com'
    }

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        urgencyLevel: template.urgency_level,
        templateText: template.template_text,
        variables: template.variables,
        estimatedSegments: template.estimated_segments,
        estimatedCost: parseFloat(template.estimated_cost),
        active: template.active,
        characterCount: template.template_text.length,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      })),
      templateUsage: templateUsage.map(usage => ({
        urgencyLevel: usage.urgency_level,
        usageCount: parseInt(usage.usage_count),
        avgCost: parseFloat(usage.avg_cost),
        lastUsed: usage.last_used
      })),
      businessSettings: businessSettings,
      variableHelp: {
        '{name}': 'Customer first and last name',
        '{vehicle}': 'Vehicle registration, make and model',
        '{registration}': 'Vehicle registration only',
        '{days}': 'Number of days (expired or until expiry)',
        '{s}': 'Plural "s" for days (empty if days = 1)',
        '{last_visit}': 'Last service date in small text',
        '{business_phone}': 'Your business phone number',
        '{business_email}': 'Your business email address',
        '{business_name}': 'Your business name',
        '{last_service_date}': 'Date of last service'
      },
      messageGuidelines: {
        maxLength: 1600, // 10 SMS segments
        recommendedLength: 160, // Single SMS
        costPerSegment: 0.0075,
        urgentMaxSegments: 2,
        standardMaxSegments: 1
      }
    })

  } catch (error) {
    console.error("[SMS-TEMPLATES] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get SMS templates",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, urgencyLevel, templateText, variables, estimatedSegments, estimatedCost, active = true } = await request.json()

    console.log("[SMS-TEMPLATES] 📝 Creating new SMS template")

    const newTemplate = await sql`
      INSERT INTO sms_templates (name, urgency_level, template_text, variables, estimated_segments, estimated_cost, active)
      VALUES (${name}, ${urgencyLevel}, ${templateText}, ${variables}, ${estimatedSegments}, ${estimatedCost}, ${active})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      template: {
        id: newTemplate[0].id,
        name: newTemplate[0].name,
        urgencyLevel: newTemplate[0].urgency_level,
        templateText: newTemplate[0].template_text,
        variables: newTemplate[0].variables,
        estimatedSegments: newTemplate[0].estimated_segments,
        estimatedCost: parseFloat(newTemplate[0].estimated_cost),
        active: newTemplate[0].active,
        createdAt: newTemplate[0].created_at
      },
      message: "SMS template created successfully"
    })

  } catch (error) {
    console.error("[SMS-TEMPLATES] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create SMS template",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, urgencyLevel, templateText, variables, estimatedSegments, estimatedCost, active } = await request.json()

    console.log(`[SMS-TEMPLATES] ✏️ Updating SMS template ${id}`)

    const updatedTemplate = await sql`
      UPDATE sms_templates 
      SET 
        name = ${name},
        urgency_level = ${urgencyLevel},
        template_text = ${templateText},
        variables = ${variables},
        estimated_segments = ${estimatedSegments},
        estimated_cost = ${estimatedCost},
        active = ${active},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (updatedTemplate.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Template not found"
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      template: {
        id: updatedTemplate[0].id,
        name: updatedTemplate[0].name,
        urgencyLevel: updatedTemplate[0].urgency_level,
        templateText: updatedTemplate[0].template_text,
        variables: updatedTemplate[0].variables,
        estimatedSegments: updatedTemplate[0].estimated_segments,
        estimatedCost: parseFloat(updatedTemplate[0].estimated_cost),
        active: updatedTemplate[0].active,
        updatedAt: updatedTemplate[0].updated_at
      },
      message: "SMS template updated successfully"
    })

  } catch (error) {
    console.error("[SMS-TEMPLATES] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update SMS template",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
