"use client"

import { VehicleTable } from "@/components/dashboard/vehicle-table"

export default function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">Manage your vehicle database</p>
        </div>
      </div>
      <VehicleTable />
    </div>
  )
}
