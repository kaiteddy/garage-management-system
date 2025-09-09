'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Car,
  DollarSign,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  RefreshCw,
  ArrowRight,
  FileText,
  Upload,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import QuickBookingFAB from "@/app/components/QuickBookingFAB";

interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  totalRevenue: number;
  totalJobs: number;
  motStats: {
    expired: number;
    expiringSoon: number;
    dueThisMonth: number;
    valid: number;
  };
}

export function MainDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalVehicles: 0,
    totalRevenue: 0,
    totalJobs: 0,
    motStats: {
      expired: 0,
      expiringSoon: 0,
      dueThisMonth: 0,
      valid: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();

      if (data.success) {
        setStats({
          totalCustomers: data.systemStatus?.customers || 0,
          totalVehicles: data.systemStatus?.vehicles || 0,
          totalRevenue: data.systemStatus?.totalRevenue || 0,
          totalJobs: data.systemStatus?.activeJobSheets || 0,
          motStats: {
            expired: data.systemStatus?.criticalMots || 0,
            expiringSoon: data.systemStatus?.dueSoonMots || 0,
            dueThisMonth: data.systemStatus?.thisMonthMots || 0,
            valid: (data.systemStatus?.vehicles || 0) - (data.systemStatus?.criticalMots || 0) - (data.systemStatus?.dueSoonMots || 0) - (data.systemStatus?.thisMonthMots || 0),
          },
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: "TOTAL CUSTOMERS",
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      color: "bg-blue-500",
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "TOTAL VEHICLES",
      value: stats.totalVehicles.toLocaleString(),
      icon: Car,
      color: "bg-green-500",
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      title: "ACTIVE JOBS",
      value: stats.totalJobs.toLocaleString(),
      icon: Wrench,
      color: "bg-purple-500",
      change: "+23%",
      changeType: "positive" as const,
    },
    {
      title: "REVENUE",
      value: `£${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-orange-500",
      change: "+15%",
      changeType: "positive" as const,
    },
  ];

  const quickActions = [
    {
      id: "add-customer",
      title: "Add Customer",
      icon: Users,
      path: "/customers",
      description: "Register new customer",
      color: "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 dark:hover:border-blue-800",
    },
    {
      id: "add-vehicle",
      title: "Add Vehicle",
      icon: Car,
      path: "/vehicles",
      description: "Register new vehicle",
      color: "hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:border-green-800",
    },
    {
      id: "new-job",
      title: "New Job",
      icon: Wrench,
      path: "/job-sheets",
      description: "Create work order",
      color: "hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/30 dark:hover:border-orange-800",
    },
    {
      id: "create-invoice",
      title: "Create Invoice",
      icon: FileText,
      path: "/invoices",
      description: "Generate invoice",
      color: "hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950/30 dark:hover:border-purple-800",
    },
    {
      id: "mot-check",
      title: "MOT Check",
      icon: AlertTriangle,
      path: "/mot-reminders",
      description: "Check MOT status",
      color: "hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-800",
    },
    {
      id: "critical-mots",
      title: "Critical MOTs",
      icon: AlertTriangle,
      path: "/mot-critical",
      description: "Expired & expiring soon",
      color: "hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-800",
    },
    {
      id: "import-data",
      title: "Import Data",
      icon: Upload,
      path: "/import",
      description: "Upload vehicle data",
      color: "hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-indigo-950/30 dark:hover:border-indigo-800",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">GarageManager Pro</h1>
              <p className="text-muted-foreground">Complete overview of customers, vehicles, and service history</p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <div className="text-sm text-gray-500">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <Button
                onClick={fetchDashboardData}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <Card key={card.title} className="transition-all duration-200 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {card.value}
                    </p>
                    <div className="flex items-center mt-3">
                      <span className="text-sm text-green-600 font-semibold">
                        {card.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", card.color)}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MOT Status Overview */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">MOT Status Overview</CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <CardDescription>Current status of all vehicles</CardDescription>
                  <Badge variant="secondary" className="bg-green-600 dark:bg-green-500 text-white border-green-600 dark:border-green-500">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      Auto-updating nightly
                    </div>
                  </Badge>
                </div>
              </div>
              <Link href="/mot-critical">
                <Button variant="default" size="sm">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
                        EXPIRED
                      </p>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">
                        {stats.motStats.expired}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                        DUE SOON
                      </p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-300 mt-1">
                        {stats.motStats.expiringSoon}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                        THIS MONTH
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                        {stats.motStats.dueThisMonth}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                        VALID
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                        {stats.motStats.valid}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {quickActions.map((action) => (
                <Link key={action.id} href={action.path}>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-24 flex-col gap-2 transition-all duration-200 hover:scale-105 bg-card relative w-full",
                      action.color
                    )}
                    title={action.description}
                  >
                    <action.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center">{action.title}</span>
                    <ExternalLink className="h-3 w-3 absolute top-2 right-2 opacity-50" />
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Booking FAB */}
      <QuickBookingFAB />
    </div>
  );
}
