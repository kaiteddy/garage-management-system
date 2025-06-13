/**
 * Monitoring Widget Component
 */

class MonitoringWidget {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = {
            refreshInterval: 30000, // 30 seconds
            showMetrics: true,
            showHealth: true,
            ...options
        };
        
        this.refreshTimer = null;
        this.isVisible = true;
    }

    /**
     * Initialize the monitoring widget
     */
    init() {
        if (!this.container) {
            console.error(`Monitoring widget container '${this.containerId}' not found`);
            return;
        }

        this.render();
        this.loadData();
        this.startAutoRefresh();
        
        console.log('Monitoring widget initialized');
    }

    /**
     * Render the widget structure
     */
    render() {
        this.container.innerHTML = `
            <div class="monitoring-widget">
                <div class="widget-header">
                    <h3><i class="fas fa-heartbeat"></i> System Status</h3>
                    <div class="widget-controls">
                        <button class="btn btn-sm btn-secondary" onclick="monitoringWidget.refresh()" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="monitoringWidget.toggleVisibility()" title="Toggle">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="widget-content" id="${this.containerId}-content">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading system status...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load monitoring data
     */
    async loadData() {
        try {
            const [healthResponse, metricsResponse] = await Promise.all([
                fetch('/api/monitoring/health'),
                fetch('/api/monitoring/metrics?hours=1')
            ]);

            const healthData = await healthResponse.json();
            const metricsData = await metricsResponse.json();

            this.renderData(healthData, metricsData);

        } catch (error) {
            console.error('Failed to load monitoring data:', error);
            this.renderError('Failed to load system status');
        }
    }

    /**
     * Render monitoring data
     */
    renderData(healthData, metricsData) {
        const content = document.getElementById(`${this.containerId}-content`);
        if (!content) return;

        const health = healthData.data || {};
        const metrics = metricsData.data?.metrics || {};

        content.innerHTML = `
            <div class="monitoring-content">
                ${this.renderHealthStatus(health)}
                ${this.options.showMetrics ? this.renderMetrics(metrics) : ''}
            </div>
        `;
    }

    /**
     * Render health status
     */
    renderHealthStatus(health) {
        const status = health.status || 'unknown';
        const checks = health.checks || {};

        return `
            <div class="health-status">
                <div class="overall-status status-${status}">
                    <i class="fas fa-${this.getStatusIcon(status)}"></i>
                    <span class="status-text">${this.formatStatus(status)}</span>
                </div>
                <div class="health-checks">
                    ${Object.entries(checks).map(([name, check]) => `
                        <div class="health-check status-${check.status}">
                            <i class="fas fa-${this.getStatusIcon(check.status)}"></i>
                            <span class="check-name">${this.formatCheckName(name)}</span>
                            ${check.details?.response_time ? 
                                `<span class="check-detail">${check.details.response_time.toFixed(0)}ms</span>` : 
                                ''
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render metrics
     */
    renderMetrics(metrics) {
        const importantMetrics = ['cpu_usage', 'memory_usage', 'disk_usage'];
        
        return `
            <div class="metrics-summary">
                <h4>Performance Metrics</h4>
                <div class="metrics-grid">
                    ${importantMetrics.map(metricName => {
                        const metric = metrics[metricName];
                        if (!metric) return '';
                        
                        return `
                            <div class="metric-item">
                                <div class="metric-name">${this.formatMetricName(metricName)}</div>
                                <div class="metric-value ${this.getMetricClass(metricName, metric.latest)}">
                                    ${metric.latest.toFixed(1)}${metric.unit}
                                </div>
                                <div class="metric-trend">
                                    ${metric.avg ? `Avg: ${metric.avg.toFixed(1)}${metric.unit}` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError(message) {
        const content = document.getElementById(`${this.containerId}-content`);
        if (!content) return;

        content.innerHTML = `
            <div class="monitoring-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn btn-sm btn-primary" onclick="monitoringWidget.refresh()">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            'healthy': 'check-circle',
            'warning': 'exclamation-triangle',
            'critical': 'times-circle',
            'unknown': 'question-circle'
        };
        return icons[status] || 'question-circle';
    }

    /**
     * Format status text
     */
    formatStatus(status) {
        const statusMap = {
            'healthy': 'Healthy',
            'warning': 'Warning',
            'critical': 'Critical',
            'unknown': 'Unknown'
        };
        return statusMap[status] || status;
    }

    /**
     * Format check name
     */
    formatCheckName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    /**
     * Format metric name
     */
    formatMetricName(name) {
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get metric CSS class based on value
     */
    getMetricClass(metricName, value) {
        const thresholds = {
            'cpu_usage': { warning: 70, critical: 90 },
            'memory_usage': { warning: 80, critical: 95 },
            'disk_usage': { warning: 85, critical: 95 }
        };

        const threshold = thresholds[metricName];
        if (!threshold) return '';

        if (value >= threshold.critical) return 'metric-critical';
        if (value >= threshold.warning) return 'metric-warning';
        return 'metric-healthy';
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            if (this.isVisible && document.visibilityState === 'visible') {
                this.loadData();
            }
        }, this.options.refreshInterval);
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
     * Manual refresh
     */
    refresh() {
        this.loadData();
    }

    /**
     * Toggle widget visibility
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        const content = document.getElementById(`${this.containerId}-content`);
        
        if (content) {
            content.style.display = this.isVisible ? 'block' : 'none';
        }

        // Update toggle button icon
        const toggleBtn = this.container.querySelector('.widget-controls .btn:last-child i');
        if (toggleBtn) {
            toggleBtn.className = this.isVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
    }

    /**
     * Destroy the widget
     */
    destroy() {
        this.stopAutoRefresh();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Global monitoring widget instance
window.monitoringWidget = null;

/**
 * Initialize monitoring widget
 */
window.initMonitoringWidget = function(containerId, options = {}) {
    if (window.monitoringWidget) {
        window.monitoringWidget.destroy();
    }
    
    window.monitoringWidget = new MonitoringWidget(containerId, options);
    window.monitoringWidget.init();
    
    return window.monitoringWidget;
};

/**
 * Add monitoring widget styles
 */
function addMonitoringStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .monitoring-widget {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        .monitoring-widget .widget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
        }
        
        .monitoring-widget .widget-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        .monitoring-widget .widget-controls {
            display: flex;
            gap: 8px;
        }
        
        .monitoring-widget .widget-content {
            padding: 16px;
        }
        
        .overall-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        .overall-status.status-healthy { color: #28a745; }
        .overall-status.status-warning { color: #ffc107; }
        .overall-status.status-critical { color: #dc3545; }
        .overall-status.status-unknown { color: #6c757d; }
        
        .health-checks {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .health-check {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }
        
        .health-check.status-healthy { color: #28a745; }
        .health-check.status-warning { color: #ffc107; }
        .health-check.status-critical { color: #dc3545; }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
        }
        
        .metric-item {
            text-align: center;
            padding: 8px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        
        .metric-name {
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
        }
        
        .metric-value {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 2px;
        }
        
        .metric-value.metric-healthy { color: #28a745; }
        .metric-value.metric-warning { color: #ffc107; }
        .metric-value.metric-critical { color: #dc3545; }
        
        .metric-trend {
            font-size: 10px;
            color: #999;
        }
        
        .monitoring-error {
            text-align: center;
            padding: 20px;
            color: #dc3545;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 2px solid #f3f3f3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(style);
}

// Add styles when script loads
addMonitoringStyles();
