import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET() {
  try {
    console.log('[WHATSAPP-PROFILE] Fetching business profile...')

    const result = await sql`
      SELECT * FROM whatsapp_business_profile 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (result.length === 0) {
      // Return default profile
      return NextResponse.json({
        success: true,
        profile: {
          businessName: 'ELI MOTORS LTD',
          displayName: 'ELI MOTORS LTD',
          about: 'Professional MOT testing and vehicle servicing. Serving Hendon since 1979. Call 0208 203 6449 to book.',
          description: 'ELI MOTORS LTD - Your trusted MOT and service centre in Hendon. Established 1979. Professional vehicle testing, servicing, and maintenance.',
          phone: '0208 203 6449',
          email: '',
          website: 'https://www.elimotors.co.uk',
          address: '',
          category: 'Automotive Services'
        },
        businessHours: {
          monday: '8:00 AM - 6:00 PM',
          tuesday: '8:00 AM - 6:00 PM',
          wednesday: '8:00 AM - 6:00 PM',
          thursday: '8:00 AM - 6:00 PM',
          friday: '8:00 AM - 6:00 PM',
          saturday: '8:00 AM - 4:00 PM',
          sunday: 'Closed'
        }
      })
    }

    const profile = result[0]
    
    return NextResponse.json({
      success: true,
      profile: {
        businessName: profile.business_name,
        displayName: profile.display_name,
        about: profile.about,
        description: profile.description,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        address: profile.address,
        category: profile.category
      },
      businessHours: profile.business_hours || {},
      logo: profile.logo_url
    })

  } catch (error) {
    console.error('[WHATSAPP-PROFILE] Error fetching profile:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[WHATSAPP-PROFILE] Saving business profile...')

    const { profile, businessHours, logo } = await request.json()

    // Ensure the table exists
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_business_profile (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        about TEXT,
        description TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        address TEXT,
        category TEXT,
        business_hours JSONB,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Check if profile exists
    const existingProfile = await sql`
      SELECT id FROM whatsapp_business_profile 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (existingProfile.length > 0) {
      // Update existing profile
      await sql`
        UPDATE whatsapp_business_profile 
        SET 
          business_name = ${profile.businessName},
          display_name = ${profile.displayName},
          about = ${profile.about},
          description = ${profile.description},
          phone = ${profile.phone},
          email = ${profile.email},
          website = ${profile.website},
          address = ${profile.address},
          category = ${profile.category},
          business_hours = ${JSON.stringify(businessHours)},
          logo_url = ${logo || null},
          updated_at = NOW()
        WHERE id = ${existingProfile[0].id}
      `
    } else {
      // Create new profile
      await sql`
        INSERT INTO whatsapp_business_profile (
          business_name, display_name, about, description, phone, email, 
          website, address, category, business_hours, logo_url
        ) VALUES (
          ${profile.businessName}, ${profile.displayName}, ${profile.about}, 
          ${profile.description}, ${profile.phone}, ${profile.email}, 
          ${profile.website}, ${profile.address}, ${profile.category}, 
          ${JSON.stringify(businessHours)}, ${logo || null}
        )
      `
    }

    console.log('[WHATSAPP-PROFILE] Business profile saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Business profile saved successfully'
    })

  } catch (error) {
    console.error('[WHATSAPP-PROFILE] Error saving profile:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
