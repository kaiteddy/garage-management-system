'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, History, Star, StarOff, X, Copy, Printer, Share2, Download, MapPin, BellRing, AlertTriangle, CheckCircle } from "lucide-react";
import { useMOTCheck } from './use-mot-check';
import { formatDate, formatDateTime, getDaysRemaining, isMOTExpired, isMOTDueSoon } from './utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { MOTTestResult } from './types';
import { MOTHistory } from './mot-history';
import { MOTTestCenters } from './mot-test-centers';
import { MOTReminders } from './mot-reminders';
import { MOTCompare } from './mot-compare';

export function MOTCheck() {
  const {
    registration,
    setRegistration,
    loading,
    result,
    error,
    searchHistory,
    favorites,
    activeTab,
    setActiveTab,
    checkMOT,
    toggleFavorite,
    isFavorite,
  } = useMOTCheck();

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await checkMOT(registration);
    } catch (err) {
      // Error is handled in the hook
    }
  };

  const handleClear = () => {
    setRegistration('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `MOT Check - ${result?.registration}`,
          text: `Check out the MOT details for ${result?.make} ${result?.model} (${result?.registration})`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      toast.error('Failed to share');
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    
    try {
      const pdfBlob = await generatePDF(result);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mot-check-${result.registration}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Check MOT Status</CardTitle>
          <CardDescription>Enter a vehicle registration number to check its MOT status and history</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="registration"
                    placeholder="e.g., AB12CDE"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="pl-10"
                  />
                  {registration && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button type="submit" disabled={loading || !registration.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Check
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a UK vehicle registration (e.g., AB12CDE or AB12 CDE)
              </p>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Quick Actions</h3>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <History className="mr-2 h-4 w-4" />
                History ({searchHistory.length})
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <MapPin className="mr-2 h-4 w-4" />
                Find Test Center
              </Button>
              <Button variant="outline" size="sm" className="h-9">
                <BellRing className="mr-2 h-4 w-4" />
                Set Reminder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div>
                <p className="font-medium">Checking MOT status for {registration}</p>
                <p className="text-sm text-muted-foreground">This may take a moment...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Error checking MOT status</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Vehicle Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">
                      {result.make || 'Unknown Make'} {result.model || 'Unknown Model'}
                    </h2>
                    <button
                      onClick={() => toggleFavorite(result)}
                      className="text-muted-foreground hover:text-amber-500 transition-colors"
                      aria-label={isFavorite(result.registration) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFavorite(result.registration) ? (
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      ) : (
                        <Star className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-lg text-muted-foreground">
                    {result.registration} • {result.yearOfManufacture || 'N/A'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.motStatus && (
                    <Badge variant={result.motStatus === 'Valid' ? 'default' : 'destructive'} className="gap-1">
                      {result.motStatus === 'Valid' ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {result.motStatus}
                    </Badge>
                  )}
                  {result.hasOutstandingRecalls && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Recalls
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultValue="details" 
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="history">MOT History</TabsTrigger>
                  <TabsTrigger value="test-centers">Test Centers</TabsTrigger>
                  <TabsTrigger value="reminders">Reminders</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Registration</div>
                      <div className="font-medium flex items-center gap-2">
                        {result.registration}
                        <button
                          onClick={() => handleCopy(result.registration)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Copy registration"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Make & Model</div>
                      <div className="font-medium">
                        {result.make || 'N/A'} {result.model || ''}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Year</div>
                      <div className="font-medium">{result.yearOfManufacture || 'N/A'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Fuel Type</div>
                      <div className="font-medium">{result.fuelType || 'N/A'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Colour</div>
                      <div className="font-medium">{result.colour || 'N/A'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">MOT Status</div>
                      <div className="font-medium">
                        {result.motStatus === 'Valid' ? (
                          <span className="text-green-600">Valid</span>
                        ) : (
                          <span className="text-amber-600">{result.motStatus || 'Not available'}</span>
                        )}
                      </div>
                    </div>
                    {result.motExpiryDate && (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {result.motStatus === 'Valid' ? 'Expiry Date' : 'Last Test Date'}
                        </div>
                        <div className="font-medium">
                          {formatDate(result.motExpiryDate)}
                          {isMOTDueSoon(result.motExpiryDate) && (
                            <span className="ml-2 text-amber-600 text-xs font-normal">
                              (Due in {getDaysRemaining(result.motExpiryDate)} days)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {result.nextTestDue && (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Next Test Due</div>
                        <div className="font-medium">{formatDate(result.nextTestDue)}</div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <MOTHistory tests={result.motTests || []} />
                </TabsContent>

                <TabsContent value="test-centers">
                  <MOTTestCenters registration={result.registration} />
                </TabsContent>

                <TabsContent value="reminders">
                  <MOTReminders 
                    registration={result.registration}
                    expiryDate={result.motExpiryDate}
                    make={result.make}
                    model={result.model}
                  />
                </TabsContent>

                <TabsContent value="compare">
                  <MOTCompare 
                    favorites={favorites} 
                    onSelectVehicle={(reg: string) => {
                      setRegistration(reg);
                      checkMOT(reg).then(() => {
                        setActiveTab('details');
                      });
                    }} 
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('compare')}
                className="ml-auto"
              >
                Compare Vehicles
              </Button>
            </CardFooter>
          </Card>


        </div>
      )}
    </div>
  );
}

// Placeholder for PDF generation - would be implemented with a library like @react-pdf/renderer
async function generatePDF(data: any): Promise<Blob> {
  // This is a placeholder - in a real app, you would use a PDF generation library
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/pdf' });
}
