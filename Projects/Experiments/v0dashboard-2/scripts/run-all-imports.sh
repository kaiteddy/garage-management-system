#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f "../.env.local" ]; then
  export $(grep -v '^#' ../.env.local | xargs)
fi

# Check if data directory is provided
if [ -z "$1" ]; then
  echo "Error: Please provide the path to the directory containing the CSV files"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in .env.local"
  exit 1
fi

# Ensure the directory exists
if [ ! -d "$1" ]; then
  echo "Error: Directory $1 does not exist"
  exit 1
fi

# Initialize the database
echo "=== Initializing database ==="
./run-init-db.sh

echo -e "\n=== Starting imports ==="

# Import customers
echo -e "\n=== Importing customers ==="
if [ -f "$1/Customers.csv" ]; then
  ./run-customer-import.sh "$1/Customers.csv"
else
  echo "Warning: Customers.csv not found in $1"
fi

# Import vehicles
echo -e "\n=== Importing vehicles ==="
if [ -f "$1/Vehicles.csv" ]; then
  ./run-vehicle-import.sh "$1/Vehicles.csv"
else
  echo "Warning: Vehicles.csv not found in $1"
fi

# Import documents
echo -e "\n=== Importing documents ==="
if [ -f "$1/Documents.csv" ]; then
  ./run-document-import.sh "$1/Documents.csv"
else
  echo "Warning: Documents.csv not found in $1"
fi

# Import appointments
echo -e "\n=== Importing appointments ==="
if [ -f "$1/Appointments.csv" ]; then
  ./run-appointment-import.sh "$1/Appointments.csv"
else
  echo "Warning: Appointments.csv not found in $1"
fi

# Import reminders
echo -e "\n=== Importing reminders ==="
if [ -f "$1/Reminders.csv" ]; then
  ./run-reminder-import.sh "$1/Reminders.csv"
else
  echo "Warning: Reminders.csv not found in $1"
fi

# Import stock
echo -e "\n=== Importing stock ==="
if [ -f "$1/Stock.csv" ]; then
  ./run-stock-import.sh "$1/Stock.csv"
else
  echo "Warning: Stock.csv not found in $1"
fi

# Import line items
echo -e "\n=== Importing line items ==="
if [ -f "$1/LineItems.csv" ]; then
  ./run-line-items-import.sh "$1/LineItems.csv"
else
  echo "Warning: LineItems.csv not found in $1"
fi

# Import receipts
echo -e "\n=== Importing receipts ==="
if [ -f "$1/Receipts.csv" ]; then
  ./run-receipts-import.sh "$1/Receipts.csv"
else
  echo "Warning: Receipts.csv not found in $1"
fi

# Import document extras
echo -e "\n=== Importing document extras ==="
if [ -f "$1/Document_Extras.csv" ]; then
  ./run-document-extras-import.sh "$1/Document_Extras.csv"
else
  echo "Warning: Document_Extras.csv not found in $1"
fi

echo -e "\n=== All imports completed successfully! ==="
