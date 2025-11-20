import { NextResponse } from "next/server"
import { getConnectedData } from "@/lib/database/connector"
import { getUploadedData } from "@/lib/database/upload-store"

/* ----------------------------- */
/*  Helpers                      */
/* ----------------------------- */
function motStatus(expiry?: string | null) {
  if (!expiry) return "Unknown"
  const diff = new Date(expiry).getTime() - Date.now()
  const days = Math.ceil(diff / 86_400_000)
  if (days < 0) return "Expired"
  if (days <= 30) return "Due Soon"
  return "Valid"
}

function tidyName(forename = "", surname = "", company = "") {
  const full = `${forename} ${surname}`.trim()
  return full || company || "Unknown"
}

/* ----------------------------- */
/*  GET – merge core + uploads   */
/* ----------------------------- */
export async function GET() {
  try {
    /* 1️⃣  core CSV data (Customers / Vehicles / …) */
    const core = await getConnectedData()

    /* 2️⃣  anything the user uploaded in this session */
    const uploaded = getUploadedData()

    /* 3️⃣  Vehicles */
    const coreVehicles = Array.from(core.vehicles.values()).map((v) => ({
      id: v._ID,
      registration: v.registration,
      make: v.make,
      model: v.model,
      year: v.dateOfReg ?? "",
      customer: v.customer
        ? {
            name: tidyName(v.customer.forename, v.customer.surname, v.customer.companyName),
            phone: v.customer.contact?.telephone || v.customer.contact?.mobile || "",
            email: v.customer.contact?.email || "",
          }
        : null,
      motExpiry: v.motExpiry ?? null,
      motStatus: motStatus(v.motExpiry ?? null),
      colour: v.colour,
      fuelType: v.fuelType,
      vin: v.vin,
      engineCode: v.engineCode,
    }))

    const uploadedVehicles = uploaded.vehicles.map((v, idx) => ({
      id: `u_${idx}`,
      registration: (v.registration || v.Registration || "").toString(),
      make: v.make || v.Make || "",
      model: v.model || v.Model || "",
      year: v.year || v.Year || "",
      customer: {
        name: v.customer || v.Customer || v.owner || v.CustomerName || "",
        phone: v.phone || v.Phone || "",
        email: v.email || v.Email || "",
      },
      motExpiry: v.motExpiry || v.MOTExpiry || null,
      motStatus: motStatus(v.motExpiry || v.MOTExpiry || null),
    }))

    /* 4️⃣  Customers */
    const coreCustomers = Array.from(core.customers.values()).map((c) => ({
      id: c._ID,
      name: tidyName(c.forename, c.surname, c.companyName),
      phone: c.contact?.telephone || c.contact?.mobile || "",
      email: c.contact?.email || "",
      vehicleCount: c.vehicles.length,
    }))

    const uploadedCustomers = uploaded.customers.map((c, idx) => ({
      id: `u_${idx}`,
      name: c.name || c.Name || "",
      phone: c.phone || c.Phone || "",
      email: c.email || c.Email || "",
      vehicleCount: 0,
    }))

    /* 5️⃣  Response */
    return NextResponse.json({
      success: true,
      vehicles: [...coreVehicles, ...uploadedVehicles],
      customers: [...coreCustomers, ...uploadedCustomers],
      uploadedSummary: {
        customers: uploaded.customers.length,
        vehicles: uploaded.vehicles.length,
        appointments: uploaded.appointments.length,
        reminders: uploaded.reminders.length,
        jobSheets: uploaded.jobSheets.length,
      },
    })
  } catch (error) {
    console.error("[api/v2/data] error:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
