# Garage Management System - Code Index

## Overview

The Garage Management System is a comprehensive application designed to manage all aspects of a garage business, including customer management, vehicle tracking, job scheduling, MOT reminders, invoicing, and more. The system consists of a Python backend with a Flask web framework and a JavaScript/HTML/CSS frontend.

## System Architecture

### Backend Architecture

The system follows a modular architecture with the following components:

1. **Core Application** - Flask-based web application (`src/app.py`, `src/main.py`)
2. **Models** - Database models for entities like customers, vehicles, jobs, etc.
3. **Routes** - HTTP endpoints for different features
4. **Services** - Business logic implementation
5. **API** - RESTful API endpoints for frontend communication
6. **Utilities** - Helper functions and tools

### Frontend Architecture

The frontend is built with vanilla JavaScript, HTML, and CSS, following a component-based approach:

1. **Core UI** - Main layout and navigation (`src/static/index.html`)
2. **JavaScript Modules** - Modular JS files for different features
3. **CSS Styles** - Professional UI styling
4. **Components** - Reusable UI components

## Backend Components

### Core Application

| File                   | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `src/app.py`           | Main Flask application setup, route registration, and initialization |
| `src/main.py`          | Application entry point                                              |
| `src/config.py`        | Configuration settings for different environments                    |
| `src/create_tables.py` | Database table creation and initialization                           |
| `src/init_database.py` | Database initialization and setup                                    |
| `src/migrate_db.py`    | Database migration utilities                                         |

### Models

| File                     | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `src/models/__init__.py` | Model initialization and common utilities       |
| `src/models/user.py`     | User model for authentication and authorization |
| `src/models/vehicle.py`  | Vehicle model with DVLA data integration        |

### Routes

| File                                      | Description                       |
| ----------------------------------------- | --------------------------------- |
| `src/routes/__init__.py`                  | Routes initialization             |
| `src/routes/audit_routes.py`              | Audit trail and logging endpoints |
| `src/routes/booking_routes.py`            | Appointment booking endpoints     |
| `src/routes/customer_portal_routes.py`    | Customer portal access endpoints  |
| `src/routes/customer_routes.py`           | Customer management endpoints     |
| `src/routes/dashboard_routes.py`          | Dashboard data endpoints          |
| `src/routes/digital_job_sheets_routes.py` | Digital job sheets management     |
| `src/routes/enhanced_dvsa_routes.py`      | DVSA integration for MOT data     |
| `src/routes/error_routes.py`              | Error handling and reporting      |
| `src/routes/gdpr_routes.py`               | GDPR compliance endpoints         |
| `src/routes/google_drive_routes.py`       | Google Drive integration          |
| `src/routes/invoice_routes.py`            | Invoice management                |
| `src/routes/job_routes.py`                | Job management                    |
| `src/routes/parts_supplier_routes.py`     | Parts and supplier management     |
| `src/routes/upload_routes.py`             | File upload handling              |
| `src/routes/user.py`                      | User management                   |
| `src/routes/vat_routes.py`                | VAT calculation and reporting     |
| `src/routes/vehicle_routes.py`            | Vehicle management                |
| `src/routes/workshop_diary_routes.py`     | Workshop scheduling               |

### API Routes

| File                                 | Description                        |
| ------------------------------------ | ---------------------------------- |
| `src/routes/api/appointment_api.py`  | Appointment API endpoints          |
| `src/routes/api/customer_api.py`     | Customer API endpoints             |
| `src/routes/api/dashboard_api.py`    | Dashboard data API endpoints       |
| `src/routes/api/invoice_api.py`      | Invoice API endpoints              |
| `src/routes/api/job_api.py`          | Job API endpoints                  |
| `src/routes/api/parts_api.py`        | Parts API endpoints                |
| `src/routes/api/quote_api.py`        | Quote API endpoints                |
| `src/routes/api/reports_api.py`      | Reports API endpoints              |
| `src/routes/api/search_api.py`       | Search functionality API endpoints |
| `src/routes/api/technician_api.py`   | Technician API endpoints           |
| `src/routes/api/vehicle_api.py`      | Vehicle API endpoints              |
| `src/routes/api/workshop_bay_api.py` | Workshop bay API endpoints         |

### Services

| File                                         | Description                            |
| -------------------------------------------- | -------------------------------------- |
| `src/services/audit_service.py`              | Audit logging and tracking             |
| `src/services/csv_import_service.py`         | CSV data import functionality          |
| `src/services/customer_portal_service.py`    | Customer portal business logic         |
| `src/services/digital_job_sheets_service.py` | Digital job sheets management          |
| `src/services/enhanced_dvsa_service.py`      | Enhanced DVSA integration for MOT data |
| `src/services/error_monitoring_service.py`   | Error monitoring and reporting         |
| `src/services/gdpr_service.py`               | GDPR compliance functionality          |
| `src/services/google_drive_service.py`       | Google Drive integration for file sync |
| `src/services/intelligent_data_linking.py`   | Smart data linking between entities    |
| `src/services/intelligent_search.py`         | Advanced search functionality          |
| `src/services/parts_supplier_service.py`     | Parts and supplier management          |
| `src/services/search_optimization.py`        | Search performance optimization        |
| `src/services/vat_service.py`                | VAT calculation and reporting          |
| `src/services/workshop_diary_service.py`     | Workshop scheduling and management     |

### Utilities

| File                                | Description                             |
| ----------------------------------- | --------------------------------------- |
| `src/automated_fix_engine.py`       | Automated error fixing                  |
| `src/data_import_service.py`        | Data import functionality               |
| `src/data_loader.py`                | Data loading utilities                  |
| `src/deepsource_fix_manager.py`     | DeepSource integration for code quality |
| `src/deepsource_webhook_handler.py` | DeepSource webhook handling             |
| `src/import_ga4_data.py`            | Google Analytics 4 data import          |
| `src/mot_service.py`                | MOT service integration                 |

## Frontend Components

### HTML/CSS

| File                                 | Description                  |
| ------------------------------------ | ---------------------------- |
| `src/static/index.html`              | Main application HTML        |
| `src/static/css/components.css`      | UI component styles          |
| `src/static/css/job-sheets.css`      | Job sheets specific styles   |
| `src/static/css/kanban-board.css`    | Kanban board styles          |
| `src/static/components/header.html`  | Header component             |
| `src/static/components/sidebar.html` | Sidebar navigation component |

### JavaScript

| File                                    | Description                           |
| --------------------------------------- | ------------------------------------- |
| `src/static/js/api.js`                  | API communication module with caching |
| `src/static/js/app.js`                  | Main application initialization       |
| `src/static/js/emergency-protection.js` | Error prevention and recovery         |
| `src/static/js/intelligent-search.js`   | Advanced search functionality         |
| `src/static/js/navigation.js`           | Navigation handling                   |
| `src/static/js/layout-manager.js`       | UI layout management                  |
| `src/static/js/kanban-board.js`         | Kanban board functionality            |
| `src/static/js/workshop-diary.js`       | Workshop diary functionality          |
| `src/static/js/job-sheets.js`           | Job sheets functionality              |
| `src/static/js/online-booking.js`       | Online booking functionality          |
| `src/static/js/customer-portal.js`      | Customer portal functionality         |
| `src/static/js/mot-dashboard.js`        | MOT dashboard functionality           |
| `src/static/js/error-monitoring.js`     | Error monitoring functionality        |

## Integration Components

### MOT Reminder Service

| File                                        | Description                      |
| ------------------------------------------- | -------------------------------- |
| `mot_reminder/app.py`                       | MOT reminder service application |
| `mot_reminder/mot_reminder.py`              | MOT reminder core functionality  |
| `mot_reminder/sms_service.py`               | SMS service for MOT reminders    |
| `mot_reminder/templates/index.html`         | MOT reminder service UI          |
| `mot_reminder/templates/sms_dashboard.html` | SMS dashboard UI                 |

### Google Drive Integration

| File                                   | Description                      |
| -------------------------------------- | -------------------------------- |
| `src/services/google_drive_service.py` | Google Drive integration service |
| `config/google_drive_config.json`      | Google Drive configuration       |
| `config/google_drive_setup.md`         | Google Drive setup documentation |

## Configuration and Deployment

| File                                      | Description                         |
| ----------------------------------------- | ----------------------------------- |
| `config/deepsource_config.json`           | DeepSource configuration            |
| `config/google_credentials_template.json` | Google API credentials template     |
| `docker-compose.yml`                      | Docker Compose configuration        |
| `Dockerfile`                              | Docker container definition         |
| `garage-management.service`               | Systemd service definition          |
| `gunicorn.conf.py`                        | Gunicorn WSGI server configuration  |
| `nginx.conf`                              | Nginx web server configuration      |
| `requirements.txt`                        | Python dependencies                 |
| `requirements-docker.txt`                 | Docker-specific Python dependencies |

## Scripts and Utilities

| File                                     | Description                  |
| ---------------------------------------- | ---------------------------- |
| `scripts/setup_deepsource_automation.sh` | DeepSource automation setup  |
| `scripts/test_categorization.py`         | Test data categorization     |
| `deploy.sh`                              | Deployment script            |
| `start_integrated_system.py`             | Start integrated system      |
| `start_mot_service.py`                   | Start MOT service            |
| `start_production.sh`                    | Start production environment |
| `stop_garage.sh`                         | Stop garage services         |

## Documentation

| File                            | Description                         |
| ------------------------------- | ----------------------------------- |
| `docs/API.md`                   | API documentation                   |
| `docs/CHANGELOG.md`             | Change log                          |
| `docs/CONTRIBUTING.md`          | Contribution guidelines             |
| `docs/DATA_IMPORT_GUIDE.md`     | Data import guide                   |
| `docs/DEEPSOURCE_AUTOMATION.md` | DeepSource automation documentation |
| `docs/DVSA_INTEGRATION.md`      | DVSA integration documentation      |
| `docs/QUICK_START_GUIDE.md`     | Quick start guide                   |
| `docs/SECURITY.md`              | Security documentation              |
| `docs/SETTINGS_GUIDE.md`        | Settings guide                      |
| `docs/SETUP.md`                 | Setup documentation                 |

## Key Features

1. **Customer Management**

   - Customer database with contact information
   - Customer history and activity tracking
   - GDPR compliance features

2. **Vehicle Management**

   - Vehicle database with technical details
   - MOT and tax expiry tracking
   - DVSA integration for MOT data

3. **Job Management**

   - Job creation and tracking
   - Digital job sheets
   - Technician assignment

4. **Workshop Management**

   - Workshop diary for scheduling
   - Bay allocation
   - Technician workload management

5. **MOT Reminders**

   - Automatic MOT expiry tracking
   - SMS reminders
   - Bulk upload of vehicle registrations

6. **Invoicing**

   - Invoice generation
   - VAT calculation
   - Payment tracking

7. **Parts Management**

   - Parts inventory
   - Supplier management
   - Parts ordering

8. **Reporting**

   - Business performance reports
   - Revenue tracking
   - Customer and vehicle statistics

9. **Google Drive Integration**

   - Automatic file synchronization
   - CSV/Excel import from Drive
   - Data backup

10. **Error Monitoring**
    - System error tracking
    - Automated error fixing
    - Performance monitoring

## Data Flow

1. **Customer Data Flow**

   - Customer creation via UI or CSV import
   - Customer data linked to vehicles and jobs
   - Customer history updated with activities

2. **Vehicle Data Flow**

   - Vehicle creation via UI, CSV import, or DVLA lookup
   - MOT data retrieved from DVSA
   - Vehicle linked to customers and jobs

3. **Job Data Flow**

   - Job creation from customer/vehicle context
   - Job assignment to technicians and bays
   - Job status updates through workflow
   - Job completion and invoice generation

4. **MOT Reminder Flow**

   - Vehicle MOT expiry tracked
   - Reminders scheduled based on expiry date
   - SMS sent to customers
   - Reminder status tracked

5. **Google Drive Sync Flow**
   - Files monitored in configured Drive folders
   - New/updated files detected and downloaded
   - Data imported into system
   - Sync history recorded

## Database Schema

The system uses SQLite (development) or PostgreSQL (production) with the following main tables:

1. **Users** - System users and authentication
2. **Customers** - Customer information
3. **Vehicles** - Vehicle details and MOT information
4. **Jobs** - Repair and service jobs
5. **JobSheets** - Digital job sheets
6. **Technicians** - Garage technicians
7. **WorkshopBays** - Physical workshop bays
8. **Appointments** - Scheduled appointments
9. **Invoices** - Customer invoices
10. **Parts** - Parts inventory
11. **Suppliers** - Parts suppliers
12. **Quotes** - Customer quotes
13. **MOTVehicles** - MOT tracking specific data
14. **SMSHistory** - History of sent SMS messages

## API Endpoints

The system provides a comprehensive API for frontend communication:

1. **Customer API** - `/api/customers`
2. **Vehicle API** - `/api/vehicles`
3. **Job API** - `/api/jobs`
4. **Invoice API** - `/api/invoices`
5. **Dashboard API** - `/api/stats`, `/api/recent-activity`
6. **Search API** - `/api/search`
7. **Workshop API** - `/api/workshop-bays`, `/api/technicians`
8. **Appointment API** - `/api/appointments`
9. **Parts API** - `/api/parts`
10. **Quote API** - `/api/quotes`
11. **Reports API** - `/api/reports`

## Frontend Pages

The UI consists of the following main pages:

1. **Dashboard** - Overview of garage operations
2. **Customers** - Customer management
3. **Vehicles** - Vehicle management
4. **Jobs** - Job management
5. **Workshop Diary** - Workshop scheduling
6. **Job Sheets** - Digital job sheets
7. **Quotes** - Quote management
8. **Online Booking** - Online booking management
9. **Customer Portal** - Customer portal management
10. **MOT Reminders** - MOT reminder management
11. **Parts** - Parts management
12. **Invoices** - Invoice management
13. **Reports** - Business reporting
14. **Settings** - System configuration

## Integration Points

1. **DVSA Integration** - MOT data retrieval
2. **Google Drive Integration** - File synchronization
3. **SMS Gateway Integration** - SMS sending for MOT reminders
4. **Parts Supplier APIs** - Parts ordering and lookup
5. **VAT API Integration** - VAT submission to HMRC

## System Architecture Visualization

The system architecture is visualized using Mermaid diagrams in HTML files:

| File                       | Description                                 |
| -------------------------- | ------------------------------------------- |
| `system-architecture.html` | Comprehensive system architecture diagrams  |
| `index.html`               | Main landing page with architecture preview |

### Architecture Diagrams

1. **System Architecture Diagram** - High-level overview of the system components
2. **Component Relationships** - Detailed relationships between system components
3. **Data Flow Diagram** - Visualization of data flow through the system
4. **MOT Reminder Service Flow** - Process flow for MOT reminder service
5. **Google Drive Integration Flow** - Process flow for Google Drive integration
6. **User Authentication Flow** - Authentication process flow
7. **Job Management Flow** - Job lifecycle management flow

### Mermaid Configuration

The Mermaid diagrams are configured with the following settings for optimal rendering:

```javascript
mermaid.initialize({
  startOnLoad: true,
  theme: "default",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: "basis",
  },
  themeVariables: {
    primaryColor: "#f0f8ff",
    primaryTextColor: "#003366",
    primaryBorderColor: "#7fb1ff",
    lineColor: "#666666",
    secondaryColor: "#ffffde",
    tertiaryColor: "#fff0f0",
  },
});
```

These settings ensure:

- Diagrams are properly sized and fit within their containers
- Text is readable with appropriate colors
- Connections between elements have smooth curves
- Color scheme is consistent and visually appealing
