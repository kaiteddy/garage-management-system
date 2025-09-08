// Euro Car Parts Omnipart Integration
// Trade portal integration with authentication

interface OmnipartCredentials {
  username: string
  password: string
}

interface OmnipartVehicle {
  registration: string
  make: string
  model: string
  variant: string
  year: string
  engine: string
  fuelType: string
  transmission: string
  bodyType: string
  doors: string
  engineCode?: string
  chassisNumber?: string
}

interface OmnipartPart {
  partNumber: string
  description: string
  brand: string
  price: number
  tradePrice: number
  availability: string
  stockLevel: number
  category: string
  subcategory: string
  imageUrl?: string
  specifications?: Record<string, string>
  fitmentNotes?: string
  warranty?: string
  weight?: number
  dimensions?: string
}

interface OmnipartSearchResult {
  success: boolean
  vehicle?: OmnipartVehicle
  parts: OmnipartPart[]
  totalCount: number
  searchTime: number
  error?: string
  sessionId?: string
}

export class EuroCarPartsOmnipart {
  private static readonly BASE_URL = 'https://omnipart.eurocarparts.com'
  private static readonly LOGIN_URL = `${this.BASE_URL}/login`
  private static readonly VEHICLE_LOOKUP_URL = `${this.BASE_URL}/vehicle-lookup`
  private static readonly PARTS_SEARCH_URL = `${this.BASE_URL}/parts-search`
  
  private static credentials: OmnipartCredentials = {
    username: process.env.EUROCARPARTS_USERNAME || '',
    password: process.env.EUROCARPARTS_PASSWORD || ''
  }

  private static sessionCookies: string = ''
  private static sessionExpiry: number = 0

  /**
   * Authenticate with Omnipart system
   */
  private static async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 [OMNIPART] Authenticating with Euro Car Parts...')

      // Check if we have valid session
      if (this.sessionCookies && Date.now() < this.sessionExpiry) {
        console.log('✅ [OMNIPART] Using existing session')
        return true
      }

      const loginResponse = await fetch(this.LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': this.BASE_URL,
          'Origin': this.BASE_URL
        },
        body: new URLSearchParams({
          username: this.credentials.username,
          password: this.credentials.password,
          remember: 'true'
        })
      })

      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`)
      }

      // Extract session cookies
      const setCookieHeaders = loginResponse.headers.getSetCookie?.() || []
      this.sessionCookies = setCookieHeaders.join('; ')
      this.sessionExpiry = Date.now() + (4 * 60 * 60 * 1000) // 4 hours

      console.log('✅ [OMNIPART] Authentication successful')
      return true

    } catch (error) {
      console.error('❌ [OMNIPART] Authentication failed:', error)
      return false
    }
  }

  /**
   * Look up vehicle by registration
   */
  static async lookupVehicle(registration: string): Promise<OmnipartVehicle | null> {
    try {
      console.log(`🚗 [OMNIPART] Looking up vehicle: ${registration}`)

      // Ensure we're authenticated
      const authenticated = await this.authenticate()
      if (!authenticated) {
        throw new Error('Authentication failed')
      }

      const cleanReg = registration.toUpperCase().replace(/\s/g, '')

      const response = await fetch(`${this.VEHICLE_LOOKUP_URL}?registration=${encodeURIComponent(cleanReg)}`, {
        method: 'GET',
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Referer': this.BASE_URL,
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (!response.ok) {
        throw new Error(`Vehicle lookup failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.vehicle) {
        console.log(`✅ [OMNIPART] Vehicle found: ${data.vehicle.make} ${data.vehicle.model}`)
        return this.parseVehicleData(data.vehicle)
      }

      return null

    } catch (error) {
      console.error('❌ [OMNIPART] Vehicle lookup failed:', error)
      return null
    }
  }

  /**
   * Search for parts by vehicle registration
   */
  static async searchPartsByRegistration(registration: string, category?: string): Promise<OmnipartSearchResult> {
    const startTime = Date.now()

    try {
      console.log(`🔍 [OMNIPART] Searching parts for: ${registration}`)

      // First get vehicle data
      const vehicle = await this.lookupVehicle(registration)
      if (!vehicle) {
        return {
          success: false,
          parts: [],
          totalCount: 0,
          searchTime: Date.now() - startTime,
          error: 'Vehicle not found'
        }
      }

      // Search for parts
      const searchParams = new URLSearchParams({
        registration: registration.toUpperCase().replace(/\s/g, ''),
        category: category || 'all',
        page: '1',
        limit: '50'
      })

      const response = await fetch(`${this.PARTS_SEARCH_URL}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Referer': this.BASE_URL,
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (!response.ok) {
        throw new Error(`Parts search failed: ${response.status}`)
      }

      const data = await response.json()
      const parts = this.parsePartsData(data.parts || [])

      console.log(`✅ [OMNIPART] Found ${parts.length} parts`)

      return {
        success: true,
        vehicle,
        parts,
        totalCount: data.totalCount || parts.length,
        searchTime: Date.now() - startTime,
        sessionId: this.sessionCookies.split(';')[0]
      }

    } catch (error) {
      console.error('❌ [OMNIPART] Parts search failed:', error)
      return {
        success: false,
        parts: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Search for specific part by part number
   */
  static async searchByPartNumber(partNumber: string): Promise<OmnipartSearchResult> {
    const startTime = Date.now()

    try {
      console.log(`🔍 [OMNIPART] Searching by part number: ${partNumber}`)

      const authenticated = await this.authenticate()
      if (!authenticated) {
        throw new Error('Authentication failed')
      }

      const searchParams = new URLSearchParams({
        partNumber: partNumber.trim(),
        page: '1',
        limit: '20'
      })

      const response = await fetch(`${this.PARTS_SEARCH_URL}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Referer': this.BASE_URL,
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (!response.ok) {
        throw new Error(`Part search failed: ${response.status}`)
      }

      const data = await response.json()
      const parts = this.parsePartsData(data.parts || [])

      return {
        success: true,
        parts,
        totalCount: data.totalCount || parts.length,
        searchTime: Date.now() - startTime
      }

    } catch (error) {
      console.error('❌ [OMNIPART] Part search failed:', error)
      return {
        success: false,
        parts: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Parse vehicle data from Omnipart response
   */
  private static parseVehicleData(vehicleData: any): OmnipartVehicle {
    return {
      registration: vehicleData.registration || '',
      make: vehicleData.make || '',
      model: vehicleData.model || '',
      variant: vehicleData.variant || '',
      year: vehicleData.year || '',
      engine: vehicleData.engine || '',
      fuelType: vehicleData.fuelType || '',
      transmission: vehicleData.transmission || '',
      bodyType: vehicleData.bodyType || '',
      doors: vehicleData.doors || '',
      engineCode: vehicleData.engineCode,
      chassisNumber: vehicleData.chassisNumber
    }
  }

  /**
   * Parse parts data from Omnipart response
   */
  private static parsePartsData(partsData: any[]): OmnipartPart[] {
    return partsData.map(part => ({
      partNumber: part.partNumber || '',
      description: part.description || '',
      brand: part.brand || '',
      price: parseFloat(part.price) || 0,
      tradePrice: parseFloat(part.tradePrice) || parseFloat(part.price) || 0,
      availability: part.availability || 'Unknown',
      stockLevel: parseInt(part.stockLevel) || 0,
      category: part.category || '',
      subcategory: part.subcategory || '',
      imageUrl: part.imageUrl,
      specifications: part.specifications,
      fitmentNotes: part.fitmentNotes,
      warranty: part.warranty,
      weight: part.weight,
      dimensions: part.dimensions
    }))
  }

  /**
   * Set credentials (for environment variable override)
   */
  static setCredentials(username: string, password: string): void {
    this.credentials = { username, password }
  }

  /**
   * Test connection to Omnipart
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const authenticated = await this.authenticate()
      if (authenticated) {
        return {
          success: true,
          message: 'Successfully connected to Euro Car Parts Omnipart'
        }
      } else {
        return {
          success: false,
          message: 'Failed to authenticate with Omnipart'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}
