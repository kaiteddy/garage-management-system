"use client"

import { useState, useEffect, useCallback } from "react"
import type { EnrichedVehicle } from "@/components/mot-reminders/mot-reminders-table"
import type { StatusCounts } from "@/components/mot-reminders/mot-status-overview"
import { safeParseDate, daysBetween } from "@/lib/date-utils"

export function useVehicleData() {
  const [vehicles, setVehicles] = useState<EnrichedVehicle[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const determineMotStatus = (motExpiryDate?: string): EnrichedVehicle["motStatus"] => {
    if (!motExpiryDate) return "unknown"

    const expiryDate = safeParseDate(motExpiryDate)
    if (!expiryDate) return "unknown"

    const daysUntilExpiry = daysBetween(expiryDate, new Date())

    if (daysUntilExpiry < 0) return "expired"
    if (daysUntilExpiry <= 30) return "due-soon"
    return "valid"
  }

  const fetchVehicleData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("[useVehicleData] Fetching vehicle data...")

      const response = await fetch("/api/v2/data", {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle data: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[useVehicleData] Raw data received:", data)

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch vehicle data")
      }

      // Transform the data to match our EnrichedVehicle interface
      const enrichedVehicles: EnrichedVehicle[] =
        data.vehicles?.map((vehicle: any) => {
          // Handle customer data - could be string or object
          let customerData: EnrichedVehicle["customer"] = "Unknown Customer"
          let phone = vehicle.phone || vehicle.contactMobile || vehicle.contactTelephone || ""
          let email = vehicle.email || vehicle.contactEmail || ""

          if (vehicle.customer) {
            if (typeof vehicle.customer === "string") {
              customerData = vehicle.customer
            } else if (typeof vehicle.customer === "object") {
              customerData = {
                name: vehicle.customer.name || vehicle.customerName || "Unknown Customer",
                phone: vehicle.customer.phone || phone,
                email: vehicle.customer.email || email,
              }
              // Update top-level phone/email if customer object has them
              phone = vehicle.customer.phone || phone
              email = vehicle.customer.email || email
            }
          } else if (vehicle.customerName) {
            customerData = vehicle.customerName
          }

          // Determine MOT status based on expiry date
          const motExpiryDate = vehicle.motExpiryDate || vehicle.motDue || vehicle.MOT_Due
          const motStatus = vehicle.motStatus || determineMotStatus(motExpiryDate)

          const enrichedVehicle: EnrichedVehicle = {
            id:
              vehicle._ID ||
              vehicle.id ||
              `${vehicle.Registration || vehicle.registration}-${Math.random().toString(36).substr(2, 9)}`,
            registration: (vehicle.Registration || vehicle.registration || "").toUpperCase(),
            make: vehicle.Make || vehicle.make || "",
            model: vehicle.Model || vehicle.model || "",
            year: vehicle.year ? Number.parseInt(String(vehicle.year)) : undefined,
            customer: customerData,
            phone,
            email,
            workDue: vehicle.workDue || vehicle.nextServiceDate || vehicle.Next_Service_Date,
            motStatus,
            motExpiryDate,
            lastInvoiced: vehicle.lastInvoiced || vehicle.status_LastInvoiceDate || vehicle.Last_Invoice_Date,
            reminderSent: Boolean(vehicle.reminderSent || vehicle.reminder_sent),
            archived: Boolean(vehicle.archived || vehicle.is_archived),
          }

          return enrichedVehicle
        }) || []

      console.log(`[useVehicleData] Processed ${enrichedVehicles.length} vehicles`)

      setVehicles(enrichedVehicles)

      // Calculate status counts
      const counts: StatusCounts = {
        valid: 0,
        "due-soon": 0,
        expired: 0,
        unknown: 0,
        checking: 0,
        error: 0,
      }

      enrichedVehicles.forEach((vehicle) => {
        const status = vehicle.motStatus
        if (status in counts) {
          counts[status as keyof StatusCounts] = (counts[status as keyof StatusCounts] || 0) + 1
        }
      })

      console.log("[useVehicleData] Status counts:", counts)
      setStatusCounts(counts)
    } catch (err) {
      console.error("[useVehicleData] Error fetching vehicle data:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setVehicles([])
      setStatusCounts({})
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshData = useCallback(() => {
    console.log("[useVehicleData] Manual refresh triggered")
    return fetchVehicleData()
  }, [fetchVehicleData])

  useEffect(() => {
    fetchVehicleData()
  }, [fetchVehicleData])

  return {
    vehicles,
    statusCounts,
    isLoading,
    error,
    refreshData,
  }
}
