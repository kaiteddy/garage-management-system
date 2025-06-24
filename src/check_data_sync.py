#!/usr/bin/env python3
"""
Check data sync status and database integrity
"""

import json
import os
import sqlite3
import sys
from datetime import datetime

from services.google_drive_service import GoogleDriveService
from services.intelligent_data_linking import IntelligentDataLinker
from services.intelligent_search import IntelligentSearchEngine

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import services


def get_db_path():
    """Get database path"""
    return os.path.join(os.path.dirname(__file__), '..', 'instance', 'garage.db')


def check_database_tables():
    """Check database tables and their row counts"""
    db_path = get_db_path()

    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"✅ Connected to database: {db_path}")

    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    print(f"Found {len(tables)} tables in the database:")

    # Check row counts for each table
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        row_count = cursor.fetchone()[0]
        print(f"  - {table_name}: {row_count} rows")

    conn.close()
    return True


def check_google_drive_sync():
    """Check Google Drive sync status"""
    db_path = get_db_path()
    google_drive_service = GoogleDriveService(db_path)

    print("\nGoogle Drive Sync Status:")

    if not google_drive_service.is_available():
        print("❌ Google Drive service not available")
        return False

    # Get connection status
    status = google_drive_service.get_connection_status()
    print(f"  - Connected: {status.get('connected', False)}")

    if status.get('connected', False):
        print(f"  - User: {status.get('user_email', 'Unknown')}")

        # Get config
        config = google_drive_service.load_config()
        print(
            f"  - Auto-sync enabled: {config.get('auto_sync_enabled', False)}")
        print(
            f"  - Sync interval: {config.get('sync_interval_minutes', 0)} minutes")

        last_sync = config.get('last_sync')
        if last_sync:
            try:
                last_sync_dt = datetime.fromisoformat(last_sync)
                now = datetime.now()
                diff = now - last_sync_dt
                print(
                    f"  - Last sync: {last_sync} ({diff.total_seconds() / 60:.1f} minutes ago)")
            except:
                print(f"  - Last sync: {last_sync}")
        else:
            print("  - Last sync: Never")

        # Check folder mappings
        folder_mappings = config.get('folder_mappings', {})
        print(f"\nFolder Mappings ({len(folder_mappings)} configured):")

        for data_type, mapping in folder_mappings.items():
            print(
                f"  - {data_type}: {mapping.get('folder_name', 'Unknown')} (ID: {mapping.get('folder_id', 'Unknown')})")
            print(
                f"    Last modified: {mapping.get('last_modified', 'Never')}")

    return status.get('connected', False)


def check_data_linking():
    """Check data linking statistics"""
    db_path = get_db_path()
    data_linker = IntelligentDataLinker(db_path)

    print("\nData Linking Statistics:")

    # Get linking statistics
    stats = data_linker.get_linking_statistics()

    print(f"  - Customers processed: {stats.get('customers_processed', 0)}")
    print(f"  - Customers linked: {stats.get('customers_linked', 0)}")
    print(f"  - Customers created: {stats.get('customers_created', 0)}")
    print(
        f"  - Customer linking rate: {stats.get('customer_linking_rate', 0):.2f}")

    print(f"  - Vehicles processed: {stats.get('vehicles_processed', 0)}")
    print(f"  - Vehicles linked: {stats.get('vehicles_linked', 0)}")
    print(f"  - Vehicles created: {stats.get('vehicles_created', 0)}")
    print(
        f"  - Vehicle linking rate: {stats.get('vehicle_linking_rate', 0):.2f}")

    print(f"  - Average confidence: {stats.get('average_confidence', 0):.2f}")

    return stats


def check_search_engine():
    """Check search engine functionality"""
    db_path = get_db_path()
    search_engine = IntelligentSearchEngine(db_path)

    print("\nSearch Engine Test:")

    # Test customer search
    test_query = "test"
    customers = search_engine.search_customers(test_query, limit=5)
    print(f"  - Customer search for '{test_query}': {len(customers)} results")

    # Test vehicle search
    vehicles = search_engine.search_vehicles(test_query, limit=5)
    print(f"  - Vehicle search for '{test_query}': {len(vehicles)} results")

    # Test job search
    jobs = search_engine.search_jobs(test_query, limit=5)
    print(f"  - Job search for '{test_query}': {len(jobs)} results")

    return True


def main():
    """Main function"""
    print("🔍 Running data sync and system interaction check...")

    # Check database tables
    print("\n=== Database Check ===")
    check_database_tables()

    # Check Google Drive sync
    print("\n=== Google Drive Sync Check ===")
    check_google_drive_sync()

    # Check data linking
    print("\n=== Data Linking Check ===")
    check_data_linking()

    # Check search engine
    print("\n=== Search Engine Check ===")
    check_search_engine()

    print("\n✅ Data sync and system interaction check completed!")


if __name__ == "__main__":
    main()
