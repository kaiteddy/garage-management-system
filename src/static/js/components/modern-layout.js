/**
 * Modern Layout Component
 * Handles sidebar, navigation, search, notifications, and user interactions
 */

class ModernLayout {
    constructor() {
        this.sidebar = null;
        this.sidebarToggle = null;
        this.mobileSidebarToggle = null;
        this.userMenuToggle = null;
        this.notificationsToggle = null;
        this.globalSearch = null;
        this.searchResults = null;
        this.searchTimeout = null;
        
        this.isSearching = false;
        this.notifications = [];
        this.searchCache = new Map();
    }

    /**
     * Initialize the modern layout
     */
    init() {
        console.log('Initializing modern layout...');
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadNotifications();
        this.updateSidebarCounts();
        this.setupKeyboardShortcuts();
        
        console.log('Modern layout initialized successfully');
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
        this.userMenuToggle = document.getElementById('user-menu-toggle');
        this.notificationsToggle = document.getElementById('notifications-toggle');
        this.globalSearch = document.getElementById('global-search');
        this.searchResults = document.getElementById('search-results');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar toggles
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.mobileSidebarToggle) {
            this.mobileSidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // User menu
        if (this.userMenuToggle) {
            this.userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Notifications
        if (this.notificationsToggle) {
            this.notificationsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotifications();
            });
        }

        // Global search
        if (this.globalSearch) {
            this.globalSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            this.globalSearch.addEventListener('focus', () => {
                if (this.globalSearch.value) {
                    this.showSearchResults();
                }
            });
        }

        // Click outside to close dropdowns
        document.addEventListener('click', (e) => {
            this.closeDropdowns(e);
        });

        // Escape key to close dropdowns
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllDropdowns();
            }
        });

        // Responsive sidebar handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle sidebar backdrop clicks on mobile
        if (this.sidebar) {
            this.sidebar.addEventListener('click', (e) => {
                if (e.target === this.sidebar && window.innerWidth < 1024) {
                    this.closeSidebar();
                }
            });
        }
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        if (!this.sidebar) return;
        
        const isOpen = this.sidebar.classList.contains('open');
        
        if (isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Open sidebar
     */
    openSidebar() {
        if (!this.sidebar) return;
        
        this.sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
        
        // Add backdrop for mobile
        if (window.innerWidth < 1024) {
            this.createSidebarBackdrop();
        }
    }

    /**
     * Close sidebar
     */
    closeSidebar() {
        if (!this.sidebar) return;
        
        this.sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        this.removeSidebarBackdrop();
    }

    /**
     * Create sidebar backdrop for mobile
     */
    createSidebarBackdrop() {
        if (document.getElementById('sidebar-backdrop')) return;
        
        const backdrop = document.createElement('div');
        backdrop.id = 'sidebar-backdrop';
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden';
        backdrop.addEventListener('click', () => this.closeSidebar());
        
        document.body.appendChild(backdrop);
    }

    /**
     * Remove sidebar backdrop
     */
    removeSidebarBackdrop() {
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }

    /**
     * Toggle user menu
     */
    toggleUserMenu() {
        const dropdown = document.getElementById('user-menu-dropdown');
        if (!dropdown) return;
        
        const isOpen = !dropdown.classList.contains('hidden');
        
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.classList.remove('hidden');
            this.userMenuToggle.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Toggle notifications
     */
    toggleNotifications() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) return;
        
        const isOpen = !dropdown.classList.contains('hidden');
        
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.classList.remove('hidden');
            this.renderNotifications();
        }
    }

    /**
     * Handle global search
     */
    async handleSearch(query) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }
        
        this.searchTimeout = setTimeout(async () => {
            await this.performSearch(query);
        }, 300);
    }

    /**
     * Perform search operation
     */
    async performSearch(query) {
        if (this.isSearching) return;
        
        // Check cache first
        if (this.searchCache.has(query)) {
            this.displaySearchResults(this.searchCache.get(query));
            return;
        }
        
        this.isSearching = true;
        this.showSearchLoading();
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.searchCache.set(query, data.data);
                this.displaySearchResults(data.data);
            } else {
                this.showSearchError('Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError('Search unavailable');
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        if (!this.searchResults) return;
        
        if (!results || Object.keys(results).length === 0) {
            this.searchResults.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <i class="fas fa-search mb-2"></i>
                    <p>No results found</p>
                </div>
            `;
        } else {
            this.searchResults.innerHTML = this.renderSearchResults(results);
        }
        
        this.showSearchResults();
    }

    /**
     * Render search results HTML
     */
    renderSearchResults(results) {
        let html = '';
        
        Object.entries(results).forEach(([category, items]) => {
            if (items && items.length > 0) {
                html += `
                    <div class="search-category">
                        <div class="search-category-header">
                            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2">
                                ${category} (${items.length})
                            </h4>
                        </div>
                        <div class="search-category-items">
                            ${items.map(item => this.renderSearchItem(category, item)).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        return html;
    }

    /**
     * Render individual search item
     */
    renderSearchItem(category, item) {
        const icons = {
            customers: 'fas fa-user',
            vehicles: 'fas fa-car',
            jobs: 'fas fa-wrench',
            estimates: 'fas fa-file-invoice',
            invoices: 'fas fa-file-invoice-dollar'
        };
        
        const icon = icons[category] || 'fas fa-file';
        
        return `
            <a href="${item.url}" class="search-item block px-4 py-3 hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                        <i class="${icon} text-gray-400"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">
                            ${item.title}
                        </div>
                        ${item.subtitle ? `
                            <div class="text-xs text-gray-500 truncate">
                                ${item.subtitle}
                            </div>
                        ` : ''}
                    </div>
                    ${item.badge ? `
                        <div class="flex-shrink-0">
                            <span class="badge badge-${item.badge.type}">
                                ${item.badge.text}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </a>
        `;
    }

    /**
     * Show search results
     */
    showSearchResults() {
        if (this.searchResults) {
            this.searchResults.classList.remove('hidden');
        }
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.classList.add('hidden');
        }
    }

    /**
     * Show search loading state
     */
    showSearchLoading() {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = `
            <div class="p-4 text-center">
                <div class="spinner mx-auto mb-2"></div>
                <p class="text-sm text-gray-500">Searching...</p>
            </div>
        `;
        
        this.showSearchResults();
    }

    /**
     * Show search error
     */
    showSearchError(message) {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = `
            <div class="p-4 text-center text-red-500">
                <i class="fas fa-exclamation-triangle mb-2"></i>
                <p class="text-sm">${message}</p>
            </div>
        `;
        
        this.showSearchResults();
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.notifications = data.data || [];
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    /**
     * Update notification badge
     */
    updateNotificationBadge() {
        const badge = document.getElementById('notification-count');
        if (badge) {
            const unreadCount = this.notifications.filter(n => !n.read).length;
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    /**
     * Render notifications
     */
    renderNotifications() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) return;
        
        if (this.notifications.length === 0) {
            dropdown.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <i class="fas fa-bell-slash mb-2"></i>
                    <p class="text-sm">No notifications</p>
                </div>
            `;
            return;
        }
        
        dropdown.innerHTML = `
            <div class="notification-header p-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
                    <button onclick="modernLayout.markAllAsRead()" class="text-xs text-primary-600 hover:text-primary-700">
                        Mark all read
                    </button>
                </div>
            </div>
            <div class="notification-list max-h-80 overflow-y-auto">
                ${this.notifications.map(notification => this.renderNotification(notification)).join('')}
            </div>
        `;
    }

    /**
     * Render individual notification
     */
    renderNotification(notification) {
        return `
            <div class="notification-item p-4 border-b border-gray-100 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0">
                        <i class="fas fa-${notification.icon || 'info-circle'} text-${notification.type || 'primary'}-500"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900">
                            ${notification.title}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            ${notification.message}
                        </div>
                        <div class="text-xs text-gray-400 mt-1">
                            ${this.formatRelativeTime(notification.created_at)}
                        </div>
                    </div>
                    ${!notification.read ? `
                        <div class="flex-shrink-0">
                            <div class="w-2 h-2 bg-primary-500 rounded-full"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Update sidebar counts
     */
    async updateSidebarCounts() {
        try {
            const response = await fetch('/api/dashboard/counts');
            const data = await response.json();
            
            if (data.status === 'success') {
                const counts = data.data;
                
                this.updateCount('customers-count', counts.customers);
                this.updateCount('vehicles-count', counts.vehicles);
                this.updateCount('active-jobs-count', counts.active_jobs);
                this.updateCount('pending-estimates-count', counts.pending_estimates);
                this.updateCount('unpaid-invoices-count', counts.unpaid_invoices);
            }
        } catch (error) {
            console.error('Failed to update sidebar counts:', error);
        }
    }

    /**
     * Update individual count
     */
    updateCount(elementId, count) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count || 0;
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this.globalSearch) {
                    this.globalSearch.focus();
                }
            }
            
            // Ctrl/Cmd + B for sidebar toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }

    /**
     * Close dropdowns when clicking outside
     */
    closeDropdowns(e) {
        const userMenu = document.getElementById('user-menu-dropdown');
        const notifications = document.getElementById('notifications-dropdown');
        const searchResults = this.searchResults;
        
        // Close user menu
        if (userMenu && !userMenu.classList.contains('hidden')) {
            if (!this.userMenuToggle.contains(e.target) && !userMenu.contains(e.target)) {
                userMenu.classList.add('hidden');
                this.userMenuToggle.setAttribute('aria-expanded', 'false');
            }
        }
        
        // Close notifications
        if (notifications && !notifications.classList.contains('hidden')) {
            if (!this.notificationsToggle.contains(e.target) && !notifications.contains(e.target)) {
                notifications.classList.add('hidden');
            }
        }
        
        // Close search results
        if (searchResults && !searchResults.classList.contains('hidden')) {
            if (!this.globalSearch.contains(e.target) && !searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        const userMenu = document.getElementById('user-menu-dropdown');
        const notifications = document.getElementById('notifications-dropdown');
        
        if (userMenu) {
            userMenu.classList.add('hidden');
            this.userMenuToggle.setAttribute('aria-expanded', 'false');
        }
        
        if (notifications) {
            notifications.classList.add('hidden');
        }
        
        this.hideSearchResults();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (window.innerWidth >= 1024) {
            this.removeSidebarBackdrop();
            document.body.classList.remove('sidebar-open');
        }
    }

    /**
     * Format relative time
     */
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.notifications.forEach(n => n.read = true);
                this.updateNotificationBadge();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
        }
    }
}

// Global logout function
window.logout = async function() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/auth/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/auth/login';
    }
};

// Export for global use
window.ModernLayout = ModernLayout;
