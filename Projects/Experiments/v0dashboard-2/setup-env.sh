#!/bin/bash

# Create .env.local file with the provided configuration
cat > .env.local << 'EOL'
# ====================================
# Database Configuration
# ====================================

# Standard database URL (with connection pooling - recommended for most use cases)
DATABASE_URL=postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Direct database URL (without connection pooling - for transactions)
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Prisma-specific database URL
POSTGRES_PRISMA_URL=postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?connect_timeout=15&sslmode=require

# ====================================
# DVSA API Configuration
# ====================================

# DVSA MOT History API credentials
# These values should match exactly what was provided in your DVSA credentials email
DVSA_TENANT_ID=a455b827-244f-4c97-b5b4-ce5d13b4d00c
DVSA_CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
DVSA_CLIENT_SECRET=rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74
DVSA_API_KEY=8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq

# DVSA API endpoints - these typically don't change
DVSA_API_BASE_URL=https://history.mot.api.gov.uk/v1/trade/vehicles
DVSA_SCOPE=https://tapi.dvsa.gov.uk/.default

# ====================================
# DVLA API Configuration
# ====================================

# DVLA Vehicle Enquiry API key
DVLA_API_KEY=AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi

# ====================================
# Application Settings
# ====================================

# Base URL for the application (Production)
NEXT_PUBLIC_APP_URL=https://app.elimotors.co.uk

# Local development URL (uncomment for local development)
# NEXT_PUBLIC_APP_URL=http://localhost:3002

# Environment (development, production, test)
NODE_ENV=production

# ====================================
# Cloudflare Tunnel Configuration
# ====================================

# Production URLs
PRODUCTION_GARAGE_URL=https://app.elimotors.co.uk
PRODUCTION_INTELLIGENCE_URL=https://intelligence.elimotors.co.uk

# Cloudflare Account Details
CLOUDFLARE_ACCOUNT_ID=a1c77c1b106d54b2afdca84dc8c54e7d
CLOUDFLARE_ZONE=elimotors.co.uk
EOL

echo ".env.local file has been created successfully!"

# Verify the file was created
if [ -f ".env.local" ]; then
    echo "Verification: .env.local exists"
    echo "First few lines of .env.local:"
    head -n 5 .env.local
else
    echo "Error: Failed to create .env.local file"
    exit 1
fi

# Make the script executable
chmod +x setup-env.sh

echo ""
echo "To complete setup, run the following command:"
echo "  ./setup-env.sh"
