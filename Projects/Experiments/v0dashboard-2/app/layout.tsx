import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../styles/apple-design-system.css"
import { ClientLayout } from "@/components/client-layout"

// Force all pages to be dynamic to avoid SSR issues
export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: "GarageManager Pro - MOT Service Management",
  description: "Complete garage management solution with MOT tracking, vehicle management, and customer service tools",
  generator: 'GarageManager Pro'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}


