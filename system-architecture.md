# Garage Management System - System Architecture

## System Architecture Diagram

```mermaid
graph TD
    subgraph "Frontend"
        UI[HTML/CSS UI]
        JS[JavaScript Modules]
        API_Client[API Client]
    end

    subgraph "Backend"
        Flask[Flask Application]
        Routes[Routes]
        API_Routes[API Routes]
        Services[Services]
        Models[Models]
        DB[(Database)]
    end

    subgraph "Integrations"
        DVSA[DVSA Integration]
        GoogleDrive[Google Drive]
        SMS[SMS Gateway]
        PartsAPI[Parts Supplier APIs]
        VATAPI[VAT API]
    end

    UI --> JS
    JS --> API_Client
    API_Client --> API_Routes
    
    Flask --> Routes
    Flask --> API_Routes
    Routes --> Services
    API_Routes --> Services
    Services --> Models
    Models --> DB
    
    Services --> DVSA
    Services --> GoogleDrive
    Services --> SMS
    Services --> PartsAPI
    Services --> VATAPI
```

## Component Relationships

```mermaid
graph TD
    subgraph "Core Components"
        App[app.py]
        Config[config.py]
        Main[main.py]
    end

    subgraph "Data Layer"
        Models[Models]
        DB[(Database)]
        DataLoader[data_loader.py]
        DataImport[data_import_service.py]
    end

    subgraph "Business Logic"
        CustomerService[Customer Services]
        VehicleService[Vehicle Services]
        JobService[Job Services]
        WorkshopService[Workshop Services]
        MOTService[MOT Services]
        InvoiceService[Invoice Services]
        SearchService[Search Services]
    end

    subgraph "API Layer"
        CustomerAPI[Customer API]
        VehicleAPI[Vehicle API]
        JobAPI[Job API]
        WorkshopAPI[Workshop API]
        MOTAPI[MOT API]
        InvoiceAPI[Invoice API]
        SearchAPI[Search API]
    end

    subgraph "Frontend"
        UI[HTML/CSS UI]
        JS[JavaScript]
        APIClient[API Client]
    end

    App --> Config
    Main --> App
    
    App --> Models
    Models --> DB
    DataLoader --> DB
    DataImport --> DB
    
    App --> CustomerService
    App --> VehicleService
    App --> JobService
    App --> WorkshopService
    App --> MOTService
    App --> InvoiceService
    App --> SearchService
    
    CustomerService --> Models
    VehicleService --> Models
    JobService --> Models
    WorkshopService --> Models
    MOTService --> Models
    InvoiceService --> Models
    SearchService --> Models
    
    App --> CustomerAPI
    App --> VehicleAPI
    App --> JobAPI
    App --> WorkshopAPI
    App --> MOTAPI
    App --> InvoiceAPI
    App --> SearchAPI
    
    CustomerAPI --> CustomerService
    VehicleAPI --> VehicleService
    JobAPI --> JobService
    WorkshopAPI --> WorkshopService
    MOTAPI --> MOTService
    InvoiceAPI --> InvoiceService
    SearchAPI --> SearchService
    
    APIClient --> CustomerAPI
    APIClient --> VehicleAPI
    APIClient --> JobAPI
    APIClient --> WorkshopAPI
    APIClient --> MOTAPI
    APIClient --> InvoiceAPI
    APIClient --> SearchAPI
    
    JS --> APIClient
    UI --> JS
```

## Data Flow Diagram

```mermaid
graph TD
    subgraph "User Interfaces"
        WebUI[Web UI]
        CustomerPortal[Customer Portal]
    end

    subgraph "API Layer"
        API[API Endpoints]
    end

    subgraph "Business Logic"
        Services[Services]
        DataProcessing[Data Processing]
    end

    subgraph "Data Storage"
        DB[(Database)]
        GoogleDrive[(Google Drive)]
    end

    subgraph "External Systems"
        DVSA[DVSA API]
        SMS[SMS Gateway]
        PartsSuppliers[Parts Suppliers]
        HMRC[HMRC VAT API]
    end

    WebUI -->|User Actions| API
    CustomerPortal -->|Customer Actions| API
    
    API -->|Process Requests| Services
    Services -->|Store/Retrieve Data| DB
    Services -->|Sync Files| GoogleDrive
    
    Services -->|MOT Checks| DVSA
    Services -->|Send Reminders| SMS
    Services -->|Order Parts| PartsSuppliers
    Services -->|Submit VAT| HMRC
    
    GoogleDrive -->|Import Data| DataProcessing
    DataProcessing -->|Process & Store| DB
    
    DB -->|Retrieve Data| Services
    Services -->|Return Results| API
    API -->|Display Data| WebUI
    API -->|Display Data| CustomerPortal
```

## MOT Reminder Service Flow

```mermaid
graph TD
    subgraph "MOT Reminder Process"
        CheckExpiry[Check MOT Expiry]
        FilterVehicles[Filter Vehicles by Expiry]
        PrepareReminders[Prepare Reminders]
        SendSMS[Send SMS]
        TrackDelivery[Track Delivery]
        UpdateStatus[Update Status]
    end

    subgraph "Data Sources"
        VehicleDB[(Vehicle Database)]
        DVSA[DVSA API]
        CustomerDB[(Customer Database)]
    end

    subgraph "External Services"
        SMSGateway[SMS Gateway]
    end

    VehicleDB -->|Get Vehicles| CheckExpiry
    DVSA -->|Verify MOT Data| CheckExpiry
    CheckExpiry -->|Vehicles with Expiry| FilterVehicles
    FilterVehicles -->|Expired/Soon to Expire| PrepareReminders
    CustomerDB -->|Get Contact Details| PrepareReminders
    PrepareReminders -->|Reminder Messages| SendSMS
    SendSMS -->|Send via Gateway| SMSGateway
    SMSGateway -->|Delivery Status| TrackDelivery
    TrackDelivery -->|Update Records| UpdateStatus
    UpdateStatus -->|Store Results| VehicleDB
```

## Google Drive Integration Flow

```mermaid
graph TD
    subgraph "Google Drive Sync"
        CheckFolders[Check Mapped Folders]
        DetectChanges[Detect File Changes]
        DownloadFiles[Download Changed Files]
        ProcessFiles[Process Files]
        ImportData[Import Data]
        UpdateSync[Update Sync Status]
    end

    subgraph "Data Sources"
        GDrive[(Google Drive)]
        ConfigFile[(Config File)]
    end

    subgraph "Data Destinations"
        DB[(Database)]
    end

    ConfigFile -->|Folder Mappings| CheckFolders
    CheckFolders -->|Folder IDs| DetectChanges
    GDrive -->|File Metadata| DetectChanges
    DetectChanges -->|Changed Files| DownloadFiles
    GDrive -->|File Content| DownloadFiles
    DownloadFiles -->|Local Files| ProcessFiles
    ProcessFiles -->|Structured Data| ImportData
    ImportData -->|Store Data| DB
    ImportData -->|Update Status| UpdateSync
    UpdateSync -->|Save Timestamp| ConfigFile
```

## User Authentication Flow

```mermaid
graph TD
    subgraph "Authentication Process"
        Login[Login Request]
        ValidateCredentials[Validate Credentials]
        GenerateToken[Generate JWT Token]
        ReturnToken[Return Token to Client]
        ValidateToken[Validate Token]
        AccessResource[Access Protected Resource]
    end

    subgraph "Data Sources"
        UserDB[(User Database)]
    end

    Login -->|Username/Password| ValidateCredentials
    UserDB -->|User Records| ValidateCredentials
    ValidateCredentials -->|Valid User| GenerateToken
    ValidateCredentials -->|Invalid User| Login
    GenerateToken -->|Token| ReturnToken
    ReturnToken -->|Store Token| Client
    Client -->|Request with Token| ValidateToken
    ValidateToken -->|Valid Token| AccessResource
    ValidateToken -->|Invalid Token| Login
```

## Job Management Flow

```mermaid
graph TD
    subgraph "Job Lifecycle"
        CreateJob[Create Job]
        AssignTechnician[Assign Technician]
        AllocateBay[Allocate Workshop Bay]
        UpdateStatus[Update Job Status]
        AddParts[Add Parts]
        CompleteJob[Complete Job]
        GenerateInvoice[Generate Invoice]
    end

    subgraph "Data Sources"
        CustomerDB[(Customer Database)]
        VehicleDB[(Vehicle Database)]
        TechnicianDB[(Technician Database)]
        BayDB[(Workshop Bay Database)]
        PartsDB[(Parts Database)]
    end

    CustomerDB -->|Customer Info| CreateJob
    VehicleDB -->|Vehicle Info| CreateJob
    CreateJob -->|New Job| AssignTechnician
    TechnicianDB -->|Available Technicians| AssignTechnician
    AssignTechnician -->|Assigned Job| AllocateBay
    BayDB -->|Available Bays| AllocateBay
    AllocateBay -->|Scheduled Job| UpdateStatus
    UpdateStatus -->|In Progress| AddParts
    PartsDB -->|Parts Inventory| AddParts
    AddParts -->|Parts Added| CompleteJob
    CompleteJob -->|Completed Job| GenerateInvoice
    GenerateInvoice -->|Invoice| CustomerDB
