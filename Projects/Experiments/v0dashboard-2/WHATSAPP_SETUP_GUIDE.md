# 📱 WhatsApp Business API Setup Guide for GarageManager Pro

## 🎯 **Overview**

This guide will help you set up WhatsApp Business API through Twilio for your GarageManager Pro system. WhatsApp offers significant cost savings and better customer engagement compared to traditional SMS.

## 💰 **Cost Comparison**

| Channel | Cost | Description | 1,000 Messages |
|---------|------|-------------|----------------|
| **SMS** | £0.04 | Per message | £40 |
| **WhatsApp Service** | £0.005 | Per 24-hour conversation | £5 |
| **WhatsApp Marketing** | £0.025 | Per 24-hour conversation | £25 |

**💡 Potential Savings: Up to 87.5% cost reduction!**

## 🚀 **Setup Steps**

### **Step 1: Meta Business Manager Account**
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Create a business account (free)
3. Verify your business information
4. Add your business phone number

### **Step 2: Twilio Account Setup**
1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Complete account verification
3. Add billing information
4. Note down your Account SID and Auth Token

### **Step 3: WhatsApp Business API Registration**
1. In Twilio Console, go to [WhatsApp Senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
2. Click "Create new WhatsApp sender"
3. Enter your business phone number
4. Complete the verification process
5. Submit for Meta approval (usually 1-3 business days)

### **Step 4: Environment Configuration**
Add these variables to your `.env.local` file:

```bash
# Existing Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+447xxxxxxxxx

# New WhatsApp Configuration
TWILIO_WHATSAPP_NUMBER=whatsapp:+447xxxxxxxxx
```

### **Step 5: Webhook Configuration (Optional)**
For receiving WhatsApp messages:
```bash
TWILIO_WEBHOOK_URL=https://your-domain.com/api/sms/webhook
```

## 🔧 **Technical Implementation**

### **Enhanced Twilio Service**
The system now supports both SMS and WhatsApp through a unified interface:

```typescript
// Automatic channel selection (prefers WhatsApp if configured)
const result = await TwilioService.sendMessage({
  to: '+447123456789',
  body: 'Your MOT expires soon!',
  messageType: 'service',
  customerId: 'customer-id'
})

// Force specific channel
const whatsappResult = await TwilioService.sendWhatsApp({
  to: '+447123456789',
  body: 'Your MOT expires soon!',
  channel: 'whatsapp'
})
```

### **Message Types & Pricing**
- **Service Messages** (£0.005): MOT reminders, appointment confirmations
- **Marketing Messages** (£0.025): Promotional offers, newsletters
- **Customer-Initiated** (FREE): Responses to your messages

## 📋 **Approval Process**

### **What Meta Reviews:**
1. **Business Verification**: Legitimate business with valid contact info
2. **Use Case**: Automotive service reminders are typically approved
3. **Compliance**: Following WhatsApp Business Policy
4. **Phone Number**: Must be business-owned, not personal

### **Approval Timeline:**
- **Standard**: 1-3 business days
- **Complex Cases**: Up to 7 days
- **Rejections**: Can reapply with corrections

### **Common Rejection Reasons:**
- Personal phone number used
- Incomplete business verification
- Unclear use case description
- Policy violations

## ✅ **Testing Your Setup**

### **1. Configuration Check**
Visit: `https://your-domain.com/whatsapp-setup`
- Verify all environment variables are set
- Check Twilio account status
- Confirm WhatsApp number registration

### **2. Send Test Message**
```bash
curl -X POST https://your-domain.com/api/sms/test-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+447123456789",
    "message": "Test WhatsApp from GarageManager Pro"
  }'
```

### **3. Monitor Logs**
Check your application logs for:
- Message delivery status
- Cost tracking
- Error messages

## 🎯 **Best Practices**

### **Message Templates**
Create approved message templates for:
- MOT expiry reminders
- Service appointment confirmations
- Payment reminders
- General notifications

### **Customer Opt-in**
- Always get explicit consent for WhatsApp messages
- Provide easy opt-out options
- Respect customer preferences

### **Conversation Management**
- Keep conversations within 24-hour windows for cost efficiency
- Use service conversations for transactional messages
- Use marketing conversations for promotional content

## 🔍 **Monitoring & Analytics**

### **Cost Tracking**
The system automatically tracks:
- Message costs per channel
- Conversation-based pricing
- Monthly spending reports

### **Delivery Status**
Monitor message delivery through:
- Twilio Console
- Application logs
- SMS dashboard

### **Customer Engagement**
Track:
- Response rates
- Opt-out rates
- Customer satisfaction

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **"WhatsApp not configured" Error**
- Check `TWILIO_WHATSAPP_NUMBER` environment variable
- Ensure number includes `whatsapp:` prefix
- Verify Twilio account has WhatsApp enabled

#### **"Message failed to send" Error**
- Verify recipient number format (+447xxxxxxxxx)
- Check Twilio account balance
- Confirm WhatsApp sender is approved

#### **"Conversation not found" Error**
- Customer may not have WhatsApp
- Number may be invalid
- 24-hour conversation window may have expired

### **Support Resources:**
- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)

## 📞 **Migration Strategy**

### **Phase 1: Parallel Running**
- Keep SMS active
- Add WhatsApp for new customers
- Test with small customer groups

### **Phase 2: Gradual Migration**
- Migrate high-engagement customers first
- Monitor delivery rates and costs
- Collect customer feedback

### **Phase 3: Full Migration**
- Switch primary channel to WhatsApp
- Keep SMS as fallback
- Optimize for cost and engagement

## 💡 **Advanced Features**

### **Rich Media Support**
WhatsApp supports:
- Images (service photos, receipts)
- Documents (invoices, certificates)
- Location sharing
- Quick reply buttons

### **Template Messages**
Pre-approved templates for:
- Appointment reminders
- Service completion notifications
- Payment confirmations
- Emergency alerts

### **Interactive Messages**
- Quick reply buttons
- List messages
- Call-to-action buttons

## 📈 **Expected Results**

### **Cost Savings:**
- **87.5% reduction** in messaging costs
- **Conversation-based pricing** vs per-message
- **Free customer responses** within 24-hour windows

### **Engagement Improvements:**
- **Higher open rates** (98% vs 20% for SMS)
- **Better customer experience** with rich media
- **Reduced customer service load** with self-service options

### **Operational Benefits:**
- **Unified messaging platform**
- **Better delivery tracking**
- **Enhanced customer data collection**

---

## 🎉 **Ready to Get Started?**

1. **Visit the WhatsApp Setup page**: `/whatsapp-setup`
2. **Follow the step-by-step guide**
3. **Test your integration**
4. **Start saving money and improving customer engagement!**

For technical support, check the application logs or contact your development team.
