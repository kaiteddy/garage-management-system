import React from 'react'

interface VehicleDiagramProps {
  vrm: string
  make?: string
  model?: string
  className?: string
  showTechnicalPoints?: boolean
  availableData?: string[]
}

// Technical data points that can be highlighted
const TechnicalDataPoints = ({ availableData = [] }: { availableData: string[] }) => (
  <>
    {/* Engine bay indicator */}
    {(availableData.includes('lubricants') || availableData.includes('lubricantSpecs')) && (
      <g>
        <circle cx="120" cy="90" r="8" fill="#10b981" className="animate-pulse" />
        <text x="120" y="95" textAnchor="middle" className="text-xs font-bold fill-white">E</text>
        <title>Engine/Lubricants Data Available</title>
      </g>
    )}

    {/* Service points */}
    {availableData.includes('repairTimes') && (
      <g>
        <circle cx="200" cy="85" r="6" fill="#f59e0b" className="animate-pulse" />
        <text x="200" y="89" textAnchor="middle" className="text-xs font-bold fill-white">S</text>
        <title>Service/Repair Data Available</title>
      </g>
    )}

    {/* Technical bulletins */}
    {availableData.includes('tsb') && (
      <g>
        <circle cx="280" cy="90" r="6" fill="#ef4444" className="animate-pulse" />
        <text x="280" y="94" textAnchor="middle" className="text-xs font-bold fill-white">T</text>
        <title>Technical Service Bulletins Available</title>
      </g>
    )}

    {/* Air conditioning */}
    {availableData.includes('aircon') && (
      <g>
        <circle cx="160" cy="60" r="5" fill="#06b6d4" className="animate-pulse" />
        <text x="160" y="64" textAnchor="middle" className="text-xs font-bold fill-white">A</text>
        <title>Air Conditioning Data Available</title>
      </g>
    )}
  </>
)

// Generic car SVG diagram
const GenericCarSVG = ({ showTechnicalPoints = false, availableData = [] }: { showTechnicalPoints?: boolean, availableData?: string[] }) => (
  <svg
    viewBox="0 0 400 200"
    className="w-full h-full"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Car body outline */}
    <path
      d="M50 120 L50 140 L70 150 L330 150 L350 140 L350 120 L340 100 L320 80 L300 70 L100 70 L80 80 L60 100 Z"
      fill="#e5e7eb"
      stroke="#374151"
      strokeWidth="2"
    />
    
    {/* Windshield */}
    <path
      d="M100 70 L120 50 L280 50 L300 70"
      fill="#bfdbfe"
      stroke="#374151"
      strokeWidth="2"
    />
    
    {/* Side windows */}
    <path
      d="M120 50 L140 40 L260 40 L280 50"
      fill="#bfdbfe"
      stroke="#374151"
      strokeWidth="2"
    />
    
    {/* Front wheel */}
    <circle
      cx="110"
      cy="150"
      r="25"
      fill="#1f2937"
      stroke="#374151"
      strokeWidth="2"
    />
    <circle
      cx="110"
      cy="150"
      r="15"
      fill="#6b7280"
    />
    
    {/* Rear wheel */}
    <circle
      cx="290"
      cy="150"
      r="25"
      fill="#1f2937"
      stroke="#374151"
      strokeWidth="2"
    />
    <circle
      cx="290"
      cy="150"
      r="15"
      fill="#6b7280"
    />
    
    {/* Headlight */}
    <ellipse
      cx="60"
      cy="110"
      rx="8"
      ry="12"
      fill="#fbbf24"
      stroke="#374151"
      strokeWidth="1"
    />
    
    {/* Taillight */}
    <ellipse
      cx="340"
      cy="110"
      rx="6"
      ry="10"
      fill="#ef4444"
      stroke="#374151"
      strokeWidth="1"
    />
    
    {/* Door lines */}
    <line
      x1="150"
      y1="70"
      x2="150"
      y2="140"
      stroke="#374151"
      strokeWidth="1"
      strokeDasharray="3,3"
    />
    <line
      x1="250"
      y1="70"
      x2="250"
      y2="140"
      stroke="#374151"
      strokeWidth="1"
      strokeDasharray="3,3"
    />
    
    {/* VRM plate */}
    <rect
      x="170"
      y="160"
      width="60"
      height="20"
      fill="white"
      stroke="#374151"
      strokeWidth="1"
      rx="2"
    />

    {/* Technical data points overlay */}
    {showTechnicalPoints && <TechnicalDataPoints availableData={availableData} />}
  </svg>
)

// Volkswagen Golf specific diagram
const VWGolfSVG = ({ showTechnicalPoints = false, availableData = [] }: { showTechnicalPoints?: boolean, availableData?: string[] }) => (
  <svg
    viewBox="0 0 400 200"
    className="w-full h-full"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Golf-specific body shape */}
    <path
      d="M45 125 L45 145 L65 155 L335 155 L355 145 L355 125 L345 105 L325 85 L305 75 L95 75 L75 85 L55 105 Z"
      fill="#dbeafe"
      stroke="#1e40af"
      strokeWidth="2"
    />
    
    {/* Distinctive Golf windshield */}
    <path
      d="M95 75 L115 55 L285 55 L305 75"
      fill="#93c5fd"
      stroke="#1e40af"
      strokeWidth="2"
    />
    
    {/* Golf roof line */}
    <path
      d="M115 55 L135 45 L265 45 L285 55"
      fill="#93c5fd"
      stroke="#1e40af"
      strokeWidth="2"
    />
    
    {/* VW logo position */}
    <circle
      cx="55"
      cy="115"
      r="12"
      fill="#1e40af"
      stroke="#1e3a8a"
      strokeWidth="2"
    />
    <text
      x="55"
      y="120"
      textAnchor="middle"
      className="text-xs font-bold fill-white"
    >
      VW
    </text>
    
    {/* Wheels with Golf-style rims */}
    <circle cx="105" cy="155" r="28" fill="#1f2937" stroke="#1e40af" strokeWidth="2" />
    <circle cx="105" cy="155" r="18" fill="#3b82f6" />
    <circle cx="105" cy="155" r="8" fill="#1e40af" />
    
    <circle cx="295" cy="155" r="28" fill="#1f2937" stroke="#1e40af" strokeWidth="2" />
    <circle cx="295" cy="155" r="18" fill="#3b82f6" />
    <circle cx="295" cy="155" r="8" fill="#1e40af" />
    
    {/* Golf headlight design */}
    <ellipse cx="50" cy="115" rx="10" ry="15" fill="#fbbf24" stroke="#1e40af" strokeWidth="1" />
    <ellipse cx="350" cy="115" rx="8" ry="12" fill="#ef4444" stroke="#1e40af" strokeWidth="1" />
    
    {/* Door lines */}
    <line x1="145" y1="75" x2="145" y2="145" stroke="#1e40af" strokeWidth="1" strokeDasharray="2,2" />
    <line x1="255" y1="75" x2="255" y2="145" stroke="#1e40af" strokeWidth="1" strokeDasharray="2,2" />

    {/* Technical data points overlay */}
    {showTechnicalPoints && <TechnicalDataPoints availableData={availableData} />}
  </svg>
)

export const VehicleDiagram: React.FC<VehicleDiagramProps> = ({
  vrm,
  make,
  model,
  className = "",
  showTechnicalPoints = false,
  availableData = []
}) => {
  // Determine which diagram to show based on make/model
  const getDiagram = () => {
    if (make?.toUpperCase().includes('VOLKSWAGEN') && model?.toUpperCase().includes('GOLF')) {
      return <VWGolfSVG showTechnicalPoints={showTechnicalPoints} availableData={availableData} />
    }

    // Add more specific diagrams here
    // if (make?.toUpperCase().includes('BMW')) return <BMWSVGDiagram />
    // if (make?.toUpperCase().includes('AUDI')) return <AudiSVGDiagram />

    return <GenericCarSVG showTechnicalPoints={showTechnicalPoints} availableData={availableData} />
  }

  return (
    <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 ${className}`}>
      <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium text-gray-600 shadow-sm">
        {vrm}
      </div>
      
      <div className="h-32 flex items-center justify-center">
        {getDiagram()}
      </div>
      
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-gray-700">
          {make} {model}
        </p>
        <p className="text-xs text-gray-500">Vehicle Diagram</p>

        {/* Technical data legend */}
        {showTechnicalPoints && availableData.length > 0 && (
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <p className="font-medium">Available Data:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {availableData.includes('lubricants') && (
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Engine
                </span>
              )}
              {availableData.includes('repairTimes') && (
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Service
                </span>
              )}
              {availableData.includes('tsb') && (
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Bulletins
                </span>
              )}
              {availableData.includes('aircon') && (
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  A/C
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VehicleDiagram
