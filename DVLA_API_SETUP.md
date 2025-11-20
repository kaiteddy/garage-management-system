# DVLA Open Data API Setup Guide

**Status:** ✅ API Key Configured  
**Date:** November 20, 2025  
**API Provider:** DVLA (Driver and Vehicle Licensing Agency)

## 📋 Your API Credentials

Your DVLA Open Data API key has been configured in your `.env` file.

### API Key

```
AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi
```

## 🔐 Security Notes

⚠️ **IMPORTANT:** This API key is production-ready and should be kept secure:

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Never share this API key publicly**
3. **Use environment variables in production**
4. **Rotate the key if compromised**

## 🚀 How the API Works

The DVLA Open Data API provides vehicle information based on registration numbers.

### API Endpoint

```
GET https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles
```

### Request Format

```bash
curl -X POST "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles" \
  -H "x-api-key: AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi" \
  -H "Content-Type: application/json" \
  -d '{"registrationNumber": "AB12CDE"}'
```

### Response Example

```json
{
  "registrationNumber": "AB12CDE",
  "taxStatus": "Taxed",
  "taxDueDate": "2025-06-01",
  "motStatus": "Valid",
  "motExpiryDate": "2025-05-15",
  "make": "FORD",
  "monthOfFirstRegistration": "2018-03",
  "yearOfManufacture": 2018,
  "engineCapacity": 1999,
  "co2Emissions": 120,
  "fuelType": "DIESEL",
  "colour": "BLUE",
  "typeApproval": "M1"
}
```

## 📁 Implementation in Your Project

The DVLA API integration is already implemented in your GarageManager project:

### Key Files

1. **`lib/dvla-api.ts`** - Main DVLA API client
2. **`lib/dvla.ts`** - DVLA service functions
3. **`app/api/dvla/route.ts`** - API route for DVLA lookups

### Usage Example

```typescript
import { getVehicleDetails } from '@/lib/dvla-api'

// Get vehicle details by registration
const vehicleData = await getVehicleDetails('AB12CDE')

console.log(vehicleData)
// {
//   registration: 'AB12CDE',
//   make: 'FORD',
//   model: 'FOCUS',
//   colour: 'BLUE',
//   fuelType: 'DIESEL',
//   taxStatus: 'Taxed',
//   motStatus: 'Valid',
//   motExpiryDate: '2025-05-15'
// }
```

### Combined with MOT API

```typescript
import { getVehicleDetails } from '@/lib/dvla-api'
import { getMOTHistory } from '@/lib/mot-api'

// Get complete vehicle information
const registration = 'AB12CDE'
const [dvlaData, motData] = await Promise.all([
  getVehicleDetails(registration),
  getMOTHistory(registration)
])

const completeVehicleInfo = {
  ...dvlaData,
  motHistory: motData.motTests,
  lastMotDate: motData.motTests[0]?.completedDate
}
```

## 🔧 Configuration

### Environment Variables

The DVLA API key is configured in `.env`:

```bash
DVLA_API_KEY=AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi
```

### For Production Deployment

When deploying to production, add this environment variable:

**Vercel:**
```bash
vercel env add DVLA_API_KEY
# Enter: AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi
```

**Render:**
Add `DVLA_API_KEY` in the Render dashboard under "Environment" tab.

## 📊 API Features Available

### Vehicle Information
- ✅ Registration number
- ✅ Make (manufacturer)
- ✅ Month of first registration
- ✅ Year of manufacture
- ✅ Engine capacity (cc)
- ✅ CO2 emissions
- ✅ Fuel type
- ✅ Colour
- ✅ Type approval

### Tax Information
- ✅ Tax status (Taxed/Untaxed/SORN)
- ✅ Tax due date
- ✅ Date of last V5C (logbook) issued

### MOT Information
- ✅ MOT status (Valid/Invalid/Not valid)
- ✅ MOT expiry date

## 🎯 Use Cases in GarageManager

1. **Vehicle Registration**
   - Auto-populate vehicle details when adding new vehicles
   - Verify registration numbers
   - Get accurate make, model, and specifications

2. **Tax Status Checking**
   - Check if customer's vehicle is taxed
   - Alert customers about upcoming tax renewals
   - Track SORN (Statutory Off Road Notification) status

3. **Data Validation**
   - Cross-reference with MOT data
   - Verify vehicle details during CSV import
   - Ensure data accuracy

4. **Customer Service**
   - Provide complete vehicle information to customers
   - Check tax and MOT status in one place
   - Generate comprehensive vehicle reports

## 🧪 Testing the API

### Test Script

```bash
cd /home/ubuntu/garagemanager
node scripts/test-dvla-api.ts
```

### Manual Test

```bash
curl -X POST "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles" \
  -H "x-api-key: AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi" \
  -H "Content-Type: application/json" \
  -d '{"registrationNumber": "AA19AAA"}'
```

## 📚 API Documentation

- **Official DVLA API Docs:** https://developer-portal.driver-vehicle-licensing.api.gov.uk/
- **API Reference:** https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html
- **Support:** https://www.gov.uk/contact-dvla

## 🛠️ Troubleshooting

### Common Issues

**400 Bad Request**
- Check registration number format (no spaces, uppercase)
- Ensure JSON payload is correctly formatted
- Verify Content-Type header is set

**403 Forbidden**
- Verify your API key is correct
- Check that the API key is active
- Ensure the key is in the `x-api-key` header

**404 Not Found**
- Vehicle may not exist in DVLA database
- Check registration number is correct
- Very old or new vehicles may not be available

**429 Too Many Requests**
- You've exceeded the rate limit
- Implement caching to reduce API calls
- Add delays between batch requests

### Rate Limits

The DVLA API has rate limits to prevent abuse:
- **Default:** Check DVLA documentation for current limits
- **Best Practice:** Cache results for at least 24 hours
- **Batch Processing:** Add delays between requests

### Registration Number Format

Always format registration numbers correctly:
- **Remove spaces:** `AB12 CDE` → `AB12CDE`
- **Uppercase:** `ab12cde` → `AB12CDE`
- **No special characters**

```typescript
// Example formatting function
function formatRegistration(reg: string): string {
  return reg.replace(/\s/g, '').toUpperCase()
}
```

## 🔄 Integration with MOT API

Combine DVLA and MOT APIs for complete vehicle information:

```typescript
async function getCompleteVehicleInfo(registration: string) {
  // Format registration
  const reg = registration.replace(/\s/g, '').toUpperCase()
  
  // Get data from both APIs
  const [dvlaData, motData] = await Promise.all([
    getVehicleDetails(reg),
    getMOTHistory(reg)
  ])
  
  return {
    // DVLA data
    registration: dvlaData.registrationNumber,
    make: dvlaData.make,
    colour: dvlaData.colour,
    fuelType: dvlaData.fuelType,
    engineCapacity: dvlaData.engineCapacity,
    taxStatus: dvlaData.taxStatus,
    taxDueDate: dvlaData.taxDueDate,
    
    // MOT data
    motStatus: motData.motStatus,
    motExpiryDate: motData.motExpiryDate,
    motHistory: motData.motTests,
    lastMotMileage: motData.motTests[0]?.odometerValue,
    
    // Combined
    isRoadworthy: dvlaData.taxStatus === 'Taxed' && motData.motStatus === 'Valid'
  }
}
```

## ✅ Next Steps

1. ✅ DVLA API key configured in `.env`
2. ✅ API integration code already in place
3. ⏭️ Test the API with a real registration number
4. ⏭️ Combine with MOT API for complete vehicle data
5. ⏭️ Deploy to production with environment variables

---

**Last Updated:** November 20, 2025  
**API Version:** v1  
**Authentication:** API Key (x-api-key header)
