#!/usr/bin/env python3
"""
Database migration script to add workshop management tables
"""

import os
import sqlite3
import sys


def migrate_workshop_tables():
    """Add workshop management tables to the database"""

    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    if not os.path.exists(db_path):
        print("❌ Database not found. Please run the main application first to create the database.")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("🔄 Starting workshop tables migration...")

        # Create technicians table
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
        print("✅ Created technicians table")

        # Create workshop_bays table
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
        print("✅ Created workshop_bays table")

        # Create appointments table
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
        print("✅ Created appointments table")

        # Create job_sheet_templates table
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
        print("✅ Created job_sheet_templates table")

        # Create job_sheets table
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
        print("✅ Created job_sheets table")

        # Create quotes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INTEGER,
                vehicle_id INTEGER,
                description TEXT,
                labour_cost REAL DEFAULT 0.0,
                parts_cost REAL DEFAULT 0.0,
                total_amount REAL DEFAULT 0.0,
                vat_amount REAL DEFAULT 0.0,
                status VARCHAR(20) DEFAULT 'DRAFT',
                valid_until DATE,
                created_date DATE DEFAULT CURRENT_DATE,
                approved_date DATETIME,
                converted_job_id INTEGER,
                notes TEXT,
                terms_conditions TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                FOREIGN KEY (converted_job_id) REFERENCES jobs (id)
            )
        ''')
        print("✅ Created quotes table")

        # Commit changes
        conn.commit()
        print("✅ Migration completed successfully!")

        # Show table summary
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]

        print(f"\n📊 Database Tables ({len(tables)} total):")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   {table}: {count} records")

        conn.close()
        return True

    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == '__main__':
    print("🚀 Workshop Tables Migration Script")
    print("=" * 50)

    success = migrate_workshop_tables()

    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now run the workshop data initialization script.")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
