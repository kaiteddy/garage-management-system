'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { VehicleProfileViewer } from '@/components/vehicle/vehicle-profile-viewer'
import { VehicleDataSelector } from '@/components/vehicle/vehicle-data-selector'

export default function VehicleProfilePage() {
  const params = useParams()
  const router = useRouter()
  const registration = params.registration as string
  const [showEnhancer, setShowEnhancer] = useState(false)

  const handleClose = () => {
    router.back()
  }

  const handleEnhance = () => {
    setShowEnhancer(true)
  }

  const handleDataFetch = async (data: any, cost: number) => {
    setShowEnhancer(false)
    // The profile viewer will automatically refresh when we go back to it
  }

  if (showEnhancer) {
    return (
      <div className="container mx-auto p-6">
        <VehicleDataSelector
          registration={registration}
          onDataFetch={handleDataFetch}
          onClose={() => setShowEnhancer(false)}
        />
      </div>
    )
  }

  return (
    <VehicleProfileViewer
      registration={registration}
      onClose={handleClose}
      onEnhance={handleEnhance}
    />
  )
}
