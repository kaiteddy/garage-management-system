"""
Database service for the Garage Management System.
"""
import sqlite3
import os
from flask import current_app
from models import db


def get_db_connection():
    """
    Get database connection for raw SQL queries.
    
    Returns:
        sqlite3.Connection: Database connection or None if failed
    """
    try:
        # Get database path from SQLAlchemy URI
        db_uri = current_app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            if not os.path.isabs(db_path):
                db_path = os.path.join(current_app.instance_path, db_path)
        else:
            # For other database types, this would need to be adapted
            return None
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
        return conn
    except Exception as e:
        current_app.logger.error(f"Database connection failed: {str(e)}")
        return None


def initialize_database():
    """Initialize database with sample data if needed."""
    try:
        # Check if we already have data
        from models import Customer, Vehicle
        
        if Customer.query.first() is not None:
            return  # Database already has data
        
        # Create sample customers
        sample_customers = [
            {
                'name': 'John Smith',
                'company': 'Smith Motors Ltd',
                'address': '123 High Street, London',
                'postcode': 'SW1A 1AA',
                'phone': '020 7123 4567',
                'mobile': '07700 900123',
                'email': 'john@smithmotors.co.uk'
            },
            {
                'name': 'Sarah Johnson',
                'address': '456 Oak Avenue, Manchester',
                'postcode': 'M1 1AA',
                'phone': '0161 123 4567',
                'mobile': '07700 900456',
                'email': 'sarah.johnson@email.com'
            },
            {
                'name': 'Mike Wilson',
                'company': 'Wilson Transport',
                'address': '789 Industrial Estate, Birmingham',
                'postcode': 'B1 1AA',
                'phone': '0121 123 4567',
                'email': 'mike@wilsontransport.co.uk'
            }
        ]
        
        customers = []
        for customer_data in sample_customers:
            customer = Customer.create(**customer_data)
            customers.append(customer)
        
        # Create sample vehicles
        sample_vehicles = [
            {
                'registration': 'AB12 CDE',
                'make': 'Ford',
                'model': 'Focus',
                'year': 2020,
                'color': 'Blue',
                'fuel_type': 'Petrol',
                'customer_id': customers[0].id
            },
            {
                'registration': 'XY98 ZAB',
                'make': 'Volkswagen',
                'model': 'Golf',
                'year': 2019,
                'color': 'Silver',
                'fuel_type': 'Diesel',
                'customer_id': customers[1].id
            },
            {
                'registration': 'MN34 PQR',
                'make': 'BMW',
                'model': '320d',
                'year': 2021,
                'color': 'Black',
                'fuel_type': 'Diesel',
                'customer_id': customers[2].id
            }
        ]
        
        for vehicle_data in sample_vehicles:
            # Don't fetch DVLA data for sample vehicles to avoid API calls
            vehicle = Vehicle(**vehicle_data)
            vehicle.save()
        
        current_app.logger.info("Database initialized with sample data")
        
    except Exception as e:
        current_app.logger.error(f"Database initialization failed: {str(e)}")
        db.session.rollback()


def create_legacy_tables():
    """Create legacy tables that are not yet converted to models."""
    try:
        conn = get_db_connection()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        # Create jobs table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_number TEXT UNIQUE,
                vehicle_id INTEGER,
                customer_id INTEGER,
                description TEXT,
                status TEXT,
                total_amount REAL,
                created_date TEXT,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        
        # Create estimates table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS estimates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                estimate_number TEXT UNIQUE,
                job_id INTEGER,
                customer_id INTEGER,
                vehicle_id INTEGER,
                description TEXT,
                status TEXT,
                total_amount REAL,
                created_date TEXT,
                valid_until TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')
        
        # Create invoices table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE,
                job_id INTEGER,
                estimate_id INTEGER,
                customer_id INTEGER,
                vehicle_id INTEGER,
                amount REAL,
                status TEXT,
                created_date TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (estimate_id) REFERENCES estimates (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        current_app.logger.error(f"Legacy table creation failed: {str(e)}")
        return False
