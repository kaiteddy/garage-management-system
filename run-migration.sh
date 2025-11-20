#!/bin/bash

# Load environment variables from .env.local
set -a
source .env.local
set +a

# Run the migration script
npx tsx scripts/add-document-extra-relation.ts
