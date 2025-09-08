import { NextRequest, NextResponse } from 'next/server';
import { searchPartsByVin } from '@/lib/services/partsouq-service';
import { SevenZapService } from '@/lib/services/sevenzap-service';
import { searchPartSouqByVin } from '@/lib/services/partsouq-browser';
import { sql } from '@/lib/database/neon-client';

export async function POST(request: NextRequest) {
  try {
    const { vin, source = 'partsouq', make } = await request.json();

    if (!vin) {
      return NextResponse.json({
        success: false,
        error: 'VIN is required'
      }, { status: 400 });
    }

    // Validate VIN format
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    if (cleanVin.length !== 17 || !/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid VIN format. VIN must be 17 characters long and contain only valid characters (no I, O, or Q).'
      }, { status: 400 });
    }

    console.log(`🔍 [VIN-SEARCH] Searching parts for VIN: ${cleanVin} using source: ${source}`);

    let result;

    if (source === 'partsouq') {
      // Use multi-approach PartSouq service (no fallback)
      console.log('🎯 [VIN-SEARCH] Using PartSouq-only approach');
      result = await searchPartSouqByVin(cleanVin);
    } else if (source === '7zap') {
      // Use 7zap OEM catalog service
      console.log('🏭 [VIN-SEARCH] Using 7zap OEM catalog approach');
      result = await SevenZapService.searchByVin(cleanVin, make);
    } else if (source === 'auto' || !source) {
      // Intelligent source selection: 7zap first (OEM), then PartSouq fallback
      console.log('🤖 [VIN-SEARCH] Using intelligent source selection');
      try {
        console.log('🎯 [VIN-SEARCH] Trying 7zap first (OEM catalogs)...');
        result = await SevenZapService.searchByVin(cleanVin, make);

        if (!result.success || result.parts.length === 0) {
          console.log('🔄 [VIN-SEARCH] 7zap failed, trying PartSouq fallback...');
          const partSouqResult = await searchPartSouqByVin(cleanVin);

          if (partSouqResult.success && partSouqResult.parts.length > 0) {
            result = partSouqResult;
          }
        }
      } catch (error) {
        console.log('❌ [VIN-SEARCH] 7zap failed, using PartSouq fallback');
        result = await searchPartSouqByVin(cleanVin);
      }
    } else {
      // Invalid source specified
      return NextResponse.json({
        success: false,
        error: 'Invalid source. Supported sources: partsouq, 7zap, auto (default)'
      }, { status: 400 });
    }

    // Store successful searches for analytics
    if (result.success && result.parts.length > 0) {
      await logVinSearch(cleanVin, source, result.parts.length, true);
    } else {
      await logVinSearch(cleanVin, source, 0, false);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [VIN-SEARCH] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search parts by VIN',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Search parts in our own database by VIN
async function searchPartsInDatabase(vin: string) {
  try {
    // First, we'd need to decode the VIN to get vehicle info
    // For now, let's do a simple search based on common patterns
    
    // Extract year from VIN (position 10)
    const yearCode = vin.charAt(9);
    const yearCodes: { [key: string]: number } = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
      'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
      'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, '1': 2001, '2': 2002,
      '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
    };
    const year = yearCodes[yearCode] || new Date().getFullYear();

    // Extract manufacturer info from WMI (first 3 characters)
    const wmi = vin.substring(0, 3);
    let make = '';
    
    // Simple manufacturer detection
    if (wmi.startsWith('WBA') || wmi.startsWith('WBS')) make = 'BMW';
    else if (wmi.startsWith('WDB') || wmi.startsWith('WDD')) make = 'Mercedes-Benz';
    else if (wmi.startsWith('WVW') || wmi.startsWith('WV1')) make = 'Volkswagen';
    else if (wmi.startsWith('WAU') || wmi.startsWith('WA1')) make = 'Audi';
    else if (wmi.startsWith('1G1') || wmi.startsWith('1GC')) make = 'Chevrolet';
    else if (wmi.startsWith('1FA') || wmi.startsWith('1FT')) make = 'Ford';
    else if (wmi.startsWith('JHM') || wmi.startsWith('JH4')) make = 'Honda';
    else if (wmi.startsWith('JT')) make = 'Toyota';
    else if (wmi.startsWith('KMH') || wmi.startsWith('KM8')) make = 'Hyundai';
    else if (wmi.startsWith('KN')) make = 'Kia';

    console.log(`🔍 [DB-SEARCH] Decoded VIN - Make: ${make}, Year: ${year}`);

    // Search parts in our database
    let query = `
      SELECT 
        id, part_number, description, category, subcategory,
        cost_net, price_retail_net, quantity_in_stock,
        supplier_name, manufacturer, brand,
        vehicle_makes, vehicle_models, year_from, year_to,
        created_at, updated_at
      FROM parts 
      WHERE is_active = true
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (make) {
      query += ` AND ($${paramIndex} = ANY(vehicle_makes) OR manufacturer ILIKE $${paramIndex + 1})`;
      queryParams.push(make, `%${make}%`);
      paramIndex += 2;
    }

    if (year) {
      query += ` AND (year_from IS NULL OR year_from <= $${paramIndex}) AND (year_to IS NULL OR year_to >= $${paramIndex})`;
      queryParams.push(year);
      paramIndex += 1;
    }

    query += ` ORDER BY 
      CASE WHEN $${paramIndex} = ANY(vehicle_makes) THEN 1 ELSE 2 END,
      manufacturer,
      part_number
      LIMIT 100`;
    queryParams.push(make || '');

    const result = await sql.query(query, queryParams);
    const parts = result.rows || [];

    console.log(`✅ [DB-SEARCH] Found ${parts.length} parts for VIN ${vin}`);

    return {
      success: true,
      parts: parts.map(part => ({
        id: part.id,
        partNumber: part.part_number,
        description: part.description,
        brand: part.brand || part.manufacturer,
        price: parseFloat(part.price_retail_net || '0'),
        currency: 'GBP',
        availability: part.quantity_in_stock > 0 ? 'In Stock' : 'Out of Stock',
        category: part.category,
        subcategory: part.subcategory,
        supplier: {
          name: part.supplier_name
        },
        compatibility: {
          make: make,
          year: year
        }
      })),
      totalCount: parts.length,
      page: 1,
      pageSize: parts.length,
      vehicle: {
        make: make,
        model: 'Unknown',
        year: year,
        vin: vin
      },
      source: 'database'
    };

  } catch (error) {
    console.error('❌ [DB-SEARCH] Database search failed:', error);
    return {
      success: false,
      parts: [],
      totalCount: 0,
      page: 1,
      pageSize: 0,
      error: 'Database search failed',
      source: 'database'
    };
  }
}

// Log VIN searches for analytics
async function logVinSearch(vin: string, source: string, resultsCount: number, success: boolean) {
  try {
    await sql.query(`
      INSERT INTO partsouq_api_usage (
        request_type, search_query, results_count, success, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, ['vin_search', vin, resultsCount, success]);
  } catch (error) {
    console.error('Failed to log VIN search:', error);
  }
}

// GET endpoint for simple VIN searches via URL params
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin');
    const source = searchParams.get('source') || 'partsouq';

    if (!vin) {
      return NextResponse.json({
        success: false,
        error: 'VIN parameter is required'
      }, { status: 400 });
    }

    // Reuse the POST logic
    const mockRequest = new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ vin, source })
    });

    return POST(mockRequest as NextRequest);

  } catch (error) {
    console.error('❌ [VIN-SEARCH-GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search parts by VIN'
    }, { status: 500 });
  }
}
