import { NextRequest, NextResponse } from 'next/server';

// Mock PartSouq search that works without external API calls
export async function POST(request: NextRequest) {
  try {
    const { vin } = await request.json();

    if (!vin) {
      return NextResponse.json({
        success: false,
        error: 'VIN is required'
      }, { status: 400 });
    }

    console.log(`🎭 [MOCK] Simulating PartSouq search for VIN: ${vin}`);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock successful response based on VIN
    const mockResponse = {
      success: true,
      parts: [
        {
          id: '1',
          name: 'Engine Oil Filter',
          partNumber: '11427566327',
          category: 'Engine',
          subcategory: 'Lubrication',
          price: '£12.50',
          availability: 'In Stock',
          description: 'Original BMW oil filter for 2.0L engines',
          imageUrl: '/placeholder-part.jpg'
        },
        {
          id: '2',
          name: 'Air Filter',
          partNumber: '13717532754',
          category: 'Engine',
          subcategory: 'Air Intake',
          price: '£18.75',
          availability: 'In Stock',
          description: 'High-quality air filter element',
          imageUrl: '/placeholder-part.jpg'
        },
        {
          id: '3',
          name: 'Brake Pads Front',
          partNumber: '34116794300',
          category: 'Brakes',
          subcategory: 'Brake Pads',
          price: '£45.99',
          availability: 'Limited Stock',
          description: 'Front brake pad set for BMW 2 Series',
          imageUrl: '/placeholder-part.jpg'
        },
        {
          id: '4',
          name: 'Spark Plugs (Set of 4)',
          partNumber: '12120037607',
          category: 'Engine',
          subcategory: 'Ignition',
          price: '£32.00',
          availability: 'In Stock',
          description: 'NGK spark plugs for optimal performance',
          imageUrl: '/placeholder-part.jpg'
        }
      ],
      totalCount: 4,
      page: 1,
      pageSize: 10,
      vehicle: {
        make: 'BMW',
        model: '220i',
        year: 2017,
        engine: '2D52',
        vin: vin,
        vehicleCode: 'BMW202501',
        vehicleId: '1136468753'
      },
      metadata: {
        searchTime: '2.1 seconds',
        method: 'Mock Simulation',
        totalResults: 247,
        cloudflareBypass: true,
        timestamp: new Date().toISOString(),
        note: 'This is mock data demonstrating the PartSouq integration functionality'
      }
    };

    console.log(`✅ [MOCK] Returning ${mockResponse.parts.length} mock parts for ${vin}`);

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('❌ [MOCK] Mock search failed:', error);
    return NextResponse.json({
      success: false,
      parts: [],
      totalCount: 0,
      error: 'Mock search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get('vin') || 'WBA2D520X05E20424';

  const mockRequest = new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ vin })
  });

  return POST(mockRequest as NextRequest);
}
