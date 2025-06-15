/**
 * Navigation Module
 * Extracted from monolithic index.html
 * Handles page navigation and state management
 */

// Global navigation state
let currentActivePage = 'dashboard';

/**
 * Primary navigation function - defined immediately and globally
 */
window.showPage = function(pageId) {
    console.log('🔧 Navigation to:', pageId);

    try {
        // Save current page to localStorage for refresh persistence
        currentActivePage = pageId;
        localStorage.setItem('currentActivePage', pageId);

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected page
        const pageElement = document.getElementById(pageId);
        if (pageElement) {
            pageElement.classList.add('active');
            console.log('✅ Page shown successfully:', pageId);
        } else {
            console.error('❌ Page element not found:', pageId);
            return;
        }

        // Add active class to selected nav item
        const navItem = document.querySelector(`.nav-item[onclick*="'${pageId}'"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Load data for the page if needed
        loadPageData(pageId);

    } catch (error) {
        console.error('💥 Error in navigation:', error);
    }
};

/**
 * Load data for specific pages
 */
function loadPageData(pageId) {
    switch(pageId) {
        case 'customers':
            if (typeof loadCustomers === 'function') {
                loadCustomers();
            }
            break;
        case 'vehicles':
            if (typeof loadVehiclesFromAPI === 'function') {
                loadVehiclesFromAPI();
            }
            break;
        case 'jobs':
            if (typeof loadJobsFromAPI === 'function') {
                loadJobsFromAPI();
            }
            break;
        case 'invoices':
            if (typeof loadInvoicesFromAPI === 'function') {
                loadInvoicesFromAPI();
            }
            break;
        case 'mot-reminders':
            if (typeof ensureMOTDataLoaded === 'function') {
                ensureMOTDataLoaded();
            }
            break;
        case 'upload':
            if (typeof loadUploadStatus === 'function') {
                loadUploadStatus();
            }
            break;
        case 'settings':
            loadSettingsPage();
            break;
        default:
            // No specific data loading needed
            break;
    }
}

/**
 * Load settings page with proper tab activation
 */
function loadSettingsPage() {
    if (!window.settingsData || Object.keys(window.settingsData).length === 0) {
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
    }
    
    // Ensure the first tab is active
    setTimeout(() => {
        const firstTab = document.querySelector('.settings-tab-btn');
        const firstTabContent = document.querySelector('.settings-tab-content');
        if (firstTab && !firstTab.classList.contains('active')) {
            firstTab.classList.add('active');
        }
        if (firstTabContent && !firstTabContent.classList.contains('active')) {
            firstTabContent.classList.add('active');
        }
    }, 100);
}

/**
 * Debug function to check interface status
 */
window.debugInterface = function() {
    console.log('🔍 INTERFACE DEBUG REPORT');
    console.log('========================');

    // Check all pages
    const pages = document.querySelectorAll('.page');
    console.log(`📄 Total pages found: ${pages.length}`);
    pages.forEach(page => {
        const isActive = page.classList.contains('active');
        console.log(`  - ${page.id}: ${isActive ? '✅ ACTIVE' : '⚪ inactive'}`);
    });

    // Check navigation items
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`🧭 Total nav items found: ${navItems.length}`);
    navItems.forEach(navItem => {
        const isActive = navItem.classList.contains('active');
        const onclick = navItem.getAttribute('onclick');
        const pageId = onclick ? onclick.match(/showPage\('([^']+)'\)/)?.[1] : 'unknown';
        console.log(`  - ${pageId}: ${isActive ? '✅ ACTIVE' : '⚪ inactive'}`);
    });

    // Check current state
    console.log(`📍 Current active page: ${currentActivePage}`);
    console.log(`💾 localStorage page: ${localStorage.getItem('currentActivePage')}`);

    return 'Debug complete - check console for details';
};

/**
 * Initialize navigation system
 */
function initializeNavigation() {
    console.log('🧭 Navigation system initializing...');
    
    // Force dashboard as default page and clear any problematic localStorage
    console.log('📄 Forcing dashboard as default page');
    currentActivePage = 'dashboard';
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

    console.log('🧭 Navigation system ready');
}

/**
 * Emergency navigation function for error recovery
 */
window.emergencyShowPage = function(pageId) {
    console.log('🚨 Emergency navigation to:', pageId);

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('✅ Emergency navigation successful');

        // Activate first settings tab if it's settings page
        if (pageId === 'settings') {
            setTimeout(() => {
                const firstTab = document.querySelector('.settings-tab-btn');
                const firstTabContent = document.querySelector('.settings-tab-content');
                if (firstTab) firstTab.classList.add('active');
                if (firstTabContent) firstTabContent.classList.add('active');
            }, 100);
        }

        return true;
    } else {
        console.error('❌ Emergency navigation failed - page not found');
        return false;
    }
};

// Export functions for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showPage: window.showPage,
        debugInterface: window.debugInterface,
        emergencyShowPage: window.emergencyShowPage,
        initializeNavigation
    };
}
