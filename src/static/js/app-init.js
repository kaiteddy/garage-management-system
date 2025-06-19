/**
 * Application Initialization JavaScript
 * Handles DOM ready events and initial setup
 * Extracted from monolithic index.html for better performance
 */

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Application initializing...');

    // Load spacing preference
    if (typeof loadSpacingPreference === 'function') {
        loadSpacingPreference();
    }

    // Load real data from API
    if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
    }

    try {
        // Force dashboard as default page and clear any problematic localStorage
        console.log('📄 Forcing dashboard as default page');
        if (typeof currentActivePage !== 'undefined') {
            currentActivePage = 'dashboard';
        }
        localStorage.setItem('currentActivePage', 'dashboard');

        // Ensure dashboard page is visible and active
        const dashboardPage = document.getElementById('dashboard');
        if (dashboardPage) {
            // Hide all pages first
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            // Show dashboard
            dashboardPage.classList.add('active');
            console.log('✅ Dashboard page activated');
        } else {
            console.error('❌ Dashboard page not found');
        }

        // Ensure dashboard nav item is active
        const dashboardNav = document.querySelector('.nav-item[onclick*="dashboard"]');
        if (dashboardNav) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            dashboardNav.classList.add('active');
            console.log('✅ Dashboard navigation activated');
        }

        // Test if basic functions work
        console.log('📊 Loading dashboard stats...');
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
        }

        console.log('📈 Loading recent activity...');
        if (typeof loadRecentActivity === 'function') {
            loadRecentActivity();
        }

        console.log('👥 Loading customers...');
        if (typeof loadCustomersFromAPI === 'function') {
            loadCustomersFromAPI();
        }

        console.log('🚗 Loading vehicles...');
        if (typeof loadVehiclesFromAPI === 'function') {
            loadVehiclesFromAPI();
        }

        console.log('🔧 Loading jobs...');
        if (typeof loadJobsFromAPI === 'function') {
            loadJobsFromAPI();
        }

        console.log('📄 Loading invoices...');
        if (typeof loadInvoicesFromAPI === 'function') {
            loadInvoicesFromAPI();
        }

        console.log('⚙️ Initializing settings...');
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
    }
});

// Enhanced automatic updates with error handling and performance optimization
let dashboardUpdateInterval = null;
let lastDashboardUpdate = 0;
const DASHBOARD_UPDATE_COOLDOWN = 30000; // 30 seconds minimum between updates

function safeDashboardUpdate() {
    const now = Date.now();
    if (now - lastDashboardUpdate < DASHBOARD_UPDATE_COOLDOWN) {
        console.log('⏳ Dashboard update on cooldown, skipping...');
        return;
    }

    try {
        lastDashboardUpdate = now;
        console.log('🔄 Performing safe dashboard update...');
        
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
        }
        
        if (typeof updateErrorMonitoringDashboard === 'function') {
            updateErrorMonitoringDashboard();
        }
        
        console.log('✅ Dashboard update completed');
    } catch (error) {
        console.error('❌ Error during dashboard update:', error);
    }
}

// Start automatic updates with error handling
function startAutomaticUpdates() {
    try {
        // Clear any existing interval
        if (dashboardUpdateInterval) {
            clearInterval(dashboardUpdateInterval);
        }

        // Set up new interval with error handling
        dashboardUpdateInterval = setInterval(() => {
            try {
                safeDashboardUpdate();
            } catch (error) {
                console.error('❌ Error in automatic update:', error);
            }
        }, 60000); // Update every minute

        console.log('🔄 Automatic updates started');
    } catch (error) {
        console.error('❌ Failed to start automatic updates:', error);
    }
}

// Stop automatic updates
function stopAutomaticUpdates() {
    if (dashboardUpdateInterval) {
        clearInterval(dashboardUpdateInterval);
        dashboardUpdateInterval = null;
        console.log('⏹️ Automatic updates stopped');
    }
}

// Page visibility handling for performance
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('📱 Page hidden, stopping updates');
        stopAutomaticUpdates();
    } else {
        console.log('📱 Page visible, resuming updates');
        startAutomaticUpdates();
        // Immediate update when page becomes visible
        setTimeout(safeDashboardUpdate, 1000);
    }
});

// Start automatic updates when the page loads
window.addEventListener('load', function() {
    setTimeout(startAutomaticUpdates, 2000); // Start after 2 seconds
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopAutomaticUpdates();
});

console.log('🚀 Application initialization script loaded');
