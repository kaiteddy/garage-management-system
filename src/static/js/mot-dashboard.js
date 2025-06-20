/**
 * MOT Dashboard Management
 * Handles MOT vehicle tracking, status monitoring, and reminder management
 */

class MOTDashboard {
  constructor () {
    this.vehicles = []
    this.filteredVehicles = []
    this.isLoading = false
    this.currentFilter = 'all'
    this.searchTerm = ''
  }

  /**
   * Initialize MOT Dashboard
   */
  init () {
    console.log('🚀 Initializing MOT Dashboard...')
    this.bindEvents()
    this.loadData()
  }

  /**
   * Bind event listeners
   */
  bindEvents () {
    // Refresh data button
    document.getElementById('refreshData')?.addEventListener('click', () => {
      this.loadData()
    })

    // Upload vehicles button
    document.getElementById('uploadVehicles')?.addEventListener('click', () => {
      this.showUploadModal()
    })

    // Quick action buttons
    document.getElementById('viewExpired')?.addEventListener('click', () => {
      this.filterVehicles('expired')
    })

    document.getElementById('viewCritical')?.addEventListener('click', () => {
      this.filterVehicles('critical')
    })

    document.getElementById('sendReminders')?.addEventListener('click', () => {
      // Show SMS modal within the MOT page instead of redirecting
      if (typeof showSMSModal === 'function') {
        showSMSModal()
      } else {
        console.warn('SMS modal function not available')
      }
    })

    document.getElementById('exportData')?.addEventListener('click', () => {
      this.exportData()
    })

    // Filter and search
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
      this.currentFilter = e.target.value
      this.applyFilters()
    })

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase()
      this.applyFilters()
    })

    // Modal events
    this.bindModalEvents()
  }

  /**
   * Bind modal event listeners
   */
  bindModalEvents () {
    // Vehicle Details Modal
    document
      .querySelector('#vehicleDetailsModal .modal-close')
      ?.addEventListener('click', () => {
        this.hideModal('vehicleDetailsModal')
      })

    // Upload Modal
    document
      .querySelector('#uploadVehiclesModal .modal-close')
      ?.addEventListener('click', () => {
        this.hideModal('uploadVehiclesModal')
      })

    document.getElementById('cancelUpload')?.addEventListener('click', () => {
      this.hideModal('uploadVehiclesModal')
    })

    document.getElementById('confirmUpload')?.addEventListener('click', () => {
      this.uploadVehicles()
    })

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideModal(e.target.id)
      }
    })
  }

  /**
   * Load MOT dashboard data
   */
  async loadData () {
    if (this.isLoading) return

    this.isLoading = true
    this.showLoading()

    try {
      const response = await fetch('/api/mot/vehicles')

      if (response.ok) {
        const data = await response.json()
        this.vehicles = data.vehicles || []
        this.updateStatistics()
        this.applyFilters()
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error loading MOT data:', error)
      this.showError('Failed to load MOT data')
    } finally {
      this.isLoading = false
      this.hideLoading()
    }
  }

  /**
   * Update statistics display
   */
  updateStatistics () {
    const expired = this.vehicles.filter((v) => v.is_expired)
    const critical = this.vehicles.filter(
      (v) => !v.is_expired && v.days_until_expiry <= 7
    )
    const dueSoon = this.vehicles.filter(
      (v) =>
        !v.is_expired && v.days_until_expiry > 7 && v.days_until_expiry <= 30
    )
    const valid = this.vehicles.filter(
      (v) => !v.is_expired && v.days_until_expiry > 30
    )

    // Update stat cards using the existing HTML structure
    const updateElement = (id, value) => {
      const element = document.getElementById(id)
      if (element) element.textContent = value
    }

    // Update filter counts
    updateElement('filter-count-all', this.vehicles.length)
    updateElement('filter-count-expired', expired.length)
    updateElement('filter-count-critical', critical.length)
    updateElement('filter-count-due-soon', dueSoon.length)
    updateElement('filter-count-normal', valid.length)

    // Update MOT urgent count in navigation
    updateElement('mot-urgent-count', expired.length + critical.length)

    // Update SMS stats if elements exist
    updateElement('sms-total-vehicles', this.vehicles.length)
    updateElement(
      'sms-with-mobile',
      this.vehicles.filter((v) => v.mobile_number).length
    )
    updateElement(
      'sms-urgent',
      this.vehicles.filter(
        (v) => (v.is_expired || v.days_until_expiry <= 7) && v.mobile_number
      ).length
    )

    // Calculate and update SMS coverage
    const withMobile = this.vehicles.filter((v) => v.mobile_number).length
    const coverage =
      this.vehicles.length > 0
        ? Math.round((withMobile / this.vehicles.length) * 100)
        : 0
    updateElement('sms-coverage', `${coverage}%`)
  }

  /**
   * Apply filters and search
   */
  applyFilters () {
    let filtered = [...this.vehicles]

    // Apply status filter
    switch (this.currentFilter) {
      case 'expired':
        filtered = filtered.filter((v) => v.is_expired)
        break
      case 'critical':
        filtered = filtered.filter(
          (v) => !v.is_expired && v.days_until_expiry <= 7
        )
        break
      case 'due_soon':
        filtered = filtered.filter(
          (v) =>
            !v.is_expired &&
            v.days_until_expiry > 7 &&
            v.days_until_expiry <= 30
        )
        break
      case 'valid':
        filtered = filtered.filter(
          (v) => !v.is_expired && v.days_until_expiry > 30
        )
        break
      case 'with_mobile':
        filtered = filtered.filter((v) => v.mobile_number)
        break
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.registration.toLowerCase().includes(this.searchTerm) ||
          (v.customer_name &&
            v.customer_name.toLowerCase().includes(this.searchTerm)) ||
          (v.make && v.make.toLowerCase().includes(this.searchTerm)) ||
          (v.model && v.model.toLowerCase().includes(this.searchTerm))
      )
    }

    this.filteredVehicles = filtered
    this.renderVehiclesTable()
  }

  /**
   * Filter vehicles by status
   */
  filterVehicles (status) {
    const statusFilter = document.getElementById('statusFilter')
    if (statusFilter) {
      statusFilter.value = status
      this.currentFilter = status
      this.applyFilters()
    }
  }

  /**
   * Render vehicles table
   */
  renderVehiclesTable () {
    const tbody = document.getElementById('mot-vehicles-table-body')
    if (!tbody) {
      console.warn('MOT vehicles table body not found')
      return
    }

    // Update vehicle count if element exists
    const vehicleCount = document.getElementById('vehicleCount')
    if (vehicleCount) {
      vehicleCount.textContent = `(${this.filteredVehicles.length} vehicles)`
    }

    if (this.filteredVehicles.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="text-center py-8 text-gray-500">
                        <i class="fas fa-car mr-2"></i>
                        No vehicles found matching current filters
                    </td>
                </tr>
            `
      return
    }

    // Sort vehicles by urgency
    const sortedVehicles = this.filteredVehicles.sort((a, b) => {
      if (a.is_expired && !b.is_expired) return -1
      if (!a.is_expired && b.is_expired) return 1
      return (a.days_until_expiry || 999) - (b.days_until_expiry || 999)
    })

    tbody.innerHTML = sortedVehicles
      .map((vehicle) => this.renderVehicleRow(vehicle))
      .join('')

    // Bind row events
    this.bindVehicleRowEvents()
  }

  /**
   * Render a single vehicle row
   */
  renderVehicleRow (vehicle) {
    const statusInfo = this.getVehicleStatus(vehicle)
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Unknown'
      try {
        return new Date(dateStr).toLocaleDateString('en-GB')
      } catch {
        return dateStr
      }
    }

    return `
            <tr class="vehicle-row ${statusInfo.rowClass}" data-registration="${vehicle.registration}">
                <td>
                    <input type="checkbox" class="vehicle-checkbox" value="${vehicle.registration}">
                </td>
                <td>
                    <span class="status-badge ${statusInfo.badgeClass}">
                        <i class="${statusInfo.icon}"></i>
                    </span>
                </td>
                <td class="font-mono font-medium">${vehicle.registration}</td>
                <td>${vehicle.make || 'Unknown'} ${vehicle.model || ''}</td>
                <td>
                    ${vehicle.customer_name || '<span class="text-muted">No customer data</span>'}
                </td>
                <td>
                    <span class="${statusInfo.dateClass}">
                        ${formatDate(vehicle.mot_expiry_date)}
                    </span>
                </td>
                <td>
                    <span class="${statusInfo.dateClass}">
                        ${this.formatDaysUntilExpiry(vehicle)}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusInfo.badgeClass}">
                        ${statusInfo.text}
                    </span>
                </td>
                <td>
                    ${
                      vehicle.mobile_number
                        ? `<a href="tel:${vehicle.mobile_number}" class="text-primary">
                             <i class="fas fa-phone"></i> ${vehicle.mobile_number}
                           </a>`
                        : '<span class="text-muted">No mobile</span>'
                    }
                </td>
                <td>
                    ${
                      vehicle.can_send_sms
                        ? '<span class="text-success"><i class="fas fa-check"></i></span>'
                        : '<span class="text-danger"><i class="fas fa-times"></i></span>'
                    }
                </td>
                <td>
                    ${formatDate(vehicle.uploaded_at)}
                </td>
                <td>
                    ${vehicle.sms_sent_at ? formatDate(vehicle.sms_sent_at) : '<span class="text-muted">Not sent</span>'}
                </td>
                <td>
                    ${
                      vehicle.main_customer_id
                        ? '<span class="text-success"><i class="fas fa-check"></i></span>'
                        : '<span class="text-warning"><i class="fas fa-question"></i></span>'
                    }
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${
                          vehicle.is_booked_in
                            ? `
                            <button class="btn btn-outline-secondary btn-sm" onclick="unbookVehicle('${vehicle.registration}')" title="Unbook Vehicle">
                                <i class="fas fa-times"></i>
                            </button>
                            <span class="badge bg-primary">Booked</span>
                        `
                            : `
                            <button class="btn btn-outline-primary btn-sm" onclick="bookVehicle('${vehicle.registration}')" title="Book Vehicle">
                                <i class="fas fa-calendar-plus"></i>
                            </button>
                        `
                        }
                        ${
                          vehicle.mobile_number && !vehicle.is_booked_in
                            ? `
                            <button class="btn btn-outline-success btn-sm send-sms-btn"
                                    data-registration="${vehicle.registration}"
                                    title="Send SMS">
                                <i class="fas fa-sms"></i>
                            </button>
                        `
                            : ''
                        }
                    </div>
                </td>
            </tr>
        `
  }

  /**
   * Get vehicle status information
   */
  getVehicleStatus (vehicle) {
    if (vehicle.is_expired) {
      return {
        text: 'EXPIRED',
        icon: 'fas fa-exclamation-triangle',
        badgeClass: 'status-expired',
        rowClass: 'expired',
        dateClass: 'text-red-600 font-medium'
      }
    } else if (vehicle.days_until_expiry <= 7) {
      return {
        text: 'CRITICAL',
        icon: 'fas fa-clock',
        badgeClass: 'status-critical',
        rowClass: 'critical',
        dateClass: 'text-yellow-600 font-medium'
      }
    } else if (vehicle.days_until_expiry <= 30) {
      return {
        text: 'DUE SOON',
        icon: 'fas fa-exclamation',
        badgeClass: 'status-due-soon',
        rowClass: 'due-soon',
        dateClass: 'text-blue-600'
      }
    } else {
      return {
        text: 'VALID',
        icon: 'fas fa-check',
        badgeClass: 'status-valid',
        rowClass: 'valid',
        dateClass: 'text-gray-600'
      }
    }
  }

  /**
   * Format date for display
   */
  formatDate (dateString) {
    if (!dateString) return 'Unknown'

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB')
    } catch {
      return dateString
    }
  }

  /**
   * Format days until expiry
   */
  formatDaysUntilExpiry (vehicle) {
    if (vehicle.is_expired) {
      const daysAgo = Math.abs(vehicle.days_until_expiry || 0)
      return `${daysAgo} days ago`
    } else if (vehicle.days_until_expiry !== null) {
      return `${vehicle.days_until_expiry} days`
    }
    return 'Unknown'
  }

  /**
   * Bind vehicle row events
   */
  bindVehicleRowEvents () {
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach((button) => {
      button.addEventListener('click', (e) => {
        const registration = e.target.closest('button').dataset.registration
        this.showVehicleDetails(registration)
      })
    })

    // Send SMS buttons
    document.querySelectorAll('.send-sms-btn').forEach((button) => {
      button.addEventListener('click', (e) => {
        const registration = e.target.closest('button').dataset.registration
        this.sendSingleSMS(registration)
      })
    })
  }

  /**
   * Show vehicle details modal
   */
  async showVehicleDetails (registration) {
    const vehicle = this.vehicles.find((v) => v.registration === registration)
    if (!vehicle) return

    const content = document.getElementById('vehicleDetailsContent')
    const statusInfo = this.getVehicleStatus(vehicle)

    content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h4 class="font-medium text-gray-900">Vehicle Information</h4>
                    <div class="space-y-2">
                        <div><strong>Registration:</strong> ${vehicle.registration}</div>
                        <div><strong>Make:</strong> ${vehicle.make || 'Unknown'}</div>
                        <div><strong>Model:</strong> ${vehicle.model || 'Unknown'}</div>
                        <div><strong>Status:</strong> 
                            <span class="status-badge ${statusInfo.badgeClass}">
                                <i class="${statusInfo.icon} mr-1"></i>
                                ${statusInfo.text}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <h4 class="font-medium text-gray-900">Customer Information</h4>
                    <div class="space-y-2">
                        <div><strong>Name:</strong> ${vehicle.customer_name || 'Not available'}</div>
                        <div><strong>Mobile:</strong> ${vehicle.mobile_number || 'Not available'}</div>
                        <div><strong>Email:</strong> ${vehicle.email || 'Not available'}</div>
                    </div>
                </div>
                <div class="space-y-4">
                    <h4 class="font-medium text-gray-900">MOT Information</h4>
                    <div class="space-y-2">
                        <div><strong>Expiry Date:</strong> ${this.formatDate(vehicle.mot_expiry_date)}</div>
                        <div><strong>Days Until Expiry:</strong> ${this.formatDaysUntilExpiry(vehicle)}</div>
                        <div><strong>Last Updated:</strong> ${this.formatDate(vehicle.last_updated)}</div>
                    </div>
                </div>
                <div class="space-y-4">
                    <h4 class="font-medium text-gray-900">Actions</h4>
                    <div class="space-y-2">
                        ${
                          vehicle.mobile_number
                            ? `
                            <button class="btn btn-primary w-full" onclick="MOTDashboard.sendSingleSMS('${vehicle.registration}')">
                                <i class="fas fa-paper-plane mr-2"></i>
                                Send SMS Reminder
                            </button>
                        `
                            : ''
                        }
                        <button class="btn btn-secondary w-full" onclick="MOTDashboard.refreshVehicleData('${vehicle.registration}')">
                            <i class="fas fa-sync-alt mr-2"></i>
                            Refresh MOT Data
                        </button>
                    </div>
                </div>
            </div>
        `

    this.showModal('vehicleDetailsModal')
  }

  /**
   * Send single SMS
   */
  async sendSingleSMS (registration) {
    const vehicle = this.vehicles.find((v) => v.registration === registration)
    if (!vehicle || !vehicle.mobile_number) {
      this.showError('Vehicle not found or no mobile number available')
      return
    }

    try {
      const response = await fetch('/api/mot/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registration,
          mobile_number: vehicle.mobile_number,
          customer_name: vehicle.customer_name
        })
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess(`SMS sent successfully to ${vehicle.mobile_number}`)
      } else {
        this.showError(result.error || 'Failed to send SMS')
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      this.showError('Failed to send SMS')
    }
  }

  /**
   * Refresh vehicle data
   */
  async refreshVehicleData (registration) {
    try {
      const response = await fetch(
        `/api/mot/vehicles/${registration}/refresh`,
        {
          method: 'POST'
        }
      )

      const result = await response.json()

      if (result.success) {
        this.showSuccess('Vehicle data refreshed successfully')
        this.loadData() // Reload all data
        this.hideModal('vehicleDetailsModal')
      } else {
        this.showError(result.error || 'Failed to refresh vehicle data')
      }
    } catch (error) {
      console.error('Error refreshing vehicle data:', error)
      this.showError('Failed to refresh vehicle data')
    }
  }

  /**
   * Show upload modal
   */
  showUploadModal () {
    this.showModal('uploadVehiclesModal')
  }

  /**
   * Upload vehicles
   */
  async uploadVehicles () {
    const fileInput = document.getElementById('vehicleFileInput')
    const file = fileInput.files[0]

    if (!file) {
      this.showError('Please select a file to upload')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/mot/vehicles/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess(`Successfully uploaded ${result.processed} vehicles`)
        this.loadData() // Reload data
        this.hideModal('uploadVehiclesModal')
      } else {
        this.showError(result.error || 'Failed to upload vehicles')
      }
    } catch (error) {
      console.error('Error uploading vehicles:', error)
      this.showError('Failed to upload vehicles')
    }
  }

  /**
   * Export data
   */
  exportData () {
    const csvContent = this.generateCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `mot_vehicles_${new Date().toISOString().split('T')[0]}.csv`
      )
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  /**
   * Generate CSV content
   */
  generateCSV () {
    const headers = [
      'Registration',
      'Make',
      'Model',
      'Customer Name',
      'Mobile',
      'Email',
      'MOT Expiry',
      'Days Until Expiry',
      'Status'
    ]
    const rows = this.filteredVehicles.map((vehicle) => [
      vehicle.registration,
      vehicle.make || '',
      vehicle.model || '',
      vehicle.customer_name || '',
      vehicle.mobile_number || '',
      vehicle.email || '',
      this.formatDate(vehicle.mot_expiry_date),
      this.formatDaysUntilExpiry(vehicle),
      this.getVehicleStatus(vehicle).text
    ])

    return [headers, ...rows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')
  }

  /**
   * Show modal
   */
  showModal (modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.add('active')
      document.body.style.overflow = 'hidden'
    }
  }

  /**
   * Hide modal
   */
  hideModal (modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.remove('active')
      document.body.style.overflow = ''
    }
  }

  /**
   * Show loading state
   */
  showLoading () {
    const tbody = document.getElementById('vehiclesTableBody')
    if (tbody) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin mr-2"></i>
                        Loading vehicles...
                    </td>
                </tr>
            `
    }
  }

  /**
   * Hide loading state
   */
  hideLoading () {
    // Loading is hidden when data is rendered
  }

  /**
   * Show success message
   */
  showSuccess (message) {
    // Use your existing notification system
    console.log('✅ Success:', message)
    // You can integrate with your existing toast/notification system here
  }

  /**
   * Show error message
   */
  showError (message) {
    // Use your existing notification system
    console.error('❌ Error:', message)
    // You can integrate with your existing toast/notification system here
  }
}

// Export for global use
window.MOTDashboard = new MOTDashboard()
