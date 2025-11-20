import { NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log("[CLEANUP-SCRIPTS] Analyzing import scripts...")
    
    const apiDir = path.join(process.cwd(), 'app', 'api')
    const importScripts = []
    
    // Recursively find all import-related directories
    function findImportScripts(dir: string, basePath: string = '') {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const relativePath = path.join(basePath, item)
        
        if (fs.statSync(fullPath).isDirectory()) {
          // Check if this directory contains import-related functionality
          if (item.includes('import') || item.includes('bulk-processing') || item.includes('turbo')) {
            const routePath = path.join(fullPath, 'route.ts')
            if (fs.existsSync(routePath)) {
              const content = fs.readFileSync(routePath, 'utf8')
              const lines = content.split('\n').length
              
              importScripts.push({
                path: relativePath,
                full_path: fullPath,
                has_route: true,
                lines_of_code: lines,
                last_modified: fs.statSync(routePath).mtime,
                purpose: determinePurpose(item, content)
              })
            } else {
              importScripts.push({
                path: relativePath,
                full_path: fullPath,
                has_route: false,
                purpose: 'Directory without route.ts'
              })
            }
          }
          
          // Recursively search subdirectories
          findImportScripts(fullPath, relativePath)
        }
      }
    }
    
    findImportScripts(apiDir)
    
    // Categorize scripts
    const categories = {
      active_import_scripts: importScripts.filter(s => 
        s.purpose.includes('ACTIVE') || 
        s.path.includes('execute-full-import') ||
        s.path.includes('documents-simple') ||
        s.path.includes('clean-import')
      ),
      customer_import_scripts: importScripts.filter(s => 
        s.path.includes('customer') || s.path.includes('mot')
      ),
      document_import_scripts: importScripts.filter(s => 
        s.path.includes('document') && !s.path.includes('customer')
      ),
      bulk_processing_scripts: importScripts.filter(s => 
        s.path.includes('bulk-processing')
      ),
      deprecated_scripts: importScripts.filter(s => 
        s.purpose.includes('DEPRECATED') ||
        s.purpose.includes('OLD') ||
        s.path.includes('debug') ||
        s.path.includes('test')
      ),
      utility_scripts: importScripts.filter(s => 
        s.path.includes('system') || 
        s.path.includes('cleanup') ||
        s.path.includes('monitor')
      )
    }
    
    // Generate cleanup recommendations
    const recommendations = generateCleanupRecommendations(categories)
    
    return NextResponse.json({
      success: true,
      analysis: {
        total_import_scripts: importScripts.length,
        categories: Object.keys(categories).map(key => ({
          category: key,
          count: categories[key].length,
          scripts: categories[key].map(s => ({
            path: s.path,
            purpose: s.purpose,
            lines: s.lines_of_code,
            last_modified: s.last_modified
          }))
        }))
      },
      cleanup_recommendations: recommendations,
      essential_scripts: [
        'system/clean-import - For complete fresh imports',
        'bulk-processing/execute-full-import - For production imports',
        'bulk-processing/documents-simple - Core document import',
        'mot/import-all-customers - Customer import',
        'job-sheets - Updated with proper numbering'
      ],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[CLEANUP-SCRIPTS] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to analyze scripts",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { action = 'analyze', scripts_to_remove = [] } = await request.json()
    
    if (action === 'remove_deprecated') {
      return await removeDeprecatedScripts(scripts_to_remove)
    }
    
    return NextResponse.json({
      success: false,
      error: "Invalid action",
      valid_actions: ['analyze', 'remove_deprecated']
    }, { status: 400 })
    
  } catch (error) {
    console.error("[CLEANUP-SCRIPTS] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to execute cleanup action",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

function determinePurpose(dirName: string, content: string): string {
  // Analyze the script to determine its purpose
  if (content.includes('execute-full-import') || dirName === 'execute-full-import') {
    return 'ACTIVE - Main production import orchestrator'
  }
  
  if (content.includes('documents-simple') || dirName === 'documents-simple') {
    return 'ACTIVE - Core document import engine'
  }
  
  if (dirName === 'clean-import') {
    return 'ACTIVE - Complete system reset and import'
  }
  
  if (dirName.includes('debug') || dirName.includes('test')) {
    return 'DEPRECATED - Debug/test script'
  }
  
  if (dirName.includes('import-si80349') || dirName.includes('specific')) {
    return 'DEPRECATED - Single record import'
  }
  
  if (dirName.includes('turbo') || dirName.includes('mega')) {
    return 'EXPERIMENTAL - High-speed import variant'
  }
  
  if (dirName.includes('customer')) {
    return 'ACTIVE - Customer data import'
  }
  
  if (dirName.includes('document')) {
    return 'ACTIVE - Document import functionality'
  }
  
  if (dirName.includes('mot')) {
    return 'ACTIVE - MOT and vehicle data import'
  }
  
  if (dirName.includes('bulk-processing')) {
    return 'ACTIVE - Batch processing system'
  }
  
  if (dirName.includes('monitor') || dirName.includes('status')) {
    return 'UTILITY - Monitoring and status'
  }
  
  return 'UNKNOWN - Needs manual review'
}

function generateCleanupRecommendations(categories: any) {
  const recommendations = []
  
  if (categories.deprecated_scripts.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Remove deprecated scripts',
      count: categories.deprecated_scripts.length,
      benefit: 'Reduces clutter and confusion'
    })
  }
  
  if (categories.document_import_scripts.length > 5) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Consolidate document import scripts',
      count: categories.document_import_scripts.length,
      benefit: 'Simplifies maintenance'
    })
  }
  
  if (categories.customer_import_scripts.length > 3) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Consolidate customer import scripts',
      count: categories.customer_import_scripts.length,
      benefit: 'Reduces redundancy'
    })
  }
  
  recommendations.push({
    priority: 'LOW',
    action: 'Create documentation for remaining scripts',
    benefit: 'Improves maintainability'
  })
  
  return recommendations
}

async function removeDeprecatedScripts(scriptsToRemove: string[]) {
  const results = {
    removed: [],
    failed: [],
    total_attempted: scriptsToRemove.length
  }
  
  for (const scriptPath of scriptsToRemove) {
    try {
      const fullPath = path.join(process.cwd(), 'app', 'api', scriptPath)
      
      if (fs.existsSync(fullPath)) {
        // Move to a backup location instead of deleting
        const backupPath = path.join(process.cwd(), 'deprecated_scripts', scriptPath)
        const backupDir = path.dirname(backupPath)
        
        // Create backup directory if it doesn't exist
        fs.mkdirSync(backupDir, { recursive: true })
        
        // Move the directory
        fs.renameSync(fullPath, backupPath)
        
        results.removed.push({
          original: scriptPath,
          backup_location: backupPath
        })
      } else {
        results.failed.push({
          script: scriptPath,
          reason: 'Path does not exist'
        })
      }
    } catch (error) {
      results.failed.push({
        script: scriptPath,
        reason: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return NextResponse.json({
    success: true,
    cleanup_results: results,
    message: `Moved ${results.removed.length} deprecated scripts to backup location`,
    timestamp: new Date().toISOString()
  })
}
