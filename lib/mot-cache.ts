interface CachedMOTData {
  registration: string
  data: any
  timestamp: number
  status: "valid" | "due_soon" | "expired" | "unknown" | "error"
  nextDue?: string
  lastChecked: number
  error?: string
  daysUntilExpiry?: number
  reminderSent?: boolean
  archived?: boolean
}

// In-memory cache for MOT data
const motCache = new Map<string, CachedMOTData>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

export function getCachedMOTData(registration: string): CachedMOTData | null {
  const cleanReg = registration.toUpperCase().replace(/\s/g, "")
  const cached = motCache.get(cleanReg)

  if (!cached) return null

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    motCache.delete(cleanReg)
    return null
  }

  return cached
}

export function setCachedMOTData(registration: string, data: any): void {
  const cleanReg = registration.toUpperCase().replace(/\s/g, "")

  let status: CachedMOTData["status"] = "unknown"
  let nextDue: string | undefined
  let daysUntilExpiry: number | undefined

  if (data && data.motTests && data.motTests.length > 0) {
    const latestTest = data.motTests[0]
    if (latestTest.expiryDate) {
      nextDue = latestTest.expiryDate
      const expiryDate = new Date(latestTest.expiryDate)
      const today = new Date()
      daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        status = "expired"
      } else if (daysUntilExpiry <= 30) {
        status = "due_soon"
      } else {
        status = "valid"
      }
    }
  }

  motCache.set(cleanReg, {
    registration: cleanReg,
    data,
    timestamp: Date.now(),
    status,
    nextDue,
    lastChecked: Date.now(),
    daysUntilExpiry,
    reminderSent: false,
    archived: false,
  })
}

export function clearMOTCache(registration?: string): void {
  if (registration) {
    const cleanReg = registration.toUpperCase().replace(/\s/g, "")
    motCache.delete(cleanReg)
  } else {
    motCache.clear()
  }
}

export async function getAllCachedMOTData(): Promise<CachedMOTData[]> {
  return Array.from(motCache.values())
}

export async function clearExpiredCache(): Promise<number> {
  const now = Date.now()
  let cleared = 0

  for (const [key, value] of motCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      motCache.delete(key)
      cleared++
    }
  }

  return cleared
}
