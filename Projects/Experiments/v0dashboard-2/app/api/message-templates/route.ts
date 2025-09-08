import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Initialize message templates table
async function initializeTemplatesTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        template_name VARCHAR(100) UNIQUE NOT NULL,
        template_type VARCHAR(50) NOT NULL,
        subject VARCHAR(200),
        message_content TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Insert default templates
    await sql`
      INSERT INTO message_templates (template_name, template_type, subject, message_content, variables)
      VALUES
        (
          'mot_critical_reminder',
          'whatsapp',
          'URGENT: MOT Expiry Alert',
          '🚗 MOT Reminder from ELI MOTORS LTD

Dear {{customer_name}},

🚨 URGENT: Your {{vehicle_make}} {{vehicle_model}} ({{registration}}) MOT expires in {{days_until_expiry}} days on {{expiry_date}}.

Driving without valid MOT is illegal and can result in fines and penalty points!

📞 Call us to book: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
🏢 ELI MOTORS LTD - Serving Hendon since 1979

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration={{registration}}&checkRecalls=true

Reply STOP to opt out or SOLD if vehicle sold.',
          ''[{"name": "customer_name", "description": "Customer full name"}, {"name": "vehicle_make", "description": "Vehicle make"}, {"name": "vehicle_model", "description": "Vehicle model"}, {"name": "registration", "description": "Vehicle registration"}, {"name": "days_until_expiry", "description": "Days until MOT expires"}, {"name": "expiry_date", "description": "MOT expiry date"}]''
        ),
        (
          'mot_due_soon',
          'whatsapp',
          'MOT Reminder',
          '🚗 MOT Reminder from ELI MOTORS LTD

Dear {{customer_name}},

Your {{vehicle_make}} {{vehicle_model}} ({{registration}}) MOT expires on {{expiry_date}}.

We recommend booking your MOT test soon to avoid any issues.

📞 Call us to book: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
🏢 ELI MOTORS LTD - Serving Hendon since 1979

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration={{registration}}&checkRecalls=true

Reply STOP to opt out or SOLD if vehicle sold.',
          ''[{"name": "customer_name", "description": "Customer full name"}, {"name": "vehicle_make", "description": "Vehicle make"}, {"name": "vehicle_model", "description": "Vehicle model"}, {"name": "registration", "description": "Vehicle registration"}, {"name": "expiry_date", "description": "MOT expiry date"}]''
        ),
        (
          'service_confirmation',
          'whatsapp',
          'Service Confirmed',
          '✅ Service Confirmed - ELI MOTORS LTD

Dear {{customer_name}},

Your {{vehicle_make}} {{vehicle_model}} ({{registration}}) service is confirmed for:

📅 Date: {{service_date}}
🕐 Time: {{service_time}}

Please bring your vehicle registration and keys.

📞 Questions? Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
🏢 ELI MOTORS LTD - Serving Hendon since 1979

Reply STOP to opt out or SOLD if vehicle sold.',
          ''[{"name": "customer_name", "description": "Customer full name"}, {"name": "vehicle_make", "description": "Vehicle make"}, {"name": "vehicle_model", "description": "Vehicle model"}, {"name": "registration", "description": "Vehicle registration"}, {"name": "service_date", "description": "Service date"}, {"name": "service_time", "description": "Service time"}]''
        )
      ON CONFLICT (template_name) DO NOTHING
    `

    console.log("[MESSAGE-TEMPLATES] Templates table initialized")
    return { success: true }
  } catch (error) {
    console.error("[MESSAGE-TEMPLATES] Error initializing templates:", error)
    return { success: false, error: error.message }
  }
}

export async function GET() {
  try {
    await initializeTemplatesTable()

    const templates = await sql`
      SELECT * FROM message_templates
      WHERE is_active = true
      ORDER BY template_type, template_name
    `

    return NextResponse.json({
      success: true,
      templates: templates
    })
  } catch (error) {
    console.error("[MESSAGE-TEMPLATES] Error fetching templates:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { template_name, template_type, subject, message_content, variables } = await request.json()

    if (!template_name || !template_type || !message_content) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields"
      }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO message_templates (template_name, template_type, subject, message_content, variables, updated_at)
      VALUES (${template_name}, ${template_type}, ${subject}, ${message_content}, ${JSON.stringify(variables)}, NOW())
      ON CONFLICT (template_name)
      DO UPDATE SET
        template_type = EXCLUDED.template_type,
        subject = EXCLUDED.subject,
        message_content = EXCLUDED.message_content,
        variables = EXCLUDED.variables,
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      template: result[0],
      message: "Template saved successfully"
    })
  } catch (error) {
    console.error("[MESSAGE-TEMPLATES] Error saving template:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
