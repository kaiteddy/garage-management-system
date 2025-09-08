// VDG Package Optimizer - Smart package selection based on requirements
export interface VDGRequirements {
  needsImages?: boolean
  needsDetailedSpecs?: boolean
  needsTyreData?: boolean
  needsMileageCheck?: boolean
  needsInsuranceData?: boolean
  needsPoliceCheck?: boolean
  budgetMode?: boolean
  serviceCenter?: boolean
  vehicleSales?: boolean
  highValueTransaction?: boolean
}

export interface VDGPackageSelection {
  packages: string[]
  totalCost: number
  description: string
  dataQuality: number
}

export function selectOptimalVDGPackages(requirements: VDGRequirements): VDGPackageSelection {
  const packages: string[] = []
  let totalCost = 0
  let description = ""
  let dataQuality = 0

  // Base vehicle data (always needed)
  packages.push('VehicleDetails')
  totalCost += 0.12
  dataQuality += 70

  // Add images unless budget mode
  if (!requirements.budgetMode) {
    packages.push('VehicleImageDetails')
    totalCost += 0.02
    dataQuality += 15
    description = "Complete vehicle data with images"
  } else {
    description = "Budget vehicle data only"
  }

  // Service center requirements
  if (requirements.serviceCenter || requirements.needsTyreData) {
    packages.push('TyreDetails')
    totalCost += 0.08
    dataQuality += 5
    description = "Service center package with tyre data"
  }

  // Detailed specifications for sales/valuations
  if (requirements.vehicleSales || requirements.needsDetailedSpecs) {
    packages.push('SpecAndOptionsDetails')
    totalCost += 0.18
    dataQuality += 10
    description = "Premium package with detailed specifications"
  }

  // Mileage verification
  if (requirements.needsMileageCheck) {
    packages.push('MileageCheckDetails')
    totalCost += 0.02
    dataQuality += 2
  }

  // Insurance data
  if (requirements.needsInsuranceData || requirements.highValueTransaction) {
    packages.push('MiaftrDetails')
    totalCost += 0.80
    dataQuality += 5
    description = "Enhanced package with insurance history"
  }

  // Police checks for high-value transactions
  if (requirements.needsPoliceCheck || requirements.highValueTransaction) {
    packages.push('PncDetails')
    totalCost += 0.80
    dataQuality += 3
    description = "Comprehensive package with police checks"
  }

  // Tax details (very cheap, add for completeness)
  if (!requirements.budgetMode) {
    packages.push('VehicleTaxDetails')
    totalCost += 0.01
    dataQuality += 1
  }

  return {
    packages,
    totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    description,
    dataQuality: Math.min(dataQuality, 100) // Cap at 100%
  }
}

// Predefined package combinations for common use cases
export const VDG_PACKAGE_PRESETS = {
  budget: {
    packages: ['VehicleDetails'],
    totalCost: 0.12,
    description: "Budget option - basic vehicle data only",
    dataQuality: 70
  },
  
  standard: {
    packages: ['VehicleDetails', 'VehicleImageDetails', 'VehicleTaxDetails'],
    totalCost: 0.15,
    description: "Standard option - complete vehicle data with images",
    dataQuality: 85
  },
  
  serviceCenter: {
    packages: ['VehicleDetails', 'VehicleImageDetails', 'TyreDetails', 'VehicleTaxDetails'],
    totalCost: 0.23,
    description: "Service center package with tyre specifications",
    dataQuality: 90
  },
  
  vehicleSales: {
    packages: ['VehicleDetails', 'VehicleImageDetails', 'SpecAndOptionsDetails', 'VehicleTaxDetails'],
    totalCost: 0.33,
    description: "Vehicle sales package with detailed specifications",
    dataQuality: 95
  },
  
  comprehensive: {
    packages: ['VehicleDetails', 'VehicleImageDetails', 'SpecAndOptionsDetails', 'MiaftrDetails', 'PncDetails', 'VehicleTaxDetails'],
    totalCost: 1.95,
    description: "Comprehensive package with insurance and police checks",
    dataQuality: 99
  },
  
  mileageCheck: {
    packages: ['VehicleDetails', 'MileageCheckDetails'],
    totalCost: 0.14,
    description: "Mileage verification package",
    dataQuality: 75
  }
}

// Cost comparison with other APIs
export function compareAPICosts(vdgPackage: VDGPackageSelection) {
  return {
    vdg: {
      cost: vdgPackage.totalCost,
      dataQuality: vdgPackage.dataQuality,
      description: vdgPackage.description
    },
    sws: {
      cost: 0.48,
      dataQuality: 80,
      description: "SWS TechData - service specifications only"
    },
    dvla: {
      cost: 0.00,
      dataQuality: 75,
      description: "DVLA OpenData - basic registration data"
    },
    motApi: {
      cost: 0.00,
      dataQuality: 85,
      description: "MOT History API - test results only"
    },
    savings: {
      vsSwsOnly: Math.round((0.48 - vdgPackage.totalCost) * 100) / 100,
      savingsPercentage: Math.round(((0.48 - vdgPackage.totalCost) / 0.48) * 100)
    }
  }
}

// Monthly cost projections
export function calculateMonthlyCosts(packageSelection: VDGPackageSelection, vehiclesPerMonth: number) {
  const monthlyCost = packageSelection.totalCost * vehiclesPerMonth
  
  return {
    vehiclesPerMonth,
    costPerVehicle: packageSelection.totalCost,
    monthlyCost: Math.round(monthlyCost * 100) / 100,
    annualCost: Math.round(monthlyCost * 12 * 100) / 100,
    description: packageSelection.description,
    dataQuality: packageSelection.dataQuality
  }
}
