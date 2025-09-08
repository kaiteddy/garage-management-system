# 🔧 Complete Twilio Configuration Guide for ELI MOTORS LTD

## 📱 **1. WhatsApp Business API Setup**

### **1.1 WhatsApp Sender Registration**
**URL:** https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders

**Steps:**
1. Click **"Create new WhatsApp sender"**
2. **Business Information:**
   - **Display Name:** ELI MOTORS LTD
   - **Phone Number:** +447488896449
   - **Business Category:** Automotive Services
   - **Business Description:** "MOT testing, vehicle servicing, and automotive maintenance services"
   - **Website:** [Your website if available]

3. **Business Verification Documents:**
   - UK Business Registration Certificate
   - Proof of Address (utility bill/bank statement)
   - Business License (if applicable)

### **1.2 Meta Business Manager Setup**
**URL:** https://business.facebook.com/

**Required:**
1. **Create Business Manager Account**
2. **Add Business Details:**
   - Business Name: ELI MOTORS LTD
   - Business Address: [Your garage address]
   - Business Phone: +447488896449
   - Industry: Automotive Services

3. **Verify Business:**
   - Upload business documents
   - Verify phone number
   - Complete business verification process

---

## 📞 **2. Phone Number Configuration**

### **2.1 Voice Configuration**
**URL:** https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

**Steps:**
1. **Find your number:** +447488896449
2. **Click on the number**
3. **Voice Configuration:**
   ```
   Webhook: https://toxic-las-equilibrium-failed.trycloudflare.com/api/twilio/voice
   HTTP Method: POST
   ```

### **2.2 SMS Configuration**
**In the same phone number settings:**
```
SMS Webhook: https://toxic-las-equilibrium-failed.trycloudflare.com/api/sms/webhook
HTTP Method: POST
```

---

## 💬 **3. WhatsApp Webhook Configuration**

### **3.1 WhatsApp Sandbox (For Testing)**
**URL:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp

**Steps:**
1. **Join Sandbox:** Send "join ELI-MOTORS" to +14155238886
2. **Test Number:** Add +447843275372 to sandbox
3. **Webhook URL:** 
   ```
   https://toxic-las-equilibrium-failed.trycloudflare.com/api/whatsapp/webhook
   ```

### **3.2 Production WhatsApp Webhook**
**After WhatsApp Business API approval:**

**URL:** https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders

**Configuration:**
```
Webhook URL: https://toxic-las-equilibrium-failed.trycloudflare.com/api/whatsapp/webhook
HTTP Method: POST
Events: 
- Message Status
- Inbound Messages
```

---

## 🔐 **4. Security Configuration**

### **4.1 Webhook Authentication**
**In Twilio Console → Account → General Settings:**

**Request Validation:**
- ✅ Enable webhook signature validation
- **Verify Token:** eli_motors_whatsapp_2025

### **4.2 API Key Management**
**URL:** https://console.twilio.com/us1/account/keys-credentials/api-keys

**Create API Key:**
1. **Click:** "Create new API Key"
2. **Name:** "ELI MOTORS WhatsApp System"
3. **Type:** Standard
4. **Save:** SID and Secret securely

---

## 📋 **5. WhatsApp Templates**

### **5.1 Create Message Templates**
**URL:** https://console.twilio.com/us1/develop/sms/senders/whatsapp-templates

**Template 1: MOT Critical Reminder**
```
Name: mot_critical_reminder
Category: UTILITY
Language: en_GB

Header: None
Body: 
🚗 MOT Reminder from ELI MOTORS LTD

Dear {{1}},

🚨 URGENT: Your {{2}} ({{3}}) MOT expires in {{4}} days on {{5}}.

Driving without valid MOT is illegal and can result in fines and penalty points!

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration={{3}}&checkRecalls=true

Reply STOP to opt out.

Footer: ELI MOTORS LTD
```

**Template 2: MOT Due Soon**
```
Name: mot_due_soon
Category: UTILITY
Language: en_GB

Body:
🚗 MOT Reminder from ELI MOTORS LTD

Dear {{1}},

Your {{2}} ({{3}}) MOT expires on {{4}}.

We recommend booking your MOT test soon.

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration={{3}}&checkRecalls=true

Reply STOP to opt out.

Footer: ELI MOTORS LTD
```

### **5.2 Template Variables**
- {{1}} = Customer Name
- {{2}} = Vehicle Make/Model
- {{3}} = Registration Number
- {{4}} = Days until expiry / Expiry date
- {{5}} = Expiry date (for critical template)

---

## 🔧 **6. Twilio Studio Flow (Optional Advanced)**

### **6.1 Create Voice Flow**
**URL:** https://console.twilio.com/us1/develop/studio/flows

**Flow Name:** ELI MOTORS Voice Menu

**Flow Structure:**
```
1. Say Widget: "Hello, thank you for calling ELI MOTORS LTD..."
2. Gather Digits Widget: Menu options (1-4, 0)
3. Split Based On: Digit pressed
4. Connect Call Widget: Forward to main number
5. Record Voicemail Widget: For after hours
```

---

## 📊 **7. Monitoring & Analytics**

### **7.1 Usage Monitoring**
**URL:** https://console.twilio.com/us1/monitor/usage

**Monitor:**
- SMS usage and costs
- WhatsApp conversation costs
- Voice call minutes
- Error rates

### **7.2 Logs & Debugging**
**URL:** https://console.twilio.com/us1/monitor/logs/errors

**Check for:**
- Webhook delivery failures
- Message delivery issues
- Voice call problems

---

## 🚀 **8. Step-by-Step Configuration Checklist**

### **Phase 1: Immediate Setup (5 minutes)**
- [ ] Configure voice webhook for +447488896449
- [ ] Configure SMS webhook for +447488896449
- [ ] Test phone number by calling it
- [ ] Join WhatsApp sandbox for testing

### **Phase 2: WhatsApp Business Setup (1-3 days)**
- [ ] Submit WhatsApp Business API application
- [ ] Complete Meta Business Manager verification
- [ ] Upload business documents
- [ ] Wait for approval

### **Phase 3: Production Configuration (After approval)**
- [ ] Configure production WhatsApp webhook
- [ ] Submit message templates for approval
- [ ] Update system to use production WhatsApp number
- [ ] Test end-to-end messaging

### **Phase 4: Optimization**
- [ ] Set up monitoring and alerts
- [ ] Configure advanced analytics
- [ ] Optimize message templates based on performance
- [ ] Train staff on new system

---

## 🔗 **9. Important URLs**

| Service | URL | Purpose |
|---------|-----|---------|
| **Phone Numbers** | https://console.twilio.com/us1/develop/phone-numbers/manage/incoming | Configure voice/SMS |
| **WhatsApp Senders** | https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders | WhatsApp Business setup |
| **WhatsApp Templates** | https://console.twilio.com/us1/develop/sms/senders/whatsapp-templates | Message templates |
| **WhatsApp Sandbox** | https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp | Testing |
| **Usage Monitor** | https://console.twilio.com/us1/monitor/usage | Cost tracking |
| **Error Logs** | https://console.twilio.com/us1/monitor/logs/errors | Debugging |

---

## 📞 **10. Testing Your Configuration**

### **10.1 Voice System Test**
1. **Call:** +447488896449
2. **Expected:** Professional greeting with menu
3. **Test each option:** 1, 2, 3, 0
4. **Verify:** Calls connect or record voicemail

### **10.2 SMS Test**
1. **Send test SMS** from Twilio Console
2. **Verify:** Message delivered
3. **Check:** Webhook receives delivery status

### **10.3 WhatsApp Test**
1. **Join sandbox:** Send "join ELI-MOTORS" to +14155238886
2. **Send test message** from your system
3. **Verify:** Message received on WhatsApp
4. **Test reply:** Send "STOP" to test opt-out

---

## 🆘 **11. Troubleshooting**

### **Common Issues:**
1. **Webhook not receiving data:**
   - Check URL is publicly accessible
   - Verify HTTPS (required)
   - Check webhook signature validation

2. **WhatsApp messages not sending:**
   - Verify sandbox setup
   - Check phone number format (+44...)
   - Ensure business verification complete

3. **Voice calls not working:**
   - Check webhook URL configuration
   - Verify TwiML response format
   - Test webhook endpoint manually

### **Support Resources:**
- **Twilio Docs:** https://www.twilio.com/docs
- **WhatsApp API Docs:** https://www.twilio.com/docs/whatsapp
- **Support:** https://support.twilio.com

---

## 🎯 **Next Steps**

1. **Start with Phase 1** (immediate setup)
2. **Test voice system** by calling +447488896449
3. **Submit WhatsApp Business application**
4. **Begin using SMS system** while waiting for WhatsApp approval
5. **Monitor costs and usage** in Twilio Console

Your ELI MOTORS LTD system will be fully operational with professional branding and significant cost savings!
