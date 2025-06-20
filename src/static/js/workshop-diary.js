/**
 * Workshop Diary - Calendar and Scheduling System
 * Professional garage appointment and resource management
 */

class WorkshopDiary {
  constructor () {
    this.currentDate = new Date()
    this.currentView = 'week' // day, week, month
    this.appointments = []
    this.technicians = []
    this.bays = []
    this.selectedDate = null
    this.draggedAppointment = null
    this.dragOffset = { x: 0, y: 0 }
    this.isDragging = false
    this.init()
  }

  init () {
    this.loadResources()
    this.createCalendarHTML()
    this.setupEventListeners()
    this.loadAppointments()
  }

  async loadResources () {
    try {
      // Load technicians and bays
      const [techResponse, bayResponse] = await Promise.all([
        fetch('/api/technicians'),
        fetch('/api/workshop-bays')
      ])

      const techResult = await techResponse.json()
      const bayResult = await bayResponse.json()

      // Handle technicians response
      if (techResult.success && techResult.technicians) {
        this.technicians = techResult.technicians
      } else {
        console.warn(
          '⚠️ Technicians API response format unexpected:',
          techResult
        )
        this.technicians = []
      }

      // Handle workshop bays response
      if (bayResult.success && bayResult.workshop_bays) {
        this.bays = bayResult.workshop_bays
      } else {
        console.warn(
          '⚠️ Workshop bays API response format unexpected:',
          bayResult
        )
        this.bays = []
      }

      console.log('Resources loaded:', {
        technicians: this.technicians ? this.technicians.length : 0,
        bays: this.bays ? this.bays.length : 0
      })
    } catch (error) {
      console.error('Error loading resources:', error)
      // Initialize empty arrays on error
      this.technicians = []
      this.bays = []
    }
  }

  createCalendarHTML () {
    const container = document.getElementById('workshop-diary-container')
    if (!container) {
      console.error('Workshop diary container not found')
      return
    }

    container.innerHTML = `
            <div class="diary-header">
                <div class="diary-title">
                    <h2>
                        <i class="fas fa-calendar-alt"></i>
                        Workshop Diary
                    </h2>
                    <div class="diary-date-info">
                        <span id="current-date-display">${this.formatDateDisplay()}</span>
                    </div>
                </div>
                
                <div class="diary-controls">
                    <div class="view-selector">
                        <button class="btn btn-outline-primary ${this.currentView === 'day' ? 'active' : ''}" 
                                onclick="diary.switchView('day')">Day</button>
                        <button class="btn btn-outline-primary ${this.currentView === 'week' ? 'active' : ''}" 
                                onclick="diary.switchView('week')">Week</button>
                        <button class="btn btn-outline-primary ${this.currentView === 'month' ? 'active' : ''}" 
                                onclick="diary.switchView('month')">Month</button>
                    </div>
                    
                    <div class="date-navigation">
                        <button class="btn btn-outline-primary" onclick="diary.previousPeriod()">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn btn-outline-primary" onclick="diary.goToToday()">Today</button>
                        <button class="btn btn-outline-primary" onclick="diary.nextPeriod()">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    
                    <button class="btn btn-primary" onclick="diary.showNewAppointmentModal()">
                        <i class="fas fa-plus"></i>
                        New Appointment
                    </button>
                </div>
            </div>

            <div class="diary-content">
                <div class="diary-sidebar">
                    <div class="resource-panel">
                        <h4><i class="fas fa-users"></i> Technicians</h4>
                        <div id="technicians-list" class="resource-list">
                            <!-- Technicians will be loaded here -->
                        </div>
                    </div>
                    
                    <div class="resource-panel">
                        <h4><i class="fas fa-warehouse"></i> Workshop Bays</h4>
                        <div id="bays-list" class="resource-list">
                            <!-- Bays will be loaded here -->
                        </div>
                    </div>
                </div>

                <div class="diary-main">
                    <div id="calendar-view" class="calendar-container">
                        <!-- Calendar will be generated here -->
                    </div>
                </div>
            </div>
        `

    this.renderResources()
    this.renderCalendar()
  }

  renderResources () {
    // Render technicians
    const techList = document.getElementById('technicians-list')
    if (techList && this.technicians.length > 0) {
      techList.innerHTML = this.technicians
        .map(
          (tech) => `
                <div class="resource-item technician-item" data-id="${tech.id}">
                    <div class="resource-info">
                        <div class="resource-name">${tech.name}</div>
                        <div class="resource-details">${tech.specialization || 'General'}</div>
                        <div class="resource-hours">${tech.start_time} - ${tech.end_time}</div>
                    </div>
                    <div class="resource-status available">
                        <i class="fas fa-circle"></i>
                    </div>
                </div>
            `
        )
        .join('')
    }

    // Render bays
    const baysList = document.getElementById('bays-list')
    if (baysList && this.bays.length > 0) {
      baysList.innerHTML = this.bays
        .map(
          (bay) => `
                <div class="resource-item bay-item" data-id="${bay.id}">
                    <div class="resource-info">
                        <div class="resource-name">Bay ${bay.bay_number}</div>
                        <div class="resource-details">${bay.bay_name || bay.bay_type}</div>
                    </div>
                    <div class="resource-status available">
                        <i class="fas fa-circle"></i>
                    </div>
                </div>
            `
        )
        .join('')
    }
  }

  renderCalendar () {
    const container = document.getElementById('calendar-view')
    if (!container) return

    switch (this.currentView) {
      case 'day':
        this.renderDayView(container)
        break
      case 'week':
        this.renderWeekView(container)
        break
      case 'month':
        this.renderMonthView(container)
        break
    }
  }

  renderWeekView (container) {
    const startOfWeek = this.getStartOfWeek(this.currentDate)
    const days = []

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }

    container.innerHTML = `
            <div class="week-view">
                <div class="week-header">
                    ${days
                      .map(
                        (day) => `
                        <div class="day-header ${this.isToday(day) ? 'today' : ''}">
                            <div class="day-name">${day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                            <div class="day-number">${day.getDate()}</div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
                
                <div class="week-body">
                    <div class="time-column">
                        ${this.generateTimeSlots()}
                    </div>
                    
                    ${days
                      .map(
                        (day) => `
                        <div class="day-column drop-zone"
                             data-date="${day.toISOString().split('T')[0]}"
                             ondragover="diary.handleDragOver(event)"
                             ondrop="diary.handleDrop(event)"
                             ondragenter="diary.handleDragEnter(event)"
                             ondragleave="diary.handleDragLeave(event)">
                            ${this.renderDayAppointments(day)}
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `
  }

  renderDayView (container) {
    container.innerHTML = `
            <div class="day-view">
                <div class="day-header">
                    <h3>${this.currentDate.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</h3>
                </div>
                
                <div class="day-body">
                    <div class="time-column">
                        ${this.generateTimeSlots()}
                    </div>
                    
                    <div class="day-appointments">
                        ${this.renderDayAppointments(this.currentDate)}
                    </div>
                </div>
            </div>
        `
  }

  renderMonthView (container) {
    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = this.getStartOfWeek(firstDay)

    const weeks = []
    let currentWeek = []
    const currentDate = new Date(startDate)

    while (currentDate <= lastDay || currentWeek.length < 7) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      currentWeek.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)

      if (currentDate.getMonth() > month && currentWeek.length === 7) {
        weeks.push(currentWeek)
        break
      }
    }

    container.innerHTML = `
            <div class="month-view">
                <div class="month-header">
                    <div class="weekday-headers">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                          .map(
                            (day) => `<div class="weekday-header">${day}</div>`
                          )
                          .join('')}
                    </div>
                </div>
                
                <div class="month-body">
                    ${weeks
                      .map(
                        (week) => `
                        <div class="month-week">
                            ${week
                              .map(
                                (day) => `
                                <div class="month-day ${day.getMonth() !== month ? 'other-month' : ''} ${this.isToday(day) ? 'today' : ''}"
                                     onclick="diary.selectDate('${day.toISOString().split('T')[0]}')">
                                    <div class="day-number">${day.getDate()}</div>
                                    <div class="day-appointments">
                                        ${this.renderMonthDayAppointments(day)}
                                    </div>
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `
  }

  generateTimeSlots () {
    const slots = []
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`
                <div class="time-slot">
                    <span class="time-label">${hour.toString().padStart(2, '0')}:00</span>
                </div>
            `)
    }
    return slots.join('')
  }

  renderDayAppointments (date) {
    const dateStr = date.toISOString().split('T')[0]
    const dayAppointments = this.appointments.filter(
      (apt) => apt.appointment_date === dateStr
    )

    return dayAppointments
      .map((apt) => this.createAppointmentHTML(apt))
      .join('')
  }

  renderMonthDayAppointments (date) {
    const dateStr = date.toISOString().split('T')[0]
    const dayAppointments = this.appointments.filter(
      (apt) => apt.appointment_date === dateStr
    )

    return (
      dayAppointments
        .slice(0, 3)
        .map(
          (apt) => `
            <div class="month-appointment ${apt.priority.toLowerCase()}" title="${apt.description}">
                ${apt.start_time} - ${apt.customer_name}
            </div>
        `
        )
        .join('') +
      (dayAppointments.length > 3
        ? `<div class="more-appointments">+${dayAppointments.length - 3} more</div>`
        : '')
    )
  }

  createAppointmentHTML (appointment) {
    return `
            <div class="appointment-card ${appointment.priority.toLowerCase()}"
                 data-id="${appointment.id}"
                 data-appointment='${JSON.stringify(appointment)}'
                 draggable="true"
                 onmousedown="diary.startDrag(event, ${appointment.id})"
                 ondragstart="diary.handleDragStart(event, ${appointment.id})"
                 ondragend="diary.handleDragEnd(event)"
                 onclick="diary.showAppointmentDetails(${appointment.id})">
                <div class="appointment-drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="appointment-content">
                    <div class="appointment-time">
                        ${appointment.start_time} - ${appointment.end_time}
                    </div>
                    <div class="appointment-customer">
                        ${appointment.customer_name}
                    </div>
                    <div class="appointment-vehicle">
                        ${appointment.vehicle_registration} (${appointment.service_type})
                    </div>
                    <div class="appointment-technician">
                        <i class="fas fa-user"></i> ${appointment.technician_name || 'Unassigned'}
                    </div>
                    <div class="appointment-bay">
                        <i class="fas fa-map-marker-alt"></i> ${appointment.bay_number || 'No Bay'}
                    </div>
                </div>
            </div>
        `
  }

  // Utility methods
  getStartOfWeek (date) {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day
    return new Date(start.setDate(diff))
  }

  isToday (date) {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  formatDateDisplay () {
    return this.currentDate.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Navigation methods
  switchView (view) {
    this.currentView = view
    document.querySelectorAll('.view-selector .btn').forEach((btn) => {
      btn.classList.remove('active')
    })
    event.target.classList.add('active')
    this.renderCalendar()
  }

  previousPeriod () {
    switch (this.currentView) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() - 1)
        break
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() - 7)
        break
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() - 1)
        break
    }
    this.updateDisplay()
  }

  nextPeriod () {
    switch (this.currentView) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() + 1)
        break
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() + 7)
        break
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() + 1)
        break
    }
    this.updateDisplay()
  }

  goToToday () {
    this.currentDate = new Date()
    this.updateDisplay()
  }

  updateDisplay () {
    document.getElementById('current-date-display').textContent =
      this.formatDateDisplay()
    this.renderCalendar()
    this.loadAppointments()
  }

  async loadAppointments () {
    try {
      let url = '/api/appointments'

      // Add date filtering based on current view
      if (this.currentView === 'day') {
        url += `?date=${this.currentDate.toISOString().split('T')[0]}`
      } else if (this.currentView === 'week') {
        const startOfWeek = this.getStartOfWeek(this.currentDate)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        url += `?start_date=${startOfWeek.toISOString().split('T')[0]}&end_date=${endOfWeek.toISOString().split('T')[0]}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        this.appointments = result.appointments
        this.renderCalendar()
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    }
  }

  setupEventListeners () {
    // Add global mouse move listener for smooth dragging
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.draggedAppointment) {
        this.updateDragPosition(e)
      }
    })

    // Add global mouse up listener
    document.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.endDrag(e)
      }
    })

    // Prevent default drag behavior on images and other elements
    document.addEventListener('dragstart', (e) => {
      if (!e.target.closest('.appointment-card')) {
        e.preventDefault()
      }
    })
  }

  selectDate (dateStr) {
    this.selectedDate = dateStr
    this.currentDate = new Date(dateStr)
    this.switchView('day')
  }

  showNewAppointmentModal () {
    console.log('Show new appointment modal')
    // This will be implemented with the appointment form
  }

  showAppointmentDetails (appointmentId) {
    console.log('Show appointment details:', appointmentId)
    // This will be implemented with the appointment details modal
  }

  // Enhanced Drag and Drop Methods with Error Handling
  startDrag (event, appointmentId) {
    try {
      // Prevent click event when starting drag
      if (event && event.stopPropagation) {
        event.stopPropagation()
      }

      const appointmentElement = event ? event.currentTarget : null
      if (!appointmentElement) {
        console.warn('⚠️ No appointment element found for drag')
        return
      }

      const rect = appointmentElement.getBoundingClientRect()

      this.dragOffset = {
        x: (event.clientX || 0) - rect.left,
        y: (event.clientY || 0) - rect.top
      }

      // Safe JSON parsing
      let appointmentData = {}
      try {
        appointmentData = appointmentElement.dataset.appointment
          ? JSON.parse(appointmentElement.dataset.appointment)
          : {}
      } catch (parseError) {
        console.warn('⚠️ Failed to parse appointment data:', parseError)
        appointmentData = { id: appointmentId }
      }

      this.draggedAppointment = {
        id: appointmentId,
        element: appointmentElement,
        originalParent: appointmentElement.parentNode,
        data: appointmentData
      }

      // Add visual feedback with safe style application
      if (appointmentElement.style) {
        appointmentElement.style.opacity = '0.7'
        appointmentElement.style.transform = 'scale(1.05)'
        appointmentElement.style.zIndex = '1000'
        appointmentElement.style.pointerEvents = 'none'
        appointmentElement.classList.add('dragging')
      }

      this.isDragging = true

      console.log('✅ Started dragging appointment:', appointmentId)
    } catch (error) {
      console.error('❌ Error starting drag:', error)
      this.isDragging = false
      this.draggedAppointment = null
    }
  }

  handleDragStart (event, appointmentId) {
    // Set drag data
    event.dataTransfer.setData('text/plain', appointmentId)
    event.dataTransfer.effectAllowed = 'move'

    // Create custom drag image
    const dragImage = event.target.cloneNode(true)
    dragImage.style.opacity = '0.8'
    dragImage.style.transform = 'rotate(2deg)'
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(
      dragImage,
      this.dragOffset.x,
      this.dragOffset.y
    )

    // Remove the temporary drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 0)
  }

  handleDragEnd (event) {
    if (this.draggedAppointment) {
      // Reset visual state
      this.draggedAppointment.element.style.opacity = ''
      this.draggedAppointment.element.style.transform = ''
      this.draggedAppointment.element.style.zIndex = ''
      this.draggedAppointment.element.style.pointerEvents = ''
    }

    this.isDragging = false
    this.draggedAppointment = null

    // Remove drag over effects from all drop zones
    document.querySelectorAll('.drop-zone').forEach((zone) => {
      zone.classList.remove('drag-over')
    })
  }

  updateDragPosition (event) {
    if (!this.draggedAppointment) return

    const element = this.draggedAppointment.element
    element.style.position = 'fixed'
    element.style.left = event.clientX - this.dragOffset.x + 'px'
    element.style.top = event.clientY - this.dragOffset.y + 'px'
  }

  endDrag (event) {
    if (!this.isDragging || !this.draggedAppointment) return

    // Find the drop target
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY)
    const dropZone = dropTarget?.closest('.drop-zone')

    if (dropZone) {
      const newDate = dropZone.dataset.date
      const appointmentData = this.draggedAppointment.data

      if (newDate !== appointmentData.appointment_date) {
        this.moveAppointment(appointmentData.id, newDate)
      }
    }

    // Reset the appointment position
    const element = this.draggedAppointment.element
    element.style.position = ''
    element.style.left = ''
    element.style.top = ''

    this.handleDragEnd(event)
  }

  handleDragOver (event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  handleDragEnter (event) {
    event.preventDefault()
    const dropZone = event.currentTarget
    dropZone.classList.add('drag-over')
  }

  handleDragLeave (event) {
    const dropZone = event.currentTarget
    const rect = dropZone.getBoundingClientRect()

    // Only remove drag-over if we're actually leaving the drop zone
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      dropZone.classList.remove('drag-over')
    }
  }

  handleDrop (event) {
    try {
      if (event && event.preventDefault) {
        event.preventDefault()
      }

      const dropZone = event ? event.currentTarget : null
      if (!dropZone) {
        console.warn('⚠️ No drop zone found')
        return
      }

      // Safe data transfer access
      let appointmentId = null
      try {
        appointmentId = event.dataTransfer
          ? event.dataTransfer.getData('text/plain')
          : null
      } catch (transferError) {
        console.warn('⚠️ Failed to get transfer data:', transferError)
      }

      const newDate = dropZone.dataset ? dropZone.dataset.date : null

      // Remove drag-over class safely
      if (dropZone.classList && dropZone.classList.contains('drag-over')) {
        dropZone.classList.remove('drag-over')
      }

      // Validate data before proceeding
      if (appointmentId && newDate) {
        const parsedId = parseInt(appointmentId)
        if (!isNaN(parsedId)) {
          console.log('📍 Processing drop:', parsedId, 'to', newDate)
          this.moveAppointment(parsedId, newDate)
        } else {
          console.warn('⚠️ Invalid appointment ID:', appointmentId)
        }
      } else {
        console.warn(
          '⚠️ Missing drop data - ID:',
          appointmentId,
          'Date:',
          newDate
        )
      }
    } catch (error) {
      console.error('❌ Error handling drop:', error)
    } finally {
      // Always clean up drag state
      this.cleanupDragState()
    }
  }

  cleanupDragState () {
    try {
      // Remove drag-over from all drop zones
      const dropZones = document.querySelectorAll('.drop-zone')
      dropZones.forEach((zone) => {
        if (zone.classList && zone.classList.contains('drag-over')) {
          zone.classList.remove('drag-over')
        }
      })

      // Reset drag state
      this.isDragging = false
      this.draggedAppointment = null
    } catch (error) {
      console.warn('⚠️ Error cleaning up drag state:', error)
    }
  }

  async moveAppointment (appointmentId, newDate) {
    try {
      console.log(`🔄 Moving appointment ${appointmentId} to ${newDate}`)

      // Enhanced error checking with safe access
      const appointment = this.appointments
        ? this.appointments.find((apt) => apt && apt.id === appointmentId)
        : null
      if (!appointment) {
        console.error('❌ Appointment not found:', appointmentId)
        this.showNotification('Appointment not found', 'error')
        return false
      }

      // Validate new date
      if (!newDate || newDate === appointment.appointment_date) {
        console.log('📍 No date change needed')
        return true
      }

      // Show loading state with safe DOM access
      const appointmentElement = window.safeQuerySelector
        ? window.safeQuerySelector(`[data-id="${appointmentId}"]`)
        : document.querySelector(`[data-id="${appointmentId}"]`)

      if (appointmentElement) {
        appointmentElement.style.opacity = '0.5'
        appointmentElement.style.pointerEvents = 'none'
        appointmentElement.classList.add('updating')
      }

      // Create backup for rollback
      const originalDate = appointment.appointment_date

      // Update appointment via API with timeout and retry
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...appointment,
            appointment_date: newDate
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          // Update local data
          appointment.appointment_date = newDate

          // Show success feedback
          this.showNotification('✅ Appointment moved successfully', 'success')

          // Refresh the calendar with debouncing
          if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout)
          }
          this.refreshTimeout = setTimeout(() => {
            this.renderCalendar()
          }, 500)

          return true
        } else {
          const errorText = await response.text()
          throw new Error(`Server error: ${response.status} - ${errorText}`)
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)

        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - please try again')
        }
        throw fetchError
      }
    } catch (error) {
      console.error('❌ Error moving appointment:', error)

      // Show user-friendly error message
      let errorMessage = 'Failed to move appointment'
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out - please try again'
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error - check your connection'
      }

      this.showNotification(errorMessage, 'error')

      // Restore appointment element state
      const appointmentElement = window.safeQuerySelector
        ? window.safeQuerySelector(`[data-id="${appointmentId}"]`)
        : document.querySelector(`[data-id="${appointmentId}"]`)

      if (appointmentElement) {
        appointmentElement.style.opacity = ''
        appointmentElement.style.pointerEvents = ''
        appointmentElement.classList.remove('updating')
      }

      // Refresh to restore original state with delay
      setTimeout(() => {
        if (
          this.loadAppointments &&
          typeof this.loadAppointments === 'function'
        ) {
          this.loadAppointments()
        }
      }, 1000)

      return false
    } finally {
      // Always restore element state
      const appointmentElement = window.safeQuerySelector
        ? window.safeQuerySelector(`[data-id="${appointmentId}"]`)
        : document.querySelector(`[data-id="${appointmentId}"]`)

      if (appointmentElement) {
        appointmentElement.style.opacity = ''
        appointmentElement.style.pointerEvents = ''
        appointmentElement.classList.remove('updating')
      }
    }
  }

  showNotification (message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `

    // Add to page
    document.body.appendChild(notification)

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100)

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }
}

// Global diary instance
let diary

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('workshop-diary-container')) {
    diary = new WorkshopDiary()
  }
})
