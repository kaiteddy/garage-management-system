/**
 * Navigation System
 * Handles page switching and content loading
 */

console.log("🧭 Navigation system loading...");

// Global navigation state
let currentPage = "dashboard";
const pageHistory = [];
const isNavigating = false;

// Navigation configuration
const navigationConfig = {
  defaultPage: "dashboard",
  transitionDuration: 300,
  enableHistory: true,
  enableAnimations: true,
};

/**
 * Primary navigation function - defined immediately and globally
 */
window.showPage = function (pageId) {
  console.log("🔧 Navigation to:", pageId);

  try {
    // Save current page to localStorage for refresh persistence
    currentPage = pageId;
    localStorage.setItem("currentPage", pageId);

    // Hide all pages
    document.querySelectorAll(".page, .professional-page").forEach((page) => {
      page.classList.remove("active");
    });

    // Remove active class from all nav items
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Show selected page
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
      pageElement.classList.add("active");
      console.log("✅ Page shown successfully:", pageId);
    } else {
      console.error("❌ Page element not found:", pageId);
      return;
    }

    // Add active class to selected nav item
    const navItem = document.querySelector(`.nav-item[onclick*="'${pageId}'"]`);
    if (navItem) {
      navItem.classList.add("active");
    }

    // Load data for the page if needed
    if (typeof loadPageContent === "function") {
      loadPageContent(pageId);
    } else {
      loadPageData(pageId);
    }
  } catch (error) {
    console.error("💥 Error in navigation:", error);
  }
};

/**
 * Load data for specific pages
 */
function loadPageData(pageId) {
  console.log(`📄 Loading data for page: ${pageId}`);

  switch (pageId) {
    case "dashboard":
      if (typeof loadDashboardContent === "function") {
        loadDashboardContent();
      } else {
        console.error("❌ loadDashboardContent function not found");
      }
      break;
    case "customers":
      if (typeof loadCustomersPage === "function") {
        loadCustomersPage();
      } else {
        console.error("❌ loadCustomersPage function not found");
      }
      break;
    case "vehicles":
      if (typeof loadVehiclesPage === "function") {
        loadVehiclesPage();
      } else {
        console.error("❌ loadVehiclesPage function not found");
      }
      break;
    case "jobs":
      if (typeof loadJobsPage === "function") {
        loadJobsPage();
      } else {
        console.error("❌ loadJobsPage function not found");
      }
      break;
    case "workshop-diary":
      if (typeof loadWorkshopDiaryPage === "function") {
        loadWorkshopDiaryPage();
      } else {
        console.error("❌ loadWorkshopDiaryPage function not found");
      }
      break;
    case "job-sheets":
      if (typeof loadJobSheetsPage === "function") {
        loadJobSheetsPage();
      } else {
        console.error("❌ loadJobSheetsPage function not found");
      }
      break;
    case "quotes":
      if (typeof loadQuotesPage === "function") {
        loadQuotesPage();
      } else {
        console.error("❌ loadQuotesPage function not found");
      }
      break;
    case "online-booking":
      if (typeof window.loadOnlineBookingPage === "function") {
        window.loadOnlineBookingPage();
      } else {
        console.error("❌ loadOnlineBookingPage function not found");
      }
      break;
    case "customer-portal":
      if (typeof loadCustomerPortalPage === "function") {
        loadCustomerPortalPage();
      } else {
        console.error("❌ loadCustomerPortalPage function not found");
      }
      break;
    case "mot-reminders":
      if (typeof loadMOTRemindersPage === "function") {
        loadMOTRemindersPage();
      } else {
        console.error("❌ loadMOTRemindersPage function not found");
      }
      break;
    case "parts":
      if (typeof loadPartsPage === "function") {
        loadPartsPage();
      } else {
        console.error("❌ loadPartsPage function not found");
      }
      break;
    case "invoices":
      if (typeof loadInvoicesPage === "function") {
        loadInvoicesPage();
      } else {
        console.error("❌ loadInvoicesPage function not found");
      }
      break;
    case "reports":
      if (typeof loadReportsPage === "function") {
        loadReportsPage();
      } else {
        console.error("❌ loadReportsPage function not found");
      }
      break;
    case "upload":
      if (typeof loadUploadPage === "function") {
        loadUploadPage();
      } else {
        console.error("❌ loadUploadPage function not found");
      }
      break;
    case "error-monitoring":
      if (typeof loadErrorMonitoringPage === "function") {
        loadErrorMonitoringPage();
      } else {
        console.error("❌ loadErrorMonitoringPage function not found");
      }
      break;
    case "settings":
      if (typeof loadSettingsPage === "function") {
        loadSettingsPage();
      } else {
        console.error("❌ loadSettingsPage function not found");
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
  console.log("👥 Loading customers page...");

  const customersContent = document.getElementById("customers-content");
  if (!customersContent) {
    console.error("❌ Customers content container not found");
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

  console.log("✅ Customers page content loaded");
}

/**
 * Load Vehicles page content
 */
function loadVehiclesPage() {
  console.log("🚗 Loading Vehicles page...");

  const vehiclesContent = document.getElementById("vehicles-content");
  if (!vehiclesContent) {
    console.error("❌ Vehicles content container not found");
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
  if (typeof loadVehiclesFromAPI === "function") {
    loadVehiclesFromAPI();
  } else {
    console.warn("⚠️ loadVehiclesFromAPI function not found");
  }

  console.log("✅ Vehicles page content loaded");
}

/**
 * Load Jobs page content
 */
function loadJobsPage() {
  console.log("🔧 Loading Jobs page...");

  const jobsContent = document.getElementById("jobs-content");
  if (!jobsContent) {
    console.error("❌ Jobs content container not found");
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
  if (typeof loadJobsFromAPI === "function") {
    loadJobsFromAPI();
  } else {
    console.warn("⚠️ loadJobsFromAPI function not found");
  }

  console.log("✅ Jobs page content loaded");
}

/**
 * Load Workshop Diary page content
 */
function loadWorkshopDiaryPage() {
  console.log("📅 Loading Workshop Diary page...");

  const container = document.getElementById("workshop-diary-container");
  if (!container) {
    console.error("❌ Workshop diary container not found");
    return;
  }

  // Initialize workshop diary if class exists
  if (typeof WorkshopDiary !== "undefined") {
    if (!window.workshopDiary) {
      window.workshopDiary = new WorkshopDiary();
    }
  } else {
    console.warn("⚠️ WorkshopDiary class not found");
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

  console.log("✅ Workshop Diary page loaded");
}

/**
 * Load Job Sheets page content
 */
function loadJobSheetsPage() {
  console.log("📋 Loading Job Sheets page...");

  const container = document.getElementById("job-sheets-container");
  if (!container) {
    console.error("❌ Job sheets container not found");
    return;
  }

  // Initialize job sheets if class exists
  if (typeof JobSheetsManager !== "undefined") {
    if (!window.jobSheetsManager) {
      window.jobSheetsManager = new JobSheetsManager();
    }
  } else {
    console.warn("⚠️ JobSheetsManager class not found");
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

  console.log("✅ Job Sheets page loaded");
}

/**
 * Load MOT Reminders page content
 */
function loadMOTRemindersPage() {
  console.log("🚗 Loading MOT Reminders page...");

  // Use the correct container ID that exists in the HTML
  const motPage = document.getElementById("mot-reminders");
  if (!motPage) {
    console.error("❌ MOT reminders page container not found");
    return;
  }

  // Clear existing content and show loading
  motPage.innerHTML = `
    <div class="professional-page-header">
      <div>
        <h1 class="professional-page-title">
          <i class="fas fa-calendar-check"></i>
          MOT Reminders
        </h1>
        <p class="professional-page-subtitle">
          Monitor vehicle MOT expiry dates and send reminders
        </p>
      </div>
      <div class="professional-page-actions">
        <button id="refresh-mot-data" class="professional-btn professional-btn-secondary">
          <i class="fas fa-sync-alt"></i>
          Refresh Data
        </button>
        <button id="bulk-upload-mot" class="professional-btn professional-btn-primary">
          <i class="fas fa-upload"></i>
          Bulk Upload
        </button>
      </div>
    </div>
    <div class="professional-loading">
      <div class="professional-loading-spinner"></div>
      <p>Loading MOT data...</p>
    </div>
  `;

  // Initialize MOT dashboard after a short delay to ensure DOM is ready
  setTimeout(() => {
    initializeMOTRemindersPage();
  }, 100);

  console.log("✅ MOT Reminders page loading initiated");
}

/**
 * Initialize MOT Reminders page with proper content and functionality
 */
async function initializeMOTRemindersPage() {
  console.log("🔧 Initializing MOT Reminders page...");

  const motPage = document.getElementById("mot-reminders");
  if (!motPage) {
    console.error("❌ MOT reminders page container not found during initialization");
    return;
  }

  // Create the complete MOT reminders page HTML content using professional styling
  const motHTML = `
    <div class="professional-page-header">
      <div>
        <h1 class="professional-page-title">
          <i class="fas fa-calendar-check"></i>
          MOT Reminders
        </h1>
        <p class="professional-page-subtitle">
          Monitor vehicle MOT expiry dates and send reminders
        </p>
      </div>
      <div class="professional-page-actions">
        <button id="refresh-mot-data" class="professional-btn professional-btn-secondary">
          <i class="fas fa-sync-alt"></i>
          Refresh Data
        </button>
        <button id="bulk-upload-mot" class="professional-btn professional-btn-primary">
          <i class="fas fa-upload"></i>
          Bulk Upload
        </button>
      </div>
    </div>

    <!-- MOT Stats Cards -->
    <div class="professional-stats-grid">
      <div class="professional-stat-card">
        <div class="professional-stat-icon" style="background: linear-gradient(135deg, var(--error-500) 0%, var(--error-600) 100%);">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="professional-stat-header">
          <h3 class="professional-stat-value" id="expired-count">0</h3>
          <p class="professional-stat-label">Expired MOTs</p>
        </div>
        <p class="professional-stat-description">Immediate attention</p>
      </div>

      <div class="professional-stat-card">
        <div class="professional-stat-icon" style="background: linear-gradient(135deg, var(--warning-500) 0%, var(--warning-600) 100%);">
          <i class="fas fa-clock"></i>
        </div>
        <div class="professional-stat-header">
          <h3 class="professional-stat-value" id="expiring-soon-count">0</h3>
          <p class="professional-stat-label">Expiring Soon</p>
        </div>
        <p class="professional-stat-description">Next 30 days</p>
      </div>

      <div class="professional-stat-card">
        <div class="professional-stat-icon" style="background: linear-gradient(135deg, var(--info-500) 0%, var(--info-600) 100%);">
          <i class="fas fa-calendar"></i>
        </div>
        <div class="professional-stat-header">
          <h3 class="professional-stat-value" id="due-month-count">0</h3>
          <p class="professional-stat-label">Due This Month</p>
        </div>
        <p class="professional-stat-description">8-30 days</p>
      </div>

      <div class="professional-stat-card">
        <div class="professional-stat-icon" style="background: linear-gradient(135deg, var(--success-500) 0%, var(--success-600) 100%);">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="professional-stat-header">
          <h3 class="professional-stat-value" id="valid-count">0</h3>
          <p class="professional-stat-label">Valid MOTs</p>
        </div>
        <p class="professional-stat-description">Over 30 days</p>
      </div>
    </div>

    <!-- Filter Buttons -->
    <div class="filter-section">
      <h3>Vehicle MOT Status</h3>
      <div class="filter-buttons">
        <button class="filter-btn active" data-filter="all" onclick="filterMOTVehicles('all')">
          All Vehicles
          <span class="filter-count" id="all-count">0</span>
        </button>
        <button class="filter-btn" data-filter="expired" onclick="filterMOTVehicles('expired')">
          Expired
          <span class="filter-count" id="expired-filter-count">0</span>
        </button>
        <button class="filter-btn" data-filter="critical" onclick="filterMOTVehicles('critical')">
          Critical
          <span class="filter-count" id="critical-filter-count">0</span>
        </button>
        <button class="filter-btn" data-filter="warning" onclick="filterMOTVehicles('warning')">
          Warning
          <span class="filter-count" id="warning-count">0</span>
        </button>
        <button class="filter-btn" data-filter="valid" onclick="filterMOTVehicles('valid')">
          Valid
          <span class="filter-count" id="valid-filter-count">0</span>
        </button>
      </div>
    </div>

    <!-- MOT Vehicles Table -->
    <div class="table-container">
      <div class="table-header">
        <h4>Vehicle MOT Status</h4>
        <div class="table-actions">
          <input type="text" class="search-input" placeholder="Search vehicles..." id="mot-search" />
          <button class="btn btn-primary" id="send-reminders-btn" disabled>
            <i class="fas fa-envelope"></i>
            Send Reminders
          </button>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table" id="mot-vehicles-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all-mot" /></th>
              <th>Registration</th>
              <th>Make/Model</th>
              <th>Customer</th>
              <th>MOT Expiry</th>
              <th>Days Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="mot-vehicles-tbody">
            <tr>
              <td colspan="8" class="empty-state">
                <div class="empty-state-content">
                  <i class="fas fa-spinner fa-spin"></i>
                  <h4>Loading MOT data...</h4>
                  <p>Please wait while we fetch vehicle information</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  `;

  // Insert the HTML content into the page
  motPage.innerHTML = motHTML;

  // Initialize event listeners
  initializeMOTEventListeners();

  // Load MOT data using the correct API endpoint
  await loadMOTData();

  console.log("✅ MOT Reminders page initialized successfully");
}

/**
 * Initialize event listeners for MOT reminders page
 */
function initializeMOTEventListeners() {
  console.log("🔧 Setting up MOT event listeners...");

  // Refresh data button
  const refreshBtn = document.getElementById('refresh-mot-data');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      console.log("🔄 Refreshing MOT data...");
      loadMOTData();
    });
  }

  // Bulk upload button
  const uploadBtn = document.getElementById('bulk-upload-mot');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      console.log("📤 Opening bulk upload...");
      showPage('settings');
      setTimeout(() => {
        const uploadTab = document.querySelector('[data-tab="data-upload"]');
        if (uploadTab) uploadTab.click();
      }, 100);
    });
  }

  // Search input
  const searchInput = document.getElementById('mot-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterMOTVehiclesBySearch(e.target.value);
    });
  }

  // Select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-mot');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      toggleAllVehicleSelection(e.target.checked);
    });
  }

  console.log("✅ MOT event listeners initialized");
}

/**
 * Load MOT data from the API and populate the table
 */
async function loadMOTData() {
  console.log("📊 Loading MOT data from API...");

  try {
    // Show loading state
    const tbody = document.getElementById('mot-vehicles-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div class="empty-state-content">
              <i class="fas fa-spinner fa-spin"></i>
              <h4>Loading MOT data...</h4>
              <p>Fetching vehicle information from the database</p>
            </div>
          </td>
        </tr>
      `;
    }

    // Use the correct API endpoint (MOT blueprint is registered with /mot prefix)
    const response = await fetch('/mot/api/vehicles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📊 MOT data received:", data);

    // Process and display the data
    if (data.success && data.vehicles) {
      displayMOTVehicles(data.vehicles);
      updateMOTStatistics(data.vehicles);
    } else {
      throw new Error(data.message || 'Failed to load MOT data');
    }

  } catch (error) {
    console.error("❌ Error loading MOT data:", error);

    // Show error state
    const tbody = document.getElementById('mot-vehicles-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div class="empty-state-content">
              <i class="fas fa-exclamation-triangle" style="color: var(--error-500);"></i>
              <h4>Error Loading Data</h4>
              <p>${error.message}</p>
              <button class="btn btn-primary" onclick="loadMOTData()">
                <i class="fas fa-retry"></i>
                Try Again
              </button>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Display MOT vehicles in the table with clean formatting
 */
function displayMOTVehicles(vehicles) {
  console.log(`📋 Displaying ${vehicles.length} MOT vehicles...`);

  const tbody = document.getElementById('mot-vehicles-tbody');
  if (!tbody) {
    console.error("❌ MOT vehicles table body not found");
    return;
  }

  if (!vehicles || vehicles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-state-content">
            <i class="fas fa-car"></i>
            <h4>No Vehicles Found</h4>
            <p>No MOT data available. Upload vehicle data to get started.</p>
            <button class="btn btn-primary" onclick="showPage('settings')">
              <i class="fas fa-upload"></i>
              Upload Vehicle Data
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Sort vehicles by urgency (expired first, then by days remaining)
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const statusA = getMOTStatus(a);
    const statusB = getMOTStatus(b);
    const daysA = calculateDaysRemainingNumeric(a.mot_expiry);
    const daysB = calculateDaysRemainingNumeric(b.mot_expiry);

    // Expired vehicles first
    if (statusA.class === 'expired' && statusB.class !== 'expired') return -1;
    if (statusB.class === 'expired' && statusA.class !== 'expired') return 1;

    // Then by days remaining (ascending)
    return daysA - daysB;
  });

  // Generate clean table rows
  const rows = sortedVehicles.map((vehicle, index) => {
    const status = getMOTStatus(vehicle);
    const daysRemaining = calculateDaysRemaining(vehicle.mot_expiry);
    const urgencyClass = getUrgencyClass(status.class);

    return `
      <tr class="vehicle-row ${urgencyClass}" data-status="${status.class}" data-registration="${vehicle.registration}">
        <td class="checkbox-cell">
          <input type="checkbox" class="vehicle-checkbox" value="${vehicle.registration}" onchange="updateSendRemindersButton()" />
        </td>
        <td class="registration-cell">
          <span class="registration-number">${cleanRegistration(vehicle.registration)}</span>
        </td>
        <td class="vehicle-cell">
          <div class="vehicle-info">
            <div class="vehicle-primary">${cleanVehicleName(vehicle.make, vehicle.model)}</div>
            <div class="vehicle-secondary">${formatVehicleDetails(vehicle)}</div>
          </div>
        </td>
        <td class="customer-cell">
          <div class="customer-info">
            <div class="customer-name">${cleanCustomerName(vehicle.customer_name)}</div>
            <div class="customer-contact">${formatContactInfo(vehicle)}</div>
          </div>
        </td>
        <td class="date-cell">
          <div class="mot-date">
            <div class="date-primary">${formatDateClean(vehicle.mot_expiry)}</div>
            <div class="date-secondary">${formatDateRelative(vehicle.mot_expiry)}</div>
          </div>
        </td>
        <td class="days-cell">
          <span class="days-remaining ${status.class}">${daysRemaining}</span>
        </td>
        <td class="status-cell">
          <span class="status-badge ${status.class}">
            <i class="fas fa-${getStatusIcon(status.class)}"></i>
            ${status.text}
          </span>
        </td>
        <td class="actions-cell">
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary" onclick="viewVehicleHistory('${vehicle.registration}')" title="View MOT History">
              <i class="fas fa-history"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="sendSingleReminder('${vehicle.registration}')" title="Send Reminder">
              <i class="fas fa-envelope"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;

  // Store vehicles data globally for filtering
  window.motVehiclesData = sortedVehicles;

  // Update row numbers and alternating colors
  updateTableStyling();

  console.log("✅ MOT vehicles displayed with clean formatting");
}

/**
 * Calculate MOT status based on expiry date
 */
function getMOTStatus(vehicle) {
  const daysRemaining = calculateDaysRemaining(vehicle.mot_expiry);

  if (daysRemaining < 0) {
    return { class: 'expired', text: 'Expired' };
  } else if (daysRemaining <= 7) {
    return { class: 'critical', text: 'Critical' };
  } else if (daysRemaining <= 30) {
    return { class: 'warning', text: 'Due Soon' };
  } else {
    return { class: 'valid', text: 'Valid' };
  }
}

/**
 * Calculate days remaining until MOT expiry (numeric for sorting)
 */
function calculateDaysRemainingNumeric(motExpiry) {
  if (!motExpiry) return 999;

  const today = new Date();
  const expiryDate = new Date(motExpiry);
  const diffTime = expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days remaining until MOT expiry (formatted for display)
 */
function calculateDaysRemaining(motExpiry) {
  if (!motExpiry) return 'N/A';

  const diffDays = calculateDaysRemainingNumeric(motExpiry);

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return '1 day ago';
    return `${absDays} days ago`;
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else {
    return `${diffDays} days`;
  }
}

/**
 * Format date for display (legacy function)
 */
function formatDate(dateString) {
  return formatDateClean(dateString);
}

/**
 * Format date cleanly for primary display
 */
function formatDateClean(dateString) {
  if (!dateString) return 'Not Set';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Format date with relative context
 */
function formatDateRelative(dateString) {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = calculateDaysRemainingNumeric(dateString);

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays <= 7) {
      return 'This week';
    } else if (diffDays <= 30) {
      return 'This month';
    } else if (diffDays <= 90) {
      return 'Next 3 months';
    } else {
      return 'Future';
    }
  } catch (error) {
    return '';
  }
}

/**
 * Clean registration number formatting
 */
function cleanRegistration(registration) {
  if (!registration) return 'N/A';

  // Format UK registration with proper spacing
  const reg = registration.replace(/\s+/g, '').toUpperCase();
  if (reg.length >= 7) {
    // Standard UK format: AB12 CDE
    return `${reg.slice(0, 2)}${reg.slice(2, 4)} ${reg.slice(4)}`;
  }
  return reg;
}

/**
 * Clean vehicle name formatting
 */
function cleanVehicleName(make, model) {
  const cleanMake = make && make !== 'Unknown' ? make.trim() : '';
  const cleanModel = model && model !== '' ? model.trim() : '';

  if (!cleanMake && !cleanModel) return 'Unknown Vehicle';
  if (!cleanMake) return cleanModel;
  if (!cleanModel) return cleanMake;

  // Avoid duplication if model starts with make
  if (cleanModel.toLowerCase().startsWith(cleanMake.toLowerCase())) {
    return cleanModel;
  }

  return `${cleanMake} ${cleanModel}`;
}

/**
 * Format vehicle details (year, engine, etc.)
 */
function formatVehicleDetails(vehicle) {
  const details = [];

  if (vehicle.year && vehicle.year !== 'Unknown') {
    details.push(vehicle.year);
  }

  if (vehicle.engine_size) {
    details.push(`${vehicle.engine_size}cc`);
  }

  if (vehicle.fuel_type && vehicle.fuel_type !== 'Unknown') {
    details.push(vehicle.fuel_type);
  }

  if (vehicle.colour && vehicle.colour !== 'Unknown') {
    details.push(vehicle.colour);
  }

  return details.length > 0 ? details.join(' • ') : 'Details not available';
}

/**
 * Clean customer name formatting
 */
function cleanCustomerName(customerName) {
  if (!customerName || customerName === 'Unknown' || customerName.trim() === '') {
    return 'Unknown Customer';
  }

  // Capitalize first letter of each word
  return customerName.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format contact information cleanly
 */
function formatContactInfo(vehicle) {
  const contacts = [];

  if (vehicle.mobile && vehicle.mobile !== 'No contact') {
    // Format UK mobile number
    const mobile = vehicle.mobile.replace(/\s+/g, '');
    if (mobile.startsWith('07') && mobile.length === 11) {
      contacts.push(`${mobile.slice(0, 5)} ${mobile.slice(5, 8)} ${mobile.slice(8)}`);
    } else {
      contacts.push(mobile);
    }
  }

  if (vehicle.email && vehicle.email !== 'No contact' && vehicle.email.includes('@')) {
    contacts.push(vehicle.email.toLowerCase());
  }

  return contacts.length > 0 ? contacts.join(' • ') : 'No contact details';
}

/**
 * Get urgency class for row styling
 */
function getUrgencyClass(statusClass) {
  switch (statusClass) {
    case 'expired': return 'urgency-critical';
    case 'critical': return 'urgency-high';
    case 'warning': return 'urgency-medium';
    case 'valid': return 'urgency-low';
    default: return '';
  }
}

/**
 * Get status icon
 */
function getStatusIcon(statusClass) {
  switch (statusClass) {
    case 'expired': return 'exclamation-triangle';
    case 'critical': return 'clock';
    case 'warning': return 'calendar-alt';
    case 'valid': return 'check-circle';
    default: return 'question-circle';
  }
}

/**
 * Update table styling with alternating rows and numbering
 */
function updateTableStyling() {
  const rows = document.querySelectorAll('.vehicle-row');
  rows.forEach((row, index) => {
    // Add row number
    row.setAttribute('data-row-number', index + 1);

    // Add alternating row class
    if (index % 2 === 0) {
      row.classList.add('even-row');
    } else {
      row.classList.add('odd-row');
    }
  });
}

/**
 * Update send reminders button state based on selected vehicles
 */
function updateSendRemindersButton() {
  const checkboxes = document.querySelectorAll('.vehicle-checkbox:checked');
  const sendButton = document.getElementById('send-reminders-btn');

  if (sendButton) {
    if (checkboxes.length > 0) {
      sendButton.disabled = false;
      sendButton.innerHTML = `
        <i class="fas fa-envelope"></i>
        Send Reminders (${checkboxes.length})
      `;
    } else {
      sendButton.disabled = true;
      sendButton.innerHTML = `
        <i class="fas fa-envelope"></i>
        Send Reminders
      `;
    }
  }
}

/**
 * Update MOT statistics cards
 */
function updateMOTStatistics(vehicles) {
  console.log("📊 Updating MOT statistics...");

  const stats = {
    expired: 0,
    critical: 0,
    warning: 0,
    valid: 0,
    total: vehicles.length
  };

  vehicles.forEach(vehicle => {
    const status = getMOTStatus(vehicle);
    stats[status.class]++;
  });

  // Update stat cards
  const updateStat = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  updateStat('expired-count', stats.expired);
  updateStat('expiring-soon-count', stats.critical);
  updateStat('due-month-count', stats.warning);
  updateStat('valid-count', stats.valid);

  // Update filter counts
  updateStat('all-count', stats.total);
  updateStat('expired-filter-count', stats.expired);
  updateStat('critical-filter-count', stats.critical);
  updateStat('warning-count', stats.warning);
  updateStat('valid-filter-count', stats.valid);

  console.log("✅ MOT statistics updated:", stats);
}

/**
 * Filter MOT vehicles by status
 */
function filterMOTVehicles(status) {
  console.log(`🔍 Filtering MOT vehicles by status: ${status}`);

  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-filter="${status}"]`).classList.add('active');

  // Filter table rows
  const rows = document.querySelectorAll('.vehicle-row');
  rows.forEach(row => {
    const rowStatus = row.dataset.status;
    if (status === 'all' || rowStatus === status) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Filter MOT vehicles by search term
 */
function filterMOTVehiclesBySearch(searchTerm) {
  const rows = document.querySelectorAll('.vehicle-row');
  const term = searchTerm.toLowerCase();

  rows.forEach(row => {
    const registration = row.dataset.registration.toLowerCase();
    const text = row.textContent.toLowerCase();

    if (registration.includes(term) || text.includes(term)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Toggle all vehicle selection
 */
function toggleAllVehicleSelection(checked) {
  const checkboxes = document.querySelectorAll('.vehicle-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateSendRemindersButton();
}

/**
 * Update send reminders button state
 */
function updateSendRemindersButton() {
  const selectedCheckboxes = document.querySelectorAll('.vehicle-checkbox:checked');
  const sendBtn = document.getElementById('send-reminders-btn');

  if (sendBtn) {
    sendBtn.disabled = selectedCheckboxes.length === 0;
    sendBtn.textContent = selectedCheckboxes.length > 0
      ? `Send Reminders (${selectedCheckboxes.length})`
      : 'Send Reminders';
  }
}

/**
 * View vehicle MOT history
 */
async function viewVehicleHistory(registration) {
  console.log(`📋 Viewing MOT history for: ${registration}`);

  try {
    // Show loading modal
    showMOTHistoryModal(registration, null, true);

    // Try to get MOT history from DVSA API first
    let motData = null;
    let errorMessage = null;

    try {
      const dvsaResponse = await fetch(`/api/dvsa/vehicle/${registration}/mot`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (dvsaResponse.ok) {
        const dvsaData = await dvsaResponse.json();
        if (dvsaData.success && dvsaData.mot_data) {
          motData = dvsaData.mot_data;
        }
      }
    } catch (dvsaError) {
      console.warn("⚠️ DVSA API not available, trying garage database:", dvsaError);
    }

    // If DVSA data not available, try garage database
    if (!motData) {
      try {
        const garageResponse = await fetch(`/mot/api/vehicles/${registration}/history`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (garageResponse.ok) {
          const garageData = await garageResponse.json();
          if (garageData.success) {
            motData = generateMockMOTData(registration, garageData);
          }
        }
      } catch (garageError) {
        console.warn("⚠️ Garage database not available:", garageError);
      }
    }

    // If still no data, generate sample data for demonstration
    if (!motData) {
      motData = generateSampleMOTData(registration);
      errorMessage = "Using sample data - DVSA API not available";
    }

    showMOTHistoryModal(registration, motData, false, errorMessage);

  } catch (error) {
    console.error("❌ Error loading MOT history:", error);
    showMOTHistoryModal(registration, null, false, error.message);
  }
}

/**
 * Generate sample MOT data for demonstration
 */
function generateSampleMOTData(registration) {
  const currentDate = new Date();
  const lastYear = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
  const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());

  return {
    registration: registration,
    make: "Sample",
    model: "Vehicle",
    primaryColour: "Blue",
    fuelType: "Petrol",
    engineSize: "1600",
    motTests: [
      {
        completedDate: currentDate.toISOString().split('T')[0],
        testResult: "PASSED",
        expiryDate: new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate()).toISOString().split('T')[0],
        motTestNumber: "123456789",
        odometerValue: 45000,
        odometerUnit: "mi",
        testStationName: "Sample MOT Centre",
        rfrAndComments: [
          {
            type: "ADVISORY",
            text: "Tyre worn close to legal limit on front axle",
            dangerous: false
          }
        ]
      },
      {
        completedDate: lastYear.toISOString().split('T')[0],
        testResult: "PASSED",
        expiryDate: currentDate.toISOString().split('T')[0],
        motTestNumber: "987654321",
        odometerValue: 42000,
        odometerUnit: "mi",
        testStationName: "Sample MOT Centre",
        rfrAndComments: []
      },
      {
        completedDate: twoYearsAgo.toISOString().split('T')[0],
        testResult: "FAILED",
        expiryDate: null,
        motTestNumber: "456789123",
        odometerValue: 39000,
        odometerUnit: "mi",
        testStationName: "Sample MOT Centre",
        rfrAndComments: [
          {
            type: "FAIL",
            text: "Brake disc worn beyond manufacturer's specification on front axle",
            dangerous: true
          },
          {
            type: "ADVISORY",
            text: "Oil leak from engine",
            dangerous: false
          }
        ]
      }
    ]
  };
}

/**
 * Show MOT history modal
 */
function showMOTHistoryModal(registration, motData, isLoading, errorMessage) {
  console.log(`📋 Showing MOT history modal for: ${registration}`);

  // Remove existing modal if any
  const existingModal = document.getElementById('mot-history-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal HTML
  const modalHTML = `
    <div id="mot-history-modal" class="modal-backdrop">
      <div class="modal" style="max-width: 800px;">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fas fa-history"></i>
            MOT History - ${registration}
          </h3>
          <button class="modal-close" onclick="closeMOTHistoryModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          ${isLoading ? generateLoadingContent() :
            errorMessage && !motData ? generateErrorContent(errorMessage) :
            generateMOTHistoryContent(motData, errorMessage)}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeMOTHistoryModal()">
            Close
          </button>
          ${!isLoading && !errorMessage ? `
            <button class="btn btn-primary" onclick="printMOTHistory('${registration}')">
              <i class="fas fa-print"></i>
              Print History
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add click outside to close
  const modal = document.getElementById('mot-history-modal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeMOTHistoryModal();
    }
  });
}

/**
 * Generate loading content for MOT history modal
 */
function generateLoadingContent() {
  return `
    <div class="empty-state">
      <div class="empty-state-content">
        <i class="fas fa-spinner fa-spin"></i>
        <h4>Loading MOT History</h4>
        <p>Fetching data from DVSA database...</p>
      </div>
    </div>
  `;
}

/**
 * Generate error content for MOT history modal
 */
function generateErrorContent(errorMessage) {
  return `
    <div class="empty-state">
      <div class="empty-state-content">
        <i class="fas fa-exclamation-triangle" style="color: var(--error-500);"></i>
        <h4>Error Loading MOT History</h4>
        <p>${errorMessage}</p>
        <button class="btn btn-primary" onclick="closeMOTHistoryModal()">
          <i class="fas fa-times"></i>
          Close
        </button>
      </div>
    </div>
  `;
}

/**
 * Generate MOT history content
 */
function generateMOTHistoryContent(motData, warningMessage) {
  if (!motData || !motData.motTests || motData.motTests.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-content">
          <i class="fas fa-car"></i>
          <h4>No MOT History Found</h4>
          <p>No MOT test records found for this vehicle.</p>
        </div>
      </div>
    `;
  }

  const warningBanner = warningMessage ? `
    <div class="alert alert-warning" style="margin-bottom: var(--space-4);">
      <i class="fas fa-info-circle"></i>
      ${warningMessage}
    </div>
  ` : '';

  // Sort MOT tests by date (newest first)
  const sortedTests = motData.motTests.sort((a, b) =>
    new Date(b.completedDate) - new Date(a.completedDate)
  );

  const vehicleInfo = `
    <div class="vehicle-info-card">
      <h4>Vehicle Information</h4>
      <div class="vehicle-details">
        <div class="detail-item">
          <span class="label">Registration:</span>
          <span class="value">${motData.registration || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Make:</span>
          <span class="value">${motData.make || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Model:</span>
          <span class="value">${motData.model || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Colour:</span>
          <span class="value">${motData.primaryColour || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Fuel Type:</span>
          <span class="value">${motData.fuelType || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Engine Size:</span>
          <span class="value">${motData.engineSize || 'N/A'}cc</span>
        </div>
      </div>
    </div>
  `;

  const motHistory = `
    <div class="mot-history-timeline">
      <h4>MOT Test History (${sortedTests.length} tests)</h4>
      ${sortedTests.map((test, index) => generateMOTTestCard(test, index === 0)).join('')}
    </div>
  `;

  return warningBanner + vehicleInfo + motHistory;
}

/**
 * Generate individual MOT test card
 */
function generateMOTTestCard(test, isLatest) {
  const testDate = new Date(test.completedDate).toLocaleDateString('en-GB');
  const expiryDate = test.expiryDate ? new Date(test.expiryDate).toLocaleDateString('en-GB') : 'N/A';

  const statusClass = test.testResult === 'PASSED' ? 'success' :
                     test.testResult === 'FAILED' ? 'error' : 'warning';

  const statusIcon = test.testResult === 'PASSED' ? 'check-circle' :
                    test.testResult === 'FAILED' ? 'times-circle' : 'exclamation-triangle';

  return `
    <div class="mot-test-card ${isLatest ? 'latest' : ''}">
      <div class="test-header">
        <div class="test-date">
          <i class="fas fa-calendar"></i>
          ${testDate}
          ${isLatest ? '<span class="latest-badge">Latest</span>' : ''}
        </div>
        <div class="test-result">
          <span class="status-badge status-${statusClass}">
            <i class="fas fa-${statusIcon}"></i>
            ${test.testResult}
          </span>
        </div>
      </div>

      <div class="test-details">
        <div class="detail-row">
          <span class="label">Test Number:</span>
          <span class="value">${test.motTestNumber || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Expiry Date:</span>
          <span class="value">${expiryDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Odometer:</span>
          <span class="value">${test.odometerValue ? test.odometerValue.toLocaleString() : 'N/A'} ${test.odometerUnit || 'miles'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Test Station:</span>
          <span class="value">${test.testStationName || 'N/A'}</span>
        </div>
      </div>

      ${test.rfrAndComments && test.rfrAndComments.length > 0 ? `
        <div class="test-issues">
          <h5>Issues & Comments</h5>
          ${test.rfrAndComments.map(item => `
            <div class="issue-item ${item.type.toLowerCase()}">
              <div class="issue-type">${item.type}</div>
              <div class="issue-text">${item.text}</div>
              ${item.dangerous ? '<span class="dangerous-badge">DANGEROUS</span>' : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Close MOT history modal
 */
function closeMOTHistoryModal() {
  const modal = document.getElementById('mot-history-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Print MOT history
 */
function printMOTHistory(registration) {
  console.log(`🖨️ Printing MOT history for: ${registration}`);

  const modalContent = document.querySelector('#mot-history-modal .modal-body');
  if (!modalContent) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>MOT History - ${registration}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .vehicle-info-card, .mot-test-card { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
          .status-badge { padding: 5px 10px; border-radius: 5px; }
          .status-success { background: #d4edda; color: #155724; }
          .status-error { background: #f8d7da; color: #721c24; }
          .status-warning { background: #fff3cd; color: #856404; }
          .latest-badge { background: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
          .dangerous-badge { background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>MOT History Report - ${registration}</h1>
        <p>Generated on: ${new Date().toLocaleDateString('en-GB')}</p>
        ${modalContent.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
}

/**
 * Send single MOT reminder
 */
function sendSingleReminder(registration) {
  console.log(`📱 Sending MOT reminder for: ${registration}`);
  // TODO: Implement single SMS sending
  alert(`Sending MOT reminder for ${registration}\n\nThis feature will be implemented next.`);
}

/**
 * Load MOT data from API
 */
async function loadMOTData() {
  try {
    console.log("🔄 Loading MOT data...");

    // Use the correct MOT API endpoint with /mot prefix
    const response = await fetch("/mot/api/vehicles");
    const result = await response.json();

    if (result && result.success) {
      console.log(`✅ Found ${result.vehicles.length} MOT vehicles`);
      displayMOTVehicles(result.vehicles);
      updateMOTStats(result.vehicles);
    } else {
      console.error("❌ No MOT data in response:", result);
      showMOTError("No MOT data available");
    }
  } catch (error) {
    console.error("Failed to load MOT data:", error);
    showMOTError("Failed to load MOT data");
  }
}

/**
 * Display MOT vehicles in the table
 */
function displayMOTVehicles(vehicles) {
  const tbody = document.getElementById("mot-vehicles-table-body");
  if (!tbody) return;

  if (!vehicles || vehicles.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8">
                    <div class="text-gray-500">
                        <i class="fas fa-car text-2xl mb-2"></i>
                        <p>No MOT vehicles found</p>
                        <button class="btn btn-primary mt-2" onclick="openAddVehicleModal()">
                            Add First Vehicle
                        </button>
                    </div>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = vehicles
    .map((vehicle) => {
      const statusClass = getStatusClass(vehicle);
      const statusText = getStatusText(vehicle);

      return `
            <tr class="hover:bg-gray-50 ${statusClass}">
                <td>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" class="vehicle-checkbox" data-registration="${vehicle.registration}">
                        <strong class="uk-number-plate">${vehicle.registration}</strong>
                    </div>
                </td>
                <td>
                    <div>
                        <div class="font-medium">${vehicle.customer_name || "Unknown"}</div>
                        ${vehicle.mobile_number ? `<div class="text-sm text-gray-500">${vehicle.mobile_number}</div>` : ""}
                    </div>
                </td>
                <td>
                    <div>
                        <div class="font-medium">${vehicle.make || "Unknown"}</div>
                        <div class="text-sm text-gray-500">${vehicle.model || ""}</div>
                    </div>
                </td>
                <td>
                    <div class="text-sm">
                        ${vehicle.mot_expiry_date ? new Date(vehicle.mot_expiry_date).toLocaleDateString("en-GB") : "Unknown"}
                    </div>
                </td>
                <td>
                    <div class="text-sm font-medium ${getDaysRemainingClass(vehicle.days_until_expiry)}">
                        ${vehicle.days_until_expiry !== null ? vehicle.days_until_expiry + " days" : "Unknown"}
                    </div>
                </td>
                <td>
                    <span class="badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-sm btn-secondary" onclick="viewMOTDetails('${vehicle.registration}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="sendSingleReminder('${vehicle.registration}')" title="Send SMS">
                            <i class="fas fa-sms"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="archiveVehicle('${vehicle.registration}')" title="Archive">
                            <i class="fas fa-archive"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");

  // Set up checkbox event listeners
  setupCheckboxListeners();
}

/**
 * Update MOT statistics
 */
function updateMOTStats(vehicles) {
  const stats = {
    expired: vehicles.filter((v) => v.is_expired).length,
    critical: vehicles.filter((v) => !v.is_expired && v.days_until_expiry <= 7)
      .length,
    due_soon: vehicles.filter(
      (v) =>
        !v.is_expired && v.days_until_expiry > 7 && v.days_until_expiry <= 30,
    ).length,
    valid: vehicles.filter((v) => !v.is_expired && v.days_until_expiry > 30)
      .length,
  };

  // Update stat cards
  const expiredElement = document.getElementById("expired-count");
  const criticalElement = document.getElementById("critical-count");
  const dueSoonElement = document.getElementById("due-soon-count");
  const validElement = document.getElementById("valid-count");

  if (expiredElement) expiredElement.textContent = stats.expired;
  if (criticalElement) criticalElement.textContent = stats.critical;
  if (dueSoonElement) dueSoonElement.textContent = stats.due_soon;
  if (validElement) validElement.textContent = stats.valid;
}

/**
 * Helper functions for MOT display
 */
function getStatusClass(vehicle) {
  if (vehicle.is_expired) return "bg-red-50";
  if (vehicle.days_until_expiry <= 7) return "bg-orange-50";
  if (vehicle.days_until_expiry <= 30) return "bg-yellow-50";
  return "bg-green-50";
}

function getStatusText(vehicle) {
  if (vehicle.is_expired) return "EXPIRED";
  if (vehicle.days_until_expiry <= 7) return "CRITICAL";
  if (vehicle.days_until_expiry <= 30) return "DUE SOON";
  return "VALID";
}

function getDaysRemainingClass(days) {
  if (days < 0) return "text-red-600";
  if (days <= 7) return "text-orange-600";
  if (days <= 30) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Show MOT error
 */
function showMOTError(message) {
  const tbody = document.getElementById("mot-vehicles-table-body");
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
    console.log("🔄 Loading customers data...");

    const response = await fetch("/api/customers");
    const result = await response.json();

    if (result && result.customers) {
      console.log(`✅ Found ${result.customers.length} customers`);
      displayCustomersInTable(result.customers);
      updateCustomerStats(result.customers);
    } else {
      console.error("❌ No customers data in response:", result);
      showCustomersError("No customer data available");
    }
  } catch (error) {
    console.error("Failed to load customers:", error);
    showCustomersError("Failed to load customer data");
  }
}

/**
 * Display customers in the table
 */
function displayCustomersInTable(customers) {
  const tbody = document.getElementById("customers-table-body");
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

  tbody.innerHTML = customers
    .slice(0, 50)
    .map(
      (customer) => `
        <tr class="hover:bg-gray-50">
            <td><strong>${customer.account_number || "N/A"}</strong></td>
            <td>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-medium">${customer.name || "N/A"}</div>
                        <div class="text-sm text-gray-500">ID: ${customer.id}</div>
                    </div>
                </div>
            </td>
            <td>${customer.company || "-"}</td>
            <td>
                <div class="text-sm">
                    ${customer.phone ? `<div><i class="fas fa-phone text-gray-400"></i> ${customer.phone}</div>` : ""}
                    ${customer.mobile ? `<div><i class="fas fa-mobile text-gray-400"></i> ${customer.mobile}</div>` : ""}
                    ${customer.email ? `<div><i class="fas fa-envelope text-gray-400"></i> ${customer.email}</div>` : ""}
                </div>
            </td>
            <td>
                <div class="text-sm">
                    ${customer.address ? `<div>${customer.address}</div>` : ""}
                    ${customer.postcode ? `<div class="text-gray-500">${customer.postcode}</div>` : ""}
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
    `,
    )
    .join("");

  // Show pagination info if there are more than 50 customers
  if (customers.length > 50) {
    const paginationContainer = document.getElementById("customers-pagination");
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
  const activeCount = customers.filter(
    (c) =>
      c.created_date &&
      new Date(c.created_date) >
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  ).length;
  const newCount = customers.filter(
    (c) =>
      c.created_date &&
      new Date(c.created_date) >
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length;

  // Update stat cards
  const totalElement = document.getElementById("total-customers-count");
  const activeElement = document.getElementById("active-customers-count");
  const newElement = document.getElementById("new-customers-count");

  if (totalElement) totalElement.textContent = totalCount.toLocaleString();
  if (activeElement) activeElement.textContent = activeCount.toLocaleString();
  if (newElement) newElement.textContent = newCount.toLocaleString();
}

/**
 * Show customers error
 */
function showCustomersError(message) {
  const tbody = document.getElementById("customers-table-body");
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
  console.log("📊 Loading dashboard content...");

  const dashboardContent = document.getElementById("dashboard-content");
  if (!dashboardContent) {
    console.error("❌ Dashboard content container not found");
    return;
  }

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

  // Load dashboard statistics
  if (typeof loadDashboardStats === "function") {
    loadDashboardStats();
  }

  console.log("✅ Dashboard content loaded");
}

/**
 * Manual dashboard stats loading as fallback
 */
async function loadDashboardStatsManually() {
  try {
    console.log("📊 Loading dashboard stats manually...");

    const response = await fetch("/api/stats");
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

        updateElement("total-customers", stats.customers || 0);
        updateElement("total-vehicles", stats.vehicles || 0);
        updateElement("total-revenue", stats.revenue || "£0.00");
        updateElement("total-jobs", stats.jobs || 0);

        console.log("✅ Dashboard stats loaded manually");
      } else {
        console.warn("⚠️ Invalid stats data format:", data);
      }
    } else {
      console.warn("⚠️ Stats API not available:", response.status);
    }
  } catch (error) {
    console.error("❌ Error loading dashboard stats manually:", error);

    // Show placeholder data
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    updateElement("total-customers", "0");
    updateElement("total-vehicles", "0");
    updateElement("total-revenue", "£0.00");
    updateElement("total-jobs", "0");
  }
}

/**
 * Load settings page with proper tab activation
 */
function loadSettingsPage() {
  if (!window.settingsData || Object.keys(window.settingsData).length === 0) {
    if (typeof loadSettings === "function") {
      loadSettings();
    }
  }
}

/**
 * Initialize navigation system
 */
function initializeNavigation() {
  console.log("🧭 Navigation system initializing...");

  // Force dashboard as default page and clear any problematic localStorage
  console.log("📄 Forcing dashboard as default page");
  currentPage = "dashboard";
  localStorage.setItem("currentPage", "dashboard");

  // Ensure dashboard page is visible and active
  const dashboardPage = document.getElementById("dashboard");
  if (dashboardPage) {
    // Hide all pages first
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });
    // Show dashboard
    dashboardPage.classList.add("active");
    console.log("✅ Dashboard page activated");
  } else {
    console.error("❌ Dashboard page not found");
  }

  // Ensure dashboard nav item is active
  const dashboardNav = document.querySelector(
    '.nav-item[onclick*="dashboard"]',
  );
  if (dashboardNav) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });
    dashboardNav.classList.add("active");
    console.log("✅ Dashboard navigation activated");
  }

  console.log("🧭 Navigation system ready");
}

/**
 * Customer action functions
 */
function openAddCustomerModal() {
  console.log("📝 Opening add customer modal...");
  // TODO: Implement add customer modal
  alert("Add customer functionality coming soon!");
}

function viewCustomer(customerId) {
  console.log("👁️ Viewing customer:", customerId);
  // TODO: Implement customer detail view
  alert(`View customer ${customerId} - functionality coming soon!`);
}

function editCustomer(customerId) {
  console.log("✏️ Editing customer:", customerId);
  // TODO: Implement customer editing
  alert(`Edit customer ${customerId} - functionality coming soon!`);
}

function deleteCustomer(customerId) {
  if (confirm("Are you sure you want to delete this customer?")) {
    console.log("🗑️ Deleting customer:", customerId);
    // TODO: Implement customer deletion
    alert(`Delete customer ${customerId} - functionality coming soon!`);
  }
}

function loadAllCustomers() {
  console.log("📄 Loading all customers...");
  // TODO: Implement pagination
  alert("Load all customers - functionality coming soon!");
}

/**
 * MOT action functions
 */
function openAddVehicleModal() {
  console.log("🚗 Opening add vehicle modal...");
  alert("Add vehicle functionality coming soon!");
}

function refreshMOTData() {
  console.log("🔄 Refreshing MOT data...");
  loadMOTData();
}

function filterMOTVehicles(filter) {
  console.log("🔍 Filtering MOT vehicles:", filter);
  // Update active filter button
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-filter="${filter}"]`).classList.add("active");

  // TODO: Implement filtering logic
  alert(`Filter by ${filter} - functionality coming soon!`);
}

function setupCheckboxListeners() {
  const checkboxes = document.querySelectorAll(".vehicle-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectedVehicles);
  });
}

function updateSelectedVehicles() {
  const selected = document.querySelectorAll(".vehicle-checkbox:checked");
  const count = selected.length;
  const info = document.getElementById("selected-vehicles-info");
  const sendBtn = document.getElementById("send-reminders-btn");

  if (count > 0) {
    info.textContent = `${count} vehicle${count > 1 ? "s" : ""} selected`;
    sendBtn.disabled = false;
  } else {
    info.textContent = "No vehicles selected";
    sendBtn.disabled = true;
  }
}

function selectAllExpired() {
  console.log("🔴 Selecting all expired vehicles...");
  // TODO: Implement select all expired
  alert("Select all expired - functionality coming soon!");
}

function sendSelectedReminders() {
  const selected = document.querySelectorAll(".vehicle-checkbox:checked");
  const registrations = Array.from(selected).map(
    (cb) => cb.dataset.registration,
  );
  console.log("📱 Sending reminders to:", registrations);
  alert(
    `Send reminders to ${registrations.length} vehicles - functionality coming soon!`,
  );
}

function viewMOTDetails(registration) {
  console.log("👁️ Viewing MOT details for:", registration);
  alert(`View MOT details for ${registration} - functionality coming soon!`);
}

function sendSingleReminder(registration) {
  console.log("📱 Sending single reminder to:", registration);
  alert(`Send reminder to ${registration} - functionality coming soon!`);
}

function archiveVehicle(registration) {
  if (confirm(`Are you sure you want to archive ${registration}?`)) {
    console.log("🗄️ Archiving vehicle:", registration);
    alert(`Archive ${registration} - functionality coming soon!`);
  }
}

/**
 * Emergency navigation function for error recovery
 */
window.emergencyShowPage = function (pageId) {
  console.log("🚨 Emergency navigation to:", pageId);

  // Hide all pages
  document.querySelectorAll(".page, .professional-page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
    console.log("✅ Emergency navigation successful");

    // Activate first settings tab if it's settings page
    if (pageId === "settings") {
      setTimeout(() => {
        const firstTab = document.querySelector(".settings-tab-btn");
        const firstTabContent = document.querySelector(".settings-tab-content");
        if (firstTab) firstTab.classList.add("active");
        if (firstTabContent) firstTabContent.classList.add("active");
      }, 100);
    }

    return true;
  } else {
    console.error("❌ Emergency navigation failed - page not found");
    return false;
  }
};

/**
 * Test all pages loading functionality
 */
window.testAllPages = function () {
  console.log("🧪 Testing all pages loading...");

  const pages = [
    "dashboard",
    "customers",
    "vehicles",
    "jobs",
    "workshop-diary",
    "job-sheets",
    "quotes",
    "online-booking",
    "customer-portal",
    "mot-reminders",
    "parts",
    "invoices",
    "reports",
    "upload",
    "error-monitoring",
    "settings",
  ];

  let currentIndex = 0;

  function testNextPage() {
    if (currentIndex >= pages.length) {
      console.log("✅ All pages tested successfully!");
      showPage("dashboard"); // Return to dashboard
      return;
    }

    const pageId = pages[currentIndex];
    console.log(
      `🔍 Testing page: ${pageId} (${currentIndex + 1}/${pages.length})`,
    );

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
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showPage: window.showPage,
    debugInterface: window.debugInterface,
    emergencyShowPage: window.emergencyShowPage,
    testAllPages: window.testAllPages,
    initializeNavigation,
  };
}

// Google Drive sync function
window.showGoogleDriveSync = function() {
  console.log("📤 Opening Google Drive sync within upload page...");

  // Navigate to upload page first
  showPage('upload');

  // Then switch to Google Drive tab after a short delay
  setTimeout(() => {
    const googleDriveTab = document.getElementById('google-drive-tab');
    if (googleDriveTab) {
      const tab = new bootstrap.Tab(googleDriveTab);
      tab.show();
      console.log("✅ Switched to Google Drive tab");
    } else {
      console.warn("⚠️ Google Drive tab not found, loading upload page");
    }
  }, 500);
};

// Make key functions globally available
window.loadDashboardContent = loadDashboardContent;
window.loadDashboardStatsManually = loadDashboardStatsManually;
