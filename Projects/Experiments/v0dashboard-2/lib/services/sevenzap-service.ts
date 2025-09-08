// 7zap.com Integration Service - Superior OEM Parts Catalog
// Based on Fiddler analysis of 7zap.com traffic

interface SevenZapSearchOptions {
  vin?: string;
  make?: string;
  model?: string;
  year?: string;
  partNumber?: string;
  category?: string;
}

interface SevenZapPart {
  id: string;
  name: string;
  partNumber: string;
  oemNumber?: string;
  price?: string;
  currency?: string;
  availability: string;
  description: string;
  category: string;
  subcategory?: string;
  imageUrl?: string;
  manufacturer: string;
  supplierInfo?: {
    name: string;
    location: string;
    rating?: number;
  };
  specifications?: Record<string, string>;
  compatibleVehicles?: string[];
}

interface SevenZapVehicle {
  make: string;
  model: string;
  year: number;
  engine: string;
  vin: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  imageUrl?: string;
  catalogUrl?: string;
}

interface SevenZapSearchResult {
  success: boolean;
  vehicle?: SevenZapVehicle;
  parts: SevenZapPart[];
  totalCount: number;
  searchTime: number;
  method: string;
  domain: string;
  error?: string;
}

export class SevenZapService {
  private static readonly BASE_DOMAINS = {
    main: 'https://7zap.com',
    bmw: 'https://bmw.7zap.com',
    mercedes: 'https://mercedes.7zap.com',
    audi: 'https://audi.7zap.com',
    volkswagen: 'https://volkswagen.7zap.com',
    ford: 'https://ford.7zap.com',
    toyota: 'https://toyota.7zap.com',
    honda: 'https://honda.7zap.com',
    nissan: 'https://nissan.7zap.com',
    hyundai: 'https://hyundai.7zap.com',
    kia: 'https://kia.7zap.com',
    opel: 'https://opel.7zap.com',
    vauxhall: 'https://vauxhall.7zap.com',
    mini: 'https://mini.7zap.com',
    porsche: 'https://porsche.7zap.com',
    skoda: 'https://skoda.7zap.com',
    seat: 'https://seat.7zap.com'
  };

  private static readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  /**
   * Search for parts by VIN number
   */
  static async searchByVin(vin: string, make?: string): Promise<SevenZapSearchResult> {
    const startTime = Date.now();
    console.log(`🔍 [7ZAP-SERVICE] Starting VIN search: ${vin}`);

    try {
      // Determine best domain for the make
      const domain = this.getBestDomain(make);
      console.log(`🌐 [7ZAP-SERVICE] Using domain: ${domain}`);

      // Try multiple search strategies
      const strategies = [
        () => this.searchViaMainCatalog(vin, domain),
        () => this.searchViaBrandCatalog(vin, domain, make),
        () => this.searchViaUniversalSearch(vin, domain)
      ];

      for (const [index, strategy] of strategies.entries()) {
        try {
          console.log(`🔄 [7ZAP-SERVICE] Trying strategy ${index + 1}/3`);
          const result = await strategy();
          
          if (result.success && result.parts.length > 0) {
            const searchTime = Date.now() - startTime;
            console.log(`✅ [7ZAP-SERVICE] Success! Found ${result.parts.length} parts in ${searchTime}ms`);
            
            return {
              ...result,
              searchTime,
              method: `7zap-strategy-${index + 1}`,
              domain
            };
          }
        } catch (error) {
          console.log(`❌ [7ZAP-SERVICE] Strategy ${index + 1} failed:`, error);
          continue;
        }
      }

      // If all strategies fail
      return {
        success: false,
        parts: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        method: '7zap-all-failed',
        domain,
        error: 'All search strategies failed'
      };

    } catch (error) {
      console.error('❌ [7ZAP-SERVICE] VIN search failed:', error);
      return {
        success: false,
        parts: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        method: '7zap-error',
        domain: this.BASE_DOMAINS.main,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search for parts by part number
   */
  static async searchByPartNumber(partNumber: string, make?: string): Promise<SevenZapSearchResult> {
    console.log(`🔍 [7ZAP-SERVICE] Searching by part number: ${partNumber}`);
    
    const domain = this.getBestDomain(make);
    const searchUrl = `${domain}/en/search?q=${encodeURIComponent(partNumber)}`;
    
    try {
      const response = await fetch(searchUrl, {
        headers: this.HEADERS
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const parts = this.parsePartsFromHtml(html);
      
      return {
        success: true,
        parts,
        totalCount: parts.length,
        searchTime: 0,
        method: '7zap-part-number',
        domain
      };
      
    } catch (error) {
      console.error('❌ [7ZAP-SERVICE] Part number search failed:', error);
      return {
        success: false,
        parts: [],
        totalCount: 0,
        searchTime: 0,
        method: '7zap-part-number-error',
        domain,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get vehicle information by VIN
   */
  static async getVehicleInfo(vin: string): Promise<SevenZapVehicle | null> {
    console.log(`🚗 [7ZAP-SERVICE] Getting vehicle info for VIN: ${vin}`);
    
    try {
      // Try to extract vehicle info from VIN search results
      const searchResult = await this.searchByVin(vin);
      return searchResult.vehicle || null;
      
    } catch (error) {
      console.error('❌ [7ZAP-SERVICE] Vehicle info lookup failed:', error);
      return null;
    }
  }

  /**
   * Get best domain for a manufacturer
   */
  private static getBestDomain(make?: string): string {
    if (!make) return this.BASE_DOMAINS.main;
    
    const makeKey = make.toLowerCase().replace(/[^a-z]/g, '');
    
    // Map common make variations
    const makeMap: Record<string, keyof typeof this.BASE_DOMAINS> = {
      'bmw': 'bmw',
      'mercedes': 'mercedes',
      'mercedesbenz': 'mercedes',
      'audi': 'audi',
      'volkswagen': 'volkswagen',
      'vw': 'volkswagen',
      'ford': 'ford',
      'toyota': 'toyota',
      'honda': 'honda',
      'nissan': 'nissan',
      'hyundai': 'hyundai',
      'kia': 'kia',
      'opel': 'opel',
      'vauxhall': 'vauxhall',
      'mini': 'mini',
      'porsche': 'porsche',
      'skoda': 'skoda',
      'seat': 'seat'
    };
    
    const domainKey = makeMap[makeKey];
    return domainKey ? this.BASE_DOMAINS[domainKey] : this.BASE_DOMAINS.main;
  }

  /**
   * Search via main catalog
   */
  private static async searchViaMainCatalog(vin: string, domain: string): Promise<SevenZapSearchResult> {
    console.log(`📋 [7ZAP-CATALOG] Searching main catalog for VIN: ${vin}`);

    // Try multiple catalog approaches
    const catalogUrls = [
      `${domain}/en/catalog/genuine/vehicle?q=${encodeURIComponent(vin)}`,
      `${domain}/en/catalog/cars/?vin=${encodeURIComponent(vin)}`,
      `${domain}/en/search?q=${encodeURIComponent(vin)}`,
      `${domain}/en/catalog/cars/`
    ];

    for (const catalogUrl of catalogUrls) {
      try {
        console.log(`🔍 [7ZAP-CATALOG] Trying URL: ${catalogUrl}`);

        const response = await fetch(catalogUrl, {
          headers: this.HEADERS
        });

        if (!response.ok) {
          console.log(`❌ [7ZAP-CATALOG] URL failed: ${response.status}`);
          continue;
        }

        const html = await response.text();
        console.log(`📄 [7ZAP-CATALOG] Got HTML response (${html.length} chars)`);

        // Parse parts and vehicle data
        const parts = this.parsePartsFromHtml(html);
        const vehicle = this.parseVehicleFromHtml(html, vin);

        // If we found meaningful results, return them
        if (parts.length > 0 && !parts[0].partNumber.includes('DIAGNOSTIC')) {
          console.log(`✅ [7ZAP-CATALOG] Found ${parts.length} parts via ${catalogUrl}`);

          return {
            success: true,
            vehicle,
            parts,
            totalCount: parts.length,
            searchTime: 0,
            method: '7zap-catalog',
            domain,
            searchUrl: catalogUrl
          };
        }

        // If this looks like a VIN search page, continue with this result even if no parts
        if (html.includes('vin') || html.includes('VIN') || html.includes('vehicle')) {
          console.log(`✅ [7ZAP-CATALOG] VIN search page detected at ${catalogUrl}`);

          return {
            success: true,
            vehicle,
            parts,
            totalCount: parts.length,
            searchTime: 0,
            method: '7zap-catalog',
            domain,
            searchUrl: catalogUrl
          };
        }

      } catch (error) {
        console.log(`❌ [7ZAP-CATALOG] Error with ${catalogUrl}:`, error);
        continue;
      }
    }

    throw new Error('No successful catalog search found');
  }

  /**
   * Search via brand-specific catalog
   */
  private static async searchViaBrandCatalog(vin: string, domain: string, make?: string): Promise<SevenZapSearchResult> {
    console.log(`🏭 [7ZAP-BRAND] Searching brand catalog for VIN: ${vin}`);
    
    if (domain === this.BASE_DOMAINS.main) {
      throw new Error('No brand-specific domain available');
    }
    
    const brandUrl = `${domain}/en/`;
    
    const response = await fetch(brandUrl, {
      headers: this.HEADERS
    });
    
    if (!response.ok) {
      throw new Error(`Brand catalog access failed: ${response.status}`);
    }
    
    const html = await response.text();
    const parts = this.parsePartsFromHtml(html);
    const vehicle = this.parseVehicleFromHtml(html, vin);
    
    return {
      success: true,
      vehicle,
      parts,
      totalCount: parts.length,
      searchTime: 0,
      method: '7zap-brand-catalog',
      domain
    };
  }

  /**
   * Search via universal search
   */
  private static async searchViaUniversalSearch(vin: string, domain: string): Promise<SevenZapSearchResult> {
    console.log(`🔍 [7ZAP-UNIVERSAL] Universal search for VIN: ${vin}`);

    // Try multiple universal search approaches
    const searchUrls = [
      `${domain}/en/search?q=${encodeURIComponent(vin)}`,
      `${domain}/en/?q=${encodeURIComponent(vin)}`,
      `${domain}/search?query=${encodeURIComponent(vin)}`,
      `${domain}/en/catalog/search?vin=${encodeURIComponent(vin)}`
    ];

    for (const searchUrl of searchUrls) {
      try {
        console.log(`🔍 [7ZAP-UNIVERSAL] Trying search URL: ${searchUrl}`);

        const response = await fetch(searchUrl, {
          headers: this.HEADERS
        });

        if (!response.ok) {
          console.log(`❌ [7ZAP-UNIVERSAL] Search URL failed: ${response.status}`);
          continue;
        }

        const html = await response.text();
        console.log(`📄 [7ZAP-UNIVERSAL] Got search response (${html.length} chars)`);

        const parts = this.parsePartsFromHtml(html);
        const vehicle = this.parseVehicleFromHtml(html, vin);

        // Return results if we found something meaningful
        if (parts.length > 0) {
          console.log(`✅ [7ZAP-UNIVERSAL] Found ${parts.length} results via ${searchUrl}`);

          return {
            success: true,
            vehicle,
            parts,
            totalCount: parts.length,
            searchTime: 0,
            method: '7zap-universal',
            domain,
            searchUrl
          };
        }

      } catch (error) {
        console.log(`❌ [7ZAP-UNIVERSAL] Error with ${searchUrl}:`, error);
        continue;
      }
    }

    // If no search URLs worked, return empty result
    return {
      success: false,
      vehicle: undefined,
      parts: [],
      totalCount: 0,
      searchTime: 0,
      method: '7zap-universal-failed',
      domain,
      error: 'All universal search URLs failed'
    };
  }

  /**
   * Parse parts from HTML content
   */
  private static parsePartsFromHtml(html: string): SevenZapPart[] {
    const parts: SevenZapPart[] = [];

    console.log(`📄 [7ZAP-PARSER] Parsing HTML content (${html.length} chars)`);

    try {
      // Debug: Look for any potential part-related content
      const debugPatterns = ['part', 'product', 'catalog', 'search', 'result', 'item', 'card', 'listing'];
      for (const pattern of debugPatterns) {
        const regex = new RegExp(pattern, 'gi');
        const matches = html.match(regex);
        if (matches) {
          console.log(`🔍 [7ZAP-DEBUG] Found ${matches.length} instances of "${pattern}"`);
        }
      }

      // Check if this is a VIN search results page or catalog page
      const isVinSearchPage = html.includes('vin') || html.includes('VIN') || html.includes('vehicle');
      const isCatalogPage = html.includes('catalog') || html.includes('parts') || html.includes('oem');

      console.log(`🔍 [7ZAP-PARSER] Page type - VIN search: ${isVinSearchPage}, Catalog: ${isCatalogPage}`);

      // If this looks like a VIN search page but no parts are visible,
      // it might be a page that requires JavaScript or shows a vehicle selection
      if (isVinSearchPage && !html.includes('price') && !html.includes('€') && !html.includes('$')) {
        console.log(`🔍 [7ZAP-PARSER] Detected VIN search page without visible parts - may need vehicle selection`);

        // Look for vehicle selection links or buttons
        const vehicleLinks = html.match(/<a[^>]*href="[^"]*"[^>]*>.*?(?:engine|motor|variant|model).*?<\/a>/gi);
        if (vehicleLinks && vehicleLinks.length > 0) {
          console.log(`🔍 [7ZAP-PARSER] Found ${vehicleLinks.length} potential vehicle selection links`);

          // Create placeholder parts indicating vehicle selection is needed
          parts.push({
            id: '7zap-vehicle-selection',
            name: 'Vehicle Selection Required',
            partNumber: 'SELECT_VEHICLE',
            price: 'N/A',
            availability: 'Select vehicle variant to view parts',
            description: `Found ${vehicleLinks.length} vehicle variants. Please select specific engine/model variant to view parts.`,
            category: 'Vehicle Selection',
            manufacturer: 'Various',
            imageUrl: ''
          });
        }
      }

      // Enhanced patterns for 7zap structure
      const partPatterns = [
        // Modern card-based layouts
        /<div[^>]*class="[^"]*(?:card|item|product|part)[^"]*"[^>]*>(.*?)<\/div>/gis,
        // Table rows with part data
        /<tr[^>]*>(.*?(?:€|£|\$|price).*?)<\/tr>/gis,
        // List items with part information
        /<li[^>]*class="[^"]*(?:item|product|part)[^"]*"[^>]*>(.*?)<\/li>/gis,
        // Article elements (modern semantic HTML)
        /<article[^>]*>(.*?)<\/article>/gis,
        // Divs containing price information
        /<div[^>]*>(.*?(?:€|£|\$)\s*\d+.*?)<\/div>/gis
      ];

      for (const [index, pattern] of partPatterns.entries()) {
        const matches = Array.from(html.matchAll(pattern));
        console.log(`🔍 [7ZAP-PARSER] Pattern ${index + 1}: Found ${matches.length} matches`);

        for (const match of matches.slice(0, 10)) { // Check more matches
          const partHtml = match[1];

          // Skip if this doesn't look like a part (too short or no useful content)
          if (partHtml.length < 20 || !partHtml.includes('€') && !partHtml.includes('£') && !partHtml.includes('$')) {
            continue;
          }

          // Enhanced extraction patterns
          const namePatterns = [
            /<[^>]*class="[^"]*(?:name|title|description)[^"]*"[^>]*>([^<]+)</i,
            /<h[1-6][^>]*>([^<]+)</i,
            /<span[^>]*class="[^"]*(?:name|title)[^"]*"[^>]*>([^<]+)</i,
            /title="([^"]+)"/i
          ];

          const numberPatterns = [
            /<[^>]*class="[^"]*(?:number|code|sku|part)[^"]*"[^>]*>([^<]+)</i,
            /(?:part|sku|code|ref)[\s:]*([A-Z0-9\-]{6,20})/i,
            /\b([A-Z0-9]{8,17})\b/
          ];

          const pricePatterns = [
            /([€£$]\s*\d+[.,]\d{2})/,
            /(\d+[.,]\d{2}\s*[€£$])/,
            /price[^>]*>([^<]*\d+[.,]\d{2}[^<]*)</i
          ];

          let name = '';
          let partNumber = '';
          let price = '';

          // Try to extract name
          for (const namePattern of namePatterns) {
            const nameMatch = partHtml.match(namePattern);
            if (nameMatch && nameMatch[1].trim().length > 3) {
              name = nameMatch[1].trim();
              break;
            }
          }

          // Try to extract part number
          for (const numberPattern of numberPatterns) {
            const numberMatch = partHtml.match(numberPattern);
            if (numberMatch && numberMatch[1].trim().length > 5) {
              partNumber = numberMatch[1].trim();
              break;
            }
          }

          // Try to extract price
          for (const pricePattern of pricePatterns) {
            const priceMatch = partHtml.match(pricePattern);
            if (priceMatch) {
              price = priceMatch[1].trim();
              break;
            }
          }

          // Only add if we have meaningful data
          if ((name && name.length > 3) || (partNumber && partNumber.length > 5) || price) {
            parts.push({
              id: `7zap-${parts.length + 1}`,
              name: name || 'Auto Part',
              partNumber: partNumber || `PART-${parts.length + 1}`,
              price: price || 'Contact for price',
              availability: 'Available',
              description: name && partNumber ? `${name} (${partNumber})` : name || partNumber || '',
              category: 'OEM Parts',
              manufacturer: 'OEM',
              imageUrl: ''
            });
          }
        }

        if (parts.length > 0) break; // Stop if we found parts
      }

      // If still no parts found, create a helpful diagnostic entry
      if (parts.length === 0) {
        console.log(`🔍 [7ZAP-PARSER] No parts found - creating diagnostic entry`);

        // Check if page has any structured content
        const hasStructuredContent = html.includes('class=') || html.includes('id=');
        const hasJavaScript = html.includes('<script') || html.includes('javascript:');
        const hasForm = html.includes('<form') || html.includes('input');
        const hasVehicleSelection = html.includes('vehicle') || html.includes('model') || html.includes('engine');
        const hasCatalogLinks = html.includes('catalog') || html.includes('parts');

        // Look for specific 7zap indicators
        const is7zapSite = html.includes('7zap') || html.includes('7ZAP');
        const hasSearchBox = html.includes('search') || html.includes('Search');

        let helpfulMessage = '';
        if (hasVehicleSelection && !html.includes('price')) {
          helpfulMessage = 'This appears to be a vehicle selection page. You may need to select a specific engine variant or model year to view parts.';
        } else if (hasCatalogLinks && !html.includes('price')) {
          helpfulMessage = 'This appears to be a catalog navigation page. Try browsing to a specific vehicle category first.';
        } else if (hasJavaScript && !html.includes('price')) {
          helpfulMessage = 'This page uses JavaScript to load parts. The parts may load dynamically after page load.';
        } else {
          helpfulMessage = 'No parts found on this page. Try a different VIN or search method.';
        }

        parts.push({
          id: '7zap-diagnostic',
          name: '7zap Integration Status',
          partNumber: 'INFO',
          price: 'Free',
          availability: 'Information',
          description: `${helpfulMessage} | Page analysis: 7zap site: ${is7zapSite}, Vehicle selection: ${hasVehicleSelection}, Search available: ${hasSearchBox}, JavaScript: ${hasJavaScript}`,
          category: 'Integration Info',
          manufacturer: '7zap',
          imageUrl: ''
        });
      }

      console.log(`📊 [7ZAP-PARSER] Found ${parts.length} parts`);

    } catch (error) {
      console.error('❌ [7ZAP-PARSER] HTML parsing failed:', error);

      // Add error diagnostic part
      parts.push({
        id: '7zap-error',
        name: 'Parsing Error',
        partNumber: 'ERROR',
        price: 'N/A',
        availability: 'Error occurred',
        description: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category: 'Error',
        manufacturer: '7zap',
        imageUrl: ''
      });
    }

    return parts;
  }

  /**
   * Parse vehicle information from HTML
   */
  private static parseVehicleFromHtml(html: string, vin: string): SevenZapVehicle | undefined {
    console.log(`🚗 [7ZAP-PARSER] Parsing vehicle info from HTML`);

    try {
      // Look for vehicle information patterns
      const makeMatch = html.match(/<[^>]*class="[^"]*make[^"]*"[^>]*>([^<]+)</i) ||
                       html.match(/\b(BMW|Mercedes|Audi|Volkswagen|Ford|Toyota|Honda|Nissan)\b/i);

      const modelMatch = html.match(/<[^>]*class="[^"]*model[^"]*"[^>]*>([^<]+)</i);
      const yearMatch = html.match(/\b(19|20)\d{2}\b/);

      if (makeMatch) {
        return {
          make: makeMatch[1] || makeMatch[0],
          model: modelMatch?.[1] || 'Unknown Model',
          year: yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear(),
          engine: 'Unknown',
          vin: vin,
          bodyType: undefined,
          fuelType: undefined,
          transmission: undefined,
          imageUrl: undefined,
          catalogUrl: undefined
        };
      }

    } catch (error) {
      console.error('❌ [7ZAP-PARSER] Vehicle parsing failed:', error);
    }

    return undefined;
  }
}
