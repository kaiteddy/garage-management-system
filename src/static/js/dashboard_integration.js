// Dashboard Integration Script - Improved UI and Real Data Loading

// Enhanced dashboard initialization
document.addEventListener('DOMContentLoaded', function () {
  // Apply improved styling
  applyImprovedStyling()

  // Load real dashboard data
  if (
    document.getElementById('dashboard') &&
    document.getElementById('dashboard').classList.contains('active')
  ) {
    loadRealDashboardData()
  }

  // Set up auto-refresh
  setupAutoRefresh()
})

// Apply improved styling to dashboard
function applyImprovedStyling () {
  // Add improved CSS to head
  const style = document.createElement('style')
  style.textContent = `
        /* Enhanced Dashboard Styling - More Neutral and Readable */
        .stat-card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 1.5rem;
            transition: all 0.3s ease;
            border: 1px solid #e9ecef;
            position: relative;
            cursor: pointer;
        }

        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            border-color: #dee2e6;
        }

        /* More Neutral Icon Colors */
        .stat-icon.customers { 
            background: linear-gradient(135deg, #495057 0%, #6c757d 100%); 
        }
        .stat-icon.vehicles { 
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
        }
        .stat-icon.revenue { 
            background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); 
        }
        .stat-icon.documents { 
            background: linear-gradient(135deg, #17a2b8 0%, #117a8b 100%); 
        }

        /* Better Text Contrast */
        .stat-info h3 {
            font-size: 2.25rem;
            font-weight: 700;
            color: #212529;
            margin-bottom: 0.25rem;
        }

        .stat-info p {
            color: #495057;
            font-size: 1rem;
            margin-bottom: 0.25rem;
            font-weight: 600;
        }

        .stat-info small {
            color: #6c757d;
            font-size: 0.85rem;
            font-weight: 400;
        }

        /* Loading Animation */
        .stat-loading {
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        /* Quick Actions Improvements */
        .quick-action-btn:hover {
            border-color: #007bff;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
        }

        /* Recent Activity Styling */
        .recent-activities {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .activity-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }

        .activity-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.9rem;
        }

        .activity-content {
            flex: 1;
        }

        .activity-text {
            font-weight: 500;
            color: #495057;
            margin-bottom: 0.25rem;
        }

        .activity-time {
            font-size: 0.85rem;
            color: #6c757d;
        }
    `
  document.head.appendChild(style)
}

// Load real dashboard data
async function loadRealDashboardData () {
  try {
    // Show loading state
    showDashboardLoading()

    // Fetch real statistics from backend
    const response = await fetch('/api/stats')
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        updateDashboardWithRealData(data.stats)
      } else {
        console.error('API returned error:', data.error)
        showDashboardError()
      }
    } else {
      console.error('Failed to fetch dashboard stats:', response.status)
      showDashboardError()
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    showDashboardError()
  } finally {
    hideDashboardLoading()
  }
}

// Update dashboard with real data
function updateDashboardWithRealData (stats) {
  // Update customer count
  const customerElement = document.getElementById('total-customers')
  if (customerElement) {
    animateNumber(customerElement, 0, stats.customers || 0)
  }

  // Update vehicle count
  const vehicleElement = document.getElementById('total-vehicles')
  if (vehicleElement) {
    animateNumber(vehicleElement, 0, stats.vehicles || 0)
  }

  // Update job count
  const jobElement = document.getElementById('total-jobs')
  if (jobElement) {
    animateNumber(jobElement, 0, stats.jobs || 0)
  }

  // Update revenue (already formatted from backend)
  const revenueElement = document.getElementById('total-revenue')
  if (revenueElement && stats.revenue) {
    revenueElement.textContent = stats.revenue
  }

  console.log('Dashboard updated with real data:', stats)
}

// Animate number changes
function animateNumber (element, from, to) {
  const duration = 1000
  const steps = 30
  const stepValue = (to - from) / steps
  const stepTime = duration / steps

  let current = from
  let step = 0

  const timer = setInterval(() => {
    step++
    current += stepValue

    if (step >= steps) {
      current = to
      clearInterval(timer)
    }

    element.textContent = Math.round(current).toLocaleString()
  }, stepTime)
}

// Show loading state
function showDashboardLoading () {
  const statCards = document.querySelectorAll('.stat-card')
  statCards.forEach((card) => {
    card.classList.add('stat-loading')
  })
}

// Hide loading state
function hideDashboardLoading () {
  const statCards = document.querySelectorAll('.stat-card')
  statCards.forEach((card) => {
    card.classList.remove('stat-loading')
  })
}

// Show error state
function showDashboardError () {
  const statCards = document.querySelectorAll('.stat-card h3')
  statCards.forEach((element) => {
    if (element.textContent === '0' || element.textContent === '£0.00') {
      element.style.color = '#dc3545'
      element.title = 'Error loading data - click to retry'
      element.style.cursor = 'pointer'
      element.onclick = () => loadRealDashboardData()
    }
  })
}

// Setup auto-refresh
function setupAutoRefresh () {
  // Refresh dashboard data every 5 minutes
  setInterval(() => {
    if (
      document.getElementById('dashboard') &&
      document.getElementById('dashboard').classList.contains('active')
    ) {
      loadRealDashboardData()
    }
  }, 300000) // 5 minutes
}

// Refresh dashboard manually
function refreshDashboard () {
  loadRealDashboardData()
}

// Make functions globally available
window.loadRealDashboardData = loadRealDashboardData
window.refreshDashboard = refreshDashboard

console.log(
  '✅ Dashboard integration script loaded - improved styling and real data loading enabled'
)
