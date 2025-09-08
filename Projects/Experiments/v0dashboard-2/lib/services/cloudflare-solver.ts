// Cloudflare Challenge Solver
// Based on Fiddler analysis of PartSouq's Cloudflare protection

export interface CloudflareChallenge {
  cvId: string;
  cZone: string;
  cType: string;
  cRay: string;
  cH: string;
  cUPMDTk: string;
  md: string;
  mdrd: string;
}

export interface ChallengeSolution {
  success: boolean;
  cookies?: string[];
  headers?: Record<string, string>;
  error?: string;
}

export class CloudflareSolver {
  private userAgent: string;
  private baseUrl: string;

  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15';
    this.baseUrl = 'https://partsouq.com';
  }

  // Parse Cloudflare challenge from HTML
  parseChallenge(html: string): CloudflareChallenge | null {
    try {
      console.log('🔍 [CF-SOLVER] Parsing Cloudflare challenge...');

      // Extract challenge options from JavaScript
      const challengeMatch = html.match(/window\._cf_chl_opt\s*=\s*({[^}]+})/);
      if (!challengeMatch) {
        console.log('❌ [CF-SOLVER] No challenge options found');
        return null;
      }

      // Parse the challenge object (simplified - in reality this is more complex)
      const challengeStr = challengeMatch[1];
      
      // Extract individual components using regex
      const cvId = this.extractValue(challengeStr, 'cvId');
      const cZone = this.extractValue(challengeStr, 'cZone');
      const cType = this.extractValue(challengeStr, 'cType');
      const cRay = this.extractValue(challengeStr, 'cRay');
      const cH = this.extractValue(challengeStr, 'cH');
      const cUPMDTk = this.extractValue(challengeStr, 'cUPMDTk');
      const md = this.extractValue(challengeStr, 'md');
      const mdrd = this.extractValue(challengeStr, 'mdrd');

      if (!cRay || !cH) {
        console.log('❌ [CF-SOLVER] Missing required challenge parameters');
        return null;
      }

      const challenge: CloudflareChallenge = {
        cvId: cvId || '3',
        cZone: cZone || 'partsouq.com',
        cType: cType || 'managed',
        cRay,
        cH,
        cUPMDTk: cUPMDTk || '',
        md: md || '',
        mdrd: mdrd || ''
      };

      console.log('✅ [CF-SOLVER] Challenge parsed successfully');
      console.log(`🔑 [CF-SOLVER] Ray ID: ${cRay}`);
      
      return challenge;

    } catch (error) {
      console.error('❌ [CF-SOLVER] Challenge parsing failed:', error);
      return null;
    }
  }

  // Extract value from challenge string
  private extractValue(str: string, key: string): string {
    const regex = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`);
    const match = str.match(regex);
    return match ? match[1] : '';
  }

  // Solve the Cloudflare challenge
  async solveChallenge(challenge: CloudflareChallenge, originalUrl: string): Promise<ChallengeSolution> {
    try {
      console.log('🧮 [CF-SOLVER] Solving Cloudflare challenge...');

      // Step 1: Wait for the required delay (Cloudflare expects 4-5 seconds)
      const delay = 4000 + Math.random() * 1000; // 4-5 seconds
      console.log(`⏱️ [CF-SOLVER] Waiting ${Math.round(delay)}ms (human simulation)...`);
      await this.delay(delay);

      // Step 2: Prepare challenge solution payload
      const challengePayload = this.buildChallengePayload(challenge);

      // Step 3: Submit challenge solution
      const solutionUrl = `${this.baseUrl}/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1?ray=${challenge.cRay}`;
      
      console.log(`📡 [CF-SOLVER] Submitting solution to: ${solutionUrl}`);

      const response = await fetch(solutionUrl, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': this.baseUrl,
          'Referer': originalUrl,
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Upgrade-Insecure-Requests': '1'
        },
        body: challengePayload
      });

      console.log(`📡 [CF-SOLVER] Challenge response: ${response.status}`);

      if (response.status === 302 || response.status === 200) {
        // Extract cookies from successful response
        const cookies = this.extractCookies(response);
        
        console.log('✅ [CF-SOLVER] Challenge solved successfully!');
        console.log(`🍪 [CF-SOLVER] Received ${cookies.length} cookies`);

        return {
          success: true,
          cookies,
          headers: {
            'User-Agent': this.userAgent,
            'Cookie': cookies.join('; ')
          }
        };
      } else {
        const errorText = await response.text();
        console.log('❌ [CF-SOLVER] Challenge solution failed');
        return {
          success: false,
          error: `Challenge failed: ${response.status} - ${errorText.substring(0, 200)}`
        };
      }

    } catch (error) {
      console.error('❌ [CF-SOLVER] Challenge solving failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Build challenge solution payload
  private buildChallengePayload(challenge: CloudflareChallenge): string {
    // This is a simplified version - real implementation would need
    // to solve the actual JavaScript challenge from Fiddler analysis
    
    const params = new URLSearchParams();
    
    // Basic challenge response (would need actual math solution from Fiddler)
    params.append('md', challenge.md);
    params.append('mdrd', challenge.mdrd);
    params.append('r', challenge.cRay);
    params.append('cvId', challenge.cvId);
    params.append('cType', challenge.cType);
    params.append('cH', challenge.cH);
    
    // Browser fingerprint data (from Fiddler analysis)
    params.append('jschl_vc', challenge.cvId);
    params.append('jschl_answer', this.calculateChallengeAnswer(challenge));
    
    return params.toString();
  }

  // Calculate challenge answer based on Fiddler analysis
  private calculateChallengeAnswer(challenge: CloudflareChallenge): string {
    // Based on successful Fiddler captures, we found working token patterns:
    // Pattern: [43-char-base64]-[timestamp]-[version]-[43-char-hash]

    const timestamp = Math.floor(Date.now() / 1000);
    const version = "1.0.1.1";

    // Generate a token similar to successful patterns from Fiddler:
    // up5xOb9TrmfFaCBi9pm4rwbLf87h6fmKLjPdCk_VVFs-1754368307-1.0.1.1-bgGbnz1ldtc9OS0OYvnuwNIr6pW_67eS33mjpeQ1hoE
    // swJKAnYn_5snTcmrghwVIi3LbiQKAlQA98sjMYC7lAI-1754384492-1.0.1.1-n3HK.YLwWa3dKs4LASAVujsKlBiEqiovjYKWfNG6QYU

    const baseToken = this.generateBaseToken(challenge.cRay, challenge.cH);
    const hashSuffix = this.generateHashSuffix(challenge.cRay, timestamp.toString());

    const fullToken = `${baseToken}-${timestamp}-${version}-${hashSuffix}`;

    console.log(`🔑 [CF-SOLVER] Generated token: ${fullToken.substring(0, 50)}...`);

    return fullToken;
  }

  // Generate base token part (43 characters, base64-like)
  private generateBaseToken(rayId: string, challengeHash: string): string {
    // Use a more sophisticated approach based on the successful patterns
    const seed = rayId + challengeHash + Math.floor(Date.now() / 1000).toString();

    // Base64-like characters (matching successful tokens)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';

    // Generate exactly 43 characters
    for (let i = 0; i < 43; i++) {
      const hash = this.simpleHash(seed + i.toString());
      const index = Math.abs(hash) % chars.length;
      result += chars[index];
    }

    return result;
  }

  // Generate hash suffix (43 characters, base64-like)
  private generateHashSuffix(rayId: string, timestamp: string): string {
    // Use a different seed for the suffix to ensure uniqueness
    const seed = timestamp + rayId + 'cf_suffix_' + Math.random().toString(36);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';

    // Generate exactly 43 characters
    for (let i = 0; i < 43; i++) {
      const hash = this.simpleHash(seed + (i * 13).toString());
      const index = Math.abs(hash) % chars.length;
      result += chars[index];
    }

    return result;
  }

  // Simple hash function (placeholder)
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Extract cookies from response
  private extractCookies(response: Response): string[] {
    const cookies: string[] = [];
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    
    if (setCookieHeaders.length === 0) {
      const singleCookie = response.headers.get('set-cookie');
      if (singleCookie) {
        cookies.push(singleCookie.split(';')[0]);
      }
    } else {
      setCookieHeaders.forEach(cookie => {
        cookies.push(cookie.split(';')[0]);
      });
    }
    
    return cookies;
  }

  // Delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test if a response contains Cloudflare challenge
  static isCloudflareChallenge(html: string): boolean {
    return html.includes('Just a moment...') || 
           html.includes('Checking your browser') ||
           html.includes('challenge-platform') ||
           html.includes('_cf_chl_opt');
  }

  // Extract challenge token from URL or HTML
  static extractChallengeToken(html: string): string | null {
    const tokenMatch = html.match(/__cf_chl_tk=([^&"']+)/);
    return tokenMatch ? tokenMatch[1] : null;
  }
}

// Export singleton instance
export const cloudflareSolver = new CloudflareSolver();
