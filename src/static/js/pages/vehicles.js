/**
 * Vehicles Page Module
 */

class VehiclesPage {
    constructor() {
        this.currentPage = 1;
        this.perPage = 50;
        this.searchTerm = '';
        this.vehicles = [];
        this.totalVehicles = 0;
        this.customers = [];
    }

    /**
     * Initialize vehicles page
     */
    async init() {
        console.log('Initializing vehicles page...');
        
        try {
            this.setupEventListeners();
            await Promise.all([
                this.loadVehicles(),
                this.loadCustomers()
            ]);
            
            console.log('Vehicles page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize vehicles page:', error);
            this.showError('Failed to load vehicles data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('vehicle-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadVehicles();
            }, 300));
        }

        // Per page change
        const perPageSelect = document.getElementById('vehicle-per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.perPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadVehicles();
            });
        }
    }

    /**
     * Load vehicles data
     */
    async loadVehicles() {
        try {
            this.showLoadingState();

            const params = {
                page: this.currentPage,
                per_page: this.perPage
            };

            if (this.searchTerm) {
                params.search = this.searchTerm;
            }

            const response = await window.ApiService.getVehicles(params);
            
            if (response.status === 'success') {
                this.vehicles = response.data.vehicles || [];
                this.totalVehicles = response.data.total || 0;
                
                this.renderVehiclesTable();
                this.updatePagination(response.data);
                this.updateTableControls();
            }

        } catch (error) {
            console.error('Error loading vehicles:', error);
            this.showError('Failed to load vehicles');
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
            'vehicle-customer',
            'edit-vehicle-customer'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select Customer</option>' +
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
     * Render vehicles table
     */
    renderVehiclesTable() {
        const tableBody = document.getElementById('vehicles-table-body');
        if (!tableBody) return;

        if (this.vehicles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-data">
                        ${this.searchTerm ? 'No vehicles found matching your search.' : 'No vehicles found.'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.vehicles.map(vehicle => `
            <tr>
                <td><strong>${vehicle.registration}</strong></td>
                <td>${vehicle.make || '-'}</td>
                <td>${vehicle.model || '-'}</td>
                <td>${vehicle.color || '-'}</td>
                <td>${vehicle.fuel_type || '-'}</td>
                <td class="${this.getMOTStatusClass(vehicle.mot_due)}">
                    ${vehicle.mot_due || '-'}
                </td>
                <td>${vehicle.mileage ? vehicle.mileage.toLocaleString() : '-'}</td>
                <td>${vehicle.customer_name || '-'}</td>
                <td>${this.formatDate(vehicle.last_service_date)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-info" onclick="vehiclesPage.viewVehicle(${vehicle.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="vehiclesPage.editVehicle(${vehicle.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="vehiclesPage.refreshDVLA(${vehicle.id})" title="Refresh DVLA">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="vehiclesPage.deleteVehicle(${vehicle.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Get MOT status CSS class
     */
    getMOTStatusClass(motDue) {
        if (!motDue || motDue === '-') return '';
        
        try {
            const motDate = new Date(motDue.split('-').reverse().join('-')); // Convert DD-MM-YYYY to YYYY-MM-DD
            const today = new Date();
            const diffTime = motDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) return 'mot-expired';
            if (diffDays <= 30) return 'mot-due-soon';
            return 'mot-valid';
        } catch (error) {
            return '';
        }
    }

    /**
     * Update pagination
     */
    updatePagination(data) {
        const paginationContainer = document.getElementById('vehicle-pagination');
        if (!paginationContainer) return;

        const totalPages = data.pages || 1;
        const currentPage = data.current_page || 1;
        const hasNext = data.has_next || false;
        const hasPrev = data.has_prev || false;

        let paginationHTML = '<div class="pagination-controls">';

        // Previous button
        if (hasPrev) {
            paginationHTML += `<button class="btn btn-sm" onclick="vehiclesPage.goToPage(${currentPage - 1})">Previous</button>`;
        }

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn btn-sm ${activeClass}" onclick="vehiclesPage.goToPage(${i})">${i}</button>`;
        }

        // Next button
        if (hasNext) {
            paginationHTML += `<button class="btn btn-sm" onclick="vehiclesPage.goToPage(${currentPage + 1})">Next</button>`;
        }

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    /**
     * Update table controls
     */
    updateTableControls() {
        const rangeElement = document.getElementById('vehicle-range');
        const totalElement = document.getElementById('vehicle-total');

        if (rangeElement && totalElement) {
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.totalVehicles);
            
            rangeElement.textContent = `${start} to ${end}`;
            totalElement.textContent = this.totalVehicles.toLocaleString();
        }
    }

    /**
     * Go to specific page
     */
    async goToPage(page) {
        this.currentPage = page;
        await this.loadVehicles();
    }

    /**
     * View vehicle details
     */
    async viewVehicle(vehicleId) {
        try {
            const response = await window.ApiService.getVehicle(vehicleId);
            
            if (response.status === 'success') {
                this.showVehicleDetail(response.data);
            }
        } catch (error) {
            console.error('Error loading vehicle details:', error);
            this.showError('Failed to load vehicle details');
        }
    }

    /**
     * Show vehicle detail modal
     */
    showVehicleDetail(vehicle) {
        const modal = document.getElementById('vehicle-detail-modal');
        const content = document.getElementById('vehicle-detail-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="vehicle-detail">
                <div class="detail-section">
                    <h3>Vehicle Information</h3>
                    <div class="detail-grid">
                        <div><strong>Registration:</strong> ${vehicle.registration}</div>
                        <div><strong>Make:</strong> ${vehicle.make || '-'}</div>
                        <div><strong>Model:</strong> ${vehicle.model || '-'}</div>
                        <div><strong>Year:</strong> ${vehicle.year || '-'}</div>
                        <div><strong>Color:</strong> ${vehicle.color || '-'}</div>
                        <div><strong>Fuel Type:</strong> ${vehicle.fuel_type || '-'}</div>
                        <div><strong>MOT Expiry:</strong> ${vehicle.mot_due || '-'}</div>
                        <div><strong>Tax Due:</strong> ${vehicle.tax_due || '-'}</div>
                        <div><strong>Mileage:</strong> ${vehicle.mileage ? vehicle.mileage.toLocaleString() : '-'}</div>
                        <div><strong>Customer:</strong> ${vehicle.customer_name || '-'}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Service History (${vehicle.jobs ? vehicle.jobs.length : 0})</h3>
                    <div class="jobs-list">
                        ${vehicle.jobs && vehicle.jobs.length > 0 ? 
                            vehicle.jobs.slice(0, 5).map(job => `
                                <div class="job-item">
                                    <strong>${job.job_number}</strong> - ${job.description}
                                    <span class="job-date">(${this.formatDate(job.created_at)})</span>
                                </div>
                            `).join('') : 
                            '<p>No service history found</p>'
                        }
                    </div>
                </div>
            </div>
        `;

        window.App.showModal('vehicle-detail-modal');
    }

    /**
     * Edit vehicle
     */
    async editVehicle(vehicleId) {
        try {
            const response = await window.ApiService.getVehicle(vehicleId);
            
            if (response.status === 'success') {
                this.showEditVehicleForm(response.data);
            }
        } catch (error) {
            console.error('Error loading vehicle for edit:', error);
            this.showError('Failed to load vehicle data');
        }
    }

    /**
     * Show edit vehicle form
     */
    showEditVehicleForm(vehicle) {
        // Populate form fields
        document.getElementById('edit-vehicle-id').value = vehicle.id;
        document.getElementById('edit-vehicle-registration').value = vehicle.registration;
        document.getElementById('edit-vehicle-customer').value = vehicle.customer_id || '';
        document.getElementById('edit-vehicle-mileage').value = vehicle.mileage || '';

        window.App.showModal('edit-vehicle-modal');
    }

    /**
     * Refresh DVLA data
     */
    async refreshDVLA(vehicleId) {
        try {
            this.showLoading(`Refreshing DVLA data...`);
            
            const response = await window.ApiService.refreshVehicleDVLA(vehicleId);
            
            if (response.status === 'success') {
                this.showSuccess('DVLA data refreshed successfully');
                await this.loadVehicles();
            }
        } catch (error) {
            console.error('Error refreshing DVLA data:', error);
            this.showError('Failed to refresh DVLA data');
        }
    }

    /**
     * Delete vehicle
     */
    async deleteVehicle(vehicleId) {
        if (!confirm('Are you sure you want to delete this vehicle?')) {
            return;
        }

        try {
            await window.ApiService.deleteVehicle(vehicleId);
            this.showSuccess('Vehicle deleted successfully');
            await this.loadVehicles();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            this.showError('Failed to delete vehicle');
        }
    }

    /**
     * Show new vehicle form
     */
    showNewVehicleForm() {
        // Reset form
        document.getElementById('new-vehicle-form').reset();
        window.App.showModal('new-vehicle-modal');
    }

    /**
     * Create new vehicle
     */
    async createVehicle(formData) {
        try {
            const response = await window.ApiService.createVehicle(formData);
            
            if (response.status === 'success') {
                this.showSuccess('Vehicle created successfully');
                window.App.closeModal();
                await this.loadVehicles();
            }
        } catch (error) {
            console.error('Error creating vehicle:', error);
            this.showError('Failed to create vehicle');
        }
    }

    /**
     * Update vehicle
     */
    async updateVehicle(formData) {
        try {
            const vehicleId = formData.id;
            delete formData.id;
            
            const response = await window.ApiService.updateVehicle(vehicleId, formData);
            
            if (response.status === 'success') {
                this.showSuccess('Vehicle updated successfully');
                window.App.closeModal();
                await this.loadVehicles();
            }
        } catch (error) {
            console.error('Error updating vehicle:', error);
            this.showError('Failed to update vehicle');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const tableBody = document.getElementById('vehicles-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="loading">
                        <div class="spinner"></div>
                        Loading vehicles...
                    </td>
                </tr>
            `;
        }
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
        alert(message); // Temporary fallback
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log(message);
        alert(message); // Temporary fallback
    }

    /**
     * Show loading message
     */
    showLoading(message) {
        console.log(message);
        // Implementation depends on notification system
    }
}

// Create global instance
window.vehiclesPage = new VehiclesPage();

// Global functions for onclick handlers
window.searchVehicles = () => {
    // This is handled by the input event listener
};

window.changeVehiclePerPage = () => {
    // This is handled by the change event listener
};

window.showNewVehicleForm = () => {
    window.vehiclesPage.showNewVehicleForm();
};

window.createVehicle = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    await window.vehiclesPage.createVehicle(data);
};

window.updateVehicle = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    await window.vehiclesPage.updateVehicle(data);
};

window.refreshVehicleDVLA = () => {
    const vehicleId = document.getElementById('edit-vehicle-id').value;
    if (vehicleId) {
        window.vehiclesPage.refreshDVLA(vehicleId);
    }
};
