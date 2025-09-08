#!/usr/bin/env node

/**
 * 🔌 DATABASE CIRCUIT BREAKER
 * Prevents database lockups by detecting issues early
 * Automatically switches to safe mode when problems detected
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

class DatabaseCircuitBreaker {
  constructor() {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.failureThreshold = 3;
    this.timeout = 60000; // 1 minute
    this.nextAttempt = Date.now();
    this.sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 3000
    });
  }
  
  async execute(queryFn, description = 'query') {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker OPEN - database protection active. Try again in ${Math.round((this.nextAttempt - Date.now())/1000)}s`);
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await queryFn(this.sql);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log('✅ Circuit breaker: Database healthy');
  }
  
  onFailure() {
    this.failureCount++;
    console.log(`⚠️  Circuit breaker: Failure ${this.failureCount}/${this.failureThreshold}`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log('🚨 Circuit breaker OPEN - Database protection activated');
      console.log('💡 This prevents system lockups by stopping problematic queries');
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null
    };
  }
}

module.exports = DatabaseCircuitBreaker;
