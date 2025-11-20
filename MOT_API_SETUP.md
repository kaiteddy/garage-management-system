# MOT History API Setup Guide

**Status:** ✅ API Application Approved  
**Date:** November 20, 2025  
**API Provider:** DVSA (Driver and Vehicle Standards Agency)

## 📋 Your API Credentials

Your application to use the MOT History API has been approved. The credentials are already configured in your `.env` file.

### Credentials Summary

- **Client ID:** `2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f`
- **Client Secret:** `rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74`
- **API Key:** `8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq`
- **Scope URL:** `https://tapi.dvsa.gov.uk/.default`
- **Token URL:** `https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token`

## 🔐 Security Notes

⚠️ **IMPORTANT:** These credentials are production credentials and should be kept secure:

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Never share these credentials publicly**
3. **Use environment variables in production** (Vercel, Render, etc.)
4. **Rotate credentials if compromised**

## 🚀 How the API Works

The MOT History API uses **OAuth 2.0 Client Credentials Flow** for authentication.

### Authentication Flow

1. **Request Access Token**
   ```
   POST https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token
   
   Body:
   - client_id: Your Client ID
   - client_secret: Your Client Secret
   - scope: https://tapi.dvsa.gov.uk/.default
   - grant_type: client_credentials
   ```

2. **Use Access Token**
   ```
   GET https://tapi.dvsa.gov.uk/v1/mot-history/{registration}
   
   Headers:
   - Authorization: Bearer {access_token}
   - x-api-key: Your API Key
   ```

## 📁 Implementation in Your Project

The MOT API integration is already implemented in your GarageManager project:

### Key Files

1. **`lib/dvsa-auth.ts`** - OAuth 2.0 authentication handler
2. **`lib/dvsa.ts`** - Main DVSA API client
3. **`lib/mot-api.ts`** - MOT-specific API functions
4. **`lib/mot-batch-processor.ts`** - Batch processing for multiple vehicles
5. **`lib/mot-cache.ts`** - Caching to reduce API calls

### Usage Example

```typescript
import { getDVSAAccessToken } from '@/lib/dvsa-auth'
import { getMOTHistory } from '@/lib/mot-api'

// Get MOT history for a vehicle
const motData = await getMOTHistory('AB12CDE')

console.log(motData)
// {
//   registration: 'AB12CDE',
//   make: 'FORD',
//   model: 'FOCUS',
//   motTests: [...],
//   motExpiryDate: '2025-06-15'
// }
```

### Batch Processing

```typescript
import { processMOTBatch } from '@/lib/mot-batch-processor'

const registrations = ['AB12CDE', 'XY34ZAB', 'CD56EFG']
const results = await processMOTBatch(registrations)
```

## 🔧 Configuration

### Environment Variables

All required environment variables are set in `.env`:

```bash
DVSA_CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
DVSA_CLIENT_SECRET=rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74
DVSA_API_KEY=8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq
DVSA_SCOPE_URL=https://tapi.dvsa.gov.uk/.default
DVSA_TOKEN_URL=https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token
```

### For Production Deployment

When deploying to production (Vercel, Render, etc.), add these environment variables to your deployment platform:

**Vercel:**
```bash
vercel env add DVSA_CLIENT_ID
vercel env add DVSA_CLIENT_SECRET
vercel env add DVSA_API_KEY
vercel env add DVSA_SCOPE_URL
vercel env add DVSA_TOKEN_URL
```

**Render:**
Add environment variables in the Render dashboard under "Environment" tab.

## 📊 API Features Available

### MOT History
- ✅ Get complete MOT test history
- ✅ Current MOT status (pass/fail)
- ✅ MOT expiry date
- ✅ Mileage history
- ✅ Advisory items
- ✅ Dangerous/Major/Minor defects

### Vehicle Information
- ✅ Make and model
- ✅ Colour
- ✅ Fuel type
- ✅ Engine size
- ✅ First registration date
- ✅ Manufacturing year

## 🎯 Use Cases in GarageManager

1. **MOT Reminders**
   - Automatically check MOT expiry dates
   - Send reminders to customers before MOT expires
   - Track vehicles due for MOT

2. **Vehicle Import**
   - Auto-populate vehicle details during CSV import
   - Verify registration numbers
   - Update vehicle information

3. **MOT Check Page**
   - `/mot-check` - Manual MOT lookup
   - `/mot-critical` - Vehicles with expired/expiring MOT
   - `/mot-reminders` - Automated reminder system

4. **Batch Processing**
   - Check MOT status for all vehicles in database
   - Update MOT expiry dates in bulk
   - Generate reports

## 🧪 Testing the API

### Test Script

Run the test script to verify your credentials:

```bash
cd /home/ubuntu/garagemanager
node scripts/test-mot-api.ts
```

### Manual Test

```bash
# Test with a known registration (replace with actual UK registration)
curl -X POST "https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f" \
  -d "client_secret=rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74" \
  -d "scope=https://tapi.dvsa.gov.uk/.default" \
  -d "grant_type=client_credentials"
```

## 📚 API Documentation

- **Official DVSA API Docs:** https://documentation.history.mot.api.gov.uk/
- **OAuth 2.0 Guide:** https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
- **API Support:** https://dvsa.gov.uk/

## 🛠️ Troubleshooting

### Common Issues

**401 Unauthorized**
- Check that Client ID and Client Secret are correct
- Verify the token hasn't expired (tokens last 1 hour)
- Ensure you're requesting a new token

**403 Forbidden**
- Verify your API Key is included in the `x-api-key` header
- Check that your API key is active

**404 Not Found**
- Verify the registration number format (remove spaces)
- Check that the vehicle exists in the DVSA database
- Some very old vehicles may not have MOT records

**Rate Limiting**
- The API has rate limits (check DVSA documentation)
- Implement caching to reduce API calls
- Use batch processing with delays between requests

### Debug Mode

Enable debug logging in your code:

```typescript
// In lib/dvsa-auth.ts or lib/mot-api.ts
const DEBUG = true

if (DEBUG) {
  console.log('API Request:', { registration, token })
  console.log('API Response:', response)
}
```

## 📞 Support

If you encounter issues with the API:

1. **Check API Status:** https://dvsa.gov.uk/
2. **Review Documentation:** https://documentation.history.mot.api.gov.uk/
3. **Contact DVSA Support:** Via their official support channels

## ✅ Next Steps

1. ✅ Credentials configured in `.env`
2. ✅ API integration code already in place
3. ⏭️ Test the API with a real registration number
4. ⏭️ Configure your database URL
5. ⏭️ Deploy to production with environment variables

---

**Last Updated:** November 20, 2025  
**API Version:** v1  
**Authentication:** OAuth 2.0 Client Credentials
