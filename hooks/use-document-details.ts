import { useState, useEffect } from 'react'

interface DocumentDetails {
  id: string
  documentNumber: string
  type: string
  date: string
  status: string
  totalGross: number
  totalNet: number
  totalTax: number
  customer: {
    id: string
    name: string
    firstName: string
    lastName: string
    phone: string
    email: string
    address: {
      line1: string
      line2: string
      city: string
      postcode: string
    }
  }
  vehicle: {
    registration: string
    make: string
    model: string
    year: number
    engineSize: string
    fuelType: string
    motExpiry: string
    taxExpiry: string
  }
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    taxRate: number
    type: string
  }>
  serviceDetails: {
    labourDescription: string
    notes: string
  } | null
  calculatedTotals: {
    subtotal: number
    tax: number
    total: number
    itemCount: number
  }
}

interface UseDocumentDetailsResult {
  documentDetails: DocumentDetails | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDocumentDetails(documentId: string | null): UseDocumentDetailsResult {
  const [documentDetails, setDocumentDetails] = useState<DocumentDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocumentDetails = async () => {
    if (!documentId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/details`)
      const data = await response.json()

      if (data.success) {
        setDocumentDetails(data.document)
      } else {
        setError(data.error || 'Failed to fetch document details')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentDetails()
  }, [documentId])

  return {
    documentDetails,
    loading,
    error,
    refetch: fetchDocumentDetails
  }
}
