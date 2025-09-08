import { NextResponse } from 'next/server';
import { DVSAClient, type VehicleMOTHistory } from '@/lib/dvsa';
import { getVehicleDetails, type VehicleDetails } from '@/lib/dvla';

// Initialize the DVSA client
const dvsaClient = DVSAClient.getInstance();

// Extend the VehicleDetails type to include additional fields
interface ExtendedVehicleDetails extends VehicleDetails {
  motStatus?: string;
  motExpiryDate?: string;
  taxStatus?: string;
  taxDueDate?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  co2Emissions?: number;
  firstUsedDate?: string;
  typeApproval?: string;
  wheelplan?: string;
  markedForExport?: boolean;
  monthOfFirstRegistration?: string;
  dateOfLastV5CIssued?: string;
  primaryColour?: string;
}

// Define a type for the API response
export interface MOTCheckResponse {
  registration: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  fuelType?: string;
  colour?: string;
  motStatus?: string;
  motExpiryDate?: string | null;
  taxStatus?: string;
  taxDueDate?: string | null;
  vehicleDetails?: ExtendedVehicleDetails;
  motTests?: Array<{
    completedDate: string;
    expiryDate: string | null;
    odometerValue: number | null;
    odometerUnit: string;
    testResult: string;
    testNumber: string;
    defects: Array<{
      text: string;
      type: 'DANGEROUS' | 'MAJOR' | 'MINOR' | 'ADVISORY' | 'FAIL' | 'PASS' | 'USER ENTERED';
      dangerous?: boolean;
    }>;
  }>;
  lastTest?: {
    completedDate: string;
    expiryDate: string | null;
    testResult: string;
    odometerValue: number | null;
    odometerUnit: string;
  };
  nextTestDue?: string;
  hasOutstandingRecalls?: boolean;
  error?: string;
  details?: string;
  apiErrors?: string[];
}

export async function GET(request: Request) {
  return handleMOTCheck(request);
}

export async function POST(request: Request) {
  return handleMOTCheck(request);
}

async function handleMOTCheck(request: Request) {
  console.log('MOT Check API called');

  try {
    let registration: string | null = null;

    // Handle GET request with query parameters
    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      registration = searchParams.get('registration');
      console.log('GET Request URL:', request.url);
      console.log('Search params:', Object.fromEntries(searchParams.entries()));
    }
    // Handle POST request with JSON body
    else if (request.method === 'POST') {
      const body = await request.json();
      registration = body.registration;
      console.log('POST Request body:', body);
    }

    if (!registration) {
      console.error('No registration number provided');
      return NextResponse.json(
        {
          error: 'Registration number is required',
          details: 'Please provide a vehicle registration number in the format AB12CDE',
          registration: ''
        } as MOTCheckResponse,
        { status: 400 }
      );
    }

    const cleanRegistration = registration.trim().toUpperCase();
    console.log(`Processing MOT check for registration: ${cleanRegistration}`);

    // Make real API calls to DVSA and DVLA
    let motHistory: VehicleMOTHistory | null = null;
    let vehicleDetails: ExtendedVehicleDetails | null = null;
    let apiErrors: string[] = [];

    try {
      console.log('Fetching vehicle details...');
      const details = await getVehicleDetails(cleanRegistration);
      vehicleDetails = { ...details };
      console.log('Successfully retrieved vehicle details');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 500;

      console.error('Error fetching vehicle details:', {
        message: errorMessage,
        status: statusCode,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });

      if (statusCode === 404) {
        apiErrors.push('No vehicle details found for this registration');
      } else if (statusCode === 401 || statusCode === 403) {
        // Provide more detailed guidance for authentication issues
        apiErrors.push('DVLA API Authentication Failed');
        apiErrors.push('The DVLA API key is either invalid, expired, or not properly configured.');
        apiErrors.push('Please check your DVLA_API_KEY in the environment variables.');
      } else if (statusCode === 429) {
        apiErrors.push('Rate limit exceeded with DVLA API. Please try again later.');
      } else {
        apiErrors.push(`Vehicle details: ${errorMessage}`);
      }
    }

    try {
      console.log('Fetching MOT history...');
      motHistory = await dvsaClient.getMOTHistory(cleanRegistration);
      console.log('Successfully retrieved MOT history');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 500;

      console.error('Error fetching MOT history:', {
        message: errorMessage,
        status: statusCode,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });

      if (statusCode === 404) {
        apiErrors.push('No MOT history found for this vehicle');
      } else if (statusCode === 401 || statusCode === 403) {
        apiErrors.push('Authentication failed with DVSA API. Please check your credentials.');
      } else if (statusCode === 429) {
        apiErrors.push('Rate limit exceeded. Please try again later.');
      } else {
        apiErrors.push(`MOT history: ${errorMessage}`);
      }
    }

    // If we have no data at all, return an error
    if (!motHistory && !vehicleDetails) {
      console.error('No data found for registration:', cleanRegistration);
      return NextResponse.json(
        {
          error: 'No vehicle data found',
          registration: cleanRegistration,
          details: apiErrors.length > 0 ? apiErrors.join('; ') : 'No data available',
          apiErrors
        } as MOTCheckResponse,
        { status: 404 }
      );
    }

    // Process and combine the data
    let motStatus = 'Unknown';
    let motExpiryDate = null;
    let taxStatus = 'Unknown';
    let taxDueDate = null;

    // Get MOT status and expiry from latest test
    if (motHistory?.motTests?.length) {
      const latestTest = motHistory.motTests[0];
      if (latestTest.expiryDate) {
        motExpiryDate = latestTest.expiryDate;
        const expiryDateObj = new Date(latestTest.expiryDate);
        const now = new Date();
        motStatus = expiryDateObj > now ? 'Valid' : 'Expired';
      }
    }

    // Override with DVLA data if available
    if (vehicleDetails?.motStatus) {
      motStatus = vehicleDetails.motStatus;
    }
    if (vehicleDetails?.motExpiryDate) {
      motExpiryDate = vehicleDetails.motExpiryDate;
    }
    if (vehicleDetails?.taxStatus) {
      taxStatus = vehicleDetails.taxStatus;
    }
    if (vehicleDetails?.taxDueDate) {
      taxDueDate = vehicleDetails.taxDueDate;
    }

    const result: MOTCheckResponse = {
      registration: cleanRegistration,
      make: vehicleDetails?.make || motHistory?.make,
      model: vehicleDetails?.model || motHistory?.model,
      yearOfManufacture: vehicleDetails?.yearOfManufacture,
      engineCapacity: vehicleDetails?.engineCapacity,
      fuelType: vehicleDetails?.fuelType || motHistory?.fuelType,
      colour: vehicleDetails?.primaryColour || vehicleDetails?.colour,
      motStatus: motStatus,
      motExpiryDate: motExpiryDate,
      taxStatus: taxStatus,
      taxDueDate: taxDueDate,
      hasOutstandingRecalls: motHistory?.hasOutstandingRecall === 'true' || false,
      apiErrors: apiErrors.length > 0 ? apiErrors : undefined,
      vehicleDetails: vehicleDetails // Include full vehicle details
    };

    // Add MOT tests if available
    if (motHistory?.motTests?.length) {
      result.motTests = motHistory.motTests.map(test => ({
        completedDate: test.completedDate,
        expiryDate: test.expiryDate,
        odometerValue: test.odometerValue ? parseInt(test.odometerValue.toString(), 10) : null,
        odometerUnit: test.odometerUnit || 'mi',
        testResult: test.testResult,
        testNumber: test.motTestNumber || '',
        defects: test.defects?.map(defect => ({
          text: defect.text,
          type: defect.type as any, // Type assertion since the API might return different values
          dangerous: defect.dangerous
        })) || []
      }));

      // Add the most recent test as lastTest
      const latestTest = motHistory.motTests[0];
      if (latestTest) {
        result.lastTest = {
          completedDate: latestTest.completedDate,
          expiryDate: latestTest.expiryDate,
          testResult: latestTest.testResult,
          odometerValue: latestTest.odometerValue ? parseInt(latestTest.odometerValue.toString(), 10) : null,
          odometerUnit: latestTest.odometerUnit || 'mi'
        };
      }

      // Set next test due date (expiry date of the latest test)
      if (latestTest?.expiryDate) {
        result.nextTestDue = latestTest.expiryDate;
      }
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=1800'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error in MOT check API:', {
      message: errorMessage,
      stack: errorStack,
      url: request.url
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        statusText: 'Internal Server Error'
      }
    );
  }
}
