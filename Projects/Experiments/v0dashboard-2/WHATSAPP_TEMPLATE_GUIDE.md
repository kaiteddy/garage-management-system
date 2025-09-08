# 📱 WhatsApp Template Creation Guide for ELI MOTORS

## 🎯 **QUICK SETUP**

### **Step 1: Create Templates in Twilio Console**
1. **Go to**: [Twilio Content Template Builder](https://console.twilio.com/us1/develop/sms/content-editor)
2. **Click**: "Create new Content"
3. **Use the templates below**

---

## 🚗 **ESSENTIAL GARAGE TEMPLATES**

### **1. MOT EXPIRY URGENT** ⚠️
```
Friendly Name: mot_expiry_urgent
Language: English (en)
Content Type: Text

Body:
🚨 URGENT: Your {{1}} MOT expires on {{2}} ({{3}} days left). Book now at ELI MOTORS to avoid penalties! Call 0208 203 6449

Variables:
{{1}} = Vehicle Registration (e.g., AB12 CDE)
{{2}} = Expiry Date (e.g., 15th September 2024)
{{3}} = Days Remaining (e.g., 5 days)
```

### **2. SERVICE COMPLETED** ✅
```
Friendly Name: service_completed
Language: English (en)
Content Type: Text

Body:
✅ Service completed for {{1}}. {{2}} Your vehicle is ready for collection at ELI MOTORS. Call 0208 203 6449

Variables:
{{1}} = Vehicle Registration (e.g., AB12 CDE)
{{2}} = Work Summary (e.g., Full service & MOT passed)
```

### **3. APPOINTMENT REMINDER** 📅
```
Friendly Name: appointment_reminder_garage
Language: English (en)
Content Type: Text

Body:
📅 Reminder: Your {{1}} is booked for {{2}} on {{3}} at ELI MOTORS. Please arrive 10 minutes early. Call 0208 203 6449

Variables:
{{1}} = Vehicle Registration (e.g., AB12 CDE)
{{2}} = Service Type (e.g., MOT Test)
{{3}} = Date & Time (e.g., Monday 15th Sept at 2:00pm)
```

### **4. PAYMENT REMINDER** 💳
```
Friendly Name: payment_reminder
Language: English (en)
Content Type: Text

Body:
💳 Payment reminder for {{1}} - Amount due: £{{2}}. Please settle your account at ELI MOTORS. Call 0208 203 6449

Variables:
{{1}} = Vehicle Registration (e.g., AB12 CDE)
{{2}} = Amount Due (e.g., 125.50)
```

### **5. VEHICLE READY** 🚗
```
Friendly Name: vehicle_ready
Language: English (en)
Content Type: Text

Body:
🚗 Your {{1}} is ready for collection! {{2}} Collection hours: Mon-Fri 8am-6pm, Sat 8am-4pm. ELI MOTORS - 0208 203 6449

Variables:
{{1}} = Vehicle Registration (e.g., AB12 CDE)
{{2}} = Additional Info (e.g., MOT certificate ready)
```

---

## 🔧 **AFTER CREATING TEMPLATES**

### **Step 2: Get Template SIDs**
1. **In Twilio Console**: Each template will have a **Content SID** (starts with `HX`)
2. **Copy these SIDs** - you'll need them for sending messages

### **Step 3: Test Templates**
Use your dashboard at: `http://localhost:3000/whatsapp-templates`

**Test API Call:**
```bash
curl -X POST "http://localhost:3000/api/whatsapp/send-template" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+447843275372",
    "templateSid": "HX_YOUR_TEMPLATE_SID_HERE",
    "templateVariables": {
      "1": "AB12 CDE",
      "2": "15th September 2024",
      "3": "5 days"
    },
    "messageType": "mot_reminder"
  }'
```

---

## 📋 **TEMPLATE MANAGEMENT**

### **Current Working Template:**
- **SID**: `HXb5b62575e6e4ff6129ad7c8efe1f983e`
- **Name**: appointment_reminder
- **Status**: ✅ **WORKING**

### **Template Variables Guide:**
- **{{1}}** = First variable (usually vehicle registration)
- **{{2}}** = Second variable (usually date/service type)
- **{{3}}** = Third variable (usually additional info)

### **Best Practices:**
1. **Keep messages under 160 characters** when possible
2. **Always include ELI MOTORS branding**
3. **Include contact number**: 0208 203 6449
4. **Use emojis** for visual appeal
5. **Test thoroughly** before production use

---

## 🚀 **INTEGRATION WITH MOT SYSTEM**

Once templates are created, they'll automatically integrate with:
- **MOT Critical Page**: `/mot-critical`
- **Automated Reminders**: Based on expiry dates
- **Job Sheet Notifications**: Service completion alerts
- **Customer Communications**: Payment and collection reminders

---

## 📞 **SUPPORT**

**ELI MOTORS Contact:**
- **Phone**: 0208 203 6449
- **Address**: 49 Victoria Road, Hendon, London, NW4 2RP
- **Website**: https://elimotors.co.uk

**WhatsApp Business Number**: +15558340240

---

## ✅ **CHECKLIST**

- [ ] Create 5 essential templates in Twilio Console
- [ ] Copy all Template SIDs
- [ ] Test each template with real data
- [ ] Configure webhook endpoints (already done ✅)
- [ ] Integrate with MOT reminder system
- [ ] Set up automated scheduling

**Your WhatsApp integration is now ready for production use! 🎉**
