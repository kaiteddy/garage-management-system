"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  ShoppingCart, 
  Package, 
  Pound,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

interface Part {
  id: string
  partNumber: string
  description: string
  brand: string
  category: string
  price: number
  tradePrice: number
  availability: 'In Stock' | 'Order Only' | 'Out of Stock'
  stockLevel: number
  imageUrl?: string
  warranty?: string
  weight?: number
  deliveryTime: string
  supplier: 'Euro Car Parts' | 'GSF' | 'Motor Factor'
}

interface CartItem extends Part {
  quantity: number
  totalPrice: number
}

interface IntegratedPartsOrderingProps {
  registration?: string
  jobSheetId?: string
  customerId?: string
  onOrderComplete?: (order: any) => void
  className?: string
}

export function IntegratedPartsOrdering({
  registration = '',
  jobSheetId,
  customerId,
  onOrderComplete,
  className = ""
}: IntegratedPartsOrderingProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchReg, setSearchReg] = useState(registration)
  const [loading, setLoading] = useState(false)
  const [parts, setParts] = useState<Part[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'success' | 'error'>('idle')

  // Mock parts data - this would come from Euro Car Parts API
  const mockParts: Part[] = [
    {
      id: '1',
      partNumber: 'BP1234',
      description: 'Front Brake Pads Set - Ceramic',
      brand: 'Brembo',
      category: 'Brakes',
      price: 45.99,
      tradePrice: 32.19,
      availability: 'In Stock',
      stockLevel: 15,
      deliveryTime: 'Next Day',
      supplier: 'Euro Car Parts',
      warranty: '2 Years',
      weight: 2.1
    },
    {
      id: '2',
      partNumber: 'OF5678',
      description: 'Oil Filter - Premium',
      brand: 'Mann Filter',
      category: 'Filters',
      price: 12.99,
      tradePrice: 8.44,
      availability: 'In Stock',
      stockLevel: 42,
      deliveryTime: 'Next Day',
      supplier: 'Euro Car Parts',
      warranty: '1 Year',
      weight: 0.3
    },
    {
      id: '3',
      partNumber: 'BD9012',
      description: 'Front Brake Discs Pair - Vented',
      brand: 'ATE',
      category: 'Brakes',
      price: 89.99,
      tradePrice: 62.99,
      availability: 'Order Only',
      stockLevel: 0,
      deliveryTime: '2-3 Days',
      supplier: 'Euro Car Parts',
      warranty: '2 Years',
      weight: 8.5
    }
  ]

  const searchParts = async () => {
    if (!searchTerm.trim() && !searchReg.trim()) {
      toast.error('Please enter a search term or registration')
      return
    }

    setLoading(true)
    try {
      console.log(`🔍 [PARTS-ORDERING] Searching for: ${searchTerm || searchReg}`)

      // Simulate API call to Euro Car Parts
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Filter mock parts based on search
      const filteredParts = mockParts.filter(part => 
        part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.category.toLowerCase().includes(searchTerm.toLowerCase())
      )

      setParts(searchTerm ? filteredParts : mockParts)
      toast.success(`Found ${searchTerm ? filteredParts.length : mockParts.length} parts`)

    } catch (error) {
      console.error('Parts search failed:', error)
      toast.error('Failed to search parts')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (part: Part, quantity: number = 1) => {
    const existingItem = cart.find(item => item.id === part.id)
    
    if (existingItem) {
      updateCartQuantity(part.id, existingItem.quantity + quantity)
    } else {
      const cartItem: CartItem = {
        ...part,
        quantity,
        totalPrice: part.tradePrice * quantity
      }
      setCart(prev => [...prev, cartItem])
      toast.success(`Added ${part.description} to cart`)
    }
  }

  const updateCartQuantity = (partId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(partId)
      return
    }

    setCart(prev => prev.map(item => 
      item.id === partId 
        ? { ...item, quantity: newQuantity, totalPrice: item.tradePrice * newQuantity }
        : item
    ))
  }

  const removeFromCart = (partId: string) => {
    setCart(prev => prev.filter(item => item.id !== partId))
    toast.success('Item removed from cart')
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    setOrderStatus('ordering')
    try {
      console.log('📦 [PARTS-ORDERING] Placing order:', cart)

      // Simulate order placement to Euro Car Parts
      await new Promise(resolve => setTimeout(resolve, 2000))

      const order = {
        id: `ORD-${Date.now()}`,
        items: cart,
        total: getCartTotal(),
        jobSheetId,
        customerId,
        status: 'Confirmed',
        estimatedDelivery: 'Tomorrow by 1PM',
        trackingNumber: `ECP${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      }

      setOrderStatus('success')
      setCart([]) // Clear cart
      onOrderComplete?.(order)
      
      toast.success(`Order placed successfully! Tracking: ${order.trackingNumber}`)

    } catch (error) {
      console.error('Order placement failed:', error)
      setOrderStatus('error')
      toast.error('Failed to place order')
    }
  }

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'In Stock':
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
      case 'Order Only':
        return <Badge className="bg-yellow-100 text-yellow-800">Order Only</Badge>
      case 'Out of Stock':
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
      default:
        return <Badge variant="outline">{availability}</Badge>
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Integrated Parts Ordering System
          </CardTitle>
          <CardDescription>
            Search, select, and order parts directly from Euro Car Parts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration">Registration</Label>
              <Input
                id="registration"
                placeholder="e.g. AB12 CDE"
                value={searchReg}
                onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Part Search</Label>
              <Input
                id="search"
                placeholder="e.g. brake pads, oil filter"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={searchParts}
                disabled={loading}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Search Parts'}
              </Button>
            </div>
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <Alert>
              <ShoppingCart className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    {getCartItemCount()} item{getCartItemCount() !== 1 ? 's' : ''} in cart
                  </span>
                  <span className="font-medium">
                    Total: £{getCartTotal().toFixed(2)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Parts Results */}
      {parts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Parts ({parts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parts.map((part) => (
                <Card key={part.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{part.description}</h4>
                        <Badge variant="outline">{part.brand}</Badge>
                        {getAvailabilityBadge(part.availability)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                        <div>
                          <Label className="text-muted-foreground">Part Number</Label>
                          <p className="font-mono">{part.partNumber}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Trade Price</Label>
                          <p className="font-medium text-green-600">£{part.tradePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Stock</Label>
                          <p>{part.stockLevel > 0 ? part.stockLevel : 'Order Only'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Delivery</Label>
                          <p className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {part.deliveryTime}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Warranty</Label>
                          <p>{part.warranty || 'Standard'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => addToCart(part)}
                      disabled={part.availability === 'Out of Stock'}
                      size="sm"
                      className="ml-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shopping Cart */}
      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({getCartItemCount()} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.description}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.brand} • {item.partNumber} • £{item.tradePrice.toFixed(2)} each
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      size="sm"
                      variant="outline"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-8 text-center">{item.quantity}</span>
                    
                    <Button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-20 text-right font-medium">
                      £{item.totalPrice.toFixed(2)}
                    </span>
                    
                    <Button
                      onClick={() => removeFromCart(item.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">
                  Total: £{getCartTotal().toFixed(2)}
                </div>
                
                <Button
                  onClick={placeOrder}
                  disabled={orderStatus === 'ordering'}
                  size="lg"
                >
                  {orderStatus === 'ordering' ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Success */}
      {orderStatus === 'success' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-green-800">Order placed successfully!</p>
              <p className="text-sm">Your parts will be delivered tomorrow by 1PM. You'll receive tracking information via email.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
