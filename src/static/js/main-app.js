/**
 * Main Application JavaScript
 * Core functionality for the Garage Management System
 * Extracted from monolithic index.html for better performance
 */

// Global variables
let currentCustomerPage = 1;
let currentVehiclePage = 1;
let currentCustomerPerPage = 50;
let currentVehiclePerPage = 50;
let currentCustomerSearch = '';
let currentVehicleSearch = '';
let currentCustomerId = null;
let currentVehicleId = null;
let currentInvoiceId = null;
let currentActivePage = 'dashboard'; // Track current page

// Request caching and debouncing to improve performance
let requestCache = new Map();
let pendingRequests = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Cached fetch function to reduce API calls
async function cachedFetch(url, options = {}) {
    const cacheKey = url + JSON.stringify(options);
    const now = Date.now();

    // Check cache first
    if (requestCache.has(cacheKey)) {
        const cached = requestCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            console.log('📦 Using cached response for:', url);
            return cached.response.clone();
        }
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Request already pending for:', url);
        return pendingRequests.get(cacheKey);
    }

    // Make new request
    console.log('🌐 Making fresh request to:', url);
    const requestPromise = fetch(url, options);
    pendingRequests.set(cacheKey, requestPromise);

    try {
        const response = await requestPromise;
        const clonedResponse = response.clone();

        // Cache successful responses
        if (response.ok) {
            requestCache.set(cacheKey, {
                response: clonedResponse,
                timestamp: now
            });
        }

        return response;
    } finally {
        pendingRequests.delete(cacheKey);
    }
}

// Primary navigation function - defined immediately and globally
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
        if (pageId === 'customers') {
            loadCustomers();
        } else if (pageId === 'vehicles') {
            loadVehiclesFromAPI();
        } else if (pageId === 'jobs') {
            loadJobsFromAPI();
        } else if (pageId === 'invoices') {
            loadInvoicesFromAPI();
        } else if (pageId === 'mot-reminders') {
            ensureMOTDataLoaded();
        } else if (pageId === 'upload') {
            if (typeof loadUploadStatus === 'function') {
                loadUploadStatus();
            }
        } else if (pageId === 'settings') {
            if (!settingsData || Object.keys(settingsData).length === 0) {
                loadSettings();
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

    } catch (error) {
        console.error('💥 Error in navigation:', error);
    }
};

// Debug function to check interface status
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

// Load customers from API
async function loadCustomersFromAPI() {
    try {
        console.log('🔄 Loading customers from API...');
        const response = await fetch('/api/customers');
        const result = await response.json();
        console.log('📊 Customers API response:', result);

        // API returns data directly, not wrapped in success
        if (result && result.customers) {
            console.log(`✅ Found ${result.customers.length} customers, calling displayCustomers...`);
            displayCustomers(result.customers);
        } else {
            console.error('❌ No customers data in response:', result);
        }
    } catch (error) {
        console.error('Failed to load customers:', error);
    }
}

// Load vehicles from API
async function loadVehiclesFromAPI() {
    try {
        const response = await fetch('/api/vehicles');
        const result = await response.json();

        // API returns data directly, not wrapped in success
        if (result && result.vehicles) {
            displayVehicles(result.vehicles);
        }
    } catch (error) {
        console.error('Failed to load vehicles:', error);
    }
}

// Load jobs from API
async function loadJobsFromAPI() {
    try {
        const response = await fetch('/api/jobs');
        const result = await response.json();

        // API returns data directly, not wrapped in success
        if (result && result.jobs) {
            displayJobs(result.jobs);
        }
    } catch (error) {
        console.error('Failed to load jobs:', error);
    }
}

// Load invoices from API
async function loadInvoicesFromAPI() {
    try {
        const response = await fetch('/api/invoices');
        const result = await response.json();

        // API returns data directly, not wrapped in success
        if (result && result.invoices) {
            displayInvoices(result.invoices);
        }
    } catch (error) {
        console.error('Failed to load invoices:', error);
    }
}

console.log('🧭 Main application JavaScript loaded');
console.log('🔧 Navigation system ready');
