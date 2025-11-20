# GarageManager - Vehicle Service Management System

✅ **MOT History API Approved** (November 20, 2025)

A comprehensive vehicle service management system built with Next.js, featuring:

- Vehicle database management
- Real-time MOT checking via DVSA API (OAuth 2.0)
- DVLA vehicle information lookup
- Customer management with SMS/WhatsApp integration
- Job sheet analysis and invoicing
- Document tracking and audit trails
- MOT reminder automation

## Features

- **Unified Dashboard**: Complete overview of vehicles, customers, and appointments
- **DVSA Integration**: Real-time MOT history and test results
- **DVLA Integration**: Vehicle details, tax status, and MOT expiry
- **Job Sheet Analysis**: Organized tabbed interface for service history
- **Customer Management**: Track customer information and vehicle relationships
- **Document Management**: Complete audit trail of all work performed

## Getting Started

### Prerequisites

1. **Node.js** (v18 or later)
2. **pnpm** (recommended) or npm
3. **PostgreSQL Database** - Neon or any PostgreSQL provider
4. **DVSA MOT API Credentials** - ✅ Already configured (see MOT_API_SETUP.md)
5. **DVLA API Key** - [Request one here](https://www.gov.uk/vehicle-enquiry-api) (optional)
6. **Twilio Account** - For SMS/WhatsApp features (optional)

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/vehicle-service-system.git
   cd vehicle-service-system
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update with your database URL and other credentials
   - DVSA MOT API credentials are already configured
   
   \`\`\`bash
   cp .env.example .env
   # Edit .env and add your DATABASE_URL
   \`\`\`
   
   **See `MOT_API_SETUP.md` for detailed API configuration**

4. Run the development server:
   \`\`\`bash
   pnpm dev
   \`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Integration

### DVSA MOT History API ✅ APPROVED

**Status:** Production credentials configured and ready to use

The system integrates with the DVSA MOT History API using OAuth 2.0 to provide:
- Complete MOT test history
- Test results and advisories  
- Mileage records
- Test expiry dates
- Dangerous/Major/Minor defects
- Automated MOT reminders

**Authentication:** OAuth 2.0 Client Credentials Flow  
**Documentation:** See `MOT_API_SETUP.md` for complete setup guide

### DVLA Vehicle Enquiry API

The system uses the DVLA API to retrieve:
- Vehicle details (make, model, color, etc.)
- Tax status and due dates
- MOT status and expiry
- Engine size and CO2 emissions

### Production Configuration

The application is configured for production use with real APIs:

1. **MOT API:** Already configured with approved credentials
2. **Database:** Add your `DATABASE_URL` to `.env`
3. **Optional Services:** Configure Twilio, DVLA, etc. as needed

See `.env.example` for all available configuration options.

## Tech Stack

- **Frontend**:
  - Next.js 15.2.4 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS
  - shadcn/ui components
  - React Hook Form
  - Zod (for validation)

- **Backend**:
  - Next.js API Routes
  - PostgreSQL (Neon)
  - OAuth 2.0 Authentication
  - Batch processing with parallel execution

- **APIs & Integrations**:
  - DVSA MOT History API (OAuth 2.0)
  - DVLA Vehicle Enquiry API
  - Twilio (SMS/WhatsApp)
  - Resend (Email)

- **Development Tools**:
  - ESLint
  - TypeScript
  - pnpm

## Key Features

### MOT Management
- **MOT Check** (`/mot-check`) - Manual MOT lookup
- **MOT Critical** (`/mot-critical`) - Vehicles with expired/expiring MOT
- **MOT Reminders** (`/mot-reminders`) - Automated reminder system
- **MOT Scan** (`/mot-scan`) - Batch MOT checking

### Customer & Vehicle Management
- Customer database with full history
- Vehicle registration and details
- Service history tracking
- Document management

### Job Management
- Job sheets (basic & advanced)
- Invoices and quotes
- Parts tracking
- Workshop management

### Communications
- SMS notifications
- WhatsApp Business integration
- Voice call logging
- Message templates

### Data Import
- CSV bulk import
- Automatic DVSA API integration during import
- Smart customer/vehicle matching
- Batch processing (500 records per batch, 3 parallel batches)

## Documentation

- **MOT_API_SETUP.md** - Complete MOT API configuration guide
- **MERGE_NOTES.md** - Latest merge and performance improvements
- **DEPLOYMENT_CHECKLIST.md** - Production deployment guide
- **.env.example** - All available environment variables

## Performance

- **10-20x faster imports** with batch processing
- **Parallel execution** (3 batches simultaneously)
- **Database indexes** for optimized queries
- **Smart caching** to reduce API calls
- **Bulk SQL inserts** with conflict handling

## Repository

**GitHub:** https://github.com/kaiteddy/garage-management-system  
**Latest Commit:** Build fixes and MOT API configuration
