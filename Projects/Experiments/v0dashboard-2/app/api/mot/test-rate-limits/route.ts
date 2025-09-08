import { NextResponse } from "next/server"
import { checkMOTStatus } from "@/lib/mot-api"

export async function POST(request: Request) {
  try {
    const { testRegistrations, concurrency, delayMs } = await request.json()
    
    if (!testRegistrations || !Array.isArray(testRegistrations)) {
      return NextResponse.json(
        { success: false, error: "testRegistrations array is required" },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const results = []
    const errors = []
    
    console.log(`[RATE-TEST] Testing ${testRegistrations.length} requests with ${concurrency || 1} concurrency, ${delayMs || 0}ms delay`)

    // Test with controlled concurrency
    const testConcurrency = concurrency || 1
    const testDelay = delayMs || 0
    
    const processRegistration = async (registration: string, index: number) => {
      const requestStart = Date.now()
      try {
        console.log(`[RATE-TEST] Request ${index + 1}: ${registration}`)
        const result = await checkMOTStatus(registration)
        const requestTime = Date.now() - requestStart
        
        results.push({
          registration,
          success: result.success,
          responseTime: requestTime,
          timestamp: new Date().toISOString()
        })
        
        console.log(`[RATE-TEST] ✅ ${registration} completed in ${requestTime}ms`)
      } catch (error) {
        const requestTime = Date.now() - requestStart
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        errors.push({
          registration,
          error: errorMessage,
          responseTime: requestTime,
          timestamp: new Date().toISOString(),
          isRateLimit: errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED')
        })
        
        console.log(`[RATE-TEST] ❌ ${registration} failed in ${requestTime}ms: ${errorMessage}`)
      }
      
      // Add delay between requests if specified
      if (testDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, testDelay))
      }
    }

    // Process with controlled concurrency
    const semaphore = new Array(testConcurrency).fill(null)
    const workers = semaphore.map(async () => {
      let index = 0
      while (index < testRegistrations.length) {
        const currentIndex = index++
        if (currentIndex < testRegistrations.length) {
          await processRegistration(testRegistrations[currentIndex], currentIndex)
        }
      }
    })

    await Promise.all(workers)
    
    const totalTime = Date.now() - startTime
    const successfulRequests = results.filter(r => r.success).length
    const rateLimitErrors = errors.filter(e => e.isRateLimit).length
    const otherErrors = errors.filter(e => !e.isRateLimit).length
    
    const averageResponseTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.responseTime, 0) / results.length 
      : 0
    
    const requestsPerSecond = testRegistrations.length / (totalTime / 1000)
    
    const analysis = {
      totalRequests: testRegistrations.length,
      successfulRequests,
      rateLimitErrors,
      otherErrors,
      totalTime,
      averageResponseTime: Math.round(averageResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      concurrency: testConcurrency,
      delayBetweenRequests: testDelay,
      recommendation: rateLimitErrors > 0 
        ? "Rate limits hit - reduce concurrency or increase delays"
        : requestsPerSecond > 12 
          ? "Good performance - consider slight optimization"
          : "Conservative settings - can likely increase throughput"
    }

    return NextResponse.json({
      success: true,
      analysis,
      results: results.slice(0, 5), // Show first 5 results
      errors: errors.slice(0, 5), // Show first 5 errors
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[RATE-TEST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test rate limits",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
