#!/usr/bin/env python3
"""
Comprehensive Database Schema Migration
Fixes schema inconsistencies and ensures all tables have proper structure
"""

import os
import sqlite3
import sys
from datetime import datetime


def get_database_path():
    """Get the unified database path"""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'garage_management.db')


def backup_database():
    """Create a backup of the current database"""
    db_path = get_database_path()
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return backup_path
    return None


def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns


def migrate_vehicles_table(cursor):
    """Migrate vehicles table to include all required columns"""
    print("🔧 Migrating vehicles table...")

    # Check existing columns
    cursor.execute("PRAGMA table_info(vehicles)")
    existing_columns = {row[1]: row[2] for row in cursor.fetchall()}

    # Required columns with their types
    required_columns = {
        'year': 'INTEGER',
        'colour': 'TEXT',
        'color': 'TEXT',  # Alternative spelling
        'fuel_type': 'TEXT',
        'mot_expiry': 'DATE',
        'tax_due': 'DATE',
        'mileage': 'INTEGER',
        'is_active': 'BOOLEAN DEFAULT 1',
        'vin': 'TEXT',
        'engine_size': 'TEXT'
    }

    # Add missing columns
    for column, column_type in required_columns.items():
        if column not in existing_columns:
            try:
                cursor.execute(
                    f"ALTER TABLE vehicles ADD COLUMN {column} {column_type}")
                print(f"  ✅ Added column: {column}")
            except sqlite3.OperationalError as e:
                print(f"  ⚠️ Column {column} might already exist: {e}")


def migrate_customers_table(cursor):
    """Ensure customers table has all required columns"""
    print("🔧 Migrating customers table...")

    # Check if customers table exists
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
    if not cursor.fetchone():
        # Create customers table
        cursor.execute('''
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_number TEXT UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
                email TEXT,
                phone_primary TEXT,
                phone_secondary TEXT,
                address_line1 TEXT,
                address_line2 TEXT,
                city TEXT,
                county TEXT,
                postcode TEXT,
                country TEXT DEFAULT 'UK',
                date_of_birth DATE,
                notes TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("  ✅ Created customers table")
    else:
        # Add missing columns to existing table
        required_columns = {
            'phone_primary': 'TEXT',
            'phone_secondary': 'TEXT',
            'is_active': 'BOOLEAN DEFAULT 1',
            'account_number': 'TEXT UNIQUE',
            'first_name': 'TEXT',
            'last_name': 'TEXT',
            'email': 'TEXT',
            'address_line1': 'TEXT',
            'address_line2': 'TEXT',
            'city': 'TEXT',
            'county': 'TEXT',
            'postcode': 'TEXT',
            'country': 'TEXT DEFAULT "UK"',
            'date_of_birth': 'DATE',
            'notes': 'TEXT'
        }

        cursor.execute("PRAGMA table_info(customers)")
        existing_columns = {row[1]: row[2] for row in cursor.fetchall()}

        for column, column_type in required_columns.items():
            if column not in existing_columns:
                try:
                    cursor.execute(
                        f"ALTER TABLE customers ADD COLUMN {column} {column_type}")
                    print(f"  ✅ Added column: {column}")
                except sqlite3.OperationalError as e:
                    print(f"  ⚠️ Column {column} might already exist: {e}")


def migrate_mot_records_table(cursor):
    """Ensure MOT records table exists with proper structure"""
    print("🔧 Migrating MOT records table...")

    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='mot_records'")
    if not cursor.fetchone():
        cursor.execute('''
            CREATE TABLE mot_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                registration TEXT NOT NULL,
                test_date DATE,
                expiry_date DATE NOT NULL,
                test_result TEXT,
                test_number TEXT,
                mileage INTEGER,
                test_station TEXT,
                defects TEXT,
                advisories TEXT,
                is_current BOOLEAN DEFAULT 1,
                dvsa_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        print("  ✅ Created mot_records table")


def create_indexes(cursor):
    """Create performance indexes"""
    print("🔧 Creating database indexes...")

    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles (registration)",
        "CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles (customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles (mot_expiry)",
        "CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers (account_number)",
        "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone_primary)",
        "CREATE INDEX IF NOT EXISTS idx_mot_records_vehicle_id ON mot_records (vehicle_id)",
        "CREATE INDEX IF NOT EXISTS idx_mot_records_expiry_date ON mot_records (expiry_date)",
        "CREATE INDEX IF NOT EXISTS idx_mot_records_current ON mot_records (is_current)"
    ]

    for index_sql in indexes:
        try:
            cursor.execute(index_sql)
            print(f"  ✅ Created index")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️ Index might already exist: {e}")


def run_migration():
    """Run the complete database migration"""
    print("🚀 Starting Database Schema Migration")
    print("=" * 50)

    # Backup database
    backup_path = backup_database()

    # Connect to database
    db_path = get_database_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")

        # Run migrations
        migrate_customers_table(cursor)
        migrate_vehicles_table(cursor)
        migrate_mot_records_table(cursor)
        create_indexes(cursor)

        # Commit changes
        conn.commit()
        print("\n✅ Database migration completed successfully!")

        # Verify schema
        print("\n📊 Verifying schema...")
        cursor.execute("PRAGMA table_info(vehicles)")
        vehicle_columns = [row[1] for row in cursor.fetchall()]
        print(f"  Vehicles table columns: {', '.join(vehicle_columns)}")

        cursor.execute("PRAGMA table_info(customers)")
        customer_columns = [row[1] for row in cursor.fetchall()]
        print(f"  Customers table columns: {', '.join(customer_columns)}")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        if backup_path:
            print(f"💡 Restore from backup: {backup_path}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
