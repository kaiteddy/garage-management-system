// VIN Decoder utility for extracting vehicle information
// This is a simplified VIN decoder - in production you might want to use a more comprehensive service

export interface VehicleInfo {
  vin: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  body_style?: string;
  trim?: string;
  country: string;
  manufacturer: string;
}

export interface VinDecodeResult {
  success: boolean;
  vehicle?: VehicleInfo;
  error?: string;
}

// VIN position mappings (simplified)
const VIN_POSITIONS = {
  COUNTRY: 0,
  MANUFACTURER: 1,
  VEHICLE_TYPE: 2,
  YEAR: 9,
  PLANT: 10,
  SERIAL: [11, 12, 13, 14, 15, 16]
};

// Year encoding for position 9
const YEAR_CODES: { [key: string]: number } = {
  'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984, 'F': 1985, 'G': 1986, 'H': 1987,
  'J': 1988, 'K': 1989, 'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994, 'S': 1995,
  'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999, 'Y': 2000, '1': 2001, '2': 2002, '3': 2003,
  '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009, 'A': 2010, 'B': 2011,
  'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025
};

// Country codes (first character)
const COUNTRY_CODES: { [key: string]: string } = {
  '1': 'United States', '2': 'Canada', '3': 'Mexico', '4': 'United States', '5': 'United States',
  '6': 'Australia', '7': 'New Zealand', '8': 'Argentina', '9': 'Brazil',
  'A': 'South Africa', 'B': 'South Africa', 'C': 'Canada', 'D': 'Canada', 'E': 'Canada',
  'F': 'Canada', 'G': 'Canada', 'H': 'Canada', 'J': 'Japan', 'K': 'South Korea',
  'L': 'China', 'M': 'India', 'N': 'Turkey', 'P': 'Portugal', 'R': 'Taiwan',
  'S': 'United Kingdom', 'T': 'Czech Republic', 'U': 'Romania', 'V': 'France',
  'W': 'Germany', 'X': 'Russia', 'Y': 'Sweden', 'Z': 'Italy'
};

// Manufacturer codes (World Manufacturer Identifier - first 3 characters)
const MANUFACTURER_CODES: { [key: string]: { make: string; manufacturer: string } } = {
  // German manufacturers
  'WBA': { make: 'BMW', manufacturer: 'BMW AG' },
  'WBS': { make: 'BMW', manufacturer: 'BMW AG' },
  'WBY': { make: 'BMW', manufacturer: 'BMW AG' },
  'WDB': { make: 'Mercedes-Benz', manufacturer: 'Mercedes-Benz AG' },
  'WDC': { make: 'Mercedes-Benz', manufacturer: 'Mercedes-Benz AG' },
  'WDD': { make: 'Mercedes-Benz', manufacturer: 'Mercedes-Benz AG' },
  'WVW': { make: 'Volkswagen', manufacturer: 'Volkswagen AG' },
  'WV1': { make: 'Volkswagen', manufacturer: 'Volkswagen AG' },
  'WV2': { make: 'Volkswagen', manufacturer: 'Volkswagen AG' },
  'WAU': { make: 'Audi', manufacturer: 'Audi AG' },
  'WA1': { make: 'Audi', manufacturer: 'Audi AG' },
  'WP0': { make: 'Porsche', manufacturer: 'Porsche AG' },
  
  // UK manufacturers
  'SAJ': { make: 'Jaguar', manufacturer: 'Jaguar Land Rover' },
  'SAL': { make: 'Land Rover', manufacturer: 'Jaguar Land Rover' },
  'SAR': { make: 'Jaguar', manufacturer: 'Jaguar Land Rover' },
  'SAT': { make: 'Land Rover', manufacturer: 'Jaguar Land Rover' },
  'SCC': { make: 'Lotus', manufacturer: 'Lotus Cars' },
  'SCE': { make: 'DeLorean', manufacturer: 'DeLorean Motor Company' },
  'SFD': { make: 'Alexander Dennis', manufacturer: 'Alexander Dennis' },
  
  // French manufacturers
  'VF1': { make: 'Renault', manufacturer: 'Renault' },
  'VF3': { make: 'Peugeot', manufacturer: 'Peugeot' },
  'VF7': { make: 'Citroën', manufacturer: 'Citroën' },
  'VF8': { make: 'Matra', manufacturer: 'Matra' },
  'VFE': { make: 'IvecoBus', manufacturer: 'Iveco' },
  
  // US manufacturers
  '1G1': { make: 'Chevrolet', manufacturer: 'General Motors' },
  '1G6': { make: 'Cadillac', manufacturer: 'General Motors' },
  '1GM': { make: 'Pontiac', manufacturer: 'General Motors' },
  '1GC': { make: 'Chevrolet', manufacturer: 'General Motors' },
  '1FA': { make: 'Ford', manufacturer: 'Ford Motor Company' },
  '1FB': { make: 'Ford', manufacturer: 'Ford Motor Company' },
  '1FC': { make: 'Ford', manufacturer: 'Ford Motor Company' },
  '1FD': { make: 'Ford', manufacturer: 'Ford Motor Company' },
  '1FT': { make: 'Ford', manufacturer: 'Ford Motor Company' },
  '1FU': { make: 'Freightliner', manufacturer: 'Freightliner' },
  '1FV': { make: 'Freightliner', manufacturer: 'Freightliner' },
  '1C3': { make: 'Chrysler', manufacturer: 'Stellantis' },
  '1C4': { make: 'Chrysler', manufacturer: 'Stellantis' },
  '1C6': { make: 'Chrysler', manufacturer: 'Stellantis' },
  '1D3': { make: 'Dodge', manufacturer: 'Stellantis' },
  '1D4': { make: 'Dodge', manufacturer: 'Stellantis' },
  '1D7': { make: 'Dodge', manufacturer: 'Stellantis' },
  
  // Japanese manufacturers
  'JHM': { make: 'Honda', manufacturer: 'Honda Motor Co.' },
  'JH4': { make: 'Acura', manufacturer: 'Honda Motor Co.' },
  'JF1': { make: 'Subaru', manufacturer: 'Subaru Corporation' },
  'JF2': { make: 'Subaru', manufacturer: 'Subaru Corporation' },
  'JM1': { make: 'Mazda', manufacturer: 'Mazda Motor Corporation' },
  'JM3': { make: 'Mazda', manufacturer: 'Mazda Motor Corporation' },
  'JN1': { make: 'Nissan', manufacturer: 'Nissan Motor Co.' },
  'JN6': { make: 'Nissan', manufacturer: 'Nissan Motor Co.' },
  'JN8': { make: 'Nissan', manufacturer: 'Nissan Motor Co.' },
  'JT2': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JT3': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JT4': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JT6': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JT8': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTD': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTE': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTF': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTG': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTH': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTJ': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTK': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTL': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTM': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  'JTN': { make: 'Toyota', manufacturer: 'Toyota Motor Corporation' },
  
  // Korean manufacturers
  'KMH': { make: 'Hyundai', manufacturer: 'Hyundai Motor Company' },
  'KM8': { make: 'Hyundai', manufacturer: 'Hyundai Motor Company' },
  'KNA': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNB': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNC': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KND': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNE': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNF': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNG': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNH': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNJ': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNK': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNL': { make: 'Kia', manufacturer: 'Kia Corporation' },
  'KNM': { make: 'Kia', manufacturer: 'Kia Corporation' }
};

export function validateVin(vin: string): boolean {
  // Basic VIN validation
  if (!vin || typeof vin !== 'string') return false;
  
  // Remove spaces and convert to uppercase
  const cleanVin = vin.replace(/\s/g, '').toUpperCase();
  
  // Check length
  if (cleanVin.length !== 17) return false;
  
  // Check for invalid characters (I, O, Q are not allowed)
  if (/[IOQ]/.test(cleanVin)) return false;
  
  // Check for valid characters (alphanumeric except I, O, Q)
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) return false;
  
  return true;
}

export function decodeVin(vin: string): VinDecodeResult {
  try {
    if (!validateVin(vin)) {
      return {
        success: false,
        error: 'Invalid VIN format. VIN must be 17 characters long and contain only valid characters (no I, O, or Q).'
      };
    }

    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    
    // Extract basic information
    const wmi = cleanVin.substring(0, 3); // World Manufacturer Identifier
    const yearCode = cleanVin.charAt(VIN_POSITIONS.YEAR);
    const countryCode = cleanVin.charAt(VIN_POSITIONS.COUNTRY);
    
    // Decode year
    let year = YEAR_CODES[yearCode];
    if (!year) {
      // Handle years after 2025 (cycle repeats)
      if (yearCode >= 'A' && yearCode <= 'H') {
        year = 2010 + (yearCode.charCodeAt(0) - 'A'.charCodeAt(0));
      } else if (yearCode >= '1' && yearCode <= '9') {
        year = 2001 + parseInt(yearCode) - 1;
      }
    }
    
    // Decode country
    const country = COUNTRY_CODES[countryCode] || 'Unknown';
    
    // Decode manufacturer
    const manufacturerInfo = MANUFACTURER_CODES[wmi];
    let make = 'Unknown';
    let manufacturer = 'Unknown';
    
    if (manufacturerInfo) {
      make = manufacturerInfo.make;
      manufacturer = manufacturerInfo.manufacturer;
    } else {
      // Try partial matches for less common manufacturers
      const wmi2 = cleanVin.substring(0, 2);
      for (const [code, info] of Object.entries(MANUFACTURER_CODES)) {
        if (code.startsWith(wmi2)) {
          make = info.make;
          manufacturer = info.manufacturer;
          break;
        }
      }
    }

    const vehicle: VehicleInfo = {
      vin: cleanVin,
      make,
      model: 'Unknown', // Would need more detailed VIN database for specific models
      year: year || new Date().getFullYear(),
      country,
      manufacturer
    };

    return {
      success: true,
      vehicle
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to decode VIN: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Enhanced VIN decoding using external APIs (optional)
export async function decodeVinWithApi(vin: string, apiKey?: string): Promise<VinDecodeResult> {
  try {
    // First try basic decoding
    const basicResult = decodeVin(vin);
    if (!basicResult.success) {
      return basicResult;
    }

    // If we have an API key, we could enhance with external services
    // For now, return the basic result
    return basicResult;

  } catch (error) {
    return {
      success: false,
      error: `API VIN decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
