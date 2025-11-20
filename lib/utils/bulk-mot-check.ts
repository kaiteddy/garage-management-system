import { DVSAClient } from '@/lib/dvsa';
import { getVehicleDetails } from '@/lib/dvla';
import { sql } from '@/lib/database/neon-client';
import { VehicleMOTHistory } from '@/lib/dvsa';

const dvsaClient = DVSAClient.getInstance();

export interface MOTCheckResult {
  registration: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  fuelType?: string;
  colour?: string;
  motStatus: 'Valid' | 'Invalid' | 'Unknown';
  motExpiryDate?: string | null;
  lastTestDate?: string | null;
  odometerValue?: number | null;
  odometerUnit?: string | null;
  testNumber?: string | null;
  hasAdvisories: boolean;
  hasFailures: boolean;
  testHistory: Array<{
    testDate: string;
    testResult: string;
    expiryDate: string | null;
    odometerValue: number | null;
    odometerUnit: string | null;
    testNumber: string;
    defects: Array<{
      text: string;
      type: string;
      dangerous?: boolean;
    }>;
  }>;
  error?: string;
}

export async function checkMOT(registration: string): Promise<MOTCheckResult> {
  const cleanRegistration = registration.trim().toUpperCase();
  
  try {
    // Get vehicle details from DVLA
    const vehicleDetails = await getVehicleDetails(cleanRegistration);
    
    // Get MOT history from DVSA
    const motHistory = await dvsaClient.getMOTHistory(cleanRegistration);
    
    // Convert to array if it's not already
    const motHistoryArray = Array.isArray(motHistory) 
      ? motHistory 
      : (motHistory && typeof motHistory === 'object' && 'motTestHistory' in motHistory)
        ? Array.isArray(motHistory.motTestHistory) 
          ? motHistory.motTestHistory 
          : []
        : [];
    
    // Get the most recent MOT test
    const latestTest = motHistoryArray.length > 0 ? motHistoryArray[0] : null;
    
    return {
      registration: cleanRegistration,
      make: vehicleDetails.make,
      model: vehicleDetails.model,
      yearOfManufacture: vehicleDetails.yearOfManufacture,
      fuelType: vehicleDetails.fuelType,
      colour: vehicleDetails.colour,
      motStatus: latestTest?.testResult === 'PASSED' ? 'Valid' : 'Invalid',
      motExpiryDate: latestTest?.expiryDate || null,
      lastTestDate: latestTest?.completedDate || null,
      odometerValue: latestTest?.odometerValue || null,
      odometerUnit: latestTest?.odometerUnit || null,
      testNumber: latestTest?.testNumber || null,
      hasAdvisories: latestTest?.defects?.some((d: { type: string }) => d.type === 'ADVISORY') || false,
      hasFailures: latestTest?.defects?.some((d: { type: string }) => d.type === 'FAIL') || false,
      testHistory: motHistoryArray.map((test: any) => ({
        testDate: test.completedDate,
        testResult: test.testResult,
        expiryDate: test.expiryDate,
        odometerValue: test.odometerValue,
        odometerUnit: test.odometerUnit,
        testNumber: test.testNumber,
        defects: test.defects || []
      }))
    };
  } catch (error) {
    console.error(`Error checking MOT for ${cleanRegistration}:`, error);
    return {
      registration: cleanRegistration,
      motStatus: 'Unknown',
      hasAdvisories: false,
      hasFailures: false,
      testHistory: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function saveMOTCheckToDatabase(registration: string, result: MOTCheckResult) {
  try {
    // First, insert or update the vehicle
    await sql`
      INSERT INTO vehicles (
        registration, 
        make, 
        model, 
        year, 
        color, 
        fuel_type, 
        mot_status, 
        mot_expiry_date,
        mot_last_checked,
        mot_test_number,
        mot_odometer_value,
        mot_odometer_unit,
        mot_test_result,
        updated_at
      )
      VALUES (
        ${registration},
        ${result.make || null},
        ${result.model || null},
        ${result.yearOfManufacture || null},
        ${result.colour || null},
        ${result.fuelType || null},
        ${result.motStatus || 'Unknown'},
        ${result.motExpiryDate ? new Date(result.motExpiryDate) : null},
        ${new Date()},
        ${result.testNumber || null},
        ${result.odometerValue ? parseInt(result.odometerValue.toString()) : null},
        ${result.odometerUnit || null},
        ${result.motStatus || 'Unknown'},
        ${new Date()}
      )
      ON CONFLICT (registration) 
      DO UPDATE SET
        make = EXCLUDED.make,
        model = EXCLUDED.model,
        year = EXCLUDED.year,
        color = EXCLUDED.color,
        fuel_type = EXCLUDED.fuel_type,
        mot_status = EXCLUDED.mot_status,
        mot_expiry_date = EXCLUDED.mot_expiry_date,
        mot_last_checked = EXCLUDED.mot_last_checked,
        mot_test_number = EXCLUDED.mot_test_number,
        mot_odometer_value = EXCLUDED.mot_odometer_value,
        mot_odometer_unit = EXCLUDED.mot_odometer_unit,
        mot_test_result = EXCLUDED.mot_test_result,
        updated_at = EXCLUDED.updated_at
    `;
    
    // Then, insert MOT history if it exists
    if (result.testHistory && result.testHistory.length > 0) {
      for (const test of result.testHistory) {
        await sql`
          INSERT INTO mot_history (
            registration,
            test_date,
            expiry_date,
            test_result,
            odometer_value,
            odometer_unit,
            test_number,
            has_failures,
            has_advisories,
            created_at,
            updated_at
          )
          VALUES (
            ${registration},
            ${test.testDate ? new Date(test.testDate) : null},
            ${test.expiryDate ? new Date(test.expiryDate) : null},
            ${test.testResult || null},
            ${test.odometerValue || null},
            ${test.odometerUnit || null},
            ${test.testNumber || null},
            ${test.defects?.some(d => d.type === 'FAIL' || d.type === 'MAJOR') || false},
            ${test.defects?.some(d => d.type === 'ADVISORY') || false},
            ${new Date()},
            ${new Date()}
          )
          ON CONFLICT (test_number) 
          DO UPDATE SET
            test_date = EXCLUDED.test_date,
            expiry_date = EXCLUDED.expiry_date,
            test_result = EXCLUDED.test_result,
            odometer_value = EXCLUDED.odometer_value,
            odometer_unit = EXCLUDED.odometer_unit,
            has_failures = EXCLUDED.has_failures,
            has_advisories = EXCLUDED.has_advisories,
            updated_at = EXCLUDED.updated_at
        `;
      }
    }
    
  } catch (error) {
    console.error(`Error saving MOT check for ${registration} to database:`, error);
    throw error;
  }
}

export async function bulkCheckMOTs(registrations: string[], saveToDatabase = true) {
  const results: MOTCheckResult[] = [];
  const errors: Array<{ registration: string; error: string }> = [];
  
  for (const registration of registrations) {
    try {
      const result = await checkMOT(registration);
      
      if (saveToDatabase && !result.error) {
        try {
          await saveMOTCheckToDatabase(registration, result);
        } catch (dbError) {
          console.error(`Failed to save to database for ${registration}:`, dbError);
          // Add the error to the result but don't fail the whole operation
          result.error = `Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
        }
      }
      
      results.push(result);
    } catch (error) {
      console.error(`Error processing registration ${registration}:`, error);
      errors.push({
        registration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Add a small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return { results, errors };
}
