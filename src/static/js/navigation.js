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
    document.querySelectorAll(".page").forEach((page) => {
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

  const motContent = document.getElementById("mot-reminders-content");
  if (!motContent) {
    console.error("❌ MOT reminders content container not found");
    return;
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

  console.log("✅ MOT Reminders page content loaded");
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
  document.querySelectorAll(".page").forEach((page) => {
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

// Make key functions globally available
window.loadDashboardContent = loadDashboardContent;
window.loadDashboardStatsManually = loadDashboardStatsManually;
