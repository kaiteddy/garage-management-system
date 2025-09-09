# 📡 Complete Webhook URLs Configuration

## 🎯 **ALL WEBHOOK ENDPOINTS FOR YOUR SETUP**

### **Production Base URL:** `https://garagemanagerpro.vercel.app`
### **WhatsApp Sender:** `+15558340240`
### **Verification Token:** `whatsapp_verify_2024_elimotors`

---

## 📱 **TWILIO CONSOLE CONFIGURATION**

### **1. Phone Number Configuration**
Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
Click on: **+15558340240**

Set these webhook URLs:

| Field | URL | Method |
|-------|-----|--------|
| **Voice URL** | `https://garagemanagerpro.vercel.app/api/twilio/voice` | POST |
| **SMS URL** | `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses` | POST |
| **Status Callback URL** | `https://garagemanagerpro.vercel.app/api/webhooks/status-callback` | POST |

### **2. WhatsApp Sandbox Configuration**
Go to: https://console.twilio.com/us1/develop/sms/whatsapp/sandbox

| Field | Value |
|-------|-------|
| **Webhook URL** | `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses` |
| **HTTP Method** | POST |

---

## 🔐 **META WHATSAPP BUSINESS API CONFIGURATION**

### **Meta Developer Console Setup**
Go to: https://developers.facebook.com/
Navigate to your WhatsApp Business app → WhatsApp → Configuration

| Field | Value |
|-------|-------|
| **Webhook URL** | `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses` |
| **Verify Token** | `whatsapp_verify_2024_elimotors` |
| **HTTP Method** | POST |

### **Webhook Events to Subscribe:**
- ✅ `messages` - Receive incoming messages
- ✅ `message_deliveries` - Get delivery status updates
- ✅ `message_reads` - Get read receipts
- ✅ `message_reactions` - Get message reactions

---

## 🧪 **WEBHOOK ENDPOINT STATUS**

| Endpoint | Purpose | Current Status | Test URL |
|----------|---------|----------------|----------|
| **Communication Responses** | SMS/WhatsApp messages | ✅ Active | `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses` |
| **Voice Webhook** | Voice calls | ✅ Active | `https://garagemanagerpro.vercel.app/api/twilio/voice` |
| **Status Callback** | Message delivery status | ⚠️ Needs Deploy | `https://garagemanagerpro.vercel.app/api/webhooks/status-callback` |

---

## ⚠️ **IMPORTANT: STATUS CALLBACK NEEDS DEPLOYMENT**

The status callback endpoint exists in your code but isn't deployed yet. You need to:

### **Step 1: Deploy the Status Callback**
```bash
# Commit and push the new status callback endpoint
git add .
git commit -m "Add status callback webhook endpoint"
git push origin main
```

### **Step 2: Verify Deployment**
After deployment, test the endpoint:
```bash
curl -s https://garagemanagerpro.vercel.app/api/webhooks/status-callback
```

Expected response:
```json
{
  "endpoint": "Twilio Status Callback Webhook",
  "status": "active",
  "description": "Handles status updates for SMS and voice messages",
  "timestamp": "2025-09-08T..."
}
```

---

## 🔧 **ENVIRONMENT VARIABLES REQUIRED**

Make sure these are set in Vercel Dashboard:

```
WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatsapp_verify_2024_elimotors
TWILIO_WEBHOOK_VERIFY_TOKEN=eli_motors_webhook_2024
TWILIO_PHONE_NUMBER=+15558340240
TWILIO_WHATSAPP_NUMBER=whatsapp:+15558340240
TWILIO_ACCOUNT_SID=AC1572c0e5e4b55bb7440c3d9da482fd36
TWILIO_AUTH_TOKEN=[your_auth_token]
```

---

## 📋 **COMPLETE CONFIGURATION CHECKLIST**

### **Vercel Environment Variables:**
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatsapp_verify_2024_elimotors`
- [ ] `TWILIO_WEBHOOK_VERIFY_TOKEN=eli_motors_webhook_2024`
- [ ] `TWILIO_PHONE_NUMBER=+15558340240`
- [ ] `TWILIO_WHATSAPP_NUMBER=whatsapp:+15558340240`

### **Deploy Status Callback:**
- [ ] Commit and push status callback endpoint
- [ ] Verify endpoint responds with JSON (not 404)

### **Twilio Console Configuration:**
- [ ] Voice URL: `https://garagemanagerpro.vercel.app/api/twilio/voice`
- [ ] SMS URL: `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses`
- [ ] Status Callback: `https://garagemanagerpro.vercel.app/api/webhooks/status-callback`

### **WhatsApp Business API (Meta):**
- [ ] Webhook URL: `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses`
- [ ] Verify Token: `whatsapp_verify_2024_elimotors`
- [ ] Subscribe to message events

### **Testing:**
- [ ] WhatsApp verification returns HTTP 200
- [ ] Send test message and check logs
- [ ] Verify status callbacks are received

---

## 🚀 **QUICK DEPLOYMENT SCRIPT**

Save this as `deploy-webhooks.sh`:

```bash
#!/bin/bash
echo "🚀 Deploying webhook endpoints..."

# Deploy to Vercel
git add .
git commit -m "Deploy complete webhook configuration with status callback"
git push origin main

echo "⏳ Waiting for deployment..."
sleep 30

echo "🧪 Testing endpoints..."
echo "Status Callback:" 
curl -s https://garagemanagerpro.vercel.app/api/webhooks/status-callback | jq .

echo "Communication Responses:"
curl -s https://garagemanagerpro.vercel.app/api/webhooks/communication-responses | jq .

echo "Voice Webhook:"
curl -s https://garagemanagerpro.vercel.app/api/twilio/voice | jq .

echo "✅ Deployment complete!"
```

---

## 📱 **SUMMARY**

**Your Complete Webhook Configuration:**

1. **Main Message Webhook:** `https://garagemanagerpro.vercel.app/api/webhooks/communication-responses`
2. **Voice Webhook:** `https://garagemanagerpro.vercel.app/api/twilio/voice`  
3. **Status Callback:** `https://garagemanagerpro.vercel.app/api/webhooks/status-callback`
4. **Verification Token:** `whatsapp_verify_2024_elimotors`
5. **Phone Number:** `+15558340240`

**Next Steps:**
1. Deploy the status callback endpoint
2. Set environment variables in Vercel
3. Configure Twilio Console with all three URLs
4. Configure Meta WhatsApp Business API
5. Test the complete integration
