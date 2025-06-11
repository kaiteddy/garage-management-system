/**
 * Customer management component
 */

// Customer modal functions
function showAddCustomerModal() {
    document.getElementById('customer-form').reset();
    document.getElementById('customer-modal-title').textContent = 'Add New Customer';
    document.getElementById('customer-id').value = '';
    clearFormErrors('customer-form');
    showModal('customer-modal');
}

function showEditCustomerModal(customerId) {
    const customer = App.data.customers.find(c => c.id === customerId);
    if (!customer) {
        alert('Customer not found');
        return;
    }
    
    document.getElementById('customer-modal-title').textContent = 'Edit Customer';
    document.getElementById('customer-id').value = customer.id;
    document.getElementById('customer-name').value = customer.name || '';
    document.getElementById('customer-company').value = customer.company || '';
    document.getElementById('customer-address').value = customer.address || '';
    document.getElementById('customer-postcode').value = customer.postcode || '';
    document.getElementById('customer-phone').value = customer.phone || '';
    document.getElementById('customer-mobile').value = customer.mobile || '';
    document.getElementById('customer-email').value = customer.email || '';
    
    clearFormErrors('customer-form');
    showModal('customer-modal');
}

async function saveCustomer() {
    if (!validateForm('customer-form')) {
        return;
    }
    
    const formData = new FormData(document.getElementById('customer-form'));
    const customerData = {
        name: formData.get('name'),
        company: formData.get('company'),
        address: formData.get('address'),
        postcode: formData.get('postcode'),
        phone: formData.get('phone'),
        mobile: formData.get('mobile'),
        email: formData.get('email')
    };
    
    const customerId = document.getElementById('customer-id').value;
    
    try {
        let response;
        if (customerId) {
            // Update existing customer
            response = await API.customers.update(customerId, customerData);
        } else {
            // Create new customer
            response = await API.customers.create(customerData);
        }
        
        if (response.status === 'success') {
            closeModal();
            showSuccess(customerId ? 'Customer updated successfully' : 'Customer created successfully');
            loadCustomers(); // Reload the customer list
        } else {
            throw new Error(response.message || 'Failed to save customer');
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer: ' + error.message);
    }
}

async function viewCustomer(customerId) {
    try {
        showLoading('customer-detail-content');
        showModal('customer-detail-modal');
        
        const response = await API.customers.getById(customerId);
        if (response.status === 'success') {
            renderCustomerDetail(response.data);
        } else {
            throw new Error(response.message || 'Failed to load customer details');
        }
    } catch (error) {
        console.error('Error loading customer details:', error);
        showError('customer-detail-content', 'Failed to load customer details');
    }
}

function renderCustomerDetail(customer) {
    const container = document.getElementById('customer-detail-content');
    if (!container) return;
    
    const html = `
        <div class="customer-detail">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>Customer Information</h5>
                    <table class="table table-borderless">
                        <tr>
                            <td><strong>Account Number:</strong></td>
                            <td>${customer.account_number || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Name:</strong></td>
                            <td>${customer.name || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Company:</strong></td>
                            <td>${customer.company || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Address:</strong></td>
                            <td>${customer.address || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Postcode:</strong></td>
                            <td>${customer.postcode || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Phone:</strong></td>
                            <td>${customer.phone || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Mobile:</strong></td>
                            <td>${customer.mobile || '-'}</td>
                        </tr>
                        <tr>
                            <td><strong>Email:</strong></td>
                            <td>${customer.email || '-'}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>Statistics</h5>
                    <div class="stats-summary">
                        <div class="stat-item">
                            <span class="stat-number">${customer.vehicles ? customer.vehicles.length : 0}</span>
                            <span class="stat-label">Vehicles</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${customer.jobs ? customer.jobs.length : 0}</span>
                            <span class="stat-label">Jobs</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${customer.invoices ? customer.invoices.length : 0}</span>
                            <span class="stat-label">Invoices</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${customer.vehicles && customer.vehicles.length > 0 ? `
                <div class="mb-4">
                    <h5>Vehicles</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Registration</th>
                                    <th>Make/Model</th>
                                    <th>MOT Due</th>
                                    <th>Tax Due</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customer.vehicles.map(vehicle => `
                                    <tr>
                                        <td><strong>${vehicle.registration}</strong></td>
                                        <td>${vehicle.display_name || '-'}</td>
                                        <td>
                                            <span class="status-badge status-${vehicle.mot_status || 'unknown'}">
                                                ${formatDate(vehicle.mot_expiry) || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="status-badge status-${vehicle.tax_status || 'unknown'}">
                                                ${formatDate(vehicle.tax_due) || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
            
            ${customer.jobs && customer.jobs.length > 0 ? `
                <div class="mb-4">
                    <h5>Recent Jobs</h5>
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
                                ${customer.jobs.slice(0, 5).map(job => `
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
        </div>
    `;
    
    container.innerHTML = html;
}

function editCustomer(customerId) {
    showEditCustomerModal(customerId);
}

async function deleteCustomer(customerId) {
    const customer = App.data.customers.find(c => c.id === customerId);
    const customerName = customer ? customer.name : 'customer';
    
    confirmDelete('customer', customerName, async () => {
        try {
            const response = await API.customers.delete(customerId);
            if (response.status === 'success') {
                showSuccess('Customer deleted successfully');
                loadCustomers(); // Reload the customer list
            } else {
                throw new Error(response.message || 'Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Error deleting customer: ' + error.message);
        }
    });
}

function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const invalidFields = form.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
    
    const feedbacks = form.querySelectorAll('.invalid-feedback');
    feedbacks.forEach(feedback => {
        feedback.remove();
    });
}

// Export customer functions
window.showAddCustomerModal = showAddCustomerModal;
window.showEditCustomerModal = showEditCustomerModal;
window.saveCustomer = saveCustomer;
window.viewCustomer = viewCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
