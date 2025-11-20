-- WhatsApp Database Management Schema
-- Comprehensive conversation tracking with data protection compliance

-- WhatsApp Conversations Table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT,
    phone_number TEXT NOT NULL,
    conversation_sid TEXT UNIQUE, -- Twilio conversation ID
    status TEXT DEFAULT 'active', -- active, archived, blocked, opted_out
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    
    -- Data Protection Fields
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP,
    consent_method TEXT, -- 'explicit', 'implied', 'opt_in'
    data_retention_until DATE,
    
    -- Business Context
    conversation_type TEXT DEFAULT 'customer_service', -- mot_reminder, service_booking, customer_service
    vehicle_registration TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'blocked', 'opted_out')),
    CONSTRAINT valid_consent_method CHECK (consent_method IN ('explicit', 'implied', 'opt_in', 'legitimate_interest'))
);

-- WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    message_sid TEXT UNIQUE NOT NULL, -- Twilio message SID
    
    -- Message Details
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    message_type TEXT DEFAULT 'text', -- text, media, template, location
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of media URLs
    
    -- Sender/Recipient
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    
    -- Status Tracking
    status TEXT DEFAULT 'queued', -- queued, sent, delivered, read, failed
    error_code TEXT,
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Business Context
    campaign_id UUID, -- Link to campaigns
    template_id TEXT, -- WhatsApp template ID
    vehicle_registration TEXT,
    reminder_type TEXT, -- mot_critical, mot_due, service_due
    
    -- Cost Tracking
    cost DECIMAL(10,4) DEFAULT 0,
    currency TEXT DEFAULT 'GBP',
    
    -- Data Protection
    encrypted_content TEXT, -- For sensitive data
    retention_until DATE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
    CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'media', 'template', 'location', 'document')),
    CONSTRAINT valid_status CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'undelivered'))
);

-- WhatsApp Templates Table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT UNIQUE NOT NULL,
    template_id TEXT UNIQUE, -- Meta/WhatsApp template ID
    language_code TEXT DEFAULT 'en_GB',
    
    -- Template Content
    header_text TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    
    -- Variables
    variables JSONB DEFAULT '[]', -- Array of variable definitions
    
    -- Status
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, disabled
    category TEXT DEFAULT 'utility', -- utility, marketing, authentication
    
    -- Usage Tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Approval Details
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    
    -- Data Protection
    contains_personal_data BOOLEAN DEFAULT TRUE,
    data_categories TEXT[], -- Array like ['contact_info', 'vehicle_data', 'service_history']
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'disabled')),
    CONSTRAINT valid_category CHECK (category IN ('utility', 'marketing', 'authentication'))
);

-- WhatsApp Campaigns Table
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name TEXT NOT NULL,
    campaign_type TEXT NOT NULL, -- mot_reminders, service_reminders, marketing
    
    -- Campaign Details
    template_id UUID REFERENCES whatsapp_templates(id),
    target_criteria JSONB, -- Criteria for selecting customers
    
    -- Scheduling
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Status
    status TEXT DEFAULT 'draft', -- draft, scheduled, running, completed, cancelled, failed
    
    -- Results
    total_recipients INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    
    -- Cost Tracking
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    actual_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Data Protection
    consent_verified BOOLEAN DEFAULT FALSE,
    gdpr_compliant BOOLEAN DEFAULT FALSE,
    data_processing_basis TEXT, -- 'consent', 'legitimate_interest', 'contract'
    
    -- Fallback Configuration
    sms_fallback_enabled BOOLEAN DEFAULT TRUE,
    sms_fallback_delay_minutes INTEGER DEFAULT 30,
    
    created_by TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed')),
    CONSTRAINT valid_campaign_type CHECK (campaign_type IN ('mot_reminders', 'service_reminders', 'marketing', 'customer_service')),
    CONSTRAINT valid_processing_basis CHECK (data_processing_basis IN ('consent', 'legitimate_interest', 'contract', 'legal_obligation'))
);

-- Customer Consent Management
CREATE TABLE IF NOT EXISTS customer_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    
    -- Consent Details
    whatsapp_consent BOOLEAN DEFAULT FALSE,
    sms_consent BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    
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
    
    -- Verification
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verified_at TIMESTAMP,
    verification_method TEXT, -- 'sms_code', 'whatsapp_reply', 'phone_call'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(customer_id, phone_number),
    CONSTRAINT valid_consent_method CHECK (consent_method IN ('website_form', 'phone_call', 'in_person', 'implied', 'whatsapp_reply')),
    CONSTRAINT valid_opt_out_method CHECK (opt_out_method IN ('whatsapp_reply', 'phone_call', 'email', 'in_person', 'sms_reply'))
);

-- Message Verification Queue
CREATE TABLE IF NOT EXISTS message_verification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Message Details
    customer_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    vehicle_registration TEXT,
    message_type TEXT NOT NULL, -- 'mot_reminder', 'service_reminder', 'marketing'
    
    -- Content
    message_content TEXT NOT NULL,
    template_id UUID REFERENCES whatsapp_templates(id),
    variables JSONB DEFAULT '{}',
    
    -- Verification Status
    verification_status TEXT DEFAULT 'pending', -- pending, approved, rejected, expired
    verified_by TEXT,
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Scheduling
    scheduled_send_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Fallback
    fallback_to_sms BOOLEAN DEFAULT TRUE,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    
    -- Data Protection
    consent_verified BOOLEAN DEFAULT FALSE,
    gdpr_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_verification_status CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired', 'sent')),
    CONSTRAINT valid_message_type CHECK (message_type IN ('mot_reminder', 'service_reminder', 'marketing', 'appointment_confirmation'))
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_id ON whatsapp_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_vehicle ON whatsapp_messages(vehicle_registration);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);

CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_type ON whatsapp_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_scheduled ON whatsapp_campaigns(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_customer_consent_customer_id ON customer_consent(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_consent_phone ON customer_consent(phone_number);
CREATE INDEX IF NOT EXISTS idx_customer_consent_whatsapp ON customer_consent(whatsapp_consent);

CREATE INDEX IF NOT EXISTS idx_verification_queue_status ON message_verification_queue(verification_status);
CREATE INDEX IF NOT EXISTS idx_verification_queue_scheduled ON message_verification_queue(scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_verification_queue_expires ON message_verification_queue(expires_at);

-- Data Protection Views
CREATE OR REPLACE VIEW customer_communication_preferences AS
SELECT 
    c.customer_id,
    c.phone_number,
    c.whatsapp_consent,
    c.sms_consent,
    c.marketing_consent,
    c.consent_given_at,
    c.opted_out_at,
    c.data_retention_period_months,
    c.delete_after_date,
    CASE 
        WHEN c.delete_after_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN c.opted_out_at IS NOT NULL THEN 'OPTED_OUT'
        WHEN c.whatsapp_consent = TRUE THEN 'WHATSAPP_OK'
        WHEN c.sms_consent = TRUE THEN 'SMS_OK'
        ELSE 'NO_CONSENT'
    END as communication_status
FROM customer_consent c;

-- Conversation Summary View
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
    conv.id,
    conv.customer_id,
    conv.phone_number,
    conv.status,
    conv.conversation_type,
    conv.vehicle_registration,
    conv.message_count,
    conv.last_message_at,
    conv.consent_given,
    COUNT(msg.id) as actual_message_count,
    MAX(msg.sent_at) as last_actual_message,
    SUM(CASE WHEN msg.direction = 'outbound' THEN msg.cost ELSE 0 END) as total_cost,
    COUNT(CASE WHEN msg.direction = 'inbound' THEN 1 END) as inbound_messages,
    COUNT(CASE WHEN msg.direction = 'outbound' THEN 1 END) as outbound_messages
FROM whatsapp_conversations conv
LEFT JOIN whatsapp_messages msg ON conv.id = msg.conversation_id
GROUP BY conv.id, conv.customer_id, conv.phone_number, conv.status, 
         conv.conversation_type, conv.vehicle_registration, conv.message_count, 
         conv.last_message_at, conv.consent_given;
