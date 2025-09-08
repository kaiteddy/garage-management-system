// SWS Session Manager - Handles HaynesPro API authentication and session management
import { sql } from '@/lib/database/neon-client'

interface SWSSession {
  sessionId: string
  expiresAt: Date
  isValid: boolean
}

interface SWSConfig {
  apiKey: string
  username: string
  password: string
  baseUrl: string
}

class SWSSessionManager {
  private config: SWSConfig
  private currentSession: SWSSession | null = null

  constructor() {
    this.config = {
      apiKey: process.env.SWS_API_KEY || '',
      username: process.env.SWS_USERNAME || '',
      password: process.env.SWS_PASSWORD || '',
      baseUrl: process.env.SWS_API_URL || 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php'
    }
  }

  // Get valid session, creating new one if needed
  async getValidSession(): Promise<string | null> {
    // Check if current session is still valid
    if (this.currentSession && this.currentSession.isValid && new Date() < this.currentSession.expiresAt) {
      return this.currentSession.sessionId
    }

    // Try to get cached session from database
    const cachedSession = await this.getCachedSession()
    if (cachedSession && new Date() < cachedSession.expiresAt) {
      this.currentSession = cachedSession
      return cachedSession.sessionId
    }

    // Create new session
    return await this.createNewSession()
  }

  // Create new SWS session - SWS doesn't actually require sessions, just API key
  private async createNewSession(): Promise<string | null> {
    try {
      console.log('🔐 [SWS-SESSION] SWS uses API key authentication, no session needed')

      // SWS doesn't require session management - just return a dummy session
      // The API key is validated on each request
      const sessionId = 'sws-api-key-auth'
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      this.currentSession = {
        sessionId,
        expiresAt,
        isValid: true
      }

      // Store in database cache
      await this.cacheSession(sessionId, expiresAt)

      console.log('✅ [SWS-SESSION] API key authentication ready')
      return sessionId

    } catch (error) {
      console.error('❌ [SWS-SESSION] Failed to setup API key auth:', error)
      return null
    }
  }

  // Try alternative login methods
  private async tryAlternativeLogin(): Promise<string | null> {
    try {
      // Method 2: GET request with auth header
      const authHeader = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
      
      const response = await fetch(`${this.config.baseUrl}?action=login&apikey=${this.config.apiKey}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'GarageManager/1.0'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('🔐 [SWS-SESSION] Alternative login response:', result)
        
        // Extract session from alternative response format
        if (Array.isArray(result) && result[0] && result[0].reply !== 'Error') {
          return result[0].sessionId || result[0].session || 'authenticated'
        }
      }

      return null
    } catch (error) {
      console.error('❌ [SWS-SESSION] Alternative login failed:', error)
      return null
    }
  }

  // Make authenticated API call using API key (no session needed)
  async makeAuthenticatedCall(action: string, vrm: string, additionalParams: Record<string, string> = {}): Promise<any> {
    const sessionId = await this.getValidSession()

    if (!sessionId) {
      throw new Error('Unable to setup SWS API key authentication')
    }

    const formData = new FormData()
    formData.append('apikey', this.config.apiKey)
    formData.append('action', action)
    formData.append('vrm', vrm.replace(/\s+/g, '').toUpperCase())

    // Add any additional parameters
    for (const [key, value] of Object.entries(additionalParams)) {
      formData.append(key, value)
    }

    console.log(`🔍 [SWS-SESSION] Making ${action} call for ${vrm}`)

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'GarageManager/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`SWS API call failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`✅ [SWS-SESSION] ${action} call completed for ${vrm}`)

    return result
  }

  // Cache session in database
  private async cacheSession(sessionId: string, expiresAt: Date): Promise<void> {
    try {
      await sql`
        INSERT INTO sws_sessions (session_id, expires_at, created_at)
        VALUES (${sessionId}, ${expiresAt.toISOString()}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          session_id = EXCLUDED.session_id,
          expires_at = EXCLUDED.expires_at,
          created_at = NOW()
      `
    } catch (error) {
      console.warn('⚠️ [SWS-SESSION] Failed to cache session:', error)
    }
  }

  // Get cached session from database
  private async getCachedSession(): Promise<SWSSession | null> {
    try {
      const result = await sql`
        SELECT session_id, expires_at 
        FROM sws_sessions 
        WHERE expires_at > NOW() 
        ORDER BY created_at DESC 
        LIMIT 1
      `
      
      if (result.length > 0) {
        return {
          sessionId: result[0].session_id,
          expiresAt: new Date(result[0].expires_at),
          isValid: true
        }
      }
    } catch (error) {
      console.warn('⚠️ [SWS-SESSION] Failed to get cached session:', error)
    }
    
    return null
  }

  // Clear cached session
  private async clearCachedSession(): Promise<void> {
    try {
      await sql`DELETE FROM sws_sessions WHERE expires_at < NOW()`
    } catch (error) {
      console.warn('⚠️ [SWS-SESSION] Failed to clear cached session:', error)
    }
  }

  // Extract engine and radio codes from SWS response
  extractCodes(data: any): { engineCode: string | null; radioCode: string | null } {
    let engineCode: string | null = null
    let radioCode: string | null = null

    const searchObject = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key
        const keyLower = key.toLowerCase()

        if (typeof value === 'string' && value.trim()) {
          // Engine code patterns
          if (!engineCode && (keyLower.includes('engine') && keyLower.includes('code'))) {
            if (/^[A-Z0-9-]{3,12}$/i.test(value)) {
              engineCode = value.toUpperCase()
            }
          }

          // Radio code patterns
          if (!radioCode && (keyLower.includes('radio') || keyLower.includes('security')) && keyLower.includes('code')) {
            if (/^[A-Z0-9-]{4,12}$/i.test(value)) {
              radioCode = value.toUpperCase()
            }
          }

          // Engine code in description fields
          if (!engineCode && keyLower.includes('engine') && !keyLower.includes('size')) {
            const match = value.match(/\b([A-Z0-9-]{3,12})\b/i)
            if (match) {
              engineCode = match[1].toUpperCase()
            }
          }
        } else if (typeof value === 'object') {
          searchObject(value, currentPath)
        }
      }
    }

    searchObject(data)
    return { engineCode, radioCode }
  }
}

// Export singleton instance
export const swsSessionManager = new SWSSessionManager()
