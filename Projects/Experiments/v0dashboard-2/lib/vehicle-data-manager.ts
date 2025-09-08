// Vehicle Data Manager - Comprehensive vehicle data storage and API cost tracking
import { Pool } from 'pg'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// API Cost Configuration (in GBP)
const API_COSTS = {
  VDG: {
    VehicleDetails: 0.05,
    VehicleDetailsWithImage: 0.14,
    MotHistoryDetails: 0.05,
    SpecAndOptionsDetails: 0.18,
    TyreDetails: 0.08,
    BatteryDetails: 0.06,
    AddressDetails: 0.05,
    // Enhanced packages for comprehensive data (calculated combinations)
    VehicleDetailsWithTyres: 0.22, // VehicleDetailsWithImage + TyreDetails
    VehicleDetailsWithSpecs: 0.32, // VehicleDetailsWithImage + SpecAndOptionsDetails
    ComprehensiveDetails: 0.40,    // VehicleDetailsWithImage + TyreDetails + SpecAndOptionsDetails
  },
  SWS: {
    VRMLookup: 0.192, // 1 credit
    TechData: 0.48,   // 2.5 credits
    HaynesData: 0.70, // 3.65 credits
    PartsData: 0.25,  // 1.3 credits
  },
  DVLA: {
    OpenData: 0.0, // Free
  },
  MOT: {
    History: 0.0, // Free
  }
}

// Cache expiry times (in hours)
const CACHE_EXPIRY = {
  basic: 24 * 7,      // 1 week for basic vehicle data
  technical: 24 * 30, // 1 month for technical specs
  image: 24 * 7,      // 1 week for images (or use expiry from API)
  mot: 24,            // 1 day for MOT data
  service: 24 * 30,   // 1 month for service data
}

export interface VehicleDataRequest {
  registration: string
  dataTypes: string[] // ['basic', 'technical', 'image', 'mot', 'service', 'comprehensive']
  forceRefresh?: boolean
  customerId?: string
  useComprehensiveData?: boolean // Use enhanced VDG packages to eliminate N/A values
  maxCost?: number // Maximum cost allowed for API calls
}

export interface APIUsageLog {
  registration: string
  vehicleId?: string
  apiProvider: string
  apiPackage?: string
  costAmount: number
  responseStatus: 'success' | 'error' | 'no_data'
  dataRetrieved: boolean
  cachedHit: boolean
  requestDetails?: any
  responseSummary?: any
}

export interface VehicleDataResult {
  registration: string
  data: {
    basic?: any
    technical?: any
    image?: any
    mot?: any
    service?: any
  }
  sources: string[]
  totalCost: number
  cacheHits: number
  apiCalls: number
  completenessScore: number
}

export class VehicleDataManager {
  
  // Main method to get comprehensive vehicle data
  async getVehicleData(request: VehicleDataRequest): Promise<VehicleDataResult> {
    const { registration, dataTypes, forceRefresh = false } = request
    
    console.log(`🔍 [VDM] Getting vehicle data for ${registration}, types: ${dataTypes.join(', ')}`)
    
    const result: VehicleDataResult = {
      registration,
      data: {},
      sources: [],
      totalCost: 0,
      cacheHits: 0,
      apiCalls: 0,
      completenessScore: 0
    }
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await this.getCachedData(registration, dataTypes)
      for (const [dataType, data] of Object.entries(cachedData)) {
        if (data) {
          result.data[dataType] = data
          result.cacheHits++
          console.log(`💾 [VDM] Cache hit for ${dataType}`)

          // Log cache hit for cost tracking (shows money saved)
          const estimatedCostSaved = this.getEstimatedCost(dataType)
          await this.logAPIUsage({
            registration,
            apiProvider: 'CACHE',
            apiPackage: `Cached_${dataType}`,
            costAmount: 0, // No cost for cache hit
            responseStatus: 'success',
            dataRetrieved: true,
            cachedHit: true,
            requestDetails: { dataType, costSaved: estimatedCostSaved },
            responseSummary: { source: 'cache', dataSize: JSON.stringify(data).length }
          })
        }
      }
    }
    
    // Determine what data still needs to be fetched
    const missingDataTypes = dataTypes.filter(type => !result.data[type])
    
    if (missingDataTypes.length > 0) {
      console.log(`🌐 [VDM] Fetching missing data types: ${missingDataTypes.join(', ')}`)
      
      // Fetch missing data from APIs
      for (const dataType of missingDataTypes) {
        const apiResult = await this.fetchDataFromAPI(registration, dataType, request)
        
        if (apiResult.success) {
          result.data[dataType] = apiResult.data
          result.sources.push(apiResult.source)
          result.totalCost += apiResult.cost
          result.apiCalls++
          
          // Cache the new data immediately after successful API call
          await this.cacheData(registration, dataType, apiResult.source, apiResult.data)
          console.log(`💾 [VDM] Cached ${dataType} data for ${registration} (expires in ${CACHE_EXPIRY[dataType] || 24}h)`)

          // Log API usage
          await this.logAPIUsage({
            registration,
            apiProvider: apiResult.source,
            apiPackage: apiResult.package,
            costAmount: apiResult.cost,
            responseStatus: 'success',
            dataRetrieved: true,
            cachedHit: false,
            requestDetails: { dataType },
            responseSummary: { dataSize: JSON.stringify(apiResult.data).length }
          })

          // Verify cache was stored successfully
          const cacheVerification = await this.getCachedData(registration, [dataType])
          if (cacheVerification[dataType]) {
            console.log(`✅ [VDM] Cache verification successful for ${dataType}`)
          } else {
            console.error(`❌ [VDM] Cache verification failed for ${dataType}`)
          }
        } else {
          // Log failed API call
          await this.logAPIUsage({
            registration,
            apiProvider: apiResult.source,
            apiPackage: apiResult.package,
            costAmount: apiResult.cost,
            responseStatus: 'error',
            dataRetrieved: false,
            cachedHit: false,
            requestDetails: { dataType, error: apiResult.error }
          })
        }
      }
    }
    
    // Store/update comprehensive vehicle record
    await this.updateVehicleRecord(registration, result.data, result.sources)

    // If this was an expensive operation (cost > £0.20), warm the cache with all available data
    if (result.totalCost > 0.20 && Object.keys(result.data).length > 1) {
      await this.warmCache(registration, result.data)
    }

    // Calculate completeness score
    result.completenessScore = this.calculateCompletenessScore(result.data)

    console.log(`✅ [VDM] Vehicle data complete. Cost: £${result.totalCost.toFixed(4)}, Cache hits: ${result.cacheHits}, API calls: ${result.apiCalls}`)

    // Log cache status for transparency
    if (result.cacheHits > 0) {
      const estimatedSavings = result.cacheHits * 0.14 // Average API cost
      console.log(`💰 [VDM] Cache saved approximately £${estimatedSavings.toFixed(4)} on this request`)
    }

    return result
  }
  
  // Fetch data from appropriate API based on data type
  private async fetchDataFromAPI(registration: string, dataType: string, request?: VehicleDataRequest) {
    switch (dataType) {
      case 'basic':
        // Use free DVLA OpenData first, fallback to VDG
        try {
          const dvlaData = await this.fetchDVLAData(registration)
          if (dvlaData) {
            return { success: true, data: dvlaData, source: 'DVLA', package: 'OpenData', cost: 0 }
          }
        } catch (error) {
          console.log(`⚠️ [VDM] DVLA failed, trying VDG for basic data`)
        }

        // Fallback to VDG
        const vdgBasic = await this.fetchVDGData(registration, 'VehicleDetails')
        return vdgBasic

      case 'technical':
        // If caller wants comprehensive data, fetch packages incl. TyreDetails
        if (request?.useComprehensiveData) {
          const vdg = await this.fetchComprehensiveVDGData(registration)
          // If engine code missing, try SWS fallback (engine/radio code only)
          if (vdg?.success && !vdg.data?.engineCode) {
            const sws = await this.fetchSWSData(registration, 'TechData')
            if (sws.success) {
              vdg.data.engineCode = sws.data.engineCode || vdg.data.engineCode
              vdg.data.radioCode = sws.data.radioCode || vdg.data.radioCode
              vdg.cost += sws.cost
              vdg.package += '+SWS.Engine'
            }
          }
          return vdg
        }
        // Otherwise use VehicleDetailsWithImage (best value) and fallback to TyreDetails if missing
        return await this.fetchVDGData(registration, 'VehicleDetailsWithImage')

      case 'comprehensive':
        // Use comprehensive VDG data to eliminate N/A values (VehicleDetailsWithImage + TyreDetails + SpecAndOptionsDetails)
        return await this.fetchComprehensiveVDGData(registration)
        
      case 'image':
        // Only VDG provides images
        return await this.fetchVDGData(registration, 'VehicleDetailsWithImage')
        
      case 'mot':
        // Use free MOT API first, fallback to VDG
        try {
          const motData = await this.fetchMOTData(registration)
          if (motData) {
            return { success: true, data: motData, source: 'MOT', package: 'History', cost: 0 }
          }
        } catch (error) {
          console.log(`⚠️ [VDM] MOT API failed, trying VDG`)
        }
        
        return await this.fetchVDGData(registration, 'MotHistoryDetails')
        
      case 'service':
        // Use SWS for service data (oil, A/C, repair times)
        return await this.fetchSWSData(registration, 'TechData')
        
      default:
        return { success: false, error: `Unknown data type: ${dataType}`, source: 'unknown', cost: 0 }
    }
  }
  
  // Check cache for existing data
  private async getCachedData(registration: string, dataTypes: string[]) {
    const client = await pool.connect()
    const cachedData: any = {}
    
    try {
      for (const dataType of dataTypes) {
        const query = `
          SELECT cached_data, cache_timestamp, expiry_timestamp 
          FROM vehicle_data_cache 
          WHERE registration = $1 AND data_type = $2 AND is_valid = true 
          AND (expiry_timestamp IS NULL OR expiry_timestamp > NOW())
          ORDER BY cache_timestamp DESC 
          LIMIT 1
        `
        
        const result = await client.query(query, [registration, dataType])
        
        if (result.rows.length > 0) {
          cachedData[dataType] = result.rows[0].cached_data
          
          // Update access count
          await client.query(
            'UPDATE vehicle_data_cache SET access_count = access_count + 1, last_accessed = NOW() WHERE registration = $1 AND data_type = $2',
            [registration, dataType]
          )
        }
      }
    } finally {
      client.release()
    }
    
    return cachedData
  }
  
  // Get estimated cost for a data type (for cache savings calculation)
  private getEstimatedCost(dataType: string): number {
    switch (dataType) {
      case 'basic': return API_COSTS.DVLA.OpenData // Free
      case 'technical': return API_COSTS.VDG.VehicleDetailsWithImage // £0.14
      case 'image': return API_COSTS.VDG.VehicleDetailsWithImage // £0.14
      case 'mot': return API_COSTS.VDG.MotHistoryDetails // £0.05
      case 'service': return API_COSTS.SWS.TechData // £0.48
      default: return 0.10 // Default estimate
    }
  }

  // Cache new data
  private async cacheData(registration: string, dataType: string, apiSource: string, data: any) {
    const client = await pool.connect()
    
    try {
      const expiryHours = CACHE_EXPIRY[dataType] || 24
      const expiryTimestamp = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
      
      await client.query(`
        INSERT INTO vehicle_data_cache (registration, data_type, api_source, cached_data, expiry_timestamp)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (registration, data_type, api_source) 
        DO UPDATE SET 
          cached_data = $4,
          cache_timestamp = NOW(),
          expiry_timestamp = $5,
          is_valid = true,
          access_count = 0
      `, [registration, dataType, apiSource, JSON.stringify(data), expiryTimestamp])
      
    } finally {
      client.release()
    }
  }

  // Warm cache with comprehensive data after expensive API calls
  private async warmCache(registration: string, comprehensiveData: any) {
    console.log(`🔥 [VDM] Warming cache for ${registration} with comprehensive data`)

    // Cache all data types from comprehensive response
    const dataTypes = ['basic', 'technical', 'image', 'mot', 'service']

    for (const dataType of dataTypes) {
      if (comprehensiveData[dataType]) {
        await this.cacheData(registration, dataType, 'VDG', comprehensiveData[dataType])
        console.log(`🔥 [VDM] Warmed ${dataType} cache for ${registration}`)
      }
    }
  }

  // Verify cache integrity
  async verifyCacheIntegrity(registration: string, dataTypes: string[]): Promise<boolean> {
    const cachedData = await this.getCachedData(registration, dataTypes)
    const cacheHitCount = Object.keys(cachedData).length
    const expectedCount = dataTypes.length

    console.log(`🔍 [VDM] Cache integrity check: ${cacheHitCount}/${expectedCount} data types cached for ${registration}`)

    return cacheHitCount === expectedCount
  }

  // Log API usage for cost tracking
  async logAPIUsage(usage: APIUsageLog) {
    const client = await pool.connect()
    
    try {
      await client.query(`
        INSERT INTO api_usage_log (
          registration, api_provider, api_package, cost_amount, 
          response_status, data_retrieved, cached_hit, request_details, response_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        usage.registration,
        usage.apiProvider,
        usage.apiPackage,
        usage.costAmount,
        usage.responseStatus,
        usage.dataRetrieved,
        usage.cachedHit,
        JSON.stringify(usage.requestDetails),
        JSON.stringify(usage.responseSummary)
      ])
      
      // Update monthly budget tracking
      await this.updateBudgetSpend(usage.apiProvider, usage.costAmount)
      
    } finally {
      client.release()
    }
  }
  
  // Update budget spend tracking
  private async updateBudgetSpend(apiProvider: string, cost: number) {
    const client = await pool.connect()
    
    try {
      const currentMonth = new Date()
      currentMonth.setDate(1) // First day of current month
      
      await client.query(`
        UPDATE api_budgets 
        SET current_month_spend = current_month_spend + $1, updated_at = NOW()
        WHERE api_provider = $2 AND budget_month = $3 AND is_active = true
      `, [cost, apiProvider, currentMonth])
      
    } finally {
      client.release()
    }
  }
  
  // Calculate data completeness score (0-100)
  private calculateCompletenessScore(data: any): number {
    const weights = {
      basic: 30,      // Basic vehicle info
      technical: 25,  // Technical specifications
      image: 15,      // Vehicle image
      mot: 20,        // MOT history
      service: 10     // Service data
    }
    
    let score = 0
    for (const [dataType, weight] of Object.entries(weights)) {
      if (data[dataType]) {
        score += weight
      }
    }
    
    return score
  }
  
  // API implementation methods
  private async fetchDVLAData(registration: string) {
    try {
      // Use existing DVLA OpenData API
      const response = await fetch(`https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.DVLA_API_KEY || ''
        },
        body: JSON.stringify({ registrationNumber: registration })
      })

      if (response.ok) {
        const data = await response.json()
        return {
          make: data.make,
          model: data.model,
          year: data.yearOfManufacture,
          fuelType: data.fuelType,
          engineCapacity: data.engineCapacity,
          colour: data.colour
        }
      }
    } catch (error) {
      console.log(`⚠️ [VDM] DVLA API error:`, error)
    }
    return null
  }

  private async fetchMOTData(registration: string) {
    try {
      // Use existing MOT History API
      const response = await fetch(`https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${registration}`, {
        headers: {
          'X-API-Key': process.env.MOT_API_KEY || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.log(`⚠️ [VDM] MOT API error:`, error)
    }
    return null
  }

  private async fetchVDGData(registration: string, packageName: string) {
    try {
      // Use existing VDG service
      const { getVDGVehicleDataWithPackages } = await import('./vehicle-data-global')

      // If we need tyre details but the chosen package might not include them, call TyreDetails as a second call
      const packagesToCall = [packageName]
      if (packageName === 'VehicleDetailsWithImage') {
        packagesToCall.push('TyreDetails')
      }

      let mergedResult: any = null
      let totalCost = 0

      for (const pkg of packagesToCall) {
        const result = await getVDGVehicleDataWithPackages(registration, [pkg])
        const cost = API_COSTS.VDG[pkg] || 0
        totalCost += cost

        if (result) {
          // Log per-package usage for cost tracking
          await this.logAPIUsage({
            registration,
            apiProvider: 'VDG',
            apiPackage: pkg,
            costAmount: cost,
            responseStatus: 'success',
            dataRetrieved: true,
            cachedHit: false,
            requestDetails: { dataType: 'technical' },
            responseSummary: { keys: Object.keys(result || {}).slice(0, 10) }
          })

          // Transform each package
          const transformedData = this.transformVDGTechnicalData(result, pkg)

          // Merge TyreDetails specifications into the main structure if needed
          if (!mergedResult) {
            mergedResult = transformedData
          } else {
            // Append specifications if present
            const specs = transformedData?.specifications || []
            if (Array.isArray(specs) && specs.length) {
              mergedResult.specifications = [
                ...(mergedResult.specifications || []),
                ...specs
              ]
            }
            // Prefer to fill missing fields from TyreDetails
            mergedResult.tyreSizeFront = mergedResult.tyreSizeFront || transformedData.tyreSizeFront
            mergedResult.tyreSizeRear = mergedResult.tyreSizeRear || transformedData.tyreSizeRear
            mergedResult.tyrePressureFront = mergedResult.tyrePressureFront || transformedData.tyrePressureFront
            mergedResult.tyrePressureRear = mergedResult.tyrePressureRear || transformedData.tyrePressureRear
          }
        } else {
          await this.logAPIUsage({
            registration,
            apiProvider: 'VDG',
            apiPackage: pkg,
            costAmount: 0,
            responseStatus: 'no_data',
            dataRetrieved: false,
            cachedHit: false,
            requestDetails: { dataType: 'technical' }
          })
        }
      }

      if (mergedResult) {
        return {
          success: true,
          data: mergedResult,
          source: 'VDG',
          package: packagesToCall.join('+'),
          cost: totalCost
        }
      } else {
        return {
          success: false,
          data: null,
          source: 'VDG',
          package: packagesToCall.join('+'),
          cost: 0,
          error: 'No data returned from VDG'
        }
      }
    } catch (error) {
      console.log(`⚠️ [VDM] VDG API error:`, error)
      return {
        success: false,
        data: null,
        source: 'VDG',
        package: packageName,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Transform VDG technical data to extract specific fields for job sheets
  private transformVDGTechnicalData(vdgData: any, packageName: string) {
    // Start with the original data
    const transformedData = { ...vdgData }

    // Extract technical specifications if available
    if (vdgData.specifications && Array.isArray(vdgData.specifications)) {
      let tyreSizeFront = null, tyreSizeRear = null, tyrePressureFront = null, tyrePressureRear = null
      let timingBeltInterval = null, engineCode = null

      for (const spec of vdgData.specifications) {
        const name = spec.name?.toLowerCase() || ''
        const value = spec.value || spec.description || ''

        // Engine code
        if (name.includes('engine') && name.includes('code') && value) {
          engineCode = value
        }

        // Tyre specifications
        if (name.includes('tyre') || name.includes('tire')) {
          if (name.includes('front') && value) {
            if (name.includes('size')) tyreSizeFront = value
            if (name.includes('pressure')) tyrePressureFront = value
          } else if (name.includes('rear') && value) {
            if (name.includes('size')) tyreSizeRear = value
            if (name.includes('pressure')) tyrePressureRear = value
          } else if (!tyreSizeFront && name.includes('size')) {
            tyreSizeFront = value // Use as default if no front/rear specified
          }
        }

        // Service intervals
        if ((name.includes('timing') && name.includes('belt')) ||
            (name.includes('service') && name.includes('interval')) ||
            (name.includes('maintenance') && name.includes('interval'))) {
          timingBeltInterval = value
        }
      }

      // Add extracted fields to the transformed data
      if (tyreSizeFront) transformedData.tyreSizeFront = tyreSizeFront
      if (tyreSizeRear) transformedData.tyreSizeRear = tyreSizeRear
      if (tyrePressureFront) transformedData.tyrePressureFront = tyrePressureFront
      if (tyrePressureRear) transformedData.tyrePressureRear = tyrePressureRear
      if (timingBeltInterval) transformedData.timingBeltInterval = timingBeltInterval
      if (engineCode) transformedData.engineCode = engineCode

      // Also add a general tyreSize field for compatibility
      if (tyreSizeFront) transformedData.tyreSize = tyreSizeFront
    }

    console.log(`🔧 [VDM] Transformed VDG data with extracted fields:`, {
      tyreSizeFront: transformedData.tyreSizeFront,
      tyrePressureFront: transformedData.tyrePressureFront,
      timingBeltInterval: transformedData.timingBeltInterval,
      engineCode: transformedData.engineCode
    })

    return transformedData
  }

  // Fetch comprehensive VDG data (multiple packages) with cost tracking
  private async fetchComprehensiveVDGData(registration: string) {
    try {
      const { getComprehensiveVDGData } = await import('./vehicle-data-global-v2')

      console.log(`🔍 [VDM] Fetching comprehensive VDG data for ${registration}`)
      const data = await getComprehensiveVDGData(registration)

      if (data) {
        const cost = API_COSTS.VDG.ComprehensiveDetails || 0.40

        return {
          success: true,
          data,
          source: 'VDG',
          package: 'ComprehensiveDetails',
          cost
        }
      } else {
        return {
          success: false,
          data: null,
          source: 'VDG',
          package: 'ComprehensiveDetails',
          cost: 0,
          error: 'No comprehensive data returned'
        }
      }
    } catch (error) {
      console.error(`❌ [VDM] VDG comprehensive data error:`, error)
      return {
        success: false,
        data: null,
        source: 'VDG',
        package: 'ComprehensiveDetails',
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async fetchSWSData(registration: string, packageName: string) {
    try {
      const cost = API_COSTS.SWS[packageName] || 0
      const cleanReg = registration.replace(/\s+/g, '').toUpperCase()

      // Use the existing SWS route for consistency
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/sws-vehicle-data?vrm=${encodeURIComponent(cleanReg)}`)

      if (!response.ok) {
        throw new Error(`SWS API call failed: ${response.status}`)
      }

      const swsResult = await response.json()

      if (!swsResult.success) {
        throw new Error(swsResult.error || 'SWS API failed')
      }

      // Extract engine and radio codes from SWS response
      let engineCode: string | null = null
      let radioCode: string | null = null

      const extractCodes = (obj: any, path = '') => {
        if (!obj || typeof obj !== 'object') return

        for (const [key, value] of Object.entries(obj)) {
          const keyLower = key.toLowerCase()

          if (typeof value === 'string' && value.trim()) {
            // Engine code patterns
            if (keyLower.includes('engine') && keyLower.includes('code') && /^[A-Z0-9-]{3,12}$/i.test(value)) {
              engineCode = value.toUpperCase()
            }
            // Radio code patterns
            if ((keyLower.includes('radio') || keyLower.includes('security')) && keyLower.includes('code') && /^[A-Z0-9-]{4,12}$/i.test(value)) {
              radioCode = value.toUpperCase()
            }
          } else if (typeof value === 'object' && value !== null) {
            extractCodes(value, path + '.' + key)
          }
        }
      }

      // Extract from the SWS response data
      if (swsResult.data) {
        extractCodes(swsResult.data)
      }

      // Log API usage for cost tracking
      await this.logAPIUsage({
        registration: cleanReg,
        apiProvider: 'SWS',
        apiPackage: packageName,
        costAmount: cost,
        responseStatus: engineCode || radioCode ? 'success' : 'no_data',
        dataRetrieved: !!(engineCode || radioCode),
        cachedHit: false,
        requestDetails: { route: '/api/sws-vehicle-data' },
        responseSummary: { engineCode: !!engineCode, radioCode: !!radioCode }
      })

      console.log(`✅ [SWS-FETCH] Extracted codes for ${cleanReg}:`, { engineCode, radioCode })

      return {
        success: true,
        data: { engineCode, radioCode },
        source: 'SWS',
        package: packageName,
        cost
      }
    } catch (error) {
      console.log(`⚠️ [VDM] SWS API error:`, error)
      return {
        success: false,
        data: null,
        source: 'SWS',
        package: packageName,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // Update comprehensive vehicle record in database
  private async updateVehicleRecord(registration: string, data: any, sources: string[]) {
    const client = await pool.connect()

    try {
      console.log(`💾 [VDM] Updating vehicle record for ${registration}`, { data, sources })

      // Extract and normalize data from different sources
      const basicData = data.basic || {}
      const technicalData = data.technical || {}
      const imageData = data.image || data.technical || {}
      const motData = data.mot || {}
      const serviceData = data.service || {}

      // Extract technical specifications from VDG data
      let engineCC = null, powerBHP = null, torqueNM = null, fuelEconomyMPG = null, co2 = null, euroStatus = null
      let engineCode = null, tyreSizeFront = null, tyreSizeRear = null, tyrePressureFront = null, tyrePressureRear = null, timingBeltInterval = null

      if (technicalData.specifications && Array.isArray(technicalData.specifications)) {
        for (const spec of technicalData.specifications) {
          const name = spec.name?.toLowerCase() || ''
          const value = spec.value || ''

          // Engine specifications
          if (name.includes('engine') && value) {
            const ccMatch = value.match(/(\d+)\s*cc/i)
            if (ccMatch) engineCC = parseInt(ccMatch[1])

            // Extract engine code
            const engineCodeMatch = value.match(/([A-Z0-9]{3,8})/i)
            if (engineCodeMatch && !engineCode) engineCode = engineCodeMatch[1]
          }

          // Power and performance
          if (name.includes('power') && value) {
            const bhpMatch = value.match(/(\d+)\s*bhp/i)
            if (bhpMatch) powerBHP = parseInt(bhpMatch[1])
          }
          if (name.includes('torque') && value) {
            const nmMatch = value.match(/(\d+)\s*nm/i)
            if (nmMatch) torqueNM = parseInt(nmMatch[1])
          }
          if (name.includes('fuel') && name.includes('economy') && value) {
            const mpgMatch = value.match(/(\d+\.?\d*)\s*mpg/i)
            if (mpgMatch) fuelEconomyMPG = parseFloat(mpgMatch[1])
          }

          // Emissions
          if (name.includes('co2') && value) {
            const co2Match = value.match(/(\d+)/i)
            if (co2Match) co2 = parseInt(co2Match[1])
          }
          if (name.includes('euro') && value) {
            euroStatus = value.replace(/euro\s*/i, 'Euro ')
          }

          // Tyre specifications
          if (name.includes('tyre') || name.includes('tire')) {
            if (name.includes('front') && value) {
              if (name.includes('size')) tyreSizeFront = value
              if (name.includes('pressure')) tyrePressureFront = value
            } else if (name.includes('rear') && value) {
              if (name.includes('size')) tyreSizeRear = value
              if (name.includes('pressure')) tyrePressureRear = value
            } else if (!tyreSizeFront && name.includes('size')) {
              tyreSizeFront = value // Use as default if no front/rear specified
            }
          }

          // Service intervals
          if ((name.includes('timing') && name.includes('belt')) ||
              (name.includes('service') && name.includes('interval')) ||
              (name.includes('maintenance') && name.includes('interval'))) {
            timingBeltInterval = value
          }
        }
      }

      // Use basic data as fallback for core fields
      const finalMake = basicData.make || technicalData.make || null
      const finalModel = basicData.model || technicalData.model || null
      const finalYear = basicData.year || technicalData.year || null
      const finalFuelType = basicData.fuelType || technicalData.fuelType || null
      const finalDerivative = technicalData.derivative || basicData.derivative || null
      const finalEngineCC = engineCC || basicData.engineCapacity || null

      await client.query(`
        INSERT INTO vehicles (
          registration, make, model, year, fuel_type, derivative, color,
          engine_capacity_cc, power_bhp, torque_nm, fuel_economy_combined_mpg,
          co2_emissions, euro_status, image_url, image_expiry_date,
          engine_code,
          technical_specs, service_data, factory_options, data_sources,
          last_data_update, data_completeness_score
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, NOW(), $21
        )
        ON CONFLICT (registration) DO UPDATE SET
          make = COALESCE($2, vehicles.make),
          model = COALESCE($3, vehicles.model),
          year = COALESCE($4, vehicles.year),
          fuel_type = COALESCE($5, vehicles.fuel_type),
          derivative = COALESCE($6, vehicles.derivative),
          color = COALESCE($7, vehicles.color),
          engine_capacity_cc = COALESCE($8, vehicles.engine_capacity_cc),
          power_bhp = COALESCE($9, vehicles.power_bhp),
          torque_nm = COALESCE($10, vehicles.torque_nm),
          fuel_economy_combined_mpg = COALESCE($11, vehicles.fuel_economy_combined_mpg),
          co2_emissions = COALESCE($12, vehicles.co2_emissions),
          euro_status = COALESCE($13, vehicles.euro_status),
          image_url = COALESCE($14, vehicles.image_url),
          image_expiry_date = COALESCE($15, vehicles.image_expiry_date),
          engine_code = COALESCE($16, vehicles.engine_code),
          technical_specs = COALESCE($17, vehicles.technical_specs),
          service_data = COALESCE($18, vehicles.service_data),
          factory_options = COALESCE($19, vehicles.factory_options),
          data_sources = $20,
          last_data_update = NOW(),
          data_completeness_score = $21
      `, [
        registration,
        finalMake,
        finalModel,
        finalYear,
        finalFuelType,
        finalDerivative,
        basicData.colour || technicalData.colour || null,
        finalEngineCC,
        powerBHP,
        torqueNM,
        fuelEconomyMPG,
        co2,
        euroStatus,
        imageData.imageUrl || null,
        imageData.expiryDate || null,
        technicalData.engineCode || data?.technical?.engineCode || null,
        JSON.stringify(data.technical || {}),
        JSON.stringify(data.service || {}),
        JSON.stringify(data.factory_options || {}),
        JSON.stringify(sources),
        this.calculateCompletenessScore(data)
      ])

      console.log(`✅ [VDM] Vehicle record updated for ${registration}`)

    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const vehicleDataManager = new VehicleDataManager()
