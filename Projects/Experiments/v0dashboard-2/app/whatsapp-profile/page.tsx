"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Upload,
  Eye,
  Save,
  Copy,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"

export default function WhatsAppProfilePage() {
  const [profileData, setProfileData] = useState({
    businessName: 'ELI MOTORS LTD',
    displayName: 'ELI MOTORS LTD',
    about: 'Professional MOT testing and vehicle servicing. Serving Hendon since 1979. Call 0208 203 6449 to book.',
    description: 'ELI MOTORS LTD - Your trusted MOT and service centre in Hendon. Established 1979. Professional vehicle testing, servicing, and maintenance.',
    phone: '0208 203 6449',
    email: '',
    website: 'https://www.elimotors.co.uk',
    address: '',
    category: 'Automotive Services'
  })

  const [businessHours, setBusinessHours] = useState({
    monday: '8:00 AM - 6:00 PM',
    tuesday: '8:00 AM - 6:00 PM',
    wednesday: '8:00 AM - 6:00 PM',
    thursday: '8:00 AM - 6:00 PM',
    friday: '8:00 AM - 6:00 PM',
    saturday: '8:00 AM - 4:00 PM',
    sunday: 'Closed'
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const generateWelcomeMessage = () => {
    return `👋 Hello there!

Welcome to ${profileData.businessName} WhatsApp service.

🚗 We're your trusted MOT and service centre
📍 Serving Hendon since 1979
📞 Call us: ${profileData.phone}

How can we help you today?

• MOT bookings and reminders
• Service appointments
• Vehicle status updates
• General inquiries

Reply with your question or call us directly!

Commands:
• STOP - Unsubscribe
• HELP - Show help menu
• SOLD [REG] - Mark vehicle as sold`
  }

  const generateBusinessHoursMessage = () => {
    return `🕐 ${profileData.businessName} Business Hours

Monday - Friday: 8:00 AM - 6:00 PM
Saturday: 8:00 AM - 4:00 PM
Sunday: Closed

📞 Call us: ${profileData.phone}
📍 Serving Hendon since 1979

For urgent matters outside business hours, please leave a message and we'll get back to you first thing!`
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Business Profile</h2>
          <p className="text-muted-foreground">
            Configure your WhatsApp Business profile with logo, business details, and hours
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Business Profile</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="messages">Auto Messages</TabsTrigger>
          <TabsTrigger value="verification">Verification Info</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Business Information</span>
                </CardTitle>
                <CardDescription>
                  Basic business details that will appear in your WhatsApp profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={profileData.businessName}
                    onChange={(e) => setProfileData({...profileData, businessName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={profileData.category}
                    onChange={(e) => setProfileData({...profileData, category: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about">About (Short Description)</Label>
                  <Textarea
                    id="about"
                    value={profileData.about}
                    onChange={(e) => setProfileData({...profileData, about: e.target.value})}
                    rows={3}
                    maxLength={139}
                  />
                  <p className="text-xs text-muted-foreground">
                    {profileData.about.length}/139 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={profileData.description}
                    onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
                <CardDescription>
                  Contact details customers will see
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    placeholder="your@business.email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profileData.website}
                    onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                    placeholder="https://your-website.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    rows={3}
                    placeholder="Your business address in Hendon"
                  />
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Business Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {logoPreview && (
                    <div className="mt-2">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-20 h-20 object-contain border rounded"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, 640x640px, PNG or JPG
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Business Hours</span>
              </CardTitle>
              <CardDescription>
                Set your business operating hours for customer reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4">
                  <Label className="w-20 capitalize">{day}</Label>
                  <Input
                    value={hours}
                    onChange={(e) => setBusinessHours({...businessHours, [day]: e.target.value})}
                    placeholder="8:00 AM - 6:00 PM or Closed"
                    className="flex-1"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Welcome Message</span>
                </CardTitle>
                <CardDescription>
                  Automatic welcome message for new WhatsApp contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {generateWelcomeMessage()}
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generateWelcomeMessage())}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Message
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Business Hours Message</span>
                </CardTitle>
                <CardDescription>
                  Message showing your business hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {generateBusinessHoursMessage()}
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generateBusinessHoursMessage())}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>WhatsApp Business Verification</span>
              </CardTitle>
              <CardDescription>
                Information needed for WhatsApp Business API verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Business Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Legal Name:</strong> ELI MOTORS LTD</div>
                    <div><strong>Display Name:</strong> {profileData.displayName}</div>
                    <div><strong>Category:</strong> AUTOMOTIVE</div>
                    <div><strong>Phone:</strong> {profileData.phone}</div>
                    <div><strong>WhatsApp Number:</strong> +447488896449</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Use Case</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Primary:</strong> Customer Service</div>
                    <div><strong>Volume:</strong> 500-1000 messages/month</div>
                    <div><strong>Types:</strong> MOT reminders, service confirmations</div>
                    <div><strong>Compliance:</strong> GDPR compliant</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Required Documents</h4>
                <div className="grid gap-2 text-sm">
                  <Badge variant="outline" className="w-fit">✅ UK Business Registration Certificate</Badge>
                  <Badge variant="outline" className="w-fit">✅ Proof of Business Address</Badge>
                  <Badge variant="outline" className="w-fit">✅ Business Bank Statement</Badge>
                  <Badge variant="outline" className="w-fit">✅ Business Logo (if available)</Badge>
                  <Badge variant="outline" className="w-fit">✅ Website/Social Media Profiles</Badge>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Wait for WhatsApp verification rate limit to expire</li>
                  <li>Request new verification code for +447488896449</li>
                  <li>Submit business information with documents</li>
                  <li>Upload business logo and profile details</li>
                  <li>Wait for Meta approval (5-12 business days)</li>
                  <li>Configure business profile with this information</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
