# PartSouq Cloudflare Bypass Methods

Based on the Fiddler analysis, PartSouq uses Cloudflare protection which is blocking our automated requests. Here are several approaches to bypass this protection:

## 🔍 Analysis from Fiddler Capture

From the captured curl commands, we can see:

1. **VIN Used**: `WBA2D520X05E20424` (BMW 220i)
2. **Base URL**: `https://partsouq.com`
3. **Vehicle Code**: `BMW202501`
4. **Vehicle ID**: `1136468753`
5. **Cloudflare Protection**: 403 Forbidden responses indicate active protection

## 🛠️ Bypass Methods Implemented

### Method 1: Manual HTTP Requests with Exact Headers
- **File**: `lib/services/partsouq-service.ts`
- **Approach**: Use exact headers from Fiddler capture
- **Status**: ❌ Blocked by Cloudflare (403 Forbidden)
- **Issue**: Missing browser fingerprinting and challenge solving

### Method 2: Browser Automation (Recommended)
- **File**: `lib/services/partsouq-browser.ts`
- **Approach**: Use headless browser to simulate real user
- **Status**: 🟡 Simulated (needs Puppeteer implementation)
- **Advantages**: 
  - Handles JavaScript challenges
  - Real browser fingerprint
  - Can solve CAPTCHA if needed

### Method 3: Proxy Service
- **File**: `lib/services/partsouq-browser.ts`
- **Approach**: Use external service that handles scraping
- **Status**: 🟡 Ready for integration
- **Options**:
  - ScrapingBee
  - Bright Data
  - Custom proxy server

### Method 4: Manual URL Construction
- **File**: `lib/services/partsouq-browser.ts`
- **Approach**: Use exact URLs from Fiddler with session data
- **Status**: ⚠️ Partially implemented
- **Challenge**: Session data (`ssd` parameter) is encrypted

## 🚀 Recommended Implementation Steps

### Step 1: Install Puppeteer
```bash
npm install puppeteer
npm install @types/puppeteer --save-dev
```

### Step 2: Implement Browser Automation
```typescript
import puppeteer from 'puppeteer';

async function searchWithBrowser(vin: string) {
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  
  // Set viewport and user agent to match Fiddler capture
  await page.setViewport({ width: 1800, height: 1169 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15');

  try {
    // Navigate to PartSouq
    await page.goto('https://partsouq.com/', { waitUntil: 'networkidle2' });
    
    // Handle Cloudflare challenge if present
    await page.waitForTimeout(5000);
    
    // Perform VIN search
    const searchUrl = `https://partsouq.com/en/catalog/genuine/vehicle?q=${vin}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Extract parts data
    const parts = await page.evaluate(() => {
      // Scraping logic here
      return [];
    });
    
    return parts;
  } finally {
    await browser.close();
  }
}
```

### Step 3: Alternative - Use Proxy Service
```typescript
// Example with ScrapingBee
const response = await fetch('https://app.scrapingbee.com/api/v1/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    api_key: process.env.SCRAPINGBEE_API_KEY,
    url: `https://partsouq.com/en/catalog/genuine/vehicle?q=${vin}`,
    render_js: true,
    premium_proxy: true,
    country_code: 'GB'
  })
});
```

## 🔧 Current Implementation Status

### Working Endpoints:
- ✅ `POST /api/parts/test-partsouq` - Test PartSouq integration
- ✅ `POST /api/parts/search-vin` - VIN search with PartSouq
- ✅ `POST /api/partsouq/usage` - Usage tracking

### Test Commands:
```bash
# Test PartSouq integration
curl -X POST http://localhost:3001/api/parts/test-partsouq \
  -H "Content-Type: application/json" \
  -d '{"vin": "WBA2D520X05E20424"}'

# Search by VIN (PartSouq only)
curl -X POST http://localhost:3001/api/parts/search-vin \
  -H "Content-Type: application/json" \
  -d '{"vin": "WBA2D520X05E20424", "source": "partsouq"}'
```

## 🎯 Next Steps

1. **Implement Puppeteer**: Add browser automation for reliable Cloudflare bypass
2. **Session Management**: Extract and reuse session tokens from successful requests
3. **Rate Limiting**: Implement proper delays to avoid detection
4. **Error Handling**: Add retry logic for failed requests
5. **Caching**: Cache successful VIN lookups to reduce API calls

## 🔍 Debugging Tips

1. **Check Response Headers**: Look for Cloudflare challenge indicators
2. **Monitor Network Tab**: Use browser dev tools to see actual requests
3. **Test with Real Browser**: Verify the VIN search works manually
4. **Update User Agent**: Keep browser fingerprint current
5. **Rotate IPs**: Use different IP addresses if blocked

## 📊 Success Metrics

- **Target**: 90%+ success rate for VIN searches
- **Response Time**: < 10 seconds per search
- **Error Rate**: < 5% due to Cloudflare blocks
- **Cost**: Track API usage and proxy costs

## ⚠️ Legal Considerations

- Respect robots.txt and terms of service
- Implement reasonable rate limiting
- Consider reaching out to PartSouq for official API access
- Monitor for any cease and desist requests

## 🔄 Fallback Strategy

If all bypass methods fail:
1. Cache successful results for reuse
2. Implement manual data entry interface
3. Partner with PartSouq for official API access
4. Use alternative parts databases as backup
