import { NextResponse } from "next/server"
import { getConnectedData } from "@/lib/database/connector"

export async function GET() {
  try {
    const data = await getConnectedData()
    const stockItems = Array.from(data.stock.values())

    return NextResponse.json({
      success: true,
      data: stockItems,
      count: stockItems.length,
    })
  } catch (error) {
    console.error("Error fetching stock data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch stock data" }, { status: 500 })
  }
}
