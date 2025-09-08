#!/bin/bash

# Export environment variables
export DATABASE_URL=postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
export DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Run the check script
npx tsx scripts/check-incomplete-vehicles.ts
