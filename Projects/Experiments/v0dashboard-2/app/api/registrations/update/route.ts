import { type NextRequest, NextResponse } from "next/server"

// Import the registrations storage from the upload route
let uploadedRegistrations: Set<string>

// Initialize the storage reference
async function getRegistrationsStorage() {
  if (!uploadedRegistrations) {
    // Get the current registrations
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/registrations/upload`,
    )
    const data = await response.json()
    uploadedRegistrations = new Set(data.registrations || [])
  }
  return uploadedRegistrations
}

export async function PUT(request: NextRequest) {
  try {
    const updateData = await request.json()

    if (!updateData.id) {
      return NextResponse.json({ success: false, error: "ID is required for update" }, { status: 400 })
    }

    const { oldRegistration, newRegistration } = updateData

    if (!oldRegistration || !newRegistration) {
      return NextResponse.json({ error: "Both old and new registrations are required" }, { status: 400 })
    }

    const cleanOldReg = oldRegistration.toUpperCase().replace(/\s/g, "")
    const cleanNewReg = newRegistration.toUpperCase().replace(/\s/g, "")

    console.log(`🔄 Updating registration: ${cleanOldReg} → ${cleanNewReg}`)

    // Get current registrations
    const registrationsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/registrations/upload`,
    )
    const registrationsData = await registrationsResponse.json()
    const currentRegistrations = new Set(registrationsData.registrations || [])

    // Check if old registration exists
    if (!currentRegistrations.has(cleanOldReg)) {
      return NextResponse.json({ error: "Original registration not found" }, { status: 404 })
    }

    // Check if new registration already exists (and it's different)
    if (cleanOldReg !== cleanNewReg && currentRegistrations.has(cleanNewReg)) {
      return NextResponse.json({ error: "New registration already exists" }, { status: 409 })
    }

    // Update registrations
    currentRegistrations.delete(cleanOldReg)
    currentRegistrations.add(cleanNewReg)

    // Update the registrations storage by calling the upload API
    const updateResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/registrations/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrations: Array.from(currentRegistrations),
        }),
      },
    )

    if (!updateResponse.ok) {
      throw new Error("Failed to update registrations storage")
    }

    // Update customer records if they exist
    try {
      const customerResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/customers`,
      )
      const customerData = await customerResponse.json()

      const existingCustomer = customerData.customers?.find(
        (c: any) => c.registration.toUpperCase().replace(/\s/g, "") === cleanOldReg,
      )

      if (existingCustomer) {
        console.log(`📝 Updating customer record for ${cleanOldReg} → ${cleanNewReg}`)

        // Delete old customer record
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            registration: cleanOldReg,
          }),
        })

        // Add new customer record with updated registration
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            ...existingCustomer,
            registration: cleanNewReg,
          }),
        })
      }
    } catch (error) {
      console.error("Failed to update customer records:", error)
      // Don't fail the whole operation if customer update fails
    }

    console.log(`✅ Successfully updated registration: ${cleanOldReg} → ${cleanNewReg}`)

    return NextResponse.json({
      success: true,
      message: `Registration updated from ${cleanOldReg} to ${cleanNewReg}`,
      oldRegistration: cleanOldReg,
      newRegistration: cleanNewReg,
    })
  } catch (error) {
    console.error("Registration update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update registration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
