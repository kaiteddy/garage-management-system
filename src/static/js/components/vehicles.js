/**
 * Vehicle management component
 */

// Vehicle modal functions
function showAddVehicleModal() {
    document.getElementById('vehicle-form').reset();
    document.getElementById('vehicle-modal-title').textContent = 'Add New Vehicle';
    document.getElementById('vehicle-id').value = '';
    clearFormErrors('vehicle-form');
    loadCustomerOptions();
    showModal('vehicle-modal');
}

function showEditVehicleModal(vehicleId) {
    const vehicle = App.data.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        alert('Vehicle not found');
        return;
    }
    
    document.getElementById('vehicle-modal-title').textContent = 'Edit Vehicle';
    document.getElementById('vehicle-id').value = vehicle.id;
    document.getElementById('vehicle-registration').value = vehicle.registration || '';
    document.getElementById('vehicle-make').value = vehicle.make || '';
    document.getElementById('vehicle-model').value = vehicle.model || '';
    document.getElementById('vehicle-year').value = vehicle.year || '';
    document.getElementById('vehicle-color').value = vehicle.color || '';
    document.getElementById('vehicle-fuel-type').value = vehicle.fuel_type || '';
    document.getElementById('vehicle-customer').value = vehicle.customer_id || '';
    
    clearFormErrors('vehicle-form');
    loadCustomerOptions();
    showModal('vehicle-modal');
}

async function loadCustomerOptions() {
    try {
        const response = await API.customers.getAll({ per_page: 1000 }); // Get all customers
        if (response.status === 'success') {
            const select = document.getElementById('vehicle-customer');
            if (select) {
                select.innerHTML = '<option value="">Select Customer (Optional)</option>';
                response.data.customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = `${customer.name}${customer.company ? ` (${customer.company})` : ''}`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function saveVehicle() {
    if (!validateForm('vehicle-form')) {
        return;
    }
    
    const formData = new FormData(document.getElementById('vehicle-form'));
    const vehicleData = {
        registration: formData.get('registration'),
        make: formData.get('make'),
        model: formData.get('model'),
        year: formData.get('year') ? parseInt(formData.get('year')) : null,
        color: formData.get('color'),
        fuel_type: formData.get('fuel_type'),
        customer_id: formData.get('customer_id') || null
    };
    
    const vehicleId = document.getElementById('vehicle-id').value;
    
    try {
        let response;
        if (vehicleId) {
            // Update existing vehicle
            response = await API.vehicles.update(vehicleId, vehicleData);
        } else {
            // Create new vehicle
            response = await API.vehicles.create(vehicleData);
        }
        
        if (response.status === 'success') {
            closeModal();
            showSuccess(vehicleId ? 'Vehicle updated successfully' : 'Vehicle created successfully');
            loadVehicles(); // Reload the vehicle list
        } else {
            throw new Error(response.message || 'Failed to save vehicle');
        }
    } catch (error) {
        console.error('Error saving vehicle:', error);
        alert('Error saving vehicle: ' + error.message);
    }
}

async function viewVehicle(vehicleId) {
    try {
        showLoading('vehicle-detail-content');
        showModal('vehicle-detail-modal');
        
        const response = await API.vehicles.getById(vehicleId);
        if (response.status === 'success') {
            renderVehicleDetail(response.data);
        } else {
            throw new Error(response.message || 'Failed to load vehicle details');
        }
    } catch (error) {
        console.error('Error loading vehicle details:', error);
        showError('vehicle-detail-content', 'Failed to load vehicle details');
    }
}

function renderVehicleDetail(vehicle) {
    const container = document.getElementById('vehicle-detail-content');
    if (!container) return;
    
    const html = `
        <div class="vehicle-detail">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>Vehicle Information</h5>
                    <table class="table table-borderless">
                        <tr>
                            <td><strong>Registration:</strong></td>
                            <td><span class="badge badge-primary">${vehicle.registration}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Make:</strong></td>
                            <td>${vehicle.make || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Model:</strong></td>
                            <td>${vehicle.model || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Year:</strong></td>
                            <td>${vehicle.year || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Color:</strong></td>
                            <td>${vehicle.color || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Fuel Type:</strong></td>
                            <td>${vehicle.fuel_type || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Customer:</strong></td>
                            <td>${vehicle.customer_name || 'Not assigned'}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>MOT & Tax Status</h5>
                    <div class="status-cards">
                        <div class="status-card">
                            <div class="status-icon ${vehicle.mot_status}">
                                <i class="fas fa-certificate"></i>
                            </div>
                            <div class="status-info">
                                <h6>MOT Status</h6>
                                <p class="status-badge status-${vehicle.mot_status}">
                                    ${vehicle.mot_due || 'Unknown'}
                                </p>
                            </div>
                        </div>
                        <div class="status-card">
                            <div class="status-icon ${vehicle.tax_status}">
                                <i class="fas fa-pound-sign"></i>
                            </div>
                            <div class="status-info">
                                <h6>Tax Status</h6>
                                <p class="status-badge status-${vehicle.tax_status}">
                                    ${vehicle.tax_due || 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-info btn-sm" onclick="refreshDVLAData(${vehicle.id})">
                            <i class="fas fa-sync"></i> Refresh DVLA Data
                        </button>
                    </div>
                </div>
            </div>
            
            ${vehicle.jobs && vehicle.jobs.length > 0 ? `
                <div class="mb-4">
                    <h5>Service History</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Job Number</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vehicle.jobs.slice(0, 10).map(job => `
                                    <tr>
                                        <td><strong>${job.job_number}</strong></td>
                                        <td>${job.description || '-'}</td>
                                        <td>
                                            <span class="status-badge status-${job.status}">
                                                ${job.status_display || job.status}
                                            </span>
                                        </td>
                                        <td>${formatCurrency(job.total_amount)}</td>
                                        <td>${formatDate(job.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
            
            ${vehicle.invoices && vehicle.invoices.length > 0 ? `
                <div class="mb-4">
                    <h5>Recent Invoices</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Invoice Number</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vehicle.invoices.slice(0, 5).map(invoice => `
                                    <tr>
                                        <td><strong>${invoice.invoice_number}</strong></td>
                                        <td>${formatCurrency(invoice.amount)}</td>
                                        <td>
                                            <span class="status-badge status-${invoice.status}">
                                                ${invoice.status_display || invoice.status}
                                            </span>
                                        </td>
                                        <td>${formatDate(invoice.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    container.innerHTML = html;
}

function editVehicle(vehicleId) {
    showEditVehicleModal(vehicleId);
}

async function deleteVehicle(vehicleId) {
    const vehicle = App.data.vehicles.find(v => v.id === vehicleId);
    const vehicleName = vehicle ? vehicle.registration : 'vehicle';
    
    confirmDelete('vehicle', vehicleName, async () => {
        try {
            const response = await API.vehicles.delete(vehicleId);
            if (response.status === 'success') {
                showSuccess('Vehicle deleted successfully');
                loadVehicles(); // Reload the vehicle list
            } else {
                throw new Error(response.message || 'Failed to delete vehicle');
            }
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Error deleting vehicle: ' + error.message);
        }
    });
}

async function refreshDVLAData(vehicleId) {
    try {
        const response = await API.vehicles.refreshDVLA(vehicleId);
        if (response.status === 'success') {
            showSuccess('DVLA data refreshed successfully');
            // Refresh the vehicle detail view
            viewVehicle(vehicleId);
            // Also refresh the main vehicle list if it's visible
            if (App.currentPage === 'vehicles') {
                loadVehicles();
            }
        } else {
            throw new Error(response.message || 'Failed to refresh DVLA data');
        }
    } catch (error) {
        console.error('Error refreshing DVLA data:', error);
        alert('Error refreshing DVLA data: ' + error.message);
    }
}

// Export vehicle functions
window.showAddVehicleModal = showAddVehicleModal;
window.showEditVehicleModal = showEditVehicleModal;
window.saveVehicle = saveVehicle;
window.viewVehicle = viewVehicle;
window.editVehicle = editVehicle;
window.deleteVehicle = deleteVehicle;
window.refreshDVLAData = refreshDVLAData;
