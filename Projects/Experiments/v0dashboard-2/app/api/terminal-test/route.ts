import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[TERMINAL-TEST] Running diagnostic through web API...")
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      workingDirectory: process.cwd(),
      processId: process.pid,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasDatabase: !!process.env.DATABASE_URL,
        homeDir: process.env.HOME || 'not set'
      }
    }
    
    // Test file system
    const fs = require('fs')
    const filesInCurrentDir = fs.readdirSync('.').length
    
    // Test async operation
    const asyncTest = await new Promise(resolve => {
      setTimeout(() => resolve('async works'), 100)
    })
    
    // Test database if available
    let databaseTest = null
    if (process.env.DATABASE_URL) {
      try {
        const { neon } = require('@neondatabase/serverless')
        const sql = neon(process.env.DATABASE_URL)
        const result = await sql`SELECT NOW() as time, 'web-api-test' as source`
        databaseTest = {
          success: true,
          time: result[0].time,
          source: result[0].source
        }
      } catch (e) {
        databaseTest = {
          success: false,
          error: e.message
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Web API terminal test successful!",
      diagnostics: {
        ...diagnostics,
        fileSystemTest: `Found ${filesInCurrentDir} files in current directory`,
        asyncTest,
        databaseTest
      },
      conclusion: {
        webApiWorks: true,
        terminalBlocked: true,
        recommendation: "Use web-based import solution"
      }
    })
    
  } catch (error) {
    console.error("[TERMINAL-TEST] Error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Web API test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
