'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function TestVehicleImages() {
  const [vrm, setVrm] = useState('LN64XFG')
  const [imageData, setImageData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testVRMs = ['LN64XFG', 'ABC123', 'XYZ789', 'TEST01']

  const fetchVehicleImage = async (testVrm: string) => {
    setLoading(true)
    setError('')
    setImageData(null)
    
    try {
      const response = await fetch(`/api/haynes-vehicle-image?vrm=${testVrm}`)
      const data = await response.json()
      
      if (data.success) {
        setImageData(data)
      } else {
        setError(data.error || 'Failed to fetch vehicle image')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Vehicle Image Test</h1>
      
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={vrm}
            onChange={(e) => setVrm(e.target.value.toUpperCase())}
            placeholder="Enter VRM"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={() => fetchVehicleImage(vrm)}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Image'}
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <span className="text-sm text-gray-600">Quick test:</span>
          {testVRMs.map((testVrm) => (
            <button
              key={testVrm}
              onClick={() => {
                setVrm(testVrm)
                fetchVehicleImage(testVrm)
              }}
              className="text-sm bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
            >
              {testVrm}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="font-medium">No Real Vehicle Image Found</div>
          <div className="text-sm mt-1">{error}</div>
          <div className="text-xs mt-2 text-red-600">
            ℹ️ This system only provides real vehicle images - no AI-generated or placeholder images
          </div>
        </div>
      )}

      {imageData && imageData.imageUrl && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Vehicle Image for {imageData.vrm}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Image:</h3>
              <div className="border border-gray-200 rounded p-4 bg-gray-50">
                <img
                  src={imageData.imageUrl}
                  alt={`Vehicle ${imageData.vrm}`}
                  className="max-w-full h-auto"
                  style={{ maxHeight: '300px' }}
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Details:</h3>
              <div className="space-y-2 text-sm">
                <div><strong>VRM:</strong> {imageData.vrm}</div>
                <div><strong>Source:</strong> {imageData.source}</div>
                <div><strong>Cached:</strong> {imageData.cached ? 'Yes' : 'No'}</div>
                <div><strong>Image Type:</strong> {imageData.imageUrl.startsWith('data:') ? 'Data URL' : 'External URL'}</div>
                <div><strong>Size:</strong> {Math.round(imageData.imageUrl.length / 1024)} KB</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">Real Images Only System:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>🏆 <strong>Tier 1:</strong> Real HaynesPro vehicle images (SVGZ extraction)</li>
            <li>🔍 <strong>Tier 1.5:</strong> SWS API vehicle images (additional source)</li>
            <li>❌ <strong>No Fake Images:</strong> No AI-generated or placeholder images</li>
            <li>✅ <strong>Authentic Only:</strong> Real vehicle photos or no image at all</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-2">System Features:</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✅ Rate limiting (2-second delays between API calls)</li>
            <li>✅ Smart caching (24h for HaynesPro, 7d for SWS data)</li>
            <li>✅ Real images only - no fake content</li>
            <li>✅ Error handling & graceful fallbacks</li>
            <li>✅ SVGZ extraction from HaynesPro responses</li>
            <li>✅ SWS API integration for additional coverage</li>
            <li>✅ Professional business-grade reliability</li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => window.open('/api/admin/ai-image-stats', '_blank')}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm"
        >
          View AI Generation Statistics
        </button>
      </div>
    </div>
  )
}
