// Shared types for vehicle-related components

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  vehicles?: Array<{
    registration: string;
    make: string;
    model: string;
    year: string;
    motStatus: string;
    motExpiry?: string;
  }>;
}

export interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: string;
  customer: Customer | null;
  motExpiry: string | null;
  motStatus: string;
  colour?: string;
  fuelType?: string;
  vin?: string;
  engineCode?: string;
  mileage?: number;
  lastServiceDate?: string;
  nextServiceDue?: string;
  taxStatus?: string;
  insuranceStatus?: string;
  motTestNumber?: string;
  motTestExpiryDate?: string;
  motTestResult?: string;
  motTestMileage?: string;
  motTestMileageUnit?: string;
  motTestNumberExpiryDate?: string;
  motTestExpiryDateFormatted?: string;
  motTestNumberExpiryDateFormatted?: string;
  motTestExpiryDateFormattedLong?: string;
  motTestNumberExpiryDateFormattedLong?: string;
  motTestExpiryDateFormattedShort?: string;
  motTestNumberExpiryDateFormattedShort?: string;
}
