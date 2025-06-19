/**
 * Advanced Error Monitoring and Resolution System
 * Extracted from monolithic index.html for better performance
 */

// Advanced Error Monitoring and Resolution System
class ErrorMonitoringSystem {
    constructor() {
        this.errors = [];
        this.fixes = [];
        this.patterns = this.initializeErrorPatterns();
        this.fixStrategies = this.initializeFixStrategies();
        this.isActive = true;
        this.reportingEndpoint = '/api/error-reports';
        this.suppressedEndpoints = new Set();
        this.knownMissingEndpoints = [
            '/api/dashboard/recent-activity'  // Keep only the dashboard-specific one
        ];
        this.init();
    }

    init() {
        this.setupErrorHandlers();
        this.setupNetworkMonitoring();
        this.setupPerformanceMonitoring();
        this.startContinuousMonitoring();
        console.log('🛡️ Error Monitoring System initialized');
    }

    setupErrorHandlers() {
        // Enhanced JavaScript error handler
        window.addEventListener('error', (event) => {
            const errorData = {
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            this.handleError(errorData);
        });

        // Enhanced promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            const errorData = {
                type: 'promise_rejection',
                reason: event.reason,
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            this.handleError(errorData);
        });
    }

    setupNetworkMonitoring() {
        // Monitor fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);

                if (!response.ok) {
                    const url = args[0];

                    // Check if this is a known missing endpoint that should be suppressed
                    if (response.status === 404 && this.shouldSuppressEndpoint(url)) {
                        // Suppress repeated 404 logs for known missing endpoints
                        return response;
                    }

                    const errorData = {
                        type: 'network_error',
                        status: response.status,
                        statusText: response.statusText,
                        url: url,
                        method: args[1]?.method || 'GET',
                        timestamp: new Date().toISOString()
                    };

                    this.handleError(errorData);
                }

                return response;
            } catch (error) {
                const errorData = {
                    type: 'network_failure',
                    message: error.message,
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    timestamp: new Date().toISOString()
                };

                this.handleError(errorData);
                throw error;
            }
        };
    }

    initializeErrorPatterns() {
        return [
            {
                name: 'null_object_access',
                pattern: /null is not an object|Cannot read propert(y|ies) of null/i,
                severity: 'high',
                category: 'dom_access'
            },
            {
                name: 'undefined_object_access',
                pattern: /undefined is not an object|Cannot read propert(y|ies) of undefined/i,
                severity: 'high',
                category: 'data_access'
            },
            {
                name: 'undefined_variable',
                pattern: /is not defined|undefined is not a function/i,
                severity: 'high',
                category: 'variable_access'
            },
            {
                name: 'missing_dom_element',
                pattern: /getElementById.*null|querySelector.*null/i,
                severity: 'medium',
                category: 'dom_access'
            },
            {
                name: 'duplicate_declaration',
                pattern: /Cannot declare.*twice|Identifier.*already been declared/i,
                severity: 'medium',
                category: 'syntax'
            },
            {
                name: 'api_404',
                pattern: /404/,
                severity: 'medium',
                category: 'network'
            },
            {
                name: 'api_500',
                pattern: /500|Internal Server Error/i,
                severity: 'high',
                category: 'network'
            }
        ];
    }

    initializeFixStrategies() {
        return {
            null_object_access: this.fixNullObjectAccess.bind(this),
            undefined_object_access: this.fixUndefinedObjectAccess.bind(this),
            undefined_variable: this.fixUndefinedVariable.bind(this),
            missing_dom_element: this.fixMissingDomElement.bind(this),
            duplicate_declaration: this.fixDuplicateDeclaration.bind(this),
            api_404: this.fixApi404.bind(this),
            api_500: this.fixApi500.bind(this)
        };
    }

    handleError(errorData) {
        if (!this.isActive) return;

        console.error('🚨 Error detected:', errorData);

        // Add to error log
        this.errors.push(errorData);

        // Analyze error pattern
        const pattern = this.analyzeError(errorData);
        if (pattern) {
            console.log('🔍 Error pattern identified:', pattern.name);

            // Attempt automatic fix
            this.attemptFix(errorData, pattern);
        }

        // Report error
        this.reportError(errorData, pattern);
    }

    analyzeError(errorData) {
        const message = errorData.message || errorData.reason?.message || '';

        for (const pattern of this.patterns) {
            if (pattern.pattern.test(message) ||
                (errorData.status && pattern.pattern.test(String(errorData.status)))) {
                return pattern;
            }
        }

        return null;
    }

    attemptFix(errorData, pattern) {
        const fixStrategy = this.fixStrategies[pattern.name];
        if (fixStrategy) {
            console.log('🔧 Attempting automatic fix for:', pattern.name);

            try {
                const fixResult = fixStrategy(errorData);

                const fixRecord = {
                    errorId: this.errors.length - 1,
                    pattern: pattern.name,
                    strategy: fixStrategy.name,
                    result: fixResult,
                    timestamp: new Date().toISOString(),
                    success: fixResult.success || false
                };

                this.fixes.push(fixRecord);

                if (fixResult.success) {
                    console.log('✅ Fix applied successfully:', fixResult.description);
                } else {
                    console.warn('⚠️ Fix attempt failed:', fixResult.reason);
                }

            } catch (error) {
                console.error('💥 Fix strategy failed:', error);

                this.fixes.push({
                    errorId: this.errors.length - 1,
                    pattern: pattern.name,
                    strategy: fixStrategy.name,
                    result: { success: false, reason: error.message },
                    timestamp: new Date().toISOString(),
                    success: false
                });
            }
        }
    }

    // Fix strategies will be added in the next part
    fixNullObjectAccess(errorData) {
        // Implementation will be added
        return { success: false, reason: 'Not implemented yet' };
    }

    fixUndefinedObjectAccess(errorData) {
        // Implementation will be added
        return { success: false, reason: 'Not implemented yet' };
    }

    fixUndefinedVariable(errorData) {
        // Implementation will be added
        return { success: false, reason: 'Not implemented yet' };
    }

    fixMissingDomElement(errorData) {
        // Implementation will be added
        return { success: false, reason: 'Not implemented yet' };
    }

    fixDuplicateDeclaration(errorData) {
        // Implementation will be added
        return { success: false, reason: 'Not implemented yet' };
    }

    shouldSuppressEndpoint(url) {
        // Check if this endpoint is in the known missing list
        for (const endpoint of this.knownMissingEndpoints) {
            if (url.includes(endpoint)) {
                // Add to suppressed set to track
                this.suppressedEndpoints.add(url);
                return true;
            }
        }
        return false;
    }

    fixApi404(errorData) {
        const url = errorData.url;

        // Check if this is a known missing endpoint
        if (this.shouldSuppressEndpoint(url)) {
            return {
                success: true,
                description: 'Suppressed known missing endpoint',
                action: 'suppressed'
            };
        }

        // For unknown 404s, mark as manual intervention required
        console.warn(`⚠️ Unknown 404 endpoint: ${url} - Manual intervention required`);
        return {
            success: false,
            reason: 'Manual intervention required for unknown 404 endpoint',
            action: 'manual_required',
            url: url
        };
    }

    fixApi500(errorData) {
        // Implementation will be added
        return { success: false, reason: 'Not implemented yet' };
    }

    reportError(errorData, pattern) {
        // Log error to console for debugging
        console.log('📊 Reporting error:', {
            type: errorData.type,
            message: errorData.message,
            pattern: pattern?.name,
            timestamp: errorData.timestamp
        });

        // In a production environment, you would send this to your error tracking service
        // For now, we'll just store it locally and provide console feedback
        try {
            // Store in localStorage for debugging
            const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
            errorLog.push({
                ...errorData,
                pattern: pattern?.name,
                id: Date.now()
            });

            // Keep only last 100 errors
            if (errorLog.length > 100) {
                errorLog.splice(0, errorLog.length - 100);
            }

            localStorage.setItem('errorLog', JSON.stringify(errorLog));
        } catch (e) {
            console.warn('Failed to store error log:', e);
        }
    }

    setupPerformanceMonitoring() {
        // Monitor page load performance
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData && perfData.loadEventEnd > 5000) {
                        this.handleError({
                            type: 'performance_warning',
                            message: `Slow page load: ${perfData.loadEventEnd}ms`,
                            loadTime: perfData.loadEventEnd,
                            timestamp: new Date().toISOString()
                        });
                    }
                }, 1000);
            });
        }
    }

    startContinuousMonitoring() {
        // Check for memory leaks every 30 seconds
        setInterval(() => {
            if ('memory' in performance) {
                const memInfo = performance.memory;
                if (memInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
                    this.handleError({
                        type: 'memory_warning',
                        message: `High memory usage: ${Math.round(memInfo.usedJSHeapSize / 1024 / 1024)}MB`,
                        memoryUsage: memInfo.usedJSHeapSize,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }, 30000);
    }

    getErrorSummary() {
        return {
            totalErrors: this.errors.length,
            totalFixes: this.fixes.length,
            successfulFixes: this.fixes.filter(f => f.success).length,
            errorsByType: this.errors.reduce((acc, error) => {
                acc[error.type] = (acc[error.type] || 0) + 1;
                return acc;
            }, {}),
            recentErrors: this.errors.slice(-10)
        };
    }
}

// Initialize the error monitoring system
window.errorMonitor = new ErrorMonitoringSystem();

// Global error handler (legacy support)
window.addEventListener('error', function(event) {
    console.error('🚨 JavaScript Error:', event.error);
    console.error('📍 Error location:', event.filename, 'Line:', event.lineno);
    console.error('📝 Error message:', event.message);
});

// Unhandled promise rejection handler (legacy support)
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

console.log('🔧 Error monitoring system loaded...');
