"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [customerName, setCustomerName] = useState('')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/email/cleanup-verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'verify_email' })
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Your email address has been verified successfully!')
        setCustomerName(`${data.customer.first_name} ${data.customer.last_name}`)
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred during verification')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            Verifying your email address for MOT reminders
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Success!</strong> {message}
                {customerName && (
                  <div className="mt-2">
                    Welcome, {customerName}! You'll now receive MOT reminders at this email address.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {status === 'success' && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>What happens next?</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You'll receive MOT reminders via email</li>
                  <li>You can reply to update your contact details</li>
                  <li>Reply "STOP" to unsubscribe at any time</li>
                </ul>
              </div>
            )}

            {status === 'error' && (
              <div className="text-sm text-muted-foreground">
                <p>If you continue to have problems, please contact us directly:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Phone: [YOUR_PHONE_NUMBER]</li>
                  <li>Email: [YOUR_EMAIL]</li>
                </ul>
              </div>
            )}

            <div className="pt-4 border-t">
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Main Site
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Loading component for Suspense fallback
function LoadingVerifyEmail() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            Verifying your email address for MOT reminders
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main export component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingVerifyEmail />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
