import { NextResponse } from 'next/server';
import { getVehicleDetails } from '@/lib/dvla';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const registration = searchParams.get('registration');

  if (!registration) {
    return NextResponse.json(
      { error: 'Registration number is required' },
      { status: 400 }
    );
  }

  try {
    const vehicleDetails = await getVehicleDetails(registration);
    return NextResponse.json(vehicleDetails);
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch vehicle details',
        registration
      },
      { status: 500 }
    );
  }
}
