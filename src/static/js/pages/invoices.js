/**
 * Invoices Page Module
 */

class InvoicesPage {
    constructor() {
        this.currentPage = 1;
        this.perPage = 20;
        this.searchTerm = '';
        this.statusFilter = '';
        this.customerFilter = '';
        this.invoices = [];
        this.totalInvoices = 0;
        this.customers = [];
        this.statistics = {};
    }

    /**
     * Initialize invoices page
     */
    async init() {
        console.log('Initializing invoices page...');
        
        try {
            this.setupEventListeners();
            await Promise.all([
                this.loadInvoices(),
                this.loadCustomers(),
                this.loadStatistics()
            ]);
            
            console.log('Invoices page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize invoices page:', error);
            window.showError('Failed to load invoices data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('invoice-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadInvoices();
            }, 300));
        }

        // Filter functionality
        const statusFilter = document.getElementById('invoice-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.loadInvoices();
            });
        }

        const customerFilter = document.getElementById('invoice-customer-filter');
        if (customerFilter) {
            customerFilter.addEventListener('change', (e) => {
                this.customerFilter = e.target.value;
                this.currentPage = 1;
                this.loadInvoices();
            });
        }

        // Per page change
        const perPageSelect = document.getElementById('invoice-per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.perPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadInvoices();
            });
        }
    }

    /**
     * Load invoices data
     */
    async loadInvoices() {
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

            const response = await window.ApiService.getInvoices(params);
            
            if (response.status === 'success') {
                this.invoices = response.data.invoices || [];
                this.totalInvoices = response.data.total || 0;
                
                this.renderInvoicesTable();
                this.updatePagination(response.data);
                this.updateTableControls();
            }

        } catch (error) {
            console.error('Error loading invoices:', error);
            window.showError('Failed to load invoices');
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
     * Load invoice statistics
     */
    async loadStatistics() {
        try {
            const response = await window.ApiService.getInvoiceStatistics();
            
            if (response.status === 'success') {
                this.statistics = response.data || {};
                this.renderStatistics();
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Render invoice statistics
     */
    renderStatistics() {
        const statsContainer = document.getElementById('invoice-statistics');
        if (!statsContainer || !this.statistics) return;

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${this.statistics.total_invoices || 0}</div>
                    <div class="stat-label">Total Invoices</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.statistics.paid_invoices || 0}</div>
                    <div class="stat-label">Paid Invoices</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.statistics.pending_invoices || 0}</div>
                    <div class="stat-label">Pending Invoices</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatCurrency(this.statistics.total_amount || 0)}</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatCurrency(this.statistics.paid_amount || 0)}</div>
                    <div class="stat-label">Paid Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatCurrency(this.statistics.pending_amount || 0)}</div>
                    <div class="stat-label">Outstanding</div>
                </div>
            </div>
        `;
    }

    /**
     * Populate customer dropdowns
     */
    populateCustomerDropdowns() {
        const selects = [
            'invoice-customer-filter',
            'invoice-customer',
            'edit-invoice-customer'
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
     * Render invoices table
     */
    renderInvoicesTable() {
        const tableBody = document.getElementById('invoices-table-body');
        if (!tableBody) return;

        if (this.invoices.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="no-data">
                        ${this.searchTerm || this.statusFilter || this.customerFilter ? 
                          'No invoices found matching your criteria.' : 'No invoices found.'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.invoices.map(invoice => `
            <tr>
                <td><strong>${invoice.invoice_number}</strong></td>
                <td>${this.formatDate(invoice.created_at)}</td>
                <td>${invoice.customer?.name || '-'}</td>
                <td>${invoice.vehicle?.registration || '-'}</td>
                <td>${invoice.job?.job_number || '-'}</td>
                <td>${invoice.estimate?.estimate_number || '-'}</td>
                <td>
                    <span class="status-badge status-${invoice.status}">
                        ${this.formatStatus(invoice.status)}
                    </span>
                </td>
                <td class="${this.getDueDateClass(invoice.due_date, invoice.status)}">
                    ${this.formatDate(invoice.due_date)}
                </td>
                <td>${this.formatCurrency(invoice.amount)}</td>
                <td>${invoice.paid_at ? this.formatDate(invoice.paid_at) : '-'}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-info" onclick="invoicesPage.viewInvoice(${invoice.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="invoicesPage.editInvoice(${invoice.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${invoice.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="invoicesPage.markAsPaid(${invoice.id})" title="Mark as Paid">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="invoicesPage.downloadInvoice(${invoice.id})" title="Download PDF">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="invoicesPage.sendInvoice(${invoice.id})" title="Send Email">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="invoicesPage.deleteInvoice(${invoice.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * View invoice details
     */
    async viewInvoice(invoiceId) {
        try {
            const response = await window.ApiService.getInvoice(invoiceId);
            
            if (response.status === 'success') {
                this.showInvoiceDetail(response.data);
            }
        } catch (error) {
            console.error('Error loading invoice details:', error);
            window.showError('Failed to load invoice details');
        }
    }

    /**
     * Show invoice detail modal
     */
    showInvoiceDetail(invoice) {
        const modal = document.getElementById('invoice-detail-modal');
        const content = document.getElementById('invoice-detail-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="invoice-detail">
                <div class="detail-section">
                    <h3>Invoice Information</h3>
                    <div class="detail-grid">
                        <div><strong>Invoice Number:</strong> ${invoice.invoice_number}</div>
                        <div><strong>Status:</strong> 
                            <span class="status-badge status-${invoice.status}">
                                ${this.formatStatus(invoice.status)}
                            </span>
                        </div>
                        <div><strong>Created:</strong> ${this.formatDate(invoice.created_at)}</div>
                        <div><strong>Due Date:</strong> 
                            <span class="${this.getDueDateClass(invoice.due_date, invoice.status)}">
                                ${this.formatDate(invoice.due_date)}
                            </span>
                        </div>
                        <div><strong>Amount:</strong> ${this.formatCurrency(invoice.amount)}</div>
                        <div><strong>Paid Date:</strong> ${invoice.paid_at ? this.formatDate(invoice.paid_at) : 'Not paid'}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Customer & Vehicle</h3>
                    <div class="detail-grid">
                        <div><strong>Customer:</strong> ${invoice.customer?.name || '-'}</div>
                        <div><strong>Company:</strong> ${invoice.customer?.company || '-'}</div>
                        <div><strong>Email:</strong> ${invoice.customer?.email || '-'}</div>
                        <div><strong>Phone:</strong> ${invoice.customer?.phone || '-'}</div>
                        <div><strong>Vehicle:</strong> ${invoice.vehicle?.registration || '-'}</div>
                        <div><strong>Make/Model:</strong> ${invoice.vehicle ? `${invoice.vehicle.make} ${invoice.vehicle.model}` : '-'}</div>
                    </div>
                </div>
                
                ${invoice.job ? `
                    <div class="detail-section">
                        <h3>Related Job</h3>
                        <div class="detail-grid">
                            <div><strong>Job Number:</strong> ${invoice.job.job_number}</div>
                            <div><strong>Job Status:</strong> 
                                <span class="status-badge status-${invoice.job.status}">
                                    ${this.formatStatus(invoice.job.status)}
                                </span>
                            </div>
                            <div class="full-width"><strong>Job Description:</strong> ${invoice.job.description}</div>
                        </div>
                    </div>
                ` : ''}
                
                ${invoice.estimate ? `
                    <div class="detail-section">
                        <h3>Related Estimate</h3>
                        <div class="detail-grid">
                            <div><strong>Estimate Number:</strong> ${invoice.estimate.estimate_number}</div>
                            <div><strong>Estimate Status:</strong> 
                                <span class="status-badge status-${invoice.estimate.status}">
                                    ${this.formatStatus(invoice.estimate.status)}
                                </span>
                            </div>
                            <div><strong>Estimate Amount:</strong> ${this.formatCurrency(invoice.estimate.total_amount)}</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        window.App.showModal('invoice-detail-modal');
    }

    /**
     * Mark invoice as paid
     */
    async markAsPaid(invoiceId) {
        if (!confirm('Are you sure you want to mark this invoice as paid?')) {
            return;
        }

        try {
            const response = await window.ApiService.markInvoiceAsPaid(invoiceId);
            
            if (response.status === 'success') {
                window.showSuccess('Invoice marked as paid successfully');
                await Promise.all([
                    this.loadInvoices(),
                    this.loadStatistics()
                ]);
            }
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            window.showError('Failed to mark invoice as paid');
        }
    }

    /**
     * Download invoice PDF
     */
    async downloadInvoice(invoiceId) {
        try {
            window.showInfo('Generating PDF...');
            
            // This would typically call an API endpoint that generates a PDF
            const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${invoiceId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                window.showSuccess('Invoice downloaded successfully');
            } else {
                throw new Error('Failed to generate PDF');
            }
        } catch (error) {
            console.error('Error downloading invoice:', error);
            window.showError('Failed to download invoice PDF');
        }
    }

    /**
     * Send invoice via email
     */
    async sendInvoice(invoiceId) {
        if (!confirm('Are you sure you want to send this invoice via email?')) {
            return;
        }

        try {
            const response = await window.ApiService.sendInvoiceEmail(invoiceId);
            
            if (response.status === 'success') {
                window.showSuccess('Invoice sent successfully');
            }
        } catch (error) {
            console.error('Error sending invoice:', error);
            window.showError('Failed to send invoice');
        }
    }

    /**
     * Show overdue invoices
     */
    async showOverdueInvoices() {
        try {
            const response = await window.ApiService.getOverdueInvoices();
            
            if (response.status === 'success') {
                this.invoices = response.data || [];
                this.totalInvoices = this.invoices.length;
                this.renderInvoicesTable();
                this.updateTableControls();
                
                window.showInfo(`Found ${this.invoices.length} overdue invoices`);
            }
        } catch (error) {
            console.error('Error loading overdue invoices:', error);
            window.showError('Failed to load overdue invoices');
        }
    }

    /**
     * Get due date CSS class
     */
    getDueDateClass(dueDate, status) {
        if (status === 'paid') return 'paid';
        if (!dueDate) return '';
        
        try {
            const due = new Date(dueDate);
            const today = new Date();
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) return 'overdue';
            if (diffDays <= 7) return 'due-soon';
            return '';
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
            'pending': 'Pending',
            'paid': 'Paid',
            'overdue': 'Overdue',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
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
        const tableBody = document.getElementById('invoices-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="loading">
                        <div class="spinner"></div>
                        Loading invoices...
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Update pagination and table controls (similar to other pages)
     */
    updatePagination(data) {
        // Implementation similar to other pages
    }

    updateTableControls() {
        const rangeElement = document.getElementById('invoice-range');
        const totalElement = document.getElementById('invoice-total');

        if (rangeElement && totalElement) {
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.totalInvoices);
            
            rangeElement.textContent = `${start} to ${end}`;
            totalElement.textContent = this.totalInvoices.toLocaleString();
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
window.invoicesPage = new InvoicesPage();

// Global functions for onclick handlers
window.showOverdueInvoices = () => {
    window.invoicesPage.showOverdueInvoices();
};

window.showNewInvoiceForm = () => {
    window.invoicesPage.showNewInvoiceForm();
};
