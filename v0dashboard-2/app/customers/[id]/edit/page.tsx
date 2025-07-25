'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Customer = {
  id: string;
  _ID: string;
  forename: string;
  surname: string;
  contactTelephone: string;
  contactMobile: string;
  contactEmail: string;
  addressHouseNo: string;
  addressRoad: string;
  addressLocality: string;
  addressTown: string;
  addressCounty: string;
  addressPostCode: string;
};

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();

      if (data && data.id) {
        setCustomer(data);
      } else {
        setError('Failed to load customer');
      }
    } catch (err) {
      setError('Failed to load customer');
      console.error('Error loading customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
      });

      const data = await response.json();

      if (data.success) {
        alert('Customer updated successfully!');
        router.back();
      } else {
        alert('Failed to update customer: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Customer, value: string) => {
    if (!customer) return;
    setCustomer({
      ...customer,
      [field]: value
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading customer details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
              <p className="text-gray-600">Update customer information</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="forename">First Name</Label>
                  <Input
                    id="forename"
                    value={customer.forename || ''}
                    onChange={(e) => handleInputChange('forename', e.target.value)}
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Last Name</Label>
                  <Input
                    id="surname"
                    value={customer.surname || ''}
                    onChange={(e) => handleInputChange('surname', e.target.value)}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactTelephone">Phone Number</Label>
                  <Input
                    id="contactTelephone"
                    value={customer.contactTelephone || ''}
                    onChange={(e) => handleInputChange('contactTelephone', e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="contactMobile">Mobile Number</Label>
                  <Input
                    id="contactMobile"
                    value={customer.contactMobile || ''}
                    onChange={(e) => handleInputChange('contactMobile', e.target.value)}
                    placeholder="Mobile number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={customer.contactEmail || ''}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="Email address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="addressHouseNo">House Number/Name</Label>
                <Input
                  id="addressHouseNo"
                  value={customer.addressHouseNo || ''}
                  onChange={(e) => handleInputChange('addressHouseNo', e.target.value)}
                  placeholder="House number or name"
                />
              </div>
              <div>
                <Label htmlFor="addressRoad">Street Address</Label>
                <Input
                  id="addressRoad"
                  value={customer.addressRoad || ''}
                  onChange={(e) => handleInputChange('addressRoad', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label htmlFor="addressLocality">Locality</Label>
                <Input
                  id="addressLocality"
                  value={customer.addressLocality || ''}
                  onChange={(e) => handleInputChange('addressLocality', e.target.value)}
                  placeholder="Locality (optional)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="addressTown">Town/City</Label>
                  <Input
                    id="addressTown"
                    value={customer.addressTown || ''}
                    onChange={(e) => handleInputChange('addressTown', e.target.value)}
                    placeholder="Town or city"
                  />
                </div>
                <div>
                  <Label htmlFor="addressCounty">County</Label>
                  <Input
                    id="addressCounty"
                    value={customer.addressCounty || ''}
                    onChange={(e) => handleInputChange('addressCounty', e.target.value)}
                    placeholder="County (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="addressPostCode">Postcode</Label>
                  <Input
                    id="addressPostCode"
                    value={customer.addressPostCode || ''}
                    onChange={(e) => handleInputChange('addressPostCode', e.target.value)}
                    placeholder="Postcode"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
