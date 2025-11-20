# 🚀 ELI MOTORS LTD - Professional Tunnel Setup

## 🏢 **Your Professional Platform Suite**

**API Key**: `ak_2zrH0SRxhKbyASvEr80gz2MnvNV` ✅ **Configured**

---

## 📋 **Current Status - UPGRADED ACCOUNT**

### ✅ **GarageManager Pro** (Port 3002)
- **Status**: ✅ **RUNNING**
- **Professional URL**: `https://elimotors-garage.eu.ngrok.io` 🎆 **RESERVED**
- **Analytics**: http://localhost:4040
- **Local**: http://localhost:3002
- **Features**: ✅ Reserved Domain, Enhanced Security, Priority Support

### 🔍 **ProSearch Intelligence** (Port 3001)
- **Status**: ❌ **NOT RUNNING**
- **Tunnel**: Not configured
- **Analytics**: http://localhost:4041 (when running)
- **Local**: http://localhost:3001

---

## 🔧 **Quick Commands**

### **Start Individual Tunnels:**
```bash
# GarageManager Pro only
./start-ngrok-free.sh

# ProSearch Intelligence only
./start-prosearch-tunnel.sh
```

### **Start Both Tunnels:**
```bash
# Start both applications with professional tunnels
./start-both-tunnels.sh
```

### **Check Status:**
```bash
# Quick status check
./check-tunnel-status.sh
```

### **Stop Tunnels:**
```bash
# Stop all ngrok processes
pkill -f ngrok
```

---

## 🌐 **Your Two Projects Setup**

### **Project 1: GarageManager Pro**
- **Port**: 3002
- **Purpose**: MOT Management, Customer Database, WhatsApp Integration
- **Database**: Neon PostgreSQL
- **Features**: MOT Reminders, Vehicle Tracking, Document Management

### **Project 2: ProSearch Intelligence**
- **Port**: 3001 (when you start it)
- **Purpose**: Intelligence Platform
- **Database**: Neon PostgreSQL
- **Features**: Advanced Analytics, Search Intelligence

---

## 💡 **Upgrade Options**

### **Current: Free Tier**
- ✅ Professional HTTPS tunnels
- ✅ Analytics dashboards
- ❌ Random URLs (change on restart)
- ❌ Limited to basic features

### **Personal Plan ($10/month)**
- ✅ **3 tunnels** (perfect for your needs!)
- ✅ **Reserved domains** (URLs don't change)
- ✅ Custom subdomains: `elimotors-garage.ngrok.app`
- ✅ Enhanced analytics
- ✅ 5GB data transfer/month

### **Pro Plan ($20/month)**
- ✅ **10 tunnels**
- ✅ **Custom domains**: `app.elimotors.co.uk`
- ✅ Advanced security features
- ✅ Priority support

**Upgrade at**: https://dashboard.ngrok.com/billing

---

## 📊 **Analytics & Monitoring**

### **Live Dashboards:**
- **GarageManager Pro**: http://localhost:4040
- **ProSearch Intelligence**: http://localhost:4041 (when running)

### **Features Available:**
- 📈 Real-time request monitoring
- 🔍 Traffic analysis
- 🛡️ Security insights
- 📱 Mobile-friendly interface

---

## 🔄 **Starting Your ProSearch Intelligence**

To get your second project running:

```bash
# Navigate to your ProSearch project directory
cd /path/to/prosearch-intelligence

# Start the application (adjust command as needed)
npm run dev -- --port 3001
# OR
python app.py
# OR
node server.js

# Then start the tunnel
./start-prosearch-tunnel.sh
```

---

## 🛠️ **Troubleshooting**

### **Common Issues:**

1. **"Port already in use"**
   ```bash
   # Kill processes on specific port
   lsof -ti:3001 | xargs kill -9
   ```

2. **"Tunnel not accessible"**
   ```bash
   # Restart ngrok
   pkill -f ngrok
   ./start-both-tunnels.sh
   ```

3. **"Analytics dashboard not loading"**
   ```bash
   # Check if ngrok web interface is running
   curl http://localhost:4040/api/tunnels
   ```

### **Logs:**
- **GarageManager Pro**: `tail -f garage-ngrok.log`
- **ProSearch Intelligence**: `tail -f prosearch-ngrok.log`

---

## 🏢 **ELI MOTORS LTD Integration**

### **Professional Features:**
- ✅ HTTPS encryption for customer data security
- ✅ Stable URLs during development sessions
- ✅ Better performance than cloudflared
- ✅ Real-time analytics for monitoring
- ✅ Professional appearance for client demos

### **Business Benefits:**
- 🚗 **MOT Management**: Secure customer access
- 📱 **WhatsApp Integration**: Reliable message delivery
- 📊 **Analytics**: Monitor platform usage
- 🔒 **Security**: HTTPS encryption for all data

---

## 📞 **Support**

**ELI MOTORS LTD - Serving Hendon since 1979**

For technical support with your tunnel setup:
- Check status: `./check-tunnel-status.sh`
- View logs: `tail -f *-ngrok.log`
- Restart tunnels: `./start-both-tunnels.sh`

---

*Professional tunnel management for your MOT and Intelligence platforms* 🚀
