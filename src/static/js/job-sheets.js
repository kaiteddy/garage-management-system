/**
 * Job Sheets Management System
 * Digital job cards with templates, signatures, and quality tracking
 */

class JobSheetsManager {
  constructor () {
    console.log('🔧 JobSheetsManager constructor called')
    this.jobSheets = []
    this.templates = []
    this.currentJobSheet = null
    this.signaturePad = null
    this.init()
  }

  init () {
    console.log('🔧 JobSheetsManager init() called')
    this.loadTemplates()
    this.loadJobSheets()
    this.createJobSheetsHTML()
    this.setupEventListeners()
    console.log('✅ JobSheetsManager initialized successfully')
  }

  async loadTemplates () {
    try {
      const response = await fetch('/api/job-sheet-templates')
      const result = await response.json()

      if (result.success) {
        this.templates = result.templates
        console.log('Templates loaded:', this.templates.length)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  async loadJobSheets () {
    try {
      const response = await fetch('/api/job-sheets')
      const result = await response.json()

      if (result.success) {
        this.jobSheets = result.job_sheets
        this.renderJobSheetsList()
      }
    } catch (error) {
      console.error('Error loading job sheets:', error)
    }
  }

  createJobSheetsHTML () {
    console.log('🔧 Creating job sheets HTML...')
    const container = document.getElementById('job-sheets-container')
    if (!container) {
      console.error('❌ Job sheets container not found')
      return
    }
    console.log('✅ Job sheets container found:', container)

    container.innerHTML = `
            <div class="job-sheets-header">
                <div class="job-sheets-title">
                    <h2>
                        <i class="fas fa-clipboard-list"></i>
                        Job Sheets
                    </h2>
                    <p class="subtitle">Digital work instructions and quality tracking</p>
                </div>
                
                <div class="job-sheets-controls">
                    <div class="view-filters">
                        <select id="status-filter" onchange="jobSheets.filterJobSheets()">
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>
                        
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="job-sheet-search" placeholder="Search job sheets..." 
                                   onkeyup="jobSheets.searchJobSheets()">
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" onclick="jobSheets.showNewJobSheetModal()">
                        <i class="fas fa-plus"></i>
                        New Job Sheet
                    </button>
                </div>
            </div>

            <div class="job-sheets-content">
                <div class="job-sheets-list">
                    <div class="job-sheets-grid" id="job-sheets-grid">
                        <!-- Job sheets will be rendered here -->
                    </div>
                </div>
            </div>

            <!-- Job Sheet Detail Modal -->
            <div id="job-sheet-modal" class="modal">
                <div class="modal-content job-sheet-modal">
                    <div class="modal-header">
                        <h3 id="job-sheet-modal-title">Job Sheet Details</h3>
                        <span class="close" onclick="jobSheets.closeJobSheetModal()">&times;</span>
                    </div>
                    <div class="modal-body" id="job-sheet-modal-body">
                        <!-- Job sheet details will be loaded here -->
                    </div>
                </div>
            </div>

            <!-- New Job Sheet Modal -->
            <div id="new-job-sheet-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create New Job Sheet</h3>
                        <span class="close" onclick="jobSheets.closeNewJobSheetModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="new-job-sheet-form">
                            <div class="form-group">
                                <label for="job-select">Select Job:</label>
                                <select id="job-select" required>
                                    <option value="">Select a job...</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="template-select">Template:</label>
                                <select id="template-select" onchange="jobSheets.loadTemplate()">
                                    <option value="">Select template...</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="work-instructions">Work Instructions:</label>
                                <textarea id="work-instructions" rows="6" placeholder="Detailed work instructions..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="safety-notes">Safety Notes:</label>
                                <textarea id="safety-notes" rows="3" placeholder="Safety precautions and requirements..."></textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="parts-required">Parts Required (JSON):</label>
                                    <textarea id="parts-required" rows="3" placeholder='["Part 1", "Part 2"]'></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="tools-required">Tools Required (JSON):</label>
                                    <textarea id="tools-required" rows="3" placeholder='["Tool 1", "Tool 2"]'></textarea>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="quality-checks">Quality Checks (JSON):</label>
                                <textarea id="quality-checks" rows="3" placeholder='["Check 1", "Check 2"]'></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="jobSheets.closeNewJobSheetModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Create Job Sheet</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `

    this.loadJobsForSelect()
    this.loadTemplatesForSelect()
  }

  renderJobSheetsList () {
    const grid = document.getElementById('job-sheets-grid')
    if (!grid) return

    if (this.jobSheets.length === 0) {
      grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Job Sheets</h3>
                    <p>Create your first job sheet to get started</p>
                    <button class="btn btn-primary" onclick="jobSheets.showNewJobSheetModal()">
                        <i class="fas fa-plus"></i>
                        Create Job Sheet
                    </button>
                </div>
            `
      return
    }

    grid.innerHTML = this.jobSheets
      .map((sheet) => this.createJobSheetCardHTML(sheet))
      .join('')
  }

  createJobSheetCardHTML (sheet) {
    const statusClass = this.getStatusClass(sheet.status)
    const statusIcon = this.getStatusIcon(sheet.status)

    return `
            <div class="job-sheet-card ${statusClass}" onclick="jobSheets.showJobSheetDetails(${sheet.id})">
                <div class="job-sheet-header">
                    <div class="sheet-number">${sheet.sheet_number}</div>
                    <div class="sheet-status">
                        <i class="${statusIcon}"></i>
                        ${sheet.status}
                    </div>
                </div>

                <div class="job-sheet-content">
                    <div class="job-info">
                        <h4>${sheet.job_number || 'No Job'}</h4>
                        <p class="job-description">${sheet.job_description || 'No description'}</p>
                    </div>

                    <div class="customer-info">
                        <i class="fas fa-user"></i>
                        <span>${sheet.customer_name || 'Unknown Customer'}</span>
                    </div>

                    <div class="vehicle-info">
                        <i class="fas fa-car"></i>
                        <span>${sheet.vehicle_registration || 'No Vehicle'}</span>
                    </div>

                    <div class="template-info">
                        <i class="fas fa-file-alt"></i>
                        <span>${sheet.template_name || 'Custom Template'}</span>
                    </div>
                </div>
                
                <div class="job-sheet-footer">
                    <div class="signatures">
                        <div class="signature-status ${sheet.technician_signature ? 'signed' : ''}">
                            <i class="fas fa-user-cog"></i>
                            Tech
                        </div>
                        <div class="signature-status ${sheet.supervisor_signature ? 'signed' : ''}">
                            <i class="fas fa-user-tie"></i>
                            Supervisor
                        </div>
                        <div class="signature-status ${sheet.customer_signature ? 'signed' : ''}">
                            <i class="fas fa-user"></i>
                            Customer
                        </div>
                    </div>
                    
                    <div class="created-date">
                        ${new Date(sheet.created_date).toLocaleDateString('en-GB')}
                    </div>
                </div>
            </div>
        `
  }

  getStatusClass (status) {
    const classes = {
      DRAFT: 'status-draft',
      ACTIVE: 'status-active',
      COMPLETED: 'status-completed',
      ARCHIVED: 'status-archived'
    }
    return classes[status] || 'status-draft'
  }

  getStatusIcon (status) {
    const icons = {
      DRAFT: 'fas fa-edit',
      ACTIVE: 'fas fa-play',
      COMPLETED: 'fas fa-check',
      ARCHIVED: 'fas fa-archive'
    }
    return icons[status] || 'fas fa-file'
  }

  async loadJobsForSelect () {
    try {
      const response = await fetch('/api/jobs')
      const result = await response.json()

      if (result.success) {
        const select = document.getElementById('job-select')
        if (select) {
          select.innerHTML =
            '<option value="">Select a job...</option>' +
            result.jobs
              .map(
                (job) =>
                  `<option value="${job.id}">${job.job_number} - ${job.customer_name} (${job.vehicle_registration})</option>`
              )
              .join('')
        }
      }
    } catch (error) {
      console.error('Error loading jobs:', error)
    }
  }

  loadTemplatesForSelect () {
    const select = document.getElementById('template-select')
    if (select && this.templates.length > 0) {
      select.innerHTML =
        '<option value="">Select template...</option>' +
        this.templates
          .map(
            (template) =>
              `<option value="${template.id}">${template.name} (${template.service_type})</option>`
          )
          .join('')
    }
  }

  loadTemplate () {
    const templateId = document.getElementById('template-select').value
    if (!templateId) return

    const template = this.templates.find((t) => t.id == templateId)
    if (template) {
      document.getElementById('work-instructions').value =
        template.default_instructions || ''
      document.getElementById('safety-notes').value =
        template.default_safety_notes || ''
      document.getElementById('parts-required').value =
        template.default_parts || '[]'
      document.getElementById('tools-required').value =
        template.default_tools || '[]'
      document.getElementById('quality-checks').value =
        template.default_checks || '[]'
    }
  }

  setupEventListeners () {
    // Form submission
    const form = document.getElementById('new-job-sheet-form')
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        this.createJobSheet()
      })
    }
  }

  async createJobSheet () {
    try {
      const formData = {
        job_id: document.getElementById('job-select').value,
        template_id: document.getElementById('template-select').value || null,
        work_instructions: document.getElementById('work-instructions').value,
        safety_notes: document.getElementById('safety-notes').value,
        parts_required: document.getElementById('parts-required').value,
        tools_required: document.getElementById('tools-required').value,
        quality_checks: document.getElementById('quality-checks').value,
        status: 'DRAFT'
      }

      const response = await fetch('/api/job-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        this.showNotification('Job sheet created successfully', 'success')
        this.closeNewJobSheetModal()
        this.loadJobSheets()
      } else {
        this.showNotification(
          'Failed to create job sheet: ' + result.error,
          'error'
        )
      }
    } catch (error) {
      console.error('Error creating job sheet:', error)
      this.showNotification('Failed to create job sheet', 'error')
    }
  }

  showNewJobSheetModal () {
    if (Utils && Utils.showModal) {
      Utils.showModal('new-job-sheet-modal')
    } else {
      document.getElementById('new-job-sheet-modal').style.display = 'block'
    }
  }

  closeNewJobSheetModal () {
    if (Utils && Utils.hideModal) {
      Utils.hideModal('new-job-sheet-modal')
    } else {
      document.getElementById('new-job-sheet-modal').style.display = 'none'
    }
    document.getElementById('new-job-sheet-form').reset()
  }

  showJobSheetDetails (sheetId) {
    const sheet = this.jobSheets.find((s) => s.id === sheetId)
    if (!sheet) return

    this.currentJobSheet = sheet

    // Use full page view instead of modal for better user experience
    this.showJobSheetDetailPage(sheet)
  }

  showJobSheetDetailPage (sheet) {
    // Check if job-sheet-detail page exists, if not create it
    let detailPage = document.getElementById('job-sheet-detail')
    if (!detailPage) {
      this.createJobSheetDetailPage()
      detailPage = document.getElementById('job-sheet-detail')
    }

    // Populate the page with job sheet data
    this.populateJobSheetDetailPage(sheet)

    // Show the page using the global showPage function
    if (typeof showPage === 'function') {
      showPage('job-sheet-detail')
    } else {
      // Fallback to direct page switching
      document
        .querySelectorAll('.page')
        .forEach((page) => page.classList.remove('active'))
      detailPage.classList.add('active')
    }
  }

  createJobSheetDetailPage () {
    // Create the job sheet detail page if it doesn't exist
    const mainContent = document.querySelector('.main-content')
    if (!mainContent) return

    const detailPageHTML = `
            <div id="job-sheet-detail" class="page">
                <div class="page-header">
                    <div>
                        <button class="btn btn-secondary" onclick="showPage('job-sheets')" style="margin-right: 1rem;">
                            <i class="fas fa-arrow-left"></i>
                            Back to Job Sheets
                        </button>
                        <h1 class="page-title" id="job-sheet-detail-title">
                            <i class="fas fa-clipboard-list"></i>
                            Job Sheet Details
                        </h1>
                        <p class="page-subtitle" id="job-sheet-detail-subtitle">View and manage job sheet information</p>
                    </div>
                    <div class="page-actions" id="job-sheet-detail-actions">
                        <!-- Actions will be populated dynamically -->
                    </div>
                </div>

                <div class="card">
                    <div class="card-content" id="job-sheet-detail-content">
                        <!-- Content will be populated dynamically -->
                    </div>
                </div>
            </div>
        `

    mainContent.insertAdjacentHTML('beforeend', detailPageHTML)
  }

  populateJobSheetDetailPage (sheet) {
    // Update page title and subtitle
    const title = document.getElementById('job-sheet-detail-title')
    const subtitle = document.getElementById('job-sheet-detail-subtitle')
    const content = document.getElementById('job-sheet-detail-content')
    const actions = document.getElementById('job-sheet-detail-actions')

    if (title) {
      title.innerHTML = `
                <i class="fas fa-clipboard-list"></i>
                Job Sheet ${sheet.sheet_number}
            `
    }

    if (subtitle) {
      subtitle.textContent = `${sheet.customer_name || 'Unknown Customer'} - ${sheet.vehicle_registration || 'No Vehicle'}`
    }

    if (actions) {
      actions.innerHTML = `
                <button class="btn btn-primary" onclick="jobSheets.printJobSheet(${sheet.id})">
                    <i class="fas fa-print"></i>
                    Print
                </button>
                <button class="btn btn-secondary" onclick="jobSheets.editJobSheet(${sheet.id})">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
            `
    }

    if (content) {
      content.innerHTML = this.createJobSheetDetailHTML(sheet)
    }
  }

  createJobSheetDetailHTML (sheet) {
    return `
            <div class="job-sheet-detail">
                <div class="sheet-info-grid">
                    <div class="info-section">
                        <h4>Job Information</h4>
                        <p><strong>Job Number:</strong> ${sheet.job_number || 'N/A'}</p>
                        <p><strong>Customer:</strong> ${sheet.customer_name || 'N/A'}</p>
                        <p><strong>Vehicle:</strong> ${sheet.vehicle_registration || 'N/A'}</p>
                        <p><strong>Description:</strong> ${sheet.job_description || 'N/A'}</p>
                    </div>
                    
                    <div class="info-section">
                        <h4>Sheet Details</h4>
                        <p><strong>Status:</strong> <span class="status-badge ${this.getStatusClass(sheet.status)}">${sheet.status}</span></p>
                        <p><strong>Template:</strong> ${sheet.template_name || 'Custom'}</p>
                        <p><strong>Created:</strong> ${new Date(sheet.created_date).toLocaleDateString('en-GB')}</p>
                    </div>
                </div>
                
                <div class="work-sections">
                    <div class="work-section">
                        <h4>Work Instructions</h4>
                        <div class="work-content">${this.formatText(sheet.work_instructions)}</div>
                    </div>
                    
                    <div class="work-section">
                        <h4>Safety Notes</h4>
                        <div class="work-content safety-notes">${this.formatText(sheet.safety_notes)}</div>
                    </div>
                    
                    <div class="work-section">
                        <h4>Parts Required</h4>
                        <div class="work-content">${this.formatList(sheet.parts_required)}</div>
                    </div>
                    
                    <div class="work-section">
                        <h4>Tools Required</h4>
                        <div class="work-content">${this.formatList(sheet.tools_required)}</div>
                    </div>
                    
                    <div class="work-section">
                        <h4>Quality Checks</h4>
                        <div class="work-content">${this.formatList(sheet.quality_checks)}</div>
                    </div>
                </div>
                
                <div class="signatures-section">
                    <h4>Signatures</h4>
                    <div class="signatures-grid">
                        <div class="signature-box ${sheet.technician_signature ? 'signed' : ''}">
                            <h5>Technician</h5>
                            ${sheet.technician_signature ? '<i class="fas fa-check-circle"></i> Signed' : '<i class="fas fa-times-circle"></i> Not Signed'}
                        </div>
                        <div class="signature-box ${sheet.supervisor_signature ? 'signed' : ''}">
                            <h5>Supervisor</h5>
                            ${sheet.supervisor_signature ? '<i class="fas fa-check-circle"></i> Signed' : '<i class="fas fa-times-circle"></i> Not Signed'}
                        </div>
                        <div class="signature-box ${sheet.customer_signature ? 'signed' : ''}">
                            <h5>Customer</h5>
                            ${sheet.customer_signature ? '<i class="fas fa-check-circle"></i> Signed' : '<i class="fas fa-times-circle"></i> Not Signed'}
                        </div>
                    </div>
                </div>
                
                <div class="sheet-actions">
                    <button class="btn btn-primary" onclick="jobSheets.printJobSheet(${sheet.id})">
                        <i class="fas fa-print"></i>
                        Print Job Sheet
                    </button>
                    <button class="btn btn-secondary" onclick="jobSheets.editJobSheet(${sheet.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                </div>
            </div>
        `
  }

  formatText (text) {
    if (!text) return '<em>No content</em>'
    return text.replace(/\n/g, '<br>')
  }

  formatList (jsonString) {
    if (!jsonString) return '<em>No items</em>'
    try {
      const items = JSON.parse(jsonString)
      if (Array.isArray(items)) {
        return (
          '<ul>' + items.map((item) => `<li>${item}</li>`).join('') + '</ul>'
        )
      }
    } catch (e) {
      return jsonString
    }
    return '<em>Invalid format</em>'
  }

  closeJobSheetModal () {
    if (Utils && Utils.hideModal) {
      Utils.hideModal('job-sheet-modal')
    } else {
      document.getElementById('job-sheet-modal').style.display = 'none'
    }
  }

  filterJobSheets () {
    const status = document.getElementById('status-filter').value
    // Implement filtering logic
    console.log('Filter by status:', status)
  }

  searchJobSheets () {
    const searchTerm = document
      .getElementById('job-sheet-search')
      .value.toLowerCase()
    // Implement search logic
    console.log('Search term:', searchTerm)
  }

  printJobSheet (sheetId) {
    console.log('Print job sheet:', sheetId)
    // Implement print functionality
  }

  editJobSheet (sheetId) {
    console.log('Edit job sheet:', sheetId)
    // Implement edit functionality
  }

  showNotification (message, type = 'info') {
    // Use global notification function if available
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type)
    } else {
      console.log(`${type.toUpperCase()}: ${message}`)
    }
  }

  showNotification (message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type)
    } else {
      console.log(`${type.toUpperCase()}: ${message}`)
    }
  }

  showError (message) {
    this.showNotification(message, 'error')
  }
}

// Global job sheets instance
let jobSheets

/**
 * Quotes & Estimates Management System
 * Professional quotation builder with templates and approval workflow
 */

class QuotesManager {
  constructor () {
    this.quotes = []
    this.customers = []
    this.vehicles = []
    this.currentQuote = null
    this.init()
  }

  init () {
    this.loadQuotes()
    this.loadCustomers()
    this.loadVehicles()
    this.createQuotesHTML()
    this.setupEventListeners()
  }

  async loadQuotes () {
    try {
      const response = await fetch('/api/quotes')
      const result = await response.json()

      if (result.success) {
        this.quotes = result.quotes
        this.renderQuotesList()
      }
    } catch (error) {
      console.error('Error loading quotes:', error)
    }
  }

  async loadCustomers () {
    try {
      const response = await fetch('/api/customers')
      const result = await response.json()

      if (result.success) {
        this.customers = result.customers
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  async loadVehicles () {
    try {
      const response = await fetch('/api/vehicles')
      const result = await response.json()

      if (result.success) {
        this.vehicles = result.vehicles
      }
    } catch (error) {
      console.error('Error loading vehicles:', error)
    }
  }

  createQuotesHTML () {
    const container = document.getElementById('quotes-container')
    if (!container) {
      console.error('Quotes container not found')
      return
    }

    container.innerHTML = `
            <div class="quotes-header">
                <div class="quotes-title">
                    <h2>
                        <i class="fas fa-file-invoice-dollar"></i>
                        Quotes & Estimates
                    </h2>
                    <p class="subtitle">Professional quotation management and approval workflow</p>
                </div>

                <div class="quotes-controls">
                    <div class="view-filters">
                        <select id="quote-status-filter" onchange="quotes.filterQuotes()">
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="CONVERTED">Converted</option>
                            <option value="EXPIRED">Expired</option>
                        </select>

                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="quote-search" placeholder="Search quotes..."
                                   onkeyup="quotes.searchQuotes()">
                        </div>
                    </div>

                    <button class="btn btn-primary" onclick="quotes.showNewQuoteModal()">
                        <i class="fas fa-plus"></i>
                        New Quote
                    </button>
                </div>
            </div>

            <div class="quotes-content">
                <div class="quotes-list">
                    <div class="quotes-grid" id="quotes-grid">
                        <!-- Quotes will be rendered here -->
                    </div>
                </div>
            </div>

            <!-- Quote Detail Modal -->
            <div id="quote-detail-modal" class="modal">
                <div class="modal-content quote-modal">
                    <div class="modal-header">
                        <h3 id="quote-detail-modal-title">Quote Details</h3>
                        <span class="close" onclick="quotes.closeQuoteDetailModal()">&times;</span>
                    </div>
                    <div class="modal-body" id="quote-detail-modal-body">
                        <!-- Quote details will be loaded here -->
                    </div>
                </div>
            </div>

            <!-- New Quote Modal -->
            <div id="new-quote-modal" class="modal">
                <div class="modal-content quote-modal">
                    <div class="modal-header">
                        <h3>Create New Quote</h3>
                        <span class="close" onclick="quotes.closeNewQuoteModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="new-quote-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="quote-customer-select">Customer:</label>
                                    <select id="quote-customer-select" required onchange="quotes.loadCustomerVehicles()">
                                        <option value="">Select customer...</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="quote-vehicle-select">Vehicle:</label>
                                    <select id="quote-vehicle-select">
                                        <option value="">Select vehicle...</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="quote-description">Description:</label>
                                <textarea id="quote-description" rows="3" placeholder="Describe the work to be done..." required></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="quote-labour-cost">Labour Cost (£):</label>
                                    <input type="number" id="quote-labour-cost" step="0.01" min="0"
                                           placeholder="0.00" onchange="quotes.calculateTotal()">
                                </div>

                                <div class="form-group">
                                    <label for="quote-parts-cost">Parts Cost (£):</label>
                                    <input type="number" id="quote-parts-cost" step="0.01" min="0"
                                           placeholder="0.00" onchange="quotes.calculateTotal()">
                                </div>
                            </div>

                            <div class="quote-totals">
                                <div class="total-row">
                                    <span>Subtotal:</span>
                                    <span id="quote-subtotal">£0.00</span>
                                </div>
                                <div class="total-row">
                                    <span>VAT (20%):</span>
                                    <span id="quote-vat">£0.00</span>
                                </div>
                                <div class="total-row total-final">
                                    <span>Total:</span>
                                    <span id="quote-total">£0.00</span>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="quote-valid-until">Valid Until:</label>
                                <input type="date" id="quote-valid-until" required>
                            </div>

                            <div class="form-group">
                                <label for="quote-notes">Notes:</label>
                                <textarea id="quote-notes" rows="2" placeholder="Additional notes or comments..."></textarea>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="quotes.closeNewQuoteModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Create Quote</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `

    this.loadCustomersForSelect()
    this.setDefaultValidUntil()
  }

  renderQuotesList () {
    const grid = document.getElementById('quotes-grid')
    if (!grid) return

    if (this.quotes.length === 0) {
      grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <h3>No Quotes</h3>
                    <p>Create your first quote to get started</p>
                    <button class="btn btn-primary" onclick="quotes.showNewQuoteModal()">
                        <i class="fas fa-plus"></i>
                        Create Quote
                    </button>
                </div>
            `
      return
    }

    grid.innerHTML = this.quotes
      .map((quote) => this.createQuoteCardHTML(quote))
      .join('')
  }

  createQuoteCardHTML (quote) {
    const statusClass = this.getQuoteStatusClass(quote.status)
    const statusIcon = this.getQuoteStatusIcon(quote.status)
    const isExpired = new Date(quote.valid_until) < new Date()

    return `
            <div class="quote-card ${statusClass} ${isExpired ? 'expired' : ''}" onclick="quotes.showQuoteDetails(${quote.id})">
                <div class="quote-header">
                    <div class="quote-number">${quote.quote_number}</div>
                    <div class="quote-status">
                        <i class="${statusIcon}"></i>
                        ${quote.status}
                    </div>
                </div>

                <div class="quote-content">
                    <div class="customer-info">
                        <h4>${quote.customer_name || 'Unknown Customer'}</h4>
                        <p class="vehicle-info">
                            <i class="fas fa-car"></i>
                            ${quote.vehicle_registration || 'No Vehicle'}
                            ${quote.vehicle_make ? `(${quote.vehicle_make} ${quote.vehicle_model || ''})` : ''}
                        </p>
                    </div>

                    <div class="quote-description">
                        ${quote.description || 'No description'}
                    </div>

                    <div class="quote-amount">
                        <span class="amount-label">Total:</span>
                        <span class="amount-value">£${(quote.total_amount || 0).toFixed(2)}</span>
                    </div>
                </div>

                <div class="quote-footer">
                    <div class="quote-dates">
                        <div class="created-date">
                            <i class="fas fa-calendar-plus"></i>
                            ${new Date(quote.created_date).toLocaleDateString('en-GB')}
                        </div>
                        <div class="valid-until ${isExpired ? 'expired' : ''}">
                            <i class="fas fa-calendar-times"></i>
                            Valid until ${new Date(quote.valid_until).toLocaleDateString('en-GB')}
                        </div>
                    </div>

                    <div class="quote-actions" onclick="event.stopPropagation()">
                        ${
                          quote.status === 'APPROVED'
                            ? `
                            <button class="btn btn-sm btn-success" onclick="quotes.convertToJob(${quote.id})">
                                <i class="fas fa-arrow-right"></i>
                                Convert to Job
                            </button>
                        `
                            : ''
                        }
                        ${
                          quote.status === 'DRAFT'
                            ? `
                            <button class="btn btn-sm btn-primary" onclick="quotes.sendQuote(${quote.id})">
                                <i class="fas fa-paper-plane"></i>
                                Send
                            </button>
                        `
                            : ''
                        }
                    </div>
                </div>
            </div>
        `
  }

  getQuoteStatusClass (status) {
    const classes = {
      DRAFT: 'status-draft',
      SENT: 'status-sent',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
      CONVERTED: 'status-converted',
      EXPIRED: 'status-expired'
    }
    return classes[status] || 'status-draft'
  }

  getQuoteStatusIcon (status) {
    const icons = {
      DRAFT: 'fas fa-edit',
      SENT: 'fas fa-paper-plane',
      APPROVED: 'fas fa-check',
      REJECTED: 'fas fa-times',
      CONVERTED: 'fas fa-arrow-right',
      EXPIRED: 'fas fa-clock'
    }
    return icons[status] || 'fas fa-file'
  }

  loadCustomersForSelect () {
    const select = document.getElementById('quote-customer-select')
    if (select && this.customers.length > 0) {
      select.innerHTML =
        '<option value="">Select customer...</option>' +
        this.customers
          .map(
            (customer) =>
              `<option value="${customer.id}">${customer.name} (${customer.account_number})</option>`
          )
          .join('')
    }
  }

  loadCustomerVehicles () {
    const customerId = document.getElementById('quote-customer-select').value
    const vehicleSelect = document.getElementById('quote-vehicle-select')

    if (!customerId || !vehicleSelect) return

    const customerVehicles = this.vehicles.filter(
      (v) => v.customer_id == customerId
    )

    vehicleSelect.innerHTML =
      '<option value="">Select vehicle...</option>' +
      customerVehicles
        .map(
          (vehicle) =>
            `<option value="${vehicle.id}">${vehicle.registration} (${vehicle.make} ${vehicle.model})</option>`
        )
        .join('')
  }

  calculateTotal () {
    const labourCost =
      parseFloat(document.getElementById('quote-labour-cost').value) || 0
    const partsCost =
      parseFloat(document.getElementById('quote-parts-cost').value) || 0

    const subtotal = labourCost + partsCost
    const vat = subtotal * 0.2 // 20% VAT
    const total = subtotal + vat

    document.getElementById('quote-subtotal').textContent =
      `£${subtotal.toFixed(2)}`
    document.getElementById('quote-vat').textContent = `£${vat.toFixed(2)}`
    document.getElementById('quote-total').textContent = `£${total.toFixed(2)}`
  }

  setDefaultValidUntil () {
    const validUntilInput = document.getElementById('quote-valid-until')
    if (validUntilInput) {
      const date = new Date()
      date.setDate(date.getDate() + 30) // 30 days from now
      validUntilInput.value = date.toISOString().split('T')[0]
    }
  }

  setupEventListeners () {
    // Form submission
    const form = document.getElementById('new-quote-form')
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        this.createQuote()
      })
    }
  }

  async createQuote () {
    try {
      const formData = {
        customer_id: document.getElementById('quote-customer-select').value,
        vehicle_id:
          document.getElementById('quote-vehicle-select').value || null,
        description: document.getElementById('quote-description').value,
        labour_cost: document.getElementById('quote-labour-cost').value,
        parts_cost: document.getElementById('quote-parts-cost').value,
        valid_until: document.getElementById('quote-valid-until').value,
        notes: document.getElementById('quote-notes').value,
        status: 'DRAFT'
      }

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        this.showNotification('Quote created successfully', 'success')
        this.closeNewQuoteModal()
        this.loadQuotes()
      } else {
        this.showError('Failed to create quote: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating quote:', error)
      this.showError('Failed to create quote')
    }
  }

  async convertToJob (quoteId) {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        this.showNotification(
          `Quote converted to job ${result.job_number}`,
          'success'
        )
        this.loadQuotes()
      } else {
        this.showError('Failed to convert quote: ' + result.error)
      }
    } catch (error) {
      console.error('Error converting quote:', error)
      this.showError('Failed to convert quote')
    }
  }

  showNewQuoteModal () {
    if (Utils && Utils.showModal) {
      Utils.showModal('new-quote-modal')
    } else {
      document.getElementById('new-quote-modal').style.display = 'block'
    }
  }

  closeNewQuoteModal () {
    if (Utils && Utils.hideModal) {
      Utils.hideModal('new-quote-modal')
    } else {
      document.getElementById('new-quote-modal').style.display = 'none'
    }
    document.getElementById('new-quote-form').reset()
    this.calculateTotal()
    this.setDefaultValidUntil()
  }

  showQuoteDetails (quoteId) {
    console.log('Show quote details:', quoteId)

    const quote = this.quotes.find((q) => q.id === quoteId)
    if (!quote) {
      console.error('Quote not found:', quoteId)
      return
    }

    this.currentQuote = quote

    // Use full page view instead of modal for better user experience
    this.showQuoteDetailPage(quote)
  }

  showQuoteDetailPage (quote) {
    // Check if quote-detail page exists, if not create it
    let detailPage = document.getElementById('quote-detail')
    if (!detailPage) {
      this.createQuoteDetailPage()
      detailPage = document.getElementById('quote-detail')
    }

    // Populate the page with quote data
    this.populateQuoteDetailPage(quote)

    // Show the page using the global showPage function
    if (typeof showPage === 'function') {
      showPage('quote-detail')
    } else {
      // Fallback to direct page switching
      document
        .querySelectorAll('.page')
        .forEach((page) => page.classList.remove('active'))
      detailPage.classList.add('active')
    }
  }

  createQuoteDetailPage () {
    // Create the quote detail page if it doesn't exist
    const mainContent = document.querySelector('.main-content')
    if (!mainContent) return

    const detailPageHTML = `
            <div id="quote-detail" class="page">
                <div class="page-header">
                    <div>
                        <button class="btn btn-secondary" onclick="showPage('quotes')" style="margin-right: 1rem;">
                            <i class="fas fa-arrow-left"></i>
                            Back to Quotes
                        </button>
                        <h1 class="page-title" id="quote-detail-title">
                            <i class="fas fa-file-invoice-dollar"></i>
                            Quote Details
                        </h1>
                        <p class="page-subtitle" id="quote-detail-subtitle">View and manage quote information</p>
                    </div>
                    <div class="page-actions" id="quote-detail-actions">
                        <!-- Actions will be populated dynamically -->
                    </div>
                </div>

                <div class="card">
                    <div class="card-content" id="quote-detail-content">
                        <!-- Content will be populated dynamically -->
                    </div>
                </div>
            </div>
        `

    mainContent.insertAdjacentHTML('beforeend', detailPageHTML)
  }

  populateQuoteDetailPage (quote) {
    // Update page title and subtitle
    const title = document.getElementById('quote-detail-title')
    const subtitle = document.getElementById('quote-detail-subtitle')
    const content = document.getElementById('quote-detail-content')
    const actions = document.getElementById('quote-detail-actions')

    if (title) {
      title.innerHTML = `
                <i class="fas fa-file-invoice-dollar"></i>
                Quote ${quote.quote_number}
            `
    }

    if (subtitle) {
      subtitle.textContent = `${quote.customer_name || 'Unknown Customer'} - £${(quote.total_amount || 0).toFixed(2)}`
    }

    if (actions) {
      const statusActions = this.getQuoteStatusActions(quote)
      actions.innerHTML = statusActions
    }

    if (content) {
      content.innerHTML = this.createQuoteDetailHTML(quote)
    }
  }

  getQuoteStatusActions (quote) {
    let actions = `
            <button class="btn btn-secondary" onclick="quotes.editQuote(${quote.id})">
                <i class="fas fa-edit"></i>
                Edit
            </button>
            <button class="btn btn-primary" onclick="quotes.printQuote(${quote.id})">
                <i class="fas fa-print"></i>
                Print
            </button>
        `

    if (quote.status === 'DRAFT') {
      actions += `
                <button class="btn btn-success" onclick="quotes.sendQuote(${quote.id})">
                    <i class="fas fa-paper-plane"></i>
                    Send Quote
                </button>
            `
    }

    if (quote.status === 'APPROVED') {
      actions += `
                <button class="btn btn-warning" onclick="quotes.convertToJob(${quote.id})">
                    <i class="fas fa-arrow-right"></i>
                    Convert to Job
                </button>
            `
    }

    return actions
  }

  createQuoteDetailHTML (quote) {
    const isExpired = new Date(quote.valid_until) < new Date()
    const statusClass = this.getQuoteStatusClass(quote.status)
    const statusIcon = this.getQuoteStatusIcon(quote.status)

    return `
            <div class="quote-detail">
                <div class="quote-info-grid">
                    <div class="info-section">
                        <h4>Quote Information</h4>
                        <p><strong>Quote Number:</strong> ${quote.quote_number}</p>
                        <p><strong>Status:</strong>
                            <span class="status-badge ${statusClass}">
                                <i class="${statusIcon}"></i>
                                ${quote.status}
                            </span>
                        </p>
                        <p><strong>Created:</strong> ${new Date(quote.created_date).toLocaleDateString('en-GB')}</p>
                        <p><strong>Valid Until:</strong>
                            <span class="${isExpired ? 'text-danger' : ''}">
                                ${new Date(quote.valid_until).toLocaleDateString('en-GB')}
                                ${isExpired ? ' (EXPIRED)' : ''}
                            </span>
                        </p>
                    </div>

                    <div class="info-section">
                        <h4>Customer Information</h4>
                        <p><strong>Customer:</strong> ${quote.customer_name || 'Unknown Customer'}</p>
                        <p><strong>Vehicle:</strong> ${quote.vehicle_registration || 'No Vehicle'}</p>
                        ${quote.vehicle_make ? `<p><strong>Make/Model:</strong> ${quote.vehicle_make} ${quote.vehicle_model || ''}</p>` : ''}
                    </div>
                </div>

                <div class="info-section">
                    <h4>Work Description</h4>
                    <div class="description-content">
                        ${this.formatText(quote.description) || '<em>No description provided</em>'}
                    </div>
                </div>

                <div class="quote-breakdown">
                    <h4>Cost Breakdown</h4>
                    <div class="cost-table">
                        <div class="cost-row">
                            <span>Labour Cost:</span>
                            <span>£${(quote.labour_cost || 0).toFixed(2)}</span>
                        </div>
                        <div class="cost-row">
                            <span>Parts Cost:</span>
                            <span>£${(quote.parts_cost || 0).toFixed(2)}</span>
                        </div>
                        <div class="cost-row subtotal">
                            <span>Subtotal:</span>
                            <span>£${((quote.labour_cost || 0) + (quote.parts_cost || 0)).toFixed(2)}</span>
                        </div>
                        <div class="cost-row">
                            <span>VAT (20%):</span>
                            <span>£${(((quote.labour_cost || 0) + (quote.parts_cost || 0)) * 0.2).toFixed(2)}</span>
                        </div>
                        <div class="cost-row total">
                            <span><strong>Total:</strong></span>
                            <span><strong>£${(quote.total_amount || 0).toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>

                ${
                  quote.notes
                    ? `
                    <div class="info-section">
                        <h4>Notes</h4>
                        <div class="notes-content">
                            ${this.formatText(quote.notes)}
                        </div>
                    </div>
                `
                    : ''
                }

                <div class="quote-actions">
                    ${
                      quote.status === 'DRAFT'
                        ? `
                        <button class="btn btn-primary" onclick="quotes.sendQuote(${quote.id})">
                            <i class="fas fa-paper-plane"></i>
                            Send Quote
                        </button>
                        <button class="btn btn-secondary" onclick="quotes.editQuote(${quote.id})">
                            <i class="fas fa-edit"></i>
                            Edit Quote
                        </button>
                    `
                        : ''
                    }

                    ${
                      quote.status === 'APPROVED'
                        ? `
                        <button class="btn btn-success" onclick="quotes.convertToJob(${quote.id})">
                            <i class="fas fa-arrow-right"></i>
                            Convert to Job
                        </button>
                    `
                        : ''
                    }

                    <button class="btn btn-outline" onclick="quotes.printQuote(${quote.id})">
                        <i class="fas fa-print"></i>
                        Print Quote
                    </button>

                    <button class="btn btn-outline" onclick="quotes.duplicateQuote(${quote.id})">
                        <i class="fas fa-copy"></i>
                        Duplicate
                    </button>
                </div>
            </div>
        `
  }

  formatText (text) {
    if (!text) return ''
    return text.replace(/\n/g, '<br>')
  }

  closeQuoteDetailModal () {
    document.getElementById('quote-detail-modal').style.display = 'none'
    this.currentQuote = null
  }

  sendQuote (quoteId) {
    console.log('Send quote:', quoteId)
    // TODO: Implement send quote functionality
    this.showNotification('Send quote functionality coming soon', 'info')
  }

  editQuote (quoteId) {
    console.log('Edit quote:', quoteId)
    // TODO: Implement edit quote functionality
    this.showNotification('Edit quote functionality coming soon', 'info')
  }

  printQuote (quoteId) {
    console.log('Print quote:', quoteId)
    // TODO: Implement print quote functionality
    this.showNotification('Print quote functionality coming soon', 'info')
  }

  duplicateQuote (quoteId) {
    console.log('Duplicate quote:', quoteId)
    // TODO: Implement duplicate quote functionality
    this.showNotification('Duplicate quote functionality coming soon', 'info')
  }

  filterQuotes () {
    const status = document.getElementById('quote-status-filter').value
    console.log('Filter by status:', status)
    // Implement filtering logic
  }

  searchQuotes () {
    const searchTerm = document
      .getElementById('quote-search')
      .value.toLowerCase()
    console.log('Search term:', searchTerm)
    // Implement search logic
  }

  showNotification (message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type)
    } else {
      console.log(`${type.toUpperCase()}: ${message}`)
    }
  }

  showError (message) {
    this.showNotification(message, 'error')
  }
}

// Global instances
let quotes

// Make QuotesManager available globally
window.QuotesManager = QuotesManager

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('job-sheets-container')) {
    jobSheets = new JobSheetsManager()
  }

  if (document.getElementById('quotes-container')) {
    quotes = new QuotesManager()
    // Also make it available globally
    window.quotes = quotes
  }
})
