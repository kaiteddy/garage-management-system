"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Customer } from "@/lib/database/types"

interface CustomerEditDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (customer: Customer) => void
}

export function CustomerEditDialog({ customer, open, onOpenChange, onSave }: CustomerEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Customer>>(customer || {})

  const handleSave = () => {
    if (formData && customer) {
      onSave({ ...customer, ...formData })
      onOpenChange(false)
    }
  }

  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information and contact details.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="forename" className="text-right">
              First Name
            </Label>
            <Input
              id="forename"
              value={formData.forename || ""}
              onChange={(e) => setFormData({ ...formData, forename: e.target.value })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="surname" className="text-right">
              Last Name
            </Label>
            <Input
              id="surname"
              value={formData.surname || ""}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company" className="text-right">
              Company
            </Label>
            <Input
              id="company"
              value={formData.companyName || ""}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.contact?.email || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, email: e.target.value },
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="telephone" className="text-right">
              Phone
            </Label>
            <Input
              id="telephone"
              value={formData.contact?.telephone || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, telephone: e.target.value },
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mobile" className="text-right">
              Mobile
            </Label>
            <Input
              id="mobile"
              value={formData.contact?.mobile || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, mobile: e.target.value },
                })
              }
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
