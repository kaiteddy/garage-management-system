import { NextResponse } from "next/server"
import Papa from "papaparse"

export async function POST(request: Request) {
  try {
    console.log('🔧 [CSV-OPTIMIZER] Starting CSV file optimization...')

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file provided",
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const originalSize = file.size
    console.log(`📁 [CSV-OPTIMIZER] Processing ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)} MB)`)

    // Parse the CSV
    const text = await file.text()
    const parsed = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })

    if (parsed.errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Parse errors: ${parsed.errors.map(e => e.message).join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const data = parsed.data as any[]
    console.log(`📊 [CSV-OPTIMIZER] Original: ${data.length} records`)

    // Optimization strategies
    let optimizedData = data

    // 1. Remove completely empty rows
    optimizedData = optimizedData.filter(row => 
      Object.values(row).some(value => value !== null && value !== undefined && value !== '')
    )

    // 2. Trim whitespace from all string fields
    optimizedData = optimizedData.map(row => {
      const trimmedRow = {}
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'string') {
          trimmedRow[key] = value.trim()
        } else {
          trimmedRow[key] = value
        }
      })
      return trimmedRow
    })

    // 3. Remove duplicate rows (based on key fields)
    const keyFields = detectKeyFields(optimizedData)
    if (keyFields.length > 0) {
      const seen = new Set()
      optimizedData = optimizedData.filter(row => {
        const key = keyFields.map(field => row[field]).join('|')
        if (seen.has(key)) {
          return false
        }
        seen.add(key)
        return true
      })
    }

    // 4. Optimize data types and formats
    optimizedData = optimizedData.map(row => {
      const optimizedRow = {}
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'string') {
          // Remove unnecessary quotes
          let optimized = value.replace(/^["']|["']$/g, '')
          
          // Standardize phone numbers
          if (key.toLowerCase().includes('phone') && optimized) {
            optimized = optimized.replace(/[^\d+]/g, '')
          }
          
          // Standardize email addresses
          if (key.toLowerCase().includes('email') && optimized) {
            optimized = optimized.toLowerCase().trim()
          }
          
          // Standardize registration numbers
          if (key.toLowerCase().includes('registration') && optimized) {
            optimized = optimized.toUpperCase().replace(/\s+/g, ' ').trim()
          }
          
          optimizedRow[key] = optimized
        } else {
          optimizedRow[key] = value
        }
      })
      return optimizedRow
    })

    // 5. Remove columns that are completely empty
    const columnsToKeep = Object.keys(optimizedData[0] || {}).filter(column => 
      optimizedData.some(row => row[column] !== null && row[column] !== undefined && row[column] !== '')
    )

    optimizedData = optimizedData.map(row => {
      const filteredRow = {}
      columnsToKeep.forEach(column => {
        filteredRow[column] = row[column]
      })
      return filteredRow
    })

    // Generate optimized CSV
    const optimizedCsv = Papa.unparse(optimizedData, {
      header: true,
      skipEmptyLines: true
    })

    const optimizedSize = new Blob([optimizedCsv]).size
    const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1)

    console.log(`✅ [CSV-OPTIMIZER] Optimized: ${optimizedData.length} records, ${compressionRatio}% size reduction`)

    // Return optimization results
    return NextResponse.json({
      success: true,
      optimization_results: {
        original_size_mb: (originalSize / 1024 / 1024).toFixed(2),
        optimized_size_mb: (optimizedSize / 1024 / 1024).toFixed(2),
        original_records: data.length,
        optimized_records: optimizedData.length,
        compression_ratio: compressionRatio + '%',
        records_removed: data.length - optimizedData.length,
        columns_removed: Object.keys(data[0] || {}).length - columnsToKeep.length,
        key_fields_detected: keyFields
      },
      optimized_csv: optimizedCsv,
      filename: file.name.replace('.csv', '_optimized.csv'),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [CSV-OPTIMIZER] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function detectKeyFields(data: any[]): string[] {
  if (data.length === 0) return []
  
  const fields = Object.keys(data[0])
  const keyFields = []
  
  // Common key field patterns
  const keyPatterns = [
    /^id$/i,
    /^.*_id$/i,
    /^.*id$/i,
    /registration/i,
    /reg/i,
    /phone/i,
    /email/i,
    /doc_number/i,
    /document_number/i,
    /number/i
  ]
  
  fields.forEach(field => {
    // Check if field matches key patterns
    const isKeyField = keyPatterns.some(pattern => pattern.test(field))
    
    if (isKeyField) {
      // Verify field has mostly unique values
      const values = data.map(row => row[field]).filter(v => v !== null && v !== undefined && v !== '')
      const uniqueValues = new Set(values)
      const uniqueRatio = uniqueValues.size / values.length
      
      if (uniqueRatio > 0.8) { // 80% unique values
        keyFields.push(field)
      }
    }
  })
  
  return keyFields
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "CSV Optimizer API is ready",
    supported_optimizations: [
      "Remove empty rows and columns",
      "Trim whitespace from all fields",
      "Remove duplicate records",
      "Standardize data formats",
      "Compress file size"
    ],
    usage: "POST a CSV file to /api/optimize-csv to get an optimized version",
    timestamp: new Date().toISOString()
  })
}
