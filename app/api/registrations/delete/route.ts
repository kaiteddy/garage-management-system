import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID parameter is required" }, { status: 400 })
    }

    // In a real implementation, this would delete from the database
    // For now, we'll simulate the deletion

    return NextResponse.json({
      success: true,
      message: `Registration ${id} deleted successfully`,
    })
  } catch (error) {
    console.error("Delete registration error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete registration" }, { status: 500 })
  }
}
