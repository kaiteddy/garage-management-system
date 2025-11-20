import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log('[WHATSAPP-TEMPLATES] Submitting template for approval:', resolvedParams.id)

    // Get the template
    const template = await sql`
      SELECT * FROM whatsapp_message_templates
      WHERE id = ${resolvedParams.id}
      LIMIT 1
    `

    if (template.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }

    const templateData = template[0]

    if (templateData.status !== 'DRAFT') {
      return NextResponse.json({
        success: false,
        error: 'Template must be in DRAFT status to submit'
      }, { status: 400 })
    }

    // In a real implementation, this would submit to WhatsApp Business API
    // For now, we'll simulate the submission process

    // Update template status to PENDING
    await sql`
      UPDATE whatsapp_message_templates
      SET
        status = 'PENDING',
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${resolvedParams.id}
    `

    console.log('[WHATSAPP-TEMPLATES] Template submitted successfully:', resolvedParams.id)

    // In production, you would make an API call to WhatsApp Business API:
    /*
    const whatsappResponse = await submitTemplateToWhatsApp({
      name: templateData.name,
      category: templateData.category,
      language: templateData.language,
      components: [
        {
          type: 'BODY',
          text: templateData.content
        }
      ]
    })
    */

    return NextResponse.json({
      success: true,
      message: 'Template submitted for approval',
      note: 'In production, this would submit to WhatsApp Business API. Approval typically takes 24-48 hours.',
      template: {
        id: templateData.id,
        name: templateData.name,
        status: 'PENDING',
        submittedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-TEMPLATES] Error submitting template:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Function that would be used in production to submit to WhatsApp Business API
async function submitTemplateToWhatsApp(templateData: any) {
  // This would be the actual WhatsApp Business API call
  // const response = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify(templateData)
  // })

  // return await response.json()

  // For now, return a mock response
  return {
    id: 'mock_template_id_' + Date.now(),
    status: 'PENDING'
  }
}
