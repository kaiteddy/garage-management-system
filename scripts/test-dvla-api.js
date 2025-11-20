// Test script for DVLA API integration
import { lookupVehicleByRegistration, mapDVLAToVehicleData } from "../lib/dvla-api.js"

async function testDVLAAPI() {
  console.log("🧪 Starting DVLA API Tests...\n")

  // Test registrations - mix of valid and invalid
  const testRegistrations = [
    "AA19AAA", // Test registration
    "MT09HWK", // Another test registration
    "INVALID", // Invalid registration
    "AB12CDE", // Another test
    "LS18ZZA", // From job sheet example
  ]

  for (const registration of testRegistrations) {
    console.log(`\n🔍 Testing registration: ${registration}`)
    console.log("=".repeat(50))

    try {
      const startTime = Date.now()
      const vehicleData = await lookupVehicleByRegistration(registration)
      const endTime = Date.now()

      if (vehicleData) {
        console.log("✅ SUCCESS - Vehicle found!")
        console.log(`⏱️  Response time: ${endTime - startTime}ms`)
        console.log("\n📋 Vehicle Details:")
        console.log(`   Registration: ${vehicleData.registrationNumber}`)
        console.log(`   Make: ${vehicleData.make}`)
        console.log(`   Year: ${vehicleData.yearOfManufacture}`)
        console.log(`   Colour: ${vehicleData.colour}`)
        console.log(`   Fuel Type: ${vehicleData.fuelType}`)
        console.log(`   Engine Capacity: ${vehicleData.engineCapacity || "N/A"}cc`)
        console.log(`   MOT Status: ${vehicleData.motStatus}`)
        console.log(`   MOT Expiry: ${vehicleData.motExpiryDate || "N/A"}`)
        console.log(`   Tax Status: ${vehicleData.taxStatus}`)
        console.log(`   Tax Due: ${vehicleData.taxDueDate || "N/A"}`)
        console.log(`   CO2 Emissions: ${vehicleData.co2Emissions || "N/A"}g/km`)

        // Test mapping function
        console.log("\n🔄 Testing data mapping...")
        const mappedData = mapDVLAToVehicleData(vehicleData)
        console.log("✅ Mapping successful!")
        console.log(`   Mapped Registration: ${mappedData.registration}`)
        console.log(`   Mapped Make: ${mappedData.make}`)
        console.log(`   Mapped Colour: ${mappedData.colour}`)
      } else {
        console.log("❌ Vehicle not found")
      }
    } catch (error) {
      console.log("❌ ERROR occurred:")
      console.log(`   Message: ${error.message}`)
      console.log(`   Type: ${error.constructor.name}`)
    }
  }

  console.log("\n🏁 DVLA API Tests Complete!")
  console.log("=".repeat(50))
}

// Test API endpoint
async function testAPIEndpoint() {
  console.log("\n🌐 Testing API Endpoint...")

  try {
    const response = await fetch("/api/dvla-lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration: "AA19AAA",
      }),
    })

    const data = await response.json()

    if (response.ok) {
      console.log("✅ API Endpoint working!")
      console.log("Response:", data)
    } else {
      console.log("❌ API Endpoint error:", data)
    }
  } catch (error) {
    console.log("❌ API Endpoint test failed:", error.message)
  }
}

// Run tests
testDVLAAPI()
  .then(() => testAPIEndpoint())
  .catch(console.error)
