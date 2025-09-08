"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Car, 
  Package, 
  Search, 
  Loader2,
  Settings,
  Wrench,
  Zap,
  Droplets,
  Gauge,
  Disc,
  Filter,
  Lightbulb,
  Wind,
  Fuel,
  Cog,
  Thermometer,
  Battery,
  Scissors,
  Hammer,
  ShoppingCart
} from "lucide-react"

interface Vehicle {
  vrm: string
  vin: string
  make: string
  model: string
  variant: string
  year: string
  engine: string
  fuelType: string
  transmission: string
  bodyType: string
  doors: string
}

interface Part {
  partNumber: string
  description: string
  brand: string
  price: number
  tradePrice?: number
  availability: string
  stockLevel?: number
  category: string
  subcategory?: string
  imageUrl?: string
  warranty?: string
  vehicleRegistration?: string
}

interface CategoryPartsProps {
  vehicle?: Vehicle
  onPartSelect?: (part: Part) => void
  className?: string
}

interface PartCategory {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  subcategories?: string[]
}

const partCategories: PartCategory[] = [
  {
    id: 'air-conditioning',
    name: 'Air Conditioning',
    icon: <Wind className="h-8 w-8" />,
    description: 'AC components, compressors, condensers',
    subcategories: ['Compressors', 'Condensers', 'Evaporators', 'AC Filters']
  },
  {
    id: 'belts-chains',
    name: 'Belts & Chains',
    icon: <Settings className="h-8 w-8" />,
    description: 'Timing belts, drive belts, chains',
    subcategories: ['Timing Belts', 'Drive Belts', 'Timing Chains', 'Belt Tensioners']
  },
  {
    id: 'braking',
    name: 'Braking',
    icon: <Disc className="h-8 w-8" />,
    description: 'Brake pads, discs, calipers, fluid',
    subcategories: ['Brake Pads', 'Brake Discs', 'Brake Calipers', 'Brake Fluid', 'Brake Lines']
  },
  {
    id: 'bulbs',
    name: 'Bulbs',
    icon: <Lightbulb className="h-8 w-8" />,
    description: 'Headlight, indicator, interior bulbs',
    subcategories: ['Headlight Bulbs', 'Indicator Bulbs', 'Interior Bulbs', 'LED Bulbs']
  },
  {
    id: 'cables',
    name: 'Cables',
    icon: <Zap className="h-8 w-8" />,
    description: 'Electrical cables and wiring',
    subcategories: ['Battery Cables', 'Ignition Cables', 'Sensor Cables']
  },
  {
    id: 'clutch-transmission',
    name: 'Clutch & Transmission',
    icon: <Cog className="h-8 w-8" />,
    description: 'Clutch kits, transmission parts',
    subcategories: ['Clutch Kits', 'Clutch Discs', 'Transmission Oil', 'CV Joints']
  },
  {
    id: 'cooling-heating',
    name: 'Cooling & Heating',
    icon: <Thermometer className="h-8 w-8" />,
    description: 'Radiators, thermostats, coolant',
    subcategories: ['Radiators', 'Thermostats', 'Coolant', 'Water Pumps', 'Heater Matrix']
  },
  {
    id: 'electrical-ignition',
    name: 'Electrical & Ignition',
    icon: <Battery className="h-8 w-8" />,
    description: 'Batteries, spark plugs, ignition',
    subcategories: ['Batteries', 'Spark Plugs', 'Ignition Coils', 'Alternators', 'Starters']
  },
  {
    id: 'engine-parts',
    name: 'Engine Parts',
    icon: <Wrench className="h-8 w-8" />,
    description: 'Engine components and gaskets',
    subcategories: ['Gaskets', 'Pistons', 'Valves', 'Engine Mounts', 'Head Gaskets']
  },
  {
    id: 'exhaust-turbo',
    name: 'Exhaust & Turbo',
    icon: <Gauge className="h-8 w-8" />,
    description: 'Exhaust systems, turbochargers',
    subcategories: ['Exhaust Systems', 'Catalytic Converters', 'Turbochargers', 'DPF Filters']
  },
  {
    id: 'fuel-engine-management',
    name: 'Fuel & Engine Management',
    icon: <Fuel className="h-8 w-8" />,
    description: 'Fuel pumps, injectors, sensors',
    subcategories: ['Fuel Pumps', 'Fuel Injectors', 'Fuel Filters', 'Engine Sensors']
  },
  {
    id: 'lubricants-fluids',
    name: 'Lubricants & Fluids',
    icon: <Droplets className="h-8 w-8" />,
    description: 'Engine oil, brake fluid, coolant',
    subcategories: ['Engine Oil', 'Brake Fluid', 'Power Steering Fluid', 'Transmission Fluid']
  },
  {
    id: 'service-parts',
    name: 'Service Parts',
    icon: <Filter className="h-8 w-8" />,
    description: 'Filters, service items',
    subcategories: ['Oil Filters', 'Air Filters', 'Fuel Filters', 'Cabin Filters']
  },
  {
    id: 'steering',
    name: 'Steering',
    icon: <Scissors className="h-8 w-8" />,
    description: 'Steering components, power steering',
    subcategories: ['Steering Racks', 'Power Steering Pumps', 'Track Rod Ends', 'Steering Wheels']
  },
  {
    id: 'suspension',
    name: 'Suspension',
    icon: <Hammer className="h-8 w-8" />,
    description: 'Shocks, springs, suspension arms',
    subcategories: ['Shock Absorbers', 'Springs', 'Suspension Arms', 'Anti-Roll Bars']
  },
  {
    id: 'wipers',
    name: 'Wipers',
    icon: <Wind className="h-8 w-8" />,
    description: 'Wiper blades, washer pumps',
    subcategories: ['Wiper Blades', 'Washer Pumps', 'Washer Fluid', 'Wiper Motors']
  }
]

export function CategoryPartsSelector({ vehicle, onPartSelect, className = "" }: CategoryPartsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [parts, setParts] = useState<Part[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const searchCategoryParts = async (categoryId: string, categoryName: string) => {
    if (!vehicle) {
      toast({
        title: "Vehicle Required",
        description: "Please select a vehicle first to search for parts",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    setSelectedCategory(categoryId)

    try {
      console.log(`🔍 [CATEGORY-PARTS] Searching ${categoryName} parts for ${vehicle.make} ${vehicle.model}`)

      // Use vehicle-specific search with category filter
      const response = await fetch('/api/parts/ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search-vehicle-parts-by-category',
          vehicle: vehicle,
          category: categoryName.toLowerCase(),
          categoryId: categoryId
        })
      })

      const data = await response.json()

      if (data.success) {
        setParts(data.parts || [])
        toast({
          title: "Parts Found",
          description: `Found ${data.parts?.length || 0} ${categoryName.toLowerCase()} parts`,
        })
      } else {
        setParts([])
        toast({
          title: "No Parts Found",
          description: data.error || `No ${categoryName.toLowerCase()} parts available`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ [CATEGORY-PARTS] Search failed:', error)
      toast({
        title: "Search Error",
        description: "Failed to search for parts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePartSelect = (part: Part) => {
    // Add vehicle registration to the part
    const partWithVehicle = {
      ...part,
      vehicleRegistration: vehicle?.vrm
    }
    onPartSelect?.(partWithVehicle)
    toast({
      title: "Part Selected",
      description: `${part.description} added to selection`,
    })
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parts Categories
          </CardTitle>
          <CardDescription>
            Browse parts by category for your vehicle
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vehicle && (
            <Alert>
              <Car className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-4 text-sm">
                  <span><strong>Vehicle:</strong> {vehicle.make} {vehicle.model} ({vehicle.year})</span>
                  <span><strong>Reg:</strong> {vehicle.vrm}</span>
                  <span><strong>Engine:</strong> {vehicle.engine}</span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Car Parts</TabsTrigger>
          <TabsTrigger value="collision">Collision Parts</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          {/* Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {partCategories.map((category) => (
              <Card 
                key={category.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => searchCategoryParts(category.id, category.name)}
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className="flex justify-center text-blue-600">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-sm">{category.name}</h3>
                  <p className="text-xs text-gray-600">{category.description}</p>
                  {loading && selectedCategory === category.id && (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collision" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Collision Parts</h3>
              <p className="text-gray-600">Body panels, bumpers, and collision repair parts</p>
              <Button className="mt-4" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Workshop Tools</h3>
              <p className="text-gray-600">Professional tools and equipment</p>
              <Button className="mt-4" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Parts Results */}
      {parts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Parts Results
              <Badge variant="secondary">{parts.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parts.map((part, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold">{part.description}</h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Brand:</span> {part.brand}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Part Number:</span> {part.partNumber}
                      </p>
                      {part.availability && (
                        <Badge variant={part.availability === 'In Stock' ? 'default' : 'secondary'}>
                          {part.availability}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-lg font-bold">£{part.price.toFixed(2)}</div>
                      {part.tradePrice && (
                        <div className="text-sm text-gray-600">
                          Trade: £{part.tradePrice.toFixed(2)}
                        </div>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => handlePartSelect(part)}
                        className="flex items-center gap-1"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Select
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
