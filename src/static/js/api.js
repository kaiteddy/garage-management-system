/**
 * API Communication Module
 * Enhanced with caching and specific data loading functions
 * Extracted from monolithic index.html
 */

// Request caching and debouncing to improve performance
const requestCache = new Map()
const pendingRequests = new Map()
const CACHE_DURATION = 30000 // 30 seconds

const API = {
  /**
   * Base API configuration
   */
  config: {
    baseURL: '',
    timeout: 10000
  },

  /**
   * Cached fetch function to reduce API calls
   */
  async cachedFetch (url, options = {}) {
    const cacheKey = url + JSON.stringify(options)
    const now = Date.now()

    // Check cache first
    if (requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey)
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached response for:', url)
        return cached.response.clone()
      }
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      console.log('⏳ Request already pending for:', url)
      return pendingRequests.get(cacheKey)
    }

    // Make new request
    console.log('🌐 Making fresh request to:', url)
    const requestPromise = fetch(url, options)
    pendingRequests.set(cacheKey, requestPromise)

    try {
      const response = await requestPromise
      const clonedResponse = response.clone()

      // Cache successful responses
      if (response.ok) {
        requestCache.set(cacheKey, {
          response: clonedResponse,
          timestamp: now
        })
      }

      return response
    } finally {
      pendingRequests.delete(cacheKey)
    }
  },

  /**
   * Make API request
   */
  async request (endpoint, options = {}) {
    const url = this.config.baseURL + endpoint
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: this.config.timeout
    }

    try {
      const response = await this.cachedFetch(url, {
        ...defaultOptions,
        ...options
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  },

  /**
   * GET request
   */
  async get (endpoint) {
    return this.request(endpoint, { method: 'GET' })
  },

  /**
   * POST request
   */
  async post (endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  /**
   * PUT request
   */
  async put (endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  /**
   * DELETE request
   */
  async delete (endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  },

  /**
   * Clear API cache
   */
  clearCache () {
    requestCache.clear()
    pendingRequests.clear()
    console.log('🧹 API cache cleared')
  },

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return {
      cached: requestCache.size,
      pending: pendingRequests.size,
      cacheKeys: Array.from(requestCache.keys())
    }
  }
}

/**
 * Data Loading Functions
 * Extracted from monolithic index.html
 */

/**
 * Load customers from API
 */
async function loadCustomersFromAPI () {
  try {
    console.log('🔄 Loading customers from API...')
    const response = await API.cachedFetch('/api/customers')
    const result = await response.json()
    console.log('📊 Customers API response:', result)

    if (result && result.customers) {
      console.log(
        `✅ Found ${result.customers.length} customers, calling displayCustomers...`
      )
      if (typeof displayCustomers === 'function') {
        displayCustomers(result.customers)
      }
    } else {
      console.error('❌ No customers data in response:', result)
    }
  } catch (error) {
    console.error('Failed to load customers:', error)
    showAPIError('customers', error)
  }
}

/**
 * Load vehicles from API
 */
async function loadVehiclesFromAPI () {
  try {
    const response = await API.cachedFetch('/api/vehicles')
    const result = await response.json()

    if (result && result.vehicles) {
      if (typeof displayVehicles === 'function') {
        displayVehicles(result.vehicles)
      }
    }
  } catch (error) {
    console.error('Failed to load vehicles:', error)
    showAPIError('vehicles', error)
  }
}

/**
 * Load jobs from API
 */
async function loadJobsFromAPI () {
  try {
    const response = await API.cachedFetch('/api/jobs')
    const result = await response.json()

    if (result && result.jobs) {
      if (typeof displayJobs === 'function') {
        displayJobs(result.jobs)
      }
    }
  } catch (error) {
    console.error('Failed to load jobs:', error)
    showAPIError('jobs', error)
  }
}

/**
 * Load invoices from API
 */
async function loadInvoicesFromAPI () {
  try {
    const response = await API.cachedFetch('/api/invoices')
    const result = await response.json()

    if (result && result.invoices) {
      if (typeof displayInvoices === 'function') {
        displayInvoices(result.invoices)
      }
    }
  } catch (error) {
    console.error('Failed to load invoices:', error)
    showAPIError('invoices', error)
  }
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats () {
  try {
    console.log('📊 Loading dashboard stats...')
    const response = await API.cachedFetch('/api/stats')
    const data = await response.json()

    if (data) {
      updateDashboardStats(data)
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
    showAPIError('dashboard stats', error)
  }
}

/**
 * Update dashboard statistics display
 */
function updateDashboardStats (data) {
  const elements = {
    'total-customers': data.customers,
    'total-vehicles': data.vehicles,
    'total-revenue': data.revenue,
    'total-documents': data.documents || data.invoices
  }

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id)
    if (element) {
      if (id === 'total-revenue') {
        element.textContent =
          typeof value === 'string'
            ? value
            : `£${(value / 1000000).toFixed(1)}M`
      } else {
        element.textContent =
          typeof value === 'number' ? value.toLocaleString() : value
      }
    }
  })
}

/**
 * Load recent activity
 */
async function loadRecentActivity () {
  try {
    console.log('📈 Loading recent activity...')
    const response = await API.cachedFetch('/api/recent-activity')

    if (response.status === 404) {
      // Endpoint doesn't exist, show placeholder
      console.log(
        'ℹ️ Recent activity endpoint not available, showing placeholder'
      )
      updateRecentActivity([])
      return
    }

    const data = await response.json()

    if (data && data.activities) {
      updateRecentActivity(data.activities)
    }
  } catch (error) {
    console.error('Error loading recent activity:', error)
    // Show placeholder on error
    updateRecentActivity([])
  }
}

/**
 * Update recent activity display
 */
function updateRecentActivity (activities) {
  const container =
    document.getElementById('recent-activity-list') ||
    document.getElementById('recent-activity-content')
  if (!container) return

  if (activities && activities.length > 0) {
    container.innerHTML = activities
      .map(
        (activity) => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${activity.icon || 'circle'}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-subtitle">${activity.subtitle}</div>
                    <div class="activity-date">${activity.date}</div>
                </div>
            </div>
        `
      )
      .join('')
  } else {
    // Show placeholder content when no activities
    container.innerHTML = `
            <div class="recent-activities">
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">System ready and operational</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">Database connected successfully</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
            </div>
        `
  }
}

/**
 * Show API error message
 */
function showAPIError (resource, error) {
  console.error(`API Error for ${resource}:`, error)

  if (typeof showNotification === 'function') {
    showNotification(`Failed to load ${resource}`, 'error')
  }
}

// Make API and functions available globally
window.API = API
window.loadCustomersFromAPI = loadCustomersFromAPI
window.loadVehiclesFromAPI = loadVehiclesFromAPI
window.loadJobsFromAPI = loadJobsFromAPI
window.loadInvoicesFromAPI = loadInvoicesFromAPI
window.loadDashboardStats = loadDashboardStats
window.loadRecentActivity = loadRecentActivity
