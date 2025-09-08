import { NextRequest, NextResponse } from 'next/server'
import { 
  selectOptimalVDGPackages, 
  VDG_PACKAGE_PRESETS, 
  compareAPICosts, 
  calculateMonthlyCosts,
  VDGRequirements 
} from '@/lib/vdg-package-optimizer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Parse requirements from query parameters
  const requirements: VDGRequirements = {
    needsImages: searchParams.get('images') === 'true',
    needsDetailedSpecs: searchParams.get('specs') === 'true',
    needsTyreData: searchParams.get('tyres') === 'true',
    needsMileageCheck: searchParams.get('mileage') === 'true',
    needsInsuranceData: searchParams.get('insurance') === 'true',
    needsPoliceCheck: searchParams.get('police') === 'true',
    budgetMode: searchParams.get('budget') === 'true',
    serviceCenter: searchParams.get('service') === 'true',
    vehicleSales: searchParams.get('sales') === 'true',
    highValueTransaction: searchParams.get('highvalue') === 'true'
  }
  
  const vehiclesPerMonth = parseInt(searchParams.get('vehicles') || '200')
  
  // Get optimal package selection
  const optimalSelection = selectOptimalVDGPackages(requirements)
  
  // Compare with presets
  const presetComparisons = Object.entries(VDG_PACKAGE_PRESETS).map(([name, preset]) => ({
    name,
    ...preset,
    monthlyCost: calculateMonthlyCosts(preset, vehiclesPerMonth)
  }))
  
  // API cost comparison
  const apiComparison = compareAPICosts(optimalSelection)
  
  // Monthly projections for different usage levels
  const monthlyProjections = [50, 200, 500, 1000].map(vehicles => 
    calculateMonthlyCosts(optimalSelection, vehicles)
  )
  
  const response = {
    timestamp: new Date().toISOString(),
    requirements,
    
    optimalSelection: {
      ...optimalSelection,
      monthlyCost: calculateMonthlyCosts(optimalSelection, vehiclesPerMonth)
    },
    
    presetComparisons,
    
    apiComparison,
    
    monthlyProjections,
    
    recommendations: {
      forBudget: VDG_PACKAGE_PRESETS.budget,
      forStandard: VDG_PACKAGE_PRESETS.standard,
      forServiceCenter: VDG_PACKAGE_PRESETS.serviceCenter,
      forVehicleSales: VDG_PACKAGE_PRESETS.vehicleSales,
      forComprehensive: VDG_PACKAGE_PRESETS.comprehensive
    },
    
    summary: {
      optimalCost: optimalSelection.totalCost,
      dataQuality: optimalSelection.dataQuality,
      savingsVsSWS: apiComparison.savings.vsSwsOnly,
      savingsPercentage: apiComparison.savings.savingsPercentage,
      packagesUsed: optimalSelection.packages.length,
      description: optimalSelection.description
    }
  }
  
  return NextResponse.json(response)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { useCase, vehiclesPerMonth = 200 } = body
    
    let requirements: VDGRequirements = {}
    
    // Map use cases to requirements
    switch (useCase) {
      case 'budget':
        requirements = { budgetMode: true }
        break
      case 'standard':
        requirements = { needsImages: true }
        break
      case 'service':
        requirements = { serviceCenter: true, needsImages: true, needsTyreData: true }
        break
      case 'sales':
        requirements = { vehicleSales: true, needsImages: true, needsDetailedSpecs: true }
        break
      case 'comprehensive':
        requirements = { 
          highValueTransaction: true, 
          needsImages: true, 
          needsDetailedSpecs: true,
          needsInsuranceData: true,
          needsPoliceCheck: true
        }
        break
      default:
        requirements = { needsImages: true } // Default to standard
    }
    
    const optimalSelection = selectOptimalVDGPackages(requirements)
    const apiComparison = compareAPICosts(optimalSelection)
    const monthlyCost = calculateMonthlyCosts(optimalSelection, vehiclesPerMonth)
    
    return NextResponse.json({
      useCase,
      optimalSelection,
      apiComparison,
      monthlyCost,
      recommendation: {
        packages: optimalSelection.packages,
        totalCost: optimalSelection.totalCost,
        description: optimalSelection.description,
        dataQuality: optimalSelection.dataQuality,
        monthlyCost: monthlyCost.monthlyCost,
        annualCost: monthlyCost.annualCost
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 })
  }
}
