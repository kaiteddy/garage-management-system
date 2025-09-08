'use client'

import { useState } from 'react'

interface SWSTestResult {
  success: boolean
  data?: {
    vrm: string
    technicalData: any
    imageUrl?: string
    source: string
    fetchedAt?: string
    cachedAt?: string
  }
  error?: string
}

export default function TestSWSIntegration() {
  const [vrm, setVrm] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SWSTestResult | null>(null)
  const [includeImage, setIncludeImage] = useState(true)

  const testSWSAPI = async () => {
    if (!vrm.trim()) {
      alert('Please enter a VRM')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/sws-vehicle-data?vrm=${vrm.toUpperCase()}&include_image=${includeImage}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testIntegratedSystem = async () => {
    if (!vrm.trim()) {
      alert('Please enter a VRM')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/haynes-vehicle-image?vrm=${vrm.toUpperCase()}`)
      const data = await response.json()
      setResult({
        success: data.success,
        data: data.success ? {
          vrm: vrm.toUpperCase(),
          technicalData: { source: data.source },
          imageUrl: data.imageUrl,
          source: data.source
        } : undefined,
        error: data.error
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setLoading(false)
    }
  }

  const migrateSWSCache = async () => {
    try {
      const response = await fetch('/api/admin/migrate-sws-cache', { method: 'POST' })
      const data = await response.json()
      alert(data.success ? 'SWS cache table created successfully!' : `Error: ${data.error}`)
    } catch (error) {
      alert('Migration failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SWS API Integration Test</h1>

        {/* Setup Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">🔧 Setup Required</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. Environment Variables</h3>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                SWS_API_KEY=your_real_sws_api_key<br/>
                SWS_API_ENABLED=true
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">2. Database Migration</h3>
              <button
                onClick={migrateSWSCache}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create SWS Cache Table
              </button>
            </div>
          </div>
        </div>

        {/* Test Interface */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">🧪 Test SWS Integration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Registration Number
              </label>
              <input
                type="text"
                value={vrm}
                onChange={(e) => setVrm(e.target.value.toUpperCase())}
                placeholder="e.g., LN64XFG"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="mr-2"
                />
                Include vehicle image (SVGZ processing)
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={testSWSAPI}
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test SWS API Only'}
              </button>
              
              <button
                onClick={testIntegratedSystem}
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Integrated System'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Test Results</h2>
            
            <div className={`p-4 rounded-lg mb-4 ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">{result.success ? '✅' : '❌'}</span>
                <span className="font-medium">
                  {result.success ? 'Success' : 'Failed'}
                </span>
              </div>
              
              {result.error && (
                <div className="text-red-700 text-sm">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>

            {result.success && result.data && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>VRM:</strong> {result.data.vrm}</div>
                      <div><strong>Source:</strong> {result.data.source}</div>
                      {result.data.fetchedAt && (
                        <div><strong>Fetched:</strong> {new Date(result.data.fetchedAt).toLocaleString()}</div>
                      )}
                      {result.data.cachedAt && (
                        <div><strong>Cached:</strong> {new Date(result.data.cachedAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vehicle Image */}
                {result.data.imageUrl && (
                  <div>
                    <h3 className="font-semibold mb-2">Vehicle Image</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="mb-2">
                        <strong>Image URL:</strong> 
                        <a 
                          href={result.data.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 ml-2 break-all"
                        >
                          {result.data.imageUrl}
                        </a>
                      </div>
                      
                      {result.data.imageUrl.endsWith('.svgz') ? (
                        <div className="text-sm text-orange-600">
                          ⚠️ This is an SVGZ file that needs decompression for display
                        </div>
                      ) : (
                        <div className="mt-4">
                          <img 
                            src={result.data.imageUrl} 
                            alt={`Vehicle ${result.data.vrm}`}
                            className="max-w-md border border-gray-300 rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const errorDiv = document.createElement('div')
                              errorDiv.className = 'text-red-600 text-sm'
                              errorDiv.textContent = 'Failed to load image'
                              target.parentNode?.appendChild(errorDiv)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Data */}
                {result.data.technicalData && (
                  <div>
                    <h3 className="font-semibold mb-2">Technical Data</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <pre className="text-xs overflow-auto max-h-96">
                        {JSON.stringify(result.data.technicalData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Integration Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔗 Integration Details</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium">Four-Tier Image System:</h3>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li><strong>Tier 1:</strong> HaynesPro SVGZ extraction (highest quality)</li>
                <li><strong>Tier 1.5:</strong> SWS API vehicle images (additional source)</li>
                <li><strong>Tier 2:</strong> AI-generated images (DALL-E 3)</li>
                <li><strong>Tier 3:</strong> Professional SVG placeholders</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium">SWS API Features:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Comprehensive vehicle technical data</li>
                <li>SVGZ vehicle images (when available)</li>
                <li>7-day caching for performance</li>
                <li>Rate limiting protection</li>
                <li>Bulk processing support</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium">Cache Strategy:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>SWS data: 7 days (comprehensive technical data)</li>
                <li>HaynesPro images: 24 hours (may be updated)</li>
                <li>AI images: 30 days (expensive to regenerate)</li>
                <li>Placeholders: 24 hours (lightweight fallback)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Examples */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Examples</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Known Working VRMs:</h3>
              <div className="space-y-1 text-sm">
                <button 
                  onClick={() => setVrm('LN64XFG')}
                  className="block text-blue-600 hover:text-blue-800"
                >
                  LN64XFG
                </button>
                <button 
                  onClick={() => setVrm('AB12CDE')}
                  className="block text-blue-600 hover:text-blue-800"
                >
                  AB12CDE (test)
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">API Endpoints:</h3>
              <div className="space-y-1 text-xs">
                <div><code>/api/sws-vehicle-data</code> - Direct SWS API</div>
                <div><code>/api/haynes-vehicle-image</code> - Integrated system</div>
                <div><code>/api/admin/migrate-sws-cache</code> - Database setup</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
