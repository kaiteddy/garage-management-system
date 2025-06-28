"""
Unified Database Schema
Consolidates all data into a single database with proper relationships
"""

import logging
import os
import sqlite3
from datetime import datetime


class UnifiedDatabase:
    """Unified database manager for the garage management system"""

    def __init__(self, db_path: str = None):
        """Initialize unified database"""
        self.db_path = db_path or os.path.join(
            os.path.dirname(__file__), 'garage_management.db')
        self.logger = logging.getLogger(__name__)

    def initialize_unified_schema(self):
        """Create unified database schema with all tables and relationships"""

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Enable foreign keys
                cursor.execute('PRAGMA foreign_keys = ON')

                # Core customer table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS customers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        first_name TEXT NOT NULL,
                        last_name TEXT NOT NULL,
                        email TEXT UNIQUE,
                        phone_primary TEXT,
                        phone_secondary TEXT,
                        address_line1 TEXT,
                        address_line2 TEXT,
                        city TEXT,
                        postcode TEXT,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )
                ''')

                # Vehicles table with customer relationship
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS vehicles (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER NOT NULL,
                        registration TEXT UNIQUE NOT NULL,
                        make TEXT,
                        model TEXT,
                        year INTEGER,
                        colour TEXT,
                        fuel_type TEXT,
                        engine_size TEXT,
                        vin TEXT,
                        mileage INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (customer_id) REFERENCES customers (id)
                    )
                ''')

                # MOT records table (integrated)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS mot_records (
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

                # Job sheets table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS job_sheets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER NOT NULL,
                        vehicle_id INTEGER NOT NULL,
                        job_number TEXT UNIQUE NOT NULL,
                        description TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        priority TEXT DEFAULT 'normal',
                        estimated_cost DECIMAL(10,2),
                        actual_cost DECIMAL(10,2),
                        labour_hours DECIMAL(5,2),
                        parts_cost DECIMAL(10,2),
                        assigned_technician TEXT,
                        start_date DATE,
                        completion_date DATE,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_id) REFERENCES customers (id),
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                    )
                ''')

                # Appointments table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS appointments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER NOT NULL,
                        vehicle_id INTEGER,
                        appointment_date DATE NOT NULL,
                        appointment_time TIME NOT NULL,
                        service_type TEXT NOT NULL,
                        description TEXT,
                        status TEXT DEFAULT 'scheduled',
                        technician TEXT,
                        estimated_duration INTEGER,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_id) REFERENCES customers (id),
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                    )
                ''')

                # SMS communications table (unified)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sms_communications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER,
                        vehicle_id INTEGER,
                        phone_number TEXT NOT NULL,
                        message_type TEXT NOT NULL,
                        message_content TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        sent_at TIMESTAMP,
                        delivered_at TIMESTAMP,
                        twilio_sid TEXT,
                        error_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_id) REFERENCES customers (id),
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                    )
                ''')

                # Parts inventory table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS parts_inventory (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        part_number TEXT UNIQUE NOT NULL,
                        part_name TEXT NOT NULL,
                        description TEXT,
                        supplier TEXT,
                        cost_price DECIMAL(10,2),
                        sell_price DECIMAL(10,2),
                        stock_quantity INTEGER DEFAULT 0,
                        minimum_stock INTEGER DEFAULT 0,
                        location TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Job parts table (many-to-many relationship)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS job_parts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        job_sheet_id INTEGER NOT NULL,
                        part_id INTEGER NOT NULL,
                        quantity INTEGER NOT NULL,
                        unit_price DECIMAL(10,2),
                        total_price DECIMAL(10,2),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (job_sheet_id) REFERENCES job_sheets (id),
                        FOREIGN KEY (part_id) REFERENCES parts_inventory (id)
                    )
                ''')

                # Workshop bays table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS workshop_bays (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bay_name TEXT UNIQUE NOT NULL,
                        bay_type TEXT,
                        is_available BOOLEAN DEFAULT 1,
                        equipment TEXT,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Technicians table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS technicians (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        first_name TEXT NOT NULL,
                        last_name TEXT NOT NULL,
                        email TEXT UNIQUE,
                        phone TEXT,
                        specializations TEXT,
                        hourly_rate DECIMAL(8,2),
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # System settings table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS system_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        setting_name TEXT UNIQUE NOT NULL,
                        setting_value TEXT,
                        setting_type TEXT DEFAULT 'string',
                        description TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Audit log table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS audit_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        table_name TEXT NOT NULL,
                        record_id INTEGER,
                        action TEXT NOT NULL,
                        old_values TEXT,
                        new_values TEXT,
                        user_id TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Create indexes for performance
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles (customer_id)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles (registration)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_mot_records_vehicle_id ON mot_records (vehicle_id)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_mot_records_expiry_date ON mot_records (expiry_date)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_job_sheets_customer_id ON job_sheets (customer_id)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_job_sheets_vehicle_id ON job_sheets (vehicle_id)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date)')
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_sms_customer_id ON sms_communications (customer_id)')

                conn.commit()
                self.logger.info(
                    "✅ Unified database schema created successfully")

        except Exception as e:
            self.logger.error(
                f"❌ Failed to create unified database schema: {e}")
            raise

    def migrate_existing_data(self):
        """Migrate data from separate databases to unified schema"""

        try:
            # Check for existing MOT data
            mot_db_path = os.path.join(os.path.dirname(
                __file__), 'garage_management.db')
            if os.path.exists(mot_db_path):
                self._migrate_mot_data(mot_db_path)

            self.logger.info("✅ Data migration completed successfully")

        except Exception as e:
            self.logger.error(f"❌ Data migration failed: {e}")

    def _migrate_mot_data(self, source_db_path: str):
        """Migrate MOT data from existing database"""

        try:
            # Connect to both databases
            source_conn = sqlite3.connect(source_db_path)
            target_conn = sqlite3.connect(self.db_path)

            source_cursor = source_conn.cursor()
            target_cursor = target_conn.cursor()

            # Check if mot_vehicles table exists in source
            source_cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='mot_vehicles'
            """)

            if source_cursor.fetchone():
                # Migrate MOT vehicles data
                source_cursor.execute("""
                    SELECT registration, customer_name, mobile_number, 
                           make, model, mot_expiry_date, days_until_expiry,
                           is_expired, test_result
                    FROM mot_vehicles
                """)

                mot_vehicles = source_cursor.fetchall()

                for vehicle in mot_vehicles:
                    registration, customer_name, mobile_number, make, model, \
                        mot_expiry_date, days_until_expiry, is_expired, test_result = vehicle

                    # Create or find customer
                    names = customer_name.split(' ', 1) if customer_name else [
                        'Unknown', '']
                    first_name = names[0]
                    last_name = names[1] if len(names) > 1 else ''

                    target_cursor.execute("""
                        INSERT OR IGNORE INTO customers 
                        (first_name, last_name, phone_primary)
                        VALUES (?, ?, ?)
                    """, (first_name, last_name, mobile_number))

                    target_cursor.execute("""
                        SELECT id FROM customers 
                        WHERE first_name = ? AND last_name = ? AND phone_primary = ?
                    """, (first_name, last_name, mobile_number))

                    customer_id = target_cursor.fetchone()[0]

                    # Create vehicle
                    target_cursor.execute("""
                        INSERT OR IGNORE INTO vehicles 
                        (customer_id, registration, make, model)
                        VALUES (?, ?, ?, ?)
                    """, (customer_id, registration, make, model))

                    target_cursor.execute("""
                        SELECT id FROM vehicles WHERE registration = ?
                    """, (registration,))

                    vehicle_id = target_cursor.fetchone()[0]

                    # Create MOT record
                    target_cursor.execute("""
                        INSERT OR IGNORE INTO mot_records 
                        (vehicle_id, customer_id, registration, expiry_date, 
                         test_result, is_current)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (vehicle_id, customer_id, registration, mot_expiry_date,
                          test_result, 1))

                target_conn.commit()
                self.logger.info(
                    f"✅ Migrated {len(mot_vehicles)} MOT vehicles")

            source_conn.close()
            target_conn.close()

        except Exception as e:
            self.logger.error(f"❌ MOT data migration failed: {e}")

    def get_database_stats(self) -> dict:
        """Get unified database statistics"""

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                stats = {}

                # Count records in each table
                tables = [
                    'customers', 'vehicles', 'mot_records', 'job_sheets',
                    'appointments', 'sms_communications', 'parts_inventory',
                    'technicians'
                ]

                for table in tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    stats[table] = cursor.fetchone()[0]

                return stats

        except Exception as e:
            self.logger.error(f"❌ Failed to get database stats: {e}")
            return {}


def initialize_unified_database():
    """Initialize the unified database"""
    db = UnifiedDatabase()
    db.initialize_unified_schema()
    db.migrate_existing_data()
    return db


if __name__ == '__main__':
    # Initialize unified database when run directly
    initialize_unified_database()
    print("✅ Unified database initialized successfully")
