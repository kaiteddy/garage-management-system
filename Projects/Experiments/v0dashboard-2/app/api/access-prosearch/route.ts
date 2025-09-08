import { NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log("[ACCESS-PROSEARCH] Attempting to access ProSearch Intelligence folder...")
    
    const prosearchPath = '/Users/adamrutstein/Downloads/ProSearch Intelligence'
    const results = {
      found: false,
      contents: [],
      importSolutions: [],
      error: null
    }
    
    try {
      if (fs.existsSync(prosearchPath)) {
        results.found = true
        console.log("[ACCESS-PROSEARCH] ✅ ProSearch Intelligence folder found!")
        
        const items = fs.readdirSync(prosearchPath)
        console.log(`[ACCESS-PROSEARCH] Found ${items.length} items`)
        
        for (const item of items) {
          const itemPath = path.join(prosearchPath, item)
          const stats = fs.statSync(itemPath)
          
          const itemInfo = {
            name: item,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString()
          }
          
          results.contents.push(itemInfo)
          
          // Check for import solutions
          if (stats.isDirectory() && (
            item.toLowerCase().includes('garage') ||
            item.toLowerCase().includes('import') ||
            item.toLowerCase().includes('solution')
          )) {
            console.log(`[ACCESS-PROSEARCH] 🎯 Found potential import solution: ${item}`)
            
            try {
              const subItems = fs.readdirSync(itemPath)
              results.importSolutions.push({
                name: item,
                path: itemPath,
                contents: subItems.slice(0, 20), // First 20 items
                totalItems: subItems.length
              })
            } catch (e) {
              console.log(`[ACCESS-PROSEARCH] Cannot read ${item}: ${e.message}`)
            }
          }
        }
        
      } else {
        results.error = "ProSearch Intelligence folder not found"
        console.log("[ACCESS-PROSEARCH] ❌ ProSearch Intelligence folder not found")
        
        // Check Downloads folder
        const downloadsPath = '/Users/adamrutstein/Downloads'
        if (fs.existsSync(downloadsPath)) {
          const downloads = fs.readdirSync(downloadsPath)
          const related = downloads.filter(item => 
            item.toLowerCase().includes('prosearch') ||
            item.toLowerCase().includes('garage') ||
            item.toLowerCase().includes('import')
          )
          
          results.contents = related.map(item => ({
            name: item,
            type: 'unknown',
            location: 'Downloads root'
          }))
        }
      }
      
    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error'
      console.log("[ACCESS-PROSEARCH] Error:", error)
    }
    
    return NextResponse.json({
      success: results.found,
      message: results.found ? "ProSearch Intelligence folder accessed successfully" : "Folder not found",
      data: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[ACCESS-PROSEARCH] Fatal error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to access ProSearch Intelligence folder",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
