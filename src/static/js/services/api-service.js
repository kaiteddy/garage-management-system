/**
 * API Service for handling all HTTP requests
 */

class ApiService {
    constructor() {
        this.baseUrl = '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Initialize the API service
     */
    init(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        console.log('API Service initialized with base URL:', this.baseUrl);
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            console.log(`API Request: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(data.message || 'Request failed', response.status, data);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError('Network error', 0, { originalError: error });
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Customer API methods
    async getCustomers(params = {}) {
        return this.get('/customers', params);
    }

    async getCustomer(id) {
        return this.get(`/customers/${id}`);
    }

    async createCustomer(data) {
        return this.post('/customers', data);
    }

    async updateCustomer(id, data) {
        return this.put(`/customers/${id}`, data);
    }

    async deleteCustomer(id) {
        return this.delete(`/customers/${id}`);
    }

    // Vehicle API methods
    async getVehicles(params = {}) {
        return this.get('/vehicles', params);
    }

    async getVehicle(id) {
        return this.get(`/vehicles/${id}`);
    }

    async createVehicle(data) {
        return this.post('/vehicles', data);
    }

    async updateVehicle(id, data) {
        return this.put(`/vehicles/${id}`, data);
    }

    async deleteVehicle(id) {
        return this.delete(`/vehicles/${id}`);
    }

    async refreshVehicleDVLA(id) {
        return this.post(`/vehicles/${id}/refresh-dvla`);
    }

    async searchVehicles(query) {
        return this.get('/vehicles/search', { q: query });
    }

    async getVehiclesByMOTStatus(status, days = 30) {
        return this.get(`/vehicles/mot-status/${status}`, { days });
    }

    // Job API methods
    async getJobs(params = {}) {
        return this.get('/jobs', params);
    }

    async getJob(id) {
        return this.get(`/jobs/${id}`);
    }

    async createJob(data) {
        return this.post('/jobs', data);
    }

    async updateJob(id, data) {
        return this.put(`/jobs/${id}`, data);
    }

    async deleteJob(id) {
        return this.delete(`/jobs/${id}`);
    }

    async getJobsByStatus(status) {
        return this.get(`/jobs/status/${status}`);
    }

    // Estimate API methods
    async getEstimates(params = {}) {
        return this.get('/estimates', params);
    }

    async getEstimate(id) {
        return this.get(`/estimates/${id}`);
    }

    async createEstimate(data) {
        return this.post('/estimates', data);
    }

    async updateEstimate(id, data) {
        return this.put(`/estimates/${id}`, data);
    }

    async deleteEstimate(id) {
        return this.delete(`/estimates/${id}`);
    }

    async getEstimatesByStatus(status) {
        return this.get(`/estimates/status/${status}`);
    }

    async getExpiredEstimates() {
        return this.get('/estimates/expired');
    }

    // Invoice API methods
    async getInvoices(params = {}) {
        return this.get('/invoices', params);
    }

    async getInvoice(id) {
        return this.get(`/invoices/${id}`);
    }

    async createInvoice(data) {
        return this.post('/invoices', data);
    }

    async updateInvoice(id, data) {
        return this.put(`/invoices/${id}`, data);
    }

    async deleteInvoice(id) {
        return this.delete(`/invoices/${id}`);
    }

    async getInvoicesByStatus(status) {
        return this.get(`/invoices/status/${status}`);
    }

    async markInvoiceAsPaid(id) {
        return this.post(`/invoices/${id}/mark-paid`);
    }

    // Dashboard API methods
    async getDashboardStats() {
        return this.get('/dashboard');
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, status = 0, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }

    get isNetworkError() {
        return this.status === 0;
    }

    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }

    get isServerError() {
        return this.status >= 500;
    }
}

// Create global instance
window.ApiService = new ApiService();
window.ApiError = ApiError;
