# WhatsApp Business Setup Guide for ELI MOTORS LTD

## Current Status
- **Twilio Account**: Active (AC1572c0e5e4b55bb7440c3d9da482fd36)
- **Business Number**: +447488896449 
- **SMS Capability**: ✅ Working
- **WhatsApp Sandbox**: ✅ Working (whatsapp:+14155238886)
- **WhatsApp Business Sender**: ❌ NOT REGISTERED

## Step 1: Register WhatsApp Business Sender

### Action Required
1. **Go to Twilio Console**: https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders
2. **Click "Register a WhatsApp Sender"**
3. **Enter Business Number**: +447488896449
4. **Select Country**: United Kingdom (+44)

### Business Information to Provide
```
Business Name: ELI MOTORS LTD
Display Name: ELI MOTORS LTD
Business Category: Automotive Services
Business Description: Professional MOT testing and vehicle servicing. Serving Hendon since 1979.
Website: https://www.elimotors.co.uk
Business Address: [Your actual business address in Hendon]
```

## Step 2: Business Verification Documents

### Required Documents
1. **Business Registration Certificate** (Companies House document for ELI MOTORS LTD)
2. **Proof of Address** (Business utility bill or bank statement)
3. **Government-issued ID** (Director's passport/driving license)
4. **Business License** (If applicable for automotive services)

### Business Profile Information
```json
{
  "legal_name": "ELI MOTORS LTD",
  "display_name": "ELI MOTORS LTD",
  "category": "AUTOMOTIVE",
  "description": "Professional MOT testing and vehicle servicing. Serving Hendon since 1979. Call 0208 203 6449 to book.",
  "website": "https://www.elimotors.co.uk",
  "email": "[Your business email]",
  "phone": "0208 203 6449",
  "established_year": 1979,
  "address": {
    "street": "[Your Street Address]",
    "city": "Hendon",
    "postcode": "[Your Postcode]",
    "country": "United Kingdom"
  }
}
```

## Step 3: WhatsApp Business Use Case

### Primary Use Case
**Customer Service & Notifications**

### Message Types
- MOT expiry reminders
- Service appointment confirmations  
- Vehicle status updates
- Customer service responses
- Promotional messages (with opt-in)

### Expected Volume
- **Monthly Messages**: 500-1000
- **Customer Base**: Local UK customers requiring MOT and vehicle services
- **Peak Times**: MOT renewal periods

### Sample Messages
```
🚗 ELI MOTORS LTD - MOT Reminder

Hi [Customer Name],

Your vehicle [Registration] MOT expires on [Date].

📅 Book your MOT test today
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk

Serving Hendon since 1979 ✨

Reply STOP to opt out.
```

## Step 4: Meta Business Verification

### Facebook Business Manager Setup
1. **Create/Access Facebook Business Manager**
2. **Add ELI MOTORS LTD as Business**
3. **Verify Business with Meta**
4. **Connect WhatsApp Business Account**: 1560904015316182

### Verification Process
- Business verification can take 1-3 business days
- Meta will review business legitimacy
- May require additional documentation

## Step 5: Technical Integration

### Environment Variables (Already Configured)
```bash
# Current Sandbox (for testing)
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Future Production (after approval)
TWILIO_WHATSAPP_NUMBER=whatsapp:+447488896449
```

### Webhook Configuration
```bash
# Already configured
TWILIO_WEBHOOK_URL=https://garage-manager.eu.ngrok.io/api/whatsapp/webhook
WHATSAPP_WEBHOOK_VERIFY_TOKEN=eli_motors_whatsapp_2025
```

## Step 6: Testing & Deployment

### Current Testing (Sandbox)
- ✅ WhatsApp Service classes implemented
- ✅ Message templates ready
- ✅ Webhook handlers configured
- ✅ Conversation tracking system

### Production Deployment Checklist
- [ ] Business sender registered
- [ ] Documents submitted
- [ ] Meta verification complete
- [ ] Production number approved
- [ ] Update environment variables
- [ ] Test production messaging
- [ ] Configure message templates
- [ ] Set up customer opt-in process

## Troubleshooting

### Common Issues
1. **Rate Limiting**: Wait 24-48 hours between verification attempts
2. **Document Rejection**: Ensure documents are clear, recent, and match business name exactly
3. **Business Category**: Use "Automotive Services" or "Professional Services"
4. **Address Verification**: Must match official business registration

### Support Contacts
- **Twilio Support**: https://support.twilio.com
- **Meta Business Support**: https://business.facebook.com/help
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp

## Timeline Expectations

### Realistic Timeline
- **Step 1-2**: Same day (Register sender + submit documents)
- **Step 3-4**: 1-3 business days (Meta verification)
- **Step 5**: 3-7 business days (Final approval)
- **Total**: 1-2 weeks for full approval

### What You Can Do Now
1. **Register the sender** in Twilio Console
2. **Prepare business documents**
3. **Continue testing** with sandbox number
4. **Prepare message templates**

## Next Steps

1. **Immediate**: Register WhatsApp sender in Twilio Console
2. **Today**: Submit business verification documents
3. **This Week**: Monitor approval status
4. **After Approval**: Switch to production number and launch

---

**Note**: Keep using the sandbox (whatsapp:+14155238886) for testing while waiting for business approval. All your WhatsApp integration code is ready and will work seamlessly once you switch to the production number.
