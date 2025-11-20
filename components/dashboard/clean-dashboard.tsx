'use client';

import { useState, useEffect } from 'react';
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
  TrendingUp,
  Search,
  Bell,
  Calendar,
  FileText,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
  };
}

export function CleanDashboard() {
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
          totalRevenue: 0, // Will be calculated from real data
          totalJobs: data.systemStatus?.documents || 0,
          motStats: {
            expired: data.systemStatus?.criticalMots || 0,
            expiringSoon: data.systemStatus?.dueSoonMots || 0,
            dueThisMonth: data.systemStatus?.thisMonthMots || 0,
            valid: (data.systemStatus?.vehicles || 0) - (data.systemStatus?.criticalMots || 0) - (data.systemStatus?.dueSoonMots || 0),
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
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      color: "from-blue-500 to-blue-600",
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "Total Vehicles",
      value: stats.totalVehicles.toLocaleString(),
      icon: Car,
      color: "from-green-500 to-green-600",
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      title: "Active Jobs",
      value: stats.totalJobs.toLocaleString(),
      icon: Wrench,
      color: "from-purple-500 to-purple-600",
      change: "+23%",
      changeType: "positive" as const,
    },
    {
      title: "Revenue",
      value: `£${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "from-orange-500 to-orange-600",
      change: "+15%",
      changeType: "positive" as const,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: "mot-check",
      title: "MOT Check",
      description: "Quick vehicle MOT status lookup",
      icon: Search,
      href: "/mot-check",
      color: "hover:bg-blue-50 hover:border-blue-200",
    },
    {
      id: "critical-mots",
      title: "Critical MOTs",
      description: "Expired & expiring soon",
      icon: AlertTriangle,
      href: "/mot-critical",
      color: "hover:bg-red-50 hover:border-red-200",
      badge: {
        text: stats.motStats.expired.toString(),
        variant: "danger",
      },
    },
    {
      id: "reminders",
      title: "Send Reminders",
      description: "SMS & WhatsApp notifications",
      icon: Bell,
      href: "/sms-dashboard",
      color: "hover:bg-green-50 hover:border-green-200",
    },
    {
      id: "calendar",
      title: "MOT Calendar",
      description: "View upcoming MOT dates",
      icon: Calendar,
      href: "/mot-reminders",
      color: "hover:bg-purple-50 hover:border-purple-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GarageManager Pro</h1>
              <p className="text-gray-600 mt-2">Complete overview of customers, vehicles, and service history</p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <div className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <Button
                onClick={fetchDashboardData}
                disabled={loading}
                variant="outline"
                className="rounded-xl"
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
            <div key={card.title} className="card-clean">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 font-medium">{card.change}</span>
                      <span className="text-sm text-gray-500 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center",
                    card.color
                  )}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MOT Status Overview */}
        <div className="card-clean">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">MOT Status Overview</h3>
                <p className="text-gray-600">Current status of all vehicles</p>
              </div>
              <Link href="/mot-critical">
                <Button className="rounded-xl">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">Expired</p>
                    <p className="text-2xl font-bold text-red-900">{stats.motStats.expired}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Due Soon</p>
                    <p className="text-2xl font-bold text-yellow-900">{stats.motStats.expiringSoon}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">This Month</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.motStats.dueThisMonth}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Valid</p>
                    <p className="text-2xl font-bold text-green-900">{stats.motStats.valid}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-clean">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-gray-600">Access frequently used features</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.id} href={action.href}>
                  <div className={cn(
                    "p-6 rounded-xl border-2 border-gray-200 transition-all duration-200 cursor-pointer",
                    action.color
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <action.icon className="h-8 w-8 text-gray-700" />
                      {action.badge && (
                        <Badge className={cn(
                          action.badge.variant === 'danger' && 'badge-danger',
                          action.badge.variant === 'warning' && 'badge-warning',
                          action.badge.variant === 'success' && 'badge-success',
                          action.badge.variant === 'info' && 'badge-info'
                        )}>
                          {action.badge.text}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{action.title}</h4>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
