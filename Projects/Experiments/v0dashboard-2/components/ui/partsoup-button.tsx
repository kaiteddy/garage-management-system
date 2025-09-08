"use client"

import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface PartSouqButtonProps {
  vin: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost" | "secondary"
  className?: string
}

export function PartSouqButton({ vin, size = "sm", variant = "outline", className }: PartSouqButtonProps) {
  const handlePartSoupClick = async () => {
    if (!vin || vin.trim() === '') {
      toast.error("No VIN available")
      return
    }

    // Clean the VIN (remove spaces and convert to uppercase)
    const cleanVin = vin.trim().toUpperCase()

    // Validate VIN length (should be 17 characters, but allow some flexibility)
    if (cleanVin.length < 10 || cleanVin.length > 20) {
      toast.error("Invalid VIN format (should be 10-20 characters)")
      return
    }

    try {
      // Open PartSouq with VIN as URL parameter to auto-populate search field
      const searchUrl = `https://partsouq.com/search?q=${encodeURIComponent(cleanVin)}`
      window.open(searchUrl, '_blank')

      toast.success(`Searching PartSouq for VIN: ${cleanVin}`)
    } catch (error) {
      // Fallback: copy to clipboard and open site
      try {
        await navigator.clipboard.writeText(cleanVin)
        window.open('https://partsouq.com', '_blank')
        toast.success(`VIN ${cleanVin} copied to clipboard! Paste it in PartSouq search.`)
      } catch (clipboardError) {
        window.open('https://partsouq.com', '_blank')
        toast.success(`Opening PartSouq. VIN: ${cleanVin} (manually copy if needed)`)
      }
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePartSoupClick}
      className={`gap-1 ${className || ''}`}
      title={`Search PartSouq for VIN: ${vin}`}
    >
      <ExternalLink className="h-3 w-3" />
      PartSouq
    </Button>
  )
}

// Export with old name for backward compatibility
export const PartSoupButton = PartSouqButton
