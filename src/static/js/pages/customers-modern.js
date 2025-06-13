/**
 * Modern Customers Page Module
 * Enhanced with beautiful UI, advanced filtering, and smooth interactions
 */

class ModernCustomers {
    constructor() {
        this.currentPage = 1;
        this.perPage = 25;
        this.searchTerm = '';
        this.statusFilter = '';
        this.typeFilter = '';
        this.sortField = 'name';
        this.sortDirection = 'asc';
        this.customers = [];
        this.totalCustomers = 0;
        this.stats = {};
        this.searchTimeout = null;
        this.currentCustomer = null;
    }

    /**
     * Initialize modern customers page
     */
    async init() {
        console.log('Initializing modern customers page...');
        
        try {
            this.setupEventListeners();
            await Promise.all([
                this.loadCustomers(),
                this.loadCustomerStats()
            ]);
            
            console.log('Modern customers page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize customers page:', error);
            window.showError('Failed to load customers data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }
                
                this.searchTimeout = setTimeout(() => {
                    this.searchTerm = e.target.value;
                    this.currentPage = 1;
                    this.loadCustomers();
                }, 300);
            });
        }

        // Filter functionality
        const statusFilter = document.getElementById('customer-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.loadCustomers();
            });
        }

        const typeFilter = document.getElementById('customer-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.typeFilter = e.target.value;
                this.currentPage = 1;
                this.loadCustomers();
            });
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

        // Sorting
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) {
                const sortable = e.target.closest('.sortable');
                const field = sortable.dataset.sort;
                this.handleSort(field);
            }
        });
    }

    /**
     * Load customers data
     */
    async loadCustomers() {
        try {
            this.showLoadingState();

            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.perPage,
                sort: this.sortField,
                direction: this.sortDirection
            });

            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }

            if (this.statusFilter) {
                params.append('status', this.statusFilter);
            }

            if (this.typeFilter) {
                params.append('type', this.typeFilter);
            }

            const response = await fetch(`/api/customers?${params}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.customers = data.data.customers || [];
                this.totalCustomers = data.data.total || 0;
                
                this.renderCustomersTable();
                this.updatePagination(data.data);
                this.updateTableControls();
            } else {
                throw new Error(data.message || 'Failed to load customers');
            }

        } catch (error) {
            console.error('Error loading customers:', error);
            window.showError('Failed to load customers');
            this.showErrorState();
        }
    }

    /**
     * Load customer statistics
     */
    async loadCustomerStats() {
        try {
            const response = await fetch('/api/customers/stats');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.stats = data.data || {};
                this.updateStatsCards();
            }
        } catch (error) {
            console.error('Error loading customer stats:', error);
        }
    }

    /**
     * Update statistics cards
     */
    updateStatsCards() {
        this.updateElement('total-customers', this.stats.total_customers || 0);
        this.updateElement('active-customers', this.stats.active_customers || 0);
        this.updateElement('new-customers', this.stats.new_customers || 0);
        this.updateElement('customer-revenue', this.formatCurrency(this.stats.total_revenue || 0));
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
                    <td colspan="8" class="text-center py-12">
                        <div class="text-gray-500">
                            <i class="fas fa-users text-4xl mb-4"></i>
                            <p class="text-lg font-medium">No customers found</p>
                            <p class="text-sm">
                                ${this.searchTerm || this.statusFilter || this.typeFilter ? 
                                  'Try adjusting your search or filters.' : 
                                  'Get started by adding your first customer.'}
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.customers.map(customer => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td>
                    <div class="flex items-center gap-3">
                        <div class="customer-avatar">
                            ${this.getCustomerInitials(customer)}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">
                                ${customer.first_name} ${customer.last_name}
                            </div>
                            <div class="text-sm text-gray-500">
                                ID: ${customer.id}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-sm">
                        <div class="text-gray-900">${customer.email}</div>
                        <div class="text-gray-500">${customer.phone || '-'}</div>
                    </div>
                </td>
                <td>
                    <div class="text-sm">
                        ${customer.company ? `
                            <div class="text-gray-900">${customer.company}</div>
                            <span class="badge customer-type-business">Business</span>
                        ` : `
                            <span class="badge customer-type-individual">Individual</span>
                        `}
                    </div>
                </td>
                <td>
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-semibold text-gray-900">${customer.vehicles_count || 0}</span>
                        <i class="fas fa-car text-gray-400"></i>
                    </div>
                </td>
                <td>
                    <div class="text-sm text-gray-900">
                        ${customer.last_service ? this.formatDate(customer.last_service) : 'Never'}
                    </div>
                </td>
                <td>
                    <div class="text-sm font-semibold text-gray-900">
                        ${this.formatCurrency(customer.total_spent || 0)}
                    </div>
                </td>
                <td>
                    <span class="badge customer-status-${customer.is_active ? 'active' : 'inactive'}">
                        ${customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="flex items-center gap-2">
                        <button onclick="modernCustomers.viewCustomer(${customer.id})" 
                                class="btn btn-xs btn-ghost" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="modernCustomers.editCustomer(${customer.id})" 
                                class="btn btn-xs btn-primary" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="modernCustomers.viewCustomerVehicles(${customer.id})" 
                                class="btn btn-xs btn-secondary" title="View Vehicles">
                            <i class="fas fa-car"></i>
                        </button>
                        <div class="relative">
                            <button onclick="modernCustomers.showCustomerMenu(${customer.id}, event)" 
                                    class="btn btn-xs btn-ghost" title="More Actions">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Handle sorting
     */
    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        this.updateSortIndicators();
        this.loadCustomers();
    }

    /**
     * Update sort indicators
     */
    updateSortIndicators() {
        document.querySelectorAll('.sortable').forEach(el => {
            el.classList.remove('asc', 'desc');
            if (el.dataset.sort === this.sortField) {
                el.classList.add(this.sortDirection);
            }
        });
    }

    /**
     * View customer details
     */
    async viewCustomer(customerId) {
        try {
            const response = await fetch(`/api/customers/${customerId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentCustomer = data.data;
                this.showCustomerDetail(data.data);
            } else {
                throw new Error(data.message || 'Failed to load customer details');
            }
        } catch (error) {
            console.error('Error loading customer details:', error);
            window.showError('Failed to load customer details');
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Customer Information -->
                <div class="space-y-6">
                    <div class="customer-detail-section">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Name:</span>
                                <span class="font-medium">${customer.first_name} ${customer.last_name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Email:</span>
                                <span class="font-medium">${customer.email}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Phone:</span>
                                <span class="font-medium">${customer.phone || '-'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Status:</span>
                                <span class="badge customer-status-${customer.is_active ? 'active' : 'inactive'}">
                                    ${customer.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    ${customer.company ? `
                        <div class="customer-detail-section">
                            <h4 class="text-lg font-semibold text-gray-900 mb-4">Business Information</h4>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Company:</span>
                                    <span class="font-medium">${customer.company}</span>
                                </div>
                                ${customer.vat_number ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">VAT Number:</span>
                                        <span class="font-medium">${customer.vat_number}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

                    ${customer.address ? `
                        <div class="customer-detail-section">
                            <h4 class="text-lg font-semibold text-gray-900 mb-4">Address</h4>
                            <div class="text-gray-900">
                                ${customer.address}<br>
                                ${customer.city ? customer.city + ', ' : ''}
                                ${customer.county ? customer.county + ' ' : ''}
                                ${customer.postcode || ''}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Statistics and Activity -->
                <div class="space-y-6">
                    <div class="customer-detail-section">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Statistics</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="stat-card">
                                <div class="text-2xl font-bold text-primary-600">${customer.vehicles_count || 0}</div>
                                <div class="text-sm text-gray-600">Vehicles</div>
                            </div>
                            <div class="stat-card">
                                <div class="text-2xl font-bold text-success-600">${customer.jobs_count || 0}</div>
                                <div class="text-sm text-gray-600">Jobs</div>
                            </div>
                            <div class="stat-card">
                                <div class="text-2xl font-bold text-warning-600">${customer.estimates_count || 0}</div>
                                <div class="text-sm text-gray-600">Estimates</div>
                            </div>
                            <div class="stat-card">
                                <div class="text-2xl font-bold text-purple-600">${this.formatCurrency(customer.total_spent || 0)}</div>
                                <div class="text-sm text-gray-600">Total Spent</div>
                            </div>
                        </div>
                    </div>

                    ${customer.notes ? `
                        <div class="customer-detail-section">
                            <h4 class="text-lg font-semibold text-gray-900 mb-4">Notes</h4>
                            <div class="text-gray-700 bg-gray-50 p-4 rounded-lg">
                                ${customer.notes}
                            </div>
                        </div>
                    ` : ''}

                    <div class="customer-detail-section">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Customer Since:</span>
                                <span class="font-medium">${this.formatDate(customer.created_at)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Last Service:</span>
                                <span class="font-medium">${customer.last_service ? this.formatDate(customer.last_service) : 'Never'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Last Updated:</span>
                                <span class="font-medium">${this.formatDate(customer.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modal);
    }

    /**
     * Helper methods
     */
    getCustomerInitials(customer) {
        const first = customer.first_name ? customer.first_name.charAt(0).toUpperCase() : '';
        const last = customer.last_name ? customer.last_name.charAt(0).toUpperCase() : '';
        return first + last || '?';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(amount || 0);
    }

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

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showLoadingState() {
        const tableBody = document.getElementById('customers-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-12">
                        <div class="flex items-center justify-center gap-3">
                            <div class="spinner"></div>
                            <span class="text-gray-600">Loading customers...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    showErrorState() {
        const tableBody = document.getElementById('customers-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-12">
                        <div class="text-red-500">
                            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                            <p class="text-lg font-medium">Failed to load customers</p>
                            <button onclick="modernCustomers.loadCustomers()" class="btn btn-primary mt-4">
                                <i class="fas fa-retry"></i>
                                Try Again
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    showModal(modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    }

    hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

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

    updatePagination(data) {
        // Pagination implementation would go here
        // Similar to other page modules
    }
}

// Global functions
window.showNewCustomerModal = function() {
    // Implementation for showing new customer modal
    console.log('Show new customer modal');
};

window.closeCustomerDetail = function() {
    const modal = document.getElementById('customer-detail-modal');
    if (modal && window.modernCustomers) {
        window.modernCustomers.hideModal(modal);
    }
};

window.editCurrentCustomer = function() {
    if (window.modernCustomers && window.modernCustomers.currentCustomer) {
        window.modernCustomers.editCustomer(window.modernCustomers.currentCustomer.id);
    }
};

window.clearFilters = function() {
    if (window.modernCustomers) {
        document.getElementById('customer-search').value = '';
        document.getElementById('customer-status-filter').value = '';
        document.getElementById('customer-type-filter').value = '';
        
        window.modernCustomers.searchTerm = '';
        window.modernCustomers.statusFilter = '';
        window.modernCustomers.typeFilter = '';
        window.modernCustomers.currentPage = 1;
        window.modernCustomers.loadCustomers();
    }
};

window.exportCustomers = function() {
    // Implementation for exporting customers
    console.log('Export customers');
};

// Export for global use
window.ModernCustomers = ModernCustomers;
