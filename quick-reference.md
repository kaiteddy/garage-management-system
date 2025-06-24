# Garage Management System - Quick Reference Guide

## Core Components

| Component        | Description          | Key Files                   |
| ---------------- | -------------------- | --------------------------- |
| **Flask App**    | Main web application | `src/app.py`, `src/main.py` |
| **Models**       | Database models      | `src/models/` directory     |
| **Routes**       | HTTP endpoints       | `src/routes/` directory     |
| **API Routes**   | REST API endpoints   | `src/routes/api/` directory |
| **Services**     | Business logic       | `src/services/` directory   |
| **Frontend**     | UI components        | `src/static/` directory     |
| **MOT Reminder** | MOT tracking service | `mot_reminder/` directory   |

## Key Services

| Service                     | Purpose                       | File                                         |
| --------------------------- | ----------------------------- | -------------------------------------------- |
| **AuditService**            | Logging and auditing          | `src/services/audit_service.py`              |
| **CSVImportService**        | Data import from CSV          | `src/services/csv_import_service.py`         |
| **CustomerPortalService**   | Customer portal functionality | `src/services/customer_portal_service.py`    |
| **DigitalJobSheetsService** | Digital job sheets            | `src/services/digital_job_sheets_service.py` |
| **EnhancedDVSAService**     | DVSA integration              | `src/services/enhanced_dvsa_service.py`      |
| **GoogleDriveService**      | Google Drive integration      | `src/services/google_drive_service.py`       |
| **IntelligentSearchEngine** | Advanced search               | `src/services/intelligent_search.py`         |
| **PartsSupplierService**    | Parts management              | `src/services/parts_supplier_service.py`     |
| **VATService**              | VAT calculations              | `src/services/vat_service.py`                |
| **WorkshopDiaryService**    | Workshop scheduling           | `src/services/workshop_diary_service.py`     |

## API Endpoints

| Endpoint             | Purpose                 | File                                 |
| -------------------- | ----------------------- | ------------------------------------ |
| `/api/customers`     | Customer management     | `src/routes/api/customer_api.py`     |
| `/api/vehicles`      | Vehicle management      | `src/routes/api/vehicle_api.py`      |
| `/api/jobs`          | Job management          | `src/routes/api/job_api.py`          |
| `/api/invoices`      | Invoice management      | `src/routes/api/invoice_api.py`      |
| `/api/stats`         | Dashboard statistics    | `src/routes/api/dashboard_api.py`    |
| `/api/search`        | Search functionality    | `src/routes/api/search_api.py`       |
| `/api/technicians`   | Technician management   | `src/routes/api/technician_api.py`   |
| `/api/workshop-bays` | Workshop bay management | `src/routes/api/workshop_bay_api.py` |

## Frontend Pages

| Page ID          | Purpose             | Content Div                |
| ---------------- | ------------------- | -------------------------- |
| `dashboard`      | Main dashboard      | `dashboard-content`        |
| `customers`      | Customer management | `customers-content`        |
| `vehicles`       | Vehicle management  | `vehicles-content`         |
| `jobs`           | Job management      | `jobs-content`             |
| `workshop-diary` | Workshop scheduling | `workshop-diary-container` |
| `job-sheets`     | Job sheets          | `job-sheets-container`     |
| `mot-reminders`  | MOT reminders       | N/A (direct content)       |
| `invoices`       | Invoice management  | `invoices-container`       |
| `settings`       | System settings     | N/A (direct content)       |

## JavaScript Modules

| Module            | Purpose                    | File                              |
| ----------------- | -------------------------- | --------------------------------- |
| **API**           | API communication          | `src/static/js/api.js`            |
| **App**           | Application initialization | `src/static/js/app.js`            |
| **Navigation**    | Page navigation            | `src/static/js/navigation.js`     |
| **KanbanBoard**   | Kanban board UI            | `src/static/js/kanban-board.js`   |
| **WorkshopDiary** | Workshop diary UI          | `src/static/js/workshop-diary.js` |
| **MOTDashboard**  | MOT dashboard UI           | `src/static/js/mot-dashboard.js`  |

## Database Models

| Model           | Purpose                  | Defined In               |
| --------------- | ------------------------ | ------------------------ |
| **Customer**    | Customer information     | `src/models/__init__.py` |
| **Vehicle**     | Vehicle information      | `src/models/vehicle.py`  |
| **User**        | User authentication      | `src/models/user.py`     |
| **Job**         | Job information          | `src/models/__init__.py` |
| **Technician**  | Technician information   | `src/models/__init__.py` |
| **WorkshopBay** | Workshop bay information | `src/models/__init__.py` |
| **Appointment** | Appointment scheduling   | `src/models/__init__.py` |
| **JobSheet**    | Digital job sheet        | `src/models/__init__.py` |
| **Invoice**     | Invoice information      | `src/models/__init__.py` |
| **Part**        | Parts inventory          | `src/models/__init__.py` |

## External Integrations

| Integration         | Purpose              | Key Files                                |
| ------------------- | -------------------- | ---------------------------------------- |
| **DVSA**            | MOT data retrieval   | `src/services/enhanced_dvsa_service.py`  |
| **Google Drive**    | File synchronization | `src/services/google_drive_service.py`   |
| **SMS Gateway**     | SMS notifications    | `mot_reminder/sms_service.py`            |
| **Parts Suppliers** | Parts ordering       | `src/services/parts_supplier_service.py` |
| **VAT API**         | VAT submission       | `src/services/vat_service.py`            |

## Common Workflows

### Customer and Vehicle Management

1. Create/update customer (`/api/customers`)
2. Create/update vehicle (`/api/vehicles`)
3. Link vehicle to customer

### Job Creation and Processing

1. Create job (`/api/jobs`)
2. Assign technician and bay
3. Update job status
4. Add parts and labor
5. Complete job
6. Generate invoice

### MOT Reminder Process

1. Import vehicle registrations
2. Check MOT expiry dates via DVSA
3. Filter vehicles by expiry date
4. Send SMS reminders
5. Track delivery status

### Google Drive Sync

1. Configure folder mappings
2. Detect file changes
3. Download and process files
4. Import data into system
5. Update sync status

## Configuration Files

| File                                      | Purpose                            |
| ----------------------------------------- | ---------------------------------- |
| `config/google_drive_config.json`         | Google Drive configuration         |
| `config/google_credentials_template.json` | Google API credentials template    |
| `docker-compose.yml`                      | Docker configuration               |
| `gunicorn.conf.py`                        | Gunicorn WSGI server configuration |
| `nginx.conf`                              | Nginx web server configuration     |

## Deployment Scripts

| Script                       | Purpose                      |
| ---------------------------- | ---------------------------- |
| `deploy.sh`                  | Deployment script            |
| `start_integrated_system.py` | Start integrated system      |
| `start_mot_service.py`       | Start MOT service            |
| `start_production.sh`        | Start production environment |
| `stop_garage.sh`             | Stop garage services         |
