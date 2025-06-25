/**
 * Customer Portal - VHC Reports and Service History
 * Customer-facing portal for vehicle health checks and service tracking
 */

// Make CustomerPortal available globally
window.CustomerPortal = class CustomerPortal {
  constructor() {
    this.currentCustomer = null;
    this.vehicles = [];
    this.serviceHistory = [];
    this.vhcReports = [];
    this.init();
  }

  init() {
    this.createPortalHTML();
    this.setupEventListeners();
    this.loadCustomerData();
  }

  createPortalHTML() {
    const container = document.getElementById("customer-portal-container");
    if (!container) {
      console.error("Customer portal container not found");
      return;
    }

    container.innerHTML = `
            <div class="customer-portal">
                <div class="portal-header">
                    <div class="portal-branding">
                        <h1>
                            <i class="fas fa-car"></i>
                            Eli Motors Customer Portal
                        </h1>
                        <p class="portal-subtitle">Your vehicle service history and health reports</p>
                    </div>
                    
                    <div class="customer-info" id="customer-info">
                        <!-- Customer info will be loaded here -->
                    </div>
                </div>

                <div class="portal-navigation">
                    <button class="nav-btn active" onclick="portal.showSection('vehicles')" data-section="vehicles">
                        <i class="fas fa-car"></i>
                        My Vehicles
                    </button>
                    <button class="nav-btn" onclick="portal.showSection('service-history')" data-section="service-history">
                        <i class="fas fa-history"></i>
                        Service History
                    </button>
                    <button class="nav-btn" onclick="portal.showSection('vhc-reports')" data-section="vhc-reports">
                        <i class="fas fa-clipboard-check"></i>
                        Health Check Reports
                    </button>
                    <button class="nav-btn" onclick="portal.showSection('appointments')" data-section="appointments">
                        <i class="fas fa-calendar"></i>
                        Appointments
                    </button>
                </div>

                <div class="portal-content">
                    <!-- My Vehicles Section -->
                    <div id="vehicles-section" class="portal-section active">
                        <div class="section-header">
                            <h2>
                                <i class="fas fa-car"></i>
                                My Vehicles
                            </h2>
                            <p>Overview of your registered vehicles</p>
                        </div>
                        
                        <div class="vehicles-grid" id="vehicles-grid">
                            <!-- Vehicles will be loaded here -->
                        </div>
                    </div>

                    <!-- Service History Section -->
                    <div id="service-history-section" class="portal-section">
                        <div class="section-header">
                            <h2>
                                <i class="fas fa-history"></i>
                                Service History
                            </h2>
                            <p>Complete history of all services and repairs</p>
                        </div>
                        
                        <div class="service-filters">
                            <select id="vehicle-filter" onchange="portal.filterServiceHistory()">
                                <option value="">All Vehicles</option>
                            </select>
                            <select id="year-filter" onchange="portal.filterServiceHistory()">
                                <option value="">All Years</option>
                            </select>
                        </div>
                        
                        <div class="service-timeline" id="service-timeline">
                            <!-- Service history will be loaded here -->
                        </div>
                    </div>

                    <!-- VHC Reports Section -->
                    <div id="vhc-reports-section" class="portal-section">
                        <div class="section-header">
                            <h2>
                                <i class="fas fa-clipboard-check"></i>
                                Vehicle Health Check Reports
                            </h2>
                            <p>Detailed health check reports for your vehicles</p>
                        </div>
                        
                        <div class="vhc-reports-grid" id="vhc-reports-grid">
                            <!-- VHC reports will be loaded here -->
                        </div>
                    </div>

                    <!-- Appointments Section -->
                    <div id="appointments-section" class="portal-section">
                        <div class="section-header">
                            <h2>
                                <i class="fas fa-calendar"></i>
                                My Appointments
                            </h2>
                            <p>Upcoming and past appointments</p>
                        </div>
                        
                        <div class="appointments-container">
                            <div class="upcoming-appointments">
                                <h3>Upcoming Appointments</h3>
                                <div id="upcoming-appointments">
                                    <!-- Upcoming appointments will be loaded here -->
                                </div>
                            </div>
                            
                            <div class="past-appointments">
                                <h3>Past Appointments</h3>
                                <div id="past-appointments">
                                    <!-- Past appointments will be loaded here -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="book-appointment">
                            <button class="btn btn-primary" onclick="portal.openBookingWidget()">
                                <i class="fas fa-plus"></i>
                                Book New Appointment
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VHC Report Modal -->
            <div id="vhc-modal" class="modal">
                <div class="modal-content vhc-modal">
                    <div class="modal-header">
                        <h3 id="vhc-modal-title">Vehicle Health Check Report</h3>
                        <span class="close" onclick="portal.closeVHCModal()">&times;</span>
                    </div>
                    <div class="modal-body" id="vhc-modal-body">
                        <!-- VHC report details will be loaded here -->
                    </div>
                </div>
            </div>
        `;
  }

  async loadCustomerData() {
    // In a real implementation, this would get customer ID from authentication
    // For demo purposes, we'll use a mock customer ID
    const customerId = this.getCustomerIdFromURL() || 1;

    try {
      // Load customer info
      const customerResponse = await fetch(`/api/customers/${customerId}`);
      if (customerResponse.ok) {
        const customerResult = await customerResponse.json();
        this.currentCustomer = customerResult.customer;
        this.renderCustomerInfo();
      }

      // Load vehicles
      const vehiclesResponse = await fetch(
        `/api/vehicles?customer_id=${customerId}`,
      );
      if (vehiclesResponse.ok) {
        const vehiclesResult = await vehiclesResponse.json();
        this.vehicles = vehiclesResult.vehicles || [];
        this.renderVehicles();
        this.populateVehicleFilters();
      }

      // Load service history (jobs)
      const jobsResponse = await fetch(`/api/jobs?customer_id=${customerId}`);
      if (jobsResponse.ok) {
        const jobsResult = await jobsResponse.json();
        this.serviceHistory = jobsResult.jobs || [];
        this.renderServiceHistory();
      }

      // Load appointments
      this.loadAppointments(customerId);
    } catch (error) {
      console.error("Error loading customer data:", error);
    }
  }

  getCustomerIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("customer_id");
  }

  renderCustomerInfo() {
    const container = document.getElementById("customer-info");
    if (!this.currentCustomer || !container) return;

    container.innerHTML = `
            <div class="customer-details">
                <h3>${this.currentCustomer.name}</h3>
                <p><i class="fas fa-id-card"></i> Account: ${this.currentCustomer.account_number}</p>
                <p><i class="fas fa-phone"></i> ${this.currentCustomer.phone || "No phone"}</p>
                <p><i class="fas fa-envelope"></i> ${this.currentCustomer.email || "No email"}</p>
            </div>
        `;
  }

  renderVehicles() {
    const grid = document.getElementById("vehicles-grid");
    if (!grid) return;

    if (this.vehicles.length === 0) {
      grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <h3>No Vehicles Registered</h3>
                    <p>Contact us to add your vehicles to your account</p>
                </div>
            `;
      return;
    }

    grid.innerHTML = this.vehicles
      .map(
        (vehicle) => `
            <div class="vehicle-card">
                <div class="vehicle-header">
                    <span class="uk-number-plate">${vehicle.registration}</span>
                    <span class="vehicle-type">${vehicle.make} ${vehicle.model}</span>
                </div>
                
                <div class="vehicle-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Year: ${vehicle.year || "Unknown"}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-palette"></i>
                        <span>Color: ${vehicle.color || "Unknown"}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Mileage: ${vehicle.mileage ? vehicle.mileage.toLocaleString() + " miles" : "Unknown"}</span>
                    </div>
                </div>
                
                <div class="vehicle-status">
                    <div class="mot-status ${this.getMOTStatus(vehicle.mot_expiry)}">
                        <i class="fas fa-certificate"></i>
                        <span>MOT: ${vehicle.mot_expiry ? new Date(vehicle.mot_expiry).toLocaleDateString("en-GB") : "Unknown"}</span>
                    </div>
                    <div class="service-status">
                        <i class="fas fa-wrench"></i>
                        <span>Last Service: ${this.getLastServiceDate(vehicle.id)}</span>
                    </div>
                </div>
                
                <div class="vehicle-actions">
                    <button class="btn btn-sm btn-primary" onclick="portal.viewVehicleHistory(${vehicle.id})">
                        <i class="fas fa-history"></i>
                        View History
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="portal.bookService(${vehicle.id})">
                        <i class="fas fa-calendar-plus"></i>
                        Book Service
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  }

  getMOTStatus(motExpiry) {
    if (!motExpiry) return "unknown";

    const expiryDate = new Date(motExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 30) return "warning";
    return "valid";
  }

  getLastServiceDate(vehicleId) {
    const vehicleServices = this.serviceHistory.filter(
      (job) => job.vehicle_id === vehicleId,
    );
    if (vehicleServices.length === 0) return "No services";

    const lastService = vehicleServices.sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date),
    )[0];
    return new Date(lastService.created_date).toLocaleDateString("en-GB");
  }

  renderServiceHistory() {
    const timeline = document.getElementById("service-timeline");
    if (!timeline) return;

    if (this.serviceHistory.length === 0) {
      timeline.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Service History</h3>
                    <p>Your service history will appear here once you've had work done</p>
                </div>
            `;
      return;
    }

    const sortedHistory = this.serviceHistory.sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date),
    );

    timeline.innerHTML = sortedHistory
      .map(
        (job) => `
            <div class="timeline-item">
                <div class="timeline-date">
                    ${new Date(job.created_date).toLocaleDateString("en-GB")}
                </div>
                <div class="timeline-content">
                    <div class="service-header">
                        <h4>${job.description || "Service Work"}</h4>
                        <span class="job-number">${job.job_number}</span>
                    </div>
                    <div class="service-details">
                        <p><strong>Vehicle:</strong> ${this.getVehicleInfo(job.vehicle_id)}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${job.status.toLowerCase()}">${job.status}</span></p>
                        <p><strong>Total:</strong> £${(job.total_amount || 0).toFixed(2)}</p>
                        ${job.notes ? `<p><strong>Notes:</strong> ${job.notes}</p>` : ""}
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  }

  getVehicleInfo(vehicleId) {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    return vehicle
      ? `${vehicle.registration} (${vehicle.make} ${vehicle.model})`
      : "Unknown Vehicle";
  }

  populateVehicleFilters() {
    const vehicleFilter = document.getElementById("vehicle-filter");
    if (vehicleFilter && this.vehicles.length > 0) {
      vehicleFilter.innerHTML =
        '<option value="">All Vehicles</option>' +
        this.vehicles
          .map(
            (vehicle) =>
              `<option value="${vehicle.id}">${vehicle.registration} (${vehicle.make} ${vehicle.model})</option>`,
          )
          .join("");
    }

    // Populate year filter
    const yearFilter = document.getElementById("year-filter");
    if (yearFilter && this.serviceHistory.length > 0) {
      const years = [
        ...new Set(
          this.serviceHistory.map((job) =>
            new Date(job.created_date).getFullYear(),
          ),
        ),
      ];
      years.sort((a, b) => b - a);

      yearFilter.innerHTML =
        '<option value="">All Years</option>' +
        years
          .map((year) => `<option value="${year}">${year}</option>`)
          .join("");
    }
  }

  async loadAppointments(customerId) {
    try {
      const response = await fetch(
        `/api/appointments?customer_id=${customerId}`,
      );
      if (response.ok) {
        const result = await response.json();
        const appointments = result.appointments || [];

        const today = new Date();
        const upcoming = appointments.filter(
          (apt) => new Date(apt.appointment_date) >= today,
        );
        const past = appointments.filter(
          (apt) => new Date(apt.appointment_date) < today,
        );

        this.renderAppointments(upcoming, "upcoming-appointments");
        this.renderAppointments(past, "past-appointments");
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
    }
  }

  renderAppointments(appointments, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (appointments.length === 0) {
      container.innerHTML = `
                <div class="no-appointments">
                    <p>No ${containerId.includes("upcoming") ? "upcoming" : "past"} appointments</p>
                </div>
            `;
      return;
    }

    container.innerHTML = appointments
      .map(
        (apt) => `
            <div class="appointment-card">
                <div class="appointment-header">
                    <h4>${apt.service_type || "Service"}</h4>
                    <span class="appointment-status ${apt.status.toLowerCase()}">${apt.status}</span>
                </div>
                <div class="appointment-details">
                    <p><i class="fas fa-calendar"></i> ${new Date(apt.appointment_date).toLocaleDateString("en-GB")}</p>
                    <p><i class="fas fa-clock"></i> ${apt.start_time} - ${apt.end_time}</p>
                    <p><i class="fas fa-car"></i> ${this.getVehicleInfo(apt.vehicle_id)}</p>
                    ${apt.description ? `<p><i class="fas fa-info-circle"></i> ${apt.description}</p>` : ""}
                </div>
            </div>
        `,
      )
      .join("");
  }

  showSection(sectionName) {
    // Update navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .querySelector(`[data-section="${sectionName}"]`)
      .classList.add("active");

    // Update content
    document.querySelectorAll(".portal-section").forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(`${sectionName}-section`).classList.add("active");
  }

  filterServiceHistory() {
    const vehicleId = document.getElementById("vehicle-filter").value;
    const year = document.getElementById("year-filter").value;

    let filteredHistory = this.serviceHistory;

    if (vehicleId) {
      filteredHistory = filteredHistory.filter(
        (job) => job.vehicle_id == vehicleId,
      );
    }

    if (year) {
      filteredHistory = filteredHistory.filter(
        (job) => new Date(job.created_date).getFullYear() == year,
      );
    }

    // Re-render with filtered data
    const timeline = document.getElementById("service-timeline");
    if (filteredHistory.length === 0) {
      timeline.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <h3>No Results</h3>
                    <p>No service history matches your filters</p>
                </div>
            `;
      return;
    }

    const sortedHistory = filteredHistory.sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date),
    );

    timeline.innerHTML = sortedHistory
      .map(
        (job) => `
            <div class="timeline-item">
                <div class="timeline-date">
                    ${new Date(job.created_date).toLocaleDateString("en-GB")}
                </div>
                <div class="timeline-content">
                    <div class="service-header">
                        <h4>${job.description || "Service Work"}</h4>
                        <span class="job-number">${job.job_number}</span>
                    </div>
                    <div class="service-details">
                        <p><strong>Vehicle:</strong> ${this.getVehicleInfo(job.vehicle_id)}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${job.status.toLowerCase()}">${job.status}</span></p>
                        <p><strong>Total:</strong> £${(job.total_amount || 0).toFixed(2)}</p>
                        ${job.notes ? `<p><strong>Notes:</strong> ${job.notes}</p>` : ""}
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  }

  viewVehicleHistory(vehicleId) {
    // Filter service history for this vehicle and show it
    document.getElementById("vehicle-filter").value = vehicleId;
    this.filterServiceHistory();
    this.showSection("service-history");
  }

  bookService(vehicleId) {
    // Open booking widget with pre-selected vehicle
    this.openBookingWidget(vehicleId);
  }

  openBookingWidget(vehicleId = null) {
    // In a real implementation, this would open the booking widget
    // For now, we'll show an alert
    alert(
      "Booking widget would open here. In a real implementation, this would redirect to the online booking system.",
    );
  }

  closeVHCModal() {
    document.getElementById("vhc-modal").style.display = "none";
  }

  setupEventListeners() {
    // Add any additional event listeners here
  }
};

// Global portal instance
let portal;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("customer-portal-container")) {
    portal = new CustomerPortal();
  }
});
