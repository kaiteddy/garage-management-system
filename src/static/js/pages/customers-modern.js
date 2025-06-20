/**
 * Modern Customers JavaScript
 * Handles customer management functionality with beautiful UI
 */

const CustomersModern = {
  // Configuration
  config: {
    itemsPerPage: 25,
    searchDebounceMs: 300
  },

  // State
  state: {
    customers: [],
    filteredCustomers: [],
    currentPage: 1,
    searchTerm: '',
    statusFilter: '',
    searchTimeout: null
  },

  /**
   * Initialize the customers page
   */
  init () {
    console.log('👥 Initializing Modern Customers...')

    this.setupEventListeners()
    this.loadCustomerStats()
    this.loadCustomers()

    console.log('✅ Modern Customers initialized successfully')
  },

  /**
   * Setup event listeners
   */
  setupEventListeners () {
    // Search input
    const searchInput = document.getElementById('customer-search')
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.state.searchTimeout)
        this.state.searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value)
        }, this.config.searchDebounceMs)
      })
    }

    // Status filter
    const statusFilter = document.getElementById('status-filter')
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.handleStatusFilter(e.target.value)
      })
    }

    // Modal close on backdrop click
    const modalBackdrop = document.getElementById(
      'add-customer-modal-backdrop'
    )
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          this.closeAddCustomerModal()
        }
      })
    }
  },

  /**
   * Load customer statistics
   */
  async loadCustomerStats () {
    try {
      const response = await fetch('/api/customers/stats')
      const result = await response.json()

      if (result.status === 'success') {
        this.updateCustomerStats(result.data)
      } else {
        throw new Error(result.message || 'Failed to load stats')
      }
    } catch (error) {
      console.error('Error loading customer stats:', error)
      this.updateCustomerStats(this.getMockStats())
    }
  },

  /**
   * Update customer statistics display
   */
  updateCustomerStats (stats) {
    const elements = {
      'total-customers': stats.total_customers,
      'active-customers': stats.active_customers,
      'new-customers': stats.new_customers,
      'total-revenue': this.formatCurrency(stats.total_revenue)
    }

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) {
        if (typeof value === 'number' && id !== 'total-revenue') {
          this.animateNumber(element, value)
        } else {
          element.textContent = value
        }
      }
    })
  },

  /**
   * Load customers data
   */
  async loadCustomers (page = 1) {
    try {
      this.showLoadingState()

      const params = new URLSearchParams({
        page,
        per_page: this.config.itemsPerPage,
        search: this.state.searchTerm,
        status: this.state.statusFilter
      })

      const response = await fetch(`/api/customers?${params}`)
      const result = await response.json()

      if (result.status === 'success') {
        this.state.customers = result.data.customers
        this.state.currentPage = result.data.page
        this.updateCustomersTable(result.data)
        this.updatePagination(result.data)
        this.updateCustomerCount(result.data.total)
      } else {
        throw new Error(result.message || 'Failed to load customers')
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      this.showErrorState('Failed to load customers')
    }
  },

  /**
   * Show loading state
   */
  showLoadingState () {
    const tbody = document.getElementById('customers-table-body')
    if (tbody) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8">
                        <div class="spinner mx-auto mb-2"></div>
                        <p class="text-gray-500">Loading customers...</p>
                    </td>
                </tr>
            `
    }
  },

  /**
   * Show error state
   */
  showErrorState (message) {
    const tbody = document.getElementById('customers-table-body')
    if (tbody) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8">
                        <div class="text-error-600">
                            <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                            <p>${message}</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="CustomersModern.loadCustomers()">
                                Try Again
                            </button>
                        </div>
                    </td>
                </tr>
            `
    }
  },

  /**
   * Update customers table
   */
  updateCustomersTable (data) {
    const tbody = document.getElementById('customers-table-body')
    if (!tbody) return

    if (!data.customers || data.customers.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8">
                        <div class="text-gray-500">
                            <i class="fas fa-users text-2xl mb-2"></i>
                            <p>No customers found</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="openAddCustomerModal()">
                                Add First Customer
                            </button>
                        </div>
                    </td>
                </tr>
            `
      return
    }

    tbody.innerHTML = data.customers
      .map(
        (customer) => `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="viewCustomer(${customer.id})">
                <td>
                    <div class="flex items-center gap-3">
                        <div class="customer-avatar">
                            ${this.getCustomerInitials(customer)}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">
                                ${customer.first_name} ${customer.last_name}
                            </div>
                            ${customer.company ? `<div class="text-xs text-gray-500">${customer.company}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-sm">
                        ${customer.email ? `<div class="text-gray-900">${customer.email}</div>` : ''}
                        ${customer.phone ? `<div class="text-gray-500">${customer.phone}</div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="text-sm font-medium text-gray-900">
                        ${customer.vehicles_count || 0}
                    </div>
                </td>
                <td>
                    <div class="text-sm font-medium text-gray-900">
                        ${this.formatCurrency(customer.total_spent || 0)}
                    </div>
                </td>
                <td>
                    <div class="text-sm text-gray-900">
                        ${customer.last_service ? this.formatDate(customer.last_service) : 'Never'}
                    </div>
                </td>
                <td>
                    <span class="badge ${customer.is_active ? 'badge-success' : 'badge-gray'}">
                        ${customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-xs btn-ghost" onclick="event.stopPropagation(); editCustomer(${customer.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-xs btn-ghost" onclick="event.stopPropagation(); viewCustomerJobs(${customer.id})" title="View Jobs">
                            <i class="fas fa-tools"></i>
                        </button>
                        <button class="btn btn-xs btn-ghost" onclick="event.stopPropagation(); deleteCustomer(${customer.id})" title="Delete">
                            <i class="fas fa-trash text-error-600"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `
      )
      .join('')
  },

  /**
   * Update customer count display
   */
  updateCustomerCount (total) {
    const countElement = document.getElementById('customer-count')
    if (countElement) {
      countElement.textContent = `${total} customers`
    }
  },

  /**
   * Update pagination
   */
  updatePagination (data) {
    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info')
    if (paginationInfo) {
      const start = (data.page - 1) * data.per_page + 1
      const end = Math.min(start + data.per_page - 1, data.total)
      paginationInfo.textContent = `Showing ${start}-${end} of ${data.total} customers`
    }

    // Update pagination controls
    const paginationControls = document.getElementById('pagination-controls')
    if (paginationControls && data.pages > 1) {
      const buttons = []

      // Previous button
      if (data.page > 1) {
        buttons.push(`
                    <button class="btn btn-sm btn-secondary" onclick="CustomersModern.loadCustomers(${data.page - 1})">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                `)
      }

      // Page numbers
      for (
        let i = Math.max(1, data.page - 2);
        i <= Math.min(data.pages, data.page + 2);
        i++
      ) {
        buttons.push(`
                    <button class="btn btn-sm ${i === data.page ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="CustomersModern.loadCustomers(${i})">
                        ${i}
                    </button>
                `)
      }

      // Next button
      if (data.page < data.pages) {
        buttons.push(`
                    <button class="btn btn-sm btn-secondary" onclick="CustomersModern.loadCustomers(${data.page + 1})">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                `)
      }

      paginationControls.innerHTML = buttons.join('')
    } else {
      paginationControls.innerHTML = ''
    }
  },

  /**
   * Handle search
   */
  handleSearch (searchTerm) {
    this.state.searchTerm = searchTerm
    this.state.currentPage = 1
    this.loadCustomers()
  },

  /**
   * Handle status filter
   */
  handleStatusFilter (status) {
    this.state.statusFilter = status
    this.state.currentPage = 1
    this.loadCustomers()
  },

  /**
   * Clear all filters
   */
  clearFilters () {
    document.getElementById('customer-search').value = ''
    document.getElementById('status-filter').value = ''
    this.state.searchTerm = ''
    this.state.statusFilter = ''
    this.state.currentPage = 1
    this.loadCustomers()
  },

  /**
   * Utility functions
   */
  getCustomerInitials (customer) {
    const first = customer.first_name
      ? customer.first_name.charAt(0).toUpperCase()
      : ''
    const last = customer.last_name
      ? customer.last_name.charAt(0).toUpperCase()
      : ''
    return first + last || '?'
  },

  formatCurrency (amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  },

  formatDate (dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  },

  animateNumber (element, targetValue) {
    const startValue = parseInt(element.textContent) || 0
    const duration = 1000
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.round(
        startValue + (targetValue - startValue) * easeOutQuart
      )

      element.textContent = currentValue.toLocaleString()

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  },

  getMockStats () {
    return {
      total_customers: 156,
      active_customers: 89,
      new_customers: 12,
      total_revenue: 45230.0
    }
  }
}

// Global functions for modal and actions
function openAddCustomerModal () {
  // Use the new utility function for consistent modal behavior
  if (Utils && Utils.showModal) {
    Utils.showModal('add-customer-modal')
  } else {
    // Fallback to manual implementation
    const backdrop = document.getElementById('add-customer-modal-backdrop')
    const modal = document.getElementById('add-customer-modal')

    if (backdrop && modal) {
      backdrop.style.display = 'flex'
      backdrop.classList.add('show')
      modal.classList.add('show')
    }
  }
}

function closeAddCustomerModal () {
  // Use the new utility function for consistent modal behavior
  if (Utils && Utils.hideModal) {
    Utils.hideModal('add-customer-modal')
  } else {
    // Fallback to manual implementation
    const backdrop = document.getElementById('add-customer-modal-backdrop')
    const modal = document.getElementById('add-customer-modal')

    if (backdrop && modal) {
      backdrop.classList.remove('show')
      modal.classList.remove('show')
      setTimeout(() => {
        backdrop.style.display = 'none'
      }, 250)
    }
  }
}

function saveCustomer () {
  console.log('Saving customer...')
  // Implement save functionality
  closeAddCustomerModal()
}

function viewCustomer (id) {
  console.log('Viewing customer:', id)
  // Implement view customer functionality
}

function editCustomer (id) {
  console.log('Editing customer:', id)
  // Implement edit customer functionality
}

function viewCustomerJobs (id) {
  console.log('Viewing jobs for customer:', id)
  // Implement view jobs functionality
}

function deleteCustomer (id) {
  if (confirm('Are you sure you want to delete this customer?')) {
    console.log('Deleting customer:', id)
    // Implement delete functionality
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomersModern
}
