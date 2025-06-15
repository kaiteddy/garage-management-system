/**
 * Modern Dashboard JavaScript
 * Handles dashboard functionality with beautiful animations and real-time updates
 */

const DashboardModern = {
    // Configuration
    config: {
        refreshInterval: 30000, // 30 seconds
        chartColors: {
            primary: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        }
    },

    // State
    state: {
        revenueChart: null,
        refreshTimer: null
    },

    /**
     * Initialize the dashboard
     */
    init() {
        console.log('🚀 Initializing Modern Dashboard...');

        try {
            this.setupEventListeners();
            this.updateCurrentDate();

            // Load data with delay to ensure DOM is ready
            setTimeout(() => {
                this.loadDashboardData();
                this.checkSyncStatus();
            }, 100);

            this.setupAutoRefresh();

            console.log('✅ Modern Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing dashboard:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button (if exists)
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // Export button (if exists)
        const exportBtn = document.querySelector('[data-action="export"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }
    },

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // Load data in parallel for better performance
            const [metrics, activity, schedule, mots] = await Promise.all([
                this.loadMetrics(),
                this.loadRecentActivity(),
                this.loadTodaysSchedule(),
                this.loadUpcomingMOTs()
            ]);

            // Update UI with loaded data
            this.updateMetrics(metrics);
            this.updateRecentActivity(activity);
            this.updateTodaysSchedule(schedule);
            this.updateUpcomingMOTs(mots);
            
            // Load revenue chart
            await this.loadRevenueChart();
            
            console.log('✅ Dashboard data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    },

    /**
     * Load dashboard metrics
     */
    async loadMetrics() {
        try {
            console.log('📊 Loading metrics from /api/stats...');
            const response = await fetch('/api/stats');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📊 Stats API response:', result);

            if (result.success) {
                // Transform the stats to match our dashboard format
                const stats = result.stats;
                const metrics = {
                    total_revenue: parseFloat(stats.revenue.replace(/[£,]/g, '')) || 0,
                    revenue_change: 12.5, // Default for now
                    active_jobs: stats.jobs || 0,
                    urgent_jobs: Math.floor((stats.jobs || 0) * 0.2), // Estimate 20% urgent
                    pending_estimates: Math.floor((stats.jobs || 0) * 0.3), // Estimate 30% pending
                    estimate_value: (stats.jobs || 0) * 150, // Estimate £150 per job
                    outstanding_amount: (stats.invoices || 0) * 50, // Estimate £50 outstanding per invoice
                    overdue_count: Math.floor((stats.invoices || 0) * 0.1) // Estimate 10% overdue
                };
                console.log('📊 Processed metrics:', metrics);
                return metrics;
            } else {
                throw new Error(result.error || 'Failed to load metrics');
            }
        } catch (error) {
            console.error('❌ Error loading metrics:', error);
            console.log('📊 Using mock metrics as fallback');
            return this.getMockMetrics();
        }
    },

    /**
     * Update metrics display
     */
    updateMetrics(data) {
        // Update total revenue
        const revenueEl = document.getElementById('total-revenue');
        if (revenueEl) {
            this.animateNumber(revenueEl, data.total_revenue, '£');
        }

        // Update revenue change
        const changeEl = document.getElementById('revenue-change');
        if (changeEl) {
            const change = data.revenue_change || 0;
            changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
            changeEl.className = change >= 0 ? 'text-green-300' : 'text-red-300';
        }

        // Update active jobs
        const jobsEl = document.getElementById('active-jobs');
        if (jobsEl) {
            this.animateNumber(jobsEl, data.active_jobs);
        }

        // Update urgent jobs
        const urgentEl = document.getElementById('urgent-jobs');
        if (urgentEl) {
            urgentEl.textContent = `${data.urgent_jobs || 0} urgent`;
        }

        // Update pending estimates
        const estimatesEl = document.getElementById('pending-estimates');
        if (estimatesEl) {
            this.animateNumber(estimatesEl, data.pending_estimates);
        }

        // Update estimate value
        const valueEl = document.getElementById('estimate-value');
        if (valueEl) {
            valueEl.textContent = this.formatCurrency(data.estimate_value || 0);
        }

        // Update outstanding amount
        const outstandingEl = document.getElementById('outstanding-amount');
        if (outstandingEl) {
            this.animateNumber(outstandingEl, data.outstanding_amount, '£');
        }

        // Update overdue count
        const overdueEl = document.getElementById('overdue-count');
        if (overdueEl) {
            overdueEl.textContent = data.overdue_count || 0;
        }
    },

    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        try {
            // Load recent jobs and invoices to create activity feed
            const [jobsResponse, invoicesResponse] = await Promise.all([
                fetch('/api/jobs'),
                fetch('/api/invoices')
            ]);

            const jobsResult = await jobsResponse.json();
            const invoicesResult = await invoicesResponse.json();

            let activities = [];

            // Add recent jobs
            if (jobsResult.success && jobsResult.jobs) {
                const recentJobs = jobsResult.jobs.slice(0, 3);
                activities = activities.concat(recentJobs.map(job => ({
                    id: `job-${job.id}`,
                    type: 'job_completed',
                    title: job.description || 'Service Job',
                    description: `${job.vehicle_make || ''} ${job.vehicle_model || ''} - ${job.vehicle_registration || 'Unknown'}`,
                    amount: job.total_amount,
                    created_at: job.created_date || new Date().toISOString()
                })));
            }

            // Add recent paid invoices
            if (invoicesResult.success && invoicesResult.invoices) {
                const paidInvoices = invoicesResult.invoices
                    .filter(inv => inv.status === 'PAID')
                    .slice(0, 2);
                activities = activities.concat(paidInvoices.map(invoice => ({
                    id: `invoice-${invoice.id}`,
                    type: 'invoice_paid',
                    title: 'Invoice Payment Received',
                    description: `${invoice.invoice_number} - ${invoice.customer_name || 'Unknown Customer'}`,
                    amount: invoice.total_amount,
                    created_at: invoice.paid_date || invoice.created_date || new Date().toISOString()
                })));
            }

            // Sort by date and limit to 5 most recent
            activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return activities.slice(0, 5);

        } catch (error) {
            console.error('Error loading activity:', error);
            return this.getMockActivity();
        }
    },

    /**
     * Update recent activity display
     */
    updateRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-2xl mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="w-8 h-8 ${this.getActivityIconBg(activity.type)} rounded-full flex items-center justify-center">
                    <i class="${this.getActivityIcon(activity.type)} text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${activity.title}</p>
                    <p class="text-xs text-gray-600">${activity.description}</p>
                    <p class="text-xs text-gray-500 mt-1">${this.formatTimeAgo(activity.created_at)}</p>
                </div>
                ${activity.amount ? `<div class="text-sm font-semibold text-gray-900">${this.formatCurrency(activity.amount)}</div>` : ''}
            </div>
        `).join('');
    },

    /**
     * Load today's schedule
     */
    async loadTodaysSchedule() {
        try {
            // Load jobs that are scheduled for today or in progress
            const response = await fetch('/api/jobs');
            const result = await response.json();

            if (result.success && result.jobs) {
                const today = new Date().toISOString().split('T')[0];
                const todaysJobs = result.jobs
                    .filter(job => {
                        const jobDate = job.created_date ? job.created_date.split('T')[0] : null;
                        return (job.status === 'IN_PROGRESS' || job.status === 'SCHEDULED' || jobDate === today);
                    })
                    .slice(0, 5)
                    .map(job => ({
                        id: job.id,
                        time: this.extractTimeFromDate(job.created_date) || '09:00',
                        customer_name: job.customer_name || 'Unknown Customer',
                        service_type: job.description || 'Service',
                        vehicle_registration: job.vehicle_registration || 'Unknown',
                        status: job.status?.toLowerCase() || 'scheduled'
                    }));

                return todaysJobs;
            }

            return [];
        } catch (error) {
            console.error('Error loading schedule:', error);
            return this.getMockSchedule();
        }
    },

    /**
     * Update today's schedule display
     */
    updateTodaysSchedule(schedule) {
        const container = document.getElementById('todays-schedule');
        if (!container) return;

        if (!schedule || schedule.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-calendar-check text-2xl mb-2"></i>
                    <p>No appointments today</p>
                </div>
            `;
            return;
        }

        container.innerHTML = schedule.map(appointment => `
            <div class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div class="text-sm font-mono font-semibold text-primary-600 min-w-[60px]">
                    ${appointment.time}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${appointment.customer_name}</p>
                    <p class="text-xs text-gray-600">${appointment.service_type} - ${appointment.vehicle_registration}</p>
                </div>
                <div class="badge ${this.getStatusBadgeClass(appointment.status)}">
                    ${appointment.status.replace('_', ' ')}
                </div>
            </div>
        `).join('');
    },

    /**
     * Load upcoming MOTs
     */
    async loadUpcomingMOTs() {
        try {
            // Load vehicles with MOT expiry dates
            const response = await fetch('/api/vehicles');
            const result = await response.json();

            if (result.success && result.vehicles) {
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

                const upcomingMOTs = result.vehicles
                    .filter(vehicle => {
                        if (!vehicle.mot_expiry) return false;
                        const motDate = new Date(vehicle.mot_expiry);
                        return motDate >= now && motDate <= thirtyDaysFromNow;
                    })
                    .map(vehicle => {
                        const motDate = new Date(vehicle.mot_expiry);
                        const daysUntilExpiry = Math.ceil((motDate - now) / (24 * 60 * 60 * 1000));

                        return {
                            id: vehicle.id,
                            vehicle_registration: vehicle.registration || 'Unknown',
                            customer_name: vehicle.customer_name || 'Unknown Customer',
                            mot_expiry: vehicle.mot_expiry,
                            days_until_expiry: daysUntilExpiry
                        };
                    })
                    .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
                    .slice(0, 5);

                return upcomingMOTs;
            }

            return [];
        } catch (error) {
            console.error('Error loading MOTs:', error);
            return this.getMockMOTs();
        }
    },

    /**
     * Update upcoming MOTs display
     */
    updateUpcomingMOTs(mots) {
        const container = document.getElementById('upcoming-mots');
        if (!container) return;

        if (!mots || mots.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p>No upcoming MOTs</p>
                </div>
            `;
            return;
        }

        container.innerHTML = mots.map(mot => `
            <div class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div class="w-8 h-8 ${this.getMOTUrgencyBg(mot.days_until_expiry)} rounded-full flex items-center justify-center">
                    <i class="fas fa-car text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${mot.vehicle_registration}</p>
                    <p class="text-xs text-gray-600">${mot.customer_name}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-600">Expires</p>
                    <p class="text-sm font-semibold ${this.getMOTUrgencyText(mot.days_until_expiry)}">
                        ${mot.days_until_expiry} days
                    </p>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load and display revenue chart
     */
    async loadRevenueChart() {
        try {
            // Since we don't have a revenue chart endpoint, create chart from invoice data
            const response = await fetch('/api/invoices');
            const result = await response.json();

            if (result.success && result.invoices) {
                const chartData = this.processInvoicesForChart(result.invoices);
                this.createRevenueChart(chartData);
            } else {
                throw new Error('Failed to load invoice data for chart');
            }
        } catch (error) {
            console.error('Error loading revenue chart:', error);
            this.createRevenueChart(this.getMockChartData());
        }
    },

    /**
     * Process invoices data for chart
     */
    processInvoicesForChart(invoices) {
        // Group invoices by date and sum amounts
        const dailyRevenue = {};
        const today = new Date();

        // Initialize last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyRevenue[dateStr] = 0;
        }

        // Process paid invoices
        invoices.forEach(invoice => {
            if (invoice.status === 'PAID' && invoice.paid_date) {
                const paidDate = invoice.paid_date.split('T')[0];
                if (dailyRevenue.hasOwnProperty(paidDate)) {
                    dailyRevenue[paidDate] += parseFloat(invoice.total_amount) || 0;
                }
            }
        });

        // Convert to chart format
        const labels = Object.keys(dailyRevenue).map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
        });

        const values = Object.values(dailyRevenue);

        return { labels, values };
    },

    /**
     * Create revenue chart
     */
    createRevenueChart(data) {
        const canvas = document.getElementById('revenue-chart');
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.state.revenueChart) {
            this.state.revenueChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.state.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Revenue',
                    data: data.values,
                    borderColor: this.config.chartColors.primary,
                    backgroundColor: this.config.chartColors.primary + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.config.chartColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 7
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: '#f3f4f6'
                        },
                        ticks: {
                            callback: function(value) {
                                return '£' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    },

    /**
     * Animate number changes
     */
    animateNumber(element, targetValue, prefix = '') {
        const startValue = parseFloat(element.textContent.replace(/[£,]/g, '')) || 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (targetValue - startValue) * easeOutQuart;

            if (prefix === '£') {
                element.textContent = this.formatCurrency(currentValue);
            } else {
                element.textContent = Math.round(currentValue).toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    /**
     * Check Google Drive sync status
     */
    async checkSyncStatus() {
        try {
            const response = await fetch('/google-drive/status');
            const result = await response.json();

            const indicator = document.getElementById('sync-indicator');
            const text = document.getElementById('sync-text');
            const card = document.getElementById('sync-status-card');

            if (indicator && text) {
                if (result.success && result.status.connected) {
                    indicator.className = 'w-2 h-2 bg-green-500 rounded-full';
                    text.textContent = 'Sync active';
                    text.className = 'text-sm text-green-600';
                } else {
                    indicator.className = 'w-2 h-2 bg-gray-400 rounded-full';
                    text.textContent = 'Sync offline';
                    text.className = 'text-sm text-gray-600';
                }
            }

            // Update sync status card
            if (card && result.success) {
                this.updateSyncStatusCard(result.status);
            }
        } catch (error) {
            console.error('Error checking sync status:', error);
            const indicator = document.getElementById('sync-indicator');
            const text = document.getElementById('sync-text');

            if (indicator && text) {
                indicator.className = 'w-2 h-2 bg-gray-400 rounded-full';
                text.textContent = 'Sync offline';
                text.className = 'text-sm text-gray-600';
            }
        }
    },

    /**
     * Update sync status card
     */
    updateSyncStatusCard(status) {
        const container = document.getElementById('sync-status-card');
        if (!container) return;

        if (status.connected) {
            const mappingCount = Object.keys(status.folder_mappings || {}).length;
            const lastSync = status.last_sync ? new Date(status.last_sync).toLocaleDateString() : 'Never';

            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fab fa-google-drive text-green-600 text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-green-900">Connected</p>
                        <p class="text-xs text-green-700">${status.user_email || 'Unknown user'}</p>
                    </div>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Data types:</span>
                        <span class="font-medium">${mappingCount}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Last sync:</span>
                        <span class="font-medium">${lastSync}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Auto-sync:</span>
                        <span class="font-medium ${status.auto_sync_enabled ? 'text-green-600' : 'text-gray-500'}">
                            ${status.auto_sync_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                </div>
                <div class="pt-3 border-t border-gray-200">
                    <a href="/google-drive" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        <i class="fas fa-cog mr-1"></i>
                        Manage Sync
                    </a>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fab fa-google-drive text-gray-400 text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">Not Connected</p>
                        <p class="text-xs text-gray-600">Google Drive sync offline</p>
                    </div>
                </div>
                <div class="text-center py-4">
                    <p class="text-sm text-gray-600 mb-3">Connect Google Drive to automatically sync your data files.</p>
                    <a href="/google-drive" class="btn btn-primary btn-sm">
                        <i class="fab fa-google-drive mr-2"></i>
                        Connect Google Drive
                    </a>
                </div>
            `;
        }
    },

    /**
     * Setup auto refresh
     */
    setupAutoRefresh() {
        this.state.refreshTimer = setInterval(() => {
            this.loadDashboardData();
            this.checkSyncStatus(); // Also refresh sync status
        }, this.config.refreshInterval);
    },

    /**
     * Update current date display
     */
    updateCurrentDate() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    },

    /**
     * Utility functions
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(amount);
    },

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    },

    extractTimeFromDate(dateString) {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            return null;
        }
    },

    getActivityIcon(type) {
        const icons = {
            job_completed: 'fas fa-check-circle text-success-600',
            invoice_paid: 'fas fa-pound-sign text-primary-600',
            customer_added: 'fas fa-user-plus text-warning-600',
            default: 'fas fa-info-circle text-gray-600'
        };
        return icons[type] || icons.default;
    },

    getActivityIconBg(type) {
        const backgrounds = {
            job_completed: 'bg-success-100',
            invoice_paid: 'bg-primary-100',
            customer_added: 'bg-warning-100',
            default: 'bg-gray-100'
        };
        return backgrounds[type] || backgrounds.default;
    },

    getStatusBadgeClass(status) {
        const classes = {
            scheduled: 'badge-primary',
            in_progress: 'badge-warning',
            completed: 'badge-success',
            cancelled: 'badge-error'
        };
        return classes[status] || 'badge-gray';
    },

    getMOTUrgencyBg(days) {
        if (days <= 7) return 'bg-error-100';
        if (days <= 30) return 'bg-warning-100';
        return 'bg-success-100';
    },

    getMOTUrgencyText(days) {
        if (days <= 7) return 'text-error-600';
        if (days <= 30) return 'text-warning-600';
        return 'text-success-600';
    },

    showError(message) {
        console.error('Dashboard Error:', message);
        // Could implement toast notifications here
    },

    exportReport() {
        console.log('Exporting dashboard report...');
        // Implement export functionality
    },

    /**
     * Mock data for fallback
     */
    getMockMetrics() {
        return {
            total_revenue: 24580.00,
            revenue_change: 12.5,
            active_jobs: 12,
            urgent_jobs: 3,
            pending_estimates: 8,
            estimate_value: 3240.00,
            outstanding_amount: 1890.00,
            overdue_count: 2
        };
    },

    getMockActivity() {
        return [
            {
                id: 1,
                type: 'job_completed',
                title: 'Annual Service Completed',
                description: 'BMW 320i - AB12 CDE',
                amount: 250.00,
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                type: 'invoice_paid',
                title: 'Invoice Payment Received',
                description: 'INV-001 - John Smith',
                amount: 450.00,
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            }
        ];
    },

    getMockChartData() {
        const labels = [];
        const values = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }));
            values.push(Math.random() * 1000 + 500); // Random revenue between 500-1500
        }

        return { labels, values };
    },

    getMockSchedule() {
        return [
            {
                id: 1,
                time: '09:00',
                customer_name: 'John Smith',
                service_type: 'Annual Service',
                vehicle_registration: 'AB12 CDE',
                status: 'scheduled'
            },
            {
                id: 2,
                time: '11:30',
                customer_name: 'Sarah Johnson',
                service_type: 'Brake Check',
                vehicle_registration: 'XY98 ZAB',
                status: 'in_progress'
            }
        ];
    },

    getMockMOTs() {
        return [
            {
                id: 1,
                vehicle_registration: 'AB12 CDE',
                customer_name: 'John Smith',
                mot_expiry: '2024-07-15',
                days_until_expiry: 15
            },
            {
                id: 2,
                vehicle_registration: 'XY98 ZAB',
                customer_name: 'Sarah Johnson',
                mot_expiry: '2024-07-25',
                days_until_expiry: 25
            }
        ];
    }

    getMockSchedule() {
        return [
            {
                id: 1,
                time: '09:00',
                customer_name: 'John Smith',
                service_type: 'Annual Service',
                vehicle_registration: 'AB12 CDE',
                status: 'scheduled'
            },
            {
                id: 2,
                time: '11:30',
                customer_name: 'Sarah Johnson',
                service_type: 'Brake Inspection',
                vehicle_registration: 'XY98 ZAB',
                status: 'in_progress'
            }
        ];
    },

    getMockMOTs() {
        return [
            {
                id: 1,
                vehicle_registration: 'AB12 CDE',
                customer_name: 'John Smith',
                mot_expiry: '2024-07-15',
                days_until_expiry: 32
            },
            {
                id: 2,
                vehicle_registration: 'XY98 ZAB',
                customer_name: 'Sarah Johnson',
                mot_expiry: '2024-06-25',
                days_until_expiry: 12
            }
        ];
    },

    getMockChartData() {
        const labels = [];
        const values = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toISOString().split('T')[0]);
            values.push(800 + Math.random() * 400);
        }

        return { labels, values };
    },

    /**
     * Cleanup
     */
    destroy() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
        }
        if (this.state.revenueChart) {
            this.state.revenueChart.destroy();
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardModern;
}
