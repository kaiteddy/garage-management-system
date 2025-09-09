'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  AlertCircle,
  Info,
  Car,
  Search,
  X,
  Loader2,
  User,
  Users,
  FileText,
  Calculator,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Plus,
  Edit,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
// import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChangeOwnerDialog } from '@/components/vehicle/change-owner-dialog';

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
  phone?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  vehicles?: Array<{
    registration: string;
    make: string;
    model: string;
    year?: number;
    first_service?: string;
    last_service?: string;
    service_count?: number;
  }>;
  first_visit?: string;
  last_visit?: string;
  total_visits?: number;
  is_current_owner?: boolean;
};

type ServiceRecord = {
  id: string;
  documentNumber: string;
  date: string;
  type: string;
  amount: number;
  vehicleRegistration: string;
  status: string;
  labourDescription?: string;
  notes?: string;
  lineItems: {
    all: Array<{
      description: string;
      quantity: number;
      unit_price: string;
      total_price: number;
      item_type?: string;
    }>;
    labour: Array<any>;
    parts: Array<any>;
    other: Array<any>;
  };
  receipts: Array<any>;
  paymentStatus: string;
};

// Service Records Table Component
function ServiceRecordsTable({ customerId }: { customerId: string }) {
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    fetchServiceRecords();
  }, [customerId]);

  const fetchServiceRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}/service-history`);
      const data = await response.json();

      if (data.success) {
        setServiceRecords(data.serviceHistory || []);
      }
    } catch (error) {
      console.error('Error fetching service records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Loading service records...</span>
      </div>
    );
  }

  if (serviceRecords.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">No service records found</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-sm font-semibold py-3 px-4">Date</TableHead>
              <TableHead className="text-sm font-semibold py-3 px-4">Type</TableHead>
              <TableHead className="text-sm font-semibold py-3 px-4">Job #</TableHead>
              <TableHead className="text-sm font-semibold py-3 px-4">Description</TableHead>
              <TableHead className="text-sm font-semibold text-right py-3 px-4">Amount</TableHead>
              <TableHead className="text-sm font-semibold py-3 px-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serviceRecords.slice(0, 5).map((record) => (
              <TableRow
                key={record.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedRecord(record)}
              >
                <TableCell className="text-sm py-3 px-4 font-medium">{formatDate(record.date)}</TableCell>
                <TableCell className="text-sm py-3 px-4">
                  <Badge variant="outline" className="text-xs px-2 py-1 font-medium">
                    {record.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm py-3 px-4 font-mono text-blue-600 font-semibold">{record.documentNumber}</TableCell>
                <TableCell className="text-sm py-3 px-4 max-w-[250px]">
                  <div className="truncate" title={record.labourDescription || record.notes || 'Service work'}>
                    {record.labourDescription || record.notes || 'Service work'}
                  </div>
                </TableCell>
                <TableCell className="text-sm py-3 px-4 text-right font-bold">
                  {formatCurrency(record.amount)}
                </TableCell>
                <TableCell className="text-sm py-3 px-4">
                  <Badge
                    variant={record.paymentStatus === 'paid' ? 'default' : 'secondary'}
                    className="text-xs px-2 py-1 font-medium"
                  >
                    {record.paymentStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {serviceRecords.length > 5 && (
          <div className="bg-gray-50 px-4 py-3 text-center border-t">
            <span className="text-sm text-gray-600 font-medium">
              Showing 5 of {serviceRecords.length} records
            </span>
          </div>
        )}
      </div>

      {/* Service Record Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice #{selectedRecord.documentNumber}
                  <Badge variant="outline">{selectedRecord.type}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold mb-2">Service Details</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Date:</strong> {formatDate(selectedRecord.date)}</div>
                      <div><strong>Vehicle:</strong> {selectedRecord.vehicleRegistration}</div>
                      <div><strong>Status:</strong> {selectedRecord.status}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Payment</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Total:</strong> {formatCurrency(selectedRecord.amount)}</div>
                      <div><strong>Status:</strong>
                        <Badge
                          variant={selectedRecord.paymentStatus === 'paid' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {selectedRecord.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Work Description */}
                {(selectedRecord.labourDescription || selectedRecord.notes) && (
                  <div>
                    <h3 className="font-semibold mb-2">Work Description</h3>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      {selectedRecord.labourDescription || selectedRecord.notes}
                    </div>
                  </div>
                )}

                {/* Line Items */}
                {selectedRecord.lineItems.all.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Line Items ({selectedRecord.lineItems.all.length})</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecord.lineItems.all.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(parseFloat(item.unit_price || '0'))}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total_price)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper functions for Google Maps and WhatsApp integration
const openGoogleMaps = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(googleMapsUrl, '_blank');
};

const openWhatsAppComposer = (phoneNumber: string, customerName: string, customerId: string) => {
  try {
    // Format phone number for WhatsApp (proper international format)
    let formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    if (!formattedNumber.startsWith('44') && formattedNumber.startsWith('0')) {
      formattedNumber = '44' + formattedNumber.substring(1); // Remove leading 0 and add UK country code
    } else if (!formattedNumber.startsWith('44') && formattedNumber.startsWith('7')) {
      formattedNumber = '44' + formattedNumber; // Add UK country code
    }

    // Create a professional greeting message
    const message = `Hello ${customerName}, this is ELI MOTORS LTD. How can we help you today?`;
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp Business with pre-populated message for editing
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    console.log(`[WHATSAPP-COMPOSER] Opening WhatsApp composer for ${customerName} (${formattedNumber})`);
    toast.success(`Opening WhatsApp composer for ${customerName}`);

    // Log the interaction attempt
    fetch('/api/whatsapp/log-interaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        phoneNumber: formattedNumber,
        customerName,
        interactionType: 'whatsapp_composer_opened',
        message: message
      }),
    }).catch(error => {
      console.warn('Failed to log WhatsApp interaction:', error);
    });

  } catch (error) {
    console.error('Error opening WhatsApp composer:', error);
    toast.error('Failed to open WhatsApp composer');
  }
};

const sendWhatsAppMessage = async (phoneNumber: string, customerName: string, customerId: string, customMessage?: string) => {
  try {
    // Format phone number for Twilio WhatsApp (proper international format)
    let formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    if (!formattedNumber.startsWith('44') && formattedNumber.startsWith('0')) {
      formattedNumber = '44' + formattedNumber.substring(1); // Remove leading 0 and add UK country code
    } else if (!formattedNumber.startsWith('44') && formattedNumber.startsWith('7')) {
      formattedNumber = '44' + formattedNumber; // Add UK country code
    }

    // Ensure we have the + prefix for Twilio
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    // Create a professional greeting message
    const message = customMessage || `Hello ${customerName}, this is ELI MOTORS LTD. How can we help you today?`;

    console.log(`[WHATSAPP-SEND] Sending WhatsApp message to ${customerName} (${formattedNumber})`);

    // Send via Twilio WhatsApp API
    const response = await fetch('/api/whatsapp/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedNumber,
        message: message,
        customerId: customerId,
        customerName: customerName,
        messageType: 'customer_contact',
        urgencyLevel: 'medium'
      }),
    });

    const result = await response.json();

    if (result.success) {
      toast.success(`WhatsApp message sent to ${customerName}!`);
      console.log(`[WHATSAPP-SEND] ✅ Message sent successfully:`, result);
    } else {
      console.error(`[WHATSAPP-SEND] Failed to send message:`, result);
      toast.error(`Failed to send WhatsApp message: ${result.error || 'Unknown error'}`);
    }

    return result;
  } catch (error) {
    console.error('[WHATSAPP-SEND] Error sending WhatsApp message:', error);
    toast.error('Failed to send WhatsApp message');
    return { success: false, error: error.message };
  }
};

const openEmailClient = (email: string, customerName: string) => {
  try {
    const subject = encodeURIComponent('ELI MOTORS LTD - Vehicle Service Inquiry');
    const body = encodeURIComponent(`Dear ${customerName},\n\nThank you for choosing ELI MOTORS LTD for your vehicle service needs.\n\nBest regards,\nELI MOTORS LTD Team`);
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;
    toast.success(`Opening email client for ${customerName}`);
  } catch (error) {
    console.error('Error opening email client:', error);
    toast.error('Failed to open email client');
  }
};

export default function MOTCheckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [registration, setRegistration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MOTCheckResult | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('vehicle');
  const [isClient, setIsClient] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showChangeOwnerDialog, setShowChangeOwnerDialog] = useState(false);

  // Get registration from URL parameter
  const regFromUrl = searchParams?.get('registration');

  // Initialize client state properly
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize registration from URL parameter properly - FIXED VERSION
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (regFromUrl && regFromUrl.trim() && !hasInitialized.current) {
      const cleanReg = regFromUrl.trim().toUpperCase();
      setRegistration(cleanReg);
      hasInitialized.current = true;
    }
  }, [regFromUrl]); // Use ref to prevent re-initialization

  const performMOTSearch = async (regNumber: string) => {
    const cleanRegistration = regNumber.trim().toUpperCase();

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCustomer(null);
    setCustomers([]);

    try {
      // Check for existing customers with this vehicle (now returns multiple)
      console.log(`[MOT-CHECK] Fetching customer data for: ${cleanRegistration}`);
      const timestamp = Date.now();
      const customerResponse = await fetch(`/api/customers/by-vehicle-fixed?registration=${encodeURIComponent(cleanRegistration)}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        console.log(`[MOT-CHECK] Customer API response:`, customerData);
        if (customerData.success && customerData.customers && customerData.customers.length > 0) {
          console.log(`[MOT-CHECK] Found ${customerData.customers.length} customers`);
          setCustomers(customerData.customers);
          // Set the most recent customer as the primary one for backward compatibility
          setCustomer(customerData.customers[0]);
        } else {
          console.log(`[MOT-CHECK] No customers found or API returned error`);
        }
      } else {
        console.log(`[MOT-CHECK] Customer API request failed:`, customerResponse.status);
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

  const handleCheckMOT = async () => {
    if (!registration.trim()) {
      setError('Please enter a registration number');
      return;
    }

    const cleanRegistration = registration.trim().toUpperCase();

    try {
      // Update URL with registration parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('registration', cleanRegistration);
      router.push(newUrl.pathname + newUrl.search);
    } catch (error) {
      console.error('Error updating URL:', error);
    }

    // Perform the search
    await performMOTSearch(cleanRegistration);
  };

  const handleNewSearch = () => {
    // Clear all state
    setRegistration('');
    setResult(null);
    setCustomer(null);
    setCustomers([]);
    setError(null);
    setActiveTab('vehicle');

    try {
      // Clear URL parameters
      router.push('/mot-check');
    } catch (error) {
      console.error('Error clearing URL:', error);
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
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
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
      `Expiry Date: ${result.motExpiry ? formatDate(result.motExpiry) : 'N/A'}\n`;

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

  const handleOwnerChanged = useCallback(async (newOwner: any) => {
    console.log('🔄 [OWNER-CHANGED] Callback triggered with new owner:', newOwner);
    toast.success('Owner changed successfully! Refreshing page...');

    // Simple approach: reload the entire page to ensure fresh data
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="max-w-7xl mx-auto w-full">
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
            {/* New Search Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleNewSearch}
                variant="outline"
                className="bg-gray-600 hover:bg-gray-700 border-2 border-gray-600 text-white dark:bg-gray-500 dark:border-gray-500 dark:hover:bg-gray-600 font-medium px-6 py-2"
              >
                <Search className="h-4 w-4 mr-2" />
                New Search
              </Button>
            </div>

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
                          {customers.length > 0
                            ? customers.length === 1
                              ? 'Customer Record'
                              : `${customers.length} Customer Records`
                            : 'New Customer'
                          }
                        </h3>
                        {customers.length > 0 && (
                          <p className="text-sm text-gray-600">
                            {customers.length === 1
                              ? `${customers[0].total_visits || 0} visit${(customers[0].total_visits || 0) !== 1 ? 's' : ''}`
                              : `Current and previous owners`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    {customers.length > 0 && (
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        {customers.length === 1 ? 'Active' : 'Multiple'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {customers.length > 0 ? (
                    <div className="space-y-4">
                      {/* Current Owner (first in list) */}
                      <div className="text-2xl font-bold text-gray-800 uppercase">
                        {customers[0].first_name} {customers[0].last_name}
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        Current Owner
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {(customers[0].phone || customers[0].phone_number) && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span>{customers[0].phone || customers[0].phone_number}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 bg-green-600 border-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:border-green-500 dark:hover:bg-green-600"
                              onClick={() => sendWhatsAppMessage(
                                customers[0].phone || customers[0].phone_number || '',
                                `${customers[0].first_name} ${customers[0].last_name}`,
                                customers[0].id
                              )}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Send WhatsApp
                            </Button>
                          </div>
                        )}
                        {customers[0].email && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span>{customers[0].email}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
                              onClick={() => openEmailClient(
                                customers[0].email,
                                `${customers[0].first_name} ${customers[0].last_name}`
                              )}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          </div>
                        )}
                        {(customers[0].address_line1 || customers[0].city) && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span>
                                {customers[0].address_line1}
                                {customers[0].address_line2 && `, ${customers[0].address_line2}`}
                                {customers[0].city && `, ${customers[0].city}`}
                                {customers[0].postcode && `, ${customers[0].postcode}`}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600 ml-2"
                              onClick={() => {
                                const fullAddress = [
                                  customers[0].address_line1,
                                  customers[0].address_line2,
                                  customers[0].city,
                                  customers[0].postcode
                                ].filter(Boolean).join(', ');
                                openGoogleMaps(fullAddress);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Maps
                            </Button>
                          </div>
                        )}
                        {customers[0].last_visit && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>Last visit: {formatDate(customers[0].last_visit)}</span>
                          </div>
                        )}
                      </div>

                      {/* Show if there are previous owners */}
                      {customers.length > 1 && (
                        <div className="border-t pt-4">
                          <div className="text-sm text-gray-600 mb-2">
                            + {customers.length - 1} previous owner{customers.length - 1 !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            View all records in the Customer Records tab
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-6">
                        <button
                          onClick={() => setActiveTab('customer')}
                          className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Users className="w-4 h-4" />
                          <span>View All</span>
                        </button>
                        <button
                          onClick={() => {
                            setCustomer(customers[0]);
                            handleEditCustomer();
                          }}
                          className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">No customer records found for this vehicle</p>
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

                    <div className="space-y-3 pt-6">
                      <div className="flex gap-3">
                        <button className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Job Sheet</span>
                        </button>
                        <button className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                          <Calculator className="w-4 h-4" />
                          <span>Estimate</span>
                        </button>
                      </div>
                      <button
                        onClick={() => setShowChangeOwnerDialog(true)}
                        className="w-full h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 border border-blue-600 dark:border-blue-500 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Change Owner</span>
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
                                  {isClient && formatDate(test.completedDate)}
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
                      {customers.length > 0
                        ? `Found ${customers.length} customer record${customers.length !== 1 ? 's' : ''} for this vehicle`
                        : 'No customer associated with this vehicle'}
                    </p>
                  </div>
                  <div className="p-6">
                    {customers.length > 0 ? (
                      <div className="space-y-6">
                        {/* All Customer Records */}
                        <div className="space-y-4">
                          {customers.map((customerRecord, index) => (
                            <div
                              key={customerRecord.id}
                              className={`border rounded-lg p-6 ${
                                customerRecord.is_current_owner
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              {/* Customer Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    customerRecord.is_current_owner
                                      ? 'bg-green-100'
                                      : 'bg-gray-100'
                                  }`}>
                                    <User className={`h-5 w-5 ${
                                      customerRecord.is_current_owner
                                        ? 'text-green-600'
                                        : 'text-gray-600'
                                    }`} />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2 uppercase">
                                      {customerRecord.first_name} {customerRecord.last_name}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                        customerRecord.is_current_owner
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {customerRecord.is_current_owner ? 'Current Owner' : 'Previous Owner'}
                                      </span>
                                      <span className="text-base text-gray-600 font-medium">
                                        {customerRecord.total_visits || 0} visit{(customerRecord.total_visits || 0) !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {customerRecord.first_visit && customerRecord.last_visit && (
                                    <div className="space-y-1">
                                      <div className="text-sm text-gray-500">
                                        <span className="font-medium">First:</span> {formatDate(customerRecord.first_visit)}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        <span className="font-medium">Last:</span> {formatDate(customerRecord.last_visit)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Customer Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-800 text-lg">Contact Information</h4>
                                  <div className="space-y-3">
                                    {(customerRecord.phone || customerRecord.phone_number) && (
                                      <div className="flex flex-col space-y-2">
                                        <span className="text-gray-600 text-sm font-medium">Phone</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-base font-semibold text-gray-900">{customerRecord.phone || customerRecord.phone_number}</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 bg-green-600 border-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:border-green-500 dark:hover:bg-green-600"
                                            onClick={() => sendWhatsAppMessage(
                                              customerRecord.phone || customerRecord.phone_number || '',
                                              `${customerRecord.first_name} ${customerRecord.last_name}`,
                                              customerRecord.id
                                            )}
                                          >
                                            <MessageCircle className="h-4 w-4 mr-1" />
                                            Send WhatsApp
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {customerRecord.email && (
                                      <div className="flex flex-col space-y-2">
                                        <span className="text-gray-600 text-sm font-medium">Email</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-base font-medium text-gray-900 break-all">{customerRecord.email}</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
                                            onClick={() => openEmailClient(
                                              customerRecord.email,
                                              `${customerRecord.first_name} ${customerRecord.last_name}`
                                            )}
                                          >
                                            <Mail className="h-4 w-4 mr-1" />
                                            Email
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {(customerRecord.address_line1 || customerRecord.city) && (
                                      <div className="flex flex-col space-y-2">
                                        <span className="text-gray-600 text-sm font-medium">Address</span>
                                        <div className="space-y-2">
                                          <div className="text-base font-medium text-gray-900 leading-relaxed">
                                            {customerRecord.address_line1 && <div>{customerRecord.address_line1}</div>}
                                            {customerRecord.address_line2 && <div>{customerRecord.address_line2}</div>}
                                            <div>
                                              {customerRecord.city && customerRecord.city}
                                              {customerRecord.postcode && `, ${customerRecord.postcode}`}
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600 w-fit"
                                            onClick={() => {
                                              const fullAddress = [
                                                customerRecord.address_line1,
                                                customerRecord.address_line2,
                                                customerRecord.city,
                                                customerRecord.postcode
                                              ].filter(Boolean).join(', ');
                                              openGoogleMaps(fullAddress);
                                            }}
                                          >
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            Open in Maps
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-800 text-lg">Service History</h4>
                                    <span className="text-sm text-gray-500 font-medium">{customerRecord.total_visits || 0} services</span>
                                  </div>

                                  {/* Service Records Table */}
                                  <ServiceRecordsTable customerId={customerRecord.id} />
                                </div>
                              </div>

                              {/* Customer's Vehicles */}
                              {customerRecord.vehicles && customerRecord.vehicles.length > 0 && (
                                <div className="border-t pt-6 mt-6">
                                  <h4 className="font-semibold text-gray-800 text-lg mb-4">Customer's Vehicles</h4>
                                  <div className="space-y-3">
                                    {customerRecord.vehicles.map((vehicle, vehicleIndex) => (
                                      <div key={vehicleIndex} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Car className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div>
                                            <div className="font-bold text-gray-900 text-base">{vehicle.registration}</div>
                                            <div className="text-sm text-gray-600 mt-1">
                                              {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : 'Vehicle details'}
                                              {vehicle.service_count && (
                                                <span className="ml-2 text-blue-600 font-medium">
                                                  • {vehicle.service_count} service{vehicle.service_count !== 1 ? 's' : ''}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="default"
                                          onClick={() => {
                                            window.open(`/vehicles/${vehicle.registration}`, '_blank');
                                          }}
                                          className="font-medium"
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          History
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Quick Actions for this customer */}
                              <div className="border-t pt-4 mt-4">
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700"
                                    onClick={() => {
                                      setCustomer(customerRecord);
                                      handleCreateJobSheet();
                                    }}
                                    disabled={!result}
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Job Sheet
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCustomer(customerRecord);
                                      handleCreateEstimate();
                                    }}
                                    disabled={!result}
                                  >
                                    <Calculator className="h-4 w-4 mr-1" />
                                    Estimate
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCustomer(customerRecord);
                                      handleCallCustomer();
                                    }}
                                    disabled={!customerRecord.phone && !customerRecord.phone_number}
                                  >
                                    <Phone className="h-4 w-4 mr-1" />
                                    Call
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCustomer(customerRecord);
                                      handleEditCustomer();
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Records Found</h3>
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

        {/* Change Owner Dialog */}
        {result && (
          <ChangeOwnerDialog
            open={showChangeOwnerDialog}
            onOpenChange={setShowChangeOwnerDialog}
            vehicleRegistration={result.registration}
            currentOwner={customer ? {
              id: customer.id,
              name: `${customer.first_name} ${customer.last_name}`,
              phone: customer.phone || customer.phone_number,
              email: customer.email
            } : null}
            onOwnerChanged={handleOwnerChanged}
          />
        )}
      </div>
    </div>
  );
}
