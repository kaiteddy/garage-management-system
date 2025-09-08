import { NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log("[CHECK-DESKTOP] Scanning desktop for import solutions...")
    
    const desktopPath = '/Users/adamrutstein/Desktop'
    const results = {
      found: false,
      totalItems: 0,
      importSolutions: [],
      csvFiles: [],
      ga4Export: null,
      allItems: [],
      error: null
    }
    
    try {
      if (fs.existsSync(desktopPath)) {
        results.found = true
        console.log("[CHECK-DESKTOP] ✅ Desktop folder found!")
        
        const items = fs.readdirSync(desktopPath)
        results.totalItems = items.length
        console.log(`[CHECK-DESKTOP] Found ${items.length} items on desktop`)
        
        for (const item of items) {
          const itemPath = path.join(desktopPath, item)
          const stats = fs.statSync(itemPath)
          
          const itemInfo = {
            name: item,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            sizeMB: Math.round(stats.size / 1024 / 1024),
            modified: stats.mtime.toISOString()
          }
          
          results.allItems.push(itemInfo)
          
          // Check for import/garage related items
          const itemLower = item.toLowerCase()
          if (itemLower.includes('garage') || 
              itemLower.includes('import') || 
              itemLower.includes('solution') ||
              itemLower.includes('prosearch') ||
              itemLower.includes('ga4') ||
              itemLower.includes('export')) {
            
            console.log(`[CHECK-DESKTOP] 🎯 Found potential solution: ${item}`)
            
            if (stats.isDirectory()) {
              try {
                const subItems = fs.readdirSync(itemPath)
                const csvCount = subItems.filter(sub => sub.toLowerCase().endsWith('.csv')).length
                
                results.importSolutions.push({
                  name: item,
                  path: itemPath,
                  type: 'directory',
                  contents: subItems.slice(0, 20), // First 20 items
                  totalItems: subItems.length,
                  csvFiles: csvCount
                })
                
                // Check if this is GA4 Export
                if (itemLower.includes('ga4') && itemLower.includes('export')) {
                  results.ga4Export = {
                    name: item,
                    path: itemPath,
                    contents: subItems,
                    csvFiles: subItems.filter(sub => sub.toLowerCase().endsWith('.csv'))
                  }
                }
                
              } catch (e) {
                console.log(`[CHECK-DESKTOP] Cannot read ${item}: ${e.message}`)
                results.importSolutions.push({
                  name: item,
                  path: itemPath,
                  type: 'directory',
                  error: e.message
                })
              }
            } else {
              results.importSolutions.push({
                name: item,
                path: itemPath,
                type: 'file',
                size: stats.size
              })
            }
          }
          
          // Check for CSV files
          if (itemLower.endsWith('.csv')) {
            results.csvFiles.push({
              name: item,
              path: itemPath,
              size: stats.size,
              sizeMB: Math.round(stats.size / 1024 / 1024)
            })
          }
        }
        
      } else {
        results.error = "Desktop folder not found"
        console.log("[CHECK-DESKTOP] ❌ Desktop folder not found")
      }
      
    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error'
      console.log("[CHECK-DESKTOP] Error:", error)
    }
    
    return NextResponse.json({
      success: results.found,
      message: results.found ? "Desktop scanned successfully" : "Desktop not found",
      data: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[CHECK-DESKTOP] Fatal error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to check desktop",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
