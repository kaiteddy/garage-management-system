"use client"

import { useState, useEffect } from "react"
import { getManufacturerLogo, getFallbackLogo } from "@/lib/manufacturer-logos"
import { cn } from "@/lib/utils"

interface ManufacturerLogoProps {
  make: string | null | undefined
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showName?: boolean
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-20 w-20"
}

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base", 
  xl: "text-lg"
}

export function ManufacturerLogo({
  make,
  size = "md",
  className,
  showName = false
}: ManufacturerLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const logoInfo = getManufacturerLogo(make)

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Always show fallback if no URL or image failed to load
  const shouldShowFallback = !logoInfo.logoUrl || imageError

  // During SSR, always show fallback to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shadow-sm",
            sizeClasses[size],
            textSizeClasses[size]
          )}
          style={{ backgroundColor: logoInfo.fallbackColor }}
        >
          {logoInfo.name.charAt(0).toUpperCase()}
        </div>
        {showName && (
          <span className={cn("font-medium", textSizeClasses[size])}>
            {logoInfo.name}
          </span>
        )}
      </div>
    )
  }

  if (shouldShowFallback) {
    // Fallback to text-based logo
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shadow-sm",
            sizeClasses[size],
            textSizeClasses[size]
          )}
          style={{ backgroundColor: logoInfo.fallbackColor }}
        >
          {logoInfo.name.charAt(0).toUpperCase()}
        </div>
        {showName && (
          <span className={cn("font-medium", textSizeClasses[size])}>
            {logoInfo.name}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Show fallback while loading */}
        {!imageLoaded && (
          <div
            className={cn(
              "absolute inset-0 rounded-full flex items-center justify-center text-white font-bold shadow-sm",
              textSizeClasses[size]
            )}
            style={{ backgroundColor: logoInfo.fallbackColor }}
          >
            {logoInfo.name.charAt(0).toUpperCase()}
          </div>
        )}

        <img
          src={logoInfo.logoUrl}
          alt={`${logoInfo.name} logo`}
          className={cn(
            "object-contain bg-white rounded-lg p-1 border border-gray-200 transition-opacity",
            sizeClasses[size],
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onError={(e) => {
            console.log(`Failed to load logo for ${logoInfo.name}:`, logoInfo.logoUrl)
            setImageError(true)
            setImageLoaded(false)
          }}
          onLoad={() => {
            console.log(`Successfully loaded logo for ${logoInfo.name}`)
            setImageError(false)
            setImageLoaded(true)
          }}
          loading="lazy"
        />
      </div>
      {showName && (
        <span className={cn("font-medium", textSizeClasses[size])}>
          {logoInfo.name}
        </span>
      )}
    </div>
  )
}
