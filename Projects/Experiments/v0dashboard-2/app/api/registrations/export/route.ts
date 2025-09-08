import { type NextRequest, NextResponse } from "next/server"
import { getConnectedData } from "@/lib/database/connector"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"

    const data = await getConnectedData()
    const vehicles = Array.from(data.vehicles.values())

    const exportData = vehicles.map((vehicle) => ({
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      colour: vehicle.colour,
      fuelType: vehicle.fuelType,
      dateOfReg: vehicle.dateOfReg,
      motExpiry: vehicle.motExpiry,
      customerName: vehicle.customer
        ? `${vehicle.customer.forename} ${vehicle.customer.surname}`.trim() || vehicle.customer.companyName
        : "Unknown",
      customerEmail: vehicle.customer?.contact.email,
      customerPhone: vehicle.customer?.contact.telephone || vehicle.customer?.contact.mobile,
    }))

    if (format === "csv") {
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) => headers.map((header) => `"${row[header as keyof typeof row] || ""}"`).join(",")),
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=vehicle-registrations.csv",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      count: exportData.length,
      format,
    })
  } catch (error) {
    console.error("Export registrations error:", error)
    return NextResponse.json({ success: false, error: "Failed to export registrations" }, { status: 500 })
  }
}
