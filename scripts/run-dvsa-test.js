// Comprehensive DVSA API Test Script
import { getDVSAAccessToken } from "../lib/dvsa-auth.js"

console.log("🚀 Starting Comprehensive DVSA API Test")
console.log("=" * 50)

// Test Configuration
const testRegistrations = ["EX64UWJ", "HY12GNN", "HT54WKP", "RF15SXS", "FP61HGL"]
const apiKey = "8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq"
const baseUrl = "https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests"

const testResults = {
  authTest: null,
  connectivityTest: null,
  dataValidationTest: null,
  registrationTests: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: [],
  },
}

// Test 1: OAuth Authentication
console.log("\n🔐 Test 1: OAuth Authentication")
console.log("-".repeat(30))

try {
  const token = await getDVSAAccessToken()

  testResults.authTest = {
    success: true,
    message: `✅ OAuth token obtained successfully`,
    details: {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + "...",
      timestamp: new Date().toISOString(),
    },
  }

  console.log("✅ SUCCESS: OAuth authentication working")
  console.log(`   Token length: ${token.length} characters`)
  console.log(`   Token preview: ${token.substring(0, 20)}...`)

  testResults.summary.passed++
} catch (error) {
  testResults.authTest = {
    success: false,
    message: `❌ OAuth authentication failed`,
    error: error.message,
    timestamp: new Date().toISOString(),
  }

  console.log("❌ FAILED: OAuth authentication failed")
  console.log(`   Error: ${error.message}`)
  testResults.summary.failed++
  testResults.summary.errors.push(`OAuth: ${error.message}`)
}

testResults.summary.totalTests++

// Test 2: DVSA API Connectivity
console.log("\n🌐 Test 2: DVSA API Connectivity")
console.log("-".repeat(30))

if (testResults.authTest?.success) {
  try {
    const token = await getDVSAAccessToken()
    const testReg = "EX64UWJ"
    const url = `${baseUrl}?registration=${testReg}`

    console.log(`   Testing URL: ${url}`)
    console.log(`   Using API Key: ${apiKey.substring(0, 10)}...`)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json+v6",
        Authorization: `Bearer ${token}`,
        "x-api-key": apiKey,
      },
    })

    const responseText = await response.text()

    testResults.connectivityTest = {
      success: response.ok,
      message: response.ok
        ? `✅ API connectivity successful (${response.status})`
        : `❌ API returned error (${response.status})`,
      details: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200),
      },
      error: response.ok ? null : responseText,
    }

    if (response.ok) {
      console.log("✅ SUCCESS: DVSA API is accessible")
      console.log(`   Status: ${response.status} ${response.statusText}`)
      console.log(`   Response length: ${responseText.length} characters`)
      testResults.summary.passed++
    } else {
      console.log("❌ FAILED: DVSA API returned error")
      console.log(`   Status: ${response.status} ${response.statusText}`)
      console.log(`   Error: ${responseText.substring(0, 200)}`)
      testResults.summary.failed++
      testResults.summary.errors.push(`API Connectivity: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    testResults.connectivityTest = {
      success: false,
      message: `❌ API connectivity failed`,
      error: error.message,
    }

    console.log("❌ FAILED: Could not connect to DVSA API")
    console.log(`   Error: ${error.message}`)
    testResults.summary.failed++
    testResults.summary.errors.push(`Connectivity: ${error.message}`)
  }
} else {
  testResults.connectivityTest = {
    success: false,
    message: "❌ Skipped due to authentication failure",
  }
  console.log("⏭️  SKIPPED: Cannot test connectivity without valid authentication")
  testResults.summary.failed++
}

testResults.summary.totalTests++

// Test 3: Data Structure Validation
console.log("\n📊 Test 3: Data Structure Validation")
console.log("-".repeat(30))

if (testResults.connectivityTest?.success) {
  try {
    const token = await getDVSAAccessToken()
    const testReg = "EX64UWJ"
    const url = `${baseUrl}?registration=${testReg}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json+v6",
        Authorization: `Bearer ${token}`,
        "x-api-key": apiKey,
      },
    })

    const responseText = await response.text()
    const data = JSON.parse(responseText)

    // Validate data structure
    const isArray = Array.isArray(data)
    const hasData = isArray && data.length > 0
    const hasVehicle = hasData && data[0].registration
    const hasMOTTests = hasData && Array.isArray(data[0].motTests)
    const hasLatestMOT = hasMOTTests && data[0].motTests.length > 0

    const validStructure = isArray && hasData && hasVehicle && hasMOTTests

    testResults.dataValidationTest = {
      success: validStructure,
      message: validStructure ? `✅ Data structure is valid` : `❌ Invalid data structure`,
      details: {
        isArray,
        hasData,
        hasVehicle,
        hasMOTTests,
        hasLatestMOT,
        vehicleCount: isArray ? data.length : 0,
        sampleVehicle: hasData
          ? {
              registration: data[0].registration,
              make: data[0].make,
              model: data[0].model,
              motTestCount: data[0].motTests?.length || 0,
              latestMOTDate: data[0].motTests?.[0]?.completedDate,
              latestExpiryDate: data[0].motTests?.[0]?.expiryDate,
              latestTestResult: data[0].motTests?.[0]?.testResult,
            }
          : null,
      },
    }

    if (validStructure) {
      console.log("✅ SUCCESS: Data structure is valid")
      console.log(`   Vehicle: ${data[0].make} ${data[0].model} (${data[0].registration})`)
      console.log(`   MOT Tests: ${data[0].motTests?.length || 0}`)
      if (hasLatestMOT) {
        console.log(`   Latest MOT: ${data[0].motTests[0].testResult} (${data[0].motTests[0].completedDate})`)
        console.log(`   Expires: ${data[0].motTests[0].expiryDate}`)
      }
      testResults.summary.passed++
    } else {
      console.log("❌ FAILED: Invalid data structure")
      console.log(`   Is Array: ${isArray}`)
      console.log(`   Has Data: ${hasData}`)
      console.log(`   Has Vehicle: ${hasVehicle}`)
      console.log(`   Has MOT Tests: ${hasMOTTests}`)
      testResults.summary.failed++
      testResults.summary.errors.push("Data structure validation failed")
    }
  } catch (error) {
    testResults.dataValidationTest = {
      success: false,
      message: `❌ Data validation failed`,
      error: error.message,
    }

    console.log("❌ FAILED: Could not validate data structure")
    console.log(`   Error: ${error.message}`)
    testResults.summary.failed++
    testResults.summary.errors.push(`Data Validation: ${error.message}`)
  }
} else {
  testResults.dataValidationTest = {
    success: false,
    message: "❌ Skipped due to connectivity failure",
  }
  console.log("⏭️  SKIPPED: Cannot validate data without API connectivity")
  testResults.summary.failed++
}

testResults.summary.totalTests++

// Test 4: Multiple Registration Tests
console.log("\n🚗 Test 4: Multiple Registration Tests")
console.log("-".repeat(30))

if (testResults.authTest?.success) {
  for (const registration of testRegistrations) {
    console.log(`\n   Testing: ${registration}`)

    try {
      const token = await getDVSAAccessToken()
      const url = `${baseUrl}?registration=${registration}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json+v6",
          Authorization: `Bearer ${token}`,
          "x-api-key": apiKey,
        },
      })

      const responseText = await response.text()

      let vehicleData = null
      let motData = null
      let daysUntilExpiry = null

      if (response.ok && responseText.length > 10) {
        try {
          const data = JSON.parse(responseText)
          if (Array.isArray(data) && data.length > 0) {
            vehicleData = data[0]
            motData = vehicleData.motTests?.[0]

            // Calculate days until expiry
            if (motData?.expiryDate) {
              const expiryDate = new Date(motData.expiryDate)
              const today = new Date()
              expiryDate.setHours(0, 0, 0, 0)
              today.setHours(0, 0, 0, 0)
              daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            }
          }
        } catch (parseError) {
          console.log(`   ⚠️  Could not parse response for ${registration}`)
        }
      }

      const testResult = {
        registration,
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        hasData: response.ok && responseText.length > 10,
        vehicleData: vehicleData
          ? {
              registration: vehicleData.registration,
              make: vehicleData.make,
              model: vehicleData.model,
              fuelType: vehicleData.fuelType,
              primaryColour: vehicleData.primaryColour,
              firstUsedDate: vehicleData.firstUsedDate,
            }
          : null,
        motData: motData
          ? {
              completedDate: motData.completedDate,
              testResult: motData.testResult,
              expiryDate: motData.expiryDate,
              odometerValue: motData.odometerValue,
              odometerUnit: motData.odometerUnit,
              defectCount: motData.rfrAndComments?.length || 0,
              daysUntilExpiry,
            }
          : null,
        error: response.ok ? null : responseText.substring(0, 100),
      }

      testResults.registrationTests.push(testResult)

      if (response.ok) {
        console.log(`   ✅ SUCCESS: ${registration}`)
        if (vehicleData) {
          console.log(`      Vehicle: ${vehicleData.make} ${vehicleData.model}`)
          if (motData) {
            console.log(`      MOT: ${motData.testResult} (expires ${motData.expiryDate})`)
            if (daysUntilExpiry !== null) {
              const status = daysUntilExpiry < 0 ? "EXPIRED" : daysUntilExpiry <= 30 ? "DUE SOON" : "VALID"
              console.log(`      Status: ${status} (${daysUntilExpiry} days)`)
            }
          }
        }
        testResults.summary.passed++
      } else {
        console.log(`   ❌ FAILED: ${registration} (${response.status})`)
        testResults.summary.failed++
        testResults.summary.errors.push(`${registration}: ${response.status}`)
      }

      testResults.summary.totalTests++

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      const testResult = {
        registration,
        success: false,
        error: error.message,
      }

      testResults.registrationTests.push(testResult)

      console.log(`   ❌ ERROR: ${registration} - ${error.message}`)
      testResults.summary.failed++
      testResults.summary.errors.push(`${registration}: ${error.message}`)
      testResults.summary.totalTests++
    }
  }
} else {
  console.log("⏭️  SKIPPED: Cannot test registrations without authentication")
}

// Final Summary
console.log("\n" + "=".repeat(50))
console.log("📋 COMPREHENSIVE TEST SUMMARY")
console.log("=".repeat(50))

console.log(`\n📊 Overall Results:`)
console.log(`   Total Tests: ${testResults.summary.totalTests}`)
console.log(`   Passed: ${testResults.summary.passed} ✅`)
console.log(`   Failed: ${testResults.summary.failed} ❌`)
console.log(`   Success Rate: ${Math.round((testResults.summary.passed / testResults.summary.totalTests) * 100)}%`)

console.log(`\n🔐 Authentication Test:`)
console.log(`   ${testResults.authTest?.message || "Not run"}`)

console.log(`\n🌐 Connectivity Test:`)
console.log(`   ${testResults.connectivityTest?.message || "Not run"}`)

console.log(`\n📊 Data Validation Test:`)
console.log(`   ${testResults.dataValidationTest?.message || "Not run"}`)

console.log(`\n🚗 Registration Tests:`)
const successfulRegs = testResults.registrationTests.filter((t) => t.success).length
console.log(`   Successful: ${successfulRegs}/${testResults.registrationTests.length}`)

testResults.registrationTests.forEach((test) => {
  const status = test.success ? "✅" : "❌"
  console.log(`   ${status} ${test.registration}: ${test.success ? "OK" : test.error || "Failed"}`)
})

if (testResults.summary.errors.length > 0) {
  console.log(`\n⚠️  Errors Encountered:`)
  testResults.summary.errors.forEach((error) => {
    console.log(`   • ${error}`)
  })
}

console.log(`\n🎯 Recommendations:`)

if (testResults.authTest?.success) {
  console.log(`   ✅ OAuth authentication is working correctly`)
} else {
  console.log(`   ❌ Fix OAuth authentication - check client credentials`)
}

if (testResults.connectivityTest?.success) {
  console.log(`   ✅ DVSA API connectivity is working`)
} else {
  console.log(`   ❌ Check DVSA API endpoint and network connectivity`)
}

if (testResults.dataValidationTest?.success) {
  console.log(`   ✅ Data structure validation passed`)
} else {
  console.log(`   ❌ Review API response format and parsing logic`)
}

const regSuccessRate =
  testResults.registrationTests.length > 0 ? (successfulRegs / testResults.registrationTests.length) * 100 : 0

if (regSuccessRate >= 80) {
  console.log(`   ✅ Registration tests mostly successful (${Math.round(regSuccessRate)}%)`)
} else if (regSuccessRate >= 50) {
  console.log(`   ⚠️  Some registration tests failing (${Math.round(regSuccessRate)}% success)`)
} else {
  console.log(`   ❌ Most registration tests failing (${Math.round(regSuccessRate)}% success)`)
}

console.log(`\n🚀 Next Steps:`)
if (testResults.summary.passed === testResults.summary.totalTests) {
  console.log(`   🎉 All tests passed! Your DVSA API integration is working perfectly.`)
  console.log(`   🔄 You can now run "Refresh All" to load real MOT data.`)
} else {
  console.log(`   🔧 Fix the failing tests above before proceeding.`)
  console.log(`   📋 The system will fall back to sample data until issues are resolved.`)
}

console.log("\n" + "=".repeat(50))
console.log("✅ Test Complete")

// Export results for use in the application
export default testResults
