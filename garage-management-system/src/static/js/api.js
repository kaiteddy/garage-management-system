/**
 * API communication module for the Garage Management System
 */

const API = {
    baseURL: '/api',
    
    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    },
    
    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    },
    
    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    },
    
    // Dashboard endpoints
    dashboard: {
        getStats: () => API.get('/dashboard'),
        getRecentActivity: () => API.get('/dashboard/recent-activity')
    },
    
    // Customer endpoints
    customers: {
        getAll: (params = {}) => API.get('/customers', params),
        getById: (id) => API.get(`/customers/${id}`),
        create: (data) => API.post('/customers', data),
        update: (id, data) => API.put(`/customers/${id}`, data),
        delete: (id) => API.delete(`/customers/${id}`),
        search: (query) => API.get('/customers/search', { q: query })
    },
    
    // Vehicle endpoints
    vehicles: {
        getAll: (params = {}) => API.get('/vehicles', params),
        getById: (id) => API.get(`/vehicles/${id}`),
        create: (data) => API.post('/vehicles', data),
        update: (id, data) => API.put(`/vehicles/${id}`, data),
        delete: (id) => API.delete(`/vehicles/${id}`),
        search: (query) => API.get('/vehicles/search', { q: query }),
        refreshDVLA: (id) => API.post(`/vehicles/${id}/refresh-dvla`),
        getByMOTStatus: (status, days = 30) => API.get(`/vehicles/mot-status/${status}`, { days })
    },
    
    // Job endpoints
    jobs: {
        getAll: (params = {}) => API.get('/jobs', params),
        getById: (id) => API.get(`/jobs/${id}`),
        create: (data) => API.post('/jobs', data),
        update: (id, data) => API.put(`/jobs/${id}`, data),
        delete: (id) => API.delete(`/jobs/${id}`)
    },
    
    // Estimate endpoints
    estimates: {
        getAll: (params = {}) => API.get('/estimates', params),
        getById: (id) => API.get(`/estimates/${id}`),
        create: (data) => API.post('/estimates', data),
        update: (id, data) => API.put(`/estimates/${id}`, data),
        delete: (id) => API.delete(`/estimates/${id}`)
    },
    
    // Invoice endpoints
    invoices: {
        getAll: (params = {}) => API.get('/invoices', params),
        getById: (id) => API.get(`/invoices/${id}`),
        create: (data) => API.post('/invoices', data),
        update: (id, data) => API.put(`/invoices/${id}`, data),
        delete: (id) => API.delete(`/invoices/${id}`)
    }
};

// Dashboard data loading
async function loadDashboardData() {
    try {
        showLoading('dashboard-stats');
        
        const response = await API.dashboard.getStats();
        if (response.status === 'success') {
            App.data.stats = response.data;
            renderDashboardStats(response.data);
        } else {
            throw new Error(response.message || 'Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('dashboard-stats', 'Failed to load dashboard statistics');
    }
}

function renderDashboardStats(stats) {
    const container = document.getElementById('dashboard-stats');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon customers">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.customers || 0}</h3>
                    <p>Total Customers</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon vehicles">
                    <i class="fas fa-car"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.vehicles || 0}</h3>
                    <p>Vehicles Managed</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon documents">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.jobs || 0}</h3>
                    <p>Active Jobs</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon revenue">
                    <i class="fas fa-pound-sign"></i>
                </div>
                <div class="stat-info">
                    <h3>${formatCurrency(stats.revenue || 0)}</h3>
                    <p>Total Revenue</p>
                </div>
            </div>
        </div>
    `;
}

// Customer data loading
async function loadCustomers(page = 1, search = '') {
    try {
        showLoading('customers-table');
        
        const params = { page, per_page: 20 };
        if (search) params.search = search;
        
        const response = await API.customers.getAll(params);
        if (response.status === 'success') {
            App.data.customers = response.data.customers;
            App.pagination.customers = {
                page: response.data.current_page,
                total: response.data.total,
                pages: response.data.pages
            };
            renderCustomersTable(response.data.customers);
            renderPagination('customers', response.data);
        } else {
            throw new Error(response.message || 'Failed to load customers');
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        showError('customers-table', 'Failed to load customers');
    }
}

function renderCustomersTable(customers) {
    const container = document.getElementById('customers-table');
    if (!container) return;
    
    if (customers.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <p>No customers found</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Account #</th>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Vehicles</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(customer => `
                    <tr>
                        <td>${customer.account_number || '-'}</td>
                        <td>${customer.name || '-'}</td>
                        <td>${customer.company || '-'}</td>
                        <td>${customer.primary_contact || '-'}</td>
                        <td>${customer.vehicle_count || 0}</td>
                        <td class="actions">
                            <button class="btn btn-sm btn-primary" onclick="viewCustomer(${customer.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Vehicle data loading
async function loadVehicles(page = 1, search = '') {
    try {
        showLoading('vehicles-table');
        
        const params = { page, per_page: 20 };
        if (search) params.search = search;
        
        const response = await API.vehicles.getAll(params);
        if (response.status === 'success') {
            App.data.vehicles = response.data.vehicles;
            App.pagination.vehicles = {
                page: response.data.current_page,
                total: response.data.total,
                pages: response.data.pages
            };
            renderVehiclesTable(response.data.vehicles);
            renderPagination('vehicles', response.data);
        } else {
            throw new Error(response.message || 'Failed to load vehicles');
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showError('vehicles-table', 'Failed to load vehicles');
    }
}

function renderVehiclesTable(vehicles) {
    const container = document.getElementById('vehicles-table');
    if (!container) return;
    
    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <i class="fas fa-car fa-3x text-muted mb-3"></i>
                <p>No vehicles found</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Registration</th>
                    <th>Make/Model</th>
                    <th>Customer</th>
                    <th>MOT Due</th>
                    <th>Tax Due</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${vehicles.map(vehicle => `
                    <tr>
                        <td><strong>${vehicle.registration}</strong></td>
                        <td>${vehicle.display_name || '-'}</td>
                        <td>${vehicle.customer_name || '-'}</td>
                        <td>
                            <span class="status-badge status-${vehicle.mot_status || 'unknown'}">
                                ${vehicle.mot_due || '-'}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge status-${vehicle.tax_status || 'unknown'}">
                                ${vehicle.tax_due || '-'}
                            </span>
                        </td>
                        <td class="actions">
                            <button class="btn btn-sm btn-primary" onclick="viewVehicle(${vehicle.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="editVehicle(${vehicle.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Placeholder functions for other data loading
async function loadJobs() {
    console.log('Loading jobs...');
    // Implementation will be added later
}

async function loadEstimates() {
    console.log('Loading estimates...');
    // Implementation will be added later
}

async function loadInvoices() {
    console.log('Loading invoices...');
    // Implementation will be added later
}

// Export API for global use
window.API = API;
window.loadDashboardData = loadDashboardData;
window.loadCustomers = loadCustomers;
window.loadVehicles = loadVehicles;
window.loadJobs = loadJobs;
window.loadEstimates = loadEstimates;
window.loadInvoices = loadInvoices;
