# Render Deployment Guide for GarageManager Pro

## Quick Deployment Steps

### Option 1: Manual Deployment (Recommended)

1. **Push code to GitHub** (if not already done):
   ```bash
   git push --force origin main
   ```

2. **Go to Render Dashboard**:
   - Visit: https://dashboard.render.com/
   - Click "New" → "Web Service"

3. **Connect Repository**:
   - Connect your GitHub account
   - Select repository: `kaiteddy/v0dashboard`
   - Branch: `main`

4. **Configure Service**:
   - **Name**: `garagemanager-pro`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Build Command**: (leave empty - using Docker)
   - **Start Command**: (leave empty - using Docker)
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `./`

5. **Advanced Settings**:
   - **Health Check Path**: `/api/health`
   - **Plan**: Starter ($7/month)
   - **Auto-Deploy**: Yes

6. **Environment Variables** (CRITICAL - ADD THESE):
   ```
   NODE_ENV=production
   DATABASE_URL=your_neon_database_url
   MOT_HISTORY_API_KEY=your_mot_api_key
   TAPI_CLIENT_ID=your_tapi_client_id
   TAPI_CLIENT_SECRET=your_tapi_client_secret
   TAPI_SCOPE=https://tapi.dvsa.gov.uk/.default
   TAPI_TOKEN_URL=https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp
   MINIMAX_API_KEY=your_minimax_key
   BUSINESS_NAME=ELI MOTORS LTD
   BUSINESS_TAGLINE=Professional Vehicle Services
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

7. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy

### Option 2: API Deployment

Run the API deployment script:
```bash
./deploy-render-api.sh
```

## What Happens Next

1. **Build Process**: Render will use your Dockerfile to build the application
2. **Health Checks**: Render will ping `/api/health` to ensure the app is running
3. **Live URL**: You'll get a URL like `https://garagemanager-pro.onrender.com`
4. **Auto-Deploy**: Future pushes to `main` branch will auto-deploy

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Dockerfile syntax

### App Won't Start
- Check that environment variables are set correctly
- Verify health check endpoint `/api/health` is working
- Check application logs in Render dashboard

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly set
- Verify Neon database is accessible from external connections

## Monitoring

- **Dashboard**: https://dashboard.render.com/
- **Logs**: Available in real-time in the Render dashboard
- **Metrics**: CPU, memory, and request metrics available
- **Health**: Automatic health monitoring via `/api/health`

## Benefits of Render

✅ **Docker Support**: Native Docker container deployment  
✅ **Auto-Deploy**: Automatic deployments from GitHub  
✅ **Health Checks**: Built-in health monitoring  
✅ **SSL**: Free SSL certificates  
✅ **CDN**: Global CDN included  
✅ **Logs**: Real-time log streaming  
✅ **Scaling**: Easy horizontal scaling  
✅ **Reliable**: Better uptime than many alternatives  

## Cost

- **Starter Plan**: $7/month
- **Standard Plan**: $25/month (for higher traffic)
- **Pro Plan**: $85/month (for production workloads)

The Starter plan should be perfect for GarageManager Pro!
