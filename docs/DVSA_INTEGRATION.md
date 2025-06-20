# 🚗 DVSA API Integration Guide

## Overview

The MOT Reminders system now integrates with the **real DVSA (Driver and Vehicle Standards Agency) API** to fetch authentic MOT data for UK registered vehicles. This replaces simulation with actual government data.

## 🔑 Pre-configured Credentials

The system comes with **pre-configured DVSA API credentials**:

- **Client ID**: `2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f`
- **Token URL**: `https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token`
- **API URL**: `https://history.mot.api.gov.uk/v1/trade/vehicles/registration`

## 🚀 Quick Start

### 1. **Start the DVSA Backend Service**

```bash
python start_mot_service.py
```

This will:

- ✅ Check dependencies
- ✅ Create environment configuration
- ✅ Start the backend service with DVSA integration
- ✅ Provide real MOT data API at `http://127.0.0.1:5002/api`

### 2. **Use the Frontend**

1. Open `src/static/index.html` in your browser
2. Navigate to **"MOT Reminders"** in the sidebar
3. Add vehicles - they will now use **real DVSA data**!

## 📊 What You Get

### **Real MOT Data**

- ✅ **Authentic MOT expiry dates** from DVSA records
- ✅ **Real vehicle make and model** information
- ✅ **Actual test results** (PASSED/FAILED)
- ✅ **Last test dates** from official records
- ✅ **Current MOT status** (valid/expired)

### **Fallback Protection**

- 🛡️ **Automatic fallback** to simulation if DVSA API is unavailable
- 🛡️ **Retry logic** with multiple attempts
- 🛡️ **Timeout protection** to prevent hanging
- 🛡️ **Error handling** with clear user feedback

## 🔧 Technical Implementation

### **Frontend Integration**

```javascript
// Real DVSA API call
async function fetchDVSAData(registration) {
  const response = await fetch(`${API_BASE_URL}/mot/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registration: registration }),
  });

  if (response.ok) {
    const result = await response.json();
    return result.data; // Real DVSA data
  }
  return null;
}
```

### **Backend Service**

- **Flask API** that handles DVSA authentication
- **OAuth token management** for secure API access
- **Rate limiting** and error handling
- **Data transformation** to frontend format

### **Data Flow**

```
Frontend → Backend Service → DVSA API → Real MOT Data → Frontend Display
    ↓
Fallback Simulation (if DVSA unavailable)
```

## 📋 Features

### **Single Vehicle Addition**

- Enter any UK registration number
- System fetches real MOT data from DVSA
- Displays authentic expiry dates and test results

### **Bulk Upload**

- Upload CSV files with registration numbers
- Each vehicle gets real DVSA data
- Progress tracking with real API calls
- Fallback for any failed lookups

### **MOT Status Refresh**

- Click refresh button on any vehicle
- Fetches latest MOT data from DVSA
- Updates expiry dates and test results

## 🛡️ Error Handling

### **API Unavailable**

```
DVSA API Call → Timeout/Error → Fallback Simulation → User Notification
```

### **Invalid Registration**

```
DVSA API Call → No Data Found → Skip Vehicle → Continue Processing
```

### **Network Issues**

```
DVSA API Call → Network Error → Retry (3x) → Fallback → Continue
```

## 📱 User Experience

### **Success Messages**

- ✅ "Checking MOT status with DVSA API..."
- ✅ "Processing bulk upload with real DVSA data..."
- ✅ "Refreshing MOT status from DVSA..."

### **Fallback Notifications**

- ⚠️ "DVSA API unavailable, using fallback data"
- ⚠️ "Some vehicles could not be verified with DVSA"

### **Error Messages**

- ❌ "Could not retrieve MOT data for this vehicle"
- ❌ "DVSA API timeout - please try again"

## 🔍 Testing

### **Test with Real UK Registrations**

Try these example UK registrations:

- `AB12CDE` (format example)
- `XY98ZYZ` (format example)
- Any valid UK registration number

### **Verify Real Data**

1. Add a vehicle with a known UK registration
2. Check the MOT expiry date matches official records
3. Verify make/model information is accurate

### **Test Fallback**

1. Stop the backend service
2. Add vehicles - should use simulation
3. Restart service - new vehicles use real data

## 🚨 Important Notes

### **UK Registrations Only**

- DVSA API only works with UK registered vehicles
- Non-UK registrations will use fallback simulation
- System handles this gracefully

### **Rate Limiting**

- DVSA API has rate limits
- Backend service manages this automatically
- Bulk uploads are throttled appropriately

### **Data Accuracy**

- MOT data is as current as DVSA records
- Some vehicles may not have MOT data (new cars, etc.)
- System handles missing data gracefully

## 🔧 Configuration

### **Environment Variables** (Optional)

Create `src/.env` for additional configuration:

```env
# DVSA API (pre-configured)
CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
CLIENT_SECRET=your_client_secret_here
API_KEY=your_api_key_here

# SMS Service (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

### **Backend Service Configuration**

- **Port**: 5002 (configurable)
- **CORS**: Enabled for frontend integration
- **Timeout**: 15 seconds for DVSA calls
- **Retries**: 3 attempts per vehicle

## 🎯 Benefits

1. **Authentic Data**: Real MOT information from official sources
2. **Reliable Service**: Fallback protection ensures system always works
3. **User Trust**: Customers see real, verifiable MOT data
4. **Compliance**: Uses official government APIs
5. **Accuracy**: No guesswork - actual MOT expiry dates

## 🔄 Migration from Simulation

The system automatically:

- ✅ **Detects** when backend service is available
- ✅ **Switches** to real DVSA data for new vehicles
- ✅ **Maintains** existing simulated data
- ✅ **Allows refresh** of existing vehicles with real data

## 📞 Support

If you encounter issues:

1. **Check backend service** is running (`python start_mot_service.py`)
2. **Verify network connection** to DVSA APIs
3. **Check browser console** for detailed error messages
4. **Use fallback mode** if DVSA is temporarily unavailable

The system is designed to work reliably with or without DVSA API access, ensuring uninterrupted service for your garage management needs.
