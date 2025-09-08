// PartSouq Configuration - Update these values based on Fiddler analysis
// This file contains the reverse-engineered API endpoints and headers

export interface PartSouqConfig {
  baseUrl: string;
  endpoints: {
    vinSearch: string;
    registrationSearch: string;
    partsSearch: string;
    vehicleInfo: string;
    categories: string;
    brands: string;
  };
  headers: Record<string, string>;
  authentication?: {
    type: 'cookie' | 'token' | 'basic' | 'none';
    tokenHeader?: string;
    cookieNames?: string[];
  };
  rateLimiting: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
  };
  requestFormats: {
    vinSearch: any;
    registrationSearch: any;
    partsSearch: any;
  };
}

// Configuration based on Fiddler analysis of PartSouq.com
export const partSouqConfig: PartSouqConfig = {
  baseUrl: 'https://partsouq.com',

  endpoints: {
    // Based on Fiddler capture - PartSouq uses URL-based navigation, not API endpoints
    vinSearch: '/en/catalog/genuine/vehicle',
    registrationSearch: '/en/catalog/genuine/vehicle',
    partsSearch: '/en/catalog/genuine/unit',
    vehicleInfo: '/en/catalog/genuine/vehicle',
    categories: '/en/catalog/genuine/vehicle',
    brands: '/en/catalog/genuine/vehicle'
  },

  headers: {
    // Headers captured from Fiddler analysis
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Referer': 'https://partsouq.com/',
    'Priority': 'u=0, i',
    // PartSouq appears to use Cloudflare protection
    'Cache-Control': 'max-age=0',
  },

  authentication: {
    type: 'none', // UPDATE: Change based on what Fiddler reveals
    // If cookies are required:
    // type: 'cookie',
    // cookieNames: ['session_id', 'csrf_token'],
    
    // If API token is required:
    // type: 'token',
    // tokenHeader: 'X-API-Key',
  },

  rateLimiting: {
    requestsPerMinute: 30, // Conservative estimate - adjust based on testing
    delayBetweenRequests: 2000 // 2 seconds between requests
  },

  requestFormats: {
    // Based on Fiddler analysis - PartSouq uses URL parameters, not JSON payloads
    vinSearch: {
      // URL parameters for VIN search
      c: '', // Vehicle code (e.g., 'BMW202501')
      ssd: '', // Encrypted session data
      vid: '', // Vehicle ID (e.g., '1136468753')
      q: '', // VIN number (e.g., 'WBA2D520X05E20424')
      __cf_chl_tk: '' // Cloudflare challenge token (optional)
    },

    registrationSearch: {
      // Similar to VIN search but with registration
      c: '',
      ssd: '',
      vid: '',
      reg: '', // Registration number instead of VIN
      country: 'GB'
    },

    partsSearch: {
      // URL parameters for parts browsing
      c: '', // Vehicle code
      ssd: '', // Session data
      vid: '', // Vehicle ID
      cid: '', // Category ID (e.g., '542272' for Engine)
      uid: '', // Unit ID (e.g., '476953555')
      cname: '', // Category name (e.g., 'Engine')
      q: '' // Original VIN/search query
    }
  }
};

// Helper function to get configuration with environment overrides
export function getPartSouqConfig(): PartSouqConfig {
  return {
    ...partSouqConfig,
    baseUrl: process.env.PARTSOUQ_BASE_URL || partSouqConfig.baseUrl,
    headers: {
      ...partSouqConfig.headers,
      // Add any environment-specific headers
      ...(process.env.PARTSOUQ_API_KEY && {
        'Authorization': `Bearer ${process.env.PARTSOUQ_API_KEY}`
      }),
      ...(process.env.PARTSOUQ_USER_AGENT && {
        'User-Agent': process.env.PARTSOUQ_USER_AGENT
      })
    }
  };
}

// Instructions for using Fiddler to capture PartSouq API calls
export const FIDDLER_INSTRUCTIONS = `
FIDDLER SETUP INSTRUCTIONS FOR PARTSOUQ REVERSE ENGINEERING:

1. SETUP FIDDLER:
   - Install Fiddler Classic or Fiddler Everywhere
   - Enable HTTPS decryption (Tools > Options > HTTPS > Decrypt HTTPS traffic)
   - Set up filters to only capture partsouq.com traffic

2. CAPTURE VIN SEARCH:
   - Go to partsouq.com
   - Perform a VIN search (use a real VIN like: WBAVA31070NL12345)
   - In Fiddler, look for API calls made during the search
   - Note the request URL, method, headers, and payload
   - Note the response format

3. CAPTURE REGISTRATION SEARCH:
   - Perform a UK registration search (use format like: AB12 CDE)
   - Capture the API calls in Fiddler
   - Note any differences from VIN search

4. CAPTURE PARTS SEARCH:
   - Perform a general parts search
   - Try filtering by make, model, category
   - Capture pagination requests
   - Note sorting and filtering parameters

5. UPDATE CONFIGURATION:
   - Update the endpoints in partsouq-config.ts
   - Update the headers (especially User-Agent, Referer, etc.)
   - Update the request formats with actual field names
   - Update authentication method if required
   - Test rate limiting to find safe request frequency

6. KEY THINGS TO LOOK FOR:
   - Base URL and endpoint paths
   - Required headers (especially authentication)
   - Request payload structure
   - Response data format
   - Session management (cookies, tokens)
   - Rate limiting behavior
   - Error response formats

7. TESTING:
   - Start with small requests to test the integration
   - Monitor for any blocking or rate limiting
   - Verify response data matches expected format
   - Test error handling

EXAMPLE FIDDLER CAPTURE:
POST https://www.partsouq.com/api/search/vin
Headers:
  Content-Type: application/json
  User-Agent: Mozilla/5.0...
  Referer: https://www.partsouq.com/
  Cookie: session_id=abc123...

Payload:
{
  "vin": "WBAVA31070NL12345",
  "country": "GB",
  "includeImages": true
}

Response:
{
  "success": true,
  "vehicle": {...},
  "parts": [...],
  "totalCount": 150
}
`;

export default partSouqConfig;
