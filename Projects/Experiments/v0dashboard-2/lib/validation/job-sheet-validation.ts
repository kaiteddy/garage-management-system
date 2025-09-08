export interface ValidationError {
  field: string
  message: string
  category: 'vehicle' | 'customer' | 'job' | 'mileage'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  canPrint: boolean
  canInvoice: boolean
}

export interface ValidationSettings {
  // Vehicle Requirements
  vehicle_registration_required_for_print: boolean
  vehicle_registration_required_for_invoice: boolean
  vehicle_make_required_for_print: boolean
  vehicle_make_required_for_invoice: boolean
  vehicle_model_required_for_print: boolean
  vehicle_model_required_for_invoice: boolean

  // Customer Requirements
  customer_name_required_for_print: boolean
  customer_name_required_for_invoice: boolean
  customer_contact_required_for_print: boolean
  customer_contact_required_for_invoice: boolean
  customer_address_required_for_print: boolean
  customer_address_required_for_invoice: boolean

  // Job Requirements
  mileage_required_for_print: boolean
  mileage_required_for_invoice: boolean
  technician_required_for_print: boolean
  technician_required_for_invoice: boolean
  service_advisor_required_for_print: boolean
  service_advisor_required_for_invoice: boolean

  // Job Items Requirements
  items_required_for_print: boolean
  items_required_for_invoice: boolean

  // Custom Messages
  print_blocked_message: string
  invoice_blocked_message: string

  // Validation Strictness
  show_warnings: boolean
  block_on_warnings: boolean
}

export interface JobSheetValidationData {
  // Vehicle Information
  vehicle: {
    registration: string
    make: string
    model: string
    year?: string | number
    color?: string
    engineSize?: string
    fuelType?: string
  }
  
  // Customer Information
  customer: {
    name: string
    houseNumber?: string
    road?: string
    town?: string
    postCode?: string
    telephone?: string
    mobile?: string
    email?: string
  }
  
  // Job Information
  mileage: string | number
  technician?: string
  serviceAdvisor?: string
  dateIn?: string
  dueDate?: string
  status?: string
  
  // Job Items
  items?: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
}

// Default settings (fallback if API fails)
const DEFAULT_SETTINGS: ValidationSettings = {
  vehicle_registration_required_for_print: true,
  vehicle_registration_required_for_invoice: true,
  vehicle_make_required_for_print: false,
  vehicle_make_required_for_invoice: false,
  vehicle_model_required_for_print: false,
  vehicle_model_required_for_invoice: false,
  customer_name_required_for_print: true,
  customer_name_required_for_invoice: true,
  customer_contact_required_for_print: true,
  customer_contact_required_for_invoice: true,
  customer_address_required_for_print: false,
  customer_address_required_for_invoice: true,
  mileage_required_for_print: true,
  mileage_required_for_invoice: true,
  technician_required_for_print: false,
  technician_required_for_invoice: false,
  service_advisor_required_for_print: false,
  service_advisor_required_for_invoice: false,
  items_required_for_print: false,
  items_required_for_invoice: false,
  print_blocked_message: "Please complete all required fields before printing.",
  invoice_blocked_message: "Please complete all required fields before invoicing.",
  show_warnings: true,
  block_on_warnings: false
}

/**
 * Validates job sheet data for completeness before printing or invoicing
 */
export function validateJobSheet(data: JobSheetValidationData, settings: ValidationSettings = DEFAULT_SETTINGS): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // === VEHICLE VALIDATION ===

  // Vehicle Registration
  if (!data.vehicle.registration?.trim()) {
    if (settings.vehicle_registration_required_for_print || settings.vehicle_registration_required_for_invoice) {
      errors.push({
        field: 'vehicle.registration',
        message: 'Vehicle registration is required',
        category: 'vehicle'
      })
    }
  }

  // Vehicle Make
  if (!data.vehicle.make?.trim()) {
    if (settings.vehicle_make_required_for_print || settings.vehicle_make_required_for_invoice) {
      errors.push({
        field: 'vehicle.make',
        message: 'Vehicle make is required',
        category: 'vehicle'
      })
    } else if (settings.show_warnings) {
      warnings.push({
        field: 'vehicle.make',
        message: 'Vehicle make not specified - consider updating for complete records',
        category: 'vehicle'
      })
    }
  }

  // Vehicle Model
  if (!data.vehicle.model?.trim()) {
    if (settings.vehicle_model_required_for_print || settings.vehicle_model_required_for_invoice) {
      errors.push({
        field: 'vehicle.model',
        message: 'Vehicle model is required',
        category: 'vehicle'
      })
    } else if (settings.show_warnings) {
      warnings.push({
        field: 'vehicle.model',
        message: 'Vehicle model not specified - consider updating for complete records',
        category: 'vehicle'
      })
    }
  }

  // === CUSTOMER VALIDATION ===

  // Customer Name
  if (!data.customer.name?.trim()) {
    if (settings.customer_name_required_for_print || settings.customer_name_required_for_invoice) {
      errors.push({
        field: 'customer.name',
        message: 'Customer name is required',
        category: 'customer'
      })
    }
  }

  // Customer Contact
  const hasPhone = data.customer.telephone?.trim()
  const hasMobile = data.customer.mobile?.trim()
  const hasEmail = data.customer.email?.trim()

  if (!hasPhone && !hasMobile && !hasEmail) {
    if (settings.customer_contact_required_for_print || settings.customer_contact_required_for_invoice) {
      errors.push({
        field: 'customer.contact',
        message: 'At least one contact method is required (telephone, mobile, or email)',
        category: 'customer'
      })
    }
  }

  // Customer Address
  const hasHouseNumber = data.customer.houseNumber?.trim()
  const hasRoad = data.customer.road?.trim()
  const hasTown = data.customer.town?.trim()
  const hasPostCode = data.customer.postCode?.trim()
  const hasCompleteAddress = hasHouseNumber && hasRoad && hasTown && hasPostCode

  if (!hasCompleteAddress) {
    if (settings.customer_address_required_for_print || settings.customer_address_required_for_invoice) {
      const missingAddressFields = []
      if (!hasHouseNumber) missingAddressFields.push('house number')
      if (!hasRoad) missingAddressFields.push('road')
      if (!hasTown) missingAddressFields.push('town')
      if (!hasPostCode) missingAddressFields.push('postcode')

      errors.push({
        field: 'customer.address',
        message: `Complete address required: missing ${missingAddressFields.join(', ')}`,
        category: 'customer'
      })
    }
  }

  // === JOB VALIDATION ===

  // Mileage
  const mileageValue = typeof data.mileage === 'string' ? data.mileage.trim() : data.mileage
  if (!mileageValue && mileageValue !== 0) {
    if (settings.mileage_required_for_print || settings.mileage_required_for_invoice) {
      errors.push({
        field: 'mileage',
        message: 'Mileage must be recorded (enter actual mileage or "Not Recorded")',
        category: 'mileage'
      })
    }
  } else if (typeof mileageValue === 'string' && mileageValue.toLowerCase() !== 'not recorded' && isNaN(Number(mileageValue))) {
    if (settings.mileage_required_for_print || settings.mileage_required_for_invoice) {
      errors.push({
        field: 'mileage',
        message: 'Mileage must be a number or "Not Recorded"',
        category: 'mileage'
      })
    }
  }

  // Technician
  if (!data.technician?.trim()) {
    if (settings.technician_required_for_print || settings.technician_required_for_invoice) {
      errors.push({
        field: 'technician',
        message: 'Technician assignment is required',
        category: 'job'
      })
    } else if (settings.show_warnings) {
      warnings.push({
        field: 'technician',
        message: 'No technician assigned - recommended for job tracking',
        category: 'job'
      })
    }
  }

  // Service Advisor
  if (!data.serviceAdvisor?.trim()) {
    if (settings.service_advisor_required_for_print || settings.service_advisor_required_for_invoice) {
      errors.push({
        field: 'serviceAdvisor',
        message: 'Service advisor assignment is required',
        category: 'job'
      })
    } else if (settings.show_warnings) {
      warnings.push({
        field: 'serviceAdvisor',
        message: 'No service advisor assigned - recommended for customer communication',
        category: 'job'
      })
    }
  }

  // Work Items
  if (!data.items || data.items.length === 0) {
    if (settings.items_required_for_print || settings.items_required_for_invoice) {
      errors.push({
        field: 'items',
        message: 'At least one work item is required',
        category: 'job'
      })
    } else if (settings.show_warnings) {
      warnings.push({
        field: 'items',
        message: 'No work items added - job sheet appears empty',
        category: 'job'
      })
    }
  }

  // === DETERMINE WHAT ACTIONS ARE ALLOWED ===

  // Check print requirements
  const printBlockingErrors = errors.filter(e => {
    switch (e.field) {
      case 'vehicle.registration': return settings.vehicle_registration_required_for_print
      case 'vehicle.make': return settings.vehicle_make_required_for_print
      case 'vehicle.model': return settings.vehicle_model_required_for_print
      case 'customer.name': return settings.customer_name_required_for_print
      case 'customer.contact': return settings.customer_contact_required_for_print
      case 'customer.address': return settings.customer_address_required_for_print
      case 'mileage': return settings.mileage_required_for_print
      case 'technician': return settings.technician_required_for_print
      case 'serviceAdvisor': return settings.service_advisor_required_for_print
      case 'items': return settings.items_required_for_print
      default: return true
    }
  })

  // Check invoice requirements
  const invoiceBlockingErrors = errors.filter(e => {
    switch (e.field) {
      case 'vehicle.registration': return settings.vehicle_registration_required_for_invoice
      case 'vehicle.make': return settings.vehicle_make_required_for_invoice
      case 'vehicle.model': return settings.vehicle_model_required_for_invoice
      case 'customer.name': return settings.customer_name_required_for_invoice
      case 'customer.contact': return settings.customer_contact_required_for_invoice
      case 'customer.address': return settings.customer_address_required_for_invoice
      case 'mileage': return settings.mileage_required_for_invoice
      case 'technician': return settings.technician_required_for_invoice
      case 'serviceAdvisor': return settings.service_advisor_required_for_invoice
      case 'items': return settings.items_required_for_invoice
      default: return true
    }
  })

  const canPrint = printBlockingErrors.length === 0 && (!settings.block_on_warnings || warnings.length === 0)
  const canInvoice = invoiceBlockingErrors.length === 0 && (!settings.block_on_warnings || warnings.length === 0)

  return {
    isValid: errors.length === 0 && (!settings.block_on_warnings || warnings.length === 0),
    errors,
    warnings,
    canPrint,
    canInvoice
  }
}

/**
 * Get user-friendly validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid) {
    return "✅ Job sheet is complete and ready for printing and invoicing"
  }

  const errorCount = result.errors.length
  const warningCount = result.warnings.length

  let summary = `❌ ${errorCount} error${errorCount !== 1 ? 's' : ''} must be fixed`
  
  if (warningCount > 0) {
    summary += `, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`
  }

  if (result.canPrint && !result.canInvoice) {
    summary += " (can print but cannot invoice)"
  } else if (!result.canPrint) {
    summary += " (cannot print or invoice)"
  }

  return summary
}

/**
 * Get validation errors grouped by category
 */
export function getErrorsByCategory(errors: ValidationError[]) {
  return {
    vehicle: errors.filter(e => e.category === 'vehicle'),
    customer: errors.filter(e => e.category === 'customer'),
    job: errors.filter(e => e.category === 'job'),
    mileage: errors.filter(e => e.category === 'mileage')
  }
}
