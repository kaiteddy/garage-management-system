import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { vehicles } = await request.json()

    if (!vehicles || !Array.isArray(vehicles)) {
      return NextResponse.json({ error: "Invalid vehicles data" }, { status: 400 })
    }

    // Create CSV headers
    const headers = [
      "Registration",
      "Make",
      "Model",
      "Year",
      "Customer",
      "Phone",
      "Email",
      "MOT Status",
      "MOT Due",
      "Work Due",
      "Last Invoiced",
      "Reminder Sent",
      "Archived",
    ]

    // Create CSV rows
    const rows = vehicles.map((vehicle: any) => [
      vehicle.registration || "",
      vehicle.make || "",
      vehicle.model || "",
      vehicle.year || "",
      typeof vehicle.customer === "string" ? vehicle.customer : vehicle.customer?.name || "",
      vehicle.phone || "",
      vehicle.email || "",
      vehicle.motStatus || "",
      vehicle.motExpiryDate || "",
      vehicle.workDue || "",
      vehicle.lastInvoiced || "",
      vehicle.reminderSent ? "Yes" : "No",
      vehicle.archived ? "Yes" : "No",
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    // Create response with CSV content
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="mot-reminders-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[EXPORT] Error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
