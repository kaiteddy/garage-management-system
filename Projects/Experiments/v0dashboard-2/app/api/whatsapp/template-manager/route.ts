import { NextResponse } from "next/server"
import twilio from 'twilio'

/**
 * WhatsApp Template Manager for ELI MOTORS
 * GET /api/whatsapp/template-manager - Get all template information
 * POST /api/whatsapp/template-manager - Test templates with sample data
 */

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  
  if (accountSid && authToken) {
    return twilio(accountSid, authToken)
  }
  return null
}

export async function GET() {
  try {
    console.log('[TEMPLATE-MANAGER] 📋 Loading ELI MOTORS template configuration...')
    
    // ELI MOTORS WhatsApp Templates for Garage Business
    const eliMotorsTemplates = {
      // VERIFIED WORKING TEMPLATES
      working: [
        {
          sid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
          name: "appointment_reminder",
          display_name: "Appointment Reminder",
          description: "Multi-purpose reminder template with interactive buttons",
          category: "UTILITY",
          status: "APPROVED",
          variables: ["date_or_vehicle", "time_or_expiry"],
          use_cases: [
            "Service appointments",
            "MOT reminders", 
            "Collection notices",
            "General reminders"
          ],
          examples: [
            {
              name: "Appointment Reminder",
              variables: { "1": "12/1", "2": "3pm" },
              expected: "Your appointment is coming up on 12/1 at 3pm"
            },
            {
              name: "MOT Reminder",
              variables: { "1": "AB12 CDE", "2": "31st December" },
              expected: "Your AB12 CDE is coming up on 31st December"
            },
            {
              name: "Collection Notice",
              variables: { "1": "your vehicle", "2": "4pm today" },
              expected: "Your your vehicle is coming up on 4pm today"
            }
          ],
          interactive_buttons: true,
          cost_per_message: "£0.005"
        }
      ],
      
      // TEMPLATES NEEDED FOR GARAGE BUSINESS
      needed: [
        {
          name: "mot_expiry_urgent",
          display_name: "MOT Expiry - Urgent",
          description: "Urgent MOT expiry warning with days remaining",
          category: "UTILITY",
          priority: "HIGH",
          variables: ["vehicle_reg", "expiry_date", "days_left"],
          sample_content: "🚨 URGENT: Your {{1}} MOT expires on {{2}} ({{3}} days left). Book now to avoid penalties!",
          use_case: "MOT reminders with urgency"
        },
        {
          name: "job_completion",
          display_name: "Work Completed",
          description: "Notify when vehicle work is finished",
          category: "UTILITY", 
          priority: "HIGH",
          variables: ["vehicle_reg", "work_type", "collection_info"],
          sample_content: "✅ Work completed on {{1}}: {{2}}. {{3}}",
          use_case: "Job completion notifications"
        },
        {
          name: "quote_ready",
          display_name: "Quote Ready",
          description: "Quote/estimate ready for customer",
          category: "UTILITY",
          priority: "MEDIUM",
          variables: ["vehicle_reg", "quote_amount", "valid_until"],
          sample_content: "💰 Quote ready for {{1}}: {{2}}. Valid until {{3}}. Reply YES to approve.",
          use_case: "Quote notifications"
        },
        {
          name: "service_reminder",
          display_name: "Service Due",
          description: "Annual service or maintenance reminder",
          category: "UTILITY",
          priority: "MEDIUM", 
          variables: ["vehicle_reg", "service_type", "due_mileage"],
          sample_content: "🔧 Your {{1}} is due for {{2}} at {{3}} miles. Book your service today!",
          use_case: "Service reminders"
        }
      ]
    }

    // Check Twilio account for existing templates
    let twilioTemplates = []
    const twilioClient = getTwilioClient()
    
    if (twilioClient) {
      try {
        const contentList = await twilioClient.content.v1.contents.list({ limit: 20 })
        twilioTemplates = contentList.map(content => ({
          sid: content.sid,
          friendly_name: content.friendlyName,
          language: content.language,
          date_created: content.dateCreated
        }))
      } catch (error) {
        console.log('[TEMPLATE-MANAGER] Could not fetch Twilio templates:', error)
      }
    }

    return NextResponse.json({
      success: true,
      garage_name: "ELI MOTORS LTD",
      sandbox_mode: true,
      whatsapp_number: "+14155238886",
      
      template_status: {
        working_templates: eliMotorsTemplates.working.length,
        needed_templates: eliMotorsTemplates.needed.length,
        total_required: eliMotorsTemplates.working.length + eliMotorsTemplates.needed.length
      },
      
      working_templates: eliMotorsTemplates.working,
      needed_templates: eliMotorsTemplates.needed,
      twilio_templates: twilioTemplates,
      
      setup_guide: {
        step_1: "Test working templates with your business data",
        step_2: "Create missing templates in Twilio Console",
        step_3: "Submit templates for WhatsApp Business approval",
        step_4: "Integrate approved templates into MOT reminder system"
      },
      
      test_endpoints: {
        test_template: "/api/whatsapp/send-template",
        template_manager: "/api/whatsapp/template-manager"
      }
    })

  } catch (error) {
    console.error('[TEMPLATE-MANAGER] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      action = "test_template",
      templateSid,
      testScenario = "appointment",
      customVariables,
      testPhone = "+447843275372"
    } = body

    console.log('[TEMPLATE-MANAGER] 🧪 Testing template:', { action, templateSid, testScenario })

    if (action === "test_template") {
      // Predefined test scenarios for ELI MOTORS
      const testScenarios = {
        appointment: {
          variables: { "1": "tomorrow", "2": "2pm" },
          description: "Service appointment reminder"
        },
        mot_reminder: {
          variables: { "1": "AB12 CDE", "2": "31st December" },
          description: "MOT expiry reminder"
        },
        collection: {
          variables: { "1": "your Ford Focus", "2": "ready for collection" },
          description: "Vehicle collection notice"
        },
        urgent_mot: {
          variables: { "1": "AB12 CDE", "2": "in 3 days" },
          description: "Urgent MOT reminder"
        }
      }

      const scenario = testScenarios[testScenario] || testScenarios.appointment
      const variables = customVariables || scenario.variables

      // Send test message
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          templateSid: templateSid || "HXb5b62575e6e4ff6129ad7c8efe1f983e",
          templateVariables: variables,
          messageType: `test_${testScenario}`
        })
      })

      const result = await testResponse.json()

      return NextResponse.json({
        success: true,
        test_completed: true,
        scenario: testScenario,
        scenario_description: scenario.description,
        variables_used: variables,
        template_sid: templateSid || "HXb5b62575e6e4ff6129ad7c8efe1f983e",
        delivery_result: result,
        message: `Template test completed for: ${scenario.description}`
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action"
    }, { status: 400 })

  } catch (error) {
    console.error('[TEMPLATE-MANAGER] Test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
