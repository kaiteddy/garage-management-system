/**
 * Modern Dashboard Page Module
 * Handles dashboard functionality with beautiful charts and real-time updates
 */

class ModernDashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = 300000; // 5 minutes
        this.refreshTimer = null;
        this.isLoading = false;
    }

    /**
     * Initialize the modern dashboard
     */
    async init() {
        console.log('Initializing modern dashboard...');
        
        try {
            await this.loadDashboardData();
            this.initializeCharts();
            this.setupEventListeners();
            this.startAutoRefresh();
            
            console.log('Modern dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize modern dashboard:', error);
            window.showError('Failed to load dashboard data');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Revenue period selector
        const revenuePeriod = document.getElementById('revenue-period');
        if (revenuePeriod) {
            revenuePeriod.addEventListener('change', (e) => {
                this.updateRevenueChart(e.target.value);
            });
        }

        // Auto-refresh on visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isLoading) {
                this.refreshDashboard();
            }
        });
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        this.isLoading = true;
        
        try {
            const [metricsResponse, activityResponse, scheduleResponse, statusResponse, motResponse] = await Promise.all([
                fetch('/api/dashboard/metrics'),
                fetch('/api/dashboard/activity'),
                fetch('/api/dashboard/schedule'),
                fetch('/api/monitoring/health'),
                fetch('/api/dashboard/upcoming-mots')
            ]);

            const [metrics, activity, schedule, status, mots] = await Promise.all([
                metricsResponse.json(),
                activityResponse.json(),
                scheduleResponse.json(),
                statusResponse.json(),
                motResponse.json()
            ]);

            this.updateMetrics(metrics.data || {});
            this.updateActivity(activity.data || []);
            this.updateSchedule(schedule.data || []);
            this.updateSystemStatus(status.data || {});
            this.updateUpcomingMOTs(mots.data || []);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Update metrics cards
     */
    updateMetrics(metrics) {
        // Total Revenue
        this.updateElement('total-revenue', this.formatCurrency(metrics.total_revenue || 0));
        this.updateElement('revenue-change', `${metrics.revenue_change || 0}%`);

        // Active Jobs
        this.updateElement('active-jobs', metrics.active_jobs || 0);
        this.updateElement('urgent-jobs', metrics.urgent_jobs || 0);

        // Pending Estimates
        this.updateElement('pending-estimates', metrics.pending_estimates || 0);
        this.updateElement('estimate-value', this.formatCurrency(metrics.estimate_value || 0));

        // Outstanding Invoices
        this.updateElement('outstanding-amount', this.formatCurrency(metrics.outstanding_amount || 0));
        this.updateElement('overdue-count', metrics.overdue_count || 0);
    }

    /**
     * Update recent activity
     */
    updateActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="fas fa-history text-2xl mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon bg-${this.getActivityColor(activity.type)}-100 text-${this.getActivityColor(activity.type)}-600">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">
                        ${activity.title}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${activity.description}
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                        ${this.formatRelativeTime(activity.created_at)}
                    </div>
                </div>
                ${activity.amount ? `
                    <div class="text-sm font-semibold text-gray-900">
                        ${this.formatCurrency(activity.amount)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    /**
     * Update today's schedule
     */
    updateSchedule(scheduleItems) {
        const container = document.getElementById('todays-schedule');
        if (!container) return;

        if (scheduleItems.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="fas fa-calendar-check text-2xl mb-2"></i>
                    <p>No appointments today</p>
                </div>
            `;
            return;
        }

        container.innerHTML = scheduleItems.map(item => `
            <div class="schedule-item">
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">
                        ${item.time} - ${item.customer_name}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${item.service_type} • ${item.vehicle_registration}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="badge badge-${this.getStatusColor(item.status)}">
                        ${item.status}
                    </span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update system status
     */
    updateSystemStatus(status) {
        const container = document.getElementById('system-status');
        if (!container) return;

        const checks = status.checks || {};
        
        container.innerHTML = Object.entries(checks).map(([name, check]) => `
            <div class="status-indicator status-${check.status}">
                <div class="status-dot"></div>
                <span class="flex-1 capitalize">${name.replace('_', ' ')}</span>
                <span class="text-xs text-gray-500">
                    ${check.details?.response_time ? `${check.details.response_time.toFixed(0)}ms` : 'OK'}
                </span>
            </div>
        `).join('');
    }

    /**
     * Update upcoming MOTs
     */
    updateUpcomingMOTs(mots) {
        const container = document.getElementById('upcoming-mots');
        if (!container) return;

        if (mots.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="fas fa-certificate text-2xl mb-2"></i>
                    <p>No upcoming MOTs</p>
                </div>
            `;
            return;
        }

        container.innerHTML = mots.map(mot => `
            <div class="schedule-item">
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">
                        ${mot.vehicle_registration}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${mot.customer_name} • Due: ${this.formatDate(mot.mot_expiry)}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="badge badge-${this.getMOTUrgency(mot.days_until_expiry)}">
                        ${mot.days_until_expiry} days
                    </span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        this.initializeRevenueChart();
    }

    /**
     * Initialize revenue chart
     */
    initializeRevenueChart() {
        const canvas = document.getElementById('revenue-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                return `Revenue: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Load initial chart data
        this.updateRevenueChart(30);
    }

    /**
     * Update revenue chart
     */
    async updateRevenueChart(days = 30) {
        if (!this.charts.revenue) return;

        try {
            const response = await fetch(`/api/dashboard/revenue-chart?days=${days}`);
            const data = await response.json();

            if (data.status === 'success') {
                const chartData = data.data;
                
                this.charts.revenue.data.labels = chartData.labels;
                this.charts.revenue.data.datasets[0].data = chartData.values;
                this.charts.revenue.update('active');
            }
        } catch (error) {
            console.error('Error updating revenue chart:', error);
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            if (!document.hidden && !this.isLoading) {
                this.refreshDashboard();
            }
        }, this.refreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            await this.loadDashboardData();
            
            // Update charts
            const revenuePeriod = document.getElementById('revenue-period');
            if (revenuePeriod) {
                await this.updateRevenueChart(revenuePeriod.value);
            }
            
            window.showSuccess('Dashboard refreshed', 2000);
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            window.showError('Failed to refresh dashboard');
        }
    }

    /**
     * Helper methods
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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

    formatRelativeTime(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
        } catch (error) {
            return dateString;
        }
    }

    getActivityColor(type) {
        const colors = {
            'job_created': 'primary',
            'job_completed': 'success',
            'estimate_sent': 'warning',
            'invoice_paid': 'success',
            'customer_added': 'primary'
        };
        return colors[type] || 'gray';
    }

    getActivityIcon(type) {
        const icons = {
            'job_created': 'wrench',
            'job_completed': 'check-circle',
            'estimate_sent': 'file-invoice',
            'invoice_paid': 'pound-sign',
            'customer_added': 'user-plus'
        };
        return icons[type] || 'info-circle';
    }

    getStatusColor(status) {
        const colors = {
            'scheduled': 'primary',
            'in_progress': 'warning',
            'completed': 'success',
            'cancelled': 'gray'
        };
        return colors[status] || 'gray';
    }

    getMOTUrgency(days) {
        if (days <= 7) return 'error';
        if (days <= 30) return 'warning';
        return 'success';
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
    }
}

// Global functions for dashboard actions
window.refreshDashboard = function() {
    if (window.modernDashboard) {
        window.modernDashboard.refreshDashboard();
    }
};

window.showQuickActions = function() {
    const modal = document.getElementById('quick-actions-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    }
};

window.closeQuickActions = function() {
    const modal = document.getElementById('quick-actions-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

// Quick action functions (to be implemented)
window.showNewCustomerModal = function() {
    window.closeQuickActions();
    // Redirect to customers page with new customer form
    window.location.href = '/customers?action=new';
};

window.showNewVehicleModal = function() {
    window.closeQuickActions();
    window.location.href = '/vehicles?action=new';
};

window.showNewJobModal = function() {
    window.closeQuickActions();
    window.location.href = '/jobs?action=new';
};

window.showNewEstimateModal = function() {
    window.closeQuickActions();
    window.location.href = '/estimates?action=new';
};

window.showNewInvoiceModal = function() {
    window.closeQuickActions();
    window.location.href = '/invoices?action=new';
};

// Export for global use
window.ModernDashboard = ModernDashboard;
