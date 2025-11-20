import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { checkMOTStatus } from "../lib/mot-api.js";

async function testMOTLookup() {
  try {
    // Test with a known registration number
    const registration = "AA19AAA" // Example UK registration
    console.log(`Testing MOT lookup for registration: ${registration}`)
    
    const result = await checkMOTStatus(registration)
    
    if (result) {
      console.log("✅ MOT Lookup Successful!")
      console.log("Vehicle Details:", {
        registration: result.registration,
        motStatus: result.motStatus,
        expiryDate: result.expiryDate,
        lastTestDate: result.lastTestDate,
        error: result.error
      })
      
      if (result.vehicleData) {
        console.log("\nVehicle Data:", {
          make: result.vehicleData.make,
          model: result.vehicleData.model,
          fuelType: result.vehicleData.fuelType,
          primaryColour: result.vehicleData.primaryColour
        })
      }
    } else {
      console.error("ℹ️ No MOT data found for this registration")
    }
  } catch (error) {
    console.error("❌ Error testing MOT API:")
    if (error instanceof Error) {
      console.error(error.message)
      if (error instanceof Error && 'cause' in error) {
        console.error("Cause:", (error as any).cause)
      }
    } else {
      console.error(error)
    }
  }
}

testMOTLookup()
