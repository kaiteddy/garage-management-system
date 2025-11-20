import axios, { AxiosError } from 'axios';

// DVLA API Configuration
const DVLA_CONFIG = {
  apiKey: process.env.DVLA_API_KEY || '',
  baseUrl: 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1'
};

export interface VehicleDetails {
  registrationNumber: string;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  make: string;
  model?: string; // Added missing model property
  yearOfManufacture?: number;
  engineCapacity?: number;
  co2Emissions?: number;
  fuelType: string;
  markedForExport?: boolean;
  colour?: string;
  typeApproval?: string;
  dateOfLastV5CIssued?: string;
  motExpiryDate?: string;
  wheelplan?: string;
  monthOfFirstRegistration?: string;
  revenueWeight?: number;
  euroStatus?: string;
  realDrivingEmissions?: string;
  dateOfFirstRegistration?: string;
  taxDetails?: {
    taxBand?: string;
    taxRate?: string;
    tax12MonthRate?: string;
    tax6MonthRate?: string;
  };
  motDetails?: {
    motTestExpiryDate?: string;
    motTestNumber?: string;
    motTestStatus?: string;
  };
}

export async function getVehicleDetails(registration: string): Promise<VehicleDetails> {
  if (!DVLA_CONFIG.apiKey) {
    throw new Error('DVLA_API_KEY is not set in environment variables');
  }

  const cleanRegistration = registration.trim().toUpperCase();
  console.log(`Fetching DVLA details for registration: ${cleanRegistration}`);

  try {
    const response = await axios.post<VehicleDetails>(
      `${DVLA_CONFIG.baseUrl}/vehicles`,
      { registrationNumber: cleanRegistration },
      {
        headers: {
          'x-api-key': DVLA_CONFIG.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: () => true // Don't throw on HTTP error status
      }
    );

    console.log('DVLA API Response Status:', response.status);
    
    if (response.status === 401 || response.status === 403) {
      console.error('DVLA API Authentication Error:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
      throw new Error('DVLA API access forbidden - please check API key');
    }

    if (response.status === 404) {
      throw new Error(`Vehicle registration ${cleanRegistration} not found in DVLA database`);
    }

    if (response.status === 400) {
      throw new Error('Invalid request format for DVLA API');
    }

    if (response.status === 429) {
      throw new Error('Rate limit exceeded - please try again later');
    }

    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status} - ${response.statusText}`);
    }

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      // Log detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
      };
      
      console.error('DVLA API Request Error:', errorDetails);
      
      // Handle specific error statuses
      if (error.response) {
        if (error.response.status === 403) {
          throw new Error('Access to DVLA API is forbidden. Please check your API key and permissions.');
        }
        
        if (error.response.status === 404) {
          throw new Error('Vehicle not found. Please check the registration number.');
        }
        
        if (error.response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        
        // Handle other error responses
        const errorMessage = (error.response.data as { message?: string })?.message || 'Unknown error';
        throw new Error(`DVLA API error: ${errorMessage}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response from DVLA API. Please check your internet connection.');
      }
    }
    
    // Handle non-Axios errors
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback for any other error type
    throw new Error('Failed to fetch vehicle details. Please try again later.');
  }
}
