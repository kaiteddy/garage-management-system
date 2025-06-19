// Enhanced Dashboard Data Loading with Real Statistics

// Dashboard statistics cache
let dashboardStats = {
    customers: 0,
    vehicles: 0,
    revenue: 0,
    jobs: 0,
    loading: false
};

// Load dashboard statistics on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('dashboard').classList.contains('active')) {
        loadDashboardStats();
    }
});

// Load real dashboard statistics
async function loadDashboardStats() {
    if (dashboardStats.loading) return;

    dashboardStats.loading = true;

    // Show loading state
    showStatsLoading();

    try {
        // Use the working /api/stats endpoint
        const response = await fetch('/api/stats');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
                // Extract numeric values from the stats
                const stats = data.stats;
                const revenue = parseFloat(stats.revenue.replace(/[£,]/g, '')) || 0;

                // Update dashboard with real data
                updateDashboardStats({
                    customers: stats.customers || 0,
                    vehicles: stats.vehicles || 0,
                    revenue: revenue,
                    jobs: stats.jobs || 0
                });

                console.log('✅ Dashboard stats loaded successfully:', stats);
            }
        } else {
            throw new Error(`Stats API returned ${response.status}`);
        }

        // Load recent activity (optional - will fail gracefully)
        loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Show error state or fallback to cached data
        showStatsError();
    } finally {
        dashboardStats.loading = false;
        hideStatsLoading();
    }
}

// Fetch customer statistics
async function fetchCustomerStats() {
    try {
        const response = await fetch('/api/customers/stats');
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching customer stats:', error);
    }
    return { total: 0 };
}

// Fetch vehicle statistics
async function fetchVehicleStats() {
    try {
        const response = await fetch('/api/vehicles/stats');
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching vehicle stats:', error);
    }
    return { total: 0 };
}

// Fetch revenue statistics
async function fetchRevenueStats() {
    try {
        const response = await fetch('/api/invoices/stats');
        if (response.ok) {
            const data = await response.json();
            return { total: data.total_revenue || 0 };
        }
    } catch (error) {
        console.error('Error fetching revenue stats:', error);
    }
    return { total: 0 };
}

// Fetch job statistics
async function fetchJobStats() {
    try {
        const response = await fetch('/api/jobs/stats');
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching job stats:', error);
    }
    return { total: 0 };
}

// Update dashboard statistics display
function updateDashboardStats(stats) {
    // Animate number changes
    animateNumber('total-customers', dashboardStats.customers, stats.customers);
    animateNumber('total-vehicles', dashboardStats.vehicles, stats.vehicles);
    animateNumber('total-jobs', dashboardStats.jobs, stats.jobs);
    
    // Format and animate revenue
    const currentRevenue = parseFloat(dashboardStats.revenue) || 0;
    const newRevenue = parseFloat(stats.revenue) || 0;
    animateRevenue('total-revenue', currentRevenue, newRevenue);
    
    // Update cache
    dashboardStats = { ...dashboardStats, ...stats };
}

// Animate number changes
function animateNumber(elementId, from, to) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 1000; // 1 second
    const steps = 30;
    const stepValue = (to - from) / steps;
    const stepTime = duration / steps;
    
    let current = from;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += stepValue;
        
        if (step >= steps) {
            current = to;
            clearInterval(timer);
        }
        
        element.textContent = Math.round(current).toLocaleString();
    }, stepTime);
}

// Animate revenue with currency formatting
function animateRevenue(elementId, from, to) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 1000;
    const steps = 30;
    const stepValue = (to - from) / steps;
    const stepTime = duration / steps;
    
    let current = from;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += stepValue;
        
        if (step >= steps) {
            current = to;
            clearInterval(timer);
        }
        
        element.textContent = `£${current.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }, stepTime);
}

// Show loading state for statistics
function showStatsLoading() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.add('stat-loading');
    });
}

// Hide loading state for statistics
function hideStatsLoading() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.remove('stat-loading');
    });
}

// Show error state for statistics
function showStatsError() {
    const statCards = document.querySelectorAll('.stat-card h3');
    statCards.forEach(element => {
        if (element.textContent === '0' || element.textContent === '£0.00') {
            element.style.color = '#dc3545';
            element.title = 'Error loading data';
        }
    });
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/dashboard/recent-activity');
        if (response.ok) {
            const data = await response.json();
            displayRecentActivity(data);
        } else {
            // API endpoint doesn't exist, show placeholder
            displayRecentActivityPlaceholder();
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        displayRecentActivityPlaceholder();
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const container = document.querySelector('#dashboard .card-content p');
    if (!container || !activities || activities.length === 0) {
        return;
    }
    
    let html = '<div class="recent-activities">';
    
    activities.slice(0, 5).forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${formatActivityTime(activity.timestamp)}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Display recent activity error
function displayRecentActivityError() {
    const container = document.querySelector('#recent-activity-content');
    if (container) {
        container.innerHTML = '<div class="text-muted">Unable to load recent activity at this time.</div>';
    }
}

// Display recent activity placeholder
function displayRecentActivityPlaceholder() {
    const container = document.querySelector('#recent-activity-content');
    if (container) {
        container.innerHTML = `
            <div class="recent-activities">
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">Welcome to GarageManager Pro</div>
                        <div class="activity-time">System ready</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">Database connected and ready</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">All systems operational</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Get icon for activity type
function getActivityIcon(type) {
    const icons = {
        'customer': 'fa-user-plus',
        'vehicle': 'fa-car',
        'job': 'fa-wrench',
        'invoice': 'fa-file-invoice',
        'payment': 'fa-credit-card',
        'mot': 'fa-calendar-check'
    };
    return icons[type] || 'fa-info-circle';
}

// Format activity timestamp
function formatActivityTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
}

// Refresh dashboard data
function refreshDashboard() {
    loadDashboardStats();
}

// Auto-refresh dashboard every 5 minutes
setInterval(() => {
    if (document.getElementById('dashboard').classList.contains('active')) {
        refreshDashboard();
    }
}, 300000); // 5 minutes

// Export functions for global use
window.loadDashboardStats = loadDashboardStats;
window.refreshDashboard = refreshDashboard;
