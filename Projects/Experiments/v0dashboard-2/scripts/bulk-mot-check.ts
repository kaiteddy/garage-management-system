import { bulkCheckMOTStatus } from '../lib/mot-api';
import { VehicleService } from '../lib/database/vehicle-service';
import { saveMOTCheckToDatabase } from '../lib/utils/bulk-mot-check';

// Interface matching what saveMOTCheckToDatabase expects
interface MOTTest {
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
}

interface MOTCheckResult {
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
  testHistory: MOTTest[];
  error?: string;
  vehicleData?: {
    make?: string;
    model?: string;
    firstUsedDate?: string;
    fuelType?: string;
    primaryColour?: string;
    motTests?: Array<{
      testDate: string;
      testResult: string;
      expiryDate: string | null;
      odometerValue: string | number | null;
      odometerUnit: string | null;
      testNumber: string;
      defects?: Array<{
        text: string;
        type: string;
        dangerous?: boolean;
      }>;
    }>;
  };
}

export async function runBulkMOTCheck() {
  console.log('Starting bulk MOT check...');
  
  try {
    // Get all registrations from the database
    console.log('Fetching all vehicle registrations...');
    const registrations = await VehicleService.getAllRegistrations();
    console.log(`Found ${registrations.length} vehicles to check.`);

    if (registrations.length === 0) {
      console.log('No vehicles found in the database.');
      return;
    }

    // Run the bulk check with progress updates
    const startTime = Date.now();
    
    console.log('Starting MOT checks with batch processing...');
    const results = await bulkCheckMOTStatus(registrations, {
      concurrency: 5,           // Process 5 vehicles concurrently
      batchSize: 50,            // Process in batches of 50
      delayBetweenBatches: 1000, // 1 second between batches
      onProgress: (processedCount, total, current, avgTime) => {
        const percent = Math.round((processedCount / total) * 100);
        console.log(`Progress: ${percent}% (${processedCount}/${total}) - Current: ${current} - Avg time: ${avgTime.toFixed(2)}ms`);
      }
    });

    // Process results
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.log(`\nBulk MOT check completed in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Successfully checked: ${successCount} vehicles`);
    console.log(`Errors: ${errorCount} vehicles`);

    // Save results to database
    console.log('Saving results to database...');
    const savePromises = results
      .filter(result => !result.error)
      .map(result => {
        // Get the latest test if available
        const latestTest = result.vehicleData?.motTests?.[0];
        
        // Determine if there are any advisories or failures
        const hasAdvisories = latestTest?.defects?.some(d => d.type === 'ADVISORY') || false;
        const hasFailures = latestTest?.defects?.some(d => d.type === 'FAIL' || d.dangerous) || 
                          result.motStatus === 'expired';
        
        // Transform the result to match the expected type for saveMOTCheckToDatabase
        const motResult: MOTCheckResult = {
          registration: result.registration,
          make: result.vehicleData?.make,
          model: result.vehicleData?.model,
          motStatus: result.motStatus === 'valid' ? 'Valid' : 
                    result.motStatus === 'expired' || result.motStatus === 'no-mot' ? 'Invalid' : 'Unknown',
          motExpiryDate: result.expiryDate || null,
          lastTestDate: result.lastTestDate || null,
          odometerValue: latestTest?.odometerValue ? 
            (typeof latestTest.odometerValue === 'string' ? 
              parseInt(latestTest.odometerValue, 10) : 
              latestTest.odometerValue) : 
            null,
          odometerUnit: latestTest?.odometerUnit || 'mi',
          hasAdvisories,
          hasFailures,
          testHistory: result.vehicleData?.motTests?.map(test => ({
            testDate: test.testDate || new Date().toISOString(),
            testResult: test.testResult || 'UNKNOWN',
            expiryDate: test.expiryDate || null,
            odometerValue: test.odometerValue ? 
              (typeof test.odometerValue === 'string' ? 
                parseInt(test.odometerValue, 10) : 
                test.odometerValue) : 
              null,
            odometerUnit: test.odometerUnit || 'mi',
            testNumber: test.motTestNumber || 'UNKNOWN',
            defects: test.defects || []
          })) || []
        };
        return saveMOTCheckToDatabase(result.registration, motResult);
      });
    
    await Promise.all(savePromises);
    console.log('Results saved to database.');

  } catch (error) {
    console.error('Error during bulk MOT check:', error);
    process.exit(1);
  }
}

// Run the script
runBulkMOTCheck()
  .then(() => {
    console.log('Bulk MOT check completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Bulk MOT check failed:', error);
    process.exit(1);
  });
