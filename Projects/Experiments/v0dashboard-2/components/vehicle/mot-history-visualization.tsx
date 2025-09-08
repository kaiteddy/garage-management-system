'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Calendar,
  Gauge,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface MOTTest {
  testDate: string;
  expiryDate: string;
  result: string;
  mileage: number;
  mileageUnit: string;
  testNumber: string;
  defects?: any[];
  advisories?: any[];
}

interface MOTHistoryVisualizationProps {
  motHistory: MOTTest[];
  currentMotStatus?: string;
  currentMotExpiry?: string;
  currentTaxStatus?: string;
  currentTaxExpiry?: string;
  registration: string;
}

export function MOTHistoryVisualization({
  motHistory,
  currentMotStatus = 'Unknown',
  currentMotExpiry,
  currentTaxStatus = 'Unknown',
  currentTaxExpiry,
  registration
}: MOTHistoryVisualizationProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Calculate statistics and determine actual status
  const stats = useMemo(() => {
    if (!motHistory || motHistory.length === 0) {
      return {
        totalTests: 0,
        passCount: 0,
        failCount: 0,
        motDaysRemaining: 0,
        taxDaysRemaining: 0,
        actualMotStatus: 'Unknown',
        actualTaxStatus: 'Unknown',
        chartData: []
      };
    }

    const passCount = motHistory.filter(test =>
      test.result?.toLowerCase().includes('pass')
    ).length;

    const failCount = motHistory.length - passCount;

    // Calculate days remaining
    const motDaysRemaining = currentMotExpiry ?
      Math.ceil((new Date(currentMotExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const taxDaysRemaining = currentTaxExpiry ?
      Math.ceil((new Date(currentTaxExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Determine actual status based on expiry dates (override database status if expired)
    let actualMotStatus = 'Unknown';
    let actualTaxStatus = 'Unknown';

    if (currentMotExpiry) {
      actualMotStatus = motDaysRemaining < 0 ? 'Expired' : currentMotStatus;
    }

    if (currentTaxExpiry) {
      actualTaxStatus = taxDaysRemaining < 0 ? 'Expired' : currentTaxStatus;
    }

    // Prepare chart data
    const chartData = motHistory
      .filter(test => test.mileage && test.mileage > 0)
      .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime())
      .map(test => ({
        date: test.testDate,
        mileage: test.mileage,
        result: test.result,
        year: new Date(test.testDate).getFullYear(),
        displayDate: new Date(test.testDate).toLocaleDateString('en-GB', {
          year: '2-digit',
          month: 'short'
        })
      }));

    return {
      totalTests: motHistory.length,
      passCount,
      failCount,
      motDaysRemaining,
      taxDaysRemaining,
      actualMotStatus,
      actualTaxStatus,
      chartData
    };
  }, [motHistory, currentMotExpiry, currentTaxExpiry]);

  const getStatusColor = (status: string, daysRemaining: number) => {
    if (status?.toLowerCase().includes('valid') || status?.toLowerCase().includes('pass')) {
      if (daysRemaining < 0) return 'bg-red-500';
      if (daysRemaining < 30) return 'bg-orange-500';
      return 'bg-green-500';
    }
    return 'bg-gray-500';
  };

  const formatDaysRemaining = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    return `${days} days remaining`;
  };

  return (
    <div className="space-y-6">
      {/* MOT & Tax Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MOT Status Card */}
        <Card className="overflow-hidden">
          <div className={cn(
            "h-2",
            getStatusColor(stats.actualMotStatus, stats.motDaysRemaining)
          )} />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.actualMotStatus === 'Expired' || stats.motDaysRemaining < 0 ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <CardTitle className="text-lg">MOT Status</CardTitle>
              </div>
              <Badge
                variant={stats.actualMotStatus === 'Expired' || stats.motDaysRemaining < 0 ? 'destructive' : 'default'}
                className="text-white"
              >
                {stats.actualMotStatus === 'Expired' || stats.motDaysRemaining < 0 ? 'Expired' : 'Valid'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Next required</p>
                <p className="font-medium">
                  {currentMotExpiry ? new Date(currentMotExpiry).toLocaleDateString('en-GB') : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days remaining</p>
                <p className={cn(
                  "font-bold text-lg",
                  stats.motDaysRemaining < 0 ? "text-red-600" :
                  stats.motDaysRemaining < 30 ? "text-orange-600" : "text-green-600"
                )}>
                  {stats.motDaysRemaining}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Pass certificates</p>
                <p className="text-2xl font-bold text-green-600">{stats.passCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Fail certificates</p>
                <p className="text-2xl font-bold text-red-600">{stats.failCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Status Card */}
        <Card className="overflow-hidden">
          <div className={cn(
            "h-2",
            getStatusColor(stats.actualTaxStatus, stats.taxDaysRemaining)
          )} />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.actualTaxStatus === 'Expired' || stats.taxDaysRemaining < 0 ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <CardTitle className="text-lg">Tax Status</CardTitle>
              </div>
              <Badge
                variant={stats.actualTaxStatus === 'Expired' || stats.taxDaysRemaining < 0 ? 'destructive' : 'default'}
                className="text-white"
              >
                {stats.actualTaxStatus === 'Expired' || stats.taxDaysRemaining < 0 ? 'Expired' : 'Valid'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tax renewal date</p>
                <p className="font-medium">
                  {currentTaxExpiry ? new Date(currentTaxExpiry).toLocaleDateString('en-GB') : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days remaining</p>
                <p className={cn(
                  "font-bold text-lg",
                  stats.taxDaysRemaining < 0 ? "text-red-600" :
                  stats.taxDaysRemaining < 30 ? "text-orange-600" : "text-green-600"
                )}>
                  {stats.taxDaysRemaining}
                </p>
              </div>
            </div>

            <div className="text-center pt-2 border-t">
              <p className="text-sm text-muted-foreground">Tax status</p>
              <p className="font-medium">
                {stats.actualTaxStatus === 'Expired' || stats.taxDaysRemaining < 0 ? 'Not Taxed' : 'Taxed'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mileage History Chart */}
      {stats.chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mileage History
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              History of mileage recorded during the vehicle's MOT tests
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="mileageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 16 }}
                    tickLine={false}
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 16 }}
                    tickLine={false}
                    width={80}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} miles`,
                      'Mileage'
                    ]}
                    labelFormatter={(label) => `Test Date: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mileage"
                    stroke="#2563eb"
                    strokeWidth={4}
                    fill="url(#mileageGradient)"
                    dot={{ fill: '#2563eb', strokeWidth: 3, r: 6 }}
                    activeDot={{ r: 9, stroke: '#2563eb', strokeWidth: 4, fill: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MOT Test History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            MOT Test History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete history of MOT tests for {registration}
          </p>
        </CardHeader>
        <CardContent>
          {motHistory && motHistory.length > 0 ? (
            <div className="space-y-2">
              {motHistory.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(test.testDate).toLocaleDateString('en-GB')}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Test #{test.testNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {test.mileage ? `${test.mileage.toLocaleString()} ${test.mileageUnit}` : 'Not recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={test.result?.toLowerCase().includes('pass') ? 'default' : 'destructive'}
                    >
                      {test.result?.toUpperCase() || 'UNKNOWN'}
                    </Badge>

                    {test.expiryDate && (
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Expires: {new Date(test.expiryDate).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No MOT History Available</p>
              <p className="text-sm">
                MOT history data will appear here once available from DVLA records
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
