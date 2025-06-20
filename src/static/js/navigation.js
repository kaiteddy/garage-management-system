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
        // Debug: Check if page element exists
        const pageElement = document.getElementById(pageId);
        console.log(`🔍 Page element "${pageId}":`, pageElement ? 'found' : 'NOT FOUND');

        if (pageElement) {
            console.log(`🔍 Page element classes:`, pageElement.className);
            console.log(`🔍 Page element display:`, window.getComputedStyle(pageElement).display);
        }

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
    console.log(`📄 Loading data for page: ${pageId}`);

    switch(pageId) {
        case 'dashboard':
            if (typeof loadDashboardContent === 'function') {
                loadDashboardContent();
            } else {
                console.error('❌ loadDashboardContent function not found');
            }
            break;
        case 'customers':
            if (typeof loadCustomersPage === 'function') {
                loadCustomersPage();
            } else {
                console.error('❌ loadCustomersPage function not found');
            }
            break;
        case 'vehicles':
            if (typeof loadVehiclesPage === 'function') {
                loadVehiclesPage();
            } else {
                console.error('❌ loadVehiclesPage function not found');
            }
            break;
        case 'jobs':
            if (typeof loadJobsPage === 'function') {
                loadJobsPage();
            } else {
                console.error('❌ loadJobsPage function not found');
            }
            break;
        case 'workshop-diary':
            if (typeof loadWorkshopDiaryPage === 'function') {
                loadWorkshopDiaryPage();
            } else {
                console.error('❌ loadWorkshopDiaryPage function not found');
            }
            break;
        case 'job-sheets':
            if (typeof loadJobSheetsPage === 'function') {
                loadJobSheetsPage();
            } else {
                console.error('❌ loadJobSheetsPage function not found');
            }
            break;
        case 'quotes':
            if (typeof loadQuotesPage === 'function') {
                loadQuotesPage();
            } else {
                console.error('❌ loadQuotesPage function not found');
            }
            break;
        case 'online-booking':
            if (typeof loadOnlineBookingPage === 'function') {
                loadOnlineBookingPage();
            } else {
                console.error('❌ loadOnlineBookingPage function not found');
            }
            break;
        case 'customer-portal':
            if (typeof loadCustomerPortalPage === 'function') {
                loadCustomerPortalPage();
            } else {
                console.error('❌ loadCustomerPortalPage function not found');
            }
            break;
        case 'mot-reminders':
            if (typeof loadMOTRemindersPage === 'function') {
                loadMOTRemindersPage();
            } else {
                console.error('❌ loadMOTRemindersPage function not found');
            }
            break;
        case 'parts':
            if (typeof loadPartsPage === 'function') {
                loadPartsPage();
            } else {
                console.error('❌ loadPartsPage function not found');
            }
            break;
        case 'invoices':
            if (typeof loadInvoicesPage === 'function') {
                loadInvoicesPage();
            } else {
                console.error('❌ loadInvoicesPage function not found');
            }
            break;
        case 'reports':
            if (typeof loadReportsPage === 'function') {
                loadReportsPage();
            } else {
                console.error('❌ loadReportsPage function not found');
            }
            break;
        case 'upload':
            if (typeof loadUploadPage === 'function') {
                loadUploadPage();
            } else {
                console.error('❌ loadUploadPage function not found');
            }
            break;
        case 'error-monitoring':
            if (typeof loadErrorMonitoringPage === 'function') {
                loadErrorMonitoringPage();
            } else {
                console.error('❌ loadErrorMonitoringPage function not found');
            }
            break;
        case 'settings':
            if (typeof loadSettingsPage === 'function') {
                loadSettingsPage();
            } else {
                console.error('❌ loadSettingsPage function not found');
            }
            break;
        default:
            console.warn(`⚠️ No loading function defined for page: ${pageId}`);
            break;
    }
}

// Make loadPageData globally available
window.loadPageData = loadPageData;

/**
 * Load customers page content
 */
function loadCustomersPage() {
    console.log('👥 Loading customers page...');

    const customersContent = document.getElementById('customers-content');
    if (!customersContent) {
        console.error('❌ Customers content container not found');
        return;
    }

    // Create customers page HTML content
    const customersHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-users"></i>
                    Customers
                </h1>
                <p class="page-subtitle">Manage your customer database</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openAddCustomerModal()">
                    <i class="fas fa-plus"></i>
                    Add Customer
                </button>
            </div>
        </div>

        <!-- Customer Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon customers">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3 id="total-customers-count">0</h3>
                    <p>Total Customers</p>
                    <small>All registered</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon active">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="stat-info">
                    <h3 id="active-customers-count">0</h3>
                    <p>Active Customers</p>
                    <small>Recent activity</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon new">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="stat-info">
                    <h3 id="new-customers-count">0</h3>
                    <p>New This Month</p>
                    <small>Recently added</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon revenue">
                    <i class="fas fa-pound-sign"></i>
                </div>
                <div class="stat-info">
                    <h3 id="customer-revenue">£0.00</h3>
                    <p>Total Revenue</p>
                    <small>All customers</small>
                </div>
            </div>
        </div>

        <!-- Search and Filters -->
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <h3>Customer Directory</h3>
                    <div class="flex gap-2">
                        <input type="text" id="customer-search" placeholder="Search customers..." class="form-input">
                        <select id="customer-status-filter" class="form-select">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Name</th>
                                <th>Company</th>
                                <th>Contact</th>
                                <th>Address</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customers-table-body">
                            <tr>
                                <td colspan="6" class="text-center py-4">
                                    <div class="loading-spinner"></div>
                                    <p>Loading customers...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div id="customers-pagination" class="pagination-container"></div>
            </div>
        </div>
    `;

    // Insert the HTML content
    customersContent.innerHTML = customersHTML;

    // Load customer data
    loadCustomersData();

    console.log('✅ Customers page content loaded');
}

/**
 * Load Vehicles page content
 */
function loadVehiclesPage() {
    console.log('🚗 Loading Vehicles page...');

    const vehiclesContent = document.getElementById('vehicles-content');
    if (!vehiclesContent) {
        console.error('❌ Vehicles content container not found');
        return;
    }

    const vehiclesHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-car"></i>
                    Vehicles
                </h1>
                <p class="page-subtitle">Manage vehicle records and information</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openAddVehicleModal()">
                    <i class="fas fa-plus"></i>
                    Add Vehicle
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-car"></i>
                Vehicle Records
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Registration</th>
                                <th>Make</th>
                                <th>Model</th>
                                <th>Year</th>
                                <th>Customer</th>
                                <th>MOT Due</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="vehicles-table-body">
                            <tr>
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-spinner"></div>
                                    <p>Loading vehicles...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    vehiclesContent.innerHTML = vehiclesHTML;

    // Load vehicles data
    if (typeof loadVehiclesFromAPI === 'function') {
        loadVehiclesFromAPI();
    } else {
        console.warn('⚠️ loadVehiclesFromAPI function not found');
    }

    console.log('✅ Vehicles page content loaded');
}

/**
 * Load Jobs page content
 */
function loadJobsPage() {
    console.log('🔧 Loading Jobs page...');

    const jobsContent = document.getElementById('jobs-content');
    if (!jobsContent) {
        console.error('❌ Jobs content container not found');
        return;
    }

    const jobsHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-wrench"></i>
                    Jobs
                </h1>
                <p class="page-subtitle">Manage work orders and job tracking</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openAddJobModal()">
                    <i class="fas fa-plus"></i>
                    New Job
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-list"></i>
                Active Jobs
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Job #</th>
                                <th>Customer</th>
                                <th>Vehicle</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="jobs-table-body">
                            <tr>
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-spinner"></div>
                                    <p>Loading jobs...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    jobsContent.innerHTML = jobsHTML;

    // Load jobs data
    if (typeof loadJobsFromAPI === 'function') {
        loadJobsFromAPI();
    } else {
        console.warn('⚠️ loadJobsFromAPI function not found');
    }

    console.log('✅ Jobs page content loaded');
}

/**
 * Load Workshop Diary page content
 */
function loadWorkshopDiaryPage() {
    console.log('📅 Loading Workshop Diary page...');

    const container = document.getElementById('workshop-diary-container');
    if (!container) {
        console.error('❌ Workshop diary container not found');
        return;
    }

    // Initialize workshop diary if class exists
    if (typeof WorkshopDiary !== 'undefined') {
        if (!window.workshopDiary) {
            window.workshopDiary = new WorkshopDiary();
        }
    } else {
        console.warn('⚠️ WorkshopDiary class not found');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-calendar-alt"></i>
                    Workshop Diary
                </h1>
                <p class="page-subtitle">Calendar and scheduling system</p>
            </div>
            <div class="card">
                <div class="card-content">
                    <p>Workshop Diary functionality is loading...</p>
                </div>
            </div>
        `;
    }

    console.log('✅ Workshop Diary page loaded');
}

/**
 * Load Job Sheets page content
 */
function loadJobSheetsPage() {
    console.log('📋 Loading Job Sheets page...');

    const container = document.getElementById('job-sheets-container');
    if (!container) {
        console.error('❌ Job sheets container not found');
        return;
    }

    // Initialize job sheets if class exists
    if (typeof JobSheetsManager !== 'undefined') {
        if (!window.jobSheetsManager) {
            window.jobSheetsManager = new JobSheetsManager();
        }
    } else {
        console.warn('⚠️ JobSheetsManager class not found');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-clipboard-list"></i>
                    Job Sheets
                </h1>
                <p class="page-subtitle">Digital job sheets and templates</p>
            </div>
            <div class="card">
                <div class="card-content">
                    <p>Job Sheets functionality is loading...</p>
                </div>
            </div>
        `;
    }

    console.log('✅ Job Sheets page loaded');
}

/**
 * Load MOT Reminders page content
 */
function loadMOTRemindersPage() {
    console.log('🚗 Loading MOT Reminders page...');

    // The MOT page now has a static structure, just load the data
    loadMOTData();

    // Initialize MOT page functionality
    initializeMOTPageFunctionality();
}

/**
 * Load MOT data from API
 */
async function loadMOTData() {
    try {
        console.log('🔄 Loading MOT data...');

        // Try the integrated MOT API first
        let response = await fetch('/api/mot/vehicles');

        // If that fails, try the standalone MOT service
        if (!response.ok) {
            response = await fetch('/mot/api/vehicles');
        }

        if (response.ok) {
            const result = await response.json();

            if (result && result.success && result.vehicles) {
                console.log(`✅ Found ${result.vehicles.length} MOT vehicles`);
                displayMOTVehicles(result.vehicles);
                updateMOTStats(result.vehicles);
            } else {
                console.log('ℹ️ No MOT data available');
                displayEmptyMOTState();
            }
        } else {
            console.log('ℹ️ MOT service not available, showing empty state');
            displayEmptyMOTState();
        }
    } catch (error) {
        console.error('Failed to load MOT data:', error);
        displayEmptyMOTState();
    }
}

/**
 * Initialize MOT page functionality
 */
function initializeMOTPageFunctionality() {
    // Initialize filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            filterMOTVehicles(filter);
        });
    });

    // Initialize search
    const searchInput = document.getElementById('mot-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchMOTVehicles(e.target.value);
        });
    }

    // Initialize refresh button
    const refreshBtn = document.getElementById('refresh-mot-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadMOTData);
    }

    // Initialize select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-mot');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#mot-vehicles-table input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateSendRemindersButton();
        });
    }

    // Initialize send reminders button
    const sendRemindersBtn = document.getElementById('send-reminders');
    if (sendRemindersBtn) {
        sendRemindersBtn.addEventListener('click', sendBulkReminders);
    }

    console.log('✅ MOT page functionality initialized');
}

/**
 * Display MOT vehicles in the table
 */
function displayMOTVehicles(vehicles) {
    const tableBody = document.getElementById('mot-vehicles-table');
    if (!tableBody) return;

    if (!vehicles || vehicles.length === 0) {
        displayEmptyMOTState();
        return;
    }

    tableBody.innerHTML = vehicles.map(vehicle => `
        <tr data-registration="${vehicle.registration}">
            <td>
                <input type="checkbox" class="vehicle-checkbox" value="${vehicle.registration}">
            </td>
            <td><strong>${vehicle.registration}</strong></td>
            <td>${vehicle.customer_name || 'Unknown'}</td>
            <td>${vehicle.make} ${vehicle.model || ''}</td>
            <td>${formatDate(vehicle.mot_expiry_date)}</td>
            <td class="days-remaining ${getDaysRemainingClass(vehicle.days_until_expiry)}">
                ${vehicle.days_until_expiry} days
            </td>
            <td>
                <span class="status-badge ${getStatusClass(vehicle.days_until_expiry)}">
                    ${getStatusText(vehicle.days_until_expiry)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="sendSingleReminder('${vehicle.registration}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Add event listeners to checkboxes
    const checkboxes = tableBody.querySelectorAll('.vehicle-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateSendRemindersButton);
    });
}

/**
 * Display empty state when no MOT data
 */
function displayEmptyMOTState() {
    const tableBody = document.getElementById('mot-vehicles-table');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-car"></i>
                        <h4>No MOT vehicles found</h4>
                        <p>Upload vehicle data to start monitoring MOT expiry dates</p>
                        <button class="btn btn-primary" onclick="showPage('settings'); setTimeout(() => document.querySelector('[data-tab=data-upload]').click(), 100)">
                            <i class="fas fa-upload"></i>
                            Upload Vehicle Data
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Reset stats
    updateMOTStats([]);
}

/**
 * Update MOT statistics
 */
function updateMOTStats(vehicles) {
    const stats = {
        expired: vehicles.filter(v => v.days_until_expiry < 0).length,
        dueSoon: vehicles.filter(v => v.days_until_expiry >= 0 && v.days_until_expiry <= 7).length,
        dueMonth: vehicles.filter(v => v.days_until_expiry > 7 && v.days_until_expiry <= 30).length,
        valid: vehicles.filter(v => v.days_until_expiry > 30).length,
        total: vehicles.length
    };

    // Update stat cards
    const elements = {
        'expired-count': stats.expired,
        'due-soon-count': stats.dueSoon,
        'due-month-count': stats.dueMonth,
        'valid-count': stats.valid,
        'all-count': stats.total,
        'expired-filter-count': stats.expired,
        'critical-count': stats.expired + stats.dueSoon,
        'due-soon-filter-count': stats.dueSoon,
        'valid-filter-count': stats.valid
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

/**
 * Helper functions for MOT display
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function getDaysRemainingClass(days) {
    if (days < 0) return 'expired';
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'valid';
}

function getStatusClass(days) {
    if (days < 0) return 'status-expired';
    if (days <= 7) return 'status-critical';
    if (days <= 30) return 'status-warning';
    return 'status-valid';
}

function getStatusText(days) {
    if (days < 0) return 'Expired';
    if (days <= 7) return 'Critical';
    if (days <= 30) return 'Due Soon';
    return 'Valid';
}

/**
 * Filter MOT vehicles
 */
function filterMOTVehicles(filter) {
    const rows = document.querySelectorAll('#mot-vehicles-table tr[data-registration]');

    rows.forEach(row => {
        const daysCell = row.querySelector('.days-remaining');
        if (!daysCell) return;

        const days = parseInt(daysCell.textContent);
        let show = false;

        switch (filter) {
            case 'all':
                show = true;
                break;
            case 'expired':
                show = days < 0;
                break;
            case 'critical':
                show = days < 0 || days <= 7;
                break;
            case 'due-soon':
                show = days >= 0 && days <= 7;
                break;
            case 'valid':
                show = days > 30;
                break;
        }

        row.style.display = show ? '' : 'none';
    });
}

/**
 * Search MOT vehicles
 */
function searchMOTVehicles(searchTerm) {
    const rows = document.querySelectorAll('#mot-vehicles-table tr[data-registration]');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

/**
 * Update send reminders button state
 */
function updateSendRemindersButton() {
    const checkboxes = document.querySelectorAll('#mot-vehicles-table .vehicle-checkbox:checked');
    const sendBtn = document.getElementById('send-reminders');

    if (sendBtn) {
        sendBtn.disabled = checkboxes.length === 0;
        sendBtn.textContent = checkboxes.length > 0
            ? `Send SMS Reminders (${checkboxes.length})`
            : 'Send SMS Reminders';
    }
}

/**
 * Send single reminder
 */
function sendSingleReminder(registration) {
    console.log('📱 Sending reminder for:', registration);
    showNotification(`Sending reminder for ${registration}...`, 'info');
    // TODO: Implement actual SMS sending
}

/**
 * Send bulk reminders
 */
function sendBulkReminders() {
    const checkboxes = document.querySelectorAll('#mot-vehicles-table .vehicle-checkbox:checked');
    const registrations = Array.from(checkboxes).map(cb => cb.value);

    if (registrations.length === 0) {
        showNotification('Please select vehicles to send reminders', 'warning');
        return;
    }

    console.log('📱 Sending bulk reminders for:', registrations);
    showNotification(`Sending reminders for ${registrations.length} vehicles...`, 'info');
    // TODO: Implement actual bulk SMS sending
}

/**
 * Load Quotes page content
 */
function loadQuotesPage() {
    console.log('💰 Loading Quotes page...');

    const container = document.getElementById('quotes-container');
    if (!container) {
        console.error('❌ Quotes container not found');
        return;
    }

    const quotesHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-file-invoice-dollar"></i>
                    Quotes
                </h1>
                <p class="page-subtitle">Manage estimates and quotations</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewQuoteModal()">
                    <i class="fas fa-plus"></i>
                    New Quote
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-list"></i>
                Recent Quotes
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Quote #</th>
                                <th>Customer</th>
                                <th>Vehicle</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="quotes-table-body">
                            <tr>
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-spinner"></div>
                                    <p>Loading quotes...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = quotesHTML;

    // Load quotes data
    if (typeof loadQuotesFromAPI === 'function') {
        loadQuotesFromAPI();
    } else {
        console.warn('⚠️ loadQuotesFromAPI function not found');
    }

    console.log('✅ Quotes page loaded');
}

/**
 * Load Online Booking page content
 */
function loadOnlineBookingPage() {
    console.log('🌐 Loading Online Booking page...');

    const container = document.getElementById('online-booking-container');
    if (!container) {
        console.error('❌ Online booking container not found');
        return;
    }

    // Initialize online booking if class exists
    if (typeof OnlineBooking !== 'undefined') {
        if (!window.onlineBooking) {
            window.onlineBooking = new OnlineBooking();
        }
    } else {
        console.warn('⚠️ OnlineBooking class not found');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-calendar-plus"></i>
                    Online Booking
                </h1>
                <p class="page-subtitle">Customer booking management</p>
            </div>
            <div class="card">
                <div class="card-content">
                    <p>Online Booking functionality is loading...</p>
                </div>
            </div>
        `;
    }

    console.log('✅ Online Booking page loaded');
}

/**
 * Load Customer Portal page content
 */
function loadCustomerPortalPage() {
    console.log('👥 Loading Customer Portal page...');

    const container = document.getElementById('customer-portal-container');
    if (!container) {
        console.error('❌ Customer portal container not found');
        return;
    }

    const portalHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-user-circle"></i>
                    Customer Portal
                </h1>
                <p class="page-subtitle">Customer self-service portal management</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-cog"></i>
                Portal Configuration
            </div>
            <div class="card-content">
                <p>Customer portal settings and configuration options will be available here.</p>
                <div class="btn-group">
                    <button class="btn btn-primary">
                        <i class="fas fa-link"></i>
                        Portal Link
                    </button>
                    <button class="btn btn-secondary">
                        <i class="fas fa-cog"></i>
                        Settings
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = portalHTML;
    console.log('✅ Customer Portal page loaded');
}

/**
 * Load Parts page content
 */
function loadPartsPage() {
    console.log('🔧 Loading Parts page...');

    // Parts page has static content in HTML, just log that it's loaded
    console.log('✅ Parts page loaded (static content)');
}

/**
 * Load Invoices page content
 */
function loadInvoicesPage() {
    console.log('📄 Loading Invoices page...');

    const invoicesContent = document.getElementById('invoices-content');
    if (!invoicesContent) {
        console.error('❌ Invoices content container not found');
        return;
    }

    const invoicesHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-file-invoice"></i>
                    Invoices
                </h1>
                <p class="page-subtitle">Manage billing and invoicing</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewInvoiceModal()">
                    <i class="fas fa-plus"></i>
                    New Invoice
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-list"></i>
                Recent Invoices
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Due Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="invoices-table-body">
                            <tr>
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-spinner"></div>
                                    <p>Loading invoices...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    invoicesContent.innerHTML = invoicesHTML;

    // Load invoices data
    if (typeof loadInvoicesFromAPI === 'function') {
        loadInvoicesFromAPI();
    } else {
        console.warn('⚠️ loadInvoicesFromAPI function not found');
    }

    console.log('✅ Invoices page loaded');
}

/**
 * Load Reports page content
 */
function loadReportsPage() {
    console.log('📊 Loading Reports page...');

    // Reports page has static content in HTML, just log that it's loaded
    console.log('✅ Reports page loaded (static content)');
}

/**
 * Load Upload page content
 */
function loadUploadPage() {
    console.log('📤 Loading Upload page...');

    const uploadContent = document.getElementById('upload-content');
    if (!uploadContent) {
        console.error('❌ Upload content container not found');
        return;
    }

    // Load upload functionality
    if (typeof loadUploadStatus === 'function') {
        loadUploadStatus();
    } else {
        console.warn('⚠️ loadUploadStatus function not found');
    }

    console.log('✅ Upload page loaded');
}

/**
 * Load Error Monitoring page content
 */
function loadErrorMonitoringPage() {
    console.log('🔍 Loading Error Monitoring page...');

    // Load error monitoring content
    loadErrorMonitoringContent();

    console.log('✅ Error Monitoring page loaded');
}

    // Create MOT reminders page HTML content
    const motHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-car-crash"></i>
                    MOT Reminders
                </h1>
                <p class="page-subtitle">Monitor vehicle MOT expiry dates and send reminders</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openAddVehicleModal()">
                    <i class="fas fa-plus"></i>
                    Add Vehicle
                </button>
                <button class="btn btn-secondary" onclick="refreshMOTData()">
                    <i class="fas fa-sync"></i>
                    Refresh Data
                </button>
            </div>
        </div>

        <!-- MOT Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon expired">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-info">
                    <h3 id="expired-count">0</h3>
                    <p>Expired MOTs</p>
                    <small>Immediate attention</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon critical">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3 id="critical-count">0</h3>
                    <p>Due Soon</p>
                    <small>Within 7 days</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="stat-info">
                    <h3 id="due-soon-count">0</h3>
                    <p>Due This Month</p>
                    <small>8-30 days</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon valid">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3 id="valid-count">0</h3>
                    <p>Valid MOTs</p>
                    <small>Over 30 days</small>
                </div>
            </div>
        </div>

        <!-- Filter Buttons -->
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <h3>Vehicle MOT Status</h3>
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-secondary active" data-filter="all" onclick="filterMOTVehicles('all')">
                            All Vehicles
                        </button>
                        <button class="btn btn-sm btn-danger" data-filter="expired" onclick="filterMOTVehicles('expired')">
                            Expired
                        </button>
                        <button class="btn btn-sm btn-warning" data-filter="critical" onclick="filterMOTVehicles('critical')">
                            Critical
                        </button>
                        <button class="btn btn-sm btn-info" data-filter="due_soon" onclick="filterMOTVehicles('due_soon')">
                            Due Soon
                        </button>
                        <button class="btn btn-sm btn-success" data-filter="valid" onclick="filterMOTVehicles('valid')">
                            Valid
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Registration</th>
                                <th>Customer</th>
                                <th>Make/Model</th>
                                <th>MOT Expiry</th>
                                <th>Days Remaining</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="mot-vehicles-table-body">
                            <tr>
                                <td colspan="7" class="text-center py-4">
                                    <div class="loading-spinner"></div>
                                    <p>Loading MOT data...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div id="mot-pagination" class="pagination-container"></div>
            </div>
        </div>

        <!-- SMS Sending Section -->
        <div class="card">
            <div class="card-header">
                <h3>
                    <i class="fas fa-sms"></i>
                    Send MOT Reminders
                </h3>
            </div>
            <div class="card-content">
                <div class="flex gap-4 items-center">
                    <div class="flex-1">
                        <p class="text-sm text-gray-600 mb-2">
                            Select vehicles from the table above to send SMS reminders
                        </p>
                        <div id="selected-vehicles-info" class="text-sm text-blue-600">
                            No vehicles selected
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary" onclick="selectAllExpired()">
                            Select All Expired
                        </button>
                        <button class="btn btn-primary" onclick="sendSelectedReminders()" disabled id="send-reminders-btn">
                            <i class="fas fa-paper-plane"></i>
                            Send Reminders
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Insert the HTML content
    motContent.innerHTML = motHTML;

    // Load MOT data
    loadMOTData();

    console.log('✅ MOT Reminders page content loaded');
}

/**
 * Show MOT error
 */
function showMOTError(message) {
    const tbody = document.getElementById('mot-vehicles-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8">
                    <div class="text-red-500">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>${message}</p>
                        <button class="btn btn-secondary mt-2" onclick="loadMOTData()">
                            Try Again
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Load customers data from API
 */
async function loadCustomersData() {
    try {
        console.log('🔄 Loading customers data...');

        const response = await fetch('/api/customers');
        const result = await response.json();

        if (result && result.customers) {
            console.log(`✅ Found ${result.customers.length} customers`);
            displayCustomersInTable(result.customers);
            updateCustomerStats(result.customers);
        } else {
            console.error('❌ No customers data in response:', result);
            showCustomersError('No customer data available');
        }
    } catch (error) {
        console.error('Failed to load customers:', error);
        showCustomersError('Failed to load customer data');
    }
}

/**
 * Display customers in the table
 */
function displayCustomersInTable(customers) {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <div class="text-gray-500">
                        <i class="fas fa-users text-2xl mb-2"></i>
                        <p>No customers found</p>
                        <button class="btn btn-primary mt-2" onclick="openAddCustomerModal()">
                            Add First Customer
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = customers.slice(0, 50).map(customer => `
        <tr class="hover:bg-gray-50">
            <td><strong>${customer.account_number || 'N/A'}</strong></td>
            <td>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-medium">${customer.name || 'N/A'}</div>
                        <div class="text-sm text-gray-500">ID: ${customer.id}</div>
                    </div>
                </div>
            </td>
            <td>${customer.company || '-'}</td>
            <td>
                <div class="text-sm">
                    ${customer.phone ? `<div><i class="fas fa-phone text-gray-400"></i> ${customer.phone}</div>` : ''}
                    ${customer.mobile ? `<div><i class="fas fa-mobile text-gray-400"></i> ${customer.mobile}</div>` : ''}
                    ${customer.email ? `<div><i class="fas fa-envelope text-gray-400"></i> ${customer.email}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="text-sm">
                    ${customer.address ? `<div>${customer.address}</div>` : ''}
                    ${customer.postcode ? `<div class="text-gray-500">${customer.postcode}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="flex gap-1">
                    <button class="btn btn-sm btn-secondary" onclick="viewCustomer(${customer.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editCustomer(${customer.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Show pagination info if there are more than 50 customers
    if (customers.length > 50) {
        const paginationContainer = document.getElementById('customers-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = `
                <p class="text-sm text-gray-500 text-center mt-4">
                    Showing 50 of ${customers.length} customers
                    <button class="btn btn-sm btn-secondary ml-2" onclick="loadAllCustomers()">
                        Load All
                    </button>
                </p>
            `;
        }
    }
}

/**
 * Update customer statistics
 */
function updateCustomerStats(customers) {
    const totalCount = customers.length;
    const activeCount = customers.filter(c => c.created_date && new Date(c.created_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).length;
    const newCount = customers.filter(c => c.created_date && new Date(c.created_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;

    // Update stat cards
    const totalElement = document.getElementById('total-customers-count');
    const activeElement = document.getElementById('active-customers-count');
    const newElement = document.getElementById('new-customers-count');

    if (totalElement) totalElement.textContent = totalCount.toLocaleString();
    if (activeElement) activeElement.textContent = activeCount.toLocaleString();
    if (newElement) newElement.textContent = newCount.toLocaleString();
}

/**
 * Show customers error
 */
function showCustomersError(message) {
    const tbody = document.getElementById('customers-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <div class="text-red-500">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>${message}</p>
                        <button class="btn btn-secondary mt-2" onclick="loadCustomersData()">
                            Try Again
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Load dashboard content
 */
function loadDashboardContent() {
    console.log('📊 Loading dashboard content...');

    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent) {
        console.error('❌ Dashboard content container not found');
        console.log('🔍 Available elements with "dashboard" in ID:',
            Array.from(document.querySelectorAll('[id*="dashboard"]')).map(el => el.id));
        return;
    }

    console.log('✅ Dashboard content container found:', dashboardContent);

    // Create dashboard HTML content
    const dashboardHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <i class="fas fa-chart-line"></i>
                    Dashboard
                </h1>
                <p class="page-subtitle">Overview of your garage management system</p>
            </div>
        </div>

        <!-- Dashboard Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon customers">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3 id="total-customers">0</h3>
                    <p>Customers</p>
                    <small>Total registered</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon vehicles">
                    <i class="fas fa-car"></i>
                </div>
                <div class="stat-info">
                    <h3 id="total-vehicles">0</h3>
                    <p>Vehicles</p>
                    <small>In database</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon revenue">
                    <i class="fas fa-pound-sign"></i>
                </div>
                <div class="stat-info">
                    <h3 id="total-revenue">£0.00</h3>
                    <p>Total Revenue</p>
                    <small>All time</small>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon jobs">
                    <i class="fas fa-tools"></i>
                </div>
                <div class="stat-info">
                    <h3 id="total-jobs">0</h3>
                    <p>Jobs</p>
                    <small>Completed</small>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
            <h3>
                <i class="fas fa-bolt"></i>
                Quick Actions
            </h3>
            <div class="quick-actions-grid">
                <a href="#" class="quick-action-btn" onclick="showPage('customers')">
                    <i class="fas fa-user-plus"></i>
                    <span>Add Customer</span>
                </a>
                <a href="#" class="quick-action-btn" onclick="showPage('vehicles')">
                    <i class="fas fa-car"></i>
                    <span>Add Vehicle</span>
                </a>
                <a href="#" class="quick-action-btn" onclick="showPage('jobs')">
                    <i class="fas fa-plus"></i>
                    <span>New Job</span>
                </a>
                <a href="#" class="quick-action-btn" onclick="showPage('invoices')">
                    <i class="fas fa-file-invoice"></i>
                    <span>Create Invoice</span>
                </a>
                <a href="#" class="quick-action-btn" onclick="showPage('mot-reminders')">
                    <i class="fas fa-car-crash"></i>
                    <span>MOT Reminders</span>
                </a>
                <a href="#" class="quick-action-btn" onclick="showPage('workshop-diary')">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Workshop Diary</span>
                </a>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
            <div class="card-header">
                <i class="fas fa-clock"></i>
                Recent Activity
            </div>
            <div class="card-content">
                <p id="recent-activity-content">Loading recent activity...</p>
            </div>
        </div>
    `;

    // Insert the HTML content
    dashboardContent.innerHTML = dashboardHTML;
    console.log('✅ Dashboard HTML inserted, content length:', dashboardHTML.length);

    // Safari 19 specific visibility fixes
    const isSafari19 = navigator.userAgent.includes('Version/19');
    if (isSafari19) {
        console.log('🍎 Applying Safari 19 specific visibility fixes');

        // Force immediate repaint for Safari 19
        dashboardContent.style.transform = 'translateZ(0)';
        dashboardContent.style.willChange = 'transform';

        // Use requestAnimationFrame for Safari 19 to ensure proper rendering
        requestAnimationFrame(() => {
            dashboardContent.style.display = 'block';
            dashboardContent.style.opacity = '1';
            dashboardContent.style.visibility = 'visible';

            const dashboardPage = document.getElementById('dashboard');
            if (dashboardPage) {
                dashboardPage.style.display = 'block';
                dashboardPage.style.opacity = '1';
                dashboardPage.style.visibility = 'visible';
                dashboardPage.style.transform = 'translateZ(0)';
                console.log('🍎 Safari 19: Dashboard forced visible with hardware acceleration');
            }
        });
    } else {
        // Standard visibility for other browsers
        dashboardContent.style.display = 'block';
        dashboardContent.style.opacity = '1';

        // Ensure parent page is visible
        const dashboardPage = document.getElementById('dashboard');
        if (dashboardPage) {
            dashboardPage.style.display = 'block';
            dashboardPage.style.opacity = '1';
            console.log('✅ Dashboard page forced visible');
        }
    }

    // Load dashboard statistics with a small delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
        } else {
            console.log('📊 loadDashboardStats function not found, loading stats manually');
            loadDashboardStatsManually();
        }
    }, 100);

    console.log('✅ Dashboard content loaded');
}

/**
 * Manual dashboard stats loading as fallback
 */
async function loadDashboardStatsManually() {
    try {
        console.log('📊 Loading dashboard stats manually...');

        const response = await fetch('/api/stats');
        if (response.ok) {
            const data = await response.json();

            if (data && data.success && data.stats) {
                const stats = data.stats;

                // Update the stat values
                const updateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value;
                        console.log(`✅ Updated ${id} to ${value}`);
                    } else {
                        console.warn(`⚠️ Element ${id} not found`);
                    }
                };

                updateElement('total-customers', stats.customers || 0);
                updateElement('total-vehicles', stats.vehicles || 0);
                updateElement('total-revenue', stats.revenue || '£0.00');
                updateElement('total-jobs', stats.jobs || 0);

                console.log('✅ Dashboard stats loaded manually');
            } else {
                console.warn('⚠️ Invalid stats data format:', data);
            }
        } else {
            console.warn('⚠️ Stats API not available:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading dashboard stats manually:', error);

        // Show placeholder data
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        updateElement('total-customers', '0');
        updateElement('total-vehicles', '0');
        updateElement('total-revenue', '£0.00');
        updateElement('total-jobs', '0');
    }
}

/**
 * Load settings page with proper tab activation
 */
function loadSettingsPage() {
    console.log('🔧 Loading settings page...');

    // Initialize settings tabs
    initializeSettingsTabs();

    // Initialize upload functionality
    initializeUploadFunctionality();

    // Load Google Drive content
    loadGoogleDriveContent();

    // Load error monitoring content
    loadErrorMonitoringContent();

    console.log('✅ Settings page loaded');
}

/**
 * Initialize settings tabs functionality
 */
function initializeSettingsTabs() {
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            console.log(`🔄 Switched to ${targetTab} tab`);
        });
    });
}

/**
 * Initialize upload functionality
 */
function initializeUploadFunctionality() {
    // MOT Upload
    initializeDropZone('mot-drop-zone', 'mot-file-input', 'upload-mot-btn', handleMOTUpload);

    // Customer Upload
    initializeDropZone('customer-drop-zone', 'customer-file-input', 'upload-customer-btn', handleCustomerUpload);
}

/**
 * Initialize drag and drop functionality for upload zones
 */
function initializeDropZone(dropZoneId, fileInputId, uploadBtnId, uploadHandler) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    const uploadBtn = document.getElementById(uploadBtnId);

    if (!dropZone || !fileInput || !uploadBtn) return;

    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            uploadBtn.disabled = false;
            updateDropZoneDisplay(dropZone, files[0].name);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadBtn.disabled = false;
            updateDropZoneDisplay(dropZone, e.target.files[0].name);
        }
    });

    // Upload button click
    uploadBtn.addEventListener('click', () => {
        if (fileInput.files.length > 0) {
            uploadHandler(fileInput.files[0]);
        }
    });
}

/**
 * Update drop zone display when file is selected
 */
function updateDropZoneDisplay(dropZone, fileName) {
    const content = dropZone.querySelector('.drop-zone-content');
    content.innerHTML = `
        <i class="fas fa-file-check" style="color: var(--success-500);"></i>
        <p><strong>File selected: ${fileName}</strong></p>
        <p class="text-muted">Click upload button to proceed</p>
    `;
}

/**
 * Handle MOT file upload
 */
async function handleMOTUpload(file) {
    console.log('📤 Uploading MOT file:', file.name);

    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
        showNotification('Please select a CSV or Excel file (.csv, .xlsx, .xls)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        showNotification('Uploading MOT data...', 'info');

        // Try the MOT service endpoint
        const response = await fetch('/mot/upload_file', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            try {
                const result = await response.json();

                if (result.success) {
                    showNotification('MOT data uploaded successfully!', 'success');
                    // Refresh MOT data if on MOT page
                    if (typeof loadMOTData === 'function') {
                        loadMOTData();
                    }
                } else {
                    showNotification(result.error || 'Upload failed', 'error');
                }
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                showNotification('Upload completed but response format was unexpected', 'warning');
            }
        } else {
            // MOT service not available, show helpful message
            showNotification('MOT upload service is not currently available. Please try the manual upload process.', 'warning');
        }
    } catch (error) {
        console.error('Upload error:', error);
        if (error.name === 'TypeError' && error.message.includes('Load failed')) {
            showNotification('MOT upload service is not available. Please check if the MOT service is running.', 'warning');
        } else {
            showNotification('Upload failed: ' + error.message, 'error');
        }
    }
}

/**
 * Handle customer file upload
 */
async function handleCustomerUpload(file) {
    console.log('📤 Uploading customer file:', file.name);

    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
        showNotification('Please select a CSV or Excel file (.csv, .xlsx, .xls)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('table_mapping', 'customers');

    try {
        showNotification('Uploading customer data...', 'info');

        const response = await fetch('/upload/process', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            try {
                const result = await response.json();

                if (result.success) {
                    showNotification('Customer data uploaded successfully!', 'success');
                    // Refresh customer data if on customers page
                    if (typeof loadCustomersFromAPI === 'function') {
                        loadCustomersFromAPI();
                    }
                } else {
                    showNotification(result.error || 'Upload failed', 'error');
                }
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                showNotification('Upload completed but response format was unexpected', 'warning');
            }
        } else {
            showNotification('Customer upload service is not available. Please try again later.', 'warning');
        }
    } catch (error) {
        console.error('Upload error:', error);
        if (error.name === 'TypeError' && error.message.includes('Load failed')) {
            showNotification('Customer upload service is not available. Please check your connection.', 'warning');
        } else {
            showNotification('Upload failed: ' + error.message, 'error');
        }
    }
}

/**
 * Load Google Drive content in the same window
 */
function loadGoogleDriveContent() {
    const container = document.getElementById('google-drive-content');
    if (container) {
        // Create simplified Google Drive interface inline
        container.innerHTML = `
            <div class="google-drive-interface">
                <div class="connection-status">
                    <div class="status-card">
                        <div class="status-header">
                            <i class="fas fa-plug"></i>
                            <h4>Connection Status</h4>
                        </div>
                        <div class="status-body">
                            <div class="status-indicator status-disconnected">
                                <i class="fas fa-times-circle"></i>
                                Not Connected
                            </div>
                            <p class="status-description">Connect your Google Drive account to enable automatic file synchronization</p>
                            <button class="btn btn-primary" onclick="connectGoogleDrive()">
                                <i class="fab fa-google-drive"></i>
                                Connect Google Drive
                            </button>
                        </div>
                    </div>
                </div>

                <div class="folder-configuration">
                    <div class="config-card">
                        <div class="config-header">
                            <i class="fas fa-folder-open"></i>
                            <h4>Folder Configuration</h4>
                        </div>
                        <div class="config-body">
                            <p class="config-description">Configure which Google Drive folders contain your data files</p>

                            <div class="folder-mappings">
                                <div class="folder-mapping">
                                    <div class="mapping-header">
                                        <i class="fas fa-users"></i>
                                        <span>Customer Data</span>
                                    </div>
                                    <div class="mapping-path">
                                        <input type="text" class="form-control" placeholder="Select Google Drive folder..." readonly>
                                        <button class="btn btn-outline-primary" disabled>
                                            <i class="fas fa-folder"></i>
                                            Browse
                                        </button>
                                    </div>
                                </div>

                                <div class="folder-mapping">
                                    <div class="mapping-header">
                                        <i class="fas fa-car"></i>
                                        <span>Vehicle Data</span>
                                    </div>
                                    <div class="mapping-path">
                                        <input type="text" class="form-control" placeholder="Select Google Drive folder..." readonly>
                                        <button class="btn btn-outline-primary" disabled>
                                            <i class="fas fa-folder"></i>
                                            Browse
                                        </button>
                                    </div>
                                </div>

                                <div class="folder-mapping">
                                    <div class="mapping-header">
                                        <i class="fas fa-calendar-check"></i>
                                        <span>MOT Data</span>
                                    </div>
                                    <div class="mapping-path">
                                        <input type="text" class="form-control" placeholder="Select Google Drive folder..." readonly>
                                        <button class="btn btn-outline-primary" disabled>
                                            <i class="fas fa-folder"></i>
                                            Browse
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="sync-settings">
                                <h5>Sync Settings</h5>
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" disabled>
                                        Auto-sync every 30 minutes
                                    </label>
                                </div>
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" disabled>
                                        Email notifications on sync completion
                                    </label>
                                </div>
                            </div>

                            <div class="sync-actions">
                                <button class="btn btn-success" disabled>
                                    <i class="fas fa-sync"></i>
                                    Start Sync Now
                                </button>
                                <button class="btn btn-outline-secondary" disabled>
                                    <i class="fas fa-history"></i>
                                    View Sync History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        console.log('✅ Google Drive content loaded inline');
    }
}

/**
 * Connect to Google Drive (placeholder function)
 */
function connectGoogleDrive() {
    showNotification('Google Drive integration coming soon!', 'info');
    console.log('🔗 Google Drive connection requested');
}

/**
 * Load error monitoring content
 */
function loadErrorMonitoringContent() {
    const container = document.getElementById('error-monitoring-content');
    if (container) {
        // Create error monitoring dashboard
        container.innerHTML = `
            <div class="error-monitoring-dashboard">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="error-count">0</div>
                            <div class="stat-label">Total Errors</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="recent-errors">0</div>
                            <div class="stat-label">Last 24 Hours</div>
                        </div>
                    </div>
                </div>
                <div class="error-log">
                    <h4>Recent Errors</h4>
                    <div id="error-list">
                        <p class="text-muted">No recent errors</p>
                    </div>
                </div>
            </div>
        `;

        // Load error data if error monitoring is available
        if (window.errorMonitor) {
            updateErrorMonitoringDisplay();
        }
    }
}

/**
 * Update error monitoring display
 */
function updateErrorMonitoringDisplay() {
    if (window.errorMonitor && window.errorMonitor.getErrorStats) {
        const stats = window.errorMonitor.getErrorStats();

        const errorCountEl = document.getElementById('error-count');
        const recentErrorsEl = document.getElementById('recent-errors');

        if (errorCountEl) errorCountEl.textContent = stats.total || 0;
        if (recentErrorsEl) recentErrorsEl.textContent = stats.recent || 0;
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
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

    // Safari 19 specific checks
    const isSafari19 = navigator.userAgent.includes('Version/19');
    if (isSafari19) {
        console.log('🍎 Safari 19.0 detected - applying specific optimizations');

        // Safari 19 sometimes has timing issues with DOM manipulation
        // Force a small delay to ensure DOM is fully ready
        if (document.readyState !== 'complete') {
            console.log('🍎 Safari 19: DOM not complete, waiting...');
            setTimeout(() => initializeNavigation(), 100);
            return;
        }
    }

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
 * Customer action functions
 */
function openAddCustomerModal() {
    console.log('📝 Opening add customer modal...');
    // TODO: Implement add customer modal
    alert('Add customer functionality coming soon!');
}

function viewCustomer(customerId) {
    console.log('👁️ Viewing customer:', customerId);
    // TODO: Implement customer detail view
    alert(`View customer ${customerId} - functionality coming soon!`);
}

function editCustomer(customerId) {
    console.log('✏️ Editing customer:', customerId);
    // TODO: Implement customer editing
    alert(`Edit customer ${customerId} - functionality coming soon!`);
}

function deleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer?')) {
        console.log('🗑️ Deleting customer:', customerId);
        // TODO: Implement customer deletion
        alert(`Delete customer ${customerId} - functionality coming soon!`);
    }
}

function loadAllCustomers() {
    console.log('📄 Loading all customers...');
    // TODO: Implement pagination
    alert('Load all customers - functionality coming soon!');
}

/**
 * MOT action functions
 */
function openAddVehicleModal() {
    console.log('🚗 Opening add vehicle modal...');
    alert('Add vehicle functionality coming soon!');
}

function refreshMOTData() {
    console.log('🔄 Refreshing MOT data...');
    loadMOTData();
}

function filterMOTVehicles(filter) {
    console.log('🔍 Filtering MOT vehicles:', filter);
    // Update active filter button
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    // TODO: Implement filtering logic
    alert(`Filter by ${filter} - functionality coming soon!`);
}

function setupCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.vehicle-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedVehicles);
    });
}

function updateSelectedVehicles() {
    const selected = document.querySelectorAll('.vehicle-checkbox:checked');
    const count = selected.length;
    const info = document.getElementById('selected-vehicles-info');
    const sendBtn = document.getElementById('send-reminders-btn');

    if (count > 0) {
        info.textContent = `${count} vehicle${count > 1 ? 's' : ''} selected`;
        sendBtn.disabled = false;
    } else {
        info.textContent = 'No vehicles selected';
        sendBtn.disabled = true;
    }
}

function selectAllExpired() {
    console.log('🔴 Selecting all expired vehicles...');
    // TODO: Implement select all expired
    alert('Select all expired - functionality coming soon!');
}

function sendSelectedReminders() {
    const selected = document.querySelectorAll('.vehicle-checkbox:checked');
    const registrations = Array.from(selected).map(cb => cb.dataset.registration);
    console.log('📱 Sending reminders to:', registrations);
    alert(`Send reminders to ${registrations.length} vehicles - functionality coming soon!`);
}

function viewMOTDetails(registration) {
    console.log('👁️ Viewing MOT details for:', registration);
    alert(`View MOT details for ${registration} - functionality coming soon!`);
}

function sendSingleReminder(registration) {
    console.log('📱 Sending single reminder to:', registration);
    alert(`Send reminder to ${registration} - functionality coming soon!`);
}

function archiveVehicle(registration) {
    if (confirm(`Are you sure you want to archive ${registration}?`)) {
        console.log('🗄️ Archiving vehicle:', registration);
        alert(`Archive ${registration} - functionality coming soon!`);
    }
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

/**
 * Test all pages loading functionality
 */
window.testAllPages = function() {
    console.log('🧪 Testing all pages loading...');

    const pages = [
        'dashboard', 'customers', 'vehicles', 'jobs', 'workshop-diary',
        'job-sheets', 'quotes', 'online-booking', 'customer-portal',
        'mot-reminders', 'parts', 'invoices', 'reports', 'upload',
        'error-monitoring', 'settings'
    ];

    let currentIndex = 0;

    function testNextPage() {
        if (currentIndex >= pages.length) {
            console.log('✅ All pages tested successfully!');
            showPage('dashboard'); // Return to dashboard
            return;
        }

        const pageId = pages[currentIndex];
        console.log(`🔍 Testing page: ${pageId} (${currentIndex + 1}/${pages.length})`);

        try {
            showPage(pageId);
            console.log(`✅ Page ${pageId} loaded successfully`);
        } catch (error) {
            console.error(`❌ Error loading page ${pageId}:`, error);
        }

        currentIndex++;
        setTimeout(testNextPage, 1000); // Wait 1 second between tests
    }

    testNextPage();
};

// Export functions for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showPage: window.showPage,
        debugInterface: window.debugInterface,
        emergencyShowPage: window.emergencyShowPage,
        testAllPages: window.testAllPages,
        initializeNavigation
    };
}

// Make key functions globally available
window.loadDashboardContent = loadDashboardContent;
window.loadDashboardStatsManually = loadDashboardStatsManually;
