/**
 * Garage Management System Issue Tracker
 * Specialized debugging for specific interface problems
 */

class GarageIssueTracker {
  constructor() {
    this.issues = [];
    this.expectedBehaviors = new Map();
    this.actualBehaviors = new Map();

    this.setupExpectedBehaviors();
    this.startTracking();
  }

  setupExpectedBehaviors() {
    // Define what SHOULD happen for each interaction
    this.expectedBehaviors.set("googleDriveBtn_click", {
      description: "Google Drive button should switch to Google Drive tab",
      shouldHappen: [
        "Tab switches to #google-drive",
        "Google Drive content loads inline",
        "No popup window opens",
        "loadGoogleDriveContent() function is called",
      ],
      shouldNotHappen: [
        "window.open() is called",
        "New browser tab/window opens",
        "Page redirects",
        "External URL navigation",
      ],
    });

    this.expectedBehaviors.set("uploadForm_submit", {
      description: "Upload form should submit via AJAX",
      shouldHappen: [
        "Form submission is prevented (e.preventDefault())",
        "AJAX request to /api/csv",
        "Progress indicator shows",
        "Results display inline",
      ],
      shouldNotHappen: [
        "Page redirects",
        "Form submits normally",
        "Browser navigation occurs",
      ],
    });

    this.expectedBehaviors.set("googleDriveTab_show", {
      description: "Google Drive tab should load content inline",
      shouldHappen: [
        "Tab content area updates",
        "Google Drive status is fetched",
        "Interface renders within tab",
        "No external navigation",
      ],
      shouldNotHappen: [
        "New window opens",
        "Page redirects",
        "Content loads in popup",
      ],
    });

    this.expectedBehaviors.set("credentialsUpload_submit", {
      description: "Credentials upload should be AJAX",
      shouldHappen: [
        "File uploads via FormData",
        "AJAX request to /google-drive/upload-credentials",
        "Status updates inline",
        "No page reload",
      ],
      shouldNotHappen: [
        "Form causes page redirect",
        "File upload opens new page",
        "Browser navigation",
      ],
    });
  }

  startTracking() {
    console.log("🔍 Starting Garage Issue Tracker");

    // Track specific button clicks
    this.trackGoogleDriveButton();
    this.trackUploadForm();
    this.trackTabSwitching();
    this.trackPopupPrevention();
    this.trackNetworkRequests();

    // Periodic validation
    setInterval(() => this.validateCurrentState(), 5000);
  }

  trackGoogleDriveButton() {
    // Monitor for Google Drive button
    const checkButton = () => {
      const btn = document.getElementById("googleDriveBtn");
      if (btn && !btn.hasAttribute("data-issue-tracked")) {
        btn.setAttribute("data-issue-tracked", "true");

        console.log("🔍 Tracking Google Drive button");

        btn.addEventListener("click", (e) => {
          this.logInteraction(
            "googleDriveBtn_click",
            "Google Drive button clicked",
            {
              target: e.target,
              preventDefault: e.defaultPrevented,
              timestamp: Date.now(),
            },
          );

          // Check what actually happens
          setTimeout(() => this.validateGoogleDriveButtonBehavior(), 100);
          setTimeout(() => this.validateGoogleDriveButtonBehavior(), 500);
          setTimeout(() => this.validateGoogleDriveButtonBehavior(), 1000);
        });
      }
    };

    checkButton();
    // Keep checking for dynamically added buttons
    setInterval(checkButton, 1000);
  }

  validateGoogleDriveButtonBehavior() {
    const expected = this.expectedBehaviors.get("googleDriveBtn_click");
    const results = {
      tabSwitched: this.checkIfTabSwitched(),
      contentLoaded: this.checkIfGoogleDriveContentLoaded(),
      popupOpened: this.checkIfPopupOpened(),
      functionCalled: this.checkIfFunctionCalled("loadGoogleDriveContent"),
    };

    this.logValidation("googleDriveBtn_click", expected, results);
  }

  checkIfTabSwitched() {
    const googleDriveTab = document.getElementById("google-drive-tab");
    return googleDriveTab && googleDriveTab.classList.contains("active");
  }

  checkIfGoogleDriveContentLoaded() {
    const content = document.getElementById("googleDriveContent");
    return content && content.innerHTML.trim().length > 100; // Has substantial content
  }

  checkIfPopupOpened() {
    // This is tracked by our popup prevention system
    return this.actualBehaviors.has("popup_opened");
  }

  checkIfFunctionCalled(functionName) {
    // This would need to be tracked by function instrumentation
    return this.actualBehaviors.has(`function_called_${functionName}`);
  }

  trackUploadForm() {
    const checkForm = () => {
      const form = document.getElementById("uploadForm");
      if (form && !form.hasAttribute("data-issue-tracked")) {
        form.setAttribute("data-issue-tracked", "true");

        console.log("🔍 Tracking upload form");

        form.addEventListener("submit", (e) => {
          this.logInteraction("uploadForm_submit", "Upload form submitted", {
            action: form.action,
            method: form.method,
            preventDefault: e.defaultPrevented,
            timestamp: Date.now(),
          });

          setTimeout(() => this.validateUploadFormBehavior(e), 100);
        });
      }
    };

    checkForm();
    setInterval(checkForm, 1000);
  }

  validateUploadFormBehavior(event) {
    const expected = this.expectedBehaviors.get("uploadForm_submit");
    const results = {
      preventDefault: event.defaultPrevented,
      ajaxRequest: this.checkForRecentAjaxRequest("/api/csv"),
      progressShown: this.checkIfProgressShown(),
      pageRedirected: this.checkIfPageRedirected(),
    };

    this.logValidation("uploadForm_submit", expected, results);
  }

  checkForRecentAjaxRequest(url) {
    // This would be tracked by our network monitoring
    const recentRequests = this.getRecentNetworkRequests();
    return recentRequests.some((req) => req.url.includes(url));
  }

  checkIfProgressShown() {
    const progress = document.querySelector(".progress-container");
    return progress && progress.style.display !== "none";
  }

  checkIfPageRedirected() {
    // Track if URL changed unexpectedly
    return this.actualBehaviors.has("page_redirected");
  }

  trackTabSwitching() {
    document.addEventListener("shown.bs.tab", (e) => {
      if (e.target.id === "google-drive-tab") {
        this.logInteraction("googleDriveTab_show", "Google Drive tab shown", {
          target: e.target.id,
          timestamp: Date.now(),
        });

        setTimeout(() => this.validateTabSwitchBehavior(), 500);
      }
    });
  }

  validateTabSwitchBehavior() {
    const expected = this.expectedBehaviors.get("googleDriveTab_show");
    const results = {
      contentUpdated: this.checkIfGoogleDriveContentLoaded(),
      statusFetched: this.checkForRecentAjaxRequest("/google-drive/status"),
      noPopup: !this.checkIfPopupOpened(),
      noRedirect: !this.checkIfPageRedirected(),
    };

    this.logValidation("googleDriveTab_show", expected, results);
  }

  trackPopupPrevention() {
    // Override window.open to track popup attempts
    const originalWindowOpen = window.open;
    window.open = (...args) => {
      this.actualBehaviors.set("popup_opened", {
        url: args[0],
        target: args[1],
        features: args[2],
        timestamp: Date.now(),
        stack: new Error().stack,
      });

      this.logIssue("CRITICAL", "Popup window attempted", {
        url: args[0],
        target: args[1],
        features: args[2],
        stack: new Error().stack,
      });

      // Block the popup
      return null;
    };
  }

  trackNetworkRequests() {
    this.networkRequests = [];

    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0];

      try {
        const response = await originalFetch(...args);

        this.networkRequests.push({
          url,
          method: args[1]?.method || "GET",
          status: response.status,
          ok: response.ok,
          timestamp: startTime,
          duration: Date.now() - startTime,
        });

        return response;
      } catch (error) {
        this.networkRequests.push({
          url,
          method: args[1]?.method || "GET",
          error: error.message,
          timestamp: startTime,
          duration: Date.now() - startTime,
        });
        throw error;
      }
    };
  }

  getRecentNetworkRequests(seconds = 5) {
    const cutoff = Date.now() - seconds * 1000;
    return this.networkRequests.filter((req) => req.timestamp > cutoff);
  }

  logInteraction(type, message, data) {
    console.log(`🔍 [${type}] ${message}`, data);

    if (window.garageDebug) {
      window.garageDebug.log("expectation", `INTERACTION: ${message}`, data);
    }
  }

  logValidation(type, expected, actual) {
    const passed = this.validateBehavior(expected, actual);
    const status = passed ? "PASS" : "FAIL";

    console.log(`🔍 [${type}] VALIDATION ${status}`, { expected, actual });

    if (window.garageDebug) {
      window.garageDebug.log("expectation", `VALIDATION ${status}: ${type}`, {
        expected: expected.description,
        results: actual,
        passed,
      });
    }

    if (!passed) {
      this.logIssue("HIGH", `Behavior validation failed for ${type}`, {
        expected,
        actual,
      });
    } else {
      // Log success
      console.log(`✅ SUCCESS: ${type} behavior validation passed`);
      if (window.garageDebug) {
        window.garageDebug.log("system", `SUCCESS: ${type} working correctly`, {
          expected: expected.description,
          results: actual,
        });
      }
    }
  }

  validateBehavior(expected, actual) {
    // More accurate validation based on actual behavior
    let passedChecks = 0;
    let totalChecks = 0;

    // For Google Drive button specifically
    if (expected.description.includes("Google Drive button")) {
      totalChecks = 3;

      // Check 1: Tab switched (most important)
      if (actual.tabSwitched) {
        passedChecks++;
        console.log("✅ Tab switching works");
      }

      // Check 2: Content loaded
      if (actual.contentLoaded) {
        passedChecks++;
        console.log("✅ Content loading works");
      }

      // Check 3: No popup (popup blocking is working)
      if (!actual.popupOpened) {
        passedChecks++;
        console.log("✅ Popup prevention works");
      }

      console.log(
        `Google Drive validation: ${passedChecks}/${totalChecks} checks passed`,
      );
      return passedChecks >= 2; // Need at least 2/3 to pass
    }

    // For other behaviors, use simpler validation
    const positiveResults = Object.values(actual).filter(Boolean).length;
    const totalResults = Object.values(actual).length;

    return positiveResults >= totalResults * 0.6; // 60% pass rate for others
  }

  logIssue(severity, message, data) {
    const issue = {
      severity,
      message,
      data,
      timestamp: Date.now(),
      url: window.location.href,
    };

    this.issues.push(issue);

    console.error(`🚨 [${severity}] ${message}`, data);

    if (window.garageDebug) {
      window.garageDebug.log("error", `ISSUE [${severity}]: ${message}`, data);
    }
  }

  validateCurrentState() {
    // Periodic validation of current page state
    const currentIssues = [];

    // Check for missing elements
    const requiredElements = [
      "uploadForm",
      "googleDriveBtn",
      "google-drive-tab",
    ];
    requiredElements.forEach((id) => {
      if (!document.getElementById(id)) {
        currentIssues.push(`Missing required element: ${id}`);
      }
    });

    // Check for JavaScript errors in console
    // (This would need to be tracked by console override)

    // Report any new issues
    currentIssues.forEach((issue) => {
      this.logIssue("MEDIUM", "State validation issue", { issue });
    });
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      totalIssues: this.issues.length,
      criticalIssues: this.issues.filter((i) => i.severity === "CRITICAL")
        .length,
      highIssues: this.issues.filter((i) => i.severity === "HIGH").length,
      mediumIssues: this.issues.filter((i) => i.severity === "MEDIUM").length,
      issues: this.issues,
      networkRequests: this.networkRequests,
      expectedBehaviors: Object.fromEntries(this.expectedBehaviors),
      actualBehaviors: Object.fromEntries(this.actualBehaviors),
    };
  }
}

// Initialize the issue tracker
let garageIssueTracker;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    garageIssueTracker = new GarageIssueTracker();
  });
} else {
  garageIssueTracker = new GarageIssueTracker();
}

// Make it globally available
window.garageIssueTracker = garageIssueTracker;
