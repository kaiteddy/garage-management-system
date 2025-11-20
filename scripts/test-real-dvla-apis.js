// Test script for real DVLA and DVSA APIs
const { getDVSAAccessToken, getDVLAApiKey } = require("../lib/dvsa-auth")

async function testDVSAAuth() {
  console.log("🔄 Testing DVSA OAuth2 authentication...")

  try {
    const token = await getDVSAAccessToken()
    if (token) {
      console.log("✅ DVSA OAuth2 token obtained successfully")
      console.log("Token preview:", token.substring(0, 20) + "...")
      return true
    } else {
      console.log("❌ Failed to get DVSA token")
      return false
    }
  } catch (error) {
    console.error("❌ DVSA auth error:", error.message)
    return false
  }
}

async function testDVLAKey() {
  console.log("🔄 Testing DVLA API key...")

  try {
    const key = getDVLAApiKey()
    if (key) {
      console.log("✅ DVLA API key available")
      console.log("Key preview:", key.substring(0, 10) + "...")
      return true
    } else {
      console.log("❌ DVLA API key not available")
      return false
    }
  } catch (error) {
    console.error("❌ DVLA key error:", error.message)
    return false
  }
}

async function testMOTLookup(registration = "Y467AKL") {
  console.log(`🔄 Testing MOT lookup for ${registration}...`)

  try {
    const response = await fetch(`http://localhost:3000/api/mot?registration=${registration}`)
    const data = await response.json()

    if (data.success) {
      console.log("✅ MOT lookup successful")
      console.log("Vehicle:", data.data.make, data.data.model)
      console.log("MOT Status:", data.data.motStatus)
      console.log("MOT Tests:", data.data.motTests?.length || 0)
      return true
    } else {
      console.log("❌ MOT lookup failed:", data.error)
      return false
    }
  } catch (error) {
    console.error("❌ MOT lookup error:", error.message)
    return false
  }
}

async function testDVLALookup(registration = "Y467AKL") {
  console.log(`🔄 Testing DVLA lookup for ${registration}...`)

  try {
    const response = await fetch("http://localhost:3000/api/dvla-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration }),
    })

    const data = await response.json()

    if (data.success) {
      console.log("✅ DVLA lookup successful")
      console.log("Vehicle:", data.data.make, data.data.model)
      console.log("Year:", data.data.yearOfManufacture)
      console.log("Fuel:", data.data.fuelType)
      return true
    } else {
      console.log("❌ DVLA lookup failed:", data.error)
      return false
    }
  } catch (error) {
    console.error("❌ DVLA lookup error:", error.message)
    return false
  }
}

async function runAllTests() {
  console.log("🚀 Starting API tests...\n")

  const results = {
    dvsaAuth: await testDVSAAuth(),
    dvlaKey: await testDVLAKey(),
    motLookup: await testMOTLookup(),
    dvlaLookup: await testDVLALookup(),
  }

  console.log("\n📊 Test Results:")
  console.log("DVSA Auth:", results.dvsaAuth ? "✅" : "❌")
  console.log("DVLA Key:", results.dvlaKey ? "✅" : "❌")
  console.log("MOT Lookup:", results.motLookup ? "✅" : "❌")
  console.log("DVLA Lookup:", results.dvlaLookup ? "✅" : "❌")

  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)

  if (passed === total) {
    console.log("🎉 All tests passed! APIs are working correctly.")
  } else {
    console.log("⚠️  Some tests failed. Check the logs above for details.")
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testDVSAAuth, testDVLAKey, testMOTLookup, testDVLALookup, runAllTests }
