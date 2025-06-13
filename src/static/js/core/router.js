/**
 * Router Module for Single Page Application
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = 'dashboard';
        this.templateCache = new Map();
    }

    /**
     * Initialize the router
     */
    init() {
        console.log('Initializing router...');
        
        // Register default routes
        this.registerDefaultRoutes();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial route
        this.loadInitialRoute();
        
        console.log('Router initialized');
    }

    /**
     * Register default routes
     */
    registerDefaultRoutes() {
        this.register('dashboard', {
            template: 'dashboard.html',
            title: 'Dashboard',
            init: () => window.dashboardPage?.init()
        });

        this.register('customers', {
            template: 'customers.html',
            title: 'Customers',
            init: () => window.customersPage?.init()
        });

        this.register('vehicles', {
            template: 'vehicles.html',
            title: 'Vehicles',
            init: () => window.vehiclesPage?.init()
        });

        this.register('jobs', {
            template: 'jobs.html',
            title: 'Jobs',
            init: () => window.jobsPage?.init()
        });

        this.register('estimates', {
            template: 'estimates.html',
            title: 'Estimates',
            init: () => window.estimatesPage?.init()
        });

        this.register('invoices', {
            template: 'invoices.html',
            title: 'Invoices',
            init: () => window.invoicesPage?.init()
        });

        this.register('reminders', {
            template: 'reminders.html',
            title: 'MOT Reminders',
            init: () => window.remindersPage?.init()
        });

        this.register('parts', {
            template: 'parts.html',
            title: 'Parts',
            init: () => window.partsPage?.init()
        });

        this.register('reports', {
            template: 'reports.html',
            title: 'Reports',
            init: () => window.reportsPage?.init()
        });

        this.register('settings', {
            template: 'settings.html',
            title: 'Settings',
            init: () => window.settingsPage?.init()
        });
    }

    /**
     * Register a route
     */
    register(path, config) {
        this.routes.set(path, {
            path,
            template: config.template,
            title: config.title || path,
            init: config.init || null,
            beforeEnter: config.beforeEnter || null,
            afterEnter: config.afterEnter || null
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.navigate(e.state.route, false);
            } else {
                this.navigate(this.getRouteFromHash(), false);
            }
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const route = this.getRouteFromHash();
            if (route !== this.currentRoute) {
                this.navigate(route, false);
            }
        });
    }

    /**
     * Load initial route
     */
    loadInitialRoute() {
        const route = this.getRouteFromHash() || this.defaultRoute;
        this.navigate(route, false);
    }

    /**
     * Get route from URL hash
     */
    getRouteFromHash() {
        const hash = window.location.hash.slice(1);
        return hash || this.defaultRoute;
    }

    /**
     * Navigate to a route
     */
    async navigate(routePath, updateHistory = true) {
        try {
            console.log(`Navigating to: ${routePath}`);

            const route = this.routes.get(routePath);
            if (!route) {
                console.warn(`Route '${routePath}' not found, redirecting to default`);
                return this.navigate(this.defaultRoute, updateHistory);
            }

            // Run beforeEnter hook
            if (route.beforeEnter) {
                const canEnter = await route.beforeEnter(route);
                if (!canEnter) {
                    console.log(`Navigation to '${routePath}' blocked by beforeEnter hook`);
                    return;
                }
            }

            // Update browser history
            if (updateHistory) {
                const url = routePath === this.defaultRoute ? '/' : `#${routePath}`;
                history.pushState({ route: routePath }, route.title, url);
            }

            // Update current route
            const previousRoute = this.currentRoute;
            this.currentRoute = routePath;

            // Update page title
            document.title = `${route.title} - GarageManager Pro`;

            // Update navigation
            this.updateNavigation(routePath);

            // Load and display content
            await this.loadRouteContent(route);

            // Run afterEnter hook
            if (route.afterEnter) {
                await route.afterEnter(route, previousRoute);
            }

            // Emit navigation event
            this.emitNavigationEvent(routePath, previousRoute);

            console.log(`Navigation to '${routePath}' completed`);

        } catch (error) {
            console.error(`Navigation to '${routePath}' failed:`, error);
            this.showNavigationError(error);
        }
    }

    /**
     * Load route content
     */
    async loadRouteContent(route) {
        const pageContainer = document.getElementById('page-container');
        if (!pageContainer) {
            throw new Error('Page container not found');
        }

        // Show loading state
        this.showLoadingState(pageContainer);

        try {
            // Load template
            const template = await this.loadTemplate(route.template);
            
            // Update page container
            pageContainer.innerHTML = `<div id="${route.path}-page" class="page active">${template}</div>`;
            
            // Initialize page
            if (route.init) {
                await route.init();
            }

        } catch (error) {
            this.showErrorState(pageContainer, error.message);
            throw error;
        }
    }

    /**
     * Load template from cache or fetch
     */
    async loadTemplate(templatePath) {
        // Check cache first
        if (this.templateCache.has(templatePath)) {
            return this.templateCache.get(templatePath);
        }

        try {
            const response = await fetch(`templates/${templatePath}`);
            if (!response.ok) {
                throw new Error(`Template not found: ${templatePath}`);
            }
            
            const template = await response.text();
            
            // Cache the template
            this.templateCache.set(templatePath, template);
            
            return template;
        } catch (error) {
            console.warn(`Failed to load template ${templatePath}, using fallback`);
            return this.getFallbackTemplate(templatePath);
        }
    }

    /**
     * Get fallback template
     */
    getFallbackTemplate(templatePath) {
        const routeName = templatePath.replace('.html', '');
        return `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-cog"></i>
                    ${routeName.charAt(0).toUpperCase() + routeName.slice(1)}
                </h1>
                <p class="page-subtitle">This page is under development</p>
            </div>
            <div class="card">
                <div class="card-content">
                    <p>The ${routeName} page functionality will be available soon.</p>
                </div>
            </div>
        `;
    }

    /**
     * Update navigation active state
     */
    updateNavigation(activeRoute) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const onclick = item.getAttribute('onclick');
            if (onclick) {
                const match = onclick.match(/showPage\(['"]([^'"]+)['"]\)/);
                const route = match ? match[1] : null;
                
                if (route === activeRoute) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        });
    }

    /**
     * Show loading state
     */
    showLoadingState(container) {
        container.innerHTML = `
            <div class="page-loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    /**
     * Show error state
     */
    showErrorState(container, message) {
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
     * Show navigation error
     */
    showNavigationError(error) {
        console.error('Navigation error:', error);
        // Implementation depends on notification system
    }

    /**
     * Emit navigation event
     */
    emitNavigationEvent(currentRoute, previousRoute) {
        if (window.App && window.App.emit) {
            window.App.emit('route:changed', {
                from: previousRoute,
                to: currentRoute
            });
        }
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Check if route exists
     */
    hasRoute(routePath) {
        return this.routes.has(routePath);
    }

    /**
     * Get route config
     */
    getRoute(routePath) {
        return this.routes.get(routePath);
    }

    /**
     * Clear template cache
     */
    clearCache() {
        this.templateCache.clear();
    }

    /**
     * Preload templates
     */
    async preloadTemplates() {
        const templatePromises = Array.from(this.routes.values()).map(route => 
            this.loadTemplate(route.template)
        );
        
        try {
            await Promise.all(templatePromises);
            console.log('All templates preloaded');
        } catch (error) {
            console.warn('Some templates failed to preload:', error);
        }
    }

    /**
     * Redirect to route
     */
    redirect(routePath) {
        this.navigate(routePath, true);
    }

    /**
     * Go back in history
     */
    back() {
        history.back();
    }

    /**
     * Go forward in history
     */
    forward() {
        history.forward();
    }

    /**
     * Replace current route
     */
    replace(routePath) {
        const route = this.routes.get(routePath);
        if (route) {
            const url = routePath === this.defaultRoute ? '/' : `#${routePath}`;
            history.replaceState({ route: routePath }, route.title, url);
            this.navigate(routePath, false);
        }
    }
}

// Create global router instance
window.Router = new Router();

// Global navigation function for onclick handlers
window.showPage = function(routePath) {
    window.Router.navigate(routePath);
};
