/**
 * Estimates Page Module
 */

class EstimatesPage {
    constructor() {
        this.currentPage = 1;
        this.perPage = 20;
        this.searchTerm = '';
        this.statusFilter = '';
        this.customerFilter = '';
        this.estimates = [];
        this.totalEstimates = 0;
        this.customers = [];
    }

    /**
     * Initialize estimates page
     */
    async init() {
        console.log('Initializing estimates page...');
        
        try {
            this.setupEventListeners();
            await Promise.all([
                this.loadEstimates(),
                this.loadCustomers()
            ]);
            
            console.log('Estimates page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize estimates page:', error);
            window.showError('Failed to load estimates data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('estimate-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadEstimates();
            }, 300));
        }

        // Filter functionality
        const statusFilter = document.getElementById('estimate-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.loadEstimates();
            });
        }

        const customerFilter = document.getElementById('estimate-customer-filter');
        if (customerFilter) {
            customerFilter.addEventListener('change', (e) => {
                this.customerFilter = e.target.value;
                this.currentPage = 1;
                this.loadEstimates();
            });
        }

        // Per page change
        const perPageSelect = document.getElementById('estimate-per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.perPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadEstimates();
            });
        }
    }

    /**
     * Load estimates data
     */
    async loadEstimates() {
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

            const response = await window.ApiService.getEstimates(params);
            
            if (response.status === 'success') {
                this.estimates = response.data.estimates || [];
                this.totalEstimates = response.data.total || 0;
                
                this.renderEstimatesTable();
                this.updatePagination(response.data);
                this.updateTableControls();
            }

        } catch (error) {
            console.error('Error loading estimates:', error);
            window.showError('Failed to load estimates');
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
            'estimate-customer-filter',
            'estimate-customer',
            'edit-estimate-customer'
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
     * Render estimates table
     */
    renderEstimatesTable() {
        const tableBody = document.getElementById('estimates-table-body');
        if (!tableBody) return;

        if (this.estimates.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-data">
                        ${this.searchTerm || this.statusFilter || this.customerFilter ? 
                          'No estimates found matching your criteria.' : 'No estimates found.'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.estimates.map(estimate => `
            <tr>
                <td><strong>${estimate.estimate_number}</strong></td>
                <td>${this.formatDate(estimate.created_at)}</td>
                <td>${estimate.customer?.name || '-'}</td>
                <td>${estimate.vehicle?.registration || '-'}</td>
                <td>${estimate.job?.job_number || '-'}</td>
                <td class="description-cell" title="${estimate.description}">
                    ${this.truncateText(estimate.description, 50)}
                </td>
                <td>
                    <span class="status-badge status-${estimate.status}">
                        ${this.formatStatus(estimate.status)}
                    </span>
                </td>
                <td class="${this.getValidityClass(estimate.valid_until)}">
                    ${this.formatDate(estimate.valid_until)}
                </td>
                <td>${this.formatCurrency(estimate.total_amount)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-info" onclick="estimatesPage.viewEstimate(${estimate.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="estimatesPage.editEstimate(${estimate.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="estimatesPage.acceptEstimate(${estimate.id})" title="Accept">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="estimatesPage.createInvoice(${estimate.id})" title="Create Invoice">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="estimatesPage.deleteEstimate(${estimate.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * View estimate details
     */
    async viewEstimate(estimateId) {
        try {
            const response = await window.ApiService.getEstimate(estimateId);
            
            if (response.status === 'success') {
                this.showEstimateDetail(response.data);
            }
        } catch (error) {
            console.error('Error loading estimate details:', error);
            window.showError('Failed to load estimate details');
        }
    }

    /**
     * Show estimate detail modal
     */
    showEstimateDetail(estimate) {
        const modal = document.getElementById('estimate-detail-modal');
        const content = document.getElementById('estimate-detail-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="estimate-detail">
                <div class="detail-section">
                    <h3>Estimate Information</h3>
                    <div class="detail-grid">
                        <div><strong>Estimate Number:</strong> ${estimate.estimate_number}</div>
                        <div><strong>Status:</strong> 
                            <span class="status-badge status-${estimate.status}">
                                ${this.formatStatus(estimate.status)}
                            </span>
                        </div>
                        <div><strong>Created:</strong> ${this.formatDate(estimate.created_at)}</div>
                        <div><strong>Valid Until:</strong> 
                            <span class="${this.getValidityClass(estimate.valid_until)}">
                                ${this.formatDate(estimate.valid_until)}
                            </span>
                        </div>
                        <div><strong>Total Amount:</strong> ${this.formatCurrency(estimate.total_amount)}</div>
                        <div class="full-width"><strong>Description:</strong> ${estimate.description}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Customer & Vehicle</h3>
                    <div class="detail-grid">
                        <div><strong>Customer:</strong> ${estimate.customer?.name || '-'}</div>
                        <div><strong>Company:</strong> ${estimate.customer?.company || '-'}</div>
                        <div><strong>Vehicle:</strong> ${estimate.vehicle?.registration || '-'}</div>
                        <div><strong>Make/Model:</strong> ${estimate.vehicle ? `${estimate.vehicle.make} ${estimate.vehicle.model}` : '-'}</div>
                    </div>
                </div>
                
                ${estimate.job ? `
                    <div class="detail-section">
                        <h3>Related Job</h3>
                        <div class="detail-grid">
                            <div><strong>Job Number:</strong> ${estimate.job.job_number}</div>
                            <div><strong>Job Status:</strong> 
                                <span class="status-badge status-${estimate.job.status}">
                                    ${this.formatStatus(estimate.job.status)}
                                </span>
                            </div>
                            <div class="full-width"><strong>Job Description:</strong> ${estimate.job.description}</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="detail-section">
                    <h3>Invoices (${estimate.invoices ? estimate.invoices.length : 0})</h3>
                    <div class="invoices-list">
                        ${estimate.invoices && estimate.invoices.length > 0 ? 
                            estimate.invoices.map(invoice => `
                                <div class="invoice-item">
                                    <strong>${invoice.invoice_number}</strong> - ${this.formatCurrency(invoice.amount)}
                                    <span class="status-badge status-${invoice.status}">${this.formatStatus(invoice.status)}</span>
                                </div>
                            `).join('') : 
                            '<p>No invoices created from this estimate</p>'
                        }
                    </div>
                </div>
            </div>
        `;

        window.App.showModal('estimate-detail-modal');
    }

    /**
     * Accept estimate
     */
    async acceptEstimate(estimateId) {
        if (!confirm('Are you sure you want to accept this estimate?')) {
            return;
        }

        try {
            const response = await window.ApiService.updateEstimate(estimateId, { status: 'accepted' });
            
            if (response.status === 'success') {
                window.showSuccess('Estimate accepted successfully');
                await this.loadEstimates();
            }
        } catch (error) {
            console.error('Error accepting estimate:', error);
            window.showError('Failed to accept estimate');
        }
    }

    /**
     * Create invoice from estimate
     */
    async createInvoice(estimateId) {
        try {
            const estimate = this.estimates.find(e => e.id === estimateId);
            if (!estimate) {
                window.showError('Estimate not found');
                return;
            }

            // Pre-fill invoice form with estimate data
            const invoiceData = {
                customer_id: estimate.customer_id,
                vehicle_id: estimate.vehicle_id,
                job_id: estimate.job_id,
                estimate_id: estimateId,
                amount: estimate.total_amount
            };

            const response = await window.ApiService.createInvoice(invoiceData);
            
            if (response.status === 'success') {
                window.showSuccess('Invoice created successfully from estimate');
                await this.loadEstimates();
            }
        } catch (error) {
            console.error('Error creating invoice from estimate:', error);
            window.showError('Failed to create invoice from estimate');
        }
    }

    /**
     * Show expired estimates
     */
    async showExpiredEstimates() {
        try {
            const response = await window.ApiService.getExpiredEstimates();
            
            if (response.status === 'success') {
                this.estimates = response.data || [];
                this.totalEstimates = this.estimates.length;
                this.renderEstimatesTable();
                this.updateTableControls();
                
                window.showInfo(`Found ${this.estimates.length} expired estimates`);
            }
        } catch (error) {
            console.error('Error loading expired estimates:', error);
            window.showError('Failed to load expired estimates');
        }
    }

    /**
     * Get validity CSS class
     */
    getValidityClass(validUntil) {
        if (!validUntil) return '';
        
        try {
            const validDate = new Date(validUntil);
            const today = new Date();
            const diffTime = validDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) return 'expired';
            if (diffDays <= 7) return 'expiring-soon';
            return 'valid';
        } catch (error) {
            return '';
        }
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        const statusMap = {
            'draft': 'Draft',
            'sent': 'Sent',
            'accepted': 'Accepted',
            'rejected': 'Rejected',
            'expired': 'Expired'
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
        const tableBody = document.getElementById('estimates-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="loading">
                        <div class="spinner"></div>
                        Loading estimates...
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Update pagination and table controls (similar to other pages)
     */
    updatePagination(data) {
        // Implementation similar to jobs page
    }

    updateTableControls() {
        const rangeElement = document.getElementById('estimate-range');
        const totalElement = document.getElementById('estimate-total');

        if (rangeElement && totalElement) {
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.totalEstimates);
            
            rangeElement.textContent = `${start} to ${end}`;
            totalElement.textContent = this.totalEstimates.toLocaleString();
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
}

// Create global instance
window.estimatesPage = new EstimatesPage();

// Global functions for onclick handlers
window.searchEstimates = () => {
    // Handled by input event listener
};

window.filterEstimatesByStatus = () => {
    // Handled by change event listener
};

window.filterEstimatesByCustomer = () => {
    // Handled by change event listener
};

window.changeEstimatePerPage = () => {
    // Handled by change event listener
};

window.showExpiredEstimates = () => {
    window.estimatesPage.showExpiredEstimates();
};

window.showNewEstimateForm = () => {
    window.estimatesPage.showNewEstimateForm();
};
