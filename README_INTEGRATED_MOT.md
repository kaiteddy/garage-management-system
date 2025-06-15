# Integrated Garage Management System with MOT Reminders

A comprehensive garage management system with fully integrated MOT reminder functionality, DVSA API integration, and SMS notifications.

## 🎉 **FULLY INTEGRATED SYSTEM**

The MOT Reminder tool has been successfully integrated into the main garage management system as a native module, providing seamless access to MOT monitoring alongside customer, vehicle, job, and invoice management.

## ✨ **Key Features**

### 🏢 **Main Garage Management System**
- **Customer Management**: Complete customer database with contact information
- **Vehicle Management**: Vehicle records with MOT integration
- **Job Management**: Service jobs and work orders
- **Invoice Management**: Billing and payment tracking
- **Modern UI**: Clean, responsive design with optimized table layouts

### 🚗 **Integrated MOT Reminders**
- **DVSA API Integration**: Real-time MOT status checking using official DVSA API
- **Automatic Data Sync**: Vehicle registrations from main system automatically populate MOT monitoring
- **Customer Integration**: Mobile numbers and names automatically pulled from customer records
- **Urgency Sorting**: Vehicles sorted by MOT expiry urgency (expired first, then by days remaining)
- **Visual Indicators**: Color-coded status badges and urgent notifications

### 📱 **SMS Notification System**
- **Template-Based Messaging**: Different message templates for expired, critical, due soon, and general reminders
- **Bulk SMS Sending**: Send reminders to multiple customers at once
- **Mobile Number Integration**: Automatically uses mobile numbers from customer records
- **Twilio Integration**: Professional SMS service with delivery tracking
- **Demo Mode**: Test functionality without real SMS sending

### 📊 **File Upload & Management**
- **Bulk Vehicle Upload**: CSV and Excel file support for importing multiple vehicles
- **Template Downloads**: Pre-formatted templates for easy data entry
- **Drag & Drop Interface**: Modern file upload with visual feedback
- **Data Validation**: Automatic validation of registration numbers and contact information

## 🚀 **Quick Start**

### 1. **Installation**
```bash
# Clone or navigate to the garage management system directory
cd garage-management-system

# Install dependencies
pip install -r requirements.txt
```

### 2. **Configuration**
```bash
# Copy and configure environment variables
cp src/.env.example src/.env

# Edit src/.env with your credentials:
# - DVSA API credentials (Client ID already configured)
# - Twilio SMS credentials (optional, for real SMS)
```

### 3. **Start the Integrated System**
```bash
# Start both the main application and MOT service
python start_integrated_system.py
```

### 4. **Access the System**
- **Main Application**: Opens automatically in your browser
- **MOT Reminders**: Click "MOT Reminders" in the sidebar navigation
- **API Endpoint**: http://127.0.0.1:5002/api (for backend integration)

## 📋 **Using MOT Reminders**

### **Navigation Integration**
1. Open the main garage management system
2. Click **"MOT Reminders"** in the sidebar navigation
3. Access all MOT functionality within the main application interface

### **Adding Vehicles**
- **Single Vehicle**: Click "Add Vehicle" button, enter registration and optional customer details
- **Bulk Upload**: Click "Bulk Upload", drag/drop CSV or Excel file with vehicle data
- **Auto-Integration**: System automatically pulls customer data from existing records

### **Viewing MOT Status**
- **List View**: Comprehensive table with all vehicle details, sortable by urgency
- **Card View**: Visual cards showing vehicle status with color coding
- **Statistics Dashboard**: Overview of expired, critical, due soon, and valid MOTs

### **Sending SMS Reminders**
1. Select vehicles using checkboxes (or use "Select Urgent Only")
2. Click "Send SMS" button
3. Review selected vehicles and confirm sending
4. Messages automatically use appropriate templates based on urgency

## 🔧 **Technical Integration**

### **Architecture**
- **Frontend**: Enhanced HTML/CSS/JavaScript with MOT module integration
- **Backend**: Python Flask API service for MOT data and SMS handling
- **Database**: SQLite integration with existing garage management database
- **APIs**: DVSA MOT History API, Twilio SMS API

### **Data Flow**
1. **Vehicle Registration** → DVSA API → MOT Status Data
2. **Customer Records** → Auto-populate contact information
3. **MOT Expiry Dates** → Urgency calculation and sorting
4. **SMS Templates** → Twilio API → Customer notifications

### **File Structure**
```
garage-management-system/
├── src/
│   ├── static/
│   │   └── index.html          # Main application with MOT integration
│   ├── mot_service.py          # Backend MOT API service
│   └── .env                    # Configuration file
├── mot_reminder/               # Original MOT reminder modules
│   ├── mot_reminder.py         # Core MOT checking logic
│   ├── sms_service.py          # SMS functionality
│   └── app.py                  # Standalone MOT app (legacy)
├── start_integrated_system.py  # Startup script
├── requirements.txt            # Dependencies
└── README_INTEGRATED_MOT.md    # This file
```

## 🔐 **API Configuration**

### **DVSA API (Pre-configured)**
- **Client ID**: `2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f`
- **Token URL**: `https://login.microsoftonline.com/...`
- **API URL**: `https://history.mot.api.gov.uk/v1/trade/vehicles/registration`

### **SMS Service (Optional)**
Configure in `src/.env`:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_phone_number
```

## 📱 **SMS Templates**

### **🚨 Expired MOT**
```
🚨 URGENT: MOT EXPIRED
Hi [Customer], Your [Make] [Model] ([Registration]) MOT expired on [Date].
You cannot legally drive this vehicle. Please book your MOT test immediately.
Contact us for assistance.
```

### **⚠️ Critical (≤7 days)**
```
⚠️ CRITICAL: MOT Due Soon
Hi [Customer], Your [Make] [Model] ([Registration]) MOT expires in [X] days on [Date].
Please book your MOT test urgently to avoid any issues.
Contact us to arrange your test.
```

### **📅 Due Soon (8-30 days)**
```
📅 MOT Reminder
Hi [Customer], Your [Make] [Model] ([Registration]) MOT expires in [X] days on [Date].
Please book your MOT test soon to ensure continuous coverage.
Contact us to schedule your test.
```

## 🎯 **Benefits of Integration**

### **For Users**
- **Single Interface**: All garage management functions in one application
- **Seamless Workflow**: MOT reminders integrated with customer and vehicle management
- **Automatic Data Sync**: No duplicate data entry required
- **Professional Communication**: Template-based SMS with business branding

### **For Business**
- **Improved Customer Service**: Proactive MOT reminders prevent lapses
- **Increased Revenue**: More MOT bookings through timely reminders
- **Operational Efficiency**: Automated monitoring and notifications
- **Compliance**: Help customers stay legal with valid MOTs

## 🔍 **Troubleshooting**

### **Common Issues**
- **API Not Available**: System falls back to demo mode with simulated data
- **SMS Not Sending**: Check Twilio credentials or use demo mode for testing
- **File Upload Errors**: Ensure CSV files have 'registration' column header

### **Support**
- Check console logs for detailed error messages
- Verify API credentials in `.env` file
- Ensure all dependencies are installed from `requirements.txt`

## 🚀 **Future Enhancements**

- **Service Reminders**: Extend to include service interval reminders
- **Email Notifications**: Add email reminder functionality
- **Advanced Reporting**: MOT compliance reports and analytics
- **Mobile App**: Native mobile application for field use
- **Integration APIs**: Connect with other garage management systems

---

**🎉 The MOT Reminder system is now fully integrated into your garage management system!**

Navigate to "MOT Reminders" in the sidebar to start monitoring vehicle MOT dates and sending professional SMS reminders to your customers.
