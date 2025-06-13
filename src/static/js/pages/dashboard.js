/**
 * Dashboard Page Module
 */

class DashboardPage {
    constructor() {
        this.refreshInterval = null;
        this.refreshIntervalMs = 30000; // 30 seconds
    }

    /**
     * Initialize dashboard page
     */
    async init() {
        console.log('Initializing dashboard page...');
        
        try {
            await this.loadDashboardData();
            this.setupAutoRefresh();
            this.setupEventListeners();
            
            console.log('Dashboard page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            // Show loading state
            this.showLoadingState();
            
            // Load dashboard statistics
            const statsResponse = await window.ApiService.getDashboardStats();
            
            if (statsResponse.status === 'success') {
                this.updateStatistics(statsResponse.data);
            }
            
            // Load additional dashboard widgets
            await Promise.all([
                this.loadMOTAlerts(),
                this.loadPendingJobs(),
                this.loadOutstandingInvoices(),
                this.loadTodaysSchedule()
            ]);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    /**
     * Update statistics cards
     */
    updateStatistics(stats) {
        // Update customer count
        const customersElement = document.getElementById('total-customers');
        if (customersElement) {
            customersElement.textContent = this.formatNumber(stats.customers || 0);
        }

        // Update vehicle count
        const vehiclesElement = document.getElementById('total-vehicles');
        if (vehiclesElement) {
            vehiclesElement.textContent = this.formatNumber(stats.vehicles || 0);
        }

        // Update revenue
        const revenueElement = document.getElementById('total-revenue');
        if (revenueElement) {
            revenueElement.textContent = this.formatCurrency(stats.revenue || 0);
        }

        // Update documents count
        const documentsElement = document.getElementById('total-documents');
        if (documentsElement) {
            documentsElement.textContent = this.formatNumber(stats.documents || 0);
        }
    }

    /**
     * Load MOT alerts
     */
    async loadMOTAlerts() {
        try {
            const response = await window.ApiService.getVehiclesByMOTStatus('expired');
            const expiredVehicles = response.data || [];
            
            const response2 = await window.ApiService.getVehiclesByMOTStatus('due_soon', 30);
            const dueSoonVehicles = response2.data || [];
            
            this.updateMOTAlerts(expiredVehicles, dueSoonVehicles);
        } catch (error) {
            console.error('Error loading MOT alerts:', error);
            this.showWidgetError('mot-alerts', 'Failed to load MOT alerts');
        }
    }

    /**
     * Update MOT alerts widget
     */
    updateMOTAlerts(expiredVehicles, dueSoonVehicles) {
        const container = document.getElementById('mot-alerts');
        if (!container) return;

        const totalAlerts = expiredVehicles.length + dueSoonVehicles.length;
        
        if (totalAlerts === 0) {
            container.innerHTML = '<p class="no-data">No MOT alerts</p>';
            return;
        }

        let html = '';
        
        if (expiredVehicles.length > 0) {
            html += `
                <div class="alert-group expired">
                    <h4><i class="fas fa-exclamation-triangle"></i> Expired (${expiredVehicles.length})</h4>
                    <ul>
                        ${expiredVehicles.slice(0, 5).map(vehicle => `
                            <li>
                                <span class="registration">${vehicle.registration}</span>
                                <span class="date">${this.formatDate(vehicle.mot_expiry)}</span>
                            </li>
                        `).join('')}
                    </ul>
                    ${expiredVehicles.length > 5 ? `<p class="more">+${expiredVehicles.length - 5} more</p>` : ''}
                </div>
            `;
        }
        
        if (dueSoonVehicles.length > 0) {
            html += `
                <div class="alert-group due-soon">
                    <h4><i class="fas fa-clock"></i> Due Soon (${dueSoonVehicles.length})</h4>
                    <ul>
                        ${dueSoonVehicles.slice(0, 5).map(vehicle => `
                            <li>
                                <span class="registration">${vehicle.registration}</span>
                                <span class="date">${this.formatDate(vehicle.mot_expiry)}</span>
                            </li>
                        `).join('')}
                    </ul>
                    ${dueSoonVehicles.length > 5 ? `<p class="more">+${dueSoonVehicles.length - 5} more</p>` : ''}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    /**
     * Load pending jobs
     */
    async loadPendingJobs() {
        try {
            const response = await window.ApiService.getJobsByStatus('pending');
            const pendingJobs = response.data || [];
            
            this.updatePendingJobs(pendingJobs);
        } catch (error) {
            console.error('Error loading pending jobs:', error);
            this.showWidgetError('pending-jobs', 'Failed to load pending jobs');
        }
    }

    /**
     * Update pending jobs widget
     */
    updatePendingJobs(jobs) {
        const container = document.getElementById('pending-jobs');
        if (!container) return;

        if (jobs.length === 0) {
            container.innerHTML = '<p class="no-data">No pending jobs</p>';
            return;
        }

        const html = `
            <ul class="job-list">
                ${jobs.slice(0, 5).map(job => `
                    <li>
                        <div class="job-info">
                            <span class="job-number">${job.job_number}</span>
                            <span class="customer">${job.customer?.name || 'Unknown'}</span>
                        </div>
                        <div class="job-meta">
                            <span class="registration">${job.vehicle?.registration || '-'}</span>
                            <span class="date">${this.formatDate(job.created_at)}</span>
                        </div>
                    </li>
                `).join('')}
            </ul>
            ${jobs.length > 5 ? `<p class="more">+${jobs.length - 5} more pending jobs</p>` : ''}
        `;

        container.innerHTML = html;
    }

    /**
     * Load outstanding invoices
     */
    async loadOutstandingInvoices() {
        try {
            const response = await window.ApiService.getInvoicesByStatus('pending');
            const outstandingInvoices = response.data || [];
            
            this.updateOutstandingInvoices(outstandingInvoices);
        } catch (error) {
            console.error('Error loading outstanding invoices:', error);
            this.showWidgetError('outstanding-invoices', 'Failed to load outstanding invoices');
        }
    }

    /**
     * Update outstanding invoices widget
     */
    updateOutstandingInvoices(invoices) {
        const container = document.getElementById('outstanding-invoices');
        if (!container) return;

        if (invoices.length === 0) {
            container.innerHTML = '<p class="no-data">No outstanding invoices</p>';
            return;
        }

        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

        const html = `
            <div class="summary">
                <h4>Total Outstanding: ${this.formatCurrency(totalAmount)}</h4>
            </div>
            <ul class="invoice-list">
                ${invoices.slice(0, 5).map(invoice => `
                    <li>
                        <div class="invoice-info">
                            <span class="invoice-number">${invoice.invoice_number}</span>
                            <span class="customer">${invoice.customer?.name || 'Unknown'}</span>
                        </div>
                        <div class="invoice-meta">
                            <span class="amount">${this.formatCurrency(invoice.amount)}</span>
                            <span class="date">${this.formatDate(invoice.created_at)}</span>
                        </div>
                    </li>
                `).join('')}
            </ul>
            ${invoices.length > 5 ? `<p class="more">+${invoices.length - 5} more outstanding invoices</p>` : ''}
        `;

        container.innerHTML = html;
    }

    /**
     * Load today's schedule (placeholder)
     */
    async loadTodaysSchedule() {
        const container = document.getElementById('todays-schedule');
        if (!container) return;

        // Placeholder implementation
        container.innerHTML = '<p class="no-data">No scheduled appointments today</p>';
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, this.refreshIntervalMs);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for page visibility changes to pause/resume refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.resumeAutoRefresh();
            }
        });
    }

    /**
     * Pause auto-refresh
     */
    pauseAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Resume auto-refresh
     */
    resumeAutoRefresh() {
        this.setupAutoRefresh();
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        // Implementation depends on UI design
    }

    /**
     * Show widget error
     */
    showWidgetError(widgetId, message) {
        const container = document.getElementById(widgetId);
        if (container) {
            container.innerHTML = `<p class="error">${message}</p>`;
        }
    }

    /**
     * Show general error
     */
    showError(message) {
        console.error(message);
        // Implementation depends on notification system
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return new Intl.NumberFormat('en-GB').format(num);
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
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
     * Cleanup when leaving page
     */
    cleanup() {
        this.pauseAutoRefresh();
    }
}

// Create global instance
window.dashboardPage = new DashboardPage();
