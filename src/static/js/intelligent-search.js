/**
 * Intelligent Search System for Garage Management
 * Provides fuzzy search, real-time suggestions, and multi-field matching
 */

class IntelligentSearch {
  constructor () {
    this.searchCache = new Map()
    this.searchTimeout = null
    this.minQueryLength = 3 // Increased to reduce API calls
    this.searchDelay = 500 // Increased delay to reduce rapid requests
    this.maxSuggestions = 5 // Reduced for better performance
    this.maxCacheSize = 50 // Limit cache size

    this.init()
  }

  init () {
    this.setupSearchInputs()
    this.createSearchStyles()
    console.log('🔍 Intelligent Search System initialized')
  }

  setupSearchInputs () {
    // Only enhance inputs that explicitly request intelligent search
    const searchInputs = document.querySelectorAll(
      '.intelligent-search, [data-intelligent-search="true"]'
    )

    searchInputs.forEach((input) => {
      this.enhanceSearchInput(input)
    })

    // Setup specific search inputs only if they exist
    this.setupCustomerSearch()
    this.setupVehicleSearch()
    this.setupJobSearch()

    console.log(`🔍 Enhanced ${searchInputs.length} search inputs`)
  }

  enhanceSearchInput (input) {
    if (input.dataset.intelligentSearch === 'true') {
      return // Already enhanced
    }

    input.dataset.intelligentSearch = 'true'

    // Create suggestion container
    const suggestionContainer = this.createSuggestionContainer(input)

    // Add event listeners
    input.addEventListener('input', (e) => {
      this.handleSearchInput(e, suggestionContainer)
    })

    input.addEventListener('focus', (e) => {
      if (e.target.value.length >= this.minQueryLength) {
        this.showSuggestions(suggestionContainer)
      }
    })

    input.addEventListener('blur', (e) => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        this.hideSuggestions(suggestionContainer)
      }, 200)
    })

    // Handle keyboard navigation
    input.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e, suggestionContainer)
    })
  }

  createSuggestionContainer (input) {
    // Check if container already exists
    let container = input.nextElementSibling
    if (
      container &&
      container.classList.contains('intelligent-search-suggestions')
    ) {
      return container
    }

    container = document.createElement('div')
    container.className = 'intelligent-search-suggestions'
    container.style.display = 'none'

    // Use CSS positioning instead of calculating positions
    container.style.position = 'absolute'
    container.style.zIndex = '1000'
    container.style.width = '100%'

    // Insert after input
    input.parentNode.style.position = 'relative'
    input.parentNode.insertBefore(container, input.nextSibling)

    return container
  }

  handleSearchInput (event, suggestionContainer) {
    const query = event.target.value.trim()
    const searchType = this.getSearchType(event.target)

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    if (query.length < this.minQueryLength) {
      this.hideSuggestions(suggestionContainer)
      return
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query, searchType, suggestionContainer, event.target)
    }, this.searchDelay)
  }

  getSearchType (input) {
    // Determine search type from input context
    if (input.id.includes('customer') || input.closest('.customer-search')) {
      return 'customers'
    } else if (
      input.id.includes('vehicle') ||
      input.closest('.vehicle-search')
    ) {
      return 'vehicles'
    } else if (input.id.includes('job') || input.closest('.job-search')) {
      return 'jobs'
    }
    return 'unified'
  }

  async performSearch (query, searchType, suggestionContainer, inputElement) {
    try {
      // Check cache first
      const cacheKey = `${searchType}:${query}`
      if (this.searchCache.has(cacheKey)) {
        const cachedResults = this.searchCache.get(cacheKey)
        this.displaySuggestions(
          cachedResults,
          suggestionContainer,
          inputElement
        )
        return
      }

      // Manage cache size
      if (this.searchCache.size >= this.maxCacheSize) {
        const firstKey = this.searchCache.keys().next().value
        this.searchCache.delete(firstKey)
      }

      // Show loading state
      this.showLoadingSuggestions(suggestionContainer)

      let endpoint
      if (searchType === 'unified') {
        endpoint = `/api/search/unified?q=${encodeURIComponent(query)}&limit=5`
      } else {
        endpoint = `/api/search/${searchType}?q=${encodeURIComponent(query)}&limit=${this.maxSuggestions}`
      }

      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.success) {
        // Cache results
        this.searchCache.set(cacheKey, data)

        // Display suggestions
        this.displaySuggestions(data, suggestionContainer, inputElement)
      } else {
        this.showErrorSuggestions(suggestionContainer, data.error)
      }
    } catch (error) {
      console.error('Search error:', error)
      this.showErrorSuggestions(suggestionContainer, 'Search failed')
    }
  }

  displaySuggestions (data, container, inputElement) {
    container.innerHTML = ''

    let suggestions = []

    if (data.results) {
      // Unified search results
      if (data.results.customers) {
        suggestions = suggestions.concat(
          data.results.customers.slice(0, 3).map((item) => ({
            ...item,
            type: 'customer',
            display: item.name,
            secondary: item.mobile || item.account_number
          }))
        )
      }
      if (data.results.vehicles) {
        suggestions = suggestions.concat(
          data.results.vehicles.slice(0, 3).map((item) => ({
            ...item,
            type: 'vehicle',
            display: item.registration,
            secondary: `${item.make} ${item.model}`.trim()
          }))
        )
      }
      if (data.results.jobs) {
        suggestions = suggestions.concat(
          data.results.jobs.slice(0, 2).map((item) => ({
            ...item,
            type: 'job',
            display: `Job #${item.job_number}`,
            secondary: item.customer_name
          }))
        )
      }
    } else {
      // Single entity type results
      suggestions = data.results || []
      suggestions.forEach((item) => {
        if (item.name) {
          item.type = 'customer'
          item.display = item.name
          item.secondary = item.mobile || item.account_number
        } else if (item.registration) {
          item.type = 'vehicle'
          item.display = item.registration
          item.secondary = `${item.make} ${item.model}`.trim()
        } else if (item.job_number) {
          item.type = 'job'
          item.display = `Job #${item.job_number}`
          item.secondary = item.customer_name
        }
      })
    }

    if (suggestions.length === 0) {
      this.showNoResultsSuggestions(container)
      return
    }

    suggestions.slice(0, this.maxSuggestions).forEach((suggestion, index) => {
      const suggestionElement = this.createSuggestionElement(suggestion, index)
      suggestionElement.addEventListener('click', () => {
        this.selectSuggestion(suggestion, inputElement, container)
      })
      container.appendChild(suggestionElement)
    })

    this.showSuggestions(container)
  }

  createSuggestionElement (suggestion, index) {
    const element = document.createElement('div')
    element.className = 'search-suggestion-item'
    element.dataset.index = index

    const typeIcon = this.getTypeIcon(suggestion.type)
    const scoreDisplay = suggestion.search_score
      ? `<span class="suggestion-score">${Math.round(suggestion.search_score * 100)}%</span>`
      : ''

    element.innerHTML = `
            <div class="suggestion-content">
                <div class="suggestion-main">
                    <i class="${typeIcon}"></i>
                    <span class="suggestion-text">${suggestion.display}</span>
                    ${scoreDisplay}
                </div>
                ${suggestion.secondary ? `<div class="suggestion-secondary">${suggestion.secondary}</div>` : ''}
            </div>
        `

    return element
  }

  getTypeIcon (type) {
    const icons = {
      customer: 'fas fa-user',
      vehicle: 'fas fa-car',
      job: 'fas fa-wrench'
    }
    return icons[type] || 'fas fa-search'
  }

  selectSuggestion (suggestion, inputElement, container) {
    // Set input value
    inputElement.value = suggestion.display

    // Hide suggestions
    this.hideSuggestions(container)

    // Trigger custom event
    const event = new CustomEvent('suggestionSelected', {
      detail: {
        suggestion,
        inputElement
      }
    })
    inputElement.dispatchEvent(event)

    // Auto-fill related fields if possible
    this.autoFillRelatedFields(suggestion, inputElement)
  }

  autoFillRelatedFields (suggestion, inputElement) {
    const form =
      inputElement.closest('form') || inputElement.closest('.form-container')
    if (!form) return

    // Auto-fill based on suggestion type
    if (suggestion.type === 'customer') {
      this.fillCustomerFields(suggestion, form)
    } else if (suggestion.type === 'vehicle') {
      this.fillVehicleFields(suggestion, form)
    }
  }

  fillCustomerFields (customer, form) {
    const fields = {
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile || customer.phone,
      customer_email: customer.email,
      account_number: customer.account_number
    }

    Object.entries(fields).forEach(([fieldName, value]) => {
      if (value) {
        const field = form.querySelector(
          `[name="${fieldName}"], #${fieldName}`
        )
        if (field && !field.value) {
          field.value = value
        }
      }
    })
  }

  fillVehicleFields (vehicle, form) {
    const fields = {
      vehicle_id: vehicle.id,
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      customer_id: vehicle.customer_id,
      customer_name: vehicle.customer_name
    }

    Object.entries(fields).forEach(([fieldName, value]) => {
      if (value) {
        const field = form.querySelector(
          `[name="${fieldName}"], #${fieldName}`
        )
        if (field && !field.value) {
          field.value = value
        }
      }
    })
  }

  handleKeyboardNavigation (event, container) {
    const suggestions = container.querySelectorAll('.search-suggestion-item')
    if (suggestions.length === 0) return

    const currentActive = container.querySelector(
      '.search-suggestion-item.active'
    )
    let newActiveIndex = -1

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (currentActive) {
          newActiveIndex = parseInt(currentActive.dataset.index) + 1
        } else {
          newActiveIndex = 0
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        if (currentActive) {
          newActiveIndex = parseInt(currentActive.dataset.index) - 1
        } else {
          newActiveIndex = suggestions.length - 1
        }
        break

      case 'Enter':
        event.preventDefault()
        if (currentActive) {
          currentActive.click()
        }
        return

      case 'Escape':
        this.hideSuggestions(container)
        return
    }

    // Update active suggestion
    if (newActiveIndex >= 0 && newActiveIndex < suggestions.length) {
      suggestions.forEach((s) => s.classList.remove('active'))
      suggestions[newActiveIndex].classList.add('active')
    }
  }

  showSuggestions (container) {
    container.style.display = 'block'
  }

  hideSuggestions (container) {
    container.style.display = 'none'
  }

  showLoadingSuggestions (container) {
    container.innerHTML = `
            <div class="search-suggestion-item loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Searching...</span>
            </div>
        `
    this.showSuggestions(container)
  }

  showNoResultsSuggestions (container) {
    container.innerHTML = `
            <div class="search-suggestion-item no-results">
                <i class="fas fa-search"></i>
                <span>No results found</span>
            </div>
        `
    this.showSuggestions(container)
  }

  showErrorSuggestions (container, error) {
    container.innerHTML = `
            <div class="search-suggestion-item error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Search error: ${error}</span>
            </div>
        `
    this.showSuggestions(container)
  }

  setupCustomerSearch () {
    // Enhanced customer search functionality
    const customerSearchInputs = document.querySelectorAll(
      '#customer-search, .customer-search-input'
    )

    customerSearchInputs.forEach((input) => {
      input.addEventListener('suggestionSelected', (event) => {
        const customer = event.detail.suggestion
        if (customer.type === 'customer') {
          // Trigger customer selection event
          window.dispatchEvent(
            new CustomEvent('customerSelected', {
              detail: customer
            })
          )
        }
      })
    })
  }

  setupVehicleSearch () {
    // Enhanced vehicle search functionality
    const vehicleSearchInputs = document.querySelectorAll(
      '#vehicle-search, .vehicle-search-input'
    )

    vehicleSearchInputs.forEach((input) => {
      input.addEventListener('suggestionSelected', (event) => {
        const vehicle = event.detail.suggestion
        if (vehicle.type === 'vehicle') {
          // Trigger vehicle selection event
          window.dispatchEvent(
            new CustomEvent('vehicleSelected', {
              detail: vehicle
            })
          )
        }
      })
    })
  }

  setupJobSearch () {
    // Enhanced job search functionality
    const jobSearchInputs = document.querySelectorAll(
      '#job-search, .job-search-input'
    )

    jobSearchInputs.forEach((input) => {
      input.addEventListener('suggestionSelected', (event) => {
        const job = event.detail.suggestion
        if (job.type === 'job') {
          // Trigger job selection event
          window.dispatchEvent(
            new CustomEvent('jobSelected', {
              detail: job
            })
          )
        }
      })
    })
  }

  createSearchStyles () {
    // Add CSS styles for search suggestions
    const styleId = 'intelligent-search-styles'
    if (document.getElementById(styleId)) {
      return // Already added
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
            .intelligent-search-suggestions {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                transform: translateZ(0); /* Hardware acceleration */
                will-change: transform, opacity; /* Optimize for animations */
            }

            .search-suggestion-item {
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f1f5f9;
                transition: background-color 0.15s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                transform: translateZ(0); /* Hardware acceleration */
            }

            .search-suggestion-item:last-child {
                border-bottom: none;
            }

            .search-suggestion-item:hover,
            .search-suggestion-item.active {
                background-color: #f8fafc;
            }

            .search-suggestion-item.loading,
            .search-suggestion-item.no-results,
            .search-suggestion-item.error {
                cursor: default;
                color: #64748b;
                font-style: italic;
            }

            .search-suggestion-item.error {
                color: #ef4444;
            }

            .suggestion-content {
                flex: 1;
                min-width: 0;
            }

            .suggestion-main {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
                color: #1e293b;
            }

            .suggestion-text {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .suggestion-secondary {
                font-size: 0.875rem;
                color: #64748b;
                margin-top: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .suggestion-score {
                font-size: 0.75rem;
                background: #e2e8f0;
                color: #475569;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
            }

            .search-suggestion-item i {
                width: 16px;
                text-align: center;
                color: #6366f1;
            }

            .search-suggestion-item.loading i {
                color: #3b82f6;
            }

            .search-suggestion-item.error i {
                color: #ef4444;
            }

            .search-suggestion-item.no-results i {
                color: #9ca3af;
            }
        `

    document.head.appendChild(style)
  }

  // Public API methods
  clearCache () {
    this.searchCache.clear()
  }

  setSearchDelay (delay) {
    this.searchDelay = delay
  }

  setMaxSuggestions (max) {
    this.maxSuggestions = max
  }
}

// Initialize intelligent search when DOM is ready (non-blocking)
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if there are elements that need intelligent search
  const needsIntelligentSearch =
    document.querySelectorAll(
      '.intelligent-search, [data-intelligent-search="true"]'
    ).length > 0

  if (needsIntelligentSearch) {
    // Use setTimeout to make initialization non-blocking
    setTimeout(() => {
      try {
        window.intelligentSearch = new IntelligentSearch()
      } catch (error) {
        console.warn('Intelligent search initialization failed:', error)
      }
    }, 100)
  } else {
    console.log(
      '🔍 No intelligent search inputs found, skipping initialization'
    )
  }
})

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntelligentSearch
}
