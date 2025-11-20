import crypto from 'crypto'

export class TwilioWebhookValidator {
  private static authToken = process.env.TWILIO_AUTH_TOKEN

  /**
   * Validate Twilio webhook signature
   * @param signature - X-Twilio-Signature header
   * @param url - Full webhook URL
   * @param params - POST parameters
   * @returns boolean - true if valid
   */
  static validateSignature(signature: string, url: string, params: Record<string, any>): boolean {
    if (!this.authToken) {
      console.warn('[TWILIO-WEBHOOK] Auth token not configured, skipping validation')
      return true // Allow in development
    }

    try {
      // Create the signature
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key]
        }, url)

      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(data, 'utf8')
        .digest('base64')

      const computedSignature = `sha1=${expectedSignature}`
      
      console.log('[TWILIO-WEBHOOK] Signature validation:', {
        received: signature,
        computed: computedSignature,
        valid: signature === computedSignature
      })

      return signature === computedSignature
    } catch (error) {
      console.error('[TWILIO-WEBHOOK] Signature validation error:', error)
      return false
    }
  }

  /**
   * Validate webhook request
   * @param request - Next.js request object
   * @returns Promise<{valid: boolean, params: Record<string, any>}>
   */
  static async validateWebhookRequest(request: Request): Promise<{valid: boolean, params: Record<string, any>}> {
    try {
      const signature = request.headers.get('X-Twilio-Signature') || ''
      const url = request.url
      
      // Get form data
      const formData = await request.formData()
      const params: Record<string, any> = {}
      
      for (const [key, value] of formData.entries()) {
        params[key] = value.toString()
      }

      const valid = this.validateSignature(signature, url, params)
      
      return { valid, params }
    } catch (error) {
      console.error('[TWILIO-WEBHOOK] Request validation error:', error)
      return { valid: false, params: {} }
    }
  }

  /**
   * Create TwiML response
   * @param twiml - TwiML content
   * @returns Response object
   */
  static createTwiMLResponse(twiml: string): Response {
    return new Response(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache'
      }
    })
  }

  /**
   * Create JSON response for webhooks
   * @param data - Response data
   * @param status - HTTP status code
   * @returns Response object
   */
  static createJSONResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
  }
}
