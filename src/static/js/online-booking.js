/**
 * Online Booking Widget
 * Customer-facing appointment booking system
 */

class OnlineBooking {
    constructor() {
        this.selectedDate = null;
        this.selectedTime = null;
        this.availableSlots = [];
        this.currentStep = 1;
        this.maxSteps = 4;
        this.init();
    }

    init() {
        this.createBookingHTML();
        this.setupEventListeners();
        this.setMinDate();
    }

    createBookingHTML() {
        const container = document.getElementById('online-booking-container');
        if (!container) {
            console.error('Online booking container not found');
            return;
        }

        container.innerHTML = `
            <div class="booking-widget">
                <div class="booking-header">
                    <h2>
                        <i class="fas fa-calendar-check"></i>
                        Book Your Appointment
                    </h2>
                    <p class="booking-subtitle">Quick and easy online booking for your vehicle service</p>
                    
                    <div class="booking-progress">
                        <div class="progress-steps">
                            <div class="step ${this.currentStep >= 1 ? 'active' : ''}" data-step="1">
                                <i class="fas fa-calendar"></i>
                                <span>Date & Time</span>
                            </div>
                            <div class="step ${this.currentStep >= 2 ? 'active' : ''}" data-step="2">
                                <i class="fas fa-car"></i>
                                <span>Vehicle Details</span>
                            </div>
                            <div class="step ${this.currentStep >= 3 ? 'active' : ''}" data-step="3">
                                <i class="fas fa-user"></i>
                                <span>Contact Info</span>
                            </div>
                            <div class="step ${this.currentStep >= 4 ? 'active' : ''}" data-step="4">
                                <i class="fas fa-check"></i>
                                <span>Confirmation</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="booking-content">
                    <!-- Step 1: Date & Time Selection -->
                    <div id="step-1" class="booking-step ${this.currentStep === 1 ? 'active' : ''}">
                        <h3>Select Date & Time</h3>
                        
                        <div class="date-time-selection">
                            <div class="date-selection">
                                <label for="booking-date">Choose Date:</label>
                                <input type="date" id="booking-date" onchange="booking.loadAvailableSlots()">
                            </div>
                            
                            <div class="service-selection">
                                <label for="service-type">Service Type:</label>
                                <select id="service-type" onchange="booking.loadAvailableSlots()">
                                    <option value="GENERAL">General Service</option>
                                    <option value="MOT">MOT Test</option>
                                    <option value="REPAIR">Repair Work</option>
                                    <option value="DIAGNOSTIC">Diagnostics</option>
                                    <option value="TYRE">Tyre Service</option>
                                </select>
                            </div>
                            
                            <div class="time-slots" id="time-slots">
                                <p class="select-date-message">Please select a date to see available times</p>
                            </div>
                        </div>
                        
                        <div class="step-actions">
                            <button class="btn btn-primary" onclick="booking.nextStep()" disabled id="step-1-next">
                                Next Step
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Step 2: Vehicle Details -->
                    <div id="step-2" class="booking-step ${this.currentStep === 2 ? 'active' : ''}">
                        <h3>Vehicle Information</h3>
                        
                        <div class="vehicle-form">
                            <div class="form-group">
                                <label for="vehicle-registration">Vehicle Registration *</label>
                                <input type="text" id="vehicle-registration" placeholder="e.g. AB12 CDE" 
                                       style="text-transform: uppercase" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="vehicle-make">Make</label>
                                    <input type="text" id="vehicle-make" placeholder="e.g. Ford">
                                </div>
                                
                                <div class="form-group">
                                    <label for="vehicle-model">Model</label>
                                    <input type="text" id="vehicle-model" placeholder="e.g. Focus">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="service-description">Service Description</label>
                                <textarea id="service-description" rows="3" 
                                         placeholder="Please describe what service you need or any issues with your vehicle..."></textarea>
                            </div>
                        </div>
                        
                        <div class="step-actions">
                            <button class="btn btn-secondary" onclick="booking.previousStep()">
                                <i class="fas fa-arrow-left"></i>
                                Previous
                            </button>
                            <button class="btn btn-primary" onclick="booking.nextStep()">
                                Next Step
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Step 3: Contact Information -->
                    <div id="step-3" class="booking-step ${this.currentStep === 3 ? 'active' : ''}">
                        <h3>Contact Information</h3>
                        
                        <div class="contact-form">
                            <div class="form-group">
                                <label for="customer-name">Full Name *</label>
                                <input type="text" id="customer-name" placeholder="Your full name" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="customer-phone">Phone Number *</label>
                                    <input type="tel" id="customer-phone" placeholder="07123 456789" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="customer-email">Email Address</label>
                                    <input type="email" id="customer-email" placeholder="your.email@example.com">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="special-requirements">Special Requirements</label>
                                <textarea id="special-requirements" rows="2" 
                                         placeholder="Any special requirements or accessibility needs..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="marketing-consent">
                                    <span class="checkmark"></span>
                                    I would like to receive service reminders and promotional offers
                                </label>
                            </div>
                        </div>
                        
                        <div class="step-actions">
                            <button class="btn btn-secondary" onclick="booking.previousStep()">
                                <i class="fas fa-arrow-left"></i>
                                Previous
                            </button>
                            <button class="btn btn-primary" onclick="booking.nextStep()">
                                Review Booking
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Step 4: Confirmation -->
                    <div id="step-4" class="booking-step ${this.currentStep === 4 ? 'active' : ''}">
                        <h3>Confirm Your Booking</h3>
                        
                        <div class="booking-summary" id="booking-summary">
                            <!-- Summary will be populated here -->
                        </div>
                        
                        <div class="terms-conditions">
                            <label class="checkbox-label">
                                <input type="checkbox" id="terms-consent" required>
                                <span class="checkmark"></span>
                                I agree to the <a href="#" onclick="booking.showTerms()">terms and conditions</a>
                            </label>
                        </div>
                        
                        <div class="step-actions">
                            <button class="btn btn-secondary" onclick="booking.previousStep()">
                                <i class="fas fa-arrow-left"></i>
                                Previous
                            </button>
                            <button class="btn btn-success" onclick="booking.confirmBooking()" id="confirm-booking-btn">
                                <i class="fas fa-check"></i>
                                Confirm Booking
                            </button>
                        </div>
                    </div>

                    <!-- Success Message -->
                    <div id="booking-success" class="booking-step" style="display: none;">
                        <div class="success-message">
                            <i class="fas fa-check-circle"></i>
                            <h3>Booking Confirmed!</h3>
                            <p>Your appointment has been successfully booked.</p>
                            
                            <div class="confirmation-details" id="confirmation-details">
                                <!-- Confirmation details will be populated here -->
                            </div>
                            
                            <div class="success-actions">
                                <button class="btn btn-primary" onclick="booking.newBooking()">
                                    <i class="fas fa-plus"></i>
                                    Make Another Booking
                                </button>
                                <button class="btn btn-secondary" onclick="window.print()">
                                    <i class="fas fa-print"></i>
                                    Print Confirmation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setMinDate() {
        const dateInput = document.getElementById('booking-date');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.min = tomorrow.toISOString().split('T')[0];
            
            // Set max date to 3 months from now
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 3);
            dateInput.max = maxDate.toISOString().split('T')[0];
        }
    }

    async loadAvailableSlots() {
        const date = document.getElementById('booking-date').value;
        const serviceType = document.getElementById('service-type').value;
        
        if (!date) return;

        const slotsContainer = document.getElementById('time-slots');
        slotsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading available times...</div>';

        try {
            const response = await fetch(`/api/booking/availability?date=${date}&service_type=${serviceType}`);
            const result = await response.json();

            if (result.success) {
                this.availableSlots = result.available_slots;
                this.renderTimeSlots();
            } else {
                slotsContainer.innerHTML = '<p class="error">Failed to load available times. Please try again.</p>';
            }
        } catch (error) {
            console.error('Error loading slots:', error);
            slotsContainer.innerHTML = '<p class="error">Failed to load available times. Please try again.</p>';
        }
    }

    renderTimeSlots() {
        const slotsContainer = document.getElementById('time-slots');
        
        if (this.availableSlots.length === 0) {
            slotsContainer.innerHTML = '<p class="no-slots">No available appointments for this date. Please choose another date.</p>';
            return;
        }

        slotsContainer.innerHTML = `
            <h4>Available Times:</h4>
            <div class="time-grid">
                ${this.availableSlots.map(slot => `
                    <button class="time-slot-btn" onclick="booking.selectTime('${slot.time}')" data-time="${slot.time}">
                        ${slot.time}
                        <small>${slot.duration} min</small>
                    </button>
                `).join('')}
            </div>
        `;
    }

    selectTime(time) {
        this.selectedTime = time;
        
        // Update UI
        document.querySelectorAll('.time-slot-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.querySelector(`[data-time="${time}"]`).classList.add('selected');
        document.getElementById('step-1-next').disabled = false;
    }

    nextStep() {
        if (this.currentStep < this.maxSteps) {
            // Validate current step
            if (!this.validateCurrentStep()) return;
            
            this.currentStep++;
            this.updateStepDisplay();
            
            if (this.currentStep === 4) {
                this.generateBookingSummary();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    updateStepDisplay() {
        // Update progress steps
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Update step content
        document.querySelectorAll('.booking-step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.selectedTime && document.getElementById('booking-date').value;
            case 2:
                return document.getElementById('vehicle-registration').value.trim();
            case 3:
                return document.getElementById('customer-name').value.trim() && 
                       document.getElementById('customer-phone').value.trim();
            default:
                return true;
        }
    }

    generateBookingSummary() {
        const summaryContainer = document.getElementById('booking-summary');
        const date = document.getElementById('booking-date').value;
        const serviceType = document.getElementById('service-type').value;
        
        summaryContainer.innerHTML = `
            <div class="summary-section">
                <h4><i class="fas fa-calendar"></i> Appointment Details</h4>
                <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-GB', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}</p>
                <p><strong>Time:</strong> ${this.selectedTime}</p>
                <p><strong>Service:</strong> ${serviceType.replace('_', ' ')}</p>
            </div>
            
            <div class="summary-section">
                <h4><i class="fas fa-car"></i> Vehicle Information</h4>
                <p><strong>Registration:</strong> ${document.getElementById('vehicle-registration').value}</p>
                <p><strong>Make/Model:</strong> ${document.getElementById('vehicle-make').value} ${document.getElementById('vehicle-model').value}</p>
                ${document.getElementById('service-description').value ? 
                    `<p><strong>Description:</strong> ${document.getElementById('service-description').value}</p>` : ''}
            </div>
            
            <div class="summary-section">
                <h4><i class="fas fa-user"></i> Contact Information</h4>
                <p><strong>Name:</strong> ${document.getElementById('customer-name').value}</p>
                <p><strong>Phone:</strong> ${document.getElementById('customer-phone').value}</p>
                ${document.getElementById('customer-email').value ? 
                    `<p><strong>Email:</strong> ${document.getElementById('customer-email').value}</p>` : ''}
            </div>
        `;
    }

    async confirmBooking() {
        const confirmBtn = document.getElementById('confirm-booking-btn');
        const termsConsent = document.getElementById('terms-consent').checked;
        
        if (!termsConsent) {
            alert('Please accept the terms and conditions to proceed.');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Booking...';

        try {
            const bookingData = {
                customer_name: document.getElementById('customer-name').value,
                customer_phone: document.getElementById('customer-phone').value,
                customer_email: document.getElementById('customer-email').value,
                vehicle_registration: document.getElementById('vehicle-registration').value,
                vehicle_make: document.getElementById('vehicle-make').value,
                vehicle_model: document.getElementById('vehicle-model').value,
                appointment_date: document.getElementById('booking-date').value,
                start_time: this.selectedTime,
                service_type: document.getElementById('service-type').value,
                description: document.getElementById('service-description').value,
                special_requirements: document.getElementById('special-requirements').value,
                marketing_consent: document.getElementById('marketing-consent').checked
            };

            const response = await fetch('/api/booking/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessMessage(result);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Failed to create booking. Please try again or call us directly.');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Booking';
        }
    }

    showSuccessMessage(result) {
        document.querySelectorAll('.booking-step').forEach(step => {
            step.style.display = 'none';
        });
        
        const successStep = document.getElementById('booking-success');
        successStep.style.display = 'block';
        
        const confirmationDetails = document.getElementById('confirmation-details');
        confirmationDetails.innerHTML = `
            <div class="confirmation-card">
                <h4>Confirmation Number: ${result.confirmation_number}</h4>
                <p><strong>Date:</strong> ${new Date(document.getElementById('booking-date').value).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${this.selectedTime}</p>
                <p><strong>Vehicle:</strong> ${document.getElementById('vehicle-registration').value}</p>
                <p><strong>Service:</strong> ${document.getElementById('service-type').value.replace('_', ' ')}</p>
                
                <div class="next-steps">
                    <h5>What happens next?</h5>
                    <ul>
                        <li>We'll send you a confirmation SMS/email</li>
                        <li>A reminder will be sent 24 hours before your appointment</li>
                        <li>Please arrive 10 minutes early</li>
                        <li>Bring your vehicle documents and keys</li>
                    </ul>
                </div>
                
                <div class="contact-info">
                    <p><strong>Need to change your appointment?</strong></p>
                    <p>Call us on: <strong>0208 203 6449</strong></p>
                    <p>Email: <strong>bookings@elimotors.com</strong></p>
                </div>
            </div>
        `;
    }

    newBooking() {
        // Reset the form
        this.currentStep = 1;
        this.selectedDate = null;
        this.selectedTime = null;
        this.availableSlots = [];
        
        // Show booking steps again
        document.getElementById('booking-success').style.display = 'none';
        document.querySelectorAll('.booking-step').forEach(step => {
            step.style.display = 'block';
        });
        
        // Reset form fields
        document.querySelectorAll('input, select, textarea').forEach(field => {
            field.value = '';
            field.checked = false;
        });
        
        this.updateStepDisplay();
        this.setMinDate();
    }

    showTerms() {
        alert('Terms and Conditions:\n\n1. Appointments must be cancelled at least 24 hours in advance\n2. A £20 cancellation fee applies for same-day cancellations\n3. We reserve the right to reschedule appointments due to unforeseen circumstances\n4. Payment is due upon completion of work\n5. We are not liable for items left in vehicles');
    }

    setupEventListeners() {
        // Auto-format registration input
        const regInput = document.getElementById('vehicle-registration');
        if (regInput) {
            regInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
    }
}

// Global booking instance
let booking;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('online-booking-container')) {
        booking = new OnlineBooking();
    }
});
