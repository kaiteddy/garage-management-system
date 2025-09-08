'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  FileText,
  Receipt,
  Calculator,
  Users,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { useRouter } from 'next/navigation'

interface JobSheetActionsProps {
  jobSheetId: string
  currentStatus: string
  registration: string
  className?: string
}

export function JobSheetActions({ 
  jobSheetId, 
  currentStatus, 
  registration,
  className 
}: JobSheetActionsProps) {
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [ownershipDialogOpen, setOwnershipDialogOpen] = useState(false)
  const [converting, setConverting] = useState(false)
  const [changingOwnership, setChangingOwnership] = useState(false)
  const [convertTo, setConvertTo] = useState<'estimate' | 'invoice'>('estimate')
  const [conversionNotes, setConversionNotes] = useState('')
  const [ownershipChangeType, setOwnershipChangeType] = useState('transferred')
  const [ownershipNotes, setOwnershipNotes] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const handleConvert = async () => {
    if (!convertTo) return

    setConverting(true)
    try {
      const response = await fetch(`/api/job-sheets/${jobSheetId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          convertTo,
          notes: conversionNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Conversion Successful",
          description: `Job sheet converted to ${convertTo} #${data.newDocument.docNumber}`,
        })

        setConvertDialogOpen(false)
        
        // Navigate to the new document
        if (data.redirectUrl) {
          router.push(data.redirectUrl)
        }
      } else {
        throw new Error(data.error || 'Conversion failed')
      }
    } catch (error) {
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setConverting(false)
    }
  }

  const handleOwnershipChange = async () => {
    setChangingOwnership(true)
    try {
      const response = await fetch(`/api/vehicles/${registration}/change-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changeType: ownershipChangeType,
          changeDate: new Date().toISOString().split('T')[0],
          notes: ownershipNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Ownership Changed",
          description: `Vehicle ownership has been updated`,
        })

        setOwnershipDialogOpen(false)
        
        // Refresh the page to show updated information
        window.location.reload()
      } else {
        throw new Error(data.error || 'Ownership change failed')
      }
    } catch (error) {
      toast({
        title: "Ownership Change Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setChangingOwnership(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { color: 'bg-blue-100 text-blue-800', icon: FileText },
      'in-progress': { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      'completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'estimated': { color: 'bg-purple-100 text-purple-800', icon: Calculator },
      'invoiced': { color: 'bg-gray-100 text-gray-800', icon: Receipt }
    }

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.open
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    )
  }

  const canConvert = currentStatus.toLowerCase() === 'open' || currentStatus.toLowerCase() === 'completed'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Current Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        {getStatusBadge(currentStatus)}
      </div>

      {/* Convert Job Sheet */}
      {canConvert && (
        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4 mr-2" />
              Convert
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Convert Job Sheet</DialogTitle>
              <DialogDescription>
                Convert this job sheet to an estimate or invoice. This will create a new document and update the job sheet status.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="convert-to">Convert To</Label>
                <Select value={convertTo} onValueChange={(value: 'estimate' | 'invoice') => setConvertTo(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estimate">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Estimate
                      </div>
                    </SelectItem>
                    <SelectItem value="invoice">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Invoice
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Conversion Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this conversion..."
                  value={conversionNotes}
                  onChange={(e) => setConversionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvert} disabled={converting || !convertTo}>
                {converting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert to {convertTo}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Vehicle Ownership */}
      <Dialog open={ownershipDialogOpen} onOpenChange={setOwnershipDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Change Owner
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Vehicle Ownership</DialogTitle>
            <DialogDescription>
              Record a change in vehicle ownership for {registration}. This will update the vehicle records and ownership history.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="change-type">Change Type</Label>
              <Select value={ownershipChangeType} onValueChange={setOwnershipChangeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select change type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferred">Transferred to New Owner</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="scrapped">Scrapped</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ownership-notes">Notes</Label>
              <Textarea
                id="ownership-notes"
                placeholder="Add details about the ownership change..."
                value={ownershipNotes}
                onChange={(e) => setOwnershipNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will mark the current vehicle record as inactive. 
                  If transferring to a new owner, you'll need to create a new customer record separately.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnershipDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOwnershipChange} disabled={changingOwnership}>
              {changingOwnership ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Update Ownership
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
