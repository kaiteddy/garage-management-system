/**
 * Main JavaScript file for the Garage Management System
 */

// Global application state
const App = {
    currentPage: 'dashboard',
    data: {
        customers: [],
        vehicles: [],
        jobs: [],
        estimates: [],
        invoices: [],
        stats: {}
    },
    pagination: {
        customers: { page: 1, total: 0 },
        vehicles: { page: 1, total: 0 },
        jobs: { page: 1, total: 0 },
        estimates: { page: 1, total: 0 },
        invoices: { page: 1, total: 0 }
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing Garage Management System...');
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize modals
    initializeModals();
    
    // Load initial data
    loadDashboardData();
    
    // Show dashboard by default
    showPage('dashboard');
    
    console.log('Application initialized successfully');
}

function initializeNavigation() {
    // Add click handlers to navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });
    
    // Mobile menu toggle (if needed)
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('active');
        });
    }
}

function initializeModals() {
    // Close modal when clicking outside or on close button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function showPage(pageId) {
    console.log(`Showing page: ${pageId}`);
    
    // Update current page
    App.currentPage = pageId;
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation
    updateNavigation(pageId);
    
    // Load page data
    loadPageData(pageId);
    
    // Update page title
    updatePageTitle(pageId);
}

function updateNavigation(activePageId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === activePageId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function loadPageData(pageId) {
    switch (pageId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'vehicles':
            loadVehicles();
            break;
        case 'jobs':
            loadJobs();
            break;
        case 'estimates':
            loadEstimates();
            break;
        case 'invoices':
            loadInvoices();
            break;
        default:
            console.warn(`Unknown page: ${pageId}`);
    }
}

function updatePageTitle(pageId) {
    const titles = {
        dashboard: 'Dashboard',
        customers: 'Customers',
        vehicles: 'Vehicles',
        jobs: 'Jobs',
        estimates: 'Estimates',
        invoices: 'Invoices'
    };
    
    const title = titles[pageId] || 'Garage Management System';
    document.title = `${title} - GarageManager Pro`;
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
        activeModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Utility functions
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Loading...
            </div>
        `;
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
    }
}

function showSuccess(message) {
    // Create and show success notification
    const notification = document.createElement('div');
    notification.className = 'success-message';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    
    // Add to page
    const container = document.querySelector('.page.active .page-header');
    if (container) {
        container.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

function formatDate(dateString) {
    if (!dateString || dateString === '-') return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format(amount);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for use in other modules
window.App = App;
window.showPage = showPage;
window.showModal = showModal;
window.closeModal = closeModal;
window.showLoading = showLoading;
window.showError = showError;
window.showSuccess = showSuccess;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.debounce = debounce;
