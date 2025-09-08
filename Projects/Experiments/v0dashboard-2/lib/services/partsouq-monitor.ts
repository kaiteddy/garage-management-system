// PartSouq Success Rate Monitoring and Adaptive Rate Limiting
import { sql } from '@/lib/database/neon-client';

export interface MethodStats {
  method: string;
  totalRequests: number;
  successfulRequests: number;
  successRate: number;
  avgResponseTime: number;
  lastUsed: Date;
  isBlocked: boolean;
  blockUntil?: Date;
}

export interface AdaptiveConfig {
  baseDelay: number;
  maxDelay: number;
  successThreshold: number;
  failureThreshold: number;
  blockDuration: number; // minutes
}

class PartSouqMonitor {
  private config: AdaptiveConfig;
  private methodStats: Map<string, MethodStats> = new Map();

  constructor() {
    this.config = {
      baseDelay: 2000,      // 2 seconds base delay
      maxDelay: 30000,      // 30 seconds max delay
      successThreshold: 0.8, // 80% success rate to reduce delay
      failureThreshold: 0.3, // 30% success rate to increase delay
      blockDuration: 15     // Block method for 15 minutes after repeated failures
    };
  }

  // Record a request attempt
  async recordAttempt(method: string, success: boolean, responseTime: number, error?: string): Promise<void> {
    try {
      // Update in-memory stats
      this.updateMethodStats(method, success, responseTime);

      // Log to database
      await sql.query(`
        INSERT INTO partsouq_api_usage (
          request_type, search_query, results_count, response_time_ms, 
          success, error_message, method_used, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [
        'vin_search',
        method,
        success ? 1 : 0,
        responseTime,
        success,
        error || null,
        method
      ]);

      console.log(`📊 [MONITOR] Recorded ${method}: ${success ? 'SUCCESS' : 'FAILURE'} (${responseTime}ms)`);

    } catch (error) {
      console.error('❌ [MONITOR] Failed to record attempt:', error);
    }
  }

  // Update method statistics
  private updateMethodStats(method: string, success: boolean, responseTime: number): void {
    const stats = this.methodStats.get(method) || {
      method,
      totalRequests: 0,
      successfulRequests: 0,
      successRate: 0,
      avgResponseTime: 0,
      lastUsed: new Date(),
      isBlocked: false
    };

    stats.totalRequests++;
    if (success) stats.successfulRequests++;
    stats.successRate = stats.successfulRequests / stats.totalRequests;
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
    stats.lastUsed = new Date();

    // Check if method should be blocked
    if (stats.totalRequests >= 5 && stats.successRate < this.config.failureThreshold) {
      stats.isBlocked = true;
      stats.blockUntil = new Date(Date.now() + this.config.blockDuration * 60 * 1000);
      console.log(`🚫 [MONITOR] Blocking ${method} until ${stats.blockUntil.toISOString()}`);
    }

    this.methodStats.set(method, stats);
  }

  // Get adaptive delay for a method
  getAdaptiveDelay(method: string): number {
    const stats = this.methodStats.get(method);
    
    if (!stats) {
      return this.config.baseDelay;
    }

    // If method is blocked, return max delay
    if (this.isMethodBlocked(method)) {
      return this.config.maxDelay;
    }

    // Adjust delay based on success rate
    if (stats.successRate >= this.config.successThreshold) {
      // High success rate - reduce delay
      return Math.max(this.config.baseDelay * 0.5, 1000);
    } else if (stats.successRate <= this.config.failureThreshold) {
      // Low success rate - increase delay
      return Math.min(this.config.baseDelay * 3, this.config.maxDelay);
    }

    return this.config.baseDelay;
  }

  // Check if method is currently blocked
  isMethodBlocked(method: string): boolean {
    const stats = this.methodStats.get(method);
    
    if (!stats || !stats.isBlocked) {
      return false;
    }

    // Check if block period has expired
    if (stats.blockUntil && new Date() > stats.blockUntil) {
      stats.isBlocked = false;
      stats.blockUntil = undefined;
      this.methodStats.set(method, stats);
      console.log(`✅ [MONITOR] Unblocked ${method}`);
      return false;
    }

    return true;
  }

  // Get best available method
  getBestMethod(): string {
    const availableMethods = ['browser', 'scrapingbee', 'manual'];
    let bestMethod = 'browser';
    let bestScore = -1;

    for (const method of availableMethods) {
      if (this.isMethodBlocked(method)) {
        continue;
      }

      const stats = this.methodStats.get(method);
      if (!stats) {
        // Prefer untested methods
        return method;
      }

      // Score based on success rate and response time
      const score = stats.successRate * 100 - (stats.avgResponseTime / 1000);
      
      if (score > bestScore) {
        bestScore = score;
        bestMethod = method;
      }
    }

    return bestMethod;
  }

  // Get comprehensive statistics
  async getStatistics(days: number = 7): Promise<any> {
    try {
      const dbStats = await sql.query(`
        SELECT 
          method_used,
          COUNT(*) as total_requests,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
          AVG(response_time_ms) as avg_response_time,
          MAX(created_at) as last_used
        FROM partsouq_api_usage 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND method_used IS NOT NULL
        GROUP BY method_used
        ORDER BY successful_requests DESC
      `);

      const methodStats = (dbStats.rows || []).map(row => ({
        method: row.method_used,
        totalRequests: parseInt(row.total_requests),
        successfulRequests: parseInt(row.successful_requests),
        successRate: parseFloat((row.successful_requests / row.total_requests).toFixed(3)),
        avgResponseTime: parseFloat(row.avg_response_time || '0'),
        lastUsed: row.last_used
      }));

      // Get overall stats
      const overallStats = await sql.query(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
          AVG(response_time_ms) as avg_response_time,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM partsouq_api_usage 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      `);

      const overall = overallStats.rows?.[0] || {};

      return {
        period: `${days} days`,
        overall: {
          totalRequests: parseInt(overall.total_requests || '0'),
          successfulRequests: parseInt(overall.successful_requests || '0'),
          successRate: overall.total_requests > 0 ? 
            parseFloat((overall.successful_requests / overall.total_requests).toFixed(3)) : 0,
          avgResponseTime: parseFloat(overall.avg_response_time || '0'),
          activeDays: parseInt(overall.active_days || '0')
        },
        methods: methodStats,
        currentConfig: this.config,
        blockedMethods: Array.from(this.methodStats.entries())
          .filter(([_, stats]) => stats.isBlocked)
          .map(([method, stats]) => ({
            method,
            blockUntil: stats.blockUntil
          }))
      };

    } catch (error) {
      console.error('❌ [MONITOR] Failed to get statistics:', error);
      return { error: 'Failed to retrieve statistics' };
    }
  }

  // Reset method statistics
  resetMethodStats(method?: string): void {
    if (method) {
      this.methodStats.delete(method);
      console.log(`🔄 [MONITOR] Reset stats for ${method}`);
    } else {
      this.methodStats.clear();
      console.log('🔄 [MONITOR] Reset all method stats');
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [MONITOR] Updated configuration:', this.config);
  }
}

// Singleton instance
export const partSouqMonitor = new PartSouqMonitor();

// Helper function to wait with adaptive delay
export async function adaptiveWait(method: string): Promise<void> {
  const delay = partSouqMonitor.getAdaptiveDelay(method);
  console.log(`⏱️ [ADAPTIVE] Waiting ${delay}ms for ${method}`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to execute with monitoring
export async function executeWithMonitoring<T>(
  method: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    // Check if method is blocked
    if (partSouqMonitor.isMethodBlocked(method)) {
      throw new Error(`Method ${method} is currently blocked`);
    }

    // Apply adaptive delay
    await adaptiveWait(method);

    // Execute operation
    const result = await operation();
    
    // Record success
    const responseTime = Date.now() - startTime;
    await partSouqMonitor.recordAttempt(method, true, responseTime);
    
    return result;

  } catch (error) {
    // Record failure
    const responseTime = Date.now() - startTime;
    await partSouqMonitor.recordAttempt(
      method, 
      false, 
      responseTime, 
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    throw error;
  }
}
