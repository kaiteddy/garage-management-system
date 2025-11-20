#!/bin/bash

# Export environment variables
export DVLA_API_KEY=AXPW4KqAyS4G7eb53rav46TzufDC3a1v2yJUCJAi
export DATABASE_URL=postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Run the update script
npx tsx scripts/update-vehicles-with-dvla.ts
