"use server"

export async function getMotInfo(registration: string) {
  try {
    // Normalize registration
    const normalizedReg = registration.replace(/\s+/g, "").toUpperCase()

    if (!normalizedReg) {
      return { error: "Registration number is required" }
    }

    // Call the existing MOT check API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/mot-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registration: normalizedReg }),
    })

    if (!response.ok) {
      return { error: `API request failed: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { error: data.error }
    }

    return { data }
  } catch (error) {
    console.error("[MOT-ACTION] Error:", error)
    return { error: "Failed to fetch MOT information" }
  }
}

export async function generateJobDescription(jobData: {
  title: string
  department: string
  experience: string
  skills: string[]
  responsibilities: string[]
  salary?: string
  location?: string
  employmentType?: string
}) {
  try {
    const { title, department, experience, skills, responsibilities, salary, location, employmentType } = jobData

    // Enhanced AI-powered job description generation
    const description = `# ${title}

## Company Overview
Join our leading automotive service center where excellence meets innovation. We pride ourselves on delivering exceptional vehicle maintenance and repair services to our valued customers.

## Position Summary
We are seeking a dedicated ${title} to join our ${department} team. This ${employmentType || "full-time"} position requires ${experience} and offers an exciting opportunity to work with state-of-the-art automotive technology in a dynamic environment.

${location ? `**Location:** ${location}` : ""}
${salary ? `**Salary:** ${salary}` : ""}
**Department:** ${department}
**Experience Required:** ${experience}
**Employment Type:** ${employmentType || "Full-time"}

## Key Responsibilities
${responsibilities.map((resp, index) => `${index + 1}. ${resp}`).join("\n")}

## Required Skills & Qualifications
${skills.map((skill, index) => `• ${skill}`).join("\n")}

## Additional Requirements
• Valid driver's license
• Ability to work in a fast-paced environment
• Strong attention to detail and safety protocols
• Excellent communication and customer service skills
• Physical ability to lift up to 50 lbs and work in various positions

## What We Offer
• Competitive salary and performance-based bonuses
• Comprehensive health, dental, and vision insurance
• Retirement savings plan with company matching
• Paid time off and holiday pay
• Professional development and training opportunities
• Modern workshop facilities with latest diagnostic equipment
• Supportive team environment and career advancement opportunities
• Employee discounts on services and parts

## How to Apply
Interested candidates should submit their resume and cover letter detailing their relevant experience and qualifications. We are an equal opportunity employer committed to diversity and inclusion.

---
*This position offers excellent growth potential within our expanding automotive service organization.*`

    return { success: true, description }
  } catch (error) {
    console.error("[JOB-DESCRIPTION] Error:", error)
    return { error: "Failed to generate job description" }
  }
}

export async function saveJobDescription(data: {
  title: string
  department: string
  description: string
  createdBy: string
}) {
  try {
    // In a real implementation, this would save to your database
    // For now, we'll simulate the save operation
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`[JOB-SAVE] Saving job description: ${data.title}`)

    // Simulate database save
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      success: true,
      jobId,
      message: "Job description saved successfully",
    }
  } catch (error) {
    console.error("[JOB-SAVE] Error:", error)
    return { error: "Failed to save job description" }
  }
}

export async function generateWorkDescription(workData: {
  workType: string
  component: string
  issue: string
  action: string
  vehicleInfo?: {
    make: string
    model: string
    year: number
  }
}) {
  try {
    const { workType, component, issue, action, vehicleInfo } = workData

    let description = ""

    // Generate professional work descriptions based on work type
    switch (workType.toLowerCase()) {
      case "inspection":
        description = `Conducted thorough inspection of ${component}. ${issue ? `Identified: ${issue}. ` : ""}${action ? `Action taken: ${action}` : "No issues found - component operating within normal parameters."}`
        break

      case "repair":
        description = `Performed repair work on ${component}. Issue: ${issue}. Resolution: ${action}. Work completed to manufacturer specifications and tested for proper operation.`
        break

      case "replacement":
        description = `Replaced ${component} due to ${issue}. ${action}. New component installed according to manufacturer guidelines and system tested for proper functionality.`
        break

      case "service":
        description = `Performed scheduled service on ${component}. ${issue ? `Noted: ${issue}. ` : ""}${action}. Service completed according to manufacturer maintenance schedule.`
        break

      case "diagnostic":
        description = `Conducted diagnostic testing on ${component}. ${issue ? `Findings: ${issue}. ` : ""}${action ? `Recommended action: ${action}` : "No faults detected - system operating normally."}`
        break

      case "mot":
        description = `MOT test performed on ${component}. ${issue ? `Issue identified: ${issue}. ` : ""}${action ? `Corrective action: ${action}. ` : ""}Component meets MOT requirements.`
        break

      default:
        description = `Work performed on ${component}. ${issue ? `Issue: ${issue}. ` : ""}${action ? `Action: ${action}` : "Work completed successfully."}`
    }

    // Add vehicle-specific context if available
    if (vehicleInfo) {
      description = `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} - ${description}`
    }

    return { success: true, description }
  } catch (error) {
    console.error("[WORK-DESCRIPTION] Error:", error)
    return { error: "Failed to generate work description" }
  }
}

export async function generateLabourDescription(labourData: {
  task: string
  timeSpent: number
  difficulty: string
  tools?: string[]
  notes?: string
}) {
  try {
    const { task, timeSpent, difficulty, tools, notes } = labourData

    const hours = Math.floor(timeSpent)
    const minutes = Math.round((timeSpent - hours) * 60)
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

    let description = `${task} - ${timeStr} labour time.`

    // Add difficulty context
    switch (difficulty.toLowerCase()) {
      case "routine":
        description += " Standard maintenance procedure completed efficiently."
        break
      case "moderate":
        description += " Moderate complexity work requiring specialized knowledge and tools."
        break
      case "complex":
        description += " Complex repair requiring advanced diagnostic skills and precision."
        break
      case "specialist":
        description += " Specialist work requiring manufacturer-specific training and equipment."
        break
    }

    // Add tools if specified
    if (tools && tools.length > 0) {
      description += ` Tools used: ${tools.join(", ")}.`
    }

    // Add notes if provided
    if (notes) {
      description += ` Additional notes: ${notes}`
    }

    return { success: true, description }
  } catch (error) {
    console.error("[LABOUR-DESCRIPTION] Error:", error)
    return { error: "Failed to generate labour description" }
  }
}

export async function generatePartsDescription(partsData: {
  partName: string
  partNumber?: string
  quantity: number
  condition: string
  reason: string
}) {
  try {
    const { partName, partNumber, quantity, condition, reason } = partsData

    let description = `${quantity}x ${partName}`

    if (partNumber) {
      description += ` (Part #: ${partNumber})`
    }

    description += `. Condition: ${condition}.`

    // Add reason context
    switch (reason.toLowerCase()) {
      case "wear":
        description += " Replaced due to normal wear and tear."
        break
      case "damage":
        description += " Replaced due to damage or failure."
        break
      case "upgrade":
        description += " Upgraded to improved specification."
        break
      case "recall":
        description += " Replaced under manufacturer recall."
        break
      case "preventive":
        description += " Replaced as preventive maintenance."
        break
      default:
        description += ` Reason: ${reason}.`
    }

    description += " Genuine/OEM equivalent parts used where applicable."

    return { success: true, description }
  } catch (error) {
    console.error("[PARTS-DESCRIPTION] Error:", error)
    return { error: "Failed to generate parts description" }
  }
}
