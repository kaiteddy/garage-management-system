# 🔧 Render Deployment Troubleshooting Guide

## 🚨 Common Render Issues & Solutions

### 1. **Build Timeout Issues**

**Symptoms:**
- Build fails with timeout error
- Build takes longer than 15 minutes

**Solutions:**
```bash
# Add to Environment Variables in Render:
NODE_OPTIONS=--max-old-space-size=4096

# Or upgrade to a higher plan with more build time
```

### 2. **Memory Issues During Build**

**Symptoms:**
- "JavaScript heap out of memory" error
- Build crashes unexpectedly

**Solutions:**
```bash
# Environment Variables:
NODE_OPTIONS=--max-old-space-size=4096
NPM_CONFIG_PROGRESS=false
NPM_CONFIG_LOGLEVEL=error
```

### 3. **Database Connection Issues**

**Symptoms:**
- App starts but can't connect to database
- SSL/TLS connection errors

**Solutions:**
```bash
# Ensure DATABASE_URL includes SSL:
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# For Neon database:
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/db?sslmode=require
```

### 4. **Environment Variables Not Loading**

**Symptoms:**
- App starts but features don't work
- API calls fail

**Solutions:**
1. Set variables in Render Dashboard (not in code)
2. Use NEXT_PUBLIC_ prefix for client-side variables
3. Restart the service after adding variables

### 5. **Static Files Not Loading**

**Symptoms:**
- CSS/JS files return 404
- Images don't display

**Solutions:**
```javascript
// next.config.js
const nextConfig = {
  output: 'standalone', // Remove this for Render
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}
```

### 6. **Build Command Issues**

**Symptoms:**
- Build fails immediately
- Dependencies not found

**Solutions:**
```bash
# Recommended build commands:
Build Command: npm ci && npm run build
Start Command: npm start

# Alternative for memory issues:
Build Command: NODE_OPTIONS="--max-old-space-size=4096" npm ci && npm run build
```

### 7. **Port Configuration Issues**

**Symptoms:**
- App builds but doesn't start
- Health check fails

**Solutions:**
```javascript
// Make sure your app listens on process.env.PORT
const port = process.env.PORT || 3000
app.listen(port, '0.0.0.0')
```

## 📋 Render Configuration Checklist

### Required Environment Variables:
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (with SSL)
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` (your Render app URL)
- [ ] All API keys (Twilio, DVSA, etc.)

### Build Settings:
- [ ] Build Command: `npm ci && npm run build`
- [ ] Start Command: `npm start`
- [ ] Node Version: 18 or higher
- [ ] Auto-Deploy: Enabled

### Health Check:
- [ ] Health Check Path: `/` or `/api/health`
- [ ] Health Check enabled

## 🔍 Debugging Steps

1. **Check Build Logs:**
   - Go to Render Dashboard
   - Click on your service
   - Check "Events" tab for build logs

2. **Check Runtime Logs:**
   - Go to "Logs" tab
   - Look for startup errors
   - Check for database connection issues

3. **Test Locally:**
   ```bash
   # Test production build locally:
   npm run build
   npm start
   ```

4. **Environment Variables:**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure sensitive data is not in code

## 🚀 Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to Render"
   git push origin main
   ```

2. **Create Render Service:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Configure build/start commands
   - Set environment variables
   - Deploy

3. **Monitor Deployment:**
   - Watch build logs
   - Check for errors
   - Test the deployed app

## 📞 Getting Help

If you're still having issues:

1. **Check Render Status:** https://status.render.com
2. **Render Community:** https://community.render.com
3. **Render Docs:** https://render.com/docs
4. **Contact Support:** Through Render Dashboard

## 🔗 Useful Links

- [Render Dashboard](https://dashboard.render.com)
- [Next.js on Render Guide](https://render.com/docs/deploy-nextjs-app)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Build & Deploy](https://render.com/docs/builds-and-deploys)
