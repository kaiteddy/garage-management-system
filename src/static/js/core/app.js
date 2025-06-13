/**
 * Core Application Module
 * Manages application initialization and global state
 */

class GarageApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        this.config = {
            apiBaseUrl: '/api',
            defaultPageSize: 20,
            maxPageSize: 100
        };
        
        // Global event emitter for component communication
        this.events = new EventTarget();
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing Garage Management System...');
            
            // Initialize core components
            this.initializeEventListeners();
            this.initializeNavigation();
            this.initializeModals();
            
            // Initialize services
            if (window.ApiService) {
                window.ApiService.init(this.config.apiBaseUrl);
            }
            
            if (window.StorageService) {
                window.StorageService.init();
            }
            
            // Initialize router
            if (window.Router) {
                window.Router.init();
            }
            
            // Load initial page
            await this.loadPage('dashboard');
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
            // Emit initialization complete event
            this.emit('app:initialized');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Initialize global event listeners
     */
    initializeEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentPage();
                        break;
                }
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page, false);
            }
        });

        // Handle unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Initialize navigation
     */
    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = this.getPageFromNavItem(item);
                if (page) {
                    this.loadPage(page);
                }
            });
        });

        // Mobile menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }
    }

    /**
     * Initialize modal system
     */
    initializeModals() {
        // Close modal when clicking outside or on close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                this.closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    /**
     * Load a page
     */
    async loadPage(pageId, updateHistory = true) {
        try {
            console.log(`Loading page: ${pageId}`);
            
            // Update current page
            const previousPage = this.currentPage;
            this.currentPage = pageId;
            
            // Update navigation
            this.updateNavigation(pageId);
            
            // Update page title
            this.updatePageTitle(pageId);
            
            // Update browser history
            if (updateHistory) {
                history.pushState({ page: pageId }, '', `#${pageId}`);
            }
            
            // Load page content
            await this.loadPageContent(pageId);
            
            // Emit page change event
            this.emit('page:changed', { 
                from: previousPage, 
                to: pageId 
            });
            
        } catch (error) {
            console.error(`Failed to load page ${pageId}:`, error);
            this.showError(`Failed to load ${pageId} page`);
        }
    }

    /**
     * Load page content
     */
    async loadPageContent(pageId) {
        const pageContainer = document.getElementById('page-container');
        if (!pageContainer) {
            throw new Error('Page container not found');
        }

        // Show loading state
        this.showPageLoading(pageContainer);

        try {
            // Load page template
            const template = await this.loadTemplate(pageId);
            
            // Update page container
            pageContainer.innerHTML = `<div id="${pageId}-page" class="page active">${template}</div>`;
            
            // Initialize page-specific functionality
            await this.initializePage(pageId);
            
        } catch (error) {
            this.showPageError(pageContainer, error.message);
            throw error;
        }
    }

    /**
     * Load page template
     */
    async loadTemplate(pageId) {
        try {
            const response = await fetch(`templates/${pageId}.html`);
            if (!response.ok) {
                throw new Error(`Template not found: ${pageId}`);
            }
            return await response.text();
        } catch (error) {
            console.warn(`Failed to load template for ${pageId}, using fallback`);
            return this.getFallbackTemplate(pageId);
        }
    }

    /**
     * Initialize page-specific functionality
     */
    async initializePage(pageId) {
        // Call page-specific initialization if available
        const pageInitializer = window[`${pageId}Page`];
        if (pageInitializer && typeof pageInitializer.init === 'function') {
            await pageInitializer.init();
        }
    }

    /**
     * Get page ID from navigation item
     */
    getPageFromNavItem(navItem) {
        const onclick = navItem.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/showPage\(['"]([^'"]+)['"]\)/);
            return match ? match[1] : null;
        }
        return null;
    }

    /**
     * Update navigation active state
     */
    updateNavigation(activePageId) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = this.getPageFromNavItem(item);
            if (page === activePageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Update page title
     */
    updatePageTitle(pageId) {
        const titles = {
            dashboard: 'Dashboard',
            customers: 'Customers',
            vehicles: 'Vehicles',
            jobs: 'Jobs',
            estimates: 'Estimates',
            invoices: 'Invoices',
            reminders: 'Reminders',
            parts: 'Parts',
            reports: 'Reports',
            settings: 'Settings'
        };

        const title = titles[pageId] || 'Garage Management System';
        document.title = `${title} - GarageManager Pro`;
    }

    /**
     * Show page loading state
     */
    showPageLoading(container) {
        container.innerHTML = `
            <div class="page-loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    /**
     * Show page error state
     */
    showPageError(container, message) {
        container.innerHTML = `
            <div class="page-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Page</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
            </div>
        `;
    }

    /**
     * Get fallback template for pages
     */
    getFallbackTemplate(pageId) {
        return `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-cog"></i>
                    ${pageId.charAt(0).toUpperCase() + pageId.slice(1)}
                </h1>
                <p class="page-subtitle">This page is under development</p>
            </div>
            <div class="card">
                <div class="card-content">
                    <p>The ${pageId} page functionality will be available soon.</p>
                </div>
            </div>
        `;
    }

    /**
     * Focus search input on current page
     */
    focusSearch() {
        const activeSearchBox = document.querySelector('.page.active .search-box input');
        if (activeSearchBox) {
            activeSearchBox.focus();
        }
    }

    /**
     * Refresh current page
     */
    async refreshCurrentPage() {
        await this.loadPage(this.currentPage, false);
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.emit('modal:opened', { modalId });
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            document.body.style.overflow = '';
            this.emit('modal:closed', { modalId: activeModal.id });
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Implementation depends on notification system
        console.error(message);
        alert(message); // Temporary fallback
    }

    /**
     * Emit custom event
     */
    emit(eventName, data = {}) {
        this.events.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    /**
     * Listen to custom event
     */
    on(eventName, callback) {
        this.events.addEventListener(eventName, callback);
    }

    /**
     * Cleanup on unload
     */
    cleanup() {
        // Cleanup any resources, timers, etc.
        console.log('Cleaning up application...');
    }
}

// Create global app instance
window.App = new GarageApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.App.init());
} else {
    window.App.init();
}
