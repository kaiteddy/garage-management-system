# 🚀 GarageManager Pro - Production Deployment

## 🏢 **ELI MOTORS LTD - MOT Management Platform**

This setup provides **custom domain access** to your GarageManager Pro application using Cloudflare Tunnels.

## 🌐 **Your Production URL**

- **GarageManager Pro**: https://app.elimotors.co.uk
- **Business**: ELI MOTORS LTD - Serving Hendon since 1979
- **Platform**: MOT Management & Vehicle Service System

## 📋 **Quick Start**

### **1. First Time Setup**
```bash
# Run the complete setup (creates tunnels, DNS records, and configurations)
./setup-production-tunnel.sh
```

### **2. Daily Usage**
```bash
# Start GarageManager Pro and tunnel
./start-production.sh

# Check if everything is running
./check-tunnel-status.sh

# Stop tunnel when done
./stop-tunnels.sh
```

## 🔧 **Available Scripts**

| Script | Purpose |
|--------|---------|
| `./setup-production-tunnel.sh` | **First-time setup** - Creates tunnel, DNS record, and config files |
| `./start-production.sh` | **Daily startup** - Starts GarageManager Pro and tunnel |
| `./restart-tunnels.sh` | **Restart tunnel** - Stops and restarts tunnel connection |
| `./stop-tunnels.sh` | **Stop tunnel** - Cleanly stops tunnel process |
| `./check-tunnel-status.sh` | **Status check** - Shows tunnel and application status |

## 📊 **Port Configuration**

| Application | Local Port | Production URL |
|-------------|------------|----------------|
| GarageManager Pro | 3002 | https://app.elimotors.co.uk |

## 🔑 **Configuration Details**

### **Cloudflare Account**
- **Account ID**: `a1c77c1b106d54b2afdca84dc8c54e7d`
- **Zone**: `elimotors.co.uk`
- **API Token**: `k7L627sNWj_YDQG_2Mxpvs_XkbdMMcrcK6xaTgcC`

### **Generated Files**
- `garagemanager-config.yml` - GarageManager Pro tunnel config
- `~/.cloudflared/garagemanager-pro.json` - GarageManager Pro credentials

## 🚀 **Step-by-Step Deployment**

### **Step 1: Initial Setup**
```bash
# Make sure you're in the project directory
cd /Users/adamrutstein/v0dashboard-2

# Run the setup script
./setup-production-tunnel.sh
```

This will:
- ✅ Create named tunnel in Cloudflare
- ✅ Set up DNS record (app.elimotors.co.uk)
- ✅ Generate configuration files
- ✅ Start tunnel

### **Step 2: Start Your Applications**

**Start GarageManager Pro:**
```bash
npm run dev -- --port 3002
# or
next dev -p 3002
```

### **Step 3: Verify Everything Works**
```bash
./check-tunnel-status.sh
```

## 🔄 **Daily Workflow**

### **Starting Work:**
```bash
./start-production.sh
```

### **Checking Status:**
```bash
./check-tunnel-status.sh
```

### **Stopping Work:**
```bash
./stop-tunnels.sh
```

## 🛠️ **Troubleshooting**

### **Tunnels Not Working?**
```bash
# Check status
./check-tunnel-status.sh

# Restart tunnels
./restart-tunnels.sh

# If still issues, re-run setup
./setup-production-tunnel.sh
```

### **Application Not Accessible?**
1. **Check local application is running:**
   - GarageManager Pro: http://localhost:3002

2. **Check tunnel process:**
   ```bash
   ps aux | grep cloudflared
   ```

3. **Check DNS propagation:**
   ```bash
   nslookup app.elimotors.co.uk
   ```

### **Port Conflicts?**
If port 3002 is in use:
```bash
# Find what's using the port
lsof -i :3002

# Kill the process if needed
kill -9 <PID>
```

## 📊 **Monitoring**

### **Tunnel Metrics**
- GarageManager Pro: http://localhost:2000/metrics

### **Log Files**
Tunnel logs are displayed in the terminal when running. For persistent logging:
```bash
# Run tunnel with logging
cloudflared tunnel --config garagemanager-config.yml run > garage.log 2>&1 &
```

## 🔒 **Security Notes**

- ✅ **HTTPS Enabled** - All traffic encrypted via Cloudflare
- ✅ **Custom Domains** - Professional appearance
- ✅ **No Port Exposure** - Local ports not directly accessible
- ✅ **Cloudflare Protection** - DDoS protection and caching

## 🆘 **Support**

### **Common Issues:**

1. **"Tunnel already exists"** - This is normal, the script handles existing tunnels
2. **"DNS record already exists"** - This is normal, the script updates existing records
3. **"Connection refused"** - Check that your local application is running
4. **"404 Not Found"** - Check that the application is running on the correct port

### **Getting Help:**
- Check tunnel status: `./check-tunnel-status.sh`
- View tunnel logs in the terminal
- Restart everything: `./restart-tunnels.sh`

## 🎉 **Success!**

Once setup is complete, your GarageManager Pro will be available at:
- **📱 GarageManager Pro**: https://app.elimotors.co.uk

Your URL will have:
- ✅ **SSL certificate** (HTTPS)
- ✅ **Custom branding** (elimotors.co.uk domain)
- ✅ **High availability** (Cloudflare's global network)
- ✅ **Fast performance** (Cloudflare caching and optimization)
- ✅ **Professional appearance** for ELI MOTORS LTD

---

**🏢 ELI MOTORS LTD** - Serving Hendon since 1979
**🔧 Need changes?** Edit the configuration in `setup-production-tunnel.sh` and re-run the setup.
