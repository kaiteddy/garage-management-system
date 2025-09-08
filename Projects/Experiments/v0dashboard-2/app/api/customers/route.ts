import { type NextRequest, NextResponse } from "next/server"
import { CustomerService } from "@/lib/database/customer-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    let customers
    if (search) {
      customers = await CustomerService.searchCustomers(search)
    } else {
      customers = await CustomerService.getAllCustomers()
    }

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create") {
      const customer = await CustomerService.createCustomer(body)
      return NextResponse.json({
        success: true,
        data: customer,
        message: "Customer created successfully",
      })
    }

    if (action === "update") {
      const { id, ...updates } = body
      const customer = await CustomerService.updateCustomer(id, updates)
      return NextResponse.json({
        success: true,
        data: customer,
        message: "Customer updated successfully",
      })
    }

    if (action === "delete") {
      const { id } = body
      const success = await CustomerService.deleteCustomer(id)
      return NextResponse.json({
        success,
        message: success ? "Customer deleted successfully" : "Customer not found",
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("Customer operation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Customer operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
