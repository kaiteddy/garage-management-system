/**
 * Integrated Upload System for Garage Management
 * Handles CSV uploads, Google Drive sync, and bulk operations within the main system
 */

class IntegratedUploadSystem {
  constructor() {
    this.currentUpload = null;
    this.uploadProgress = 0;
    this.init();
  }

  init() {
    console.log("🔧 Initializing Integrated Upload System");
    this.setupEventListeners();
    this.loadStatistics();
    this.initializeGoogleDriveTab();
  }

  setupEventListeners() {
    // File input and upload zone
    const uploadZone = document.getElementById("integratedUploadZone");
    const fileInput = document.getElementById("integratedFileInput");
    const browseBtn = document.getElementById("integratedBrowseBtn");
    const uploadForm = document.getElementById("integratedUploadForm");

    if (uploadZone) {
      // Drag and drop
      uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragover");
      });

      uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("dragover");
      });

      uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelection(files[0]);
        }
      });

      uploadZone.addEventListener("click", () => {
        fileInput?.click();
      });
    }

    if (browseBtn) {
      browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput?.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelection(e.target.files[0]);
        }
      });
    }

    if (uploadForm) {
      uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleUpload();
      });
    }

    // Tab switching
    const googleDriveTab = document.getElementById("google-drive-tab");
    if (googleDriveTab) {
      googleDriveTab.addEventListener("shown.bs.tab", () => {
        this.loadGoogleDriveContent();
      });
    }

    // Data type selection
    const dataTypeSelect = document.getElementById("dataType");
    if (dataTypeSelect) {
      dataTypeSelect.addEventListener("change", () => {
        this.updateUploadButton();
      });
    }
  }

  handleFileSelection(file) {
    console.log("📁 File selected:", file.name);

    const fileInput = document.getElementById("integratedFileInput");
    const uploadZone = document.getElementById("integratedUploadZone");

    if (fileInput && uploadZone) {
      // Update UI to show selected file
      uploadZone.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-file-csv text-success"></i>
                </div>
                <h5>${file.name}</h5>
                <p class="text-muted">File size: ${this.formatFileSize(file.size)}</p>
                <button type="button" class="btn btn-outline-secondary" onclick="integratedUpload.clearFileSelection()">
                    <i class="fas fa-times"></i> Clear
                </button>
            `;

      // Create a new FileList and assign to input
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;

      this.updateUploadButton();
    }
  }

  clearFileSelection() {
    const fileInput = document.getElementById("integratedFileInput");
    const uploadZone = document.getElementById("integratedUploadZone");

    if (fileInput) fileInput.value = "";

    if (uploadZone) {
      uploadZone.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <h5>Drag & Drop your CSV file here</h5>
                <p class="text-muted">or click to browse files</p>
                <button type="button" class="btn btn-primary" id="integratedBrowseBtn">
                    <i class="fas fa-folder-open"></i> Browse Files
                </button>
            `;

      // Re-attach browse button event
      const browseBtn = document.getElementById("integratedBrowseBtn");
      if (browseBtn) {
        browseBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          fileInput?.click();
        });
      }
    }

    this.updateUploadButton();
  }

  updateUploadButton() {
    const uploadBtn = document.getElementById("integratedUploadBtn");
    const fileInput = document.getElementById("integratedFileInput");
    const dataType = document.getElementById("dataType");

    if (uploadBtn && fileInput && dataType) {
      const hasFile = fileInput.files.length > 0;
      const hasDataType = dataType.value !== "";

      uploadBtn.disabled = !(hasFile && hasDataType);
    }
  }

  async handleUpload() {
    const form = document.getElementById("integratedUploadForm");
    const progressContainer = document.querySelector(".progress-container");
    const progressBar = document.querySelector(".progress-bar");
    const resultsContainer = document.getElementById(
      "integratedResultsContainer",
    );

    if (!form) return;

    try {
      // Show progress
      if (progressContainer) progressContainer.style.display = "block";
      if (resultsContainer) resultsContainer.style.display = "none";

      const formData = new FormData(form);

      // Upload with progress tracking
      const response = await this.uploadWithProgress(
        "/api/csv",
        formData,
        (progress) => {
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
          }
        },
      );

      const result = await response.json();

      // Hide progress
      if (progressContainer) progressContainer.style.display = "none";

      // Show results
      this.showUploadResults(result);

      // Refresh statistics
      this.loadStatistics();

      // Clear form
      this.clearFileSelection();
    } catch (error) {
      console.error("Upload error:", error);
      this.showUploadResults({
        success: false,
        error: "Upload failed: " + error.message,
      });

      if (progressContainer) progressContainer.style.display = "none";
    }
  }

  async uploadWithProgress(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr);
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error"));
      });

      xhr.open("POST", url);
      xhr.send(formData);
    });
  }

  showUploadResults(result) {
    const resultsContainer = document.getElementById(
      "integratedResultsContainer",
    );
    const resultsAlert = document.getElementById("integratedResultsAlert");
    const resultsDetails = document.getElementById("integratedResultsDetails");

    if (!resultsContainer || !resultsAlert) return;

    resultsContainer.style.display = "block";

    if (result.success) {
      resultsAlert.className = "alert alert-success";
      resultsAlert.innerHTML = `
                <h6><i class="fas fa-check-circle"></i> Upload Successful!</h6>
                <p class="mb-0">${result.message || "Data uploaded successfully"}</p>
            `;

      if (result.details && resultsDetails) {
        resultsDetails.innerHTML = `
                    <div class="mt-3">
                        <h6>Upload Details:</h6>
                        <ul class="list-unstyled">
                            <li><strong>Records processed:</strong> ${result.details.processed || 0}</li>
                            <li><strong>Records added:</strong> ${result.details.added || 0}</li>
                            <li><strong>Records updated:</strong> ${result.details.updated || 0}</li>
                            <li><strong>Records skipped:</strong> ${result.details.skipped || 0}</li>
                        </ul>
                    </div>
                `;
      }
    } else {
      resultsAlert.className = "alert alert-danger";
      resultsAlert.innerHTML = `
                <h6><i class="fas fa-exclamation-triangle"></i> Upload Failed</h6>
                <p class="mb-0">${result.error || "An error occurred during upload"}</p>
            `;

      if (resultsDetails) resultsDetails.innerHTML = "";
    }
  }

  async loadStatistics() {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();

      const statsGrid = document.getElementById("integratedStatsGrid");
      if (statsGrid && data.counts) {
        statsGrid.innerHTML = Object.entries(data.counts)
          .map(
            ([table, count]) => `
                        <div class="col-md-2 col-sm-4 col-6">
                            <div class="stat-card">
                                <div class="stat-number">${count.toLocaleString()}</div>
                                <div class="stat-label">${table.charAt(0).toUpperCase() + table.slice(1)}</div>
                            </div>
                        </div>
                    `,
          )
          .join("");
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
    }
  }

  initializeGoogleDriveTab() {
    // Initialize Google Drive content when tab is first accessed
    const googleDriveTab = document.getElementById("google-drive-tab");
    if (googleDriveTab) {
      googleDriveTab.addEventListener(
        "shown.bs.tab",
        () => {
          this.loadGoogleDriveContent();
        },
        { once: true },
      );
    }
  }

  async loadGoogleDriveContent() {
    const contentDiv = document.getElementById("integratedGoogleDriveContent");
    if (!contentDiv) return;

    try {
      contentDiv.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading Google Drive integration...</p>
                </div>
            `;

      const response = await fetch("/google-drive/status");
      const status = await response.json();

      const connected = status.status?.connected || false;

      contentDiv.innerHTML = this.renderGoogleDriveInterface(connected, status);
    } catch (error) {
      console.error("Failed to load Google Drive content:", error);
      contentDiv.innerHTML = `
                <div class="alert alert-warning">
                    <h6><i class="fas fa-exclamation-triangle"></i> Google Drive Integration</h6>
                    <p>Unable to load Google Drive interface. Please try refreshing the page.</p>
                    <button class="btn btn-primary" onclick="integratedUpload.loadGoogleDriveContent()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            `;
    }
  }

  renderGoogleDriveInterface(connected, status) {
    if (!connected) {
      return `
                <div class="row">
                    <div class="col-md-8 mx-auto">
                        <div class="text-center mb-4">
                            <i class="fab fa-google-drive fa-3x text-primary mb-3"></i>
                            <h5>Google Drive Integration</h5>
                            <p class="text-muted">Connect your Google Drive account to automatically sync data files.</p>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h6><i class="fas fa-cloud-upload-alt"></i> Setup Instructions</h6>
                            </div>
                            <div class="card-body">
                                <ol>
                                    <li>Create Google Cloud credentials (JSON file)</li>
                                    <li>Upload credentials using the form below</li>
                                    <li>Authorize access to your Google Drive</li>
                                    <li>Configure folder mappings for automatic sync</li>
                                </ol>
                                
                                <form id="integratedCredentialsForm" class="mt-3">
                                    <div class="mb-3">
                                        <label for="integratedCredentialsFile" class="form-label">Google Cloud Credentials (JSON)</label>
                                        <input type="file" class="form-control" id="integratedCredentialsFile" accept=".json" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-upload"></i> Upload Credentials
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    } else {
      return `
                <div class="row">
                    <div class="col-12">
                        <div class="alert alert-success">
                            <h6><i class="fas fa-check-circle"></i> Google Drive Connected</h6>
                            <p class="mb-0">Your Google Drive account is connected and ready for synchronization.</p>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h6><i class="fas fa-folder"></i> Folder Configuration</h6>
                                    </div>
                                    <div class="card-body">
                                        <p>Configure which Google Drive folders contain your data files.</p>
                                        <button class="btn btn-primary" onclick="integratedUpload.configureFolders()">
                                            <i class="fas fa-cog"></i> Configure Folders
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h6><i class="fas fa-sync"></i> Synchronization</h6>
                                    </div>
                                    <div class="card-body">
                                        <p>Manually sync data or enable automatic synchronization.</p>
                                        <button class="btn btn-success" onclick="integratedUpload.syncNow()">
                                            <i class="fas fa-sync"></i> Sync Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Utility methods for other functionality
  configureFolders() {
    showNotification("Folder configuration interface would load here", "info");
  }

  syncNow() {
    showNotification("Manual sync would start here", "info");
  }
}

// Global functions for template downloads and bulk operations
window.downloadTemplate = function (type) {
  const link = document.createElement("a");
  link.href = `/api/template/${type}`;
  link.download = `${type}_template.csv`;
  link.click();
};

window.confirmBulkOperation = function (operation) {
  if (
    confirm(
      `Are you sure you want to ${operation} all data? This action cannot be undone.`,
    )
  ) {
    showNotification(`${operation} operation would start here`, "warning");
  }
};

window.syncWithGoogleDrive = function () {
  showNotification("Google Drive sync would start here", "info");
};

window.validateData = function () {
  showNotification("Data validation would start here", "info");
};

window.optimizeDatabase = function () {
  showNotification("Database optimization would start here", "info");
};

window.refreshUploadStats = function () {
  if (window.integratedUpload) {
    window.integratedUpload.loadStatistics();
  }
};

// Initialize when page loads
let integratedUpload;
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("integratedUploadForm")) {
    integratedUpload = new IntegratedUploadSystem();
    window.integratedUpload = integratedUpload;
  }
});
