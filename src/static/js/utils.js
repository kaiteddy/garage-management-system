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
    },

    /**
     * Open a centered popup window
     */
    openCenteredWindow(url, name, width = 800, height = 600, options = {}) {
        // Calculate centered position
        const left = Math.max(0, (screen.width - width) / 2);
        const top = Math.max(0, (screen.height - height) / 2);

        // Default window features for better user experience
        const defaultFeatures = {
            width: width,
            height: height,
            left: left,
            top: top,
            scrollbars: 'yes',
            resizable: 'yes',
            location: 'yes',
            menubar: 'no',
            toolbar: 'no',
            status: 'no'
        };

        // Merge with custom options
        const features = { ...defaultFeatures, ...options };

        // Convert features object to string
        const featuresString = Object.entries(features)
            .map(([key, value]) => `${key}=${value}`)
            .join(',');

        // Open the window
        const newWindow = window.open(url, name, featuresString);

        // Ensure the window is focused and visible
        if (newWindow) {
            newWindow.focus();

            // Additional focus check after a short delay
            setTimeout(() => {
                if (newWindow && !newWindow.closed) {
                    newWindow.focus();
                }
            }, 100);
        }

        return newWindow;
    },

    /**
     * Center a modal dialog on screen
     */
    centerModal(modalElement) {
        if (!modalElement) return;

        // Ensure the modal is visible for calculations
        const wasHidden = modalElement.style.display === 'none';
        if (wasHidden) {
            modalElement.style.visibility = 'hidden';
            modalElement.style.display = 'block';
        }

        // Get modal dimensions
        const rect = modalElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate centered position
        const left = Math.max(0, (viewportWidth - rect.width) / 2);
        const top = Math.max(0, (viewportHeight - rect.height) / 2);

        // Apply positioning
        modalElement.style.position = 'fixed';
        modalElement.style.left = left + 'px';
        modalElement.style.top = top + 'px';

        // Restore visibility
        if (wasHidden) {
            modalElement.style.visibility = 'visible';
            modalElement.style.display = 'none';
        }
    },

    /**
     * Show a modal with proper centering and focus management
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        const backdrop = document.getElementById(modalId + '-backdrop') ||
                        document.getElementById(modalId.replace('-modal', '-modal-backdrop'));

        if (!modal) {
            console.warn(`Modal with ID '${modalId}' not found`);
            return false;
        }

        // Show backdrop if it exists
        if (backdrop) {
            backdrop.style.display = 'flex';
            backdrop.classList.add('show');
        }

        // Show modal
        modal.style.display = 'block';
        modal.classList.add('show');

        // Center the modal
        this.centerModal(modal);

        // Focus management
        if (options.focusFirst !== false) {
            setTimeout(() => {
                const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }, 100);
        }

        // Add escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideModal(modalId);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        return true;
    },

    /**
     * Hide a modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        const backdrop = document.getElementById(modalId + '-backdrop') ||
                        document.getElementById(modalId.replace('-modal', '-modal-backdrop'));

        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 250);
        }

        if (backdrop) {
            backdrop.classList.remove('show');
            setTimeout(() => {
                backdrop.style.display = 'none';
            }, 250);
        }
    }
};

// Make available globally
window.Utils = Utils;

// Auto-center modals on window resize
window.addEventListener('resize', Utils.debounce(() => {
    // Find all visible modals and re-center them
    const visibleModals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
    visibleModals.forEach(modal => {
        Utils.centerModal(modal);
    });
}, 250));
