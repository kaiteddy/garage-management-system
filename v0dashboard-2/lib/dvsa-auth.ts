// Token cache to avoid repeated requests
let tokenCache: { token: string; expiresAt: number } | null = null

export function getDVLAApiKey(): string {
  const apiKey = process.env.DVLA_API_KEY
  if (!apiKey) {
    throw new Error("DVLA_API_KEY environment variable is not set")
  }
  console.log("[DVLA-AUTH] DVLA API key is configured")
  return apiKey
}

export function getDVSACredentials(): { clientId: string; clientSecret: string; tenantId: string } {
  const clientId = process.env.DVSA_CLIENT_ID
  const clientSecret = process.env.DVSA_CLIENT_SECRET
  const tenantId = process.env.DVSA_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      "DVSA credentials are not properly configured. Missing DVSA_CLIENT_ID, DVSA_CLIENT_SECRET, or DVSA_TENANT_ID",
    )
  }

  console.log("[DVSA-AUTH] DVSA credentials are configured")
  return { clientId, clientSecret, tenantId }
}

export async function getDVSAAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    console.log("[DVSA-AUTH] Using cached access token")
    return tokenCache.token
  }

  console.log("[DVSA-AUTH] Fetching new access token...")

  const { clientId, clientSecret, tenantId } = getDVSACredentials()

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  console.log("[DVSA-AUTH] Requesting token from:", tokenUrl)

  const scope = process.env.DVSA_SCOPE || 'https://tapi.dvsa.gov.uk/.default';
  console.log('[DVSA-AUTH] Using scope:', scope);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
  })

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorResponse = await response.json();
        errorDetails = ` - ${JSON.stringify(errorResponse)}`;
      } catch (e) {
        const errorText = await response.text();
        errorDetails = ` - ${errorText}`;
      }

      const errorMessage = `DVSA token request failed: ${response.status} ${response.statusText}${errorDetails}`;
      console.error('[DVSA-AUTH]', errorMessage);
      console.log('[DVSA-AUTH] Request URL:', tokenUrl);
      console.log('[DVSA-AUTH] Request body:', {
        grant_type: 'client_credentials',
        client_id: clientId ? `${clientId.substring(0, 4)}...` : 'not set',
        client_secret: clientSecret ? '***' + clientSecret.slice(-4) : 'not set',
        scope: scope
      });

      throw new Error(errorMessage);
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error("No access token received from DVSA")
    }

    // Cache the token (expires in 1 hour by default, we'll cache for 50 minutes to be safe)
    const expiresIn = data.expires_in || 3600
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 600) * 1000, // 10 minutes buffer
    }

    console.log("[DVSA-AUTH] Access token obtained successfully")
    return data.access_token
  } catch (error) {
    console.log("[DVSA-AUTH] Error fetching access token:", error)
    throw error
  }
}

/**
 * Check if DVSA credentials are properly configured
 */
export function hasDVSACredentials(): boolean {
  try {
    getDVSACredentials()
    return true
  } catch {
    return false
  }
}

/**
 * DVSA configuration object
 */
export const DVSA_CONFIG = {
  baseUrl: process.env.DVSA_API_BASE_URL || 'https://tapi.dvsa.gov.uk',
  scope: process.env.DVSA_SCOPE || 'https://tapi.dvsa.gov.uk/.default',
  apiVersion: 'v1',
  endpoints: {
    motHistory: '/mot-history',
    vehicleDetails: '/vehicle-details'
  }
}
