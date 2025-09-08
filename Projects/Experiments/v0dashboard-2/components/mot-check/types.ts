export type MOTTestResult = {
  completedDate: string;
  expiryDate: string | null;
  odometerValue: number | null;
  odometerUnit: string;
  testResult: string;
  testNumber: string;
  defects: MOTDefect[];
};

export type MOTDefect = {
  text: string;
  type: 'DANGEROUS' | 'MAJOR' | 'MINOR' | 'ADVISORY' | 'FAIL' | 'PASS' | 'USER ENTERED';
  dangerous?: boolean;
};

export type MOTCheckResult = {
  registration: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  fuelType?: string;
  colour?: string;
  motStatus?: string;
  motExpiryDate?: string;
  nextTestDue?: string;
  hasOutstandingRecalls?: boolean;
  motTests?: MOTTestResult[];
  lastTest?: MOTTestResult;
  error?: string;
  details?: string;
  apiErrors?: string[];
};

export type MOTTestCenter = {
  id: string;
  name: string;
  distance: string;
  address: string;
  postcode: string;
  rating: number;
  phone: string;
  email?: string;
  website?: string;
  openingHours?: {
    [key: string]: string;
  };
  facilities?: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
};

export type SearchHistoryItem = {
  registration: string;
  date: string;
  data?: MOTCheckResult;
};

export type FavoriteVehicle = {
  id: string;
  registration: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  addedAt: string;
  notes?: string;
};
