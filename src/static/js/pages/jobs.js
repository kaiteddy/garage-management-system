/**
 * Jobs Page Module
 */

class JobsPage {
    constructor() {
        this.currentPage = 1;
        this.perPage = 20;
        this.searchTerm = '';
        this.statusFilter = '';
        this.customerFilter = '';
        this.jobs = [];
        this.totalJobs = 0;
        this.customers = [];
    }

    /**
     * Initialize jobs page
     */
    async init() {
        console.log('Initializing jobs page...');
        
        try {
            this.setupEventListeners();
            await Promise.all([
                this.loadJobs(),
                this.loadCustomers()
            ]);
            
            console.log('Jobs page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize jobs page:', error);
            this.showError('Failed to load jobs data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('job-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadJobs();
            }, 300));
        }

        // Filter functionality
        const statusFilter = document.getElementById('job-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.loadJobs();
            });
        }

        const customerFilter = document.getElementById('job-customer-filter');
        if (customerFilter) {
            customerFilter.addEventListener('change', (e) => {
                this.customerFilter = e.target.value;
                this.currentPage = 1;
                this.loadJobs();
            });
        }

        // Per page change
        const perPageSelect = document.getElementById('job-per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.perPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadJobs();
            });
        }
    }

    /**
     * Load jobs data
     */
    async loadJobs() {
        try {
            this.showLoadingState();

            const params = {
                page: this.currentPage,
                per_page: this.perPage
            };

            if (this.searchTerm) {
                params.search = this.searchTerm;
            }

            if (this.statusFilter) {
                params.status = this.statusFilter;
            }

            if (this.customerFilter) {
                params.customer_id = this.customerFilter;
            }

            const response = await window.ApiService.getJobs(params);
            
            if (response.status === 'success') {
                this.jobs = response.data.jobs || [];
                this.totalJobs = response.data.total || 0;
                
                this.renderJobsTable();
                this.updatePagination(response.data);
                this.updateTableControls();
            }

        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showError('Failed to load jobs');
        }
    }

    /**
     * Load customers for dropdowns
     */
    async loadCustomers() {
        try {
            const response = await window.ApiService.getCustomers({ per_page: 1000 });
            
            if (response.status === 'success') {
                this.customers = response.data.customers || [];
                this.populateCustomerDropdowns();
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    /**
     * Populate customer dropdowns
     */
    populateCustomerDropdowns() {
        const selects = [
            'job-customer-filter',
            'job-customer',
            'edit-job-customer'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                const isFilter = selectId.includes('filter');
                
                select.innerHTML = `<option value="">${isFilter ? 'All Customers' : 'Select Customer'}</option>` +
                    this.customers.map(customer => 
                        `<option value="${customer.id}">${customer.name}${customer.company ? ` (${customer.company})` : ''}</option>`
                    ).join('');
                
                if (currentValue) {
                    select.value = currentValue;
                }
            }
        });
    }

    /**
     * Render jobs table
     */
    renderJobsTable() {
        const tableBody = document.getElementById('jobs-table-body');
        if (!tableBody) return;

        if (this.jobs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">
                        ${this.searchTerm || this.statusFilter || this.customerFilter ? 
                          'No jobs found matching your criteria.' : 'No jobs found.'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.jobs.map(job => `
            <tr>
                <td><strong>${job.job_number}</strong></td>
                <td>${this.formatDate(job.created_at)}</td>
                <td>${job.customer?.name || '-'}</td>
                <td>${job.vehicle?.registration || '-'}</td>
                <td class="description-cell" title="${job.description}">
                    ${this.truncateText(job.description, 50)}
                </td>
                <td>
                    <span class="status-badge status-${job.status}">
                        ${this.formatStatus(job.status)}
                    </span>
                </td>
                <td>${job.estimates_count || 0}</td>
                <td>${this.formatCurrency(job.total_amount)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-info" onclick="jobsPage.viewJob(${job.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="jobsPage.editJob(${job.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="jobsPage.createEstimate(${job.id})" title="Create Estimate">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="jobsPage.deleteJob(${job.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * View job details
     */
    async viewJob(jobId) {
        try {
            const response = await window.ApiService.getJob(jobId);
            
            if (response.status === 'success') {
                this.showJobDetail(response.data);
            }
        } catch (error) {
            console.error('Error loading job details:', error);
            this.showError('Failed to load job details');
        }
    }

    /**
     * Show job detail modal
     */
    showJobDetail(job) {
        const modal = document.getElementById('job-detail-modal');
        const content = document.getElementById('job-detail-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="job-detail">
                <div class="detail-section">
                    <h3>Job Information</h3>
                    <div class="detail-grid">
                        <div><strong>Job Number:</strong> ${job.job_number}</div>
                        <div><strong>Status:</strong> 
                            <span class="status-badge status-${job.status}">
                                ${this.formatStatus(job.status)}
                            </span>
                        </div>
                        <div><strong>Created:</strong> ${this.formatDate(job.created_at)}</div>
                        <div><strong>Total Amount:</strong> ${this.formatCurrency(job.total_amount)}</div>
                        <div class="full-width"><strong>Description:</strong> ${job.description}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Customer & Vehicle</h3>
                    <div class="detail-grid">
                        <div><strong>Customer:</strong> ${job.customer?.name || '-'}</div>
                        <div><strong>Company:</strong> ${job.customer?.company || '-'}</div>
                        <div><strong>Vehicle:</strong> ${job.vehicle?.registration || '-'}</div>
                        <div><strong>Make/Model:</strong> ${job.vehicle ? `${job.vehicle.make} ${job.vehicle.model}` : '-'}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Estimates (${job.estimates ? job.estimates.length : 0})</h3>
                    <div class="estimates-list">
                        ${job.estimates && job.estimates.length > 0 ? 
                            job.estimates.map(estimate => `
                                <div class="estimate-item">
                                    <strong>${estimate.estimate_number}</strong> - ${this.formatCurrency(estimate.total_amount)}
                                    <span class="status-badge status-${estimate.status}">${this.formatStatus(estimate.status)}</span>
                                </div>
                            `).join('') : 
                            '<p>No estimates found</p>'
                        }
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Invoices (${job.invoices ? job.invoices.length : 0})</h3>
                    <div class="invoices-list">
                        ${job.invoices && job.invoices.length > 0 ? 
                            job.invoices.map(invoice => `
                                <div class="invoice-item">
                                    <strong>${invoice.invoice_number}</strong> - ${this.formatCurrency(invoice.amount)}
                                    <span class="status-badge status-${invoice.status}">${this.formatStatus(invoice.status)}</span>
                                </div>
                            `).join('') : 
                            '<p>No invoices found</p>'
                        }
                    </div>
                </div>
            </div>
        `;

        window.App.showModal('job-detail-modal');
    }

    /**
     * Show new job form
     */
    showNewJobForm() {
        // Reset form
        document.getElementById('new-job-form').reset();
        this.populateCustomerDropdowns();
        window.App.showModal('new-job-modal');
    }

    /**
     * Create new job
     */
    async createJob(formData) {
        try {
            const response = await window.ApiService.createJob(formData);
            
            if (response.status === 'success') {
                this.showSuccess('Job created successfully');
                window.App.closeModal();
                await this.loadJobs();
            }
        } catch (error) {
            console.error('Error creating job:', error);
            this.showError('Failed to create job');
        }
    }

    /**
     * Load customer vehicles when customer is selected
     */
    async loadCustomerVehicles() {
        const customerSelect = document.getElementById('job-customer');
        const vehicleSelect = document.getElementById('job-vehicle');
        
        if (!customerSelect || !vehicleSelect) return;
        
        const customerId = customerSelect.value;
        
        if (!customerId) {
            vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';
            return;
        }
        
        try {
            const response = await window.ApiService.getVehicles({ customer_id: customerId });
            
            if (response.status === 'success') {
                const vehicles = response.data.vehicles || [];
                vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>' +
                    vehicles.map(vehicle => 
                        `<option value="${vehicle.id}">${vehicle.registration} - ${vehicle.make} ${vehicle.model}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading customer vehicles:', error);
        }
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    /**
     * Truncate text
     */
    truncateText(text, maxLength) {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (!amount) return '£0.00';
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(amount);
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const tableBody = document.getElementById('jobs-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading">
                        <div class="spinner"></div>
                        Loading jobs...
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Update pagination (similar to other pages)
     */
    updatePagination(data) {
        // Implementation similar to customers/vehicles pages
        // ... pagination logic
    }

    /**
     * Update table controls
     */
    updateTableControls() {
        const rangeElement = document.getElementById('job-range');
        const totalElement = document.getElementById('job-total');

        if (rangeElement && totalElement) {
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.totalJobs);
            
            rangeElement.textContent = `${start} to ${end}`;
            totalElement.textContent = this.totalJobs.toLocaleString();
        }
    }

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        alert(message); // Temporary fallback
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log(message);
        alert(message); // Temporary fallback
    }
}

// Create global instance
window.jobsPage = new JobsPage();

// Global functions for onclick handlers
window.searchJobs = () => {
    // Handled by input event listener
};

window.filterJobsByStatus = () => {
    // Handled by change event listener
};

window.filterJobsByCustomer = () => {
    // Handled by change event listener
};

window.changeJobPerPage = () => {
    // Handled by change event listener
};

window.showNewJobForm = () => {
    window.jobsPage.showNewJobForm();
};

window.createJob = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    await window.jobsPage.createJob(data);
};

window.loadCustomerVehicles = () => {
    window.jobsPage.loadCustomerVehicles();
};
