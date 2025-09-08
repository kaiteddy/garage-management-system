import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

/**
 * Communication Database Setup
 * POST /api/setup-communication-database
 *
 * Creates all necessary tables for the communication system
 */
export async function POST(request: Request) {
  try {
    console.log('[DB-SETUP] 🗄️ Setting up communication database tables...')

    const body = await request.json()
    const {
      createTables = true,
      createIndexes = true,
      insertSampleData = false
    } = body

    const results = {
      tablesCreated: [],
      indexesCreated: [],
      sampleDataInserted: [],
      errors: []
    }

    if (createTables) {
      // Create customer_correspondence table
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS customer_correspondence (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              customer_id TEXT NOT NULL,
              vehicle_registration TEXT,

              -- Communication Details
              communication_type TEXT NOT NULL, -- 'whatsapp', 'sms', 'email', 'phone_call', 'in_person'
              direction TEXT NOT NULL, -- 'inbound', 'outbound'
              subject TEXT,
              content TEXT NOT NULL,

              -- Channel-Specific IDs
              whatsapp_message_id UUID,
              sms_log_id INTEGER,
              email_id TEXT,
              call_log_id UUID,

              -- Contact Information
              contact_method TEXT, -- phone_number, email_address, in_person
              contact_value TEXT, -- actual phone/email

              -- Message Context
              message_category TEXT, -- 'mot_reminder', 'service_booking', 'customer_service', 'marketing', 'complaint', 'inquiry'
              urgency_level TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'

              -- Status Tracking
              status TEXT DEFAULT 'sent', -- 'queued', 'sent', 'delivered', 'read', 'failed', 'responded'
              delivery_status TEXT,
              read_at TIMESTAMP,
              responded_at TIMESTAMP,

              -- Response Management
              requires_response BOOLEAN DEFAULT FALSE,
              response_deadline TIMESTAMP,
              assigned_to TEXT, -- staff member handling
              response_priority INTEGER DEFAULT 3, -- 1-5 priority scale

              -- Automated Response
              auto_response_sent BOOLEAN DEFAULT FALSE,
              auto_response_type TEXT, -- 'acknowledgment', 'opt_out_confirmation', 'information_request'

              -- Cost Tracking
              cost DECIMAL(10,4) DEFAULT 0,
              currency TEXT DEFAULT 'GBP',

              -- Timestamps
              created_at TIMESTAMP DEFAULT NOW(),
              sent_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),

              -- Constraints
              CONSTRAINT valid_communication_type CHECK (communication_type IN ('whatsapp', 'sms', 'email', 'phone_call', 'in_person', 'manual_followup')),
              CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
              CONSTRAINT valid_status CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'responded', 'archived', 'received', 'pending'))
          )
        `
        results.tablesCreated.push('customer_correspondence')
      } catch (error) {
        results.errors.push(`customer_correspondence: ${error.message}`)
      }

      // Create customer_consent table
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS customer_consent (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              customer_id TEXT NOT NULL,
              phone_number TEXT NOT NULL,

              -- Consent Details
              whatsapp_consent BOOLEAN DEFAULT FALSE,
              sms_consent BOOLEAN DEFAULT FALSE,
              email_consent BOOLEAN DEFAULT FALSE,
              marketing_consent BOOLEAN DEFAULT FALSE,
              call_consent BOOLEAN DEFAULT FALSE,

              -- Consent Tracking
              consent_given_at TIMESTAMP,
              consent_method TEXT, -- 'website_form', 'phone_call', 'in_person', 'implied'
              consent_source TEXT, -- 'booking_form', 'service_visit', 'customer_request'

              -- Opt-out Tracking
              opted_out_at TIMESTAMP,
              opt_out_reason TEXT,
              opt_out_method TEXT, -- 'whatsapp_reply', 'phone_call', 'email', 'in_person'

              -- Data Retention
              data_retention_period_months INTEGER DEFAULT 36,
              delete_after_date DATE,

              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),

              -- Unique constraint
              UNIQUE(customer_id, phone_number)
          )
        `
        results.tablesCreated.push('customer_consent')
      } catch (error) {
        results.errors.push(`customer_consent: ${error.message}`)
      }

      // Create automated_response_rules table
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS automated_response_rules (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              rule_name TEXT NOT NULL,

              -- Trigger Conditions
              trigger_keywords TEXT[], -- Keywords that trigger this rule
              communication_type TEXT[], -- Which channels this applies to
              customer_segment TEXT, -- 'all', 'vip', 'new', 'inactive'

              -- Response Configuration
              response_template TEXT NOT NULL,
              response_delay_minutes INTEGER DEFAULT 0,
              escalation_required BOOLEAN DEFAULT FALSE,
              escalation_to TEXT, -- staff member or department

              -- Business Hours
              business_hours_only BOOLEAN DEFAULT TRUE,
              business_hours_start TIME DEFAULT '09:00',
              business_hours_end TIME DEFAULT '17:00',
              business_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],

              -- Status
              active BOOLEAN DEFAULT TRUE,
              priority INTEGER DEFAULT 5, -- 1-10, higher number = higher priority

              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
          )
        `
        results.tablesCreated.push('automated_response_rules')
      } catch (error) {
        results.errors.push(`automated_response_rules: ${error.message}`)
      }
    }

    if (createIndexes) {
      // Create performance indexes
      const indexes = [
        { name: 'idx_customer_correspondence_customer_id', table: 'customer_correspondence', column: 'customer_id' },
        { name: 'idx_customer_correspondence_communication_type', table: 'customer_correspondence', column: 'communication_type' },
        { name: 'idx_customer_correspondence_created_at', table: 'customer_correspondence', column: 'created_at' },
        { name: 'idx_customer_correspondence_status', table: 'customer_correspondence', column: 'status' },
        { name: 'idx_customer_correspondence_requires_response', table: 'customer_correspondence', column: 'requires_response' },
        { name: 'idx_customer_consent_customer_id', table: 'customer_consent', column: 'customer_id' },
        { name: 'idx_customer_consent_phone_number', table: 'customer_consent', column: 'phone_number' },
        { name: 'idx_automated_response_rules_active', table: 'automated_response_rules', column: 'active' },
        { name: 'idx_automated_response_rules_priority', table: 'automated_response_rules', column: 'priority' }
      ]

      for (const index of indexes) {
        try {
          await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`)
          results.indexesCreated.push(index.name)
        } catch (error) {
          results.errors.push(`${index.name}: ${error.message}`)
        }
      }
    }

    if (insertSampleData) {
      // Insert sample automated response rules
      try {
        await sql`
          INSERT INTO automated_response_rules (
            rule_name,
            trigger_keywords,
            communication_type,
            customer_segment,
            response_template,
            escalation_required,
            priority
          ) VALUES
          (
            'Opt-out Handler',
            ARRAY['stop', 'unsubscribe', 'opt out', 'remove me'],
            ARRAY['whatsapp', 'sms', 'email'],
            'all',
            'Thank you for your request. You have been removed from our communication list. If you need to contact us in the future, please call us directly.',
            false,
            10
          ),
          (
            'Vehicle Sold Handler',
            ARRAY['sold', 'no longer own', 'not my car', 'wrong number'],
            ARRAY['whatsapp', 'sms'],
            'all',
            'Thank you for letting us know. We have updated our records to reflect that you no longer own this vehicle.',
            false,
            9
          ),
          (
            'Booking Request Handler',
            ARRAY['book', 'appointment', 'mot test', 'service', 'when can'],
            ARRAY['whatsapp', 'sms'],
            'all',
            'Thank you for your interest in booking with us! Please call us at [Your Phone Number] or email us at [Your Email] to schedule your appointment.',
            true,
            8
          ),
          (
            'Complaint Handler',
            ARRAY['unhappy', 'complaint', 'poor service', 'disappointed', 'terrible'],
            ARRAY['whatsapp', 'sms', 'email'],
            'all',
            'Thank you for bringing this to our attention. We take all feedback seriously and a senior member of our team will contact you within 24 hours.',
            true,
            10
          )
          ON CONFLICT DO NOTHING
        `
        results.sampleDataInserted.push('automated_response_rules')
      } catch (error) {
        results.errors.push(`sample_data: ${error.message}`)
      }
    }

    console.log(`[DB-SETUP] ✅ Database setup completed: ${results.tablesCreated.length} tables, ${results.indexesCreated.length} indexes`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        tablesCreated: results.tablesCreated.length,
        indexesCreated: results.indexesCreated.length,
        sampleDataInserted: results.sampleDataInserted.length,
        errors: results.errors.length
      }
    })

  } catch (error) {
    console.error('[DB-SETUP] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to setup communication database",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check current database state
    const tableChecks = []

    // Check if tables exist
    const tables = ['customer_correspondence', 'customer_consent', 'automated_response_rules']

    for (const table of tables) {
      try {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${table}
          ) as exists
        `

        tableChecks.push({
          table,
          exists: result[0].exists,
          status: result[0].exists ? 'exists' : 'missing'
        })
      } catch (error) {
        tableChecks.push({
          table,
          exists: false,
          status: 'error',
          error: error.message
        })
      }
    }

    // Check existing WhatsApp tables
    const whatsappTables = ['whatsapp_conversations', 'whatsapp_messages', 'whatsapp_campaigns']

    for (const table of whatsappTables) {
      try {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${table}
          ) as exists
        `

        tableChecks.push({
          table,
          exists: result[0].exists,
          status: result[0].exists ? 'exists' : 'missing',
          type: 'whatsapp'
        })
      } catch (error) {
        tableChecks.push({
          table,
          exists: false,
          status: 'error',
          error: error.message,
          type: 'whatsapp'
        })
      }
    }

    const missingTables = tableChecks.filter(check => !check.exists)
    const existingTables = tableChecks.filter(check => check.exists)

    return NextResponse.json({
      success: true,
      database: {
        status: missingTables.length === 0 ? 'ready' : 'incomplete',
        existingTables: existingTables.length,
        missingTables: missingTables.length,
        totalTables: tableChecks.length
      },
      tables: tableChecks,
      recommendations: missingTables.length > 0 ? [
        'Run POST to this endpoint to create missing tables',
        'Use createTables=true to create communication tables',
        'Use createIndexes=true to create performance indexes',
        'Use insertSampleData=true to add sample automated response rules'
      ] : [
        'Database is ready for communication system',
        'All required tables exist',
        'You can now test the communication functionality'
      ]
    })

  } catch (error) {
    console.error('[DB-SETUP] Error checking database:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check database state",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
