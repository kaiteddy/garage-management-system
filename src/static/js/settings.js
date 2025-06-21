/**
 * Settings Management JavaScript
 * Handles all settings functionality for the garage management system
 */

// Global settings data
let settingsData = {};

// Load Settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('garageSettings');
        if (saved) {
            settingsData = JSON.parse(saved);
            populateSettingsForm();
        } else {
            // Set default values
            setDefaultSettings();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        setDefaultSettings();
    }
}

// Set Default Settings
function setDefaultSettings() {
    settingsData = {
        // System Settings
        dateFormat: 'DD-MM-YYYY',
        timeFormat: '24h',
        tableDensity: 'normal',
        pageSize: 25,
        uiTheme: 'light',
        showTooltips: true,
        autoSave: true,
        desktopNotifications: true,
        soundNotifications: false,
        notificationDuration: 5000,

        // Garage Information
        garageName: '',
        businessReg: '',
        garageAddress: '',
        garagePhone: '',
        garageMobile: '',
        garageEmail: '',
        garageWebsite: '',

        // User Settings
        userName: '',
        userEmail: '',
        userTitle: '',
        userPhone: '',
        twoFactorAuth: false,
        sessionTimeout: true,
        userLanguage: 'en',
        userTimezone: 'Europe/London',
        emailNotifications: true,
        marketingEmails: false
    };

    populateSettingsForm();
}

// Populate Settings Form
function populateSettingsForm() {
    try {
        // System Settings
        const dateFormat = document.getElementById('date-format');
        if (dateFormat) dateFormat.value = settingsData.dateFormat || 'DD-MM-YYYY';
        
        const itemsPerPage = document.getElementById('items-per-page');
        if (itemsPerPage) itemsPerPage.value = settingsData.pageSize || 25;

        console.log('✅ Settings form populated successfully');
    } catch (error) {
        console.error('Error populating settings form:', error);
    }
}

// Save Settings
function saveSettings() {
    try {
        // Collect form data
        const dateFormat = document.getElementById('date-format');
        const itemsPerPage = document.getElementById('items-per-page');
        
        if (dateFormat) settingsData.dateFormat = dateFormat.value;
        if (itemsPerPage) settingsData.pageSize = parseInt(itemsPerPage.value);

        // Save to localStorage
        localStorage.setItem('garageSettings', JSON.stringify(settingsData));

        // Apply settings immediately
        applySettings();

        // Show success notification
        if (typeof showNotification === 'function') {
            showNotification('Settings saved successfully!', 'success');
        } else {
            alert('Settings saved successfully!');
        }

        console.log('✅ Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error saving settings. Please try again.', 'error');
        } else {
            alert('Error saving settings. Please try again.');
        }
    }
}

// Apply Settings
function applySettings() {
    try {
        // Apply date format
        if (settingsData.dateFormat) {
            console.log('Applied date format:', settingsData.dateFormat);
        }

        // Apply theme
        if (settingsData.uiTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Apply table density
        if (settingsData.tableDensity) {
            document.body.className = document.body.className.replace(/table-density-\w+/g, '');
            document.body.classList.add(`table-density-${settingsData.tableDensity}`);
        }

        console.log('✅ Settings applied successfully');
    } catch (error) {
        console.error('Error applying settings:', error);
    }
}

// Reset Settings
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
        localStorage.removeItem('garageSettings');
        setDefaultSettings();
        if (typeof showNotification === 'function') {
            showNotification('Settings reset to defaults', 'info');
        } else {
            alert('Settings reset to defaults');
        }
    }
}

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load settings on page load
    loadSettings();
    
    // Add event listeners to save buttons
    const saveButtons = document.querySelectorAll('.btn[onclick*="save"], .btn[onclick*="Save"]');
    saveButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            saveSettings();
        });
    });
    
    console.log('✅ Settings system initialized');
});

// Simple notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: opacity 0.3s ease;
    `;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Make functions globally available
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.settingsData = settingsData;
window.applySettings = applySettings;
window.resetSettings = resetSettings;
window.showNotification = showNotification; 