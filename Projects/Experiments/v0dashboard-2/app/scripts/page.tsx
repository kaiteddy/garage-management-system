"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  Wrench, 
  Zap, 
  Shield, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Download
} from "lucide-react"

interface ScriptResult {
  success: boolean
  message?: string
  timestamp: string
  [key: string]: any
}

export default function ScriptsPage() {
  const [activeScript, setActiveScript] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, ScriptResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const scriptCategories = [
    {
      id: 'health',
      name: 'Database Health',
      icon: Database,
      color: 'bg-blue-500',
      scripts: [
        {
          id: 'database-health',
          name: 'Database Health Check',
          description: 'Comprehensive database health analysis with recommendations',
          endpoint: '/api/scripts/database-health',
          actions: ['analyze', 'fix']
        },
        {
          id: 'connection-check',
          name: 'Connection Integrity',
          description: 'Verify customer-vehicle and document relationships',
          endpoint: '/api/fix-customer-vehicle-relationships',
          actions: ['check', 'fix']
        }
      ]
    },
    {
      id: 'cleanup',
      name: 'Data Cleanup',
      icon: Wrench,
      color: 'bg-orange-500',
      scripts: [
        {
          id: 'data-cleanup',
          name: 'Data Cleanup Suite',
          description: 'Remove duplicates, fix incomplete records, and standardize data',
          endpoint: '/api/scripts/data-cleanup',
          actions: ['analyze', 'cleanup']
        },
        {
          id: 'orphan-cleanup',
          name: 'Orphan Record Cleanup',
          description: 'Clean up orphaned line items and invalid references',
          endpoint: '/api/scripts/data-cleanup',
          actions: ['analyze', 'clean']
        }
      ]
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: Zap,
      color: 'bg-green-500',
      scripts: [
        {
          id: 'performance-optimizer',
          name: 'Performance Optimizer',
          description: 'Analyze and optimize database performance',
          endpoint: '/api/scripts/performance-optimizer',
          actions: ['analyze', 'optimize']
        },
        {
          id: 'index-manager',
          name: 'Index Manager',
          description: 'Create and manage database indexes for optimal performance',
          endpoint: '/api/scripts/performance-optimizer',
          actions: ['analyze', 'create_indexes']
        }
      ]
    },
    {
      id: 'backup',
      name: 'Backup & Recovery',
      icon: Shield,
      color: 'bg-purple-500',
      scripts: [
        {
          id: 'backup-manager',
          name: 'Backup Manager',
          description: 'Database backup analysis and management',
          endpoint: '/api/scripts/backup-manager',
          actions: ['analyze', 'backup']
        },
        {
          id: 'data-export',
          name: 'Data Export',
          description: 'Export data for backup or migration purposes',
          endpoint: '/api/scripts/backup-manager',
          actions: ['analyze', 'export']
        }
      ]
    }
  ]

  const runScript = async (script: any, action: string = 'analyze') => {
    const scriptKey = `${script.id}-${action}`
    setLoading(prev => ({ ...prev, [scriptKey]: true }))
    setActiveScript(scriptKey)

    try {
      const method = action === 'analyze' ? 'GET' : 'POST'
      const body = action !== 'analyze' ? JSON.stringify({ action, options: {} }) : undefined

      const response = await fetch(script.endpoint, {
        method,
        headers: action !== 'analyze' ? { 'Content-Type': 'application/json' } : {},
        body
      })

      const data = await response.json()
      setResults(prev => ({ ...prev, [scriptKey]: data }))

    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [scriptKey]: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [scriptKey]: false }))
    }
  }

  const getStatusIcon = (result: ScriptResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Management Scripts</h1>
        <p className="text-muted-foreground">
          Comprehensive tools for database health, cleanup, performance, and backup management
        </p>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {scriptCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              <category.icon className="h-4 w-4" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {scriptCategories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {category.scripts.map((script) => (
                <Card key={script.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      {script.name}
                    </CardTitle>
                    <CardDescription>{script.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {script.actions.map((action) => {
                          const scriptKey = `${script.id}-${action}`
                          const isLoading = loading[scriptKey]
                          const result = results[scriptKey]

                          return (
                            <Button
                              key={action}
                              onClick={() => runScript(script, action)}
                              disabled={isLoading}
                              variant={action === 'analyze' ? 'outline' : 'default'}
                              size="sm"
                            >
                              {isLoading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </Button>
                          )
                        })}
                      </div>

                      {/* Results Display */}
                      {script.actions.map((action) => {
                        const scriptKey = `${script.id}-${action}`
                        const result = results[scriptKey]

                        if (!result) return null

                        return (
                          <div key={scriptKey} className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result)}
                              <span className="font-medium capitalize">{action} Results</span>
                              <Badge variant="outline" className="text-xs">
                                {new Date(result.timestamp).toLocaleTimeString()}
                              </Badge>
                            </div>

                            {result.success ? (
                              <div className="space-y-2">
                                {/* Health Score */}
                                {result.health_score && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">Health Score:</span>
                                    <Badge className={getScoreColor(result.health_score)}>
                                      {result.health_score}%
                                    </Badge>
                                  </div>
                                )}

                                {/* Performance Score */}
                                {result.performance_score && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">Performance Score:</span>
                                    <Badge className={getScoreColor(result.performance_score)}>
                                      {result.performance_score}%
                                    </Badge>
                                  </div>
                                )}

                                {/* Cleanup Score */}
                                {result.cleanup_score && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">Cleanup Score:</span>
                                    <Badge className={getScoreColor(result.cleanup_score)}>
                                      {result.cleanup_score}%
                                    </Badge>
                                  </div>
                                )}

                                {/* Summary Stats */}
                                {result.summary && (
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Object.entries(result.summary).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                        </span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Recommendations */}
                                {result.recommendations && result.recommendations.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-sm font-medium">Recommendations:</span>
                                    {result.recommendations.slice(0, 3).map((rec: any, index: number) => (
                                      <Alert key={index} className="py-2">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription className="text-xs">
                                          <strong>{rec.priority.toUpperCase()}:</strong> {rec.message}
                                        </AlertDescription>
                                      </Alert>
                                    ))}
                                  </div>
                                )}

                                {/* Success Message */}
                                {result.message && (
                                  <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                      {result.message}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            ) : (
                              <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  {result.message || 'Script execution failed'}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common maintenance tasks and emergency procedures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => runScript({ id: 'health-check', endpoint: '/api/scripts/database-health' }, 'analyze')}
            >
              <Database className="h-6 w-6 mb-2" />
              Health Check
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => runScript({ id: 'connection-fix', endpoint: '/api/fix-customer-vehicle-relationships' }, 'fix')}
            >
              <Wrench className="h-6 w-6 mb-2" />
              Fix Connections
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => runScript({ id: 'performance', endpoint: '/api/scripts/performance-optimizer' }, 'analyze')}
            >
              <Zap className="h-6 w-6 mb-2" />
              Performance
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => runScript({ id: 'backup', endpoint: '/api/scripts/backup-manager' }, 'analyze')}
            >
              <Shield className="h-6 w-6 mb-2" />
              Backup Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
