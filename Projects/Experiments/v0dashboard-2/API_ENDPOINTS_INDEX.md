# 🔌 **API ENDPOINTS COMPREHENSIVE INDEX**

## 📊 **SYSTEM OVERVIEW**
- **Total API Routes**: 546 endpoints
- **Total Pages**: 95 pages  
- **Total Components**: 153 components
- **Architecture**: Next.js App Router with TypeScript

---

## 🏠 **CORE SYSTEM APIs**

### **Dashboard & Analytics**
- **`GET /api/dashboard`** - Main dashboard data and statistics
- **`GET /api/dashboard-ultra-fast`** - Optimized dashboard data
- **`GET /api/analytics`** - Business analytics data
- **`GET /api/test-analytics`** - Analytics testing
- **`GET /api/health`** - System health check
- **`GET /api/status`** - System status monitoring
- **`GET /api/performance`** - Performance metrics

### **System Management**
- **`GET /api/system`** - System information
- **`GET /api/data-connection-status`** - Data connection status
- **`GET /api/simple-count`** - Quick data counts
- **`GET /api/tables-list`** - Database tables list
- **`GET /api/check-all-tables`** - Table integrity check

---

## 🚗 **VEHICLE MANAGEMENT APIs**

### **Core Vehicle Operations**
- **`GET /api/vehicles`** - Vehicle listing and search
- **`POST /api/vehicles`** - Create new vehicle
- **`PUT /api/vehicles`** - Update vehicle
- **`DELETE /api/vehicles`** - Delete vehicle
- **`GET /api/vehicles-fast`** - Optimized vehicle data
- **`GET /api/vehicles/[registration]`** - Individual vehicle data

### **Vehicle Data Enrichment**
- **`GET /api/vehicle-data`** - Vehicle data lookup
- **`POST /api/vehicle-data`** - Update vehicle data
- **`GET /api/vehicle-details`** - Detailed vehicle information
- **`GET /api/vehicle-specification`** - Vehicle specifications
- **`GET /api/vehicle-specs`** - Alternative specs endpoint
- **`GET /api/populate-vehicle-data`** - Bulk data population

### **Technical Data & Specifications**
- **`GET /api/vehicle-technical-data`** - Technical specifications
- **`POST /api/vehicle-technical-data`** - Update technical data
- **`GET /api/vin-technical-data`** - VIN-based technical data
- **`GET /api/vehicle-oils`** - Oil and lubricant specifications
- **`POST /api/vehicle-oils`** - Update oil data
- **`GET /api/setup-vehicle-data`** - Vehicle data setup

### **Vehicle Images & Diagrams**
- **`GET /api/vehicle-image`** - Vehicle images
- **`GET /api/vehicle-image-svg`** - SVG vehicle diagrams
- **`GET /api/vehicle-diagrams`** - Technical diagrams
- **`GET /api/haynes-vehicle-image`** - Haynes Pro images

### **MOT & Compliance**
- **`GET /api/mot-check`** - MOT status checking
- **`POST /api/mot-check`** - Batch MOT checking
- **`GET /api/mot-check-batch`** - Batch MOT operations
- **`GET /api/mot-critical`** - Critical MOT alerts
- **`GET /api/mot-reminders`** - MOT reminder management
- **`POST /api/mot-reminders`** - Send MOT reminders

### **DVLA & DVSA Integration**
- **`GET /api/dvla-lookup`** - DVLA vehicle lookup
- **`POST /api/dvla-lookup`** - DVLA data retrieval
- **`GET /api/dvsa-test`** - DVSA API testing
- **`GET /api/vehicles/[registration]/fetch-exact-mot-history`** - MOT history
- **`GET /api/vehicles/[registration]/history`** - Vehicle history

---

## 👥 **CUSTOMER MANAGEMENT APIs**

### **Core Customer Operations**
- **`GET /api/customers`** - Customer listing and search
- **`POST /api/customers`** - Create new customer
- **`PUT /api/customers`** - Update customer
- **`DELETE /api/customers`** - Delete customer
- **`GET /api/customers-fast`** - Optimized customer data
- **`GET /api/customers/[id]`** - Individual customer data

### **Customer Relationships**
- **`GET /api/customer-responses`** - Customer interaction tracking
- **`POST /api/customer-responses`** - Log customer responses
- **`GET /api/contact-updates`** - Contact information updates
- **`POST /api/contact-updates`** - Update contact details

---

## 📋 **JOB MANAGEMENT APIs**

### **Job Sheets**
- **`GET /api/job-sheets`** - Job sheet listing
- **`POST /api/job-sheets`** - Create job sheet
- **`PUT /api/job-sheets`** - Update job sheet
- **`DELETE /api/job-sheets`** - Delete job sheet
- **`GET /api/job-sheets/[id]`** - Individual job sheet
- **`GET /api/job-sheets-simple`** - Simplified job sheets

### **Jobs & Tasks**
- **`GET /api/jobs`** - Job listing and management
- **`POST /api/jobs`** - Create new job
- **`PUT /api/jobs`** - Update job
- **`GET /api/jobs-smart-matcher`** - Smart job matching

### **Line Items & Services**
- **`GET /api/line-items`** - Service line items
- **`POST /api/line-items`** - Create line item
- **`PUT /api/line-items`** - Update line item
- **`DELETE /api/line-items`** - Delete line item

---

## 💰 **FINANCIAL MANAGEMENT APIs**

### **Invoicing**
- **`GET /api/invoices`** - Invoice management
- **`POST /api/invoices`** - Create invoice
- **`PUT /api/invoices`** - Update invoice
- **`DELETE /api/invoices`** - Delete invoice

### **Parts & Pricing**
- **`GET /api/parts`** - Parts catalog and search
- **`POST /api/parts`** - Add new part
- **`PUT /api/parts`** - Update part
- **`GET /api/parts-pricing-history`** - Pricing history
- **`GET /api/parts-pricing-suggestions`** - Price suggestions
- **`GET /api/parts-smart-matcher`** - Smart parts matching
- **`GET /api/comprehensive-parts-list`** - Complete parts catalog

### **Cost Management**
- **`GET /api/costs`** - Cost tracking and analysis
- **`POST /api/costs`** - Log costs
- **`GET /api/api-costs`** - API usage costs
- **`GET /api/tyre-pricing-analysis`** - Tyre pricing analysis

---

## 📱 **COMMUNICATION SYSTEM APIs**

### **Core Communication**
- **`GET /api/communication/smart-send`** - Smart communication routing
- **`POST /api/communication/smart-send`** - Send smart message
- **`GET /api/test-communication-system`** - System testing
- **`POST /api/test-communication-system`** - Run communication tests

### **SMS Integration**
- **`GET /api/sms`** - SMS management
- **`POST /api/sms`** - Send SMS
- **`GET /api/sms-whatsapp-style`** - WhatsApp-style SMS
- **`GET /api/test-twilio-sms`** - SMS testing
- **`GET /api/test-twilio-direct`** - Direct Twilio testing

### **WhatsApp Integration**
- **`GET /api/whatsapp`** - WhatsApp management
- **`POST /api/whatsapp`** - Send WhatsApp message
- **`GET /api/whatsapp/setup-sender`** - WhatsApp sender setup
- **`POST /api/whatsapp/setup-sender`** - Configure WhatsApp sender
- **`GET /api/whatsapp/send-reminders`** - Send WhatsApp reminders
- **`POST /api/whatsapp/send-reminders`** - Trigger reminder campaign

### **WhatsApp Setup & Configuration**
- **`GET /api/whatsapp-business-status`** - Business account status
- **`GET /api/whatsapp-sandbox-info`** - Sandbox information
- **`POST /api/whatsapp-sandbox-setup`** - Setup sandbox
- **`GET /api/whatsapp-verification-status`** - Verification status
- **`POST /api/whatsapp-verification-retry`** - Retry verification

### **Webhook Management**
- **`POST /api/webhooks/communication-responses`** - Handle communication responses
- **`GET /api/webhooks/communication-responses`** - Webhook status
- **`POST /api/webhooks/status-callback`** - Status callbacks
- **`GET /api/twilio/configure-webhooks`** - Webhook configuration
- **`POST /api/twilio/configure-webhooks`** - Setup webhooks

### **Correspondence Tracking**
- **`GET /api/correspondence/history`** - Communication history
- **`POST /api/correspondence/history`** - Log correspondence
- **`GET /api/correspondence/automated-responses`** - Automated responses
- **`POST /api/correspondence/automated-responses`** - Configure responses

### **Campaign Management**
- **`GET /api/reminders/mot-campaign`** - MOT reminder campaigns
- **`POST /api/reminders/mot-campaign`** - Launch MOT campaign
- **`GET /api/message-templates`** - Message templates
- **`POST /api/message-templates`** - Create message template

---

## 🗄️ **DATABASE MANAGEMENT APIs**

### **Core Database Operations**
- **`GET /api/database`** - Database status and operations
- **`POST /api/database`** - Database operations
- **`GET /api/db-test`** - Database connectivity test
- **`GET /api/db-schema`** - Database schema information
- **`GET /api/db-tables`** - Database tables list
- **`GET /api/db-integrity`** - Database integrity check

### **Communication Database**
- **`GET /api/setup-communication-database`** - Communication DB status
- **`POST /api/setup-communication-database`** - Setup communication tables

### **Data Import & Export**
- **`POST /api/import-data`** - Data import operations
- **`GET /api/import-status-check`** - Import status
- **`POST /api/comprehensive-import`** - Comprehensive data import
- **`POST /api/master-import`** - Master import process
- **`POST /api/turbo-import`** - High-speed import
- **`GET /api/turbo-import/status`** - Turbo import status

### **Backup & Restore**
- **`GET /api/backup`** - Backup operations
- **`POST /api/backup`** - Create backup
- **`GET /api/restore`** - Restore operations
- **`POST /api/restore`** - Restore from backup

---

## 🔧 **INTEGRATION APIs**

### **Parts Integration**
- **`GET /api/partsouq`** - PartSouq integration
- **`POST /api/partsouq`** - PartSouq operations
- **`GET /api/parts/ordering`** - Parts ordering system
- **`POST /api/parts/ordering`** - Place parts order

### **Technical Data Integration**
- **`GET /api/sws-vehicle-data`** - SWS integration
- **`POST /api/sws-vehicle-data`** - SWS data retrieval
- **`GET /api/sws-status`** - SWS system status
- **`GET /api/sws-explore`** - SWS data exploration

### **Haynes Pro Integration**
- **`GET /api/haynespro-proxy`** - Haynes Pro proxy
- **`POST /api/haynespro-proxy`** - Haynes Pro operations

### **VDG Integration**
- **`GET /api/vdg-account-check`** - VDG account status
- **`GET /api/vdg-address-lookup`** - VDG address lookup
- **`GET /api/vdg-optimizer`** - VDG optimization
- **`GET /api/vdg-package-test`** - VDG package testing

### **External APIs**
- **`GET /api/postcode-lookup`** - Postcode validation
- **`POST /api/postcode-lookup`** - Address lookup
- **`GET /api/cloudflare`** - Cloudflare integration

---

## 📊 **ANALYTICS & REPORTING APIs**

### **Business Analytics**
- **`GET /api/analyze-parts`** - Parts usage analysis
- **`POST /api/analyze-parts`** - Generate parts analysis
- **`GET /api/complete-data-analysis`** - Comprehensive data analysis
- **`GET /api/data-relationships-analysis`** - Data relationship analysis

### **Performance Monitoring**
- **`GET /api/performance`** - System performance metrics
- **`GET /api/api-costs`** - API usage and costs
- **`GET /api/enrichment-progress`** - Data enrichment progress

---

## 🧪 **TESTING & DEBUG APIs**

### **System Testing**
- **`GET /api/test-*`** - Various testing endpoints (50+ endpoints)
- **`GET /api/debug-*`** - Debug endpoints (20+ endpoints)
- **`GET /api/check-*`** - Validation endpoints (15+ endpoints)

### **Data Validation**
- **`GET /api/verify-all`** - Comprehensive system verification
- **`GET /api/final-integrity-check`** - Final data integrity check
- **`GET /api/data-structure-check`** - Data structure validation

---

## ⚙️ **CONFIGURATION & SETTINGS APIs**

### **Business Settings**
- **`GET /api/business-settings`** - Business configuration
- **`POST /api/business-settings`** - Update business settings
- **`GET /api/settings`** - System settings
- **`POST /api/settings`** - Update settings

### **Service Configuration**
- **`GET /api/service-types`** - Service type management
- **`POST /api/service-types`** - Configure service types
- **`GET /api/technicians`** - Technician management
- **`POST /api/technicians`** - Manage technicians

---

## 🔐 **SECURITY & VALIDATION APIs**

### **Verification**
- **`GET /api/verification-codes`** - Verification code management
- **`POST /api/verification-codes`** - Generate verification codes
- **`GET /api/check-verification-code`** - Validate verification codes
- **`POST /api/init-verification`** - Initialize verification

### **Authentication**
- **`GET /api/test-auth-working`** - Authentication testing
- **`POST /api/test-env`** - Environment validation

---

## 📈 **BUSINESS INTELLIGENCE APIs**

### **Customer Analytics**
- **`GET /api/test-customer-service-history`** - Customer service analysis
- **`GET /api/customer-activity`** - Customer activity tracking

### **Revenue Analytics**
- **`GET /api/costs`** - Revenue and cost analysis
- **`GET /api/tyre-pricing-analysis`** - Specialized pricing analysis

---

## 🚀 **DEPLOYMENT & MAINTENANCE APIs**

### **System Maintenance**
- **`GET /api/maintenance`** - System maintenance operations
- **`POST /api/maintenance`** - Execute maintenance tasks
- **`GET /api/clear-cache`** - Cache management
- **`POST /api/clear-cache`** - Clear system cache

### **Data Management**
- **`POST /api/bulk-processing`** - Bulk data operations
- **`GET /api/optimize-csv`** - CSV optimization
- **`POST /api/remove-sample-data`** - Remove test data

---

## 📋 **SPECIALIZED ENDPOINTS**

### **Document Management**
- **`GET /api/documents`** - Document management
- **`POST /api/documents`** - Upload documents
- **`GET /api/search-documents`** - Document search

### **Booking System**
- **`GET /api/bookings`** - Booking management
- **`POST /api/bookings`** - Create booking
- **`PUT /api/bookings`** - Update booking

### **Email Management**
- **`GET /api/email`** - Email operations
- **`POST /api/email`** - Send email

---

## 🎯 **API CATEGORIES SUMMARY**

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Vehicle Management** | 80+ | Vehicle data, MOT, technical specs |
| **Customer Management** | 30+ | Customer operations and tracking |
| **Job Management** | 40+ | Job sheets, tasks, line items |
| **Communication** | 60+ | SMS, WhatsApp, email, campaigns |
| **Financial** | 25+ | Invoicing, parts, pricing |
| **Database** | 50+ | Import, export, backup, integrity |
| **Integration** | 40+ | External APIs and services |
| **Testing & Debug** | 80+ | System testing and validation |
| **Analytics** | 30+ | Business intelligence and reporting |
| **Configuration** | 20+ | Settings and system config |
| **Security** | 15+ | Authentication and validation |
| **Maintenance** | 20+ | System maintenance and optimization |

---

## 🌟 **ENTERPRISE FEATURES**

### **High Availability**
- Multiple deployment endpoints
- Fallback systems
- Error handling and recovery
- Performance optimization

### **Scalability**
- Bulk processing capabilities
- Optimized data queries
- Caching strategies
- Load balancing ready

### **Security**
- Authentication systems
- Data validation
- Secure API endpoints
- GDPR compliance

### **Integration Ready**
- RESTful API design
- Webhook support
- External service integration
- Real-time data sync

---

This comprehensive API ecosystem provides **complete business management capabilities** with **546 endpoints** covering every aspect of garage operations, from vehicle management to customer communication, financial tracking, and business intelligence! 🚀
