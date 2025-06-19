# ⚙️ Settings Page - Comprehensive Configuration Guide

## Overview
The Settings page provides a centralized location for configuring all aspects of the garage management system, including MOT Reminder settings, system preferences, garage information, and user account settings. The page features a modern, tabbed interface with real-time validation and persistent storage.

## 🎯 Key Features

### ✅ **Tabbed Interface**
- **MOT Reminders**: DVLA API, SMS service, notifications, and data management
- **System**: Date formats, display preferences, and general system settings
- **Garage Info**: Business information, contact details, and operating hours
- **User Account**: Personal settings, security, and preferences

### ✅ **Persistent Storage**
- All settings automatically saved to localStorage
- Settings persist across browser sessions
- Automatic loading of saved preferences on page load
- Backup and restore functionality for data protection

### ✅ **Real-time Validation**
- Form validation with visual feedback
- Connection testing for API credentials
- Input format validation for emails, URLs, and phone numbers
- Confirmation dialogs for destructive actions

## 📋 Settings Categories

### 1. **MOT Reminder Settings**

#### **DVLA API Configuration**
- **Client ID**: Your DVSA API Client ID for MOT data access
- **Token URL**: OAuth2 endpoint for authentication
- **Connection Test**: Verify API credentials with live testing
- **Status Indicator**: Visual feedback for connection status

#### **SMS Service Settings**
- **Provider Selection**: Choose from Twilio, Textlocal, ClickSend, or Custom
- **Sender ID**: Name or number displayed as message sender (max 11 characters)
- **Message Template**: Customizable SMS template with placeholders:
  - `{customer_name}` - Customer's name
  - `{registration}` - Vehicle registration number
  - `{expiry_date}` - MOT expiry date

#### **Notification Preferences**
- **Primary Reminder**: First notification (60, 45, 30, or 21 days before expiry)
- **Follow-up Reminder**: Second notification (21, 14, 10, or 7 days before expiry)
- **Final Reminder**: Last notification (14, 10, 7, or 3 days before expiry)

#### **Data Management**
- **Export Options**: Export MOT data as CSV or JSON
- **Import Functionality**: Import vehicle data from CSV or JSON files
- **Completion Tracking**: Clear completion history or export completion data
- **Backup & Restore**: Create full system backups and restore from backup files

### 2. **System Settings**

#### **Date Format Preferences**
- **Date Format**: Choose from DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
- **Time Format**: Select 12-hour (2:30 PM) or 24-hour (14:30) format
- **Applied System-wide**: Affects all date displays throughout the application

#### **Display Preferences**
- **Table Row Density**: Compact, Normal, or Comfortable spacing
- **Default Page Size**: Number of items per page (10, 25, 50, or 100)
- **UI Theme**: Light, Dark, or Auto (follows system preference)
- **Tooltips**: Enable/disable helpful hints and tooltips
- **Auto-save**: Automatically save form data as you type

#### **Notification Settings**
- **Desktop Notifications**: Enable browser notifications
- **Sound Notifications**: Play audio alerts for notifications
- **Notification Duration**: How long notifications remain visible (3s, 5s, 10s, or until dismissed)

### 3. **Garage Information**

#### **Business Information**
- **Garage Name**: Your business trading name
- **Business Registration**: Company registration or VAT number
- **Business Address**: Full business address (multi-line)

#### **Contact Information**
- **Main Phone**: Primary contact number
- **Mobile Number**: Mobile contact number
- **Email Address**: Business email address
- **Website URL**: Business website (optional)

#### **Operating Hours**
- **Daily Schedule**: Set opening and closing times for each day
- **Closed Days**: Mark days when the garage is closed
- **Time Inputs**: Easy-to-use time pickers for each day
- **Flexible Configuration**: Different hours for each day of the week

### 4. **User Account Settings**

#### **Account Information**
- **Full Name**: Your complete name
- **Email Address**: Your email address
- **Job Title**: Your role in the garage (Manager, Technician, etc.)
- **Phone Number**: Your contact number

#### **Security Settings**
- **Change Password**: Update your account password
- **Two-Factor Authentication**: Enable additional security layer
- **Session Timeout**: Auto-logout after inactivity

#### **Personal Preferences**
- **Language**: Interface language (English, Spanish, French, German)
- **Timezone**: Your local timezone for accurate time displays
- **Email Notifications**: Receive system notifications via email
- **Marketing Emails**: Opt-in/out of promotional communications

## 🔧 Technical Implementation

### **Data Storage**
```javascript
// Settings stored in localStorage as JSON
localStorage.setItem('garageSettings', JSON.stringify(settingsData));

// Automatic loading on page initialization
const saved = localStorage.getItem('garageSettings');
settingsData = JSON.parse(saved);
```

### **Form Validation**
- Real-time validation with visual feedback
- CSS classes for valid/invalid states
- Custom validation messages
- Required field indicators

### **Backup System**
- Complete system backup including all settings and data
- JSON format for easy portability
- Timestamped backup files
- One-click restore functionality

## 🚀 Usage Instructions

### **Accessing Settings**
1. Click the "Settings" item in the navigation sidebar
2. The Settings page opens with the MOT Reminders tab active
3. Use the tab buttons to navigate between different setting categories

### **Configuring MOT Reminders**
1. **API Setup**: Enter your DVSA Client ID and Token URL
2. **Test Connection**: Click "Test Connection" to verify credentials
3. **SMS Configuration**: Choose provider and set sender ID
4. **Customize Template**: Edit the SMS message template with placeholders
5. **Set Reminders**: Configure reminder intervals (primary, follow-up, final)

### **System Configuration**
1. **Date Format**: Choose your preferred date display format
2. **Display Options**: Set table density and page sizes
3. **Theme Selection**: Choose light, dark, or auto theme
4. **Notifications**: Configure desktop and sound notifications

### **Garage Information**
1. **Business Details**: Enter garage name and registration
2. **Contact Info**: Add phone, email, and website details
3. **Operating Hours**: Set daily opening and closing times
4. **Mark Closed Days**: Check the "Closed" option for non-working days

### **User Account**
1. **Personal Info**: Update name, email, and job title
2. **Security**: Enable two-factor authentication and session timeout
3. **Preferences**: Set language and timezone
4. **Notifications**: Configure email notification preferences

### **Saving Settings**
- **Auto-save**: Individual changes are saved automatically (if enabled)
- **Save All**: Click "Save All Settings" to save all changes at once
- **Reset**: Use "Reset to Defaults" to restore factory settings

## 🔒 Security Features

### **Data Protection**
- All sensitive data stored locally (no cloud transmission)
- Secure localStorage implementation
- Backup encryption (future enhancement)
- Session timeout for security

### **Validation & Sanitization**
- Input validation for all form fields
- URL validation for website and API endpoints
- Email format validation
- Phone number format checking

## 📱 Responsive Design

### **Mobile Optimization**
- Responsive grid layout adapts to screen size
- Touch-friendly interface elements
- Collapsible sections on small screens
- Optimized tab navigation for mobile devices

### **Cross-browser Compatibility**
- Modern browser support (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older browsers
- Consistent styling across platforms
- Accessible design following WCAG guidelines

## 🔄 Integration with System

### **Settings Application**
- Date format applied to all date displays
- Theme changes affect entire application
- Table density modifies all data tables
- Notification preferences control system alerts

### **MOT Reminder Integration**
- API credentials used for DVLA data fetching
- SMS templates applied to reminder messages
- Reminder intervals control notification timing
- Completion tracking preferences affect workflow

This comprehensive Settings page transforms the garage management system into a fully customizable platform, allowing users to tailor every aspect of the system to their specific needs and preferences.
