import { NextRequest, NextResponse } from 'next/server'

// Vehicle colors based on make
const VEHICLE_COLORS = {
  'VOLKSWAGEN': { primary: '#1e40af', secondary: '#3b82f6', accent: '#dbeafe' },
  'BMW': { primary: '#1f2937', secondary: '#374151', accent: '#f3f4f6' },
  'AUDI': { primary: '#dc2626', secondary: '#ef4444', accent: '#fee2e2' },
  'FORD': { primary: '#1e3a8a', secondary: '#3b82f6', accent: '#dbeafe' },
  'MERCEDES': { primary: '#374151', secondary: '#6b7280', accent: '#f9fafb' },
  'NISSAN': { primary: '#dc2626', secondary: '#ef4444', accent: '#fee2e2' },
  'TOYOTA': { primary: '#dc2626', secondary: '#ef4444', accent: '#fee2e2' },
  'HONDA': { primary: '#dc2626', secondary: '#ef4444', accent: '#fee2e2' },
  'DEFAULT': { primary: '#6b7280', secondary: '#9ca3af', accent: '#f3f4f6' }
}

// Vehicle body types for different models
const VEHICLE_BODY_TYPES = {
  'GOLF': 'hatchback',
  'POLO': 'hatchback',
  'FOCUS': 'hatchback',
  'FIESTA': 'hatchback',
  'MICRA': 'hatchback',
  'A3': 'hatchback',
  'A4': 'sedan',
  'A6': 'sedan',
  '3 SERIES': 'sedan',
  '5 SERIES': 'sedan',
  'C-CLASS': 'sedan',
  'E-CLASS': 'sedan',
  'TIGUAN': 'suv',
  'Q5': 'suv',
  'X3': 'suv',
  'GLC': 'suv',
  'TRANSIT': 'van'
}

function generateVehicleSVG(vrm: string, make: string, model: string, year?: string): string {
  const colors = VEHICLE_COLORS[make.toUpperCase()] || VEHICLE_COLORS.DEFAULT
  const bodyType = VEHICLE_BODY_TYPES[model.toUpperCase()] || 'sedan'
  
  // Generate different car shapes based on body type
  let carPath = ''
  let carHeight = 120
  
  switch (bodyType) {
    case 'hatchback':
      carPath = 'M60 140 L60 160 L80 170 L320 170 L340 160 L340 140 L330 120 L310 100 L290 90 L110 90 L90 100 L70 120 Z'
      carHeight = 100
      break
    case 'suv':
      carPath = 'M50 130 L50 150 L70 160 L330 160 L350 150 L350 130 L340 110 L320 90 L300 80 L100 80 L80 90 L60 110 Z'
      carHeight = 110
      break
    case 'van':
      carPath = 'M40 120 L40 140 L60 150 L340 150 L360 140 L360 120 L350 100 L330 80 L320 70 L80 70 L70 80 L50 100 Z'
      carHeight = 120
      break
    default: // sedan
      carPath = 'M55 135 L55 155 L75 165 L325 165 L345 155 L345 135 L335 115 L315 95 L295 85 L105 85 L85 95 L65 115 Z'
      carHeight = 110
  }

  return `
    <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="400" height="200" fill="${colors.accent}"/>
      
      <!-- Car body -->
      <path d="${carPath}" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="2"/>
      
      <!-- Windshield -->
      <path d="M105 85 L125 65 L275 65 L295 85" fill="#87ceeb" stroke="${colors.secondary}" stroke-width="1"/>
      
      <!-- Side windows -->
      <path d="M125 65 L145 55 L255 55 L275 65" fill="#87ceeb" stroke="${colors.secondary}" stroke-width="1"/>
      
      <!-- Front wheel -->
      <circle cx="120" cy="165" r="20" fill="#1f2937" stroke="${colors.secondary}" stroke-width="2"/>
      <circle cx="120" cy="165" r="12" fill="#4b5563"/>
      
      <!-- Rear wheel -->
      <circle cx="280" cy="165" r="20" fill="#1f2937" stroke="${colors.secondary}" stroke-width="2"/>
      <circle cx="280" cy="165" r="12" fill="#4b5563"/>
      
      <!-- Headlight -->
      <ellipse cx="65" cy="125" rx="8" ry="12" fill="#fbbf24" stroke="${colors.secondary}" stroke-width="1"/>
      
      <!-- Taillight -->
      <ellipse cx="335" cy="125" rx="6" ry="10" fill="#ef4444" stroke="${colors.secondary}" stroke-width="1"/>
      
      <!-- License plate -->
      <rect x="170" y="175" width="60" height="15" fill="white" stroke="${colors.secondary}" stroke-width="1" rx="2"/>
      <text x="200" y="186" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="black">${vrm}</text>
      
      <!-- Vehicle info -->
      <rect x="10" y="10" width="380" height="40" fill="rgba(255,255,255,0.9)" rx="5"/>
      <text x="20" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${colors.primary}">${make} ${model}</text>
      <text x="20" y="42" font-family="Arial, sans-serif" font-size="12" fill="${colors.secondary}">${vrm}${year ? ` • ${year}` : ''}</text>
      
      <!-- Brand badge -->
      <circle cx="350" cy="30" r="15" fill="${colors.primary}"/>
      <text x="350" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white">${make.charAt(0)}</text>
    </svg>
  `
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'ABC123'
    const make = searchParams.get('make') || 'VEHICLE'
    const model = searchParams.get('model') || 'MODEL'
    const year = searchParams.get('year')
    
    console.log(`🎨 [VEHICLE-SVG] Generating SVG for ${vrm}: ${make} ${model}`)
    
    const svg = generateVehicleSVG(vrm, make, model, year)
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    })
    
  } catch (error) {
    console.error('❌ [VEHICLE-SVG] Error:', error)
    
    // Return a basic fallback SVG
    const fallbackSVG = `
      <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f3f4f6"/>
        <rect x="50" y="50" width="300" height="100" fill="#6b7280" rx="10"/>
        <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="16" fill="white">Vehicle Image</text>
      </svg>
    `
    
    return new NextResponse(fallbackSVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      }
    })
  }
}
