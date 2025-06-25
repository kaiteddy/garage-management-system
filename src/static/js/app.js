/**
 * Main Application Initialization
 * Ensures all page functionality works properly
 */

console.log("🚀 Garage Management System - Main App Initializing...");

// Global variables
let currentActivePage = "dashboard";
let isInitialized = false;

/**
 * Initialize the entire application
 */
function initializeApplication() {
  console.log("🔧 Initializing application...");

  if (isInitialized) {
    console.log("⚠️ Application already initialized");
    return;
  }

  try {
    // Set up global error handling
    setupErrorHandling();

    // Initialize navigation system
    initializeNavigationSystem();

    // Load initial dashboard content
    loadInitialDashboard();

    // Set up event listeners
    setupEventListeners();

    // Mark as initialized
    isInitialized = true;

    console.log("✅ Application initialized successfully");

    // Test all pages
    setTimeout(() => {
      testAllPages();
    }, 2000);
  } catch (error) {
    console.error("💥 Application initialization failed:", error);
    showEmergencyMessage(
      "Application failed to initialize properly. Please refresh the page.",
    );
  }
}

/**
 * Load initial application data
 */
function loadInitialData() {
  console.log("📊 Loading initial application data...");

  // Load dashboard data
  if (typeof loadDashboardStats === "function") {
    loadDashboardStats();
  }

  if (typeof loadRecentActivity === "function") {
    loadRecentActivity();
  }

  // Pre-load other data for better performance
  setTimeout(() => {
    console.log("👥 Pre-loading customers...");
    if (typeof loadCustomersFromAPI === "function") {
      loadCustomersFromAPI();
    }
  }, 1000);

  setTimeout(() => {
    console.log("🚗 Pre-loading vehicles...");
    if (typeof loadVehiclesFromAPI === "function") {
      loadVehiclesFromAPI();
    }
  }, 1500);

  setTimeout(() => {
    console.log("🔧 Pre-loading jobs...");
    if (typeof loadJobsFromAPI === "function") {
      loadJobsFromAPI();
    }
  }, 2000);

  setTimeout(() => {
    console.log("📄 Pre-loading invoices...");
    if (typeof loadInvoicesFromAPI === "function") {
      loadInvoicesFromAPI();
    }
  }, 2500);
}

/**
 * Load spacing preference from localStorage
 */
function loadSpacingPreference() {
  const savedSpacing = localStorage.getItem("layoutSpacing");
  if (savedSpacing) {
    document.documentElement.setAttribute("data-spacing", savedSpacing);
    console.log("📐 Loaded spacing preference:", savedSpacing);
  }
}

/**
 * Application health check
 */
function performHealthCheck() {
  const healthReport = {
    timestamp: new Date().toISOString(),
    pages: document.querySelectorAll(".page").length,
    activePages: document.querySelectorAll(".page.active").length,
    navItems: document.querySelectorAll(".nav-item").length,
    activeNavItems: document.querySelectorAll(".nav-item.active").length,
    apiCacheSize: window.API ? window.API.getCacheStats().cached : 0,
  };

  console.log("🏥 Health Check Report:", healthReport);

  // Check for issues
  if (healthReport.activePages === 0) {
    console.warn("⚠️ No active pages detected - attempting recovery");
    if (typeof emergencyShowPage === "function") {
      emergencyShowPage("dashboard");
    }
  }

  if (healthReport.activePages > 1) {
    console.warn("⚠️ Multiple active pages detected - fixing");
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });
    if (typeof showPage === "function") {
      showPage("dashboard");
    }
  }

  return healthReport;
}

/**
 * Emergency recovery function
 */
function emergencyRecovery() {
  console.log("🚨 Emergency recovery initiated");

  try {
    // Clear any problematic state
    localStorage.removeItem("currentActivePage");

    // Clear API cache
    if (window.API && typeof window.API.clearCache === "function") {
      window.API.clearCache();
    }

    // Reset to dashboard
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Show dashboard
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.classList.add("active");
    }

    const dashboardNav = document.querySelector(
      '.nav-item[onclick*="dashboard"]',
    );
    if (dashboardNav) {
      dashboardNav.classList.add("active");
    }

    console.log("✅ Emergency recovery completed");
    return true;
  } catch (error) {
    console.error("💥 Emergency recovery failed:", error);
    return false;
  }
}

/**
 * Set up global error handling
 */
function setupErrorHandling() {
  window.addEventListener("error", function (event) {
    console.error("🚨 Global error caught:", event.error);
    showEmergencyMessage(
      "An error occurred. Please check the console for details.",
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    console.error("🚨 Unhandled promise rejection:", event.reason);
    showEmergencyMessage(
      "A network error occurred. Please check your connection.",
    );
  });
}

/**
 * Initialize navigation system
 */
function initializeNavigationSystem() {
  console.log("🧭 Initializing navigation system...");

  // Ensure showPage function is available globally
  window.showPage = function (pageId) {
    console.log("🔧 Navigation to:", pageId);

    try {
      // Save current page
      currentActivePage = pageId;
      localStorage.setItem("currentActivePage", pageId);

      // Hide all pages (both old and new classes for compatibility)
      document.querySelectorAll(".page, .professional-page").forEach((page) => {
        page.classList.remove("active");
        page.style.display = "none";
      });

      // Remove active class from nav items (both old and new classes)
      document
        .querySelectorAll(".nav-item, .professional-nav-item")
        .forEach((item) => {
          item.classList.remove("active");
        });

      // Show selected page
      const pageElement = document.getElementById(pageId);
      if (pageElement) {
        pageElement.classList.add("active");
        pageElement.style.display = "block";
        pageElement.style.opacity = "1";
        pageElement.style.visibility = "visible";
        console.log("✅ Page shown:", pageId);
      } else {
        console.error("❌ Page element not found:", pageId);
        return;
      }

      // Activate nav item (check both old and new classes)
      const navItem = document.querySelector(
        `.nav-item[onclick*="'${pageId}'"], .professional-nav-item[onclick*="'${pageId}'"]`,
      );
      if (navItem) {
        navItem.classList.add("active");
      }

      // Load page content
      loadPageContent(pageId);
    } catch (error) {
      console.error("💥 Navigation error:", error);
    }
  };

  console.log("✅ Navigation system initialized");
}

/**
 * Load content for specific pages
 */
function loadPageContent(pageId) {
  console.log(`📄 Loading content for: ${pageId}`);

  const contentMap = {
    dashboard: () => {
      // Check if loadDashboardContent is available, otherwise use fallback
      if (typeof window.loadDashboardContent === "function") {
        window.loadDashboardContent();
      } else {
        console.log("📊 Using fallback dashboard loading...");
        loadFallbackDashboard();
      }
    },
    customers: loadCustomersPage,
    vehicles: loadVehiclesPage,
    jobs: loadJobsPage,
    "workshop-diary": loadWorkshopDiaryPage,
    "job-sheets": loadJobSheetsPage,
    quotes: loadQuotesPage,
    "online-booking": function () {
      if (typeof window.loadOnlineBookingPage === "function") {
        window.loadOnlineBookingPage();
      } else {
        console.error("❌ Online booking function not available");
      }
    },
    "customer-portal": function () {
      if (typeof window.CustomerPortal === "function") {
        window.portal = new window.CustomerPortal();
      } else {
        console.error("❌ Customer portal class not available");
      }
    },
    "mot-reminders": loadMOTRemindersPage,
    parts: loadPartsPage,
    invoices: loadInvoicesPage,
    reports: loadReportsPage,
    upload: loadUploadPage,
    "error-monitoring": loadErrorMonitoringPage,
    settings: loadSettingsPage,
  };

  const loadFunction = contentMap[pageId];
  if (loadFunction && typeof loadFunction === "function") {
    try {
      loadFunction();
      console.log(`✅ Content loaded for: ${pageId}`);
    } catch (error) {
      console.error(`❌ Failed to load content for ${pageId}:`, error);
      showPageError(pageId, error.message);
    }
  } else {
    console.warn(`⚠️ No loading function for: ${pageId}`);
    showPageError(pageId, "Page content not available");
  }
}

/**
 * Load initial dashboard content
 */
function loadInitialDashboard() {
  console.log("📊 Loading initial dashboard...");

  const dashboardContent = document.getElementById("dashboard-content");
  if (dashboardContent) {
    // Show loading state
    dashboardContent.innerHTML = `
            <div class="professional-page-header">
                <div>
                    <h1 class="professional-page-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Dashboard
                    </h1>
                    <p class="professional-page-subtitle">Garage Management Overview</p>
                </div>
            </div>
            <div class="professional-loading">
                <div class="professional-loading-spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        `;

    // Load dashboard content with fallback
    setTimeout(() => {
      if (typeof window.loadDashboardContent === "function") {
        window.loadDashboardContent();
      } else {
        loadFallbackDashboard();
      }
    }, 100);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  console.log("🎧 Setting up event listeners...");

  // Handle page visibility changes
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && currentActivePage) {
      console.log(
        "🔄 Page became visible, refreshing current page:",
        currentActivePage,
      );
      loadPageContent(currentActivePage);
    }
  });

  // Handle window focus
  window.addEventListener("focus", function () {
    console.log(
      "🔄 Window focused, refreshing current page:",
      currentActivePage,
    );
    if (currentActivePage) {
      loadPageContent(currentActivePage);
    }
  });

  console.log("✅ Event listeners set up");
}

/**
 * Test all pages functionality
 */
function testAllPages() {
  console.log("🧪 Testing all pages...");

  const pages = ["dashboard", "customers", "vehicles", "jobs", "mot-reminders"];
  const testResults = [];

  pages.forEach((pageId) => {
    const pageElement = document.getElementById(pageId);
    const contentElement = document.getElementById(`${pageId}-content`);

    if (pageElement && contentElement) {
      testResults.push(`✅ ${pageId}: Page and content elements found`);
    } else {
      testResults.push(`❌ ${pageId}: Missing elements`);
    }
  });

  console.log("📋 Page test results:", testResults);
}

/**
 * Show emergency message
 */
function showEmergencyMessage(message) {
  const emergencyDiv = document.createElement("div");
  emergencyDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px;
        border: 1px solid #f5c6cb;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
    `;
  emergencyDiv.innerHTML = `
        <strong>⚠️ Error:</strong><br>
        ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: #721c24; cursor: pointer;">×</button>
    `;
  document.body.appendChild(emergencyDiv);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (emergencyDiv.parentElement) {
      emergencyDiv.remove();
    }
  }, 10000);
}

/**
 * Show page error
 */
function showPageError(pageId, message) {
  const contentElement = document.getElementById(`${pageId}-content`);
  if (contentElement) {
    contentElement.innerHTML = `
            <div class="professional-page-header">
                <div>
                    <h1 class="professional-page-title">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${pageId.charAt(0).toUpperCase() + pageId.slice(1)}
                    </h1>
                    <p class="professional-page-subtitle">Error loading page content</p>
                </div>
            </div>
            <div class="professional-card">
                <div class="professional-card-content">
                    <div class="text-center py-8">
                        <div class="text-red-500">
                            <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                            <p>${message}</p>
                            <button class="professional-btn professional-btn-secondary mt-2" onclick="loadPageContent('${pageId}')">
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }
}

/**
 * Fallback dashboard loading function
 */
function loadFallbackDashboard() {
  console.log("📊 Loading fallback dashboard...");

  const dashboardContent = document.getElementById("dashboard-content");
  if (dashboardContent) {
    // Show loading state
    dashboardContent.innerHTML = `
            <div class="professional-page-header">
                <div>
                    <h1 class="professional-page-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Dashboard
                    </h1>
                    <p class="professional-page-subtitle">Garage Management Overview</p>
                </div>
            </div>
            <div class="professional-loading">
                <div class="professional-loading-spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        `;

    // Load dashboard stats after a short delay
    setTimeout(() => {
      loadDashboardStatsManually();
    }, 100);
  }
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

        console.log("✅ Dashboard stats updated successfully");
      } else {
        console.error("❌ Invalid stats data format");
      }
    } else {
      console.error("❌ Failed to fetch stats:", response.status);
    }
  } catch (error) {
    console.error("❌ Error loading dashboard stats:", error);
  }
}

// Placeholders for missing page loader functions
function loadQuotesPage() {
  const el =
    document.getElementById("quotes-container") ||
    document.getElementById("quotes-content");
  if (el) {
    el.innerHTML =
      "<div class='page-header'><h1 class='page-title'><i class='fas fa-file-invoice-dollar'></i> Quotes</h1><p class='page-subtitle'>Quotes page is under construction.</p></div>";
  }
  console.log("Quotes page loaded (placeholder)");
}
function loadPartsPage() {
  const el =
    document.getElementById("parts-container") ||
    document.getElementById("parts-content");
  if (el) {
    el.innerHTML =
      "<div class='page-header'><h1 class='page-title'><i class='fas fa-cogs'></i> Parts</h1><p class='page-subtitle'>Parts page is under construction.</p></div>";
  }
  console.log("Parts page loaded (placeholder)");
}
function loadReportsPage() {
  const el =
    document.getElementById("reports-container") ||
    document.getElementById("reports-content");
  if (el) {
    el.innerHTML =
      "<div class='page-header'><h1 class='page-title'><i class='fas fa-chart-bar'></i> Reports</h1><p class='page-subtitle'>Reports page is under construction.</p></div>";
  }
  console.log("Reports page loaded (placeholder)");
}
function loadUploadPage() {
  const el =
    document.getElementById("upload-container") ||
    document.getElementById("upload-content");
  if (el) {
    el.innerHTML =
      "<div class='page-header'><h1 class='page-title'><i class='fas fa-upload'></i> Data Import</h1><p class='page-subtitle'>Upload page is under construction.</p></div>";
  }
  console.log("Upload page loaded (placeholder)");
}
function loadErrorMonitoringPage() {
  const el =
    document.getElementById("error-monitoring-content") ||
    document.getElementById("error-monitoring-container");
  if (el) {
    el.innerHTML =
      "<div class='page-header'><h1 class='page-title'><i class='fas fa-shield-alt'></i> Error Monitoring</h1><p class='page-subtitle'>Error monitoring page is under construction.</p></div>";
  }
  console.log("Error Monitoring page loaded (placeholder)");
}

/**
 * Load Customer Portal page
 */
function loadCustomerPortalPage() {
  console.log("👥 Loading Customer Portal page...");

  const portalContainer = document.getElementById("customer-portal-container");
  if (!portalContainer) {
    console.error("❌ Customer portal container not found");
    return;
  }

  // Initialize customer portal if class exists
  if (typeof CustomerPortal === "function") {
    if (!window.portal) {
      window.portal = new CustomerPortal();
    }
  } else {
    console.warn("⚠️ CustomerPortal class not found");
    portalContainer.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">
          <i class="fas fa-user-circle"></i>
          Customer Portal
        </h1>
        <p class="page-subtitle">View your vehicle service history and health reports</p>
      </div>
      <div class="card">
        <div class="card-content">
          <p>Customer Portal functionality is loading...</p>
        </div>
      </div>
    `;
  }

  console.log("✅ Customer Portal page loaded");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  // DOM is already ready
  initializeApplication();
}

// Also initialize when window loads (for safety)
window.addEventListener("load", function () {
  if (!isInitialized) {
    console.log("🔄 Window loaded, initializing application...");
    initializeApplication();
  }
});

// Make functions globally available
window.initializeApplication = initializeApplication;
window.loadPageContent = loadPageContent;
window.testAllPages = testAllPages;
window.loadQuotesPage = loadQuotesPage;
window.loadPartsPage = loadPartsPage;
window.loadReportsPage = loadReportsPage;
window.loadUploadPage = loadUploadPage;
window.loadErrorMonitoringPage = loadErrorMonitoringPage;
window.loadCustomerPortalPage = loadCustomerPortalPage;

console.log("🚀 Garage Management System - Main App Ready");
