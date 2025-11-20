'use client';

import { useState, useEffect } from 'react';
import { MOTTestResult, FavoriteVehicle } from './types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, getDaysRemaining, isMOTExpired, isMOTDueSoon } from './utils';
import { Star, X, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MOTCompareProps {
  favorites: FavoriteVehicle[];
  onSelectVehicle: (registration: string) => void;
}

export function MOTCompare({ favorites, onSelectVehicle }: MOTCompareProps) {
  const [selectedVehicles, setSelectedVehicles] = useState<FavoriteVehicle[]>([]);
  const [compareData, setCompareData] = useState<Record<string, MOTTestResult[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedTestIndex, setSelectedTestIndex] = useState<number>(0);

  // Load saved comparison data from localStorage on mount
  useEffect(() => {
    const savedComparison = localStorage.getItem('motComparison');
    if (savedComparison) {
      const { vehicles, data } = JSON.parse(savedComparison);
      setSelectedVehicles(vehicles);
      setCompareData(data || {});
    }
  }, []);

  // Save comparison data to localStorage when it changes
  useEffect(() => {
    if (selectedVehicles.length > 0) {
      localStorage.setItem('motComparison', JSON.stringify({
        vehicles: selectedVehicles,
        data: compareData
      }));
    }
  }, [selectedVehicles, compareData]);

  const fetchMOTHistory = async (registration: string) => {
    try {
      setLoading(prev => ({ ...prev, [registration]: true }));
      
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - in a real app, this would come from your API
      const mockData: MOTTestResult[] = [
        {
          completedDate: '2023-05-15T10:30:00Z',
          expiryDate: '2024-05-15T23:59:59Z',
          odometerValue: 45000,
          odometerUnit: 'km',
          testResult: 'PASSED',
          testNumber: '123456789012',
          defects: []
        },
        {
          completedDate: '2022-05-10T14:15:00Z',
          expiryDate: '2023-05-10T23:59:59Z',
          odometerValue: 32000,
          odometerUnit: 'km',
          testResult: 'PASSED',
          testNumber: '123456789011',
          defects: [
            { text: 'Brake pad(s) wearing thin', type: 'ADVISORY' },
            { text: 'Tyre tread depth close to legal limit', type: 'ADVISORY' }
          ]
        },
        // Add more test history as needed
      ];

      setCompareData(prev => ({
        ...prev,
        [registration]: mockData
      }));
    } catch (error) {
      console.error(`Failed to fetch MOT history for ${registration}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [registration]: false }));
    }
  };

  const handleAddVehicle = (registration: string) => {
    const vehicle = favorites.find(fav => fav.registration === registration);
    if (vehicle && !selectedVehicles.some(v => v.registration === registration)) {
      setSelectedVehicles(prev => [...prev, vehicle]);
      if (!compareData[registration]) {
        fetchMOTHistory(registration);
      }
    }
  };

  const handleRemoveVehicle = (registration: string) => {
    setSelectedVehicles(prev => prev.filter(v => v.registration !== registration));
    
    // Optionally clear the data for this vehicle
    // const newData = { ...compareData };
    // delete newData[registration];
    // setCompareData(newData);
  };

  const getTestStatus = (test: MOTTestResult) => {
    if (!test) return 'N/A';
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

  const availableVehicles = favorites.filter(
    fav => !selectedVehicles.some(v => v.registration === fav.registration)
  );

  const currentTests = selectedVehicles.map(vehicle => {
    const tests = compareData[vehicle.registration] || [];
    return tests[selectedTestIndex] || null;
  });

  const hasPreviousTest = selectedTestIndex > 0;
  const hasNextTest = selectedVehicles.some(vehicle => {
    const tests = compareData[vehicle.registration] || [];
    return tests.length > selectedTestIndex + 1;
  });

  const navigateTest = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && hasPreviousTest) {
      setSelectedTestIndex(prev => prev - 1);
    } else if (direction === 'next' && hasNextTest) {
      setSelectedTestIndex(prev => prev + 1);
    }
  };

  if (selectedVehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-blue-100 p-4 rounded-full mb-4">
          <Star className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium mb-2">No vehicles selected for comparison</h3>
        <p className="text-muted-foreground mb-6">
          Add vehicles from your favorites to compare their MOT histories side by side.
        </p>
        
        {availableVehicles.length > 0 ? (
          <div className="w-full max-w-md">
            <Select onValueChange={handleAddVehicle}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a vehicle to add" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map(vehicle => (
                  <SelectItem key={vehicle.registration} value={vehicle.registration}>
                    {vehicle.registration} - {vehicle.make} {vehicle.model} ({vehicle.yearOfManufacture})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No favorite vehicles available. Add vehicles to your favorites first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium">Compare MOT Histories</h3>
          <p className="text-sm text-muted-foreground">
            Side-by-side comparison of MOT test results
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {availableVehicles.length > 0 && (
            <Select onValueChange={handleAddVehicle}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Add another vehicle" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map(vehicle => (
                  <SelectItem key={vehicle.registration} value={vehicle.registration}>
                    {vehicle.registration} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedVehicles([])}
            disabled={selectedVehicles.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedVehicles.map((vehicle, idx) => (
          <Card key={vehicle.registration} className="relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {vehicle.make} {vehicle.model}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.registration} • {vehicle.yearOfManufacture}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleRemoveVehicle(vehicle.registration)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading[vehicle.registration] ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : compareData[vehicle.registration]?.length ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      Test {selectedTestIndex + 1} of {compareData[vehicle.registration].length}
                    </h4>
                    <Badge className={getStatusColor(getTestStatus(currentTests[idx]))}>
                      {getTestStatus(currentTests[idx])}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Test Date:</span>
                      <span>{currentTests[idx] ? formatDate(currentTests[idx].completedDate) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiry:</span>
                      <span>{currentTests[idx]?.expiryDate ? formatDate(currentTests[idx].expiryDate) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Odometer:</span>
                      <span>
                        {currentTests[idx]?.odometerValue 
                          ? `${currentTests[idx].odometerValue.toLocaleString()} ${currentTests[idx].odometerUnit}` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Test Number:</span>
                      <span className="font-mono">{currentTests[idx]?.testNumber || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {currentTests[idx]?.defects?.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">Defects & Advisories</h5>
                      <ul className="space-y-2">
                        {currentTests[idx].defects.map((defect, i) => (
                          <li 
                            key={i} 
                            className={cn(
                              "text-sm p-2 rounded border-l-4",
                              defect.type === 'DANGEROUS' ? 'border-red-500 bg-red-50' :
                              defect.type === 'MAJOR' ? 'border-amber-500 bg-amber-50' :
                              defect.type === 'MINOR' ? 'border-blue-500 bg-blue-50' :
                              'border-gray-300 bg-gray-50'
                            )}
                          >
                            <div className="flex items-start">
                              <span className="font-medium">
                                {defect.type === 'DANGEROUS' ? '🚨 ' :
                                 defect.type === 'MAJOR' ? '⚠️ ' :
                                 defect.type === 'MINOR' ? 'ℹ️ ' : '🔍 '}
                                {defect.type}:
                              </span>
                              <span className="ml-1">{defect.text}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No MOT history available</p>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onSelectVehicle(vehicle.registration)}
                >
                  View Full History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {(hasPreviousTest || hasNextTest) && (
        <div className="flex justify-center gap-4 mt-6">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigateTest('prev')}
            disabled={!hasPreviousTest}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Test
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigateTest('next')}
            disabled={!hasNextTest}
          >
            Next Test
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
