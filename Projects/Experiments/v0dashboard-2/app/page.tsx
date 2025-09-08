import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "GarageManager Pro - Vehicle Management System",
  description: "Complete garage management solution with MOT tracking, vehicle management, and customer service tools",
  generator: "GarageManager Pro"
}

export default function HomePage() {
  redirect("/dashboard")
}
