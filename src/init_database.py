#!/usr/bin/env python3
"""
Database initialization script for the Garage Management System
Creates all necessary tables with proper relationships
"""

import os
import sqlite3
import sys
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Database path
DB_PATH = os.path.join(os.path.dirname(
    os.path.abspath(__file__)), '..', 'instance', 'garage.db')


def get_db_connection():
    """Get database connection"""
    # Ensure instance directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables():
    """Create all database tables"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Enable foreign key constraints
        cursor.execute('PRAGMA foreign_keys = ON')

        # Customers table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_number VARCHAR(50) UNIQUE,
                name VARCHAR(100) NOT NULL,
                company VARCHAR(100),
                address TEXT,
                postcode VARCHAR(20),
                phone VARCHAR(20),
                mobile VARCHAR(20),
                email VARCHAR(100),
                created_date DATE DEFAULT CURRENT_DATE,
                updated_date DATE DEFAULT CURRENT_DATE
            )
        ''')

        # Suppliers table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                contact_person VARCHAR(100),
                address TEXT,
                postcode VARCHAR(20),
                phone VARCHAR(20),
                email VARCHAR(100),
                website VARCHAR(200),
                account_number VARCHAR(50),
                payment_terms VARCHAR(100),
                created_date DATE DEFAULT CURRENT_DATE
            )
        ''')

        # Vehicles table (update existing if needed)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicles_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration VARCHAR(10) UNIQUE NOT NULL,
                make VARCHAR(50),
                model VARCHAR(50),
                year INTEGER,
                color VARCHAR(30),
                fuel_type VARCHAR(20),
                mot_expiry DATE,
                tax_due DATE,
                mileage INTEGER,
                customer_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')

        # Check if we need to migrate existing vehicles data
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='vehicles'")
        if cursor.fetchone():
            # Temporarily disable foreign keys for migration
            cursor.execute('PRAGMA foreign_keys = OFF')

            # Copy data from old table
            cursor.execute('''
                INSERT OR IGNORE INTO vehicles_new
                (id, registration, make, model, year, color, fuel_type, mot_expiry, tax_due, created_at, updated_at)
                SELECT id, registration, make, model, year, color, fuel_type, mot_expiry, tax_due, created_at, updated_at
                FROM vehicles
            ''')

            # Drop old table and rename new one
            cursor.execute('DROP TABLE vehicles')
            cursor.execute('ALTER TABLE vehicles_new RENAME TO vehicles')

            # Re-enable foreign keys
            cursor.execute('PRAGMA foreign_keys = ON')
        else:
            cursor.execute('ALTER TABLE vehicles_new RENAME TO vehicles')

        # Jobs table - Enhanced for Kanban workflow
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INTEGER,
                vehicle_id INTEGER,
                description TEXT,
                status VARCHAR(20) DEFAULT 'BOOKED_IN',
                priority VARCHAR(10) DEFAULT 'NORMAL',
                assigned_technician VARCHAR(100),
                estimated_hours REAL DEFAULT 0.0,
                actual_hours REAL DEFAULT 0.0,
                labour_cost REAL DEFAULT 0.0,
                parts_cost REAL DEFAULT 0.0,
                total_amount REAL DEFAULT 0.0,
                created_date DATE DEFAULT CURRENT_DATE,
                started_date DATE,
                completed_date DATE,
                due_date DATE,
                notes TEXT,
                internal_notes TEXT,
                customer_authorization BOOLEAN DEFAULT 0,
                bay_number VARCHAR(10),
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')

        # Technicians table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS technicians (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                specialization VARCHAR(100),
                hourly_rate REAL DEFAULT 0.0,
                is_active BOOLEAN DEFAULT 1,
                start_time TIME DEFAULT '08:00',
                end_time TIME DEFAULT '17:00',
                created_date DATE DEFAULT CURRENT_DATE
            )
        ''')

        # Workshop Bays table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS workshop_bays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bay_number VARCHAR(10) UNIQUE NOT NULL,
                bay_name VARCHAR(50),
                bay_type VARCHAR(20) DEFAULT 'GENERAL',
                is_available BOOLEAN DEFAULT 1,
                equipment TEXT,
                notes TEXT
            )
        ''')

        # Appointments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER,
                customer_id INTEGER,
                vehicle_id INTEGER,
                technician_id INTEGER,
                bay_id INTEGER,
                appointment_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                estimated_duration INTEGER DEFAULT 60,
                service_type VARCHAR(100),
                description TEXT,
                status VARCHAR(20) DEFAULT 'SCHEDULED',
                priority VARCHAR(10) DEFAULT 'NORMAL',
                customer_notified BOOLEAN DEFAULT 0,
                reminder_sent BOOLEAN DEFAULT 0,
                created_date DATE DEFAULT CURRENT_DATE,
                notes TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                FOREIGN KEY (technician_id) REFERENCES technicians (id),
                FOREIGN KEY (bay_id) REFERENCES workshop_bays (id)
            )
        ''')

        # Job Sheet Templates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS job_sheet_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                service_type VARCHAR(50),
                description TEXT,
                default_instructions TEXT,
                default_safety_notes TEXT,
                default_parts TEXT,
                default_tools TEXT,
                default_checks TEXT,
                estimated_time INTEGER DEFAULT 60,
                is_active BOOLEAN DEFAULT 1,
                created_date DATE DEFAULT CURRENT_DATE
            )
        ''')

        # Job Sheets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS job_sheets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                sheet_number VARCHAR(50) UNIQUE NOT NULL,
                template_id INTEGER,
                work_instructions TEXT,
                safety_notes TEXT,
                parts_required TEXT,
                tools_required TEXT,
                quality_checks TEXT,
                technician_signature TEXT,
                supervisor_signature TEXT,
                customer_signature TEXT,
                signed_date DATETIME,
                completed_date DATETIME,
                status VARCHAR(20) DEFAULT 'DRAFT',
                created_date DATE DEFAULT CURRENT_DATE,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (template_id) REFERENCES job_sheet_templates (id)
            )
        ''')

        # Invoices table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                job_id INTEGER,
                customer_id INTEGER,
                vehicle_id INTEGER,
                amount REAL NOT NULL,
                vat_amount REAL DEFAULT 0.0,
                total_amount REAL NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                created_date DATE DEFAULT CURRENT_DATE,
                due_date DATE,
                paid_date DATE,
                payment_method VARCHAR(50),
                notes TEXT,
                is_locked BOOLEAN DEFAULT 0,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')

        # Parts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS parts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                part_number VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                supplier_id INTEGER,
                cost_price REAL DEFAULT 0.0,
                sell_price REAL DEFAULT 0.0,
                stock_quantity INTEGER DEFAULT 0,
                min_stock_level INTEGER DEFAULT 0,
                location VARCHAR(100),
                created_date DATE DEFAULT CURRENT_DATE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )
        ''')

        # Job Parts junction table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS job_parts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                part_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (part_id) REFERENCES parts (id)
            )
        ''')

        # Expenses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_number VARCHAR(50) UNIQUE,
                supplier_id INTEGER,
                category VARCHAR(100),
                description TEXT,
                amount REAL NOT NULL,
                vat_amount REAL DEFAULT 0.0,
                total_amount REAL NOT NULL,
                expense_date DATE DEFAULT CURRENT_DATE,
                payment_method VARCHAR(50),
                receipt_number VARCHAR(100),
                created_date DATE DEFAULT CURRENT_DATE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )
        ''')

        # Payments/Receipts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_reference VARCHAR(50) UNIQUE,
                invoice_id INTEGER,
                job_id INTEGER,
                customer_id INTEGER,
                amount REAL NOT NULL,
                payment_date DATE NOT NULL,
                payment_method VARCHAR(50),
                description TEXT,
                reconciled BOOLEAN DEFAULT 0,
                reconciled_date DATE,
                reconciled_reference VARCHAR(50),
                surcharge_applied BOOLEAN DEFAULT 0,
                surcharge_gross REAL DEFAULT 0.0,
                surcharge_net REAL DEFAULT 0.0,
                surcharge_tax REAL DEFAULT 0.0,
                created_date DATE DEFAULT CURRENT_DATE,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')

        # Create indexes for better performance
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles (registration)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_customers_account ON customers (account_number)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs (customer_id)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_jobs_vehicle ON jobs (vehicle_id)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_id)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices (job_id)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_parts_number ON parts (part_number)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id)')
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments (customer_id)')

        # Create triggers to update timestamps
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_customers_timestamp 
            AFTER UPDATE ON customers
            BEGIN
                UPDATE customers SET updated_date = CURRENT_DATE WHERE id = NEW.id;
            END
        ''')

        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_vehicles_timestamp 
            AFTER UPDATE ON vehicles
            BEGIN
                UPDATE vehicles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')

        conn.commit()
        print("✅ Database tables created successfully!")

        # Show table counts
        tables = ['customers', 'vehicles', 'jobs', 'invoices',
                  'parts', 'suppliers', 'expenses', 'payments']
        print("\n📊 Current table counts:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count}")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    """Main function"""
    print("🚀 Initializing Garage Management System Database...")
    print(f"📁 Database location: {DB_PATH}")

    create_tables()

    print("\n🎉 Database initialization completed!")
    print("\nNext steps:")
    print("1. Use the CSV import system to load your ELI MOTORS data")
    print("2. Access the web interface to manage your garage data")
    print("3. Configure MOT reminders and SMS settings")


if __name__ == "__main__":
    main()
