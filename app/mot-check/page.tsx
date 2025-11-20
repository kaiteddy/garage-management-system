'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  Info,
  Car,
  Search,
  X,
  Loader2,
  User,
  FileText,
  Calculator,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Plus,
  Edit,
  History
} from 'lucide-react';
import { format } from 'date-fns';

type MOTTest = {
  completedDate: string;
  testResult: 'PASSED' | 'FAILED' | 'PRESENT';
  expiryDate?: string;
  odometerValue: string;
  odometerUnit: 'km' | 'mi';
  motTestNumber: string;
  rfrAndComments: Array<{
    text: string;
    type: 'ADVISORY' | 'FAIL' | 'MINOR' | 'PRS' | 'USER ENTERED';
    dangerous: boolean;
  }>;
};

type VehicleDetails = {
  registrationNumber: string;
  make: string;
  model: string;
  firstUsedDate?: string;
  fuelType?: string;
  primaryColour?: string;
  motStatus?: string;
  motExpiryDate?: string;
  yearOfManufacture?: number;
  taxStatus?: string;
  taxDueDate?: string;
  engineCapacity?: number;
  co2Emissions?: number;
  markedForExport?: boolean;
  monthOfFirstRegistration?: string;
  typeApproval?: string;
  dateOfLastV5CIssued?: string;
  wheelplan?: string;
};

type MOTCheckResult = {
  registration: string;
  make: string;
  model: string;
  year?: number;
  colour: string;
  fuelType: string;
  engineCapacity?: number;
  motStatus: string;
  motExpiry?: string;
  motTestNumber?: string;
  lastMileage?: string;
  lastMileageDate?: string;
  rfrAndComments: Array<{
    text: string;
    type: string;
    dangerous: boolean;
  }>;
  advisoryNoticeCount: number;
  failureDangerousCount: number;
  taxStatus: string;
  taxDueDate?: string;
  co2Emissions?: number;
  motTests: MOTTest[];
  vehicleDetails?: VehicleDetails;
  typeApproval?: string;
  wheelplan?: string;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  address?: string;
  postcode?: string;
  vehicles?: Array<{
    registration: string;
    make: string;
    model: string;
    year?: number;
  }>;
  last_visit?: string;
  total_visits?: number;
};

export default function MOTCheckPage() {
  const [registration, setRegistration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MOTCheckResult | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('vehicle');
  const [isClient, setIsClient] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCheckMOT = async () => {
    if (!registration.trim()) {
      setError('Please enter a registration number');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCustomer(null);

    try {
      const cleanRegistration = registration.trim().toUpperCase();

      // Check for existing customer with this vehicle
      const customerResponse = await fetch(`/api/customers/by-vehicle?registration=${encodeURIComponent(cleanRegistration)}`);
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        if (customerData.customer) {
          setCustomer(customerData.customer);
        }
      }

      // Get MOT data
      const motResponse = await fetch(`/api/mot-check?registration=${encodeURIComponent(cleanRegistration)}`);
      const motData = await motResponse.json();

      if (!motResponse.ok) {
        const errorMsg = motData.error || 'Failed to fetch vehicle data';
        throw new Error(errorMsg);
      }

      // Process MOT tests
      let motTests = [];
      if (motData.motTests) {
        motTests = Array.isArray(motData.motTests) ? motData.motTests : [motData.motTests];
        motTests = motTests.sort((a: any, b: any) => {
          return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
        });
      }

      const resultData = {
        ...motData,
        motTests: motTests,
        motStatus: motData.motStatus || 'No details',
        taxStatus: motData.taxStatus || 'Unknown',
        rfrAndComments: motData.rfrAndComments || [],
        advisoryNoticeCount: motData.advisoryNoticeCount || 0,
        failureDangerousCount: motData.failureDangerousCount || 0,
        ...(motData.vehicleDetails ? {
          make: motData.make || motData.vehicleDetails.make,
          model: motData.model || motData.vehicleDetails.model,
          colour: motData.colour || motData.vehicleDetails.primaryColour,
          fuelType: motData.fuelType || motData.vehicleDetails.fuelType,
          year: motData.year || motData.vehicleDetails.yearOfManufacture,
          engineCapacity: motData.engineCapacity || motData.vehicleDetails.engineCapacity,
          co2Emissions: motData.co2Emissions || motData.vehicleDetails.co2Emissions,
          motExpiry: motData.motExpiry || motData.vehicleDetails.motExpiryDate,
          motStatus: motData.motStatus || motData.vehicleDetails.motStatus
        } : {})
      };

      setResult(resultData);
      setActiveTab('vehicle');
    } catch (error) {
      console.error('Error checking MOT:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('valid') || statusLower.includes('pass') || statusLower.includes('taxed')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('expir') || statusLower.includes('due') || statusLower.includes('fail')) {
      return 'bg-red-100 text-red-800';
    } else if (statusLower.includes('untaxed') || statusLower.includes('no details')) {
      return 'bg-amber-100 text-amber-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    if (!isClient) return 'Loading...';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Button handler functions
  const handleCreateJobSheet = () => {
    if (!customer || !result) return;

    // Create a new job sheet with customer and vehicle details
    const jobSheetData = {
      customer_id: customer.id,
      vehicle_registration: result.registration,
      vehicle_make: result.make,
      vehicle_model: result.model,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      customer_phone: customer.phone,
      customer_email: customer.email,
      date_created: new Date().toISOString()
    };

    // Open job sheet creation page with pre-filled data
    const params = new URLSearchParams({
      registration: result.registration,
      customer_id: customer.id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      phone: customer.phone || '',
      email: customer.email || ''
    });

    window.open(`/jobs/create?${params.toString()}`, '_blank');
  };

  const handleCreateEstimate = () => {
    if (!customer || !result) return;

    // Open estimate creation page with pre-filled data
    const params = new URLSearchParams({
      registration: result.registration,
      customer_id: customer.id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      phone: customer.phone || '',
      email: customer.email || ''
    });

    window.open(`/estimates/create?${params.toString()}`, '_blank');
  };

  const handleCallCustomer = () => {
    if (!customer?.phone) {
      alert('No phone number available for this customer');
      return;
    }

    // Initiate phone call
    window.open(`tel:${customer.phone}`, '_self');
  };

  const handleEditCustomer = () => {
    if (!customer) return;

    // Open customer edit page
    window.open(`/customers/${customer.id}/edit`, '_blank');
  };

  // Debug info
  const [showDebug, setShowDebug] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `MOT Check - ${result?.registration}`,
          text: `Check out the MOT details for ${result?.make} ${result?.model} (${result?.registration})`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      await navigator.clipboard.writeText(window.location.href);
      // Show copied to clipboard message
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    // In a real app, this would generate and download a PDF
    const text = `MOT Check Result\n\n` +
      `Vehicle: ${result.make} ${result.model}\n` +
      `Registration: ${result.registration}\n` +
      `MOT Status: ${result.motStatus}\n` +
      `Expiry Date: ${result.motExpiry ? format(new Date(result.motExpiry), 'PPP') : 'N/A'}\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mot-check-${result.registration}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Apple-style Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">GarageManager Pro</h1>
                <p className="text-sm text-gray-500">ELI MOTORS LTD</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl mb-6 shadow-lg">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Vehicle & Customer Lookup
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Quick MOT check with comprehensive customer records and vehicle history
          </p>
        </div>

        {/* Main Search Interface */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-8">
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vehicle Registration
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter registration (e.g. LS05WAA)"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                    className="h-16 text-2xl font-semibold text-center bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckMOT()}
                    maxLength={8}
                  />
                  {registration && (
                    <button
                      type="button"
                      onClick={() => setRegistration('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              <Button
                onClick={handleCheckMOT}
                disabled={isLoading || !registration.trim()}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-3 h-5 w-5" />
                    Search Vehicle
                  </>
                )}
              </Button>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Search Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Customer & Vehicle Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Customer Card */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {customer ? 'Existing Customer' : 'New Customer'}
                        </h3>
                        {customer && (
                          <p className="text-sm text-gray-600">
                            {customer.total_visits || 0} previous visits
                          </p>
                        )}
                      </div>
                    </div>
                    {customer && (
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Active
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {customer ? (
                    <div className="space-y-4">
                      <div className="text-2xl font-bold text-gray-800">
                        {customer.first_name} {customer.last_name}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {(customer.address_line1 || customer.city) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>
                              {customer.address_line1}
                              {customer.address_line2 && `, ${customer.address_line2}`}
                              {customer.city && `, ${customer.city}`}
                              {customer.postcode && `, ${customer.postcode}`}
                            </span>
                          </div>
                        )}
                        {customer.last_visit && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>Last visit: {formatDate(customer.last_visit)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-6">
                        <button className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                          <Edit className="w-4 h-4" />
                          <span>Edit Customer</span>
                        </button>
                        <button className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>View History</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">No customer found for this vehicle</p>
                      <Button
                        onClick={() => setShowCustomerForm(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Customer
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Card */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Vehicle Details</h3>
                        <p className="text-sm text-gray-600">MOT & Registration Info</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 text-sm font-medium rounded-full ${
                      result.motStatus?.toLowerCase().includes('valid') || result.motStatus?.toLowerCase().includes('pass')
                        ? 'bg-green-100 text-green-800'
                        : result.motStatus?.toLowerCase().includes('expir') || result.motStatus?.toLowerCase().includes('fail')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {result.motStatus || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="text-2xl font-bold text-gray-800">
                      {result.registration}
                    </div>

                    <div className="text-lg text-gray-700">
                      {result.make} {result.model} {result.year && `(${result.year})`}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Colour:</span>
                        <div className="font-medium capitalize">{result.colour?.toLowerCase()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Fuel:</span>
                        <div className="font-medium capitalize">{result.fuelType?.toLowerCase()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">MOT Expires:</span>
                        <div className="font-medium">{formatDate(result.motExpiry)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Engine:</span>
                        <div className="font-medium">{result.engineCapacity ? `${result.engineCapacity}cc` : 'N/A'}</div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Job Sheet</span>
                      </button>
                      <button className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                        <Calculator className="w-4 h-4" />
                        <span>Estimate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for detailed information */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-white rounded-2xl p-1 shadow-lg border border-gray-200/50">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setActiveTab('vehicle')}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                        activeTab === 'vehicle'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Vehicle Info
                    </button>
                    <button
                      onClick={() => setActiveTab('mot')}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                        activeTab === 'mot'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      MOT History
                    </button>
                    <button
                      onClick={() => setActiveTab('customer')}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                        activeTab === 'customer'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Customer Records
                    </button>
                  </div>
                </div>
              </div>

              <TabsContent value="vehicle">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200/50">
                    <h3 className="text-xl font-semibold text-gray-900">Complete Vehicle Information</h3>
                    <p className="text-sm text-gray-600 mt-1">Detailed vehicle specifications and MOT status</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-gray-800">Basic Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Registration</span>
                            <span className="font-bold text-lg">{result.registration}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Make & Model</span>
                            <span className="font-medium">{result.make} {result.model}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Year</span>
                            <span className="font-medium">{result.year || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Colour</span>
                            <span className="font-medium capitalize">{result.colour?.toLowerCase() || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Fuel Type</span>
                            <span className="font-medium capitalize">{result.fuelType?.toLowerCase() || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Engine Size</span>
                            <span className="font-medium">{result.engineCapacity ? `${result.engineCapacity}cc` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-gray-800">MOT & Tax Status</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">MOT Status</span>
                            <Badge className={getStatusBadge(result.motStatus)}>
                              {result.motStatus || 'UNKNOWN'}
                            </Badge>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">MOT Expires</span>
                            <span className="font-medium">{formatDate(result.motExpiry)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Tax Status</span>
                            <Badge className={getStatusBadge(result.taxStatus)}>
                              {result.taxStatus}
                            </Badge>
                          </div>
                          {result.taxDueDate && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">Tax Due</span>
                              <span className="font-medium">{formatDate(result.taxDueDate)}</span>
                            </div>
                          )}
                          {result.lastMileage && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">Last Mileage</span>
                              <span className="font-medium">
                                {result.lastMileage} {result.motTests[0]?.odometerUnit || 'mi'}
                              </span>
                            </div>
                          )}
                          {result.co2Emissions && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">CO₂ Emissions</span>
                              <span className="font-medium">{result.co2Emissions} g/km</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Defects and Advisories */}
                    {(result.failureDangerousCount > 0 || result.advisoryNoticeCount > 0) && (
                      <div className="mt-8 space-y-4">
                        <h3 className="font-semibold text-lg text-gray-800">Issues & Advisories</h3>

                        {result.failureDangerousCount > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Dangerous Defects ({result.failureDangerousCount})</AlertTitle>
                            <AlertDescription>
                              <ul className="mt-2 space-y-1">
                                {result.rfrAndComments
                                  .filter(item => item.dangerous)
                                  .map((item, index) => (
                                    <li key={index}>• {item.text}</li>
                                  ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {result.advisoryNoticeCount > 0 && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Advisory Notices ({result.advisoryNoticeCount})</AlertTitle>
                            <AlertDescription>
                              <ul className="mt-2 space-y-1">
                                {result.rfrAndComments
                                  .filter(item => !item.dangerous && item.type === 'ADVISORY')
                                  .map((item, index) => (
                                    <li key={index}>• {item.text}</li>
                                  ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mot">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-gray-200/50">
                    <h3 className="text-xl font-semibold text-gray-900">MOT Test History</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      {result.motTests?.length || 0} test{result.motTests?.length !== 1 ? 's' : ''} found
                      {result.motStatus && (
                        <span className="ml-2">• Current Status:
                          <span className={result.motStatus === 'Valid' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                            {result.motStatus}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    {!result.motTests || result.motTests.length === 0 ? (
                      <div className="text-center py-12">
                        <Info className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No MOT History Available</h3>
                        <p className="text-gray-500">
                          No MOT test history is available for this vehicle in the DVSA database.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {result.motTests.map((test, index) => (
                          <div key={index} className="border-2 border-gray-100 rounded-lg p-6 hover:border-blue-200 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">
                                  {isClient && format(new Date(test.completedDate), 'dd MMMM yyyy')}
                                </h3>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge className={test.testResult === 'PASSED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {test.testResult === 'PASSED' ? '✓ PASSED' : '✗ FAILED'}
                                  </Badge>
                                  <span className="text-gray-600">
                                    {test.odometerValue} {test.odometerUnit}
                                  </span>
                                  {test.expiryDate && (
                                    <span className="text-gray-600">
                                      Expires: {isClient && formatDate(test.expiryDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded">
                                Test #{test.motTestNumber}
                              </div>
                            </div>

                            {test.rfrAndComments && test.rfrAndComments.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="font-medium text-gray-800">Issues Found:</h4>
                                <div className="grid gap-2">
                                  {test.rfrAndComments.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-lg border-l-4 ${
                                        item.dangerous
                                          ? 'bg-red-50 border-red-500 text-red-800'
                                          : item.type === 'ADVISORY'
                                            ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                                            : 'bg-gray-50 border-gray-400 text-gray-800'
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <Badge variant="outline" className="text-xs">
                                          {item.type}
                                        </Badge>
                                        <span className="flex-1">{item.text}</span>
                                        {item.dangerous && (
                                          <AlertCircle className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="customer">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200/50">
                    <h3 className="text-xl font-semibold text-gray-900">Customer Records & Actions</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {customer ? 'Manage existing customer information and create new work orders' : 'No customer associated with this vehicle'}
                    </p>
                  </div>
                  <div className="p-6">
                    {customer ? (
                      <div className="space-y-6">
                        {/* Customer Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-gray-800">Customer Information</h3>
                            <div className="space-y-3">
                              <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-600">Name</span>
                                <span className="font-medium">{customer.first_name} {customer.last_name}</span>
                              </div>
                              {customer.phone && (
                                <div className="flex justify-between py-2 border-b">
                                  <span className="text-gray-600">Phone</span>
                                  <span className="font-medium">{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex justify-between py-2 border-b">
                                  <span className="text-gray-600">Email</span>
                                  <span className="font-medium">{customer.email}</span>
                                </div>
                              )}
                              {(customer.address_line1 || customer.city) && (
                                <div className="flex justify-between py-2 border-b">
                                  <span className="text-gray-600">Address</span>
                                  <span className="font-medium">
                                    {customer.address_line1}
                                    {customer.address_line2 && `, ${customer.address_line2}`}
                                    {customer.city && `, ${customer.city}`}
                                    {customer.postcode && `, ${customer.postcode}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-gray-800">Visit History</h3>
                            <div className="space-y-3">
                              <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-600">Total Visits</span>
                                <span className="font-medium">{customer.total_visits || 0}</span>
                              </div>
                              {customer.last_visit && (
                                <div className="flex justify-between py-2 border-b">
                                  <span className="text-gray-600">Last Visit</span>
                                  <span className="font-medium">{formatDate(customer.last_visit)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Service History */}
                        {customer.vehicles && customer.vehicles.length > 0 && (
                          <div className="border-t pt-6">
                            <h3 className="font-semibold text-lg text-gray-800 mb-4">Service History</h3>
                            <div className="space-y-3">
                              <div className="text-sm text-gray-600 mb-3">
                                Customer owns {customer.vehicles.length} vehicle{customer.vehicles.length !== 1 ? 's' : ''}:
                              </div>
                              {customer.vehicles.map((vehicle, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Car className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">{vehicle.registration}</div>
                                        <div className="text-sm text-gray-500">
                                          {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : 'Vehicle details'}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // Navigate to vehicle service history
                                        window.open(`/vehicles/${vehicle.registration}`, '_blank');
                                      }}
                                    >
                                      <History className="h-4 w-4 mr-2" />
                                      View History
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="border-t pt-6">
                          <h3 className="font-semibold text-lg text-gray-800 mb-4">Quick Actions</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Button
                              className="h-16 bg-orange-600 hover:bg-orange-700"
                              onClick={handleCreateJobSheet}
                              disabled={!customer || !result}
                            >
                              <div className="text-center">
                                <FileText className="h-6 w-6 mx-auto mb-1" />
                                <div className="text-sm">Create Job Sheet</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="h-16"
                              onClick={handleCreateEstimate}
                              disabled={!customer || !result}
                            >
                              <div className="text-center">
                                <Calculator className="h-6 w-6 mx-auto mb-1" />
                                <div className="text-sm">Create Estimate</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="h-16"
                              onClick={handleCallCustomer}
                              disabled={!customer?.phone}
                            >
                              <div className="text-center">
                                <Phone className="h-6 w-6 mx-auto mb-1" />
                                <div className="text-sm">Call Customer</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="h-16"
                              onClick={handleEditCustomer}
                              disabled={!customer}
                            >
                              <div className="text-center">
                                <Edit className="h-6 w-6 mx-auto mb-1" />
                                <div className="text-sm">Edit Details</div>
                              </div>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Found</h3>
                        <p className="text-gray-500 mb-6">
                          This vehicle is not associated with any customer in your database.
                        </p>
                        <Button
                          onClick={() => setShowCustomerForm(true)}
                          className="bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          <Plus className="mr-2 h-5 w-5" />
                          Add New Customer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
