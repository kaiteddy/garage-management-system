/**
 * Comprehensive Bug Tracking and Debugging System
 * Captures user interactions, errors, and system behavior for systematic debugging
 */

class GarageDebugSystem {
  constructor() {
    this.logs = [];
    this.isEnabled = true;
    this.maxLogs = 1000;
    this.debugPanel = null;
    this.sessionId = this.generateSessionId();

    // Initialize debugging
    this.init();
  }

  init() {
    console.log("🔧 Garage Debug System initialized");

    // Create debug panel
    this.createDebugPanel();

    // Set up event listeners
    this.setupEventListeners();

    // Override console methods
    this.setupConsoleOverride();

    // Monitor network requests
    this.setupNetworkMonitoring();

    // Track page state
    this.trackPageState();

    this.log("system", "Debug system initialized", {
      sessionId: this.sessionId,
    });
  }

  generateSessionId() {
    return (
      "debug_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  log(category, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100),
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update debug panel
    this.updateDebugPanel(logEntry);

    // Also log to console with styling
    this.styledConsoleLog(category, message, data);
  }

  styledConsoleLog(category, message, data) {
    const styles = {
      system: "color: #2563eb; font-weight: bold;",
      click: "color: #059669; font-weight: bold;",
      error: "color: #dc2626; font-weight: bold;",
      network: "color: #7c3aed; font-weight: bold;",
      navigation: "color: #ea580c; font-weight: bold;",
      form: "color: #0891b2; font-weight: bold;",
      expectation: "color: #be185d; font-weight: bold;",
    };

    const style = styles[category] || "color: #374151;";
    console.log(`%c[${category.toUpperCase()}] ${message}`, style, data);
  }

  createDebugPanel() {
    // Create floating debug panel
    const panel = document.createElement("div");
    panel.id = "garage-debug-panel";
    panel.innerHTML = `
            <div class="debug-header">
                <span>🔧 Debug Console</span>
                <div class="debug-controls">
                    <button onclick="garageDebug.togglePanel()" title="Minimize/Maximize">−</button>
                    <button onclick="garageDebug.clearLogs()" title="Clear Logs">🗑</button>
                    <button onclick="garageDebug.exportLogs()" title="Export Logs">💾</button>
                    <button onclick="garageDebug.toggleEnabled()" title="Enable/Disable">⏸</button>
                </div>
            </div>
            <div class="debug-content">
                <div class="debug-stats">
                    <span id="debug-log-count">0 logs</span>
                    <span id="debug-error-count">0 errors</span>
                    <span id="debug-network-count">0 requests</span>
                </div>
                <div class="debug-filters">
                    <label><input type="checkbox" checked data-filter="system"> System</label>
                    <label><input type="checkbox" checked data-filter="click"> Clicks</label>
                    <label><input type="checkbox" checked data-filter="error"> Errors</label>
                    <label><input type="checkbox" checked data-filter="network"> Network</label>
                    <label><input type="checkbox" checked data-filter="navigation"> Navigation</label>
                    <label><input type="checkbox" checked data-filter="form"> Forms</label>
                    <label><input type="checkbox" checked data-filter="expectation"> Expectations</label>
                </div>
                <div class="debug-logs" id="debug-logs"></div>
            </div>
        `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
            #garage-debug-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                max-height: 600px;
                background: rgba(0, 0, 0, 0.95);
                color: white;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                border: 1px solid #374151;
            }
            
            .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #1f2937;
                border-radius: 8px 8px 0 0;
                border-bottom: 1px solid #374151;
            }
            
            .debug-controls button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 2px 6px;
                margin-left: 4px;
                border-radius: 3px;
                font-size: 12px;
            }
            
            .debug-controls button:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .debug-content {
                padding: 8px;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .debug-stats {
                display: flex;
                gap: 10px;
                margin-bottom: 8px;
                font-size: 10px;
                color: #9ca3af;
            }
            
            .debug-filters {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 10px;
            }
            
            .debug-filters label {
                display: flex;
                align-items: center;
                gap: 2px;
                cursor: pointer;
            }
            
            .debug-filters input {
                margin: 0;
            }
            
            .debug-logs {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .debug-log-entry {
                margin-bottom: 4px;
                padding: 4px;
                border-radius: 3px;
                border-left: 3px solid #374151;
                font-size: 11px;
                line-height: 1.3;
            }
            
            .debug-log-entry.system { border-left-color: #2563eb; }
            .debug-log-entry.click { border-left-color: #059669; }
            .debug-log-entry.error { border-left-color: #dc2626; background: rgba(220, 38, 38, 0.1); }
            .debug-log-entry.network { border-left-color: #7c3aed; }
            .debug-log-entry.navigation { border-left-color: #ea580c; }
            .debug-log-entry.form { border-left-color: #0891b2; }
            .debug-log-entry.expectation { border-left-color: #be185d; }
            
            .debug-log-time {
                color: #6b7280;
                font-size: 10px;
            }
            
            .debug-log-message {
                color: white;
                margin: 2px 0;
            }
            
            .debug-log-data {
                color: #9ca3af;
                font-size: 10px;
                white-space: pre-wrap;
                max-height: 100px;
                overflow-y: auto;
            }
            
            .debug-panel-minimized .debug-content {
                display: none;
            }
        `;

    document.head.appendChild(style);
    document.body.appendChild(panel);
    this.debugPanel = panel;

    // Set up filter listeners
    panel.querySelectorAll("[data-filter]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.updateLogDisplay());
    });
  }

  setupEventListeners() {
    // Track all click events
    document.addEventListener(
      "click",
      (e) => {
        this.trackClickEvent(e);
      },
      true,
    );

    // Track form submissions
    document.addEventListener(
      "submit",
      (e) => {
        this.trackFormSubmission(e);
      },
      true,
    );

    // Track tab changes
    document.addEventListener("shown.bs.tab", (e) => {
      this.trackTabChange(e);
    });

    // Track page visibility changes
    document.addEventListener("visibilitychange", () => {
      this.log("navigation", "Page visibility changed", {
        hidden: document.hidden,
      });
    });

    // Track hash changes
    window.addEventListener("hashchange", (e) => {
      this.log("navigation", "Hash changed", {
        oldURL: e.oldURL,
        newURL: e.newURL,
      });
    });
  }

  trackClickEvent(e) {
    const target = e.target;
    const targetInfo = {
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      textContent: target.textContent?.substring(0, 50),
      href: target.href,
      type: target.type,
      onclick: target.onclick ? "has onclick" : "no onclick",
    };

    // Check for specific elements we're tracking
    let expectation = null;
    if (target.id === "googleDriveBtn" || target.closest("#googleDriveBtn")) {
      expectation = "Should switch to Google Drive tab, NOT open popup";
    } else if (
      target.id === "google-drive-tab" ||
      target.closest("#google-drive-tab")
    ) {
      expectation = "Should load Google Drive content inline";
    } else if (target.closest("form")) {
      expectation = "Should submit via AJAX, NOT redirect page";
    } else if (target.href && target.target === "_blank") {
      expectation = "WARNING: This will open a new window!";
    }

    this.log(
      "click",
      `Clicked: ${target.tagName}${target.id ? "#" + target.id : ""}`,
      {
        target: targetInfo,
        expectation,
        coordinates: { x: e.clientX, y: e.clientY },
      },
    );

    // Track if this should trigger specific behavior
    if (expectation) {
      this.log("expectation", expectation, { target: targetInfo });
    }
  }

  trackFormSubmission(e) {
    const form = e.target;
    const formInfo = {
      id: form.id,
      action: form.action,
      method: form.method,
      enctype: form.enctype,
      target: form.target,
    };

    this.log("form", "Form submitted", formInfo);

    // Check if this should be AJAX
    if (!e.defaultPrevented) {
      this.log(
        "expectation",
        "WARNING: Form will cause page redirect (should be AJAX)",
        formInfo,
      );
    } else {
      this.log(
        "expectation",
        "GOOD: Form submission prevented (AJAX handling)",
        formInfo,
      );
    }
  }

  trackTabChange(e) {
    const tabInfo = {
      target: e.target.id,
      targetPanel: e.target.getAttribute("data-bs-target"),
      relatedTarget: e.relatedTarget?.id,
    };

    this.log("navigation", "Tab changed", tabInfo);

    // Check if content should load
    if (tabInfo.target === "google-drive-tab") {
      this.log(
        "expectation",
        "Google Drive tab activated - should load content inline",
        tabInfo,
      );
    }
  }

  setupConsoleOverride() {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // Override console.error
    console.error = (...args) => {
      this.log("error", "Console Error", {
        message: args.join(" "),
        stack: new Error().stack,
      });
      originalError.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args) => {
      this.log("error", "Console Warning", {
        message: args.join(" "),
      });
      originalWarn.apply(console, args);
    };

    // Track unhandled errors
    window.addEventListener("error", (e) => {
      this.log("error", "JavaScript Error", {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
      });
    });

    // Track unhandled promise rejections
    window.addEventListener("unhandledrejection", (e) => {
      this.log("error", "Unhandled Promise Rejection", {
        reason: e.reason,
        promise: e.promise,
      });
    });
  }

  setupNetworkMonitoring() {
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0];
      const options = args[1] || {};

      this.log("network", "Fetch Request Started", {
        url,
        method: options.method || "GET",
        headers: options.headers,
      });

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        this.log("network", "Fetch Request Completed", {
          url,
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          ok: response.ok,
        });

        // Log failed requests as errors
        if (!response.ok) {
          this.log("error", "Network Request Failed", {
            url,
            status: response.status,
            statusText: response.statusText,
          });
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        this.log("error", "Fetch Request Error", {
          url,
          error: error.message,
          duration: `${duration}ms`,
        });

        throw error;
      }
    };

    // Override XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this._debugInfo = { method, url, startTime: Date.now() };
      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      if (this._debugInfo) {
        garageDebug.log("network", "XHR Request Started", this._debugInfo);

        this.addEventListener("load", () => {
          const duration = Date.now() - this._debugInfo.startTime;
          garageDebug.log("network", "XHR Request Completed", {
            ...this._debugInfo,
            status: this.status,
            statusText: this.statusText,
            duration: `${duration}ms`,
          });
        });

        this.addEventListener("error", () => {
          const duration = Date.now() - this._debugInfo.startTime;
          garageDebug.log("error", "XHR Request Error", {
            ...this._debugInfo,
            duration: `${duration}ms`,
          });
        });
      }

      return originalXHRSend.call(this, ...args);
    };
  }

  trackPageState() {
    this.log("system", "Page State Tracked", {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      referrer: document.referrer,
    });

    // Track DOM changes that might affect our functionality
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Track important element additions
              if (
                node.id === "googleDriveContent" ||
                node.classList?.contains("tab-pane") ||
                node.tagName === "FORM"
              ) {
                this.log("system", "Important DOM Element Added", {
                  tagName: node.tagName,
                  id: node.id,
                  className: node.className,
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  updateDebugPanel(logEntry) {
    if (!this.debugPanel) return;

    const logsContainer = this.debugPanel.querySelector("#debug-logs");
    const logElement = document.createElement("div");
    logElement.className = `debug-log-entry ${logEntry.category}`;
    logElement.setAttribute("data-category", logEntry.category);

    logElement.innerHTML = `
            <div class="debug-log-time">${new Date(logEntry.timestamp).toLocaleTimeString()}</div>
            <div class="debug-log-message">${logEntry.message}</div>
            ${
              Object.keys(logEntry.data).length > 0
                ? `<div class="debug-log-data">${JSON.stringify(logEntry.data, null, 2)}</div>`
                : ""
            }
        `;

    logsContainer.appendChild(logElement);
    logsContainer.scrollTop = logsContainer.scrollHeight;

    // Update stats
    this.updateStats();

    // Apply current filters
    this.updateLogDisplay();
  }

  updateStats() {
    const logCount = this.logs.length;
    const errorCount = this.logs.filter(
      (log) => log.category === "error",
    ).length;
    const networkCount = this.logs.filter(
      (log) => log.category === "network",
    ).length;

    const logCountEl = this.debugPanel?.querySelector("#debug-log-count");
    const errorCountEl = this.debugPanel?.querySelector("#debug-error-count");
    const networkCountEl = this.debugPanel?.querySelector(
      "#debug-network-count",
    );

    if (logCountEl) logCountEl.textContent = `${logCount} logs`;
    if (errorCountEl) errorCountEl.textContent = `${errorCount} errors`;
    if (networkCountEl) networkCountEl.textContent = `${networkCount} requests`;
  }

  updateLogDisplay() {
    if (!this.debugPanel) return;

    const activeFilters = Array.from(
      this.debugPanel.querySelectorAll("[data-filter]:checked"),
    ).map((cb) => cb.getAttribute("data-filter"));

    const logEntries = this.debugPanel.querySelectorAll(".debug-log-entry");
    logEntries.forEach((entry) => {
      const category = entry.getAttribute("data-category");
      entry.style.display = activeFilters.includes(category) ? "block" : "none";
    });
  }

  // Control methods for debug panel
  togglePanel() {
    if (this.debugPanel) {
      this.debugPanel.classList.toggle("debug-panel-minimized");
    }
  }

  clearLogs() {
    this.logs = [];
    if (this.debugPanel) {
      this.debugPanel.querySelector("#debug-logs").innerHTML = "";
      this.updateStats();
    }
    this.log("system", "Debug logs cleared");
  }

  exportLogs() {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      logs: this.logs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garage-debug-${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.log("system", "Debug logs exported");
  }

  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    this.log(
      "system",
      `Debug system ${this.isEnabled ? "enabled" : "disabled"}`,
    );

    if (this.debugPanel) {
      this.debugPanel.style.opacity = this.isEnabled ? "1" : "0.5";
    }
  }

  // Specific issue tracking methods
  trackGoogleDriveIssues() {
    this.log("expectation", "Tracking Google Drive specific issues");

    // Check for popup prevention
    const originalWindowOpen = window.open;
    window.open = (...args) => {
      this.log("error", "POPUP DETECTED! window.open() called", {
        url: args[0],
        target: args[1],
        features: args[2],
        stack: new Error().stack,
      });

      // Prevent popup and suggest alternative
      this.log("expectation", "POPUP BLOCKED - Use tab switching instead", {
        suggestedAction:
          "Use bootstrap tab switching or inline content loading",
      });

      return null; // Block the popup
    };

    // Track Google Drive button specifically
    const checkGoogleDriveButton = () => {
      const btn = document.getElementById("googleDriveBtn");
      if (btn) {
        this.log("system", "Google Drive button found", {
          hasOnClick: !!btn.onclick,
          hasEventListeners: "Unknown (use getEventListeners in DevTools)",
          innerHTML: btn.innerHTML,
        });
      } else {
        this.log("error", "Google Drive button NOT found");
      }
    };

    // Check immediately and after DOM changes
    checkGoogleDriveButton();
    setTimeout(checkGoogleDriveButton, 1000);
    setTimeout(checkGoogleDriveButton, 3000);
  }

  trackUploadIssues() {
    this.log("expectation", "Tracking upload functionality issues");

    // Monitor form submissions
    document.addEventListener("submit", (e) => {
      const form = e.target;
      if (form.id === "uploadForm" || form.closest(".upload-section")) {
        this.log("form", "Upload form submission detected", {
          formId: form.id,
          action: form.action,
          method: form.method,
          preventDefault: e.defaultPrevented,
        });

        if (!e.defaultPrevented) {
          this.log(
            "error",
            "Upload form will cause page redirect - should be AJAX",
          );
        }
      }
    });

    // Check for file input functionality
    const checkFileInputs = () => {
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input, index) => {
        this.log("system", `File input ${index + 1} found`, {
          id: input.id,
          name: input.name,
          accept: input.accept,
          multiple: input.multiple,
        });
      });
    };

    checkFileInputs();
    setTimeout(checkFileInputs, 2000);
  }

  trackTabSwitchingIssues() {
    this.log("expectation", "Tracking tab switching issues");

    // Monitor Bootstrap tab events
    document.addEventListener("show.bs.tab", (e) => {
      this.log("navigation", "Tab about to show", {
        target: e.target.id,
        relatedTarget: e.relatedTarget?.id,
      });
    });

    document.addEventListener("shown.bs.tab", (e) => {
      this.log("navigation", "Tab shown", {
        target: e.target.id,
        relatedTarget: e.relatedTarget?.id,
      });

      // Check if content loaded properly
      setTimeout(() => {
        const targetPanel = document.querySelector(
          e.target.getAttribute("data-bs-target"),
        );
        if (targetPanel) {
          const hasContent = targetPanel.innerHTML.trim().length > 0;
          this.log(
            "expectation",
            `Tab content ${hasContent ? "loaded" : "EMPTY"}`,
            {
              panelId: targetPanel.id,
              contentLength: targetPanel.innerHTML.length,
            },
          );
        }
      }, 100);
    });

    document.addEventListener("hide.bs.tab", (e) => {
      this.log("navigation", "Tab hidden", {
        target: e.target.id,
      });
    });
  }

  // Validation methods
  validateExpectedBehavior() {
    this.log("expectation", "Validating expected behavior");

    // Skip popup test since we're blocking popups intentionally
    this.log(
      "system",
      "Popup blocking is active - embedded experience enabled",
    );

    // Check for required elements
    const requiredElements = [
      "uploadForm",
      "googleDriveBtn",
      "google-drive-tab",
      "csv-upload-tab",
    ];

    requiredElements.forEach((id) => {
      const element = document.getElementById(id);
      this.log(
        "system",
        `Required element ${id}: ${element ? "FOUND" : "MISSING"}`,
        {
          element: element
            ? {
                tagName: element.tagName,
                className: element.className,
              }
            : null,
        },
      );
    });

    // Check for Bootstrap
    if (typeof bootstrap !== "undefined") {
      this.log("system", "Bootstrap is loaded");
    } else {
      this.log(
        "error",
        "Bootstrap is NOT loaded - tab functionality will fail",
      );
    }
  }

  // Generate diagnostic report
  generateDiagnosticReport() {
    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,

      // Summary statistics
      summary: {
        totalLogs: this.logs.length,
        errors: this.logs.filter((log) => log.category === "error").length,
        networkRequests: this.logs.filter((log) => log.category === "network")
          .length,
        clickEvents: this.logs.filter((log) => log.category === "click").length,
        formSubmissions: this.logs.filter((log) => log.category === "form")
          .length,
      },

      // Critical issues
      criticalIssues: this.logs.filter(
        (log) =>
          log.category === "error" ||
          (log.category === "expectation" && log.message.includes("WARNING")),
      ),

      // Recent activity (last 50 logs)
      recentActivity: this.logs.slice(-50),

      // All logs
      allLogs: this.logs,
    };

    console.log("🔧 DIAGNOSTIC REPORT:", report);
    return report;
  }
}

// Initialize the debug system
let garageDebug;

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    garageDebug = new GarageDebugSystem();
    garageDebug.trackGoogleDriveIssues();
    garageDebug.trackUploadIssues();
    garageDebug.trackTabSwitchingIssues();
    garageDebug.validateExpectedBehavior();
  });
} else {
  garageDebug = new GarageDebugSystem();
  garageDebug.trackGoogleDriveIssues();
  garageDebug.trackUploadIssues();
  garageDebug.trackTabSwitchingIssues();
  garageDebug.validateExpectedBehavior();
}

// Make it globally available
window.garageDebug = garageDebug;
