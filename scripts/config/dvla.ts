// DVLA API Configuration
export interface DVLAApiConfig {
  apiKey: string;
  baseUrl: string;
  endpoints: {
    vehicleInfo: string;
    motHistory: string;
    taxStatus: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenRequestsMs: number;
  };
}

// Get configuration from environment variables
const getConfig = (): DVLAApiConfig => {
  const apiKey = process.env.DVLA_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('DVLA_API_KEY environment variable is not set');
  }

  return {
    apiKey,
    baseUrl: 'https://driver-vehicle-licensing.api.gov.uk',
    endpoints: {
      vehicleInfo: '/vehicle-enquiry/v1/vehicles',
      motHistory: '/api/vehicles/mot-history/v1/vehicles',
      taxStatus: '/vehicle-operator-licencing/v1/vehicles/tax-status'
    },
    rateLimit: {
      requestsPerMinute: 600, // DVLA's standard rate limit
      delayBetweenRequestsMs: 200 // Add a small delay between requests to stay under rate limits
    }
  };
};

export const dvlaConfig = getConfig();
