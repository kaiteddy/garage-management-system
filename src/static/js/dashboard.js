/**
 * Dashboard JavaScript Functions
 * Handles dashboard statistics, MOT data, and updates
 * Extracted from monolithic index.html for better performance
 */

// Dashboard functions - Updated to use real API data
function loadDashboardStats() {
    console.log('📊 Loading dashboard statistics...');

    // Use the /api/stats endpoint which returns properly formatted data
    fetch('/api/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('📊 Dashboard stats loaded:', result);

            // API returns data wrapped in success/stats format
            if (result && result.success && result.stats) {
                const stats = result.stats;
                console.log('🔄 Updating dashboard elements...');

                // Check if elements exist
                const customersEl = document.getElementById('total-customers');
                const vehiclesEl = document.getElementById('total-vehicles');
                const revenueEl = document.getElementById('total-revenue');
                const jobsEl = document.getElementById('total-jobs');

                console.log('📍 Dashboard elements found:', {
                    customers: !!customersEl,
                    vehicles: !!vehiclesEl,
                    revenue: !!revenueEl,
                    jobs: !!jobsEl
                });

                // Update dashboard cards with real data
                if (customersEl) customersEl.textContent = stats.customers.toLocaleString();
                if (vehiclesEl) vehiclesEl.textContent = stats.vehicles.toLocaleString();

                // Revenue is already formatted as a string from the API
                if (revenueEl) revenueEl.textContent = stats.revenue;

                // Use jobs count
                const jobsCount = stats.jobs || stats.documents || 0;
                if (jobsEl) jobsEl.textContent = jobsCount.toLocaleString();

                console.log('✅ Dashboard stats updated successfully');
            } else {
                console.error('❌ Invalid API response format:', result);
                showDashboardError();
            }
        })
        .catch(error => {
            console.error('❌ Error loading dashboard stats:', error);
            showDashboardError();
        });
}

// Show error state on dashboard
function showDashboardError() {
    const customersEl = document.getElementById('total-customers');
    const vehiclesEl = document.getElementById('total-vehicles');
    const revenueEl = document.getElementById('total-revenue');
    const jobsEl = document.getElementById('total-jobs');

    if (customersEl) customersEl.textContent = 'Error';
    if (vehiclesEl) vehiclesEl.textContent = 'Error';
    if (revenueEl) revenueEl.textContent = 'Error';
    if (jobsEl) jobsEl.textContent = 'Error';
}

// Load MOT data for dashboard
function loadMOTDashboardData() {
    console.log('🚗 Loading MOT dashboard data...');

    // Only load if we're on a page that has MOT dashboard elements
    if (!document.getElementById('mot-expired') && !document.getElementById('urgent-mot-list')) {
        return;
    }

    fetch('/api/mot/vehicles')
        .then(response => response.json())
        .then(data => {
            console.log('🚗 MOT data loaded:', data);

            // Calculate MOT statistics
            const expired = data.filter(v => v.is_expired).length;
            const critical = data.filter(v => !v.is_expired && v.days_until_expiry <= 7).length;
            const dueSoon = data.filter(v => !v.is_expired && v.days_until_expiry > 7 && v.days_until_expiry <= 30).length;
            const valid = data.filter(v => !v.is_expired && v.days_until_expiry > 30).length;

            // Update MOT statistics
            const motExpiredEl = document.getElementById('mot-expired');
            const motCriticalEl = document.getElementById('mot-critical');
            const motDueSoonEl = document.getElementById('mot-due-soon');
            const motValidEl = document.getElementById('mot-valid');

            if (motExpiredEl) motExpiredEl.textContent = expired;
            if (motCriticalEl) motCriticalEl.textContent = critical;
            if (motDueSoonEl) motDueSoonEl.textContent = dueSoon;
            if (motValidEl) motValidEl.textContent = valid;

            // Show urgent MOT vehicles (expired and critical)
            const urgentVehicles = data.filter(v => v.is_expired || v.days_until_expiry <= 7)
                                      .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
                                      .slice(0, 5); // Show top 5 most urgent

            displayUrgentMOTVehicles(urgentVehicles);
        })
        .catch(error => {
            console.error('❌ Error loading MOT data:', error);

            // Only update elements if they exist (dashboard page)
            const urgentList = document.getElementById('urgent-mot-list');
            if (urgentList) {
                urgentList.innerHTML = '<p class="text-danger">Error loading MOT data</p>';
            }

            // Set error values for MOT stats if elements exist
            const motExpired = document.getElementById('mot-expired');
            const motCritical = document.getElementById('mot-critical');
            const motDueSoon = document.getElementById('mot-due-soon');
            const motValid = document.getElementById('mot-valid');

            if (motExpired) motExpired.textContent = '0';
            if (motCritical) motCritical.textContent = '0';
            if (motDueSoon) motDueSoon.textContent = '0';
            if (motValid) motValid.textContent = '0';
        });
}

// Display urgent MOT vehicles on dashboard
function displayUrgentMOTVehicles(vehicles) {
    const container = document.getElementById('urgent-mot-list');

    // Check if container exists (only on dashboard)
    if (!container) {
        return;
    }

    if (vehicles.length === 0) {
        container.innerHTML = '<p class="text-success"><i class="fas fa-check-circle"></i> No urgent MOT reminders</p>';
        return;
    }

    let html = '<div style="max-height: 200px; overflow-y: auto;"><table class="table table-sm table-hover">';
    html += '<thead><tr><th>Registration</th><th>Vehicle</th><th>Customer</th><th>Status</th></tr></thead><tbody>';

    vehicles.forEach(vehicle => {
        const statusClass = vehicle.is_expired ? 'badge bg-danger' : 'badge bg-warning text-dark';
        const statusText = vehicle.is_expired ? 'EXPIRED' : `${vehicle.days_until_expiry} days`;

        html += `<tr>
            <td><strong>${vehicle.registration}</strong></td>
            <td>${vehicle.make} ${vehicle.model}</td>
            <td>${vehicle.customer_name || 'Unknown'}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Load recent activity for dashboard
function loadRecentActivity() {
    console.log('📈 Loading recent activity...');

    // Check if recent activity container exists
    const container = document.getElementById('recent-activity-list');
    if (!container) {
        console.log('📈 Recent activity container not found, skipping...');
        return;
    }

    fetch('/api/recent-activity')
        .then(response => response.json())
        .then(data => {
            console.log('📈 Recent activity loaded:', data);
            displayRecentActivity(data);
        })
        .catch(error => {
            console.error('❌ Error loading recent activity:', error);
            if (container) {
                container.innerHTML = '<p class="text-danger">Error loading recent activity</p>';
            }
        });
}

// Display recent activity
function displayRecentActivity(activities) {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent activity</p>';
        return;
    }

    let html = '';
    activities.slice(0, 10).forEach(activity => {
        const iconClass = getActivityIcon(activity.type);
        const timeAgo = formatTimeAgo(activity.timestamp);
        
        html += `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-subtitle">${activity.description}</div>
                    <div class="activity-date">${timeAgo}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Get icon for activity type
function getActivityIcon(type) {
    const icons = {
        'job': 'fas fa-wrench',
        'invoice': 'fas fa-file-invoice-dollar',
        'customer': 'fas fa-user-plus',
        'vehicle': 'fas fa-car',
        'mot': 'fas fa-certificate',
        'default': 'fas fa-info-circle'
    };
    return icons[type] || icons.default;
}

// Format time ago
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return time.toLocaleDateString();
}

console.log('📊 Dashboard JavaScript loaded');
