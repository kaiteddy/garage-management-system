# 🚀 WhatsApp Communication System - Vercel Deployment Guide

## 📋 OVERVIEW

This guide will help you deploy the complete WhatsApp communication system to Vercel and configure all necessary components for production use.

## 🔧 STEP 1: VERCEL ENVIRONMENT VARIABLES

Set these environment variables in your Vercel dashboard:

### Required Variables:
```bash
# Database Configuration
DATABASE_URL=postgresql://[your-neon-connection-string]
DATABASE_URL_UNPOOLED=postgresql://[your-neon-unpooled-connection-string]
POSTGRES_PRISMA_URL=postgresql://[your-neon-prisma-url]

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://garagemanagerpro.vercel.app

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC1572c0e5e4b55bb7440c3d9da482fd36
TWILIO_AUTH_TOKEN=[GET_FRESH_TOKEN_FROM_TWILIO_CONSOLE]
TWILIO_PHONE_NUMBER=+447488896449
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# DVSA/DVLA APIs
DVSA_API_KEY=[your-dvsa-key]
DVLA_API_KEY=AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi
TAPI_CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
TAPI_CLIENT_SECRET=rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74
TAPI_SCOPE=https://tapi.dvsa.gov.uk/.default
TAPI_TOKEN_URL=https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token

# Business Information
BUSINESS_NAME="ELI MOTORS LTD"
BUSINESS_PHONE="0208 203 6449"
BUSINESS_MOBILE="+447950250970"
BUSINESS_EMAIL="info@elimotors.co.uk"
BUSINESS_ADDRESS="123 High Street, Hendon, London NW4 1AB"

# Email Configuration (Optional)
RESEND_API_KEY=[your-resend-api-key]

# Webhook Verification
TWILIO_WEBHOOK_VERIFY_TOKEN=eli_motors_webhook_2024
WHATSAPP_WEBHOOK_VERIFY_TOKEN=eli_motors_whatsapp_2025
```

## 📱 STEP 2: TWILIO CONFIGURATION

### 2.1 Update Auth Token
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Account → API Keys & Tokens
3. Copy the Auth Token
4. Update `TWILIO_AUTH_TOKEN` in Vercel environment variables

### 2.2 Configure Webhooks
Set these webhook URLs in Twilio Console:

```
SMS Webhook URL: https://garagemanagerpro.vercel.app/api/webhooks/communication-responses
WhatsApp Webhook URL: https://garagemanagerpro.vercel.app/api/webhooks/communication-responses
Voice Webhook URL: https://garagemanagerpro.vercel.app/api/voice/webhook
Status Callback URL: https://garagemanagerpro.vercel.app/api/webhooks/status-callback
```

**How to configure:**
1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your phone number: `+447488896449`
3. Set the webhook URLs above
4. Set HTTP method to `POST` for all webhooks
5. Save configuration

## 🔗 STEP 3: WHATSAPP SANDBOX SETUP

### 3.1 Join WhatsApp Sandbox
1. Send this message to `+1 415 523 8886` from your WhatsApp:
   ```
   join <your-sandbox-name>
   ```
2. Find your sandbox name in [Twilio Console → WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/whatsapp/sandbox)

### 3.2 Configure WhatsApp Webhook
1. Go to [Twilio Console → WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/whatsapp/sandbox)
2. Set webhook URL: `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses`
3. Set HTTP method to `POST`
4. Save configuration

## 🗄️ STEP 4: DATABASE SETUP

After deployment, initialize the database:

```bash
# Create communication tables
curl -X POST https://garagemanagerpro.vercel.app/api/setup-communication-database \
  -H "Content-Type: application/json" \
  -d '{"createTables": true, "createIndexes": true, "insertSampleData": true}'

# Verify database setup
curl -X GET https://garagemanagerpro.vercel.app/api/setup-communication-database
```

## 🧪 STEP 5: TESTING

### 5.1 Access Testing Dashboard
Visit: https://garagemanagerpro.vercel.app/test-communications

### 5.2 Run System Tests
```bash
# Full system test
curl -X POST https://garagemanagerpro.vercel.app/api/test-communication-system \
  -H "Content-Type: application/json" \
  -d '{"testType": "full", "testPhoneNumber": "+447488896449", "dryRun": true}'

# WhatsApp setup verification
curl -X GET https://garagemanagerpro.vercel.app/api/whatsapp/setup-sender

# Test MOT campaign (dry run)
curl -X POST https://garagemanagerpro.vercel.app/api/reminders/mot-campaign \
  -H "Content-Type: application/json" \
  -d '{"campaignType": "critical", "dryRun": true, "limit": 5}'
```

### 5.3 Test WhatsApp Messaging
1. Go to testing dashboard
2. Navigate to "WhatsApp Setup" tab
3. Click "Send Test Message"
4. Verify message received on your phone

## 📊 STEP 6: MONITORING & ANALYTICS

### 6.1 Communication Dashboard
Visit: https://garagemanagerpro.vercel.app/communications

### 6.2 Key Metrics to Monitor
- WhatsApp delivery success rate (target: 95%+)
- SMS fallback usage rate
- Email fallback usage rate
- Customer response processing accuracy
- Campaign effectiveness and ROI

## 🚀 STEP 7: PRODUCTION READINESS

### 7.1 WhatsApp Business API Application
1. Apply for WhatsApp Business API through Twilio
2. Complete Meta Business Manager verification
3. Configure approved message templates
4. Update `TWILIO_WHATSAPP_NUMBER` to production number

### 7.2 Message Templates
Create these approved templates in Meta Business Manager:
- MOT reminder (critical)
- MOT reminder (due soon)
- MOT reminder (upcoming)
- Booking confirmation
- Service reminder

### 7.3 Staff Training
- Train staff on response management dashboard
- Set up escalation procedures
- Configure business hours and auto-responses

## 🔒 STEP 8: SECURITY & COMPLIANCE

### 8.1 GDPR Compliance
- Customer consent management is built-in
- Opt-out processing is automatic
- Data retention policies are configurable

### 8.2 Webhook Security
- Webhook verification tokens are configured
- HTTPS endpoints ensure secure communication
- Request validation prevents unauthorized access

## 📞 STEP 9: SUPPORT & TROUBLESHOOTING

### 9.1 Common Issues

**"Authenticate" Error:**
- Update `TWILIO_AUTH_TOKEN` with fresh token from Twilio Console

**WhatsApp Messages Not Received:**
- Ensure you've joined the sandbox with correct code
- Check webhook configuration in Twilio Console
- Verify phone number format (+447488896449)

**Database Connection Issues:**
- Verify `DATABASE_URL` in Vercel environment variables
- Check Neon database status and connection limits

**Webhook 404 Errors:**
- Ensure Vercel deployment is successful
- Check webhook URLs are correctly configured in Twilio
- Verify endpoints are accessible publicly

### 9.2 Support Resources
- **Twilio Console**: https://console.twilio.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Testing Dashboard**: https://garagemanagerpro.vercel.app/test-communications
- **Communication Management**: https://garagemanagerpro.vercel.app/communications

## 🎯 QUICK START CHECKLIST

- [ ] Deploy code to Vercel
- [ ] Set environment variables in Vercel dashboard
- [ ] Update Twilio auth token
- [ ] Configure webhooks in Twilio Console
- [ ] Join WhatsApp sandbox
- [ ] Initialize database tables
- [ ] Run system tests
- [ ] Test WhatsApp messaging
- [ ] Configure MOT campaigns
- [ ] Train staff on system usage

## 🎉 SUCCESS METRICS

Your system is working correctly when:
- ✅ All system tests pass
- ✅ WhatsApp test messages are received
- ✅ SMS fallback works when WhatsApp fails
- ✅ Customer responses are automatically processed
- ✅ MOT campaigns can be sent successfully
- ✅ Correspondence history is tracked properly

---

**🚀 Ready to revolutionize your customer communication with intelligent multi-channel messaging!**
