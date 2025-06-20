/**
 * Layout Manager
 * Handles switching between vertical sidebar and horizontal navigation layouts
 */

class LayoutManager {
    constructor() {
        this.currentLayout = 'vertical'; // Default layout
        this.storageKey = 'garage-layout-preference';
        this.init();
    }

    init() {
        console.log('🎨 Initializing Layout Manager...');

        // Load saved layout preference
        this.loadLayoutPreference();

        // Setup layout toggle button
        this.setupLayoutToggle();

        // Setup submenu animations
        this.setupSubmenuAnimations();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Apply initial layout
        this.applyLayout(this.currentLayout);

        console.log('✅ Layout Manager initialized');
    }

    loadLayoutPreference() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved && ['vertical', 'horizontal'].includes(saved)) {
            this.currentLayout = saved;
            console.log('📱 Loaded layout preference:', this.currentLayout);
        }
    }

    saveLayoutPreference() {
        localStorage.setItem(this.storageKey, this.currentLayout);
        console.log('💾 Saved layout preference:', this.currentLayout);
    }

    setupLayoutToggle() {
        // Wait for DOM to be ready
        const setupToggle = () => {
            const toggleBtn = document.getElementById('layout-toggle-btn');
            if (toggleBtn) {
                // Remove any existing listeners to prevent duplicates
                toggleBtn.removeEventListener('click', this.handleToggleClick);

                // Bind the handler to maintain context
                this.handleToggleClick = () => {
                    console.log('🔄 Layout toggle clicked, current:', this.currentLayout);
                    this.toggleLayout();
                };

                toggleBtn.addEventListener('click', this.handleToggleClick);
                this.updateToggleButton();
                console.log('🔄 Layout toggle button setup complete');
            } else {
                console.log('⏳ Layout toggle button not found, retrying...');
                setTimeout(setupToggle, 500);
            }
        };

        setupToggle();
    }

    toggleLayout() {
        const newLayout = this.currentLayout === 'vertical' ? 'horizontal' : 'vertical';
        this.setLayout(newLayout);
    }

    setLayout(layout) {
        if (!['vertical', 'horizontal'].includes(layout)) {
            console.error('❌ Invalid layout:', layout);
            return;
        }

        console.log('🔄 Switching layout from', this.currentLayout, 'to', layout);
        
        this.currentLayout = layout;
        this.applyLayout(layout);
        this.saveLayoutPreference();
        this.updateToggleButton();
        
        // Trigger layout change event
        window.dispatchEvent(new CustomEvent('layoutChanged', {
            detail: { layout: layout }
        }));
    }

    applyLayout(layout) {
        const body = document.body;

        console.log('🎨 Applying layout:', layout);
        console.log('📋 Current body classes before:', Array.from(body.classList));

        // Remove existing layout classes
        body.classList.remove('layout-vertical', 'layout-horizontal');

        // Add new layout class
        body.classList.add(`layout-${layout}`);

        console.log('📋 Current body classes after:', Array.from(body.classList));
        console.log('✅ Applied layout:', layout);

        // Force a reflow to ensure styles are applied
        body.offsetHeight;
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('layout-toggle-btn');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            const isHorizontal = this.currentLayout === 'horizontal';
            
            if (icon) {
                icon.className = isHorizontal ? 'fas fa-bars' : 'fas fa-exchange-alt';
            }
            
            toggleBtn.title = isHorizontal ? 'Switch to Vertical Layout' : 'Switch to Horizontal Layout';
        }
    }

    setupSubmenuAnimations() {
        // Wait for DOM to be ready
        const setupSubmenus = () => {
            const navSections = document.querySelectorAll('.nav-section');
            if (navSections.length > 0) {
                navSections.forEach(section => {
                    const header = section.querySelector('.nav-section-header');
                    if (header) {
                        header.addEventListener('click', (e) => {
                            e.preventDefault();
                            this.toggleSubmenu(section);
                        });
                    }
                });
                console.log('🎯 Submenu animations setup complete');
            } else {
                console.log('⏳ Nav sections not found, retrying...');
                setTimeout(setupSubmenus, 500);
            }
        };

        setupSubmenus();
    }

    toggleSubmenu(section) {
        const isCollapsed = section.classList.contains('collapsed');

        if (isCollapsed) {
            // Expand
            section.classList.remove('collapsed');
            console.log('📂 Expanding submenu');
        } else {
            // Collapse
            section.classList.add('collapsed');
            console.log('📁 Collapsing submenu');
        }

        // Add a subtle bounce effect
        const header = section.querySelector('.nav-section-header');
        if (header) {
            header.style.transform = 'scale(0.98)';
            setTimeout(() => {
                header.style.transform = '';
            }, 150);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + L to toggle layout
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                console.log('⌨️ Keyboard shortcut triggered for layout toggle');
                this.toggleLayout();
            }
        });
        console.log('⌨️ Keyboard shortcuts setup (Ctrl/Cmd + Shift + L)');
    }

    getCurrentLayout() {
        return this.currentLayout;
    }

    // Public API for external components
    static getInstance() {
        if (!window.layoutManager) {
            window.layoutManager = new LayoutManager();
        }
        return window.layoutManager;
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure components are loaded
    setTimeout(() => {
        LayoutManager.getInstance();
    }, 100);
});

// Export for use in other modules
window.LayoutManager = LayoutManager;
