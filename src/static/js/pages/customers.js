/**
 * Customers Page Module
 */

class CustomersPage {
    constructor() {
        this.currentPage = 1;
        this.perPage = 50;
        this.searchTerm = '';
        this.customers = [];
        this.totalCustomers = 0;
    }

    /**
     * Initialize customers page
     */
    async init() {
        console.log('Initializing customers page...');
        
        try {
            this.setupEventListeners();
            await this.loadCustomers();
            
            console.log('Customers page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize customers page:', error);
            this.showError('Failed to load customers data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadCustomers();
            }, 300));
        }

        // Per page change
        const perPageSelect = document.getElementById('customer-per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.perPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadCustomers();
            });
        }
    }

    /**
     * Load customers data
     */
    async loadCustomers() {
        try {
            this.showLoadingState();

            const params = {
                page: this.currentPage,
                per_page: this.perPage
            };

            if (this.searchTerm) {
                params.search = this.searchTerm;
            }

            const response = await window.ApiService.getCustomers(params);
            
            if (response.status === 'success') {
                this.customers = response.data.customers || [];
                this.totalCustomers = response.data.total || 0;
                
                this.renderCustomersTable();
                this.updatePagination(response.data);
                this.updateTableControls();
            }

        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Failed to load customers');
        }
    }

    /**
     * Render customers table
     */
    renderCustomersTable() {
        const tableBody = document.getElementById('customers-table-body');
        if (!tableBody) return;

        if (this.customers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-data">
                        ${this.searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.customers.map(customer => `
            <tr>
                <td>${customer.account_number || '-'}</td>
                <td>${customer.name || '-'}</td>
                <td>${customer.company || '-'}</td>
                <td>${this.formatAddress(customer)}</td>
                <td>${customer.postcode || '-'}</td>
                <td>${customer.phone || customer.mobile || '-'}</td>
                <td>${customer.vehicles_count || 0}</td>
                <td>${customer.documents_count || 0}</td>
                <td>${this.formatDate(customer.last_invoice_date)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-info" onclick="customersPage.viewCustomer(${customer.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="customersPage.editCustomer(${customer.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="customersPage.deleteCustomer(${customer.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Update pagination
     */
    updatePagination(data) {
        const paginationContainer = document.getElementById('customer-pagination');
        if (!paginationContainer) return;

        const totalPages = data.pages || 1;
        const currentPage = data.current_page || 1;
        const hasNext = data.has_next || false;
        const hasPrev = data.has_prev || false;

        let paginationHTML = '<div class="pagination-controls">';

        // Previous button
        if (hasPrev) {
            paginationHTML += `<button class="btn btn-sm" onclick="customersPage.goToPage(${currentPage - 1})">Previous</button>`;
        }

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn btn-sm ${activeClass}" onclick="customersPage.goToPage(${i})">${i}</button>`;
        }

        // Next button
        if (hasNext) {
            paginationHTML += `<button class="btn btn-sm" onclick="customersPage.goToPage(${currentPage + 1})">Next</button>`;
        }

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    /**
     * Update table controls
     */
    updateTableControls() {
        const rangeElement = document.getElementById('customer-range');
        const totalElement = document.getElementById('customer-total');

        if (rangeElement && totalElement) {
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.totalCustomers);
            
            rangeElement.textContent = `${start} to ${end}`;
            totalElement.textContent = this.totalCustomers.toLocaleString();
        }
    }

    /**
     * Go to specific page
     */
    async goToPage(page) {
        this.currentPage = page;
        await this.loadCustomers();
    }

    /**
     * View customer details
     */
    async viewCustomer(customerId) {
        try {
            const response = await window.ApiService.getCustomer(customerId);
            
            if (response.status === 'success') {
                this.showCustomerDetail(response.data);
            }
        } catch (error) {
            console.error('Error loading customer details:', error);
            this.showError('Failed to load customer details');
        }
    }

    /**
     * Show customer detail modal
     */
    showCustomerDetail(customer) {
        const modal = document.getElementById('customer-detail-modal');
        const content = document.getElementById('customer-detail-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="customer-detail">
                <div class="detail-section">
                    <h3>Customer Information</h3>
                    <div class="detail-grid">
                        <div><strong>Account Number:</strong> ${customer.account_number || '-'}</div>
                        <div><strong>Name:</strong> ${customer.name || '-'}</div>
                        <div><strong>Company:</strong> ${customer.company || '-'}</div>
                        <div><strong>Email:</strong> ${customer.email || '-'}</div>
                        <div><strong>Phone:</strong> ${customer.phone || '-'}</div>
                        <div><strong>Mobile:</strong> ${customer.mobile || '-'}</div>
                        <div><strong>Address:</strong> ${this.formatFullAddress(customer)}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Vehicles (${customer.vehicles ? customer.vehicles.length : 0})</h3>
                    <div class="vehicles-list">
                        ${customer.vehicles && customer.vehicles.length > 0 ? 
                            customer.vehicles.map(vehicle => `
                                <div class="vehicle-item">
                                    <strong>${vehicle.registration}</strong> - ${vehicle.make} ${vehicle.model}
                                    <span class="mot-status">(MOT: ${this.formatDate(vehicle.mot_expiry)})</span>
                                </div>
                            `).join('') : 
                            '<p>No vehicles registered</p>'
                        }
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Recent Jobs (${customer.jobs ? customer.jobs.length : 0})</h3>
                    <div class="jobs-list">
                        ${customer.jobs && customer.jobs.length > 0 ? 
                            customer.jobs.slice(0, 5).map(job => `
                                <div class="job-item">
                                    <strong>${job.job_number}</strong> - ${job.description}
                                    <span class="job-date">(${this.formatDate(job.created_at)})</span>
                                </div>
                            `).join('') : 
                            '<p>No jobs found</p>'
                        }
                    </div>
                </div>
            </div>
        `;

        window.App.showModal('customer-detail-modal');
    }

    /**
     * Edit customer
     */
    editCustomer(customerId) {
        // Implementation for edit customer
        console.log('Edit customer:', customerId);
        // This would open the edit customer modal with pre-filled data
    }

    /**
     * Delete customer
     */
    async deleteCustomer(customerId) {
        if (!confirm('Are you sure you want to delete this customer?')) {
            return;
        }

        try {
            await window.ApiService.deleteCustomer(customerId);
            this.showSuccess('Customer deleted successfully');
            await this.loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            this.showError('Failed to delete customer');
        }
    }

    /**
     * Show new customer form
     */
    showNewCustomerForm() {
        window.App.showModal('new-customer-modal');
    }

    /**
     * Create new customer
     */
    async createCustomer(formData) {
        try {
            const response = await window.ApiService.createCustomer(formData);
            
            if (response.status === 'success') {
                this.showSuccess('Customer created successfully');
                window.App.closeModal();
                await this.loadCustomers();
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            this.showError('Failed to create customer');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const tableBody = document.getElementById('customers-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="loading">
                        <div class="spinner"></div>
                        Loading customers...
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Format address
     */
    formatAddress(customer) {
        const parts = [
            customer.address_line1,
            customer.address_line2,
            customer.city
        ].filter(Boolean);
        
        return parts.length > 0 ? parts.join(', ') : '-';
    }

    /**
     * Format full address
     */
    formatFullAddress(customer) {
        const parts = [
            customer.address_line1,
            customer.address_line2,
            customer.city,
            customer.postcode
        ].filter(Boolean);
        
        return parts.length > 0 ? parts.join(', ') : '-';
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
        // Implementation depends on notification system
        alert(message); // Temporary fallback
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log(message);
        // Implementation depends on notification system
        alert(message); // Temporary fallback
    }
}

// Create global instance
window.customersPage = new CustomersPage();

// Global functions for onclick handlers
window.searchCustomers = () => {
    // This is handled by the input event listener
};

window.changeCustomerPerPage = () => {
    // This is handled by the change event listener
};

window.showNewCustomerForm = () => {
    window.customersPage.showNewCustomerForm();
};

window.createCustomer = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    await window.customersPage.createCustomer(data);
};
