"use client"

import { useParams } from "next/navigation"
import { EnhancedVehiclePage } from "@/components/vehicle/enhanced-vehicle-page"

export default function VehicleDetailPage() {
  const params = useParams()
  const registration = params.registration as string

  return <EnhancedVehiclePage registration={registration} />
}
