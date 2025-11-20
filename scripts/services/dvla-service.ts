import axios, { AxiosInstance, AxiosError } from 'axios';
import { dvlaConfig } from '../config/dvla';

export interface VehicleInfo {
  registrationNumber: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  fuelType?: string;
  taxStatus?: string;
  motStatus?: string;
  colour?: string;
  typeApproval?: string;
  dateOfLastV5CIssued?: string;
  taxDueDate?: string;
  motExpiryDate?: string;
  firstRegistrationDate?: string;
  engineNumber?: string;
  co2Emissions?: number;
  markedForExport?: boolean;
  wheelplan?: string;
  monthOfFirstRegistration?: string;
  taxDetails?: {
    taxStatus: string;
    taxDueDate?: string;
    artEndDate?: string;
    motStatus?: string;
  };
  motDetails?: {
    completedDate: string;
    testResult: string;
    expiryDate?: string;
    odometerValue?: number;
    odometerUnit?: string;
    motTestNumber?: string;
    rfrAndComments?: Array<{
      text: string;
      type: string;
      dangerous: boolean;
    }>;
  }[];
}

class DVLAService {
  private client: AxiosInstance;
  private apiKey: string;
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.apiKey = dvlaConfig.apiKey;
    
    if (!this.apiKey) {
      throw new Error('DVLA API key is not configured');
    }
    
    this.client = axios.create({
      baseURL: dvlaConfig.baseUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json+v6'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minDelay = 1000 / (dvlaConfig.rateLimit.requestsPerMinute / 60);
      
      if (timeSinceLastRequest < minDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, minDelay - timeSinceLastRequest)
        );
      }
      
      this.lastRequestTime = Date.now();
      return config;
    });
  }

  /**
   * Get basic vehicle information
   */
  public async getVehicleInfo(registrationNumber: string): Promise<VehicleInfo | null> {
    try {
      const cleanReg = this.cleanRegistration(registrationNumber);
      
      const response = await this.client.post<VehicleInfo>(
        dvlaConfig.endpoints.vehicleInfo,
        { registrationNumber: cleanReg }
      );

      return response.data;
    } catch (error: unknown) {
      return this.handleError('getVehicleInfo', registrationNumber, error);
    }
  }
  
  /**
   * Get MOT history for a vehicle
   */
  public async getMOTHistory(registrationNumber: string): Promise<VehicleInfo['motDetails'] | null> {
    try {
      const cleanReg = this.cleanRegistration(registrationNumber);
      
      const response = await this.client.get(
        `${dvlaConfig.endpoints.motHistory}/${cleanReg}/mot-history`,
        { headers: { 'x-api-key': this.apiKey } }
      );
      
      return response.data?.motTests || null;
    } catch (error: unknown) {
      this.handleError('getMOTHistory', registrationNumber, error);
      return null;
    }
  }
  
  /**
   * Get tax status for a vehicle
   */
  public async getTaxStatus(registrationNumber: string): Promise<VehicleInfo['taxDetails'] | null> {
    try {
      const cleanReg = this.cleanRegistration(registrationNumber);
      
      const response = await this.client.get(
        `${dvlaConfig.endpoints.taxStatus}/${cleanReg}/tax-status`,
        { headers: { 'x-api-key': this.apiKey } }
      );
      
      return response.data || null;
    } catch (error: unknown) {
      this.handleError('getTaxStatus', registrationNumber, error);
      return null;
    }
  }
  
  /**
   * Get complete vehicle information including MOT and tax status
   */
  public async getCompleteVehicleInfo(registrationNumber: string): Promise<VehicleInfo | null> {
    try {
      const [basicInfo, motHistory, taxStatus] = await Promise.all([
        this.getVehicleInfo(registrationNumber),
        this.getMOTHistory(registrationNumber),
        this.getTaxStatus(registrationNumber)
      ]);
      
      if (!basicInfo) return null;
      
      return {
        ...basicInfo,
        motDetails: motHistory || [],
        taxDetails: taxStatus || undefined,
        // Set common fields from the most recent MOT if available
        ...(motHistory?.[0] ? {
          motExpiryDate: motHistory[0].expiryDate,
          motStatus: motHistory[0].testResult === 'PASSED' ? 'Valid' : 'Expired'
        } : {})
      };
    } catch (error: unknown) {
      this.handleError('getCompleteVehicleInfo', registrationNumber, error);
      return null;
    }
  }
  
  /**
   * Clean and validate registration number
   */
  private cleanRegistration(registrationNumber: string): string {
    if (!registrationNumber || typeof registrationNumber !== 'string') {
      throw new Error('Registration number must be a non-empty string');
    }
    
    // Remove all whitespace and convert to uppercase
    const cleanReg = registrationNumber.replace(/\s+/g, '').toUpperCase();
    
    // Basic validation for UK registration format
    if (!/^[A-Z0-9]{1,3}[0-9]{1,4}[A-Z]{1,3}$/i.test(cleanReg)) {
      throw new Error('Invalid UK registration number format');
    }
    
    return cleanReg;
  }
  
  /**
   * Handle API errors consistently
   */
  private handleError(method: string, registrationNumber: string, error: unknown): null {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      if (status === 404) {
        console.log(`[${method}] Vehicle with registration ${registrationNumber} not found in DVLA database`);
      } else if (status === 429) {
        console.error(`[${method}] Rate limit exceeded for registration ${registrationNumber}`);
        // Implement retry logic here if needed
      } else if (status === 400) {
        console.error(`[${method}] Bad request for registration ${registrationNumber}: ${message}`);
      } else if (status === 401 || status === 403) {
        console.error(`[${method}] Authentication failed: ${message}`);
        throw new Error('DVLA API authentication failed. Please check your API key.');
      } else {
        console.error(`[${method}] Error for registration ${registrationNumber}:`, message);
      }
    } else if (error instanceof Error) {
      console.error(`[${method}] Error for registration ${registrationNumber}:`, error.message);
    } else {
      console.error(`[${method}] Unknown error for registration ${registrationNumber}:`, error);
    }
    
    return null;
  }

  public async updateVehicleInDatabase(
    vehicleId: string,
    updates: Partial<VehicleInfo>
  ): Promise<boolean> {
    // This will be implemented in the update script
    return true;
  }
}

export const dvlaService = new DVLAService();
