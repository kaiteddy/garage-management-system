'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  CheckCircle, 
  Factory, 
  Globe,
  Zap,
  Search,
  Database,
  Image as ImageIcon,
  TrendingUp
} from 'lucide-react';

export function SevenZapExplanation() {
  return (
    <div className="space-y-6">
      {/* Main Introduction */}
      <Alert className="border-green-200 bg-green-50">
        <Star className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-green-800">
              🎉 NEW: 7zap.com Integration - Superior OEM Parts Catalog!
            </p>
            <p className="text-green-700">
              Based on your latest Fiddler capture, I've discovered 7zap.com - a comprehensive 
              automotive marketplace with OEM catalogs and VIN-based search. This is a major upgrade!
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* What is 7zap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            What is 7zap.com?
          </CardTitle>
          <CardDescription>
            Understanding this superior automotive parts marketplace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Features */}
            <div className="space-y-3">
              <h3 className="font-medium">🎯 Key Features:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                  <span>OEM (Original Equipment Manufacturer) catalogs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                  <span>VIN-based parts search functionality</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                  <span>Brand-specific subdomains (bmw.7zap.com, etc.)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                  <span>International marketplace with global suppliers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                  <span>Rich media: vehicle images and part images</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                  <span>Multiple categories: OEM, aftermarket, oils</span>
                </div>
              </div>
            </div>

            {/* Advantages */}
            <div className="space-y-3">
              <h3 className="font-medium">🚀 Advantages over PartSouq:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🏭</Badge>
                  <span>Focus on OEM original parts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🔍</Badge>
                  <span>Direct VIN lookup functionality</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">📊</Badge>
                  <span>Better organized by manufacturer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🌍</Badge>
                  <span>International supplier network</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🖼️</Badge>
                  <span>Rich media and specifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🔧</Badge>
                  <span>Professional garage focus</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand-Specific Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Brand-Specific Domains
          </CardTitle>
          <CardDescription>
            7zap provides dedicated domains for major manufacturers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { brand: 'BMW', domain: 'bmw.7zap.com' },
              { brand: 'Mercedes', domain: 'mercedes.7zap.com' },
              { brand: 'Audi', domain: 'audi.7zap.com' },
              { brand: 'VW', domain: 'volkswagen.7zap.com' },
              { brand: 'Ford', domain: 'ford.7zap.com' },
              { brand: 'Toyota', domain: 'toyota.7zap.com' },
              { brand: 'Honda', domain: 'honda.7zap.com' },
              { brand: 'Nissan', domain: 'nissan.7zap.com' },
              { brand: 'Hyundai', domain: 'hyundai.7zap.com' },
              { brand: 'Kia', domain: 'kia.7zap.com' },
              { brand: 'MINI', domain: 'mini.7zap.com' },
              { brand: 'Porsche', domain: 'porsche.7zap.com' }
            ].map((item) => (
              <div key={item.brand} className="text-center p-2 border rounded">
                <p className="font-medium text-sm">{item.brand}</p>
                <p className="text-xs text-muted-foreground">{item.domain}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            7zap Integration Features
          </CardTitle>
          <CardDescription>
            Advanced features implemented based on Fiddler analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Multi-Domain Search */}
            <div className="text-center p-4 bg-blue-50 rounded">
              <Search className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium">Multi-Domain Search</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Intelligent domain selection based on vehicle make
              </p>
            </div>

            {/* OEM Catalog Access */}
            <div className="text-center p-4 bg-green-50 rounded">
              <Database className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium">OEM Catalog Access</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Direct access to manufacturer original parts catalogs
              </p>
            </div>

            {/* Rich Media Support */}
            <div className="text-center p-4 bg-purple-50 rounded">
              <ImageIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium">Rich Media Support</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vehicle images, part images, and detailed specifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Implementation Strategy
          </CardTitle>
          <CardDescription>
            How the 7zap integration works with your existing system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-medium">🎯 Multi-Method Approach:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded">
                <h4 className="font-medium text-sm">Method 1: Main Catalog</h4>
                <p className="text-xs text-muted-foreground">
                  Search via main 7zap.com catalog with VIN lookup
                </p>
              </div>
              <div className="p-3 border rounded">
                <h4 className="font-medium text-sm">Method 2: Brand Catalog</h4>
                <p className="text-xs text-muted-foreground">
                  Use brand-specific domains for targeted searches
                </p>
              </div>
              <div className="p-3 border rounded">
                <h4 className="font-medium text-sm">Method 3: Universal Search</h4>
                <p className="text-xs text-muted-foreground">
                  Fallback to universal search across all catalogs
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">🔄 Intelligent Fallback:</h3>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><strong>1.</strong> Try 7zap OEM catalogs first (superior data quality)</p>
              <p><strong>2.</strong> If 7zap fails, fallback to PartSouq (broader coverage)</p>
              <p><strong>3.</strong> Return best available results to user</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing the 7zap Integration</CardTitle>
          <CardDescription>
            How to test the new OEM catalog functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-medium">🧪 Test Options Available:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium text-green-800">Auto (Best) - Recommended</h4>
                <p className="text-sm text-green-700">
                  Tries 7zap OEM first, then PartSouq fallback for maximum coverage
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800">7zap OEM - New!</h4>
                <p className="text-sm text-blue-700">
                  Direct access to OEM catalogs with brand-specific domains
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">✅ Ready for Testing!</p>
                <p>
                  The 7zap integration is implemented and ready to test. Use the VIN search 
                  with "Auto (Best)" or "7zap OEM" to see the new functionality in action.
                </p>
                <p className="text-sm">
                  <strong>Test VIN:</strong> WBA2D520X05E20424 (BMW 220i) - perfect for testing brand-specific domains!
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
