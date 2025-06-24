#!/usr/bin/env python3
"""
Create missing database tables for new models
"""

import os
import sqlite3
import sys
from datetime import datetime, time

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def get_db_path():
    """Get database path"""
    return os.path.join(os.path.dirname(__file__), '..', 'instance', 'garage.db')


def create_missing_tables():
    """Create missing tables for new models"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("🔧 Creating missing database tables...")

        # Create technicians table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS technicians (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                specialization VARCHAR(100),
                hourly_rate FLOAT DEFAULT 0.0,
                is_active BOOLEAN DEFAULT 1,
                start_time TIME DEFAULT '08:00',
                end_time TIME DEFAULT '17:00',
                created_date DATE DEFAULT CURRENT_DATE
            )
        ''')
        print("✅ Technicians table created/verified")

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
        print("✅ Workshop bays table created/verified")

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
        print("✅ Appointments table created/verified")

        # Create quotes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INTEGER,
                vehicle_id INTEGER,
                description TEXT,
                labour_cost FLOAT DEFAULT 0.0,
                parts_cost FLOAT DEFAULT 0.0,
                total_amount FLOAT DEFAULT 0.0,
                vat_amount FLOAT DEFAULT 0.0,
                final_total FLOAT DEFAULT 0.0,
                status VARCHAR(20) DEFAULT 'DRAFT',
                valid_until DATE,
                created_date DATE DEFAULT CURRENT_DATE,
                sent_date DATE,
                accepted_date DATE,
                notes TEXT,
                terms_conditions TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')
        print("✅ Quotes table created/verified")

        # Create job_sheet_templates table if it doesn't exist
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
        print("✅ Job sheet templates table created/verified")

        # Create job_sheets table if it doesn't exist
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
        print("✅ Job sheets table created/verified")

        conn.commit()
        print("🎉 All tables created successfully!")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_sample_data():
    """Add some sample data for testing"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("🌱 Seeding sample data...")

        # Add sample technicians
        sample_technicians = [
            ('John Smith', 'john@elimotors.com',
             '07123456789', 'MOT Testing', 25.0),
            ('Sarah Johnson', 'sarah@elimotors.com',
             '07987654321', 'Diagnostics', 30.0),
            ('Mike Wilson', 'mike@elimotors.com',
             '07555123456', 'General Repair', 22.0)
        ]

        for tech in sample_technicians:
            cursor.execute('''
                INSERT OR IGNORE INTO technicians (name, email, phone, specialization, hourly_rate)
                VALUES (?, ?, ?, ?, ?)
            ''', tech)

        # Add sample workshop bays
        sample_bays = [
            ('BAY1', 'Main Service Bay', 'GENERAL'),
            ('BAY2', 'MOT Testing Bay', 'MOT'),
            ('BAY3', 'Diagnostic Bay', 'DIAGNOSTIC'),
            ('BAY4', 'Quick Service Bay', 'GENERAL')
        ]

        for bay in sample_bays:
            cursor.execute('''
                INSERT OR IGNORE INTO workshop_bays (bay_number, bay_name, bay_type)
                VALUES (?, ?, ?)
            ''', bay)

        # Add sample job sheet templates
        sample_templates = [
            ('MOT Test', 'MOT', 'Standard MOT testing procedure', 'Perform full MOT inspection',
             'Ensure vehicle is secure on lift', '[]', '["MOT equipment", "Brake tester"]', '["Lights", "Brakes", "Steering"]', 60),
            ('Annual Service', 'Service', 'Annual vehicle service', 'Oil change, filter replacement, general inspection', 'Use correct oil grade',
             '["Oil filter", "Air filter", "Oil"]', '["Spanner set", "Oil drain pan"]', '["Oil level", "Filter seal", "No leaks"]', 120),
            ('Brake Service', 'Repair', 'Brake system service and repair', 'Inspect brake pads, discs, and fluid', 'Brake fluid is corrosive',
             '["Brake pads", "Brake fluid"]', '["Brake tools", "Fluid tester"]', '["Pad thickness", "Disc condition", "Fluid level"]', 90)
        ]

        for template in sample_templates:
            cursor.execute('''
                INSERT OR IGNORE INTO job_sheet_templates 
                (name, service_type, description, default_instructions, default_safety_notes, 
                 default_parts, default_tools, default_checks, estimated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', template)

        conn.commit()
        print("✅ Sample data seeded successfully!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    print("🚀 Setting up database tables...")
    create_missing_tables()
    print("🎉 Database setup complete!")
    print("ℹ️ Sample data seeding is disabled. Data will be imported from Google Drive.")
