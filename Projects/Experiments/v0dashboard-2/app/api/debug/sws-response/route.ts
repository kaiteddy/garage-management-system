import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'LN64XFG'
    
    console.log(`🔍 [DEBUG] Examining SWS response for ${vrm}`)
    
    // Get technical data from our API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vin-technical-data?vrm=${vrm}`)
    const data = await response.json()
    
    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get technical data'
      }, { status: 404 })
    }
    
    // Function to search for any image-related content
    function findImageReferences(obj: any, path: string = ''): any[] {
      const results: any[] = []
      
      function recurse(current: any, currentPath: string): void {
        if (typeof current === 'string') {
          // Look for any image-related strings
          if (current.includes('.svgz') || 
              current.includes('.svg') || 
              current.includes('.jpg') || 
              current.includes('.png') || 
              current.includes('image') || 
              current.includes('workshop') ||
              current.includes('haynespro-assets')) {
            results.push({
              path: currentPath,
              value: current,
              type: 'string'
            })
          }
        } else if (typeof current === 'object' && current !== null) {
          if (Array.isArray(current)) {
            current.forEach((item, index) => {
              recurse(item, `${currentPath}[${index}]`)
            })
          } else {
            Object.entries(current).forEach(([key, value]) => {
              recurse(value, currentPath ? `${currentPath}.${key}` : key)
            })
          }
        }
      }
      
      recurse(obj, path)
      return results
    }
    
    // Search for image references in the entire response
    const imageReferences = findImageReferences(data)

    // Check for the specific TechnicalData structure
    const technicalDataCheck = {
      hasZeroKey: data.data && '0' in data.data,
      hasTechnicalData: data.data?.['0']?.['TechnicalData'],
      hasModelPicture: data.data?.['0']?.['TechnicalData']?.['modelPictureMimeDataName'],
      modelPictureValue: data.data?.['0']?.['TechnicalData']?.['modelPictureMimeDataName'],
      dataStructure: data.data ? Object.keys(data.data) : [],
      firstItemStructure: data.data?.['0'] ? Object.keys(data.data['0']) : []
    }
    
    // Also search in each category's raw HTML
    const htmlAnalysis: any = {}
    for (const [category, categoryData] of Object.entries(data.data)) {
      if (typeof categoryData === 'object' && categoryData !== null && 'raw' in categoryData) {
        const htmlContent = (categoryData as any).raw
        if (typeof htmlContent === 'string') {
          // Look for image patterns in HTML
          const svgzMatches = htmlContent.match(/[^"'\s]*\.svgz[^"'\s]*/g) || []
          const imageMatches = htmlContent.match(/<img[^>]*src=["']([^"']*)["']/g) || []
          const workshopMatches = htmlContent.match(/workshop\/images\/[^"'\s]*/g) || []
          
          htmlAnalysis[category] = {
            svgzMatches,
            imageMatches: imageMatches.map(match => match.match(/src=["']([^"']*)["']/)?.[1]).filter(Boolean),
            workshopMatches,
            htmlLength: htmlContent.length,
            containsWorkshop: htmlContent.includes('workshop'),
            containsSvgz: htmlContent.includes('.svgz'),
            containsHaynesPro: htmlContent.includes('haynespro')
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      vrm,
      summary: {
        totalImageReferences: imageReferences.length,
        categoriesAnalyzed: Object.keys(htmlAnalysis).length,
        hasImageReferences: imageReferences.length > 0
      },
      technicalDataCheck,
      imageReferences: imageReferences.slice(0, 20), // Limit to first 20 to avoid huge response
      htmlAnalysis,
      sampleData: {
        firstCategory: Object.keys(data.data)[0],
        firstCategoryKeys: Object.keys(data.data[Object.keys(data.data)[0]] || {}),
        responseStructure: Object.keys(data.data)
      }
    })
    
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'This endpoint only accepts GET requests'
  }, { status: 405 })
}
