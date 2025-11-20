# Vehicle Service Management System

A comprehensive vehicle service management system built with Next.js, featuring:

- Vehicle database management
- Real-time MOT checking via DVSA API
- DVLA vehicle information lookup
- Customer management
- Job sheet analysis
- Document tracking

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
3. **DVSA API Key** - [Request one here](https://www.gov.uk/guidance/mot-history-request-an-api-key)
4. **DVLA API Key** - [Request one here](https://www.gov.uk/vehicle-enquiry-api)

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
   - Copy `.env.local.example` to `.env.local`
   - Add your DVSA and DVLA API keys
   
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

4. Run the development server:
   \`\`\`bash
   pnpm dev
   \`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Integration

### DVSA MOT History API

The system integrates with the DVSA MOT History API to provide:
- Complete MOT test history
- Test results and advisories
- Mileage records
- Test expiry dates

### DVLA Vehicle Enquiry API

The system uses the DVLA API to retrieve:
- Vehicle details (make, model, color, etc.)
- Tax status and due dates
- MOT status and expiry
- Engine size and CO2 emissions

### Development Mode

By default, the application runs in development mode with mock data. To use the real APIs:

1. Set `NEXT_PUBLIC_USE_MOCK_DATA=false` in `.env.local`
2. Ensure your API keys are correctly set
3. Restart the development server

## Tech Stack

- **Frontend**:
  - Next.js 14 (App Router)
  - TypeScript
  - Tailwind CSS
  - shadcn/ui components
  - React Hook Form
  - Zod (for validation)

- **APIs**:
  - DVSA MOT History API
  - DVLA Vehicle Enquiry API
  - Next.js API Routes

- **Development Tools**:
  - ESLint
  - Prettier
  - TypeScript
  - pnpm
