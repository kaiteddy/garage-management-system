import { NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log("[COMPREHENSIVE-IMPORT-STATUS] Checking import readiness...")

    const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports'
    
    // Define expected files
    const expectedFiles = [
      'Customers.csv',
      'Vehicles.csv', 
      'Documents.csv',
      'LineItems.csv',
      'Document_Extras.csv',
      'Receipts.csv'
    ]

    const fileStatus = []
    let totalRecords = 0
    let allFilesPresent = true

    for (const fileName of expectedFiles) {
      const filePath = path.join(basePath, fileName)
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        const recordCount = Math.max(0, lines.length - 1) // Subtract header
        
        totalRecords += recordCount
        
        fileStatus.push({
          name: fileName,
          present: true,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          records: recordCount,
          lastModified: stats.mtime,
          headers: lines[0] ? lines[0].split(',').map(h => h.replace(/"/g, '').trim()).slice(0, 5) : []
        })
      } else {
        allFilesPresent = false
        fileStatus.push({
          name: fileName,
          present: false,
          size: 0,
          sizeFormatted: '0 B',
          records: 0,
          lastModified: null,
          headers: []
        })
      }
    }

    // Calculate estimated import time
    const estimatedMinutes = Math.ceil(totalRecords / 1000) // Rough estimate: 1000 records per minute
    
    return NextResponse.json({
      success: true,
      ready: allFilesPresent,
      basePath,
      files: fileStatus,
      summary: {
        totalFiles: expectedFiles.length,
        presentFiles: fileStatus.filter(f => f.present).length,
        totalRecords,
        estimatedImportTime: `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
      },
      importPhases: [
        {
          phase: 1,
          name: "Clean Import Preparation",
          description: "Backup existing data and prepare clean slate",
          endpoint: "/api/system/clean-import",
          estimatedTime: "5-10 minutes"
        },
        {
          phase: 2,
          name: "Core Data Import",
          description: "Import customers and vehicles (foundation data)",
          endpoint: "/api/mot/import-from-original-source", 
          estimatedTime: "15-30 minutes",
          expectedRecords: fileStatus.find(f => f.name === 'Customers.csv')?.records + fileStatus.find(f => f.name === 'Vehicles.csv')?.records
        },
        {
          phase: 3,
          name: "Document System Import",
          description: "Import complete document history with line items",
          endpoint: "/api/documents/import-complete-history",
          estimatedTime: "60-120 minutes",
          expectedRecords: fileStatus.find(f => f.name === 'Documents.csv')?.records + fileStatus.find(f => f.name === 'LineItems.csv')?.records
        },
        {
          phase: 4,
          name: "Data Enhancement",
          description: "DVLA updates and MOT history integration",
          endpoint: "/api/bulk-processing/execute-full-import",
          estimatedTime: "30-60 minutes"
        },
        {
          phase: 5,
          name: "Final Verification",
          description: "Data integrity checks and optimization",
          endpoint: "/api/system/clean-import",
          estimatedTime: "10-15 minutes"
        }
      ],
      recommendations: allFilesPresent ? [
        "✅ All required files are present",
        "📊 Ready to import " + totalRecords.toLocaleString() + " total records",
        "⏰ Estimated total time: " + `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`,
        "🔄 Execute phases sequentially for best results",
        "💾 Backup will be created automatically"
      ] : [
        "❌ Missing required files - cannot proceed",
        "📁 Check Google Drive Data Exports folder",
        "🔄 Ensure all exports completed successfully",
        "📞 Contact support if files are missing"
      ]
    })

  } catch (error) {
    console.error("[COMPREHENSIVE-IMPORT-STATUS] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check import status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
