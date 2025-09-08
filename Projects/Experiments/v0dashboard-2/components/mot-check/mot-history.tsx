'use client';

import { useState } from 'react';
import { formatDate } from './utils';
import { MOTTestResult } from './types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Calendar, Gauge, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MOTHistoryProps {
  tests: MOTTestResult[];
}

export function MOTHistory({ tests }: MOTHistoryProps) {
  const [expandedTest, setExpandedTest] = useState<number | null>(null);

  if (!tests || tests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No MOT history found for this vehicle</p>
      </div>
    );
  }

  const toggleTest = (index: number) => {
    setExpandedTest(expandedTest === index ? null : index);
  };

  const getTestStatus = (test: MOTTestResult) => {
    if (test.testResult.toLowerCase() === 'passed') return 'PASS';
    if (test.defects.some(d => d.dangerous)) return 'DANGEROUS';
    if (test.defects.some(d => d.type === 'MAJOR')) return 'FAILED';
    if (test.defects.some(d => d.type === 'MINOR' || d.type === 'ADVISORY')) return 'ADVISORY';
    return 'UNKNOWN';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-100 text-green-800';
      case 'DANGEROUS':
        return 'bg-red-100 text-red-800';
      case 'FAILED':
        return 'bg-amber-100 text-amber-800';
      case 'ADVISORY':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">MOT History</CardTitle>
          <div className="text-sm text-muted-foreground">
            {tests.length} test{tests.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {tests.map((test, index) => {
            const status = getTestStatus(test);
            const isExpanded = expandedTest === index;
            
            return (
              <div key={index} className="group">
                <button
                  onClick={() => toggleTest(index)}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                  aria-expanded={isExpanded}
                  aria-controls={`test-details-${index}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-left">
                      <div className="font-medium">
                        {formatDate(test.completedDate)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Gauge className="h-3.5 w-3.5 mr-1.5" />
                        {test.odometerValue ? (
                          <span>{test.odometerValue.toLocaleString()} {test.odometerUnit || 'miles'}</span>
                        ) : (
                          <span>Mileage not recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={cn("px-2.5 py-1 text-xs font-medium", getStatusColor(status))}>
                      {status}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div id={`test-details-${index}`} className="px-6 pb-4 pt-2 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Test Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Test Number</span>
                            <span className="font-medium">{test.testNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Test Date</span>
                            <span className="font-medium">{formatDate(test.completedDate)}</span>
                          </div>
                          {test.expiryDate && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Expiry Date</span>
                              <span className="font-medium">{formatDate(test.expiryDate)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Odometer</span>
                            <span className="font-medium">
                              {test.odometerValue 
                                ? `${test.odometerValue.toLocaleString()} ${test.odometerUnit || 'miles'}`
                                : 'Not recorded'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Result</span>
                            <span className="font-medium">{test.testResult}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                          {test.defects.length > 0 ? 'Defects & Advisories' : 'No Defects Found'}
                          {test.defects.length > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {test.defects.length} {test.defects.length === 1 ? 'item' : 'items'}
                            </Badge>
                          )}
                        </h4>
                        
                        {test.defects.length > 0 ? (
                          <div className="space-y-3">
                            {test.defects.map((defect, idx) => (
                              <div 
                                key={idx} 
                                className={cn(
                                  "p-3 rounded-md text-sm",
                                  defect.dangerous 
                                    ? "bg-red-50 border border-red-100" 
                                    : defect.type === 'MAJOR'
                                      ? "bg-amber-50 border border-amber-100"
                                      : defect.type === 'MINOR'
                                        ? "bg-blue-50 border border-blue-100"
                                        : "bg-gray-50 border border-gray-100"
                                )}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <Badge 
                                    variant={defect.dangerous ? 'destructive' : 'outline'}
                                    className={cn(
                                      defect.type === 'MAJOR' && !defect.dangerous ? 'bg-amber-100 text-amber-800 border-amber-200' : '',
                                      defect.type === 'MINOR' ? 'bg-blue-100 text-blue-800 border-blue-200' : '',
                                      defect.type === 'ADVISORY' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''
                                    )}
                                  >
                                    {defect.dangerous ? 'DANGEROUS' : defect.type}
                                  </Badge>
                                </div>
                                <p className="text-foreground">{defect.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            No defects or advisories were noted during this test.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
