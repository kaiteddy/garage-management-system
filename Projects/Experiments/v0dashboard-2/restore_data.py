#!/usr/bin/env python3
"""
Emergency Data Restore Script
Restores all garage management data from CSV files to Neon database
"""

import pandas as pd
import psycopg2
import os
from urllib.parse import urlparse
import sys
from datetime import datetime

def get_db_connection():
    """Get database connection"""
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require')
    url = urlparse(DATABASE_URL)
    return psycopg2.connect(
        host=url.hostname,
        port=url.port,
        user=url.username,
        password=url.password,
        database=url.path[1:],
        sslmode='require'
    )

def import_customers(conn):
    """Import customers data"""
    print("🔄 Importing customers...")

    df = pd.read_csv('data/customers_utf8.csv')
    print(f"   📊 Found {len(df)} customers")

    cursor = conn.cursor()

    # Clear existing customers
    cursor.execute("TRUNCATE TABLE customers CASCADE")

    imported = 0
    for _, row in df.iterrows():
        try:
            cursor.execute("""
                INSERT INTO customers (
                    id, first_name, last_name, email, phone,
                    address_line1, address_line2, city, postcode, country,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                row.get('_ID', ''),
                row.get('custName_Forename', ''),
                row.get('custName_Surname', ''),
                row.get('custCont_Email', ''),
                row.get('custCont_Telephone', ''),
                row.get('custAddress_Road', ''),
                row.get('custAddress_Locality', ''),
                row.get('custAddress_Town', ''),
                row.get('custAddress_PostCode', ''),
                row.get('custAddress_County', 'UK'),
                datetime.now(),
                datetime.now()
            ))
            imported += 1
        except Exception as e:
            print(f"   ⚠️  Error importing customer {row.get('_ID', 'unknown')}: {e}")
            continue

    conn.commit()
    print(f"   ✅ Imported {imported} customers")
    return imported

def import_vehicles(conn):
    """Import vehicles data"""
    print("🔄 Importing vehicles...")

    df = pd.read_csv('data/vehicles_utf8.csv')
    print(f"   📊 Found {len(df)} vehicles")

    cursor = conn.cursor()

    # Clear existing vehicles
    cursor.execute("TRUNCATE TABLE vehicles CASCADE")

    imported = 0
    for _, row in df.iterrows():
        try:
            cursor.execute("""
                INSERT INTO vehicles (
                    id, registration, make, model, year, color, fuel_type,
                    engine_size, mileage, vin, customer_id,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                row.get('_ID', ''),
                row.get('vehRegistration', ''),
                row.get('vehMake', ''),
                row.get('vehModel', ''),
                row.get('vehYear', None),
                row.get('vehColour', ''),
                row.get('vehFuelType', ''),
                row.get('vehEngineSize', ''),
                row.get('vehMileage', 0),
                row.get('vehVIN', ''),
                row.get('_ID_Customer', ''),
                datetime.now(),
                datetime.now()
            ))
            imported += 1
        except Exception as e:
            print(f"   ⚠️  Error importing vehicle {row.get('_ID', 'unknown')}: {e}")
            continue

    conn.commit()
    print(f"   ✅ Imported {imported} vehicles")
    return imported

def import_documents(conn):
    """Import documents (job sheets, invoices, estimates)"""
    print("🔄 Importing documents...")

    df = pd.read_csv('data/Documents_utf8.csv')
    print(f"   📊 Found {len(df)} documents")

    cursor = conn.cursor()

    # Clear existing documents
    cursor.execute("TRUNCATE TABLE documents CASCADE")

    imported = 0
    for _, row in df.iterrows():
        try:
            # Determine document type and number
            doc_type = row.get('docType', '')
            doc_number = ''

            if doc_type == 'JS':  # Job Sheet
                doc_number = row.get('docNumber_Jobsheet', '')
            elif doc_type == 'ES':  # Estimate
                doc_number = row.get('docNumber_Estimate', '')
            elif doc_type == 'SI':  # Service Invoice
                doc_number = row.get('docNumber_Invoice', '')
            else:
                doc_number = row.get('docNumber_Invoice', '') or row.get('docNumber_Jobsheet', '') or row.get('docNumber_Estimate', '')

            if not doc_number:
                continue

            cursor.execute("""
                INSERT INTO documents (
                    _id, _id_customer, _id_vehicle, doc_type, doc_number,
                    doc_date_created, doc_date_issued, doc_status,
                    customer_name, customer_phone, customer_mobile,
                    vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage,
                    total_gross, total_net, total_tax,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (_id) DO NOTHING
            """, (
                row.get('_ID', ''),
                row.get('_ID_Customer', ''),
                row.get('_ID_Vehicle', ''),
                doc_type,
                doc_number,
                row.get('docDate_Created', None),
                row.get('docDate_Issued', None),
                row.get('docStatus', '1'),
                f"{row.get('custName_Forename', '')} {row.get('custName_Surname', '')}".strip(),
                row.get('custCont_Telephone', ''),
                row.get('custCont_Mobile', ''),
                row.get('vehMake', ''),
                row.get('vehModel', ''),
                row.get('vehRegistration', ''),
                row.get('vehMileage', 0),
                row.get('us_TotalGROSS', 0),
                row.get('us_TotalNET', 0),
                row.get('us_TotalTAX', 0),
                datetime.now(),
                datetime.now()
            ))
            imported += 1
        except Exception as e:
            print(f"   ⚠️  Error importing document {row.get('_ID', 'unknown')}: {e}")
            continue

    conn.commit()
    print(f"   ✅ Imported {imported} documents")
    return imported

def main():
    """Main import function"""
    print("🚀 EMERGENCY DATA RESTORE STARTING...")
    print("=" * 50)

    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = get_db_connection()
        print("   ✅ Connected successfully!")

        # Import data in order
        customers_count = import_customers(conn)
        vehicles_count = import_vehicles(conn)
        documents_count = import_documents(conn)

        # Summary
        print("\n" + "=" * 50)
        print("🎉 DATA RESTORE COMPLETE!")
        print(f"   👥 Customers: {customers_count}")
        print(f"   🚗 Vehicles: {vehicles_count}")
        print(f"   📄 Documents: {documents_count}")
        print("=" * 50)

        conn.close()

    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
