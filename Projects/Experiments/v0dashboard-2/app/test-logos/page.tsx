'use client';

import { ManufacturerLogo } from '@/components/ui/manufacturer-logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestLogosPage() {
  const testMakes = [
    'BMW',
    'Mercedes',
    'Audi', 
    'Ford',
    'Vauxhall',
    'Volkswagen',
    'Toyota',
    'Honda',
    'Nissan',
    'Hyundai',
    'Kia',
    'Peugeot',
    'Renault',
    'Citroen',
    'Fiat',
    'MINI',
    'Land Rover',
    'Jaguar',
    'Volvo',
    'Mazda',
    'Subaru',
    'Mitsubishi',
    'Skoda',
    'SEAT'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Manufacturer Logo Test</h1>
        <p className="text-muted-foreground">
          Testing logo loading for all supported manufacturers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo Loading Test</CardTitle>
          <CardDescription>
            Each logo should load properly or show a branded fallback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {testMakes.map((make) => (
              <div key={make} className="text-center space-y-2">
                <ManufacturerLogo 
                  make={make} 
                  size="lg" 
                  className="justify-center"
                />
                <p className="text-sm font-medium">{make}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Different Sizes</CardTitle>
          <CardDescription>
            Testing BMW logo in different sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center space-y-2">
              <ManufacturerLogo make="BMW" size="sm" />
              <p className="text-xs">Small</p>
            </div>
            <div className="text-center space-y-2">
              <ManufacturerLogo make="BMW" size="md" />
              <p className="text-xs">Medium</p>
            </div>
            <div className="text-center space-y-2">
              <ManufacturerLogo make="BMW" size="lg" />
              <p className="text-xs">Large</p>
            </div>
            <div className="text-center space-y-2">
              <ManufacturerLogo make="BMW" size="xl" />
              <p className="text-xs">Extra Large</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>With Names</CardTitle>
          <CardDescription>
            Testing logos with manufacturer names displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['BMW', 'Mercedes', 'Audi', 'Ford', 'Vauxhall', 'Toyota'].map((make) => (
              <div key={make} className="p-3 border rounded-lg">
                <ManufacturerLogo 
                  make={make} 
                  size="md" 
                  showName={true}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>
            Check browser console for logo loading messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Open browser developer tools (F12) and check the Console tab for logo loading messages.
              You should see either "Successfully loaded logo for [Brand]" or "Failed to load logo for [Brand]" messages.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              If logos are showing fallback letters instead of images, check the Network tab to see if there are any failed requests.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
