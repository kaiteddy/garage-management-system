'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type TestResult = {
  success: boolean;
  message: string;
  data?: any;
  timestamp?: string;
};

export default function TestAPIs() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    connection?: TestResult;
    dvsa?: TestResult;
    dvla?: TestResult;
    error?: string;
  }>({});

  const runTests = async () => {
    setIsLoading(true);
    setTestResults({});
    
    try {
      // Test connection first - this will test both DVSA and DVLA APIs
      const connectionResponse = await fetch('/api/test-connection');
      const connectionData = await connectionResponse.json();
      
      if (!connectionResponse.ok) {
        throw new Error(connectionData.error || 'Connection test failed');
      }
      
      // The test-connection endpoint now returns both DVSA and DVLA test results
      setTestResults({
        connection: {
          success: true,
          message: 'API Connections Test',
          data: connectionData,
          timestamp: new Date().toISOString()
        },
        dvsa: {
          success: !!connectionData.dvsa,
          message: 'DVSA MOT Check API',
          data: connectionData.dvsa || { error: 'No DVSA data received' },
          timestamp: new Date().toISOString()
        },
        dvla: {
          success: !!connectionData.dvla,
          message: 'DVLA Vehicle Details API',
          data: connectionData.dvla || { error: 'No DVLA data received' },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('API Test Error:', error);
      setTestResults(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const renderTestResult = (result?: TestResult) => {
    if (!result) return null;
    
    const isSuccess = result.success;
    
    return (
      <Card className={`mb-4 ${isSuccess ? 'border-green-200' : 'border-red-200'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <CardTitle className="text-lg">{result.message}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Status: {isSuccess ? 'Success' : 'Failed'}</p>
            {result.timestamp && <p>Time: {new Date(result.timestamp).toLocaleString()}</p>}
            {result.data && (
              <div className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">API Connection Tests</h1>
      
      <div className="mb-6">
        <Button 
          onClick={runTests} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Run All Tests'
          )}
        </Button>
      </div>

      {testResults.error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-medium">Error</h3>
          </div>
          <p className="mt-1 text-sm">{testResults.error}</p>
        </div>
      )}

      <div className="space-y-4">
        {renderTestResult(testResults.connection)}
        {renderTestResult(testResults.dvsa)}
        {renderTestResult(testResults.dvla)}
      </div>
    </div>
  );
}
