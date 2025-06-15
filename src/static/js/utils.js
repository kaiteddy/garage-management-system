/**
 * Utility functions for the Garage Management System
 */

const Utils = {
    /**
     * Format currency values
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(amount);
    },

    /**
     * Format dates
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('en-GB', { ...defaultOptions, ...options });
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show loading state
     */
    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="spinner mx-auto"></div>';
        }
    },

    /**
     * Show error message
     */
    showError(element, message) {
        if (element) {
            element.innerHTML = `
                <div class="text-center py-8 text-error-600">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
};

// Make available globally
window.Utils = Utils;
