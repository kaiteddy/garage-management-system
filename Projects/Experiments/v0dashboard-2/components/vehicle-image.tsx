import React, { useState, useEffect } from 'react'
import { Car, ImageOff, Loader2 } from 'lucide-react'

interface VehicleImageProps {
  vrm: string
  make?: string
  model?: string
  year?: string | number
  className?: string
  fallbackToGeneric?: boolean
}

interface VehicleImageData {
  imageUrl: string
  source: string
  make: string
  model: string
  year?: string
}

export const VehicleImage: React.FC<VehicleImageProps> = ({
  vrm,
  make,
  model,
  year,
  className = "",
  fallbackToGeneric = true
}) => {
  const [imageData, setImageData] = useState<VehicleImageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (vrm) {
      // Add a small delay to prevent blocking the main component
      const timer = setTimeout(() => {
        fetchVehicleImage()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [vrm, make, model, year])

  const fetchVehicleImage = async () => {
    setLoading(true)
    setError(null)

    try {
      // Remove spaces from VRM for API call
      const cleanVrm = vrm.replace(/\s+/g, '')

      // Check if we have cached image data in sessionStorage to avoid repeated API calls
      const cacheKey = `vehicle-image-vdg-${cleanVrm}`
      const cachedData = sessionStorage.getItem(cacheKey)

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData)
          if (parsed.imageUrl && !parsed.imageUrl.includes('vehicle-image-svg')) {
            console.log(`✅ [VEHICLE-IMAGE] Using cached VDG image for ${cleanVrm}`)
            setImageData(parsed)
            setLoading(false)
            return
          } else {
            // Remove invalid cache (SVG or no image)
            sessionStorage.removeItem(cacheKey)
          }
        } catch (e) {
          // Invalid cache data, continue with API calls
          sessionStorage.removeItem(cacheKey)
        }
      }

      // ONLY USE VDG (Vehicle Data Group) for real vehicle images with timeout
      console.log(`🔍 [VEHICLE-IMAGE] Fetching VDG professional image for ${cleanVrm}`)

      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000) // 5 second timeout
      })

      const fetchPromise = fetch(`/api/vehicle-data?registration=${encodeURIComponent(cleanVrm)}&dataTypes=image`)

      const enhancedResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response

      if (enhancedResponse.ok) {
        const enhancedData = await enhancedResponse.json()

        if (enhancedData.success && enhancedData.data?.image?.imageUrl) {
          console.log(`✅ [VEHICLE-IMAGE] Found VDG professional image for ${cleanVrm}`)
          const imageData = {
            imageUrl: enhancedData.data.image.imageUrl,
            source: 'VDG Professional Image',
            make: make || '',
            model: model || '',
            year: year?.toString()
          }
          setImageData(imageData)
          sessionStorage.setItem(cacheKey, JSON.stringify(imageData))
          return
        }
      }

      // No real vehicle image available from VDG
      console.log(`❌ [VEHICLE-IMAGE] No VDG image available for ${cleanVrm}`)
      setError('No real vehicle image available')

    } catch (err) {
      console.error(`❌ [VEHICLE-IMAGE] Error fetching VDG image for ${vrm}:`, err)

      // If it's a timeout or connection error, show a more specific message
      if (err instanceof Error && (err.message.includes('timeout') || err.message.includes('ETIMEDOUT'))) {
        setError('Connection timeout - image service unavailable')
      } else {
        setError('Failed to load vehicle image')
      }
    } finally {
      setLoading(false)
    }
  }

  // Function to get generic vehicle images based on make/model
  const getGenericVehicleImage = async (make: string, model: string, year?: string): Promise<string | null> => {
    try {
      // Try multiple image sources
      const sources = [
        // Unsplash (free stock photos)
        `https://source.unsplash.com/800x600/?${encodeURIComponent(make + ' ' + model + ' car')}`,
        // Alternative: try with year
        year ? `https://source.unsplash.com/800x600/?${encodeURIComponent(year + ' ' + make + ' ' + model)}` : null,
        // Fallback to just make
        `https://source.unsplash.com/800x600/?${encodeURIComponent(make + ' car')}`
      ].filter(Boolean) as string[]

      // Test if the first source works
      const testResponse = await fetch(sources[0], { method: 'HEAD' })
      if (testResponse.ok) {
        return sources[0]
      }

      return null
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className={`relative bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Loading vehicle image...</p>
        </div>
      </div>
    )
  }

  if (error || !imageData) {
    const isTimeout = error?.includes('timeout') || error?.includes('Connection timeout')

    return (
      <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center p-4">
          <div className="relative">
            <Car className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <div className="absolute -top-1 -right-1 bg-blue-100 rounded-full p-1">
              <ImageOff className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1 font-medium">{vrm}</p>
          <p className="text-xs text-gray-500">{make} {model}</p>
          {isTimeout ? (
            <>
              <p className="text-xs text-orange-600 mt-1 font-medium">⏱️ Service temporarily unavailable</p>
              <p className="text-xs text-gray-400 mt-1">Image service timeout</p>
            </>
          ) : (
            <>
              <p className="text-xs text-blue-600 mt-1 font-medium">No VDG image available</p>
              <p className="text-xs text-gray-400 mt-1">Professional images only</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      <img
        src={imageData.imageUrl}
        alt={`${imageData.make} ${imageData.model} (${vrm})`}
        className="w-full h-full object-contain bg-white"
        style={{
          objectFit: 'contain',
          objectPosition: 'center'
        }}
        onError={(e) => {
          // If image fails to load, show error - no fallbacks
          console.log(`Failed to load image for ${vrm}:`, imageData.imageUrl)
          setError('Image failed to load')
        }}
      />
      
      {/* Professional Image Badge */}
      {imageData.source === 'VDG Professional Image' && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
          ✨ Professional
        </div>
      )}

      {/* Vehicle info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="text-white">
          <p className="font-semibold text-sm">{vrm}</p>
          <p className="text-xs opacity-90">
            {imageData.make} {imageData.model}
            {imageData.year && ` (${imageData.year})`}
          </p>
          <p className="text-xs opacity-75 flex items-center gap-1">
            Source: {imageData.source}
            {imageData.source === 'VDG Professional Image' && (
              <span className="text-green-300">⭐</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

// Compact version for job sheet cards
export const VehicleImageCompact: React.FC<VehicleImageProps> = (props) => {
  return (
    <VehicleImage
      {...props}
      className={`h-24 w-32 ${props.className || ''}`}
      fallbackToGeneric={false}
    />
  )
}

// Large version for job sheet details
export const VehicleImageLarge: React.FC<VehicleImageProps> = (props) => {
  return (
    <VehicleImage
      {...props}
      className={`h-48 w-full object-contain ${props.className || ''}`}
      fallbackToGeneric={false}
    />
  )
}

// Extra large version for vehicle details page
export const VehicleImageXL: React.FC<VehicleImageProps> = (props) => {
  return (
    <VehicleImage
      {...props}
      className={`h-64 w-full ${props.className || ''}`}
      fallbackToGeneric={false}
    />
  )
}

export default VehicleImage
