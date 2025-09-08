'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Trash2,
  Ban,
  AlertTriangle,
  Loader2,
  FileX
} from "lucide-react"
import { useRouter } from 'next/navigation'

interface JobSheetDeleteVoidProps {
  jobSheetId: string
  jobNumber: string
  currentStatus: string
  registration?: string
  className?: string
  onSuccess?: () => void
}

export function JobSheetDeleteVoid({ 
  jobSheetId, 
  jobNumber,
  currentStatus,
  registration,
  className,
  onSuccess
}: JobSheetDeleteVoidProps) {
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  // Check if job sheet can be voided/deleted based on status
  const canVoid = !['Invoiced', 'Completed', 'Voided', 'Cancelled'].includes(currentStatus)
  const canDelete = ['Open', 'Voided', 'Cancelled'].includes(currentStatus)

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast({
        title: "Void Reason Required",
        description: "Please provide a reason for voiding this job sheet.",
        variant: "destructive",
      })
      return
    }

    setVoiding(true)
    try {
      const response = await fetch(`/api/job-sheets/${jobSheetId}?action=void`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: voidReason
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Job Sheet Voided",
          description: `Job sheet ${jobNumber} has been voided successfully.`,
        })
        setVoidDialogOpen(false)
        onSuccess?.()
        // Refresh the page or redirect
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to void job sheet')
      }

    } catch (error) {
      console.error('Error voiding job sheet:', error)
      toast({
        title: "Void Failed",
        description: error instanceof Error ? error.message : "Failed to void job sheet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setVoiding(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/job-sheets/${jobSheetId}?action=delete`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Job Sheet Deleted",
          description: `Job sheet ${jobNumber} has been permanently deleted.`,
        })
        setDeleteDialogOpen(false)
        onSuccess?.()
        // Redirect to job sheets list
        router.push('/job-sheets')
      } else {
        throw new Error(result.error || 'Failed to delete job sheet')
      }

    } catch (error) {
      console.error('Error deleting job sheet:', error)
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete job sheet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Void Job Sheet */}
      {canVoid && (
        <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
              <Ban className="h-4 w-4 mr-2" />
              Void
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-orange-600" />
                Void Job Sheet
              </DialogTitle>
              <DialogDescription>
                Void job sheet <strong>{jobNumber}</strong> {registration && `for vehicle ${registration}`}. 
                This will mark the job sheet as voided but keep it in the system for audit purposes.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="void-reason">Reason for Voiding *</Label>
                <Textarea
                  id="void-reason"
                  placeholder="Please provide a reason for voiding this job sheet..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <strong>Note:</strong> Voiding a job sheet will:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Mark the job sheet as "VOIDED"</li>
                      <li>Add a timestamp to the notes</li>
                      <li>Prevent further modifications</li>
                      <li>Keep the record for audit purposes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleVoid} 
                disabled={voiding || !voidReason.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {voiding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Void Job Sheet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Job Sheet */}
      {canDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Delete Job Sheet
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete job sheet <strong>{jobNumber}</strong>
                {registration && ` for vehicle ${registration}`}?
                <br /><br />
                <span className="text-red-600 font-medium">
                  This action cannot be undone. The job sheet will be permanently removed from the system.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="bg-red-50 p-3 rounded-lg my-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>Warning:</strong> Deleting this job sheet will:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Permanently remove all job sheet data</li>
                    <li>Remove associated parts and labour records</li>
                    <li>Cannot be recovered or undone</li>
                    <li>May affect reporting and audit trails</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Show status if can't void/delete */}
      {!canVoid && !canDelete && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileX className="h-4 w-4" />
          Cannot modify {currentStatus.toLowerCase()} job sheet
        </div>
      )}
    </div>
  )
}
