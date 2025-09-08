'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, CheckCircle, XCircle, Clock, Zap, Shield } from 'lucide-react';
import { IntegrationStatus } from '@/components/partsouq/integration-status';
import { DemoResults } from '@/components/partsouq/demo-results';
import { DevelopmentStatus } from '@/components/partsouq/development-status';
import { CloudflareExplanation } from '@/components/partsouq/cloudflare-explanation';
import { SevenZapExplanation } from '@/components/partsouq/sevenzap-explanation';

interface PartSouqResult {
  success: boolean;
  parts: any[];
  totalCount: number;
  error?: string;
  responseTime?: number;
  method?: string;
}

interface TestResult {
  method: string;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

interface StatsData {
  browser: { attempts: number; successes: number; avgResponseTime: number };
  scrapingbee: { attempts: number; successes: number; avgResponseTime: number };
  manual: { attempts: number; successes: number; avgResponseTime: number };
}

export default function PartSouqTestPage() {
  const [vin, setVin] = useState('WBA2D520X05E20424');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PartSouqResult | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activeTab, setActiveTab] = useState('status');

  // Test VIN search
  const handleVinSearch = async (source: 'partsouq' | '7zap' | 'auto' | 'mock' = 'auto') => {
    setLoading(true);
    setResult(null);

    try {
      const startTime = Date.now();

      if (source === 'mock') {
        const response = await fetch('/api/partsouq/mock-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin })
        });
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        setResult({ ...data, responseTime });
        return;
      }

      const response = await fetch('/api/parts/search-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, source })
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      setResult({
        ...data,
        responseTime
      });
    } catch (error) {
      setResult({
        success: false,
        parts: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Test all methods
  const handleAdvancedTest = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      const response = await fetch('/api/parts/test-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vin, 
          testAllMethods: true, 
          includeStats: true 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data.tests) {
        const results: TestResult[] = Object.entries(data.data.tests).map(([method, test]: [string, any]) => ({
          method,
          success: test.success,
          responseTime: test.responseTime,
          error: test.error,
          data: test.data
        }));
        setTestResults(results);
      }
    } catch (error) {
      console.error('Advanced test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/partsouq/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Test Cloudflare token generation
  const testCloudflareToken = async () => {
    try {
      const response = await fetch('/api/cloudflare/test-token');
      const data = await response.json();
      console.log('Cloudflare token test:', data);
      return data;
    } catch (error) {
      console.error('Cloudflare token test failed:', error);
    }
  };

  // Analyze live Cloudflare challenge
  const analyzeLiveChallenge = async () => {
    try {
      const response = await fetch('/api/cloudflare/analyze-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://partsouq.com/en/catalog/genuine/vehicle?q=WBA2D520X05E20424'
        })
      });
      const data = await response.json();
      console.log('Live challenge analysis:', data);
      alert(`Challenge Analysis: ${data.success ? 'Success' : 'Failed'}\nCheck console for details`);
      return data;
    } catch (error) {
      console.error('Live challenge analysis failed:', error);
      alert('Analysis failed - check console for details');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Parts Integration Test Center</h1>
        <p className="text-muted-foreground">
          Comprehensive testing interface for PartSouq VIN search, 7zap OEM catalogs, and Cloudflare bypass
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="7zap">7zap NEW!</TabsTrigger>
          <TabsTrigger value="challenge">Challenge</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
          <TabsTrigger value="demo">Demo</TabsTrigger>
          <TabsTrigger value="search">VIN Search</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Test</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <IntegrationStatus />
        </TabsContent>

        {/* 7zap Explanation Tab */}
        <TabsContent value="7zap" className="space-y-4">
          <SevenZapExplanation />
        </TabsContent>

        {/* Challenge Explanation Tab */}
        <TabsContent value="challenge" className="space-y-4">
          <CloudflareExplanation />
        </TabsContent>

        {/* Console Errors Tab */}
        <TabsContent value="console" className="space-y-4">
          <DevelopmentStatus />
        </TabsContent>

        {/* Demo Tab */}
        <TabsContent value="demo" className="space-y-4">
          <DemoResults />
        </TabsContent>

        {/* VIN Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                PartSouq VIN Search
              </CardTitle>
              <CardDescription>
                Search for vehicle parts using VIN number with intelligent method selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter VIN (e.g., WBA2D520X05E20424)"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    onClick={() => handleVinSearch('auto')}
                    disabled={loading || !vin}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Auto (Best)
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleVinSearch('7zap')}
                    disabled={loading || !vin}
                    variant="secondary"
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        7zap OEM
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleVinSearch('partsouq')}
                    disabled={loading || !vin}
                    variant="outline"
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        PartSouq
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleVinSearch('mock')}
                    disabled={loading || !vin}
                    variant="outline"
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Mock Demo
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Auto (Best):</strong> Intelligent selection - tries 7zap OEM first, then PartSouq fallback</p>
                  <p><strong>7zap OEM:</strong> Superior OEM catalogs with brand-specific domains (NEW!)</p>
                  <p><strong>PartSouq:</strong> Original integration with Cloudflare bypass</p>
                  <p><strong>Mock Demo:</strong> Sample data for testing UI functionality</p>
                </div>
              </div>

              {result && (
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            {result.success ? 'Search Successful' : 'Search Failed'}
                          </span>
                          {result.responseTime && (
                            <Badge variant="outline">
                              <Clock className="mr-1 h-3 w-3" />
                              {result.responseTime}ms
                            </Badge>
                          )}
                          {result.method && (
                            <Badge variant="secondary">
                              Method: {result.method}
                            </Badge>
                          )}
                        </div>
                        
                        {result.success ? (
                          <div>
                            <p>Found {result.totalCount} parts</p>
                            {result.parts.length > 0 && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                <pre className="text-xs overflow-auto max-h-32">
                                  {JSON.stringify(result.parts.slice(0, 3), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-600">{result.error}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Test Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Advanced Multi-Method Test
              </CardTitle>
              <CardDescription>
                Test all PartSouq access methods: Browser Automation, ScrapingBee, and Manual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter VIN for comprehensive testing"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAdvancedTest} 
                  disabled={loading || !vin}
                  variant="secondary"
                  className="min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Test All
                    </>
                  )}
                </Button>
              </div>

              {testResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Test Results:</h3>
                  {testResults.map((test, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {test.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium capitalize">{test.method}</p>
                            <p className="text-sm text-muted-foreground">
                              {test.success ? 'Success' : test.error}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {test.responseTime}ms
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Statistics</CardTitle>
              <CardDescription>
                Real-time analytics for PartSouq integration performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadStats} className="mb-4">
                Load Statistics
              </Button>
              
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(stats).map(([method, data]) => (
                    <Card key={method} className="p-4">
                      <h3 className="font-medium capitalize mb-2">{method}</h3>
                      <div className="space-y-1 text-sm">
                        <p>Attempts: {data.attempts}</p>
                        <p>Successes: {data.successes}</p>
                        <p>Success Rate: {data.attempts > 0 ? Math.round((data.successes / data.attempts) * 100) : 0}%</p>
                        <p>Avg Response: {Math.round(data.avgResponseTime)}ms</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloudflare Tab */}
        <TabsContent value="cloudflare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cloudflare Challenge Testing</CardTitle>
              <CardDescription>
                Test Cloudflare token generation and live challenge analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={testCloudflareToken} variant="outline">
                  Test Token Generation
                </Button>
                <Button onClick={analyzeLiveChallenge} variant="default">
                  Analyze Live Challenge
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Challenge Analysis Tools:</p>
                    <ul className="text-sm space-y-1">
                      <li>• <strong>Token Generation:</strong> Tests our Fiddler-based token creation</li>
                      <li>• <strong>Live Challenge:</strong> Analyzes the actual PartSouq challenge page</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Results will be shown in browser console and alert dialogs.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Challenge Information */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-2">About the Challenge You're Seeing:</h3>
                  <div className="text-sm space-y-1">
                    <p>• <strong>"Verifying you are human"</strong> - Standard Cloudflare protection</p>
                    <p>• <strong>Automatic completion</strong> - Usually takes 5-10 seconds</p>
                    <p>• <strong>Our integration handles this</strong> - Browser automation + token solving</p>
                    <p>• <strong>Production ready</strong> - Will work with proper SSL certificates</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
