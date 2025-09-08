"use client"

import { useState } from "react"
import { ChevronDown, Phone, Smartphone, Building, Home, Mail, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface ContactInfo {
  customerPhone?: string
  customerMobile?: string
  customerTwilioPhone?: string
  customerEmail?: string
}

interface ContactDropdownProps {
  contactInfo: ContactInfo
  customerName?: string
}

export function ContactDropdown({ contactInfo, customerName }: ContactDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Collect all available contact methods
  const contacts = [
    {
      type: "Mobile",
      value: contactInfo.customerMobile,
      icon: <Smartphone className="h-4 w-4" />,
      color: "bg-green-100 text-green-800",
      priority: 1
    },
    {
      type: "Phone",
      value: contactInfo.customerPhone && contactInfo.customerPhone !== contactInfo.customerMobile ? contactInfo.customerPhone : null,
      icon: <Phone className="h-4 w-4" />,
      color: "bg-blue-100 text-blue-800",
      priority: 2
    },
    {
      type: "Twilio",
      value: contactInfo.customerTwilioPhone && contactInfo.customerTwilioPhone !== contactInfo.customerMobile && contactInfo.customerTwilioPhone !== contactInfo.customerPhone ? contactInfo.customerTwilioPhone : null,
      icon: <Building className="h-4 w-4" />,
      color: "bg-purple-100 text-purple-800",
      priority: 3
    },
    {
      type: "Email",
      value: contactInfo.customerEmail && !contactInfo.customerEmail.includes('placeholder.com') ? contactInfo.customerEmail : null,
      icon: <Mail className="h-4 w-4" />,
      color: "bg-gray-100 text-gray-800",
      priority: 4
    }
  ].filter(contact => contact.value && contact.value.trim() !== "")
   .sort((a, b) => a.priority - b.priority)

  // Get primary contact (first available number)
  const primaryContact = contacts.find(c => c.type === "Mobile") || contacts.find(c => c.type === "Phone") || contacts[0]

  const copyToClipboard = (value: string, type: string) => {
    navigator.clipboard.writeText(value)
    toast({
      title: "Copied to clipboard",
      description: `${type} number copied: ${value}`,
    })
  }

  const callNumber = (number: string) => {
    window.open(`tel:${number}`, '_self')
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-start py-2 w-full">
        <span className="text-sm text-gray-600" style={{letterSpacing: '-0.003em', fontWeight: '400', fontSize: '14px'}}>No contact info</span>
      </div>
    )
  }

  if (contacts.length === 1) {
    // Single contact - show directly with copy functionality
    const contact = contacts[0]
    return (
      <div className="flex items-center justify-start gap-2 py-2 w-full">
        <Badge className={`${contact.color} border text-xs px-2 py-1 flex-shrink-0`}>
          {contact.icon}
          <span className="ml-1">{contact.type}</span>
        </Badge>
        <span className="text-sm font-medium truncate flex-1 text-gray-900" style={{letterSpacing: '-0.003em', fontWeight: '590', fontSize: '14px'}}>{contact.value}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            copyToClipboard(contact.value!, contact.type)
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  // Multiple contacts - show dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-2 justify-start hover:bg-gray-50 w-full text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-start gap-2 w-full">
            <Badge className={`${primaryContact?.color} border text-xs px-2 py-1 flex-shrink-0`}>
              {primaryContact?.icon}
              <span className="ml-1">{primaryContact?.type}</span>
            </Badge>
            <span className="text-sm font-medium truncate flex-1 text-gray-900" style={{letterSpacing: '-0.003em', fontWeight: '590', fontSize: '14px'}}>
              {primaryContact?.value}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {contacts.length > 1 && (
                <Badge variant="outline" className="text-xs px-1 py-0.5">
                  +{contacts.length - 1}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">
          {customerName ? `${customerName} - Contact Information` : 'Contact Information'}
        </div>
        {contacts.map((contact, index) => (
          <DropdownMenuItem
            key={index}
            className="flex items-center gap-4 p-4 hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation()
              if (contact.type === "Email") {
                window.open(`mailto:${contact.value}`, '_self')
              } else {
                callNumber(contact.value!)
              }
            }}
          >
            <Badge className={`${contact.color} border text-xs px-2 py-1`}>
              {contact.icon}
              <span className="ml-1.5">{contact.type}</span>
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900" style={{letterSpacing: '-0.003em', fontWeight: '590', fontSize: '14px'}}>{contact.value}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(contact.value!, contact.type)
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
