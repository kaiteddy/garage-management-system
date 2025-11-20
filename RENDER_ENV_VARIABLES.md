# 🔐 Complete Environment Variables for Render Deployment

## Copy and paste these into Render's Environment Variables section:

### **Required Production Variables**
```bash
NODE_ENV=production
BUSINESS_NAME=ELI MOTORS LTD
BUSINESS_TAGLINE=Serving Hendon since 1979
```

### **Database Configuration**
```bash
DATABASE_URL=your_neon_database_url_here
```
> ⚠️ **You need to provide your Neon PostgreSQL database URL**

### **MOT/DVSA API Configuration**
```bash
MOT_HISTORY_API_KEY=8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq
MOT_HISTORY_BASE_URL=https://history.mot.api.gov.uk/v1/trade/vehicles
DVSA_API_KEY=8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq
TAPI_CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
TAPI_CLIENT_SECRET=rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74
TAPI_SCOPE=https://tapi.dvsa.gov.uk/.default
TAPI_TOKEN_URL=https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token
```

### **Twilio Configuration (SMS/WhatsApp)**
```bash
TWILIO_ACCOUNT_SID=AC1572c0e5e4b55bb7440c3d9da482fd36
TWILIO_AUTH_TOKEN=70abf8e7b760180b3a02ae0478b101a8
TWILIO_PHONE_NUMBER=+447488896449
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WHATSAPP_WEBHOOK_VERIFY_TOKEN=eli_motors_whatsapp_2025
```

### **AI/ML Configuration**
```bash
MINIMAX_API_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJBZGFtIE1vdG9ycyIsIlVzZXJOYW1lIjoiQWRhbSBNb3RvcnMiLCJBY2NvdW50IjoiIiwiU3ViamVjdElEIjoiMTk0NzcwNzE0NzA1NTc5NjY1OCIsIlBob25lIjoiIiwiR3JvdXBJRCI6IjE5NDc3MDcxNDcwNDc0MDgwNTAiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJhZGFtQGVsaW1vdG9ycy5jby51ayIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA3LTIzIDAyOjMzOjA1IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.drEYj7gLaV7faA273ZOGDWV0adgcjePapb1-Frq9mjl5Bm5dw_YkXf1du5VpuND96KTgc3tsoGtbVqCXRZgr43FQ5_TTHjjtl2indoYQvn8kZIJa71E4l2-HNo-LFlC160cL6K4yVZmOgpURnfUKvHv5L-g96sAjhcsjf9T1fvf7eUZ7wZqdWd-PriRhyVMlUOWMbELl9s_FwLgR-MO6rCC3cpImFTtOdK7qN69mXIcXLxohEx7wWcO17ZQHbb6D2Dh1mFyKm4vCJjPyJoDqd7c2NE6eBxKyn_iv_Y24mwDQbWBI2kjNJTdCUFhRkXS7gkT0ZozLuCWVctg9QaSj7g
```

### **Authentication (NextAuth)**
```bash
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-app-name.onrender.com
```
> ⚠️ **You need to provide a secure random string for NEXTAUTH_SECRET**  
> 💡 **Generate one with:** `openssl rand -base64 32`

### **App URL (Auto-configured by Render)**
```bash
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
```
> ℹ️ **This will be automatically set by Render to your app's URL**

---

## 📋 **Quick Copy-Paste Format for Render:**

### **Step 1: Basic Variables (Copy all at once)**
```
NODE_ENV=production
BUSINESS_NAME=ELI MOTORS LTD
BUSINESS_TAGLINE=Serving Hendon since 1979
MOT_HISTORY_API_KEY=8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq
MOT_HISTORY_BASE_URL=https://history.mot.api.gov.uk/v1/trade/vehicles
DVSA_API_KEY=8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq
TAPI_CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
TAPI_CLIENT_SECRET=rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74
TAPI_SCOPE=https://tapi.dvsa.gov.uk/.default
TAPI_TOKEN_URL=https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token
TWILIO_ACCOUNT_SID=AC1572c0e5e4b55bb7440c3d9da482fd36
TWILIO_AUTH_TOKEN=70abf8e7b760180b3a02ae0478b101a8
TWILIO_PHONE_NUMBER=+447488896449
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WHATSAPP_WEBHOOK_VERIFY_TOKEN=eli_motors_whatsapp_2025
MINIMAX_API_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJBZGFtIE1vdG9ycyIsIlVzZXJOYW1lIjoiQWRhbSBNb3RvcnMiLCJBY2NvdW50IjoiIiwiU3ViamVjdElEIjoiMTk0NzcwNzE0NzA1NTc5NjY1OCIsIlBob25lIjoiIiwiR3JvdXBJRCI6IjE5NDc3MDcxNDcwNDc0MDgwNTAiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJhZGFtQGVsaW1vdG9ycy5jby51ayIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA3LTIzIDAyOjMzOjA1IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.drEYj7gLaV7faA273ZOGDWV0adgcjePapb1-Frq9mjl5Bm5dw_YkXf1du5VpuND96KTgc3tsoGtbVqCXRZgr43FQ5_TTHjjtl2indoYQvn8kZIJa71E4l2-HNo-LFlC160cL6K4yVZmOgpURnfUKvHv5L-g96sAjhcsjf9T1fvf7eUZ7wZqdWd-PriRhyVMlUOWMbELl9s_FwLgR-MO6rCC3cpImFTtOdK7qN69mXIcXLxohEx7wWcO17ZQHbb6D2Dh1mFyKm4vCJjPyJoDqd7c2NE6eBxKyn_iv_Y24mwDQbWBI2kjNJTdCUFhRkXS7gkT0ZozLuCWVctg9QaSj7g
```

### **Step 2: Add these manually (you need to provide values):**
```
DATABASE_URL=your_neon_database_url
NEXTAUTH_SECRET=your_generated_secret
```

---

## 🚨 **Missing Values You Need to Provide:**

### **1. DATABASE_URL**
- Your Neon PostgreSQL connection string
- Format: `postgresql://username:password@host:port/database?sslmode=require`

### **2. NEXTAUTH_SECRET**
- Generate with: `openssl rand -base64 32`
- Or use any secure random 32+ character string

---

## ✅ **All Set!**
Once you add these environment variables to Render, your GarageManager Pro will have:
- ✅ MOT/DVSA API access
- ✅ SMS/WhatsApp functionality via Twilio
- ✅ AI features via MiniMax
- ✅ Database connectivity
- ✅ Authentication system
- ✅ Proper business branding
