/**
 * Main Application Initialization
 * Extracted from monolithic index.html
 * Handles application startup and coordination
 */

// Global application state
let currentCustomerPage = 1;
let currentVehiclePage = 1;
let currentCustomerPerPage = 50;
let currentVehiclePerPage = 50;
let currentCustomerSearch = '';
let currentVehicleSearch = '';
let currentCustomerId = null;
let currentVehicleId = null;
let currentInvoiceId = null;

/**
 * Initialize the application
 */
function initializeApplication() {
    console.log('🚀 Application initializing...');

    try {
        // Load spacing preference
        if (typeof loadSpacingPreference === 'function') {
            loadSpacingPreference();
        }

        // Initialize navigation system
        if (typeof initializeNavigation === 'function') {
            initializeNavigation();
        }

        // Load initial data
        loadInitialData();

        // Initialize error monitoring
        if (typeof initializeErrorMonitoring === 'function') {
            initializeErrorMonitoring();
        }

        // Initialize settings
        if (typeof initializeSettings === 'function') {
            initializeSettings();
        }

        // Ensure dashboard is properly shown after everything is loaded
        setTimeout(() => {
            console.log('🔄 Ensuring dashboard is active');
            if (typeof showPage === 'function') {
                showPage('dashboard');
            }
        }, 500);

        console.log('✅ Application initialized successfully');

    } catch (error) {
        console.error('💥 Error during application initialization:', error);
        
        // Emergency fallback
        setTimeout(() => {
            if (typeof emergencyShowPage === 'function') {
                emergencyShowPage('dashboard');
            }
        }, 1000);
    }
}

/**
 * Load initial application data
 */
function loadInitialData() {
    console.log('📊 Loading initial application data...');

    // Load dashboard data
    if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
    }

    if (typeof loadRecentActivity === 'function') {
        loadRecentActivity();
    }

    // Pre-load other data for better performance
    setTimeout(() => {
        console.log('👥 Pre-loading customers...');
        if (typeof loadCustomersFromAPI === 'function') {
            loadCustomersFromAPI();
        }
    }, 1000);

    setTimeout(() => {
        console.log('🚗 Pre-loading vehicles...');
        if (typeof loadVehiclesFromAPI === 'function') {
            loadVehiclesFromAPI();
        }
    }, 1500);

    setTimeout(() => {
        console.log('🔧 Pre-loading jobs...');
        if (typeof loadJobsFromAPI === 'function') {
            loadJobsFromAPI();
        }
    }, 2000);

    setTimeout(() => {
        console.log('📄 Pre-loading invoices...');
        if (typeof loadInvoicesFromAPI === 'function') {
            loadInvoicesFromAPI();
        }
    }, 2500);
}

/**
 * Load spacing preference from localStorage
 */
function loadSpacingPreference() {
    const savedSpacing = localStorage.getItem('layoutSpacing');
    if (savedSpacing) {
        document.documentElement.setAttribute('data-spacing', savedSpacing);
        console.log('📐 Loaded spacing preference:', savedSpacing);
    }
}

/**
 * Application health check
 */
function performHealthCheck() {
    const healthReport = {
        timestamp: new Date().toISOString(),
        pages: document.querySelectorAll('.page').length,
        activePages: document.querySelectorAll('.page.active').length,
        navItems: document.querySelectorAll('.nav-item').length,
        activeNavItems: document.querySelectorAll('.nav-item.active').length,
        apiCacheSize: window.API ? window.API.getCacheStats().cached : 0
    };

    console.log('🏥 Health Check Report:', healthReport);

    // Check for issues
    if (healthReport.activePages === 0) {
        console.warn('⚠️ No active pages detected - attempting recovery');
        if (typeof emergencyShowPage === 'function') {
            emergencyShowPage('dashboard');
        }
    }

    if (healthReport.activePages > 1) {
        console.warn('⚠️ Multiple active pages detected - fixing');
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        if (typeof showPage === 'function') {
            showPage('dashboard');
        }
    }

    return healthReport;
}

/**
 * Emergency recovery function
 */
function emergencyRecovery() {
    console.log('🚨 Emergency recovery initiated');

    try {
        // Clear any problematic state
        localStorage.removeItem('currentActivePage');
        
        // Clear API cache
        if (window.API && typeof window.API.clearCache === 'function') {
            window.API.clearCache();
        }

        // Reset to dashboard
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show dashboard
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.classList.add('active');
        }

        const dashboardNav = document.querySelector('.nav-item[onclick*="dashboard"]');
        if (dashboardNav) {
            dashboardNav.classList.add('active');
        }

        console.log('✅ Emergency recovery completed');
        return true;

    } catch (error) {
        console.error('💥 Emergency recovery failed:', error);
        return false;
    }
}

/**
 * Application restart function
 */
function restartApplication() {
    console.log('🔄 Restarting application...');
    
    // Clear state
    emergencyRecovery();
    
    // Reinitialize
    setTimeout(() => {
        initializeApplication();
    }, 1000);
}

// Global application functions
window.initializeApplication = initializeApplication;
window.performHealthCheck = performHealthCheck;
window.emergencyRecovery = emergencyRecovery;
window.restartApplication = restartApplication;
window.loadSpacingPreference = loadSpacingPreference;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded - Starting Application');
    initializeApplication();
});

// Periodic health checks
setInterval(() => {
    performHealthCheck();
}, 60000); // Every minute

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApplication,
        performHealthCheck,
        emergencyRecovery,
        restartApplication,
        loadSpacingPreference
    };
}
