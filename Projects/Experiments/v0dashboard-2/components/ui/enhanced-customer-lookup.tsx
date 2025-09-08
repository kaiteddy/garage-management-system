"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Phone, Mail, MapPin, Search, Loader2, CheckCircle, Plus, Clock } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  country?: string
  vehicle_count?: number
  created_at?: string
  last_visit?: string
}

interface EnhancedCustomerLookupProps {
  searchTerm: string
  onSearchTermChange: (term: string) => void
  onCustomerSelect: (customer: Customer) => void
  onCreateNew?: () => void
  className?: string
  disabled?: boolean
  placeholder?: string
  showCreateButton?: boolean
  autoSearch?: boolean
  minSearchLength?: number
}

export function EnhancedCustomerLookup({
  searchTerm,
  onSearchTermChange,
  onCustomerSelect,
  onCreateNew,
  className = "",
  disabled = false,
  placeholder = "Search by name, phone, email, or postcode...",
  showCreateButton = true,
  autoSearch = true,
  minSearchLength = 2
}: EnhancedCustomerLookupProps) {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const resultsRef = useRef<HTMLDivElement>(null)

  // Auto-search with debouncing
  useEffect(() => {
    if (!autoSearch || searchTerm.length < minSearchLength) {
      setCustomers([])
      setShowResults(false)
      return
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchCustomers(searchTerm)
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, autoSearch, minSearchLength]) // FIXED: Removed searchCustomers from dependencies

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCustomers([])
      setShowResults(false)
      return
    }

    const startTime = performance.now()
    setLoading(true)
    setSelectedIndex(-1)

    try {
      console.log(`🔍 [CUSTOMER-LOOKUP] Searching for: "${query}"`)

      const response = await fetch(`/api/customers?search=${encodeURIComponent(query.trim())}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        const endTime = performance.now()
        console.log(`✅ [CUSTOMER-LOOKUP] Found ${data.data?.length || 0} customers in ${(endTime - startTime).toFixed(2)}ms`)
        setCustomers(data.data || [])
        setShowResults((data.data?.length || 0) > 0)
      } else {
        console.log(`❌ [CUSTOMER-LOOKUP] No customers found`)
        setCustomers([])
        setShowResults(false)
      }

    } catch (error) {
      const endTime = performance.now()
      console.error(`❌ [CUSTOMER-LOOKUP] Search failed after ${(endTime - startTime).toFixed(2)}ms:`, error)
      toast.error(`Failed to search customers: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setCustomers([])
      setShowResults(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [])

  const handleSearchTermChange = (value: string) => {
    onSearchTermChange(value)
    if (value.length < minSearchLength) {
      setShowResults(false)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    console.log(`👤 [CUSTOMER-LOOKUP] Selected customer:`, customer)
    onCustomerSelect(customer)
    setShowResults(false)
    setSelectedIndex(-1)
    
    // Update search term to show selected customer
    const displayName = `${customer.first_name} ${customer.last_name}`.trim()
    onSearchTermChange(displayName)
    
    toast.success(`Selected customer: ${displayName}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || !customers || customers.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < (customers?.length || 0) - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < (customers?.length || 0)) {
          handleCustomerSelect(customers[selectedIndex])
        } else if (!autoSearch) {
          searchCustomers(searchTerm)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowResults(false)
        setSelectedIndex(-1)
        break
    }
  }

  const formatCustomerDisplay = (customer: Customer) => {
    const name = `${customer.first_name} ${customer.last_name}`.trim()
    const contact = [customer.phone, customer.email].filter(Boolean).join(' • ')
    const address = [customer.city, customer.postcode].filter(Boolean).join(', ')
    
    return { name, contact, address }
  }

  const getSearchMatchType = (customer: Customer, query: string) => {
    const lowerQuery = query.toLowerCase()
    const name = `${customer.first_name} ${customer.last_name}`.toLowerCase()
    const phone = customer.phone?.toLowerCase() || ''
    const email = customer.email?.toLowerCase() || ''
    const postcode = customer.postcode?.toLowerCase() || ''

    if (name.includes(lowerQuery)) return 'name'
    if (phone.includes(lowerQuery)) return 'phone'
    if (email.includes(lowerQuery)) return 'email'
    if (postcode.includes(lowerQuery)) return 'postcode'
    return 'other'
  }

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="customer-search">Customer Search</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="customer-search"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (customers && customers.length > 0) setShowResults(true)
              }}
              disabled={disabled}
              className="pl-10"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {!autoSearch && (
            <Button
              onClick={() => searchCustomers(searchTerm)}
              disabled={disabled || loading || searchTerm.length < minSearchLength}
              size="default"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          
          {showCreateButton && onCreateNew && (
            <Button
              onClick={onCreateNew}
              disabled={disabled}
              variant="outline"
              size="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && customers && customers.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm">
              Found {customers?.length || 0} customer{(customers?.length || 0) !== 1 ? 's' : ''} matching "{searchTerm}"
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-64">
              <div className="space-y-1">
                {customers?.map((customer, index) => {
                  const { name, contact, address } = formatCustomerDisplay(customer)
                  const matchType = getSearchMatchType(customer, searchTerm)
                  
                  return (
                    <div
                      key={customer.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        index === selectedIndex
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50 border-transparent'
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {matchType}
                            </Badge>
                          </div>
                          
                          {contact && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{contact}</span>
                            </div>
                          )}
                          
                          {address && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{address}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end text-xs text-muted-foreground ml-2">
                          {customer.vehicle_count !== undefined && (
                            <span>{customer.vehicle_count} vehicle{customer.vehicle_count !== 1 ? 's' : ''}</span>
                          )}
                          {customer.created_at && (
                            <span className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(customer.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {showResults && (!customers || customers.length === 0) && !loading && searchTerm.length >= minSearchLength && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
          <CardContent className="py-4">
            <div className="text-center text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No customers found matching "{searchTerm}"</p>
              {showCreateButton && onCreateNew && (
                <Button
                  onClick={onCreateNew}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
