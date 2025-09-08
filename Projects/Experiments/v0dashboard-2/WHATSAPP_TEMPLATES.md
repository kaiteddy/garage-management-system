# WhatsApp Business Templates for Eli Motors Ltd

## 📋 **TEMPLATE SUBMISSION GUIDE**

You need to submit these 4 new templates to Twilio for approval. Each template must be submitted through your Twilio Console under **Messaging > Content Templates**.

---

## 🚗 **Template 1: MOT & Service Combo Reminder**

**Template Name:** `mot_service_combo_eli_motors`  
**Category:** `UTILITY`  
**Language:** `en_GB`

### **Content:**
```
🚗 Eli Motors Ltd - MOT & Service Reminder

Hi {{1}},

Your vehicle {{2}} needs both MOT and service attention:
• MOT expires: {{3}}
• Last service: {{4}}

📅 Book both services together and save time!
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Book today for peace of mind and optimal performance.
```

### **Variables:**
1. `{{1}}` - Customer name (e.g., "John Smith")
2. `{{2}}` - Vehicle registration (e.g., "AB12 CDE")
3. `{{3}}` - MOT expiry date (e.g., "15th March 2025")
4. `{{4}}` - Last service date (e.g., "10th January 2024")

---

## 🔧 **Template 2: Small Service Reminder**

**Template Name:** `small_service_eli_motors`  
**Category:** `UTILITY`  
**Language:** `en_GB`

### **Content:**
```
🔧 Eli Motors Ltd - Service Reminder

Hi {{1}},

Your vehicle {{2}} is due for a service:
• Last service: {{3}}
• Overdue by: {{4}} months

🛠️ Oil change, filters & safety checks
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Keep your vehicle running smoothly - book today!
```

### **Variables:**
1. `{{1}}` - Customer name (e.g., "John Smith")
2. `{{2}}` - Vehicle registration (e.g., "AB12 CDE")
3. `{{3}}` - Last service date (e.g., "10th June 2024")
4. `{{4}}` - Months overdue (e.g., "3")

---

## 🛠️ **Template 3: Full Service Reminder**

**Template Name:** `full_service_eli_motors`  
**Category:** `UTILITY`  
**Language:** `en_GB`

### **Content:**
```
🛠️ Eli Motors Ltd - Full Service Due

Hi {{1}},

Your vehicle {{2}} needs a comprehensive service:
• Last full service: {{3}}
• Overdue by: {{4}} months

🔍 Complete inspection, fluids, brakes & more
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Ensure safety and reliability - book your full service today!
```

### **Variables:**
1. `{{1}}` - Customer name (e.g., "John Smith")
2. `{{2}}` - Vehicle registration (e.g., "AB12 CDE")
3. `{{3}}` - Last full service date (e.g., "15th February 2023")
4. `{{4}}` - Months overdue (e.g., "8")

---

## ❄️ **Template 4: Air-Con Service Reminder**

**Template Name:** `aircon_service_eli_motors`  
**Category:** `UTILITY`  
**Language:** `en_GB`

### **Content:**
```
❄️ Eli Motors Ltd - Air-Con Service

Hi {{1}},

Time to service your vehicle's air conditioning {{2}}:
• Last A/C service: {{3}}
• Perfect timing: {{4}}

🌡️ Stay cool with efficient air conditioning
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Beat the heat - book your air-con service today!
```

### **Variables:**
1. `{{1}}` - Customer name (e.g., "John Smith")
2. `{{2}}` - Vehicle registration (e.g., "AB12 CDE")
3. `{{3}}` - Last air-con service (e.g., "March 2023")
4. `{{4}}` - Seasonal message (e.g., "before summer arrives")

---

## 📝 **SUBMISSION STEPS**

### **Step 1: Access Twilio Console**
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging > Content Templates**
3. Click **Create new template**

### **Step 2: For Each Template**
1. **Template Name:** Use exact names above
2. **Category:** Select `UTILITY`
3. **Language:** Select `English (United Kingdom)` / `en_GB`
4. **Content:** Copy the exact content above
5. **Variables:** Ensure variables are marked as `{{1}}`, `{{2}}`, etc.

### **Step 3: Submit for Approval**
- Each template needs WhatsApp approval (usually 24-48 hours)
- Templates must comply with WhatsApp Business Policy
- All templates are utility-based for legitimate business communication

### **Step 4: Update Template SIDs**
Once approved, update the template SIDs in your code:

```typescript
// In lib/twilio-service.ts
static readonly WHATSAPP_TEMPLATES = {
  MOT_REMINDER: 'HX7989152000fc9771c99762c03f72785d', // ✅ Already approved
  MOT_SERVICE_COMBO: 'HX_YOUR_NEW_SID_HERE', // Update with approved SID
  SMALL_SERVICE: 'HX_YOUR_NEW_SID_HERE',     // Update with approved SID
  FULL_SERVICE: 'HX_YOUR_NEW_SID_HERE',      // Update with approved SID
  AIRCON_SERVICE: 'HX_YOUR_NEW_SID_HERE',    // Update with approved SID
}
```

---

## 🎯 **TEMPLATE BENEFITS**

### **Cost Savings**
- WhatsApp: £0.005 per message
- SMS: £0.04 per message
- **87.5% cost reduction!**

### **Professional Branding**
- ✅ "Eli Motors Ltd" business verification
- ✅ Professional logo display
- ✅ Clickable phone numbers and website
- ✅ Consistent brand messaging

### **Higher Engagement**
- 98% WhatsApp open rate vs 20% SMS
- Rich formatting with emojis
- Professional business account appearance
- Better customer experience

---

## 🚀 **TESTING AFTER APPROVAL**

Once templates are approved, test each one:

```bash
# Test MOT & Service Combo
curl -X POST http://localhost:3000/api/whatsapp/service-reminders \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "serviceType": "combo", "testMode": true, "limit": 1}'

# Test Small Service
curl -X POST http://localhost:3000/api/whatsapp/service-reminders \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "serviceType": "small", "testMode": true, "limit": 1}'

# Test Full Service
curl -X POST http://localhost:3000/api/whatsapp/service-reminders \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "serviceType": "full", "testMode": true, "limit": 1}'

# Test Air-Con Service
curl -X POST http://localhost:3000/api/whatsapp/service-reminders \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "serviceType": "aircon", "testMode": true, "limit": 1}'
```

---

## 📊 **EXPECTED RESULTS**

After implementing all templates, you'll have:

1. **✅ MOT Reminder** (Working perfectly!)
2. **🔄 MOT & Service Combo** (Maximizes efficiency)
3. **🔧 Small Service Reminder** (6-month intervals)
4. **🛠️ Full Service Reminder** (12-month intervals)
5. **❄️ Air-Con Service Reminder** (Seasonal, pre-summer)

This creates a comprehensive, automated reminder system that will:
- Increase service bookings
- Improve customer retention
- Reduce communication costs by 87.5%
- Provide professional customer experience
- Generate significant additional revenue

**Ready to revolutionize your customer communication!** 🚀
