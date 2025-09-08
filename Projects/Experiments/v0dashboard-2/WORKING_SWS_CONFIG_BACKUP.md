# 🔒 WORKING SWS API CONFIGURATION - BACKUP

## ⚠️ CRITICAL: DO NOT MODIFY THIS CONFIGURATION

This file contains the **EXACT WORKING CONFIGURATION** for the SWS API integration that successfully extracts real vehicle images.

## 🎯 Working API Configuration

### Authentication
```
Authorization: Basic R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc=
User-Agent: Garage Assistant/4.0
```

### Endpoint
```
https://www.sws-solutions.co.uk/API-V4/TechnicalData_Query.php
```

### Request Body (EXACT ORDER CRITICAL)
```
APIKey=C94A0F3F12E88DB916C008B069E34F65&ACTION=GET_INITIAL_SUBJECTS&VRM=S31STK&REPID=&NODEID=&query=
```

### Key Parameters
- **APIKey**: `C94A0F3F12E88DB916C008B069E34F65` (NO DASHES)
- **ACTION**: `GET_INITIAL_SUBJECTS`
- **Parameter Order**: APIKey FIRST, then ACTION, then VRM

### Response Structure
```json
{
  "0": {
    "TechnicalData": {
      "modelPictureMimeDataName": "https://www.haynespro-assets.com/workshop/images/319004892.svgz"
    }
  }
}
```

### SVGZ Processing
- Files may be uncompressed SVG despite .svgz extension
- Check first 16 bytes for "<?xml version="1" to detect uncompressed
- Return SVG string directly if uncompressed

## 🚨 Critical Code Sections

### API Call Function (callSWS)
```typescript
const body = new URLSearchParams({
  APIKey: "C94A0F3F12E88DB916C008B069E34F65",
  ACTION: action,
  REPID: '',
  NODEID: '',
  query: '',
  VRM: vrm,
});
```

### SVGZ Processing (fetchVehicleImageSVG)
```typescript
// Check if file is actually uncompressed
const first16Bytes = new Uint8Array(arrayBuffer.slice(0, 16));
const first16String = new TextDecoder().decode(first16Bytes);

if (first16String.startsWith('<?xml version="1')) {
  console.log(`SVGZ is uncompressed: ${svgString.length} chars`);
  return svgString; // CRITICAL: This return was missing!
}
```

## ✅ Verified Working Examples
- **S31STK**: Honda CR-V - Returns real technical diagram
- **BJ11XWZ**: Returns real technical diagram

## 📅 Configuration Secured
Date: 2025-01-31
Status: PRODUCTION READY
Source: Terminal-based .har file analysis and debugging
