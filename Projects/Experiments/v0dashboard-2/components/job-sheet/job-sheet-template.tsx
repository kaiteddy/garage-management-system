'use client'

import React, { useEffect } from 'react'
import { format } from 'date-fns'

interface JobSheetTemplateProps {
  jobSheet: {
    id: string
    jobNumber: string
    customerName: string
    customerPhone?: string
    customerEmail?: string
    customerAddress?: string
    vehicleRegistration: string
    vehicleMake: string
    vehicleModel: string
    vehicleYear?: number
    vehicleDerivative?: string
    vehicleColor?: string
    vehicleVin?: string
    odometerReading?: number
    odometerUnit?: string
    jobType: string
    jobDescription?: string
    workRequested: string
    workPerformed?: string
    dateCreated: Date
    datePromised?: Date
    dateStarted?: Date
    dateCompleted?: Date
    status: string
    customerAuthorizationSignature?: string
    customerAuthorizationDate?: Date
    customerAuthorizationMethod?: string
    primaryTechnicianName?: string
    technicianSignature?: string
    technicianCompletionDate?: Date
    laborHours?: number
    laborRate?: number
    laborTotal?: number
    partsTotal?: number
    subtotal?: number
    vatRate?: number
    vatAmount?: number
    totalAmount?: number
    specialInstructions?: string
    warrantyPeriod?: number
    warrantyNotes?: string
  }
  lineItems?: Array<{
    lineNumber: number
    itemType: string
    description: string
    laborHours?: number
    laborRate?: number
    partNumber?: string
    partName?: string
    partBrand?: string
    partCondition?: string
    quantity?: number
    unitPrice?: number
    lineTotal: number
  }>
  isPrintView?: boolean
}

export function JobSheetTemplate({ jobSheet, lineItems = [], isPrintView = false }: JobSheetTemplateProps) {
  // Load print styles when component mounts
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/styles/job-sheet-print.css'
    link.media = 'print'
    document.head.appendChild(link)

    return () => {
      // Cleanup on unmount
      const existingLink = document.querySelector('link[href="/styles/job-sheet-print.css"]')
      if (existingLink) {
        document.head.removeChild(existingLink)
      }
    }
  }, [])

  const containerClass = isPrintView
    ? "bg-white text-black font-sans text-sm leading-tight"
    : "bg-white border border-gray-300 shadow-lg text-black font-sans text-sm leading-tight"

  return (
    <div className={`${containerClass} max-w-4xl mx-auto p-6 print:p-4 print:shadow-none print:border-none overflow-x-auto`}>
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ELI MOTORS LTD</h1>
            <div className="text-sm text-gray-700">
              <p>Professional Automotive Services</p>
              <p>Unit 5, Industrial Estate, Service Road</p>
              <p>Phone: 01234 567890 | Email: service@elimotors.com</p>
              <p>VAT Registration: GB123456789</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900 mb-2">JOB SHEET</h2>
            <div className="text-sm">
              <p><strong>Job Number:</strong> {jobSheet.jobNumber}</p>
              <p><strong>Date Created:</strong> {format(new Date(jobSheet.dateCreated), 'dd/MM/yyyy HH:mm')}</p>
              <p><strong>Status:</strong> <span className="uppercase font-semibold">{jobSheet.status}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer and Vehicle Information */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Customer Information */}
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">CUSTOMER INFORMATION</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> <span className="uppercase">{jobSheet.customerName}</span></p>
            {jobSheet.customerPhone && <p><strong>Phone:</strong> {jobSheet.customerPhone}</p>}
            {jobSheet.customerEmail && <p><strong>Email:</strong> {jobSheet.customerEmail}</p>}
            {jobSheet.customerAddress && (
              <div>
                <strong>Address:</strong>
                <div className="ml-4 mt-1">{jobSheet.customerAddress}</div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">VEHICLE INFORMATION</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Registration:</strong> <span className="uppercase font-semibold">{jobSheet.vehicleRegistration}</span></p>
            <p><strong>Make/Model:</strong> <span className="uppercase">{jobSheet.vehicleMake} {jobSheet.vehicleModel}</span></p>
            {jobSheet.vehicleYear && <p><strong>Year:</strong> {jobSheet.vehicleYear}</p>}
            {jobSheet.vehicleDerivative && <p><strong>Derivative:</strong> <span className="uppercase">{jobSheet.vehicleDerivative}</span></p>}
            {jobSheet.vehicleColor && <p><strong>Color:</strong> {jobSheet.vehicleColor}</p>}
            {jobSheet.vehicleVin && <p><strong>VIN:</strong> {jobSheet.vehicleVin}</p>}
            {jobSheet.odometerReading && (
              <p><strong>Odometer:</strong> {jobSheet.odometerReading.toLocaleString()} {jobSheet.odometerUnit || 'miles'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="border border-gray-300 p-4 mb-6">
        <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">JOB DETAILS</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Job Type:</strong> <span className="uppercase">{jobSheet.jobType}</span></p>
            {jobSheet.datePromised && (
              <p><strong>Promised Date:</strong> {format(new Date(jobSheet.datePromised), 'dd/MM/yyyy HH:mm')}</p>
            )}
            {jobSheet.dateStarted && (
              <p><strong>Started:</strong> {format(new Date(jobSheet.dateStarted), 'dd/MM/yyyy HH:mm')}</p>
            )}
            {jobSheet.dateCompleted && (
              <p><strong>Completed:</strong> {format(new Date(jobSheet.dateCompleted), 'dd/MM/yyyy HH:mm')}</p>
            )}
          </div>
          <div>
            {jobSheet.primaryTechnicianName && (
              <p><strong>Primary Technician:</strong> {jobSheet.primaryTechnicianName}</p>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <p><strong>Work Requested:</strong></p>
          <div className="border border-gray-200 p-3 mt-2 bg-gray-50 min-h-[60px]">
            {jobSheet.workRequested}
          </div>
        </div>

        {jobSheet.workPerformed && (
          <div className="mt-4">
            <p><strong>Work Performed:</strong></p>
            <div className="border border-gray-200 p-3 mt-2 bg-gray-50 min-h-[60px]">
              {jobSheet.workPerformed}
            </div>
          </div>
        )}

        {jobSheet.specialInstructions && (
          <div className="mt-4">
            <p><strong>Special Instructions:</strong></p>
            <div className="border border-gray-200 p-3 mt-2 bg-yellow-50 min-h-[40px]">
              {jobSheet.specialInstructions}
            </div>
          </div>
        )}
      </div>

      {/* Parts and Labor */}
      {lineItems.length > 0 && (
        <div className="border border-gray-300 p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">PARTS AND LABOR</h3>
          <div className="overflow-x-auto">
            <table className="parts-table w-full text-sm border-collapse table-fixed min-w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left p-2 border-r border-gray-200" style={{ width: '50%' }}>Description</th>
                  <th className="text-center p-2 border-r border-gray-200" style={{ width: '12%' }}>Qty</th>
                  <th className="text-right p-2 border-r border-gray-200" style={{ width: '19%' }}>Unit Price</th>
                  <th className="text-right p-2" style={{ width: '19%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-2 border-r border-gray-200">
                      <div className="break-words">
                        <span className="font-medium block">{item.description}</span>
                        {item.partNumber && <div className="text-xs text-gray-600 truncate">Part #: {item.partNumber}</div>}
                        {item.partBrand && <div className="text-xs text-gray-600 truncate">Brand: {item.partBrand}</div>}
                        {item.partCondition && item.partCondition !== 'new' && (
                          <div className="text-xs text-gray-600">Condition: {item.partCondition}</div>
                        )}
                        {item.laborHours && (
                          <div className="text-xs text-gray-600">Labor: {item.laborHours}h @ £{item.laborRate}/h</div>
                        )}
                      </div>
                    </td>
                    <td className="text-center p-2 border-r border-gray-200">{item.quantity || 1}</td>
                    <td className="text-right p-2 border-r border-gray-200">
                      £{(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="text-right p-2 font-medium">
                      £{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          {/* Warranty Information */}
          {(jobSheet.warrantyPeriod || jobSheet.warrantyNotes) && (
            <div className="border border-gray-300 p-4">
              <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">WARRANTY</h3>
              <div className="text-sm">
                {jobSheet.warrantyPeriod && (
                  <p><strong>Period:</strong> {jobSheet.warrantyPeriod} days</p>
                )}
                {jobSheet.warrantyNotes && (
                  <div className="mt-2">
                    <strong>Terms:</strong>
                    <div className="mt-1">{jobSheet.warrantyNotes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">PRICING SUMMARY</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Labor Total:</span>
              <span>£{(jobSheet.laborTotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Parts Total:</span>
              <span>£{(jobSheet.partsTotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span>Subtotal:</span>
              <span>£{(jobSheet.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({jobSheet.vatRate || 20}%):</span>
              <span>£{(jobSheet.vatAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-800 pt-2 font-bold text-base">
              <span>TOTAL:</span>
              <span>£{(jobSheet.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authorization and Signatures */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Customer Authorization */}
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">CUSTOMER AUTHORIZATION</h3>
          <div className="text-xs mb-4 text-gray-700">
            I authorize the above work to be performed and agree to pay the charges listed. 
            I understand that additional work may require separate authorization.
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Customer Signature:</label>
              <div className="border-b border-gray-400 h-12 mt-2">
                {jobSheet.customerAuthorizationSignature && (
                  <img 
                    src={jobSheet.customerAuthorizationSignature} 
                    alt="Customer Signature" 
                    className="h-10 object-contain"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <label>Date:</label>
                <div className="border-b border-gray-400 w-24 mt-1">
                  {jobSheet.customerAuthorizationDate && 
                    format(new Date(jobSheet.customerAuthorizationDate), 'dd/MM/yyyy')
                  }
                </div>
              </div>
              <div>
                <label>Method:</label>
                <div className="border-b border-gray-400 w-20 mt-1">
                  {jobSheet.customerAuthorizationMethod}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technician Completion */}
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">TECHNICIAN COMPLETION</h3>
          <div className="text-xs mb-4 text-gray-700">
            I certify that the above work has been completed in accordance with 
            industry standards and manufacturer specifications.
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Technician Signature:</label>
              <div className="border-b border-gray-400 h-12 mt-2">
                {jobSheet.technicianSignature && (
                  <img 
                    src={jobSheet.technicianSignature} 
                    alt="Technician Signature" 
                    className="h-10 object-contain"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <label>Date:</label>
                <div className="border-b border-gray-400 w-24 mt-1">
                  {jobSheet.technicianCompletionDate && 
                    format(new Date(jobSheet.technicianCompletionDate), 'dd/MM/yyyy')
                  }
                </div>
              </div>
              <div>
                <label>Technician:</label>
                <div className="border-b border-gray-400 w-32 mt-1 text-xs">
                  {jobSheet.primaryTechnicianName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-800 pt-4 text-xs text-gray-600">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p><strong>Terms & Conditions:</strong></p>
            <p>Payment due within 30 days. Work guaranteed for warranty period specified above.</p>
          </div>
          <div>
            <p><strong>Data Protection:</strong></p>
            <p>Your data is processed in accordance with GDPR regulations.</p>
          </div>
          <div>
            <p><strong>Complaints:</strong></p>
            <p>Any complaints should be directed to management within 7 days.</p>
          </div>
        </div>
        <div className="text-center mt-4 pt-2 border-t border-gray-300">
          <p>ELI MOTORS LTD - Professional Automotive Services - Job Sheet {jobSheet.jobNumber}</p>
        </div>
      </div>
    </div>
  )
}
