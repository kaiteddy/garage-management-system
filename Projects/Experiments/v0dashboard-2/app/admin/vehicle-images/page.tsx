'use client'

import { useState, useEffect } from 'react'

interface AiStats {
  config: {
    enabled: boolean
    dailyLimit: number
    monthlyLimit: number
    hasApiKey: boolean
  }
  usage: {
    today: {
      count: number
      limit: number
      percentage: number
      remaining: number
    }
    thisMonth: {
      count: number
      limit: number
      percentage: number
      remaining: number
    }
    total: number
  }
  cache: {
    totalImages: number
    aiGenerated: number
    haynesPro: number
    placeholders: number
    activeCache: number
    expiredCache: number
  }
  recentGenerations: Array<{
    vrm: string
    source: string
    createdAt: string
    timeAgo: string
  }>
}

export default function VehicleImagesAdmin() {
  const [stats, setStats] = useState<AiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ai-image-stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data)
        setError('')
      } else {
        setError(data.error || 'Failed to fetch statistics')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading AI image statistics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Vehicle Images Admin</h1>
        <button
          onClick={fetchStats}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* Configuration Status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">AI Generation</h3>
          <div className={`text-lg font-bold ${stats.config.enabled ? 'text-green-600' : 'text-red-600'}`}>
            {stats.config.enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">API Key</h3>
          <div className={`text-lg font-bold ${stats.config.hasApiKey ? 'text-green-600' : 'text-red-600'}`}>
            {stats.config.hasApiKey ? 'Configured' : 'Missing'}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Daily Limit</h3>
          <div className="text-lg font-bold text-gray-800">
            {stats.config.dailyLimit}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Monthly Limit</h3>
          <div className="text-lg font-bold text-gray-800">
            {stats.config.monthlyLimit}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Today's Usage</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Used: {stats.usage.today.count}</span>
                <span>Remaining: {stats.usage.today.remaining}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getStatusColor(stats.usage.today.percentage)}`}
                  style={{ width: `${Math.min(stats.usage.today.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                {stats.usage.today.percentage}% of daily limit
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">This Month's Usage</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Used: {stats.usage.thisMonth.count}</span>
                <span>Remaining: {stats.usage.thisMonth.remaining}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getStatusColor(stats.usage.thisMonth.percentage)}`}
                  style={{ width: `${Math.min(stats.usage.thisMonth.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                {stats.usage.thisMonth.percentage}% of monthly limit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Cache Statistics</h3>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.cache.totalImages}</div>
            <div className="text-sm text-gray-600">Total Images</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.cache.aiGenerated}</div>
            <div className="text-sm text-gray-600">AI Generated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.cache.haynesPro}</div>
            <div className="text-sm text-gray-600">HaynesPro</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.cache.placeholders}</div>
            <div className="text-sm text-gray-600">Placeholders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.cache.activeCache}</div>
            <div className="text-sm text-gray-600">Active Cache</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cache.expiredCache}</div>
            <div className="text-sm text-gray-600">Expired Cache</div>
          </div>
        </div>
      </div>

      {/* Recent Generations */}
      {stats.recentGenerations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Recent AI Generations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">VRM</th>
                  <th className="text-left py-2">Source</th>
                  <th className="text-left py-2">Generated</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentGenerations.map((gen, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 font-mono">{gen.vrm}</td>
                    <td className="py-2">{gen.source}</td>
                    <td className="py-2 text-gray-600">{gen.timeAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!stats.config.hasApiKey && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Setup Required</h3>
          <p className="text-yellow-700 mb-4">
            AI image generation is not configured. Add your OpenAI API key to enable AI-generated vehicle images.
          </p>
          <div className="bg-yellow-100 rounded p-3 font-mono text-sm">
            OPENAI_API_KEY=your_api_key_here<br/>
            AI_IMAGE_GENERATION_ENABLED=true
          </div>
        </div>
      )}
    </div>
  )
}
