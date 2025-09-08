import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';

// Load environment variables
const {
  DVSA_TENANT_ID,
  DVSA_CLIENT_ID,
  DVSA_CLIENT_SECRET,
  DVSA_API_KEY,
  DVSA_API_BASE_URL = 'https://history.mot.api.gov.uk/v1/trade/vehicles',
  DVSA_SCOPE = 'https://tapi.dvsa.gov.uk/.default',
} = process.env;

// Construct token URL using tenant ID
const DVSA_TOKEN_URL = `https://login.microsoftonline.com/${DVSA_TENANT_ID}/oauth2/v2.0/token`;

// Rate limiting configuration
const RATE_LIMIT = {
  // Maximum requests per second
  RPS: 15,
  // Maximum burst requests
  BURST: 10,
  // Maximum requests per day
  QUOTA: 500000,
  // Base delay for exponential backoff in milliseconds
  BASE_DELAY: 1000,
  // Maximum number of retry attempts
  MAX_RETRIES: 3,
};

// Track rate limiting state
interface RateLimitState {
  // Last request timestamp
  lastRequestTime: number;
  // Number of requests in the current window
  requestCount: number;
  // When the current window ends
  windowResetTime: number;
  // Daily quota remaining (if available from headers)
  quotaRemaining: number | null;
  // When the daily quota resets (if available from headers)
  quotaResetTime: number | null;
}

// Initialize rate limiting state
const rateLimitState: RateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowResetTime: Date.now() + 1000, // 1 second window
  quotaRemaining: null,
  quotaResetTime: null,
};

// Track daily quota usage
let dailyQuotaUsed = 0;

class DVSAApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public responseData?: any
  ) {
    super(message);
    this.name = 'DVSAApiError';
    Object.setPrototypeOf(this, DVSAApiError.prototype);
  }
}

interface MOTTestResult {
  completedDate: string;
  testResult: 'PASSED' | 'FAILED' | 'PRESENT';
  expiryDate: string | null;
  odometerValue: string | null;
  odometerUnit: string | null;
  odometerResultType: string | null;
  motTestNumber: string;
  dataSource: string;
  defects: Array<{
    text: string;
    type: 'ADVISORY' | 'FAIL' | 'MAJOR' | 'MINOR' | 'PRS' | 'USER ENTERED';
    dangerous: boolean;
  }>;
  rfrAndComments?: Array<{
    text: string;
    type: 'ADVISORY' | 'FAIL' | 'MAJOR' | 'MINOR' | 'PRS' | 'USER ENTERED';
    dangerous: boolean;
  }>;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  ext_expires_in: number;
}

interface ApiErrorResponse {
  error?: string;
  error_description?: string;
  error_codes?: number[];
  timestamp?: string;
  trace_id?: string;
  correlation_id?: string;
  error_uri?: string;
}

export interface VehicleMOTHistory {
  registration: string;
  make: string;
  model: string;
  firstUsedDate?: string;
  fuelType?: string;
  primaryColour?: string;
  motTests: MOTTestResult[];
  manufactureDate?: string;
  engineSize?: string;
  hasOutstandingRecall?: string;
  registrationDate?: string;
}

export class DVSAClient {
  private static instance: DVSAClient;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private clientId: string;
  private clientSecret: string;
  private apiKey: string;
  private httpClient: AxiosInstance;

  private constructor() {
    // Get credentials from environment variables
    this.clientId = DVSA_CLIENT_ID || '';
    this.clientSecret = DVSA_CLIENT_SECRET || '';
    this.apiKey = DVSA_API_KEY || '';
    
    // Validate required environment variables
    const missingVars = [];
    if (!this.clientId) missingVars.push('DVSA_CLIENT_ID');
    if (!this.clientSecret) missingVars.push('DVSA_CLIENT_SECRET');
    if (!this.apiKey) missingVars.push('DVSA_API_KEY');
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    if (!DVSA_TENANT_ID) {
      throw new Error('Missing required environment variable: DVSA_TENANT_ID');
    }

    this.httpClient = axios.create({
      baseURL: DVSA_API_BASE_URL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
    });

    // Add request interceptor to handle authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Skip token check for token requests
        if (config.url?.includes('oauth2/token')) {
          return config;
        }

        // Get or refresh token if needed
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
          await this.authenticate();
        }

        // Add Authorization header if we have a token
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): DVSAClient {
    if (!DVSAClient.instance) {
      DVSAClient.instance = new DVSAClient();
    }
    return DVSAClient.instance;
  }

  private async authenticate(): Promise<void> {
    try {
      // Check rate limits before making the authentication request
      await this.checkRateLimits();

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('scope', DVSA_SCOPE);

      const response = await axios.post<TokenResponse>(
        DVSA_TOKEN_URL,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token received in response');
      }

      this.accessToken = response.data.access_token;
      // Set token expiry to 5 minutes before actual expiry to be safe
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('[DVSA] Successfully authenticated');
      
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const errorData = axiosError.response?.data;
      const errorMessage = errorData?.error_description || 
                         errorData?.error || 
                         (error as Error).message || 
                         'Unknown error';
      
      console.error('[DVSA] Authentication failed:', errorMessage);
      
      throw new DVSAApiError(
        `Failed to authenticate with DVSA API: ${errorMessage}`,
        axiosError.response?.status,
        'AUTH_ERROR',
        errorData
      );
    }
  }

  public async getMOTHistory(registration: string, attempt = 1): Promise<VehicleMOTHistory> {
    try {
      // Clean the registration number (remove spaces and convert to uppercase)
      const cleanRegistration = registration.replace(/\s+/g, '').toUpperCase();
      
      // Check rate limits before making the request
      await this.checkRateLimits();
      
      // Make sure we have a valid access token
      if (!this.accessToken || Date.now() >= this.tokenExpiry) {
        await this.authenticate();
      }
      
      // Update rate limiting state
      const now = Date.now();
      rateLimitState.lastRequestTime = now;
      rateLimitState.requestCount++;
      
      // Make the API request
      const response = await this.httpClient.get<VehicleMOTHistory>(
        `registration/${cleanRegistration}`,
        {
          headers: {
            'x-api-key': this.apiKey,
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );
      
      // Update rate limit information from response headers if available
      this.updateRateLimitFromHeaders(response.headers);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        
        // Handle rate limiting (429) with exponential backoff
        if (status === 429) {
          if (attempt <= RATE_LIMIT.MAX_RETRIES) {
            const delay = this.calculateBackoffDelay(attempt);
            console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${RATE_LIMIT.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.getMOTHistory(registration, attempt + 1);
          }
          throw new DVSAApiError('Rate limit exceeded after retries', status, 'RATE_LIMIT_EXCEEDED', data);
        }
        
        // Handle authentication errors
        if (status === 401 || status === 403) {
          // Token might be expired, try to refresh and retry once
          if (status === 401 && attempt === 1) {
            await this.authenticate();
            return this.getMOTHistory(registration, attempt + 1);
          }
          throw new DVSAApiError('Authentication failed', status, 'AUTH_ERROR', data);
        }
        
        // Handle other error statuses
        if (!status) {
          throw new DVSAApiError('Unknown error occurred', 500, 'UNKNOWN_ERROR', data);
        } else if (status === 404) {
          throw new DVSAApiError('Vehicle not found', status, 'NOT_FOUND', data);
        } else if (status === 400) {
          throw new DVSAApiError('Invalid registration number', status, 'INVALID_INPUT', data);
        } else if (status >= 500) {
          // Retry on server errors
          if (attempt <= RATE_LIMIT.MAX_RETRIES) {
            const delay = this.calculateBackoffDelay(attempt);
            console.warn(`Server error. Retrying in ${delay}ms (attempt ${attempt}/${RATE_LIMIT.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.getMOTHistory(registration, attempt + 1);
          }
          throw new DVSAApiError('Server error', status, 'SERVER_ERROR', data);
        }
      }
      
      // For non-Axios errors or unhandled status codes
      throw new DVSAApiError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        'UNKNOWN_ERROR',
        error
      );
    }
  }
  
  /**
   * Check if we're approaching rate limits and delay if necessary
   */
  private async checkRateLimits(): Promise<void> {
    const now = Date.now();
    
    // Reset the window if it has passed
    if (now > rateLimitState.windowResetTime) {
      rateLimitState.requestCount = 0;
      rateLimitState.windowResetTime = now + 1000; // 1 second window
    }
    
    // Check if we've exceeded the burst limit
    if (rateLimitState.requestCount >= RATE_LIMIT.BURST) {
      const delay = rateLimitState.windowResetTime - now;
      if (delay > 0) {
        console.log(`Rate limit: Delaying request by ${delay}ms (burst limit reached)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      rateLimitState.requestCount = 0;
      rateLimitState.windowResetTime = Date.now() + 1000;
    }
    
    // Ensure we don't exceed requests per second
    const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
    const minRequestInterval = 1000 / RATE_LIMIT.RPS;
    
    if (timeSinceLastRequest < minRequestInterval) {
      const delay = minRequestInterval - timeSinceLastRequest;
      console.log(`Rate limit: Delaying request by ${Math.ceil(delay)}ms (RPS limit)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Check daily quota (if we have the information)
    if (rateLimitState.quotaRemaining !== null && rateLimitState.quotaRemaining <= 0) {
      const resetTime = rateLimitState.quotaResetTime || (now + 24 * 60 * 60 * 1000);
      const timeUntilReset = resetTime - now;
      
      if (timeUntilReset > 0) {
        console.warn(`Daily quota exhausted. Next reset in ${Math.ceil(timeUntilReset / 1000 / 60)} minutes`);
        // In a real app, you might want to queue these requests or notify an admin
        throw new DVSAApiError('Daily quota exhausted', 429, 'QUOTA_EXCEEDED');
      }
    }
  }
  
  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitFromHeaders(headers: any): void {
    // These header names might need to be adjusted based on the actual API response
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    
    if (remaining !== undefined) {
      rateLimitState.quotaRemaining = parseInt(remaining, 10);
    }
    
    if (reset !== undefined) {
      rateLimitState.quotaResetTime = new Date(reset).getTime();
    }
    
    // Log quota status if we have the information
    if (rateLimitState.quotaRemaining !== null) {
      console.log(`API Quota: ${rateLimitState.quotaRemaining} requests remaining`);
    }
  }
  
  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1) ± 10% jitter
    const baseDelay = RATE_LIMIT.BASE_DELAY * Math.pow(2, attempt - 1);
    const jitter = baseDelay * 0.2 * Math.random(); // ±10% jitter
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
  }
}

export async function getMOTHistory(registration: string): Promise<VehicleMOTHistory> {
  try {
    const client = DVSAClient.getInstance();
    return await client.getMOTHistory(registration);
  } catch (error: unknown) {
    console.error('Error in getMOTHistory:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('No MOT history found for this vehicle.');
        }
        if (error.response.status === 400) {
          throw new Error('Invalid registration number format.');
        }
        if (error.response.status === 429) {
          throw new Error('Too many requests to DVSA API. Please try again later.');
        }
        if (error.response.status === 401) {
          throw new Error('Authentication failed. Please check your DVSA API credentials.');
        }
        const errorMessage = (error.response.data as { message?: string })?.message || 'Unknown error';
        throw new Error(`DVSA API error: ${errorMessage}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response from DVSA API. Please check your internet connection.');
      }
    }
    
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch MOT history. Please try again later.');
  }
}
