import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET() {
  try {
    console.log('[WHATSAPP-TEMPLATES] Fetching message templates...')

    // Ensure the table exists
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
        language TEXT DEFAULT 'en',
        status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
        content TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        whatsapp_template_id TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        submitted_at TIMESTAMP,
        approved_at TIMESTAMP
      )
    `

    const templates = await sql`
      SELECT * FROM whatsapp_message_templates 
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        language: template.language,
        status: template.status,
        content: template.content,
        variables: template.variables || [],
        whatsappTemplateId: template.whatsapp_template_id,
        rejectionReason: template.rejection_reason,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
        submittedAt: template.submitted_at,
        approvedAt: template.approved_at
      }))
    })

  } catch (error) {
    console.error('[WHATSAPP-TEMPLATES] Error fetching templates:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[WHATSAPP-TEMPLATES] Creating new message template...')

    const { name, category, content, variables } = await request.json()

    if (!name || !category || !content) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, category, content'
      }, { status: 400 })
    }

    // Ensure the table exists
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
        language TEXT DEFAULT 'en',
        status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
        content TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        whatsapp_template_id TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        submitted_at TIMESTAMP,
        approved_at TIMESTAMP
      )
    `

    // Extract variables from content if not provided
    const templateVariables = variables || extractVariablesFromContent(content)

    const result = await sql`
      INSERT INTO whatsapp_message_templates (
        name, category, content, variables
      ) VALUES (
        ${name}, ${category}, ${content}, ${JSON.stringify(templateVariables)}
      )
      RETURNING *
    `

    const template = result[0]

    console.log('[WHATSAPP-TEMPLATES] Template created successfully:', template.id)

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        language: template.language,
        status: template.status,
        content: template.content,
        variables: template.variables || [],
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-TEMPLATES] Error creating template:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function extractVariablesFromContent(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g)
  return matches ? matches.map(match => match.replace(/[{}]/g, '')) : []
}
