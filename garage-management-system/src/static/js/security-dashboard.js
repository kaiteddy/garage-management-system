/**
 * Security Dashboard JavaScript
 * Provides real-time security monitoring and management interface
 */

class SecurityDashboard {
    constructor() {
        this.refreshInterval = 30000; // 30 seconds
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSecurityMetrics();
        this.loadSystemStatus();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-metrics')?.addEventListener('click', () => {
            this.loadSecurityMetrics();
            this.loadSystemStatus();
        });

        // Time period selector
        document.getElementById('time-period')?.addEventListener('change', (e) => {
            this.loadSecurityMetrics(e.target.value);
        });

        // Create backup button
        document.getElementById('create-backup')?.addEventListener('click', () => {
            this.createBackup();
        });

        // Run compliance check button
        document.getElementById('run-compliance-check')?.addEventListener('click', () => {
            this.runComplianceCheck();
        });

        // Maintenance cleanup button
        document.getElementById('run-cleanup')?.addEventListener('click', () => {
            this.runMaintenanceCleanup();
        });
    }

    async loadSecurityMetrics(hours = 24) {
        try {
            this.showLoading('security-metrics');
            
            const response = await fetch(`/admin/security/metrics?hours=${hours}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load security metrics');
            }

            const data = await response.json();
            this.displaySecurityMetrics(data.metrics);
            
        } catch (error) {
            console.error('Error loading security metrics:', error);
            this.showError('security-metrics', 'Failed to load security metrics');
        }
    }

    async loadSystemStatus() {
        try {
            this.showLoading('system-status');
            
            const response = await fetch('/admin/system/status', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load system status');
            }

            const data = await response.json();
            this.displaySystemStatus(data.system_status);
            
        } catch (error) {
            console.error('Error loading system status:', error);
            this.showError('system-status', 'Failed to load system status');
        }
    }

    displaySecurityMetrics(metrics) {
        // Update metric cards
        this.updateMetricCard('total-logins', metrics.login_attempts.total);
        this.updateMetricCard('failed-logins', metrics.login_attempts.failed);
        this.updateMetricCard('unique-ips', metrics.login_attempts.unique_ips);
        this.updateMetricCard('active-users', metrics.user_activity.active_users);
        this.updateMetricCard('locked-accounts', metrics.user_activity.locked_accounts);
        this.updateMetricCard('total-actions', metrics.data_access.total_actions);

        // Create charts
        this.createLoginAttemptsChart(metrics.login_attempts);
        this.createDataAccessChart(metrics.data_access);
        this.createSecurityEventsChart(metrics.security_events);

        this.hideLoading('security-metrics');
    }

    displaySystemStatus(status) {
        // Update status indicators
        this.updateStatusIndicator('db-status', status.database.status);
        this.updateStatusIndicator('security-status', status.security.monitoring_status);
        this.updateStatusIndicator('overall-status', status.overall_status);

        // Update status details
        document.getElementById('db-connection').textContent = status.database.connection;
        document.getElementById('monitoring-status').textContent = status.security.monitoring_status;
        document.getElementById('recent-logins').textContent = status.security.recent_logins_24h;
        document.getElementById('recent-audit-logs').textContent = status.security.recent_audit_logs_24h;
        document.getElementById('total-users').textContent = status.users.total;
        document.getElementById('active-users-count').textContent = status.users.active;
        document.getElementById('locked-users-count').textContent = status.users.locked;

        this.hideLoading('system-status');
    }

    updateMetricCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value.toLocaleString();
        }
    }

    updateStatusIndicator(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            // Remove existing status classes
            element.classList.remove('status-healthy', 'status-warning', 'status-error', 'status-active', 'status-inactive');
            
            // Add appropriate status class
            switch (status) {
                case 'healthy':
                case 'active':
                case 'ok':
                    element.classList.add('status-healthy');
                    break;
                case 'warning':
                    element.classList.add('status-warning');
                    break;
                case 'error':
                case 'inactive':
                    element.classList.add('status-error');
                    break;
                default:
                    element.classList.add('status-warning');
            }
        }
    }

    createLoginAttemptsChart(data) {
        const ctx = document.getElementById('login-attempts-chart');
        if (!ctx) return;

        if (this.charts.loginAttempts) {
            this.charts.loginAttempts.destroy();
        }

        this.charts.loginAttempts = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Successful', 'Failed'],
                datasets: [{
                    data: [data.successful, data.failed],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createDataAccessChart(data) {
        const ctx = document.getElementById('data-access-chart');
        if (!ctx) return;

        if (this.charts.dataAccess) {
            this.charts.dataAccess.destroy();
        }

        this.charts.dataAccess = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Read', 'Write', 'Delete'],
                datasets: [{
                    label: 'Actions',
                    data: [data.read_actions, data.write_actions, data.delete_actions],
                    backgroundColor: ['#17a2b8', '#ffc107', '#dc3545'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createSecurityEventsChart(data) {
        const ctx = document.getElementById('security-events-chart');
        if (!ctx) return;

        if (this.charts.securityEvents) {
            this.charts.securityEvents.destroy();
        }

        this.charts.securityEvents = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Alerts', 'Suspicious IPs', 'Failed Logins'],
                datasets: [{
                    label: 'Security Events',
                    data: [data.alerts_generated, data.suspicious_ips, data.failed_login_attempts],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async createBackup() {
        try {
            this.showLoading('backup-section');
            
            const response = await fetch('/admin/backup/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    include_logs: true
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('backup-section', `Backup created successfully: ${data.backup.name}`);
                this.loadBackupList();
            } else {
                this.showError('backup-section', data.message || 'Failed to create backup');
            }
            
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showError('backup-section', 'Failed to create backup');
        }
    }

    async runComplianceCheck() {
        try {
            this.showLoading('compliance-section');
            
            const response = await fetch('/admin/gdpr/compliance-check', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.displayComplianceResults(data.compliance_results);
            } else {
                this.showError('compliance-section', data.message || 'Failed to run compliance check');
            }
            
        } catch (error) {
            console.error('Error running compliance check:', error);
            this.showError('compliance-section', 'Failed to run compliance check');
        }
    }

    async runMaintenanceCleanup() {
        try {
            this.showLoading('maintenance-section');
            
            const response = await fetch('/admin/maintenance/cleanup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    tasks: ['sessions', 'audit_logs', 'backups']
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('maintenance-section', 'Maintenance cleanup completed successfully');
                this.displayCleanupResults(data.results);
            } else {
                this.showError('maintenance-section', data.message || 'Failed to run maintenance cleanup');
            }
            
        } catch (error) {
            console.error('Error running maintenance cleanup:', error);
            this.showError('maintenance-section', 'Failed to run maintenance cleanup');
        }
    }

    displayComplianceResults(results) {
        const container = document.getElementById('compliance-results');
        if (!container) return;

        let html = '<div class="compliance-results">';
        html += `<h4>Compliance Check Results</h4>`;
        html += `<p><strong>Overall Status:</strong> <span class="status-${results.overall_status}">${results.overall_status}</span></p>`;
        
        if (results.checks) {
            html += '<ul>';
            for (const [check, result] of Object.entries(results.checks)) {
                html += `<li><strong>${check}:</strong> <span class="status-${result.status}">${result.status}</span>`;
                if (result.count !== undefined) {
                    html += ` (${result.count})`;
                }
                html += '</li>';
            }
            html += '</ul>';
        }
        
        html += '</div>';
        container.innerHTML = html;
        this.hideLoading('compliance-section');
    }

    displayCleanupResults(results) {
        const container = document.getElementById('cleanup-results');
        if (!container) return;

        let html = '<div class="cleanup-results">';
        html += '<h4>Cleanup Results</h4>';
        html += '<ul>';
        
        for (const [task, result] of Object.entries(results)) {
            html += `<li><strong>${task}:</strong> ${result}</li>`;
        }
        
        html += '</ul>';
        html += '</div>';
        container.innerHTML = html;
        this.hideLoading('maintenance-section');
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadSecurityMetrics();
            this.loadSystemStatus();
        }, this.refreshInterval);
    }

    showLoading(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const loader = section.querySelector('.loading') || this.createLoader();
            section.appendChild(loader);
        }
    }

    hideLoading(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const loader = section.querySelector('.loading');
            if (loader) {
                loader.remove();
            }
        }
    }

    showSuccess(sectionId, message) {
        this.showMessage(sectionId, message, 'success');
    }

    showError(sectionId, message) {
        this.showMessage(sectionId, message, 'error');
    }

    showMessage(sectionId, message, type) {
        const section = document.getElementById(sectionId);
        if (section) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `alert alert-${type}`;
            messageDiv.textContent = message;
            
            // Remove existing messages
            const existingMessages = section.querySelectorAll('.alert');
            existingMessages.forEach(msg => msg.remove());
            
            section.appendChild(messageDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    createLoader() {
        const loader = document.createElement('div');
        loader.className = 'loading';
        loader.innerHTML = '<div class="spinner"></div>';
        return loader;
    }

    getAuthToken() {
        // Get JWT token from localStorage or session
        return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('security-dashboard')) {
        new SecurityDashboard();
    }
});
