/**
 * Utility functions for the Garage Management System
 */

// Pagination utilities
function renderPagination(type, data) {
    const container = document.getElementById(`${type}-pagination`);
    if (!container) return;
    
    const { current_page, pages, total, has_prev, has_next } = data;
    
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <div class="pagination">
            <button ${!has_prev ? 'disabled' : ''} onclick="changePage('${type}', ${current_page - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    // Show page numbers
    const startPage = Math.max(1, current_page - 2);
    const endPage = Math.min(pages, current_page + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button onclick="changePage('${type}', 1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span>...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="${i === current_page ? 'active' : ''}" onclick="changePage('${type}', ${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < pages) {
        if (endPage < pages - 1) {
            paginationHTML += `<span>...</span>`;
        }
        paginationHTML += `<button onclick="changePage('${type}', ${pages})">${pages}</button>`;
    }
    
    paginationHTML += `
            <button ${!has_next ? 'disabled' : ''} onclick="changePage('${type}', ${current_page + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${((current_page - 1) * 20) + 1} to ${Math.min(current_page * 20, total)} of ${total} entries
        </div>
    `;
    
    container.innerHTML = paginationHTML;
}

function changePage(type, page) {
    const searchInput = document.getElementById(`${type}-search`);
    const search = searchInput ? searchInput.value : '';
    
    switch (type) {
        case 'customers':
            loadCustomers(page, search);
            break;
        case 'vehicles':
            loadVehicles(page, search);
            break;
        case 'jobs':
            loadJobs(page, search);
            break;
        case 'estimates':
            loadEstimates(page, search);
            break;
        case 'invoices':
            loadInvoices(page, search);
            break;
    }
}

// Search functionality
function initializeSearch() {
    // Customer search
    const customerSearch = document.getElementById('customers-search');
    if (customerSearch) {
        customerSearch.addEventListener('input', debounce(function() {
            loadCustomers(1, this.value);
        }, 300));
    }
    
    // Vehicle search
    const vehicleSearch = document.getElementById('vehicles-search');
    if (vehicleSearch) {
        vehicleSearch.addEventListener('input', debounce(function() {
            loadVehicles(1, this.value);
        }, 300));
    }
}

// Form validation utilities
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Email validation
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        }
    });
    
    // Phone validation
    const phoneFields = form.querySelectorAll('input[type="tel"]');
    phoneFields.forEach(field => {
        if (field.value && !isValidPhone(field.value)) {
            showFieldError(field, 'Please enter a valid phone number');
            isValid = false;
        }
    });
    
    return isValid;
}

function showFieldError(field, message) {
    field.classList.add('is-invalid');
    
    let feedback = field.parentNode.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        field.parentNode.appendChild(feedback);
    }
    feedback.textContent = message;
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.remove();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

// Data export utilities
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Local storage utilities
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

// URL utilities
function updateURL(page, params = {}) {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    
    window.history.pushState({}, '', url);
}

function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    
    for (const [key, value] of params) {
        result[key] = value;
    }
    
    return result;
}

// Initialize URL handling
function initializeURLHandling() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        const params = getURLParams();
        const page = params.page || 'dashboard';
        showPage(page);
    });
    
    // Set initial page from URL
    const params = getURLParams();
    if (params.page) {
        showPage(params.page);
    }
}

// Confirmation dialogs
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

function confirmDelete(itemType, itemName, callback) {
    const message = `Are you sure you want to delete this ${itemType}${itemName ? ` (${itemName})` : ''}? This action cannot be undone.`;
    confirmAction(message, callback);
}

// Initialize utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    initializeURLHandling();
});

// Export utility functions
window.renderPagination = renderPagination;
window.changePage = changePage;
window.validateForm = validateForm;
window.exportToCSV = exportToCSV;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.updateURL = updateURL;
window.getURLParams = getURLParams;
window.confirmAction = confirmAction;
window.confirmDelete = confirmDelete;
