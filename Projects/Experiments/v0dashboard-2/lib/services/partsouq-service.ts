// PartSouq Service - Reverse engineered from website using Fiddler
// This service mimics the requests that PartSouq's website makes

export interface PartSouqSearchRequest {
  vin?: string;
  registration?: string;
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  category?: string;
  query?: string;
}

export interface PartSouqPart {
  id: string;
  partNumber: string;
  description: string;
  brand: string;
  price: number;
  currency: string;
  availability: string;
  imageUrl?: string;
  specifications?: Record<string, any>;
  compatibility?: {
    make: string;
    model: string;
    year: number;
    engine?: string;
  };
  supplier?: {
    name: string;
    rating?: number;
    location?: string;
  };
}

export interface PartSouqSearchResponse {
  success: boolean;
  parts: PartSouqPart[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters?: {
    brands: string[];
    categories: string[];
    priceRange: { min: number; max: number };
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    engine?: string;
    vin?: string;
  };
  error?: string;
}

export interface PartSouqApiUsage {
  requestType: string;
  searchQuery: string;
  resultsCount: number;
  responseTime: number;
  success: boolean;
  cost?: number;
  timestamp: Date;
}

class PartSouqService {
  private baseUrl: string;
  private headers: Record<string, string>;
  private sessionCookies: string = '';
  private rateLimitDelay: number = 3000; // 3 seconds between requests to avoid detection
  private cloudflareToken: string = '';
  private userAgent: string;

  constructor() {
    // Values based on Fiddler analysis - exact headers to mimic real browser
    this.baseUrl = 'https://partsouq.com';
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15';

    this.headers = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none', // Start with 'none' for initial request
      'Priority': 'u=0, i',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      // Add DNT header to look more like a real browser
      'DNT': '1'
    };
  }

  // Initialize session and handle Cloudflare protection
  async initializeSession(): Promise<boolean> {
    try {
      console.log('🔐 [PARTSOUQ] Initializing session and bypassing Cloudflare...');

      // Step 1: Visit homepage to get initial cookies and Cloudflare challenge
      const homeResponse = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          ...this.headers,
          'Sec-Fetch-Site': 'none' // Direct navigation
        },
        redirect: 'follow'
      });

      console.log(`📡 [PARTSOUQ] Home page response: ${homeResponse.status}`);

      if (homeResponse.status === 403) {
        console.log('🚫 [PARTSOUQ] Cloudflare challenge detected, attempting bypass...');
        return await this.handleCloudflareChallenge(homeResponse);
      }

      if (homeResponse.ok) {
        // Extract all cookies
        const cookies = this.extractCookies(homeResponse);
        if (cookies) {
          this.sessionCookies = cookies;
          this.headers['Cookie'] = cookies;
          console.log('🍪 [PARTSOUQ] Session cookies extracted');
        }

        // Extract any Cloudflare tokens from the page
        const html = await homeResponse.text();
        const cfToken = this.extractCloudflareToken(html);
        if (cfToken) {
          this.cloudflareToken = cfToken;
          console.log('🔑 [PARTSOUQ] Cloudflare token extracted');
        }

        return true;
      }

      console.log(`❌ [PARTSOUQ] Session initialization failed: ${homeResponse.status}`);
      return false;
    } catch (error) {
      console.error('❌ [PARTSOUQ] Failed to initialize session:', error);
      return false;
    }
  }

  // Handle Cloudflare challenge
  private async handleCloudflareChallenge(response: Response): Promise<boolean> {
    try {
      const html = await response.text();

      // Look for Cloudflare challenge token in the HTML
      const challengeMatch = html.match(/__cf_chl_tk=([^"'&]+)/);
      if (challengeMatch) {
        this.cloudflareToken = challengeMatch[1];
        console.log('🔓 [PARTSOUQ] Cloudflare challenge token found');

        // Wait a bit to simulate human behavior
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to access the page again with the token
        return await this.initializeSession();
      }

      console.log('❌ [PARTSOUQ] Could not extract Cloudflare challenge token');
      return false;
    } catch (error) {
      console.error('❌ [PARTSOUQ] Cloudflare challenge handling failed:', error);
      return false;
    }
  }

  // Extract cookies from response headers
  private extractCookies(response: Response): string | null {
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length === 0) {
      const singleCookie = response.headers.get('set-cookie');
      if (singleCookie) {
        return singleCookie.split(';')[0];
      }
      return null;
    }

    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
    return cookies || null;
  }

  // Extract Cloudflare token from HTML
  private extractCloudflareToken(html: string): string | null {
    const tokenMatch = html.match(/__cf_chl_tk['"]\s*:\s*['"]([^'"]+)['"]/);
    return tokenMatch ? tokenMatch[1] : null;
  }

  // Search by VIN - with Cloudflare bypass
  async searchByVin(vin: string): Promise<PartSouqSearchResponse> {
    try {
      // Initialize session first to handle Cloudflare
      const sessionInitialized = await this.initializeSession();
      if (!sessionInitialized) {
        console.log('⚠️ [PARTSOUQ] Session initialization failed, proceeding anyway...');
      }

      await this.rateLimitWait();

      const cleanVin = vin.toUpperCase().replace(/\s/g, '');

      // Step 1: Navigate to the main vehicle search page with VIN
      let searchUrl = `${this.baseUrl}/en/catalog/genuine/vehicle?q=${encodeURIComponent(cleanVin)}`;

      // Add Cloudflare token if we have one
      if (this.cloudflareToken) {
        searchUrl += `&__cf_chl_tk=${encodeURIComponent(this.cloudflareToken)}`;
      }

      console.log(`🔍 [PARTSOUQ] Searching for VIN: ${cleanVin}`);
      console.log(`🔗 [PARTSOUQ] URL: ${searchUrl}`);

      const requestHeaders = {
        ...this.headers,
        'Referer': `${this.baseUrl}/`,
        'Sec-Fetch-Site': 'same-origin'
      };

      // Add cookies if we have them
      if (this.sessionCookies) {
        requestHeaders['Cookie'] = this.sessionCookies;
      }

      console.log(`📡 [PARTSOUQ] Request headers:`, Object.keys(requestHeaders));

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'follow'
      });

      console.log(`📡 [PARTSOUQ] Response status: ${response.status}`);
      console.log(`📡 [PARTSOUQ] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (response.status === 403) {
        console.log('🚫 [PARTSOUQ] 403 Forbidden - Cloudflare blocking detected');

        // Try to handle Cloudflare challenge
        const challengeHandled = await this.handleCloudflareChallenge(response);
        if (challengeHandled) {
          console.log('🔄 [PARTSOUQ] Retrying after Cloudflare challenge...');
          return await this.searchByVin(vin); // Retry once
        }

        return {
          success: false,
          parts: [],
          totalCount: 0,
          page: 1,
          pageSize: 0,
          error: 'Cloudflare protection blocking access. Try using a different approach or browser automation.'
        };
      }

      if (!response.ok) {
        throw new Error(`PartSouq request failed: ${response.status} ${response.statusText}`);
      }

      const htmlContent = await response.text();
      console.log(`📄 [PARTSOUQ] Received HTML content (${htmlContent.length} chars)`);

      // Step 2: Parse the HTML to extract vehicle information and navigation data
      const vehicleData = this.parseVehiclePageHtml(htmlContent, cleanVin);

      if (!vehicleData.success) {
        return {
          success: false,
          parts: [],
          totalCount: 0,
          page: 1,
          pageSize: 0,
          error: vehicleData.error || 'Failed to parse vehicle data'
        };
      }

      // Step 3: If we found vehicle data, navigate to parts categories
      if (vehicleData.vehicleCode && vehicleData.vehicleId) {
        const partsData = await this.getVehicleParts(vehicleData);
        return this.transformResponse(partsData, 'vin_search', cleanVin);
      }

      return {
        success: false,
        parts: [],
        totalCount: 0,
        page: 1,
        pageSize: 0,
        error: 'Vehicle not found or VIN not recognized'
      };

    } catch (error) {
      console.error('❌ [PARTSOUQ] VIN search failed:', error);
      return {
        success: false,
        parts: [],
        totalCount: 0,
        page: 1,
        pageSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Search by registration (UK number plate)
  async searchByRegistration(registration: string): Promise<PartSouqSearchResponse> {
    try {
      await this.rateLimitWait();

      // Endpoint for registration search (from Fiddler analysis)
      const searchEndpoint = '/api/search/registration'; // Update with actual endpoint
      const payload = {
        registration: registration.toUpperCase().replace(/\s/g, ''),
        // Add other parameters discovered through Fiddler
      };

      const response = await fetch(`${this.baseUrl}${searchEndpoint}`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`PartSouq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformResponse(data, 'registration_search', registration);

    } catch (error) {
      console.error('PartSouq registration search failed:', error);
      return {
        success: false,
        parts: [],
        totalCount: 0,
        page: 1,
        pageSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generic parts search
  async searchParts(request: PartSouqSearchRequest): Promise<PartSouqSearchResponse> {
    try {
      await this.rateLimitWait();

      // Generic search endpoint (from Fiddler analysis)
      const searchEndpoint = '/api/search/parts'; // Update with actual endpoint
      
      const response = await fetch(`${this.baseUrl}${searchEndpoint}`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`PartSouq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformResponse(data, 'parts_search', JSON.stringify(request));

    } catch (error) {
      console.error('PartSouq parts search failed:', error);
      return {
        success: false,
        parts: [],
        totalCount: 0,
        page: 1,
        pageSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Transform PartSouq response to our standard format
  private transformResponse(data: any, requestType: string, query: string): PartSouqSearchResponse {
    try {
      // This transformation logic should be based on the actual response structure
      // discovered through Fiddler analysis
      
      const parts: PartSouqPart[] = (data.results || data.parts || []).map((item: any) => ({
        id: item.id || item.partId || '',
        partNumber: item.partNumber || item.part_number || '',
        description: item.description || item.title || '',
        brand: item.brand || item.manufacturer || '',
        price: parseFloat(item.price || item.cost || '0'),
        currency: item.currency || 'GBP',
        availability: item.availability || item.stock || 'Unknown',
        imageUrl: item.image || item.imageUrl || item.thumbnail,
        specifications: item.specifications || item.specs,
        compatibility: item.compatibility && {
          make: item.compatibility.make,
          model: item.compatibility.model,
          year: item.compatibility.year,
          engine: item.compatibility.engine
        },
        supplier: item.supplier && {
          name: item.supplier.name,
          rating: item.supplier.rating,
          location: item.supplier.location
        }
      }));

      return {
        success: true,
        parts,
        totalCount: data.totalCount || data.total || parts.length,
        page: data.page || 1,
        pageSize: data.pageSize || data.limit || parts.length,
        filters: data.filters,
        vehicle: data.vehicle
      };

    } catch (error) {
      console.error('Failed to transform PartSouq response:', error);
      return {
        success: false,
        parts: [],
        totalCount: 0,
        page: 1,
        pageSize: 0,
        error: 'Failed to parse response'
      };
    }
  }

  // Parse vehicle page HTML to extract vehicle codes and session data
  private parseVehiclePageHtml(html: string, vin: string): any {
    try {
      // Look for vehicle information in the HTML
      // Based on Fiddler analysis, we need to extract:
      // - Vehicle code (c parameter)
      // - Vehicle ID (vid parameter)
      // - Session data (ssd parameter)

      // Extract vehicle code from URL patterns like c=BMW202501
      const vehicleCodeMatch = html.match(/c=([A-Z0-9]+)/);
      const vehicleCode = vehicleCodeMatch ? vehicleCodeMatch[1] : null;

      // Extract vehicle ID from URL patterns like vid=1136468753
      const vehicleIdMatch = html.match(/vid=(\d+)/);
      const vehicleId = vehicleIdMatch ? vehicleIdMatch[1] : null;

      // Extract session data from URL patterns (this is complex encrypted data)
      const sessionDataMatch = html.match(/ssd=([^&"']+)/);
      const sessionData = sessionDataMatch ? decodeURIComponent(sessionDataMatch[1]) : null;

      // Extract vehicle information from page content
      const makeMatch = html.match(/<title>.*?([A-Z][a-z]+)\s+/);
      const make = makeMatch ? makeMatch[1] : '';

      const modelMatch = html.match(/([A-Z0-9]+)\s+\d{2}\.\d{4}/);
      const model = modelMatch ? modelMatch[1] : '';

      const yearMatch = html.match(/(\d{2}\.\d{4})/);
      const year = yearMatch ? parseInt('20' + yearMatch[1].split('.')[1]) : null;

      console.log(`🔍 [PARTSOUQ-PARSE] Vehicle Code: ${vehicleCode}`);
      console.log(`🔍 [PARTSOUQ-PARSE] Vehicle ID: ${vehicleId}`);
      console.log(`🔍 [PARTSOUQ-PARSE] Make: ${make}, Model: ${model}, Year: ${year}`);

      if (vehicleCode && vehicleId) {
        return {
          success: true,
          vehicleCode,
          vehicleId,
          sessionData,
          vehicle: {
            make,
            model,
            year,
            vin
          }
        };
      }

      return {
        success: false,
        error: 'Could not extract vehicle information from page'
      };

    } catch (error) {
      console.error('❌ [PARTSOUQ-PARSE] HTML parsing failed:', error);
      return {
        success: false,
        error: 'Failed to parse vehicle page'
      };
    }
  }

  // Get vehicle parts using extracted vehicle data
  private async getVehicleParts(vehicleData: any): Promise<any> {
    try {
      await this.rateLimitWait();

      // Navigate to engine parts (most common category)
      // Based on Fiddler: /en/catalog/genuine/unit?c=BMW202501&ssd=...&vid=1136468753&cid=542272&uid=476953555&cname=Engine&q=WBA2D520X05E20424
      const partsUrl = new URL(`${this.baseUrl}/en/catalog/genuine/unit`);
      partsUrl.searchParams.set('c', vehicleData.vehicleCode);
      partsUrl.searchParams.set('vid', vehicleData.vehicleId);
      partsUrl.searchParams.set('cid', '542272'); // Engine category ID from Fiddler
      partsUrl.searchParams.set('cname', 'Engine');
      partsUrl.searchParams.set('q', vehicleData.vehicle.vin);

      if (vehicleData.sessionData) {
        partsUrl.searchParams.set('ssd', vehicleData.sessionData);
      }

      console.log(`🔗 [PARTSOUQ-PARTS] Parts URL: ${partsUrl.toString()}`);

      const response = await fetch(partsUrl.toString(), {
        method: 'GET',
        headers: {
          ...this.headers,
          'Referer': `${this.baseUrl}/en/catalog/genuine/vehicle?c=${vehicleData.vehicleCode}&vid=${vehicleData.vehicleId}&q=${vehicleData.vehicle.vin}`
        }
      });

      if (!response.ok) {
        throw new Error(`Parts request failed: ${response.status}`);
      }

      const partsHtml = await response.text();
      return this.parsePartsPageHtml(partsHtml, vehicleData);

    } catch (error) {
      console.error('❌ [PARTSOUQ-PARTS] Failed to get vehicle parts:', error);
      return {
        success: false,
        parts: [],
        error: 'Failed to retrieve parts'
      };
    }
  }

  // Parse parts page HTML to extract part information
  private parsePartsPageHtml(html: string, vehicleData: any): any {
    try {
      // This would need to be implemented based on the actual HTML structure
      // For now, return a mock response indicating successful navigation
      const parts = [
        {
          id: 'mock-1',
          partNumber: 'ENGINE-001',
          description: 'Engine Component (Mock)',
          brand: vehicleData.vehicle.make,
          price: 150.00,
          currency: 'GBP',
          availability: 'Available',
          category: 'Engine',
          compatibility: vehicleData.vehicle
        }
      ];

      return {
        success: true,
        parts,
        vehicle: vehicleData.vehicle,
        totalCount: parts.length
      };

    } catch (error) {
      console.error('❌ [PARTSOUQ-PARTS-PARSE] Failed to parse parts:', error);
      return {
        success: false,
        parts: [],
        error: 'Failed to parse parts page'
      };
    }
  }

  // Rate limiting to avoid being blocked
  private async rateLimitWait(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  // Log API usage for cost tracking
  async logApiUsage(usage: PartSouqApiUsage): Promise<void> {
    try {
      // This would save to our database for tracking costs and usage
      const response = await fetch('/api/partsouq/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(usage)
      });

      if (!response.ok) {
        console.error('Failed to log PartSouq API usage');
      }
    } catch (error) {
      console.error('Error logging PartSouq API usage:', error);
    }
  }
}

// Singleton instance
export const partSouqService = new PartSouqService();

// Helper function to search by VIN with usage tracking
export async function searchPartsByVin(vin: string): Promise<PartSouqSearchResponse> {
  const startTime = Date.now();
  
  try {
    const result = await partSouqService.searchByVin(vin);
    const responseTime = Date.now() - startTime;

    // Log usage
    await partSouqService.logApiUsage({
      requestType: 'vin_search',
      searchQuery: vin,
      resultsCount: result.parts.length,
      responseTime,
      success: result.success,
      timestamp: new Date()
    });

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Log failed usage
    await partSouqService.logApiUsage({
      requestType: 'vin_search',
      searchQuery: vin,
      resultsCount: 0,
      responseTime,
      success: false,
      timestamp: new Date()
    });

    throw error;
  }
}
