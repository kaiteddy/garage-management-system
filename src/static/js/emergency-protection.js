/**
 * Emergency Protection Script
 * Prevents crashes and ensures basic functionality
 */

console.log("🛡️ Emergency protection script loaded");

// Prevent undefined function errors
window.showPage =
  window.showPage ||
  function (pageId) {
    console.log("🔄 Emergency showPage called for:", pageId);

    // Hide all pages
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
      page.style.display = "none";
    });

    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
      page.classList.add("active");
      page.style.display = "block";
      page.style.opacity = "1";
      page.style.visibility = "visible";
    }

    // Update navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    const navItem = document.querySelector(`[onclick*="${pageId}"]`);
    if (navItem) {
      navItem.classList.add("active");
    }
  };

// Prevent undefined function errors for common functions
window.refreshData =
  window.refreshData ||
  function () {
    console.log("🔄 Refresh data called");
    location.reload();
  };

window.exportData =
  window.exportData ||
  function () {
    console.log("📤 Export data called");
    alert("Export functionality coming soon");
  };

window.printPage =
  window.printPage ||
  function () {
    console.log("🖨️ Print page called");
    window.print();
  };

window.showHelp =
  window.showHelp ||
  function () {
    console.log("❓ Show help called");
    alert("Help documentation coming soon");
  };

window.showAdminMenu =
  window.showAdminMenu ||
  function () {
    console.log("👤 Show admin menu called");
    alert("Admin menu coming soon");
  };

window.changeSpacing =
  window.changeSpacing ||
  function (spacing) {
    console.log("📏 Change spacing called:", spacing);
    document.body.setAttribute("data-spacing", spacing);
  };

// Ensure basic page visibility
document.addEventListener("DOMContentLoaded", function () {
  console.log("🛡️ Emergency protection: DOM loaded");

  // Ensure dashboard is visible by default
  setTimeout(() => {
    const dashboard = document.getElementById("dashboard");
    const dashboardContent = document.getElementById("dashboard-content");

    if (dashboard) {
      dashboard.style.display = "block";
      dashboard.style.opacity = "1";
      dashboard.style.visibility = "visible";
      dashboard.classList.add("active");
    }

    if (dashboardContent) {
      dashboardContent.style.display = "block";
      dashboardContent.style.opacity = "1";
      dashboardContent.style.visibility = "visible";
    }

    // Ensure main content is visible
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.style.display = "block";
      mainContent.style.opacity = "1";
      mainContent.style.visibility = "visible";
    }

    console.log("🛡️ Emergency protection: Basic visibility ensured");
  }, 100);
});

// Safari-specific emergency fixes
if (
  navigator.userAgent.includes("Safari") &&
  !navigator.userAgent.includes("Chrome")
) {
  console.log("🍎 Safari emergency fixes applied");

  // Force hardware acceleration for Safari
  document.body.style.transform = "translateZ(0)";
  document.body.style.willChange = "transform";

  // Ensure all pages are properly styled
  document.querySelectorAll(".page").forEach((page) => {
    page.style.transform = "translateZ(0)";
    page.style.willChange = "transform";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("🛡️ Emergency protection script initialized after DOMContentLoaded");

  // Wrap emergency error handler logic
  window.addEventListener("error", function (event) {
    console.error("💥 Emergency error caught:", event.error);

    // Prevent the error from crashing the page
    event.preventDefault();

    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px; border-radius: 5px; z-index: 10000; max-width: 300px; font-family: Arial, sans-serif;";
    errorDiv.innerHTML =
      '<strong>⚠️ System Error</strong><br>A minor error occurred. The system is still functional.<button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: white; cursor: pointer;">×</button>';
    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.parentElement.removeChild(errorDiv);
      }
    }, 5000);
  });
});

console.log("✅ Emergency protection script initialized");
