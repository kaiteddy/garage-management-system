/**
 * Global Error Handler for the Garage Management System
 */

class ErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.maxErrors = 50;
        this.isInitialized = false;
        this.notificationContainer = null;
    }

    /**
     * Initialize error handler
     */
    init() {
        if (this.isInitialized) return;

        this.setupGlobalErrorHandlers();
        this.createNotificationContainer();
        this.isInitialized = true;
        
        console.log('Error handler initialized');
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection({
                reason: event.reason,
                promise: event.promise
            });
        });

        // Handle API errors
        if (window.ApiService) {
            this.setupApiErrorHandling();
        }
    }

    /**
     * Setup API error handling
     */
    setupApiErrorHandling() {
        const originalRequest = window.ApiService.request.bind(window.ApiService);
        
        window.ApiService.request = async function(endpoint, options = {}) {
            try {
                return await originalRequest(endpoint, options);
            } catch (error) {
                window.ErrorHandler.handleApiError(error, endpoint, options);
                throw error;
            }
        };
    }

    /**
     * Create notification container
     */
    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'error-notifications';
        this.notificationContainer.className = 'error-notifications';
        this.notificationContainer.innerHTML = `
            <style>
                .error-notifications {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                }
                .error-notification {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                    padding: 12px 16px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    animation: slideIn 0.3s ease-out;
                    position: relative;
                }
                .error-notification.success {
                    background: #d4edda;
                    border-color: #c3e6cb;
                    color: #155724;
                }
                .error-notification.warning {
                    background: #fff3cd;
                    border-color: #ffeaa7;
                    color: #856404;
                }
                .error-notification.info {
                    background: #d1ecf1;
                    border-color: #bee5eb;
                    color: #0c5460;
                }
                .error-notification-close {
                    position: absolute;
                    top: 8px;
                    right: 12px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: inherit;
                    opacity: 0.7;
                }
                .error-notification-close:hover {
                    opacity: 1;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            </style>
        `;
        
        document.body.appendChild(this.notificationContainer);
    }

    /**
     * Handle JavaScript errors
     */
    handleJavaScriptError(errorInfo) {
        const error = {
            type: 'javascript',
            message: errorInfo.message,
            filename: errorInfo.filename,
            line: errorInfo.lineno,
            column: errorInfo.colno,
            stack: errorInfo.error?.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.logError(error);
        
        // Show user-friendly message for critical errors
        if (this.isCriticalError(error)) {
            this.showNotification(
                'A critical error occurred. Please refresh the page and try again.',
                'error',
                { persistent: true }
            );
        }
    }

    /**
     * Handle promise rejections
     */
    handlePromiseRejection(rejectionInfo) {
        const error = {
            type: 'promise_rejection',
            reason: rejectionInfo.reason,
            message: rejectionInfo.reason?.message || 'Unhandled promise rejection',
            stack: rejectionInfo.reason?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.logError(error);
        
        // Show notification for unhandled rejections
        this.showNotification(
            'An unexpected error occurred. Please try again.',
            'error'
        );
    }

    /**
     * Handle API errors
     */
    handleApiError(error, endpoint, options) {
        const apiError = {
            type: 'api',
            endpoint: endpoint,
            method: options.method || 'GET',
            status: error.status,
            message: error.message,
            data: error.data,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.logError(apiError);

        // Show appropriate user message based on error type
        let userMessage = 'An error occurred. Please try again.';
        let notificationType = 'error';

        if (error.isNetworkError) {
            userMessage = 'Network error. Please check your connection and try again.';
        } else if (error.status === 401) {
            userMessage = 'Your session has expired. Please log in again.';
            // Redirect to login if needed
        } else if (error.status === 403) {
            userMessage = 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
            userMessage = 'The requested resource was not found.';
        } else if (error.status >= 500) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.data?.message) {
            userMessage = error.data.message;
            notificationType = 'warning';
        }

        this.showNotification(userMessage, notificationType);
    }

    /**
     * Handle validation errors
     */
    handleValidationError(errors, formElement = null) {
        if (Array.isArray(errors)) {
            errors.forEach(error => {
                this.showNotification(error, 'warning');
            });
        } else if (typeof errors === 'object') {
            Object.entries(errors).forEach(([field, message]) => {
                this.showNotification(`${field}: ${message}`, 'warning');
                
                // Highlight form field if form element provided
                if (formElement) {
                    this.highlightFormField(formElement, field);
                }
            });
        } else {
            this.showNotification(errors, 'warning');
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'error', options = {}) {
        const notification = document.createElement('div');
        notification.className = `error-notification ${type}`;
        notification.innerHTML = `
            <div class="error-notification-content">${message}</div>
            <button class="error-notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.notificationContainer.appendChild(notification);

        // Auto-remove notification unless persistent
        if (!options.persistent) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => notification.remove(), 300);
                }
            }, options.duration || 5000);
        }
    }

    /**
     * Highlight form field with error
     */
    highlightFormField(formElement, fieldName) {
        const field = formElement.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('error');
            field.addEventListener('input', () => {
                field.classList.remove('error');
            }, { once: true });
        }
    }

    /**
     * Log error for debugging/monitoring
     */
    logError(error) {
        // Add to error queue
        this.errorQueue.push(error);
        
        // Limit queue size
        if (this.errorQueue.length > this.maxErrors) {
            this.errorQueue.shift();
        }

        // Log to console in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.error('Error logged:', error);
        }

        // Send to monitoring service in production
        this.sendToMonitoring(error);
    }

    /**
     * Send error to monitoring service
     */
    async sendToMonitoring(error) {
        try {
            // Only send in production
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return;
            }

            // Send to error monitoring endpoint
            await fetch('/api/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(error)
            });
        } catch (monitoringError) {
            console.error('Failed to send error to monitoring:', monitoringError);
        }
    }

    /**
     * Check if error is critical
     */
    isCriticalError(error) {
        const criticalPatterns = [
            /Cannot read property/,
            /is not a function/,
            /ReferenceError/,
            /TypeError.*undefined/
        ];

        return criticalPatterns.some(pattern => 
            pattern.test(error.message) || pattern.test(error.stack)
        );
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorQueue.length,
            byType: {},
            recent: this.errorQueue.slice(-10)
        };

        this.errorQueue.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear error queue
     */
    clearErrors() {
        this.errorQueue = [];
    }

    /**
     * Show success message
     */
    showSuccess(message, options = {}) {
        this.showNotification(message, 'success', options);
    }

    /**
     * Show warning message
     */
    showWarning(message, options = {}) {
        this.showNotification(message, 'warning', options);
    }

    /**
     * Show info message
     */
    showInfo(message, options = {}) {
        this.showNotification(message, 'info', options);
    }

    /**
     * Handle form submission errors
     */
    handleFormError(error, formElement) {
        if (error.data && error.data.errors) {
            this.handleValidationError(error.data.errors, formElement);
        } else {
            this.showNotification(
                error.message || 'Form submission failed. Please check your input and try again.',
                'error'
            );
        }
    }

    /**
     * Retry function with exponential backoff
     */
    async retry(fn, maxAttempts = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Create global error handler instance
window.ErrorHandler = new ErrorHandler();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ErrorHandler.init());
} else {
    window.ErrorHandler.init();
}

// Export for use in other modules
window.showError = (message, options) => window.ErrorHandler.showNotification(message, 'error', options);
window.showSuccess = (message, options) => window.ErrorHandler.showSuccess(message, options);
window.showWarning = (message, options) => window.ErrorHandler.showWarning(message, options);
window.showInfo = (message, options) => window.ErrorHandler.showInfo(message, options);
