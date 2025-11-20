"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Plus, Phone, Mail } from "lucide-react"
import { CustomerEditDialog } from "@/components/customer-edit-dialog"

interface Customer {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  country?: string
  date_of_birth?: string
  created_at?: string
  updated_at?: string
  twilio_phone?: string
  phone_verified?: boolean
  last_contact_date?: string
  contact_preference?: string
  opt_out?: boolean
  vehicle_count?: number | string
  vehicleCount?: number
  vehicles?: any[]
  // Legacy field names for backward compatibility
  _ID?: string
  accountNumber?: string
  nameTitle?: string
  nameForename?: string
  nameSurname?: string
  nameCompany?: string
  contactTelephone?: string
  contactMobile?: string
  contactEmail?: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    void loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/customers", { cache: "no-store" })
      if (!response.ok) throw new Error(response.statusText)
      const data = await response.json()

      if (!data.success || !Array.isArray(data.data)) {
        console.error("Unexpected customer payload:", data)
        return
      }

      // Debug: Log the first few customers to see the actual structure
      console.log("Customer data structure:", data.data.slice(0, 3))
      console.log("Total customers loaded:", data.count)

      setCustomers(data.data)
    } catch (error) {
      console.error("Failed to load customers:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    // Use the actual field names from the API
    const searchable = [
      customer.first_name,
      customer.last_name,
      customer.email,
      customer.phone,
      customer.twilio_phone,
      customer.city,
      customer.postcode,
      // Legacy field names for backward compatibility
      customer.nameForename || customer.forename,
      customer.nameSurname || customer.surname,
      customer.nameCompany || customer.companyName,
      customer.contactTelephone || customer.telephone,
      customer.contactMobile || customer.mobile,
      customer.contactEmail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchable.includes(searchTerm.toLowerCase())
  })

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditDialogOpen(true)
  }

  const handleViewCustomer = (customer: Customer) => {
    // Navigate to the customer detail page
    router.push(`/customers/${customer.id || customer._ID}`)
  }

  const handleSaveCustomer = async (updatedCustomer: Customer) => {
    try {
      // TODO: implement real API mutation
      console.log("Saving customer:", updatedCustomer)
      await loadCustomers()
    } catch (error) {
      console.error("Failed to save customer:", error)
    }
  }

  const getCustomerName = (customer: Customer) => {
    // Try company name first (legacy fields)
    if (customer.nameCompany || customer.companyName) {
      return customer.nameCompany || customer.companyName
    }

    // Use the actual API field names
    const firstName = customer.first_name || customer.nameForename || customer.forename || ""
    const lastName = customer.last_name || customer.nameSurname || customer.surname || ""
    const title = customer.nameTitle || customer.title || ""

    const fullName = `${title} ${firstName} ${lastName}`.trim()

    if (fullName) {
      return fullName
    }

    // If we still don't have a name, return a default
    return "Unnamed Customer"
  }

  const getCustomerContact = (customer: Customer) => {
    const contacts = []

    // Use the actual API field names first, then fallback to legacy
    const phone = customer.phone || customer.twilio_phone ||
      customer.contactTelephone ||
      customer.telephone ||
      customer.contactMobile ||
      customer.mobile

    if (phone) {
      contacts.push({
        type: "phone",
        value: phone,
      })
    }

    // Use the actual API field names first, then fallback to legacy
    const email = customer.email || customer.contactEmail

    if (email && !email.includes('@placeholder.com')) {
      contacts.push({
        type: "email",
        value: email,
      })
    }

    return contacts
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database • {customers.length.toLocaleString()} total customers
            {searchTerm && ` • ${filteredCustomers.length} matching search`}
          </p>
          {!searchTerm && customers.length > 0 && (
            <div className="text-sm text-muted-foreground mt-1">
              {(() => {
                const withVehicles = customers.filter(c => {
                  const count = c.vehicle_count ? parseInt(c.vehicle_count.toString()) : 0
                  return count > 0
                }).length
                const multiVehicle = customers.filter(c => {
                  const count = c.vehicle_count ? parseInt(c.vehicle_count.toString()) : 0
                  return count > 1
                }).length
                const highVolume = customers.filter(c => {
                  const count = c.vehicle_count ? parseInt(c.vehicle_count.toString()) : 0
                  return count > 10
                }).length
                return `${withVehicles.toLocaleString()} with vehicles • ${multiVehicle.toLocaleString()} multi-vehicle • ${highVolume.toLocaleString()} high-volume`
              })()}
            </div>
          )}
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Database ({filteredCustomers.length.toLocaleString()})
          </CardTitle>
          <CardDescription>
            {searchTerm
              ? `Showing ${filteredCustomers.length} customers matching "${searchTerm}"`
              : "Complete overview of all customers"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No customers match your search." : "No customers found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const customerName = getCustomerName(customer)
                      const contacts = getCustomerContact(customer)
                      const vehicleCount = customer.vehicle_count
                        ? parseInt(customer.vehicle_count.toString())
                        : (Array.isArray(customer.vehicles)
                          ? customer.vehicles.length
                          : (customer.vehicleCount ?? 0))

                      return (
                        <TableRow key={customer.id || customer._ID}>
                          <TableCell className="font-medium">
                            {customerName}
                            {(customer.accountNumber || customer.id) && (
                              <div className="text-xs text-muted-foreground">
                                #{customer.accountNumber || customer.id.substring(0, 8)}
                              </div>
                            )}
                            {(customer.city || customer.postcode) && (
                              <div className="text-xs text-muted-foreground">
                                {[customer.city, customer.postcode].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {contacts.map((contact, index) => (
                                <div
                                  key={`${customer.id || customer._ID}-contact-${index}`}
                                  className="flex items-center gap-1 text-sm"
                                >
                                  {contact.type === "phone" ? (
                                    <Phone className="h-3 w-3" />
                                  ) : (
                                    <Mail className="h-3 w-3" />
                                  )}
                                  <span>{contact.value}</span>
                                  {contact.type === "phone" && customer.phone_verified && (
                                    <span className="text-green-600 text-xs">✓</span>
                                  )}
                                </div>
                              ))}
                              {customer.contact_preference && (
                                <div className="text-xs text-muted-foreground">
                                  Prefers: {customer.contact_preference.toUpperCase()}
                                </div>
                              )}
                              {contacts.length === 0 && (
                                <span className="text-muted-foreground text-sm">No contact info</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className={vehicleCount > 5 ? "font-bold text-blue-600" : ""}>
                                {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""}
                              </span>
                              {vehicleCount > 10 && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  High Volume
                                </span>
                              )}
                              {customer.opt_out && (
                                <div className="text-xs text-red-600">Opted out</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleViewCustomer(customer)}>
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CustomerEditDialog
        customer={selectedCustomer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveCustomer}
      />
    </div>
  )
}
