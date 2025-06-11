#!/usr/bin/env python3
"""
Database migration script for the Garage Management System.
Migrates data from the old structure to the new organized structure.
"""
import os
import sys
import sqlite3
from datetime import datetime

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src'))

from src.app import create_app
from src.models import db, Customer, Vehicle


def migrate_database():
    """Migrate the existing database to the new schema."""
    app = create_app('development')
    
    with app.app_context():
        try:
            # Check if we need to migrate
            if Customer.query.first() is not None:
                print("Database already contains data. Migration not needed.")
                return
            
            # Connect to the old database
            old_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'garage.db')
            
            if not os.path.exists(old_db_path):
                print("No existing database found. Creating fresh database.")
                return
            
            print(f"Migrating data from {old_db_path}")
            
            conn = sqlite3.connect(old_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Migrate customers
            print("Migrating customers...")
            try:
                cursor.execute('SELECT * FROM customers')
                customers = cursor.fetchall()
                
                customer_map = {}
                for customer_row in customers:
                    customer_data = {
                        'name': customer_row['name'],
                        'company': customer_row.get('company'),
                        'address': customer_row.get('address'),
                        'postcode': customer_row.get('postcode'),
                        'phone': customer_row.get('phone'),
                        'email': customer_row.get('email')
                    }
                    
                    # Handle account_number
                    if 'account_number' in customer_row.keys():
                        customer_data['account_number'] = customer_row['account_number']
                    
                    customer = Customer.create(**customer_data)
                    customer_map[customer_row['id']] = customer.id
                    print(f"  Migrated customer: {customer.full_name}")
                
            except sqlite3.OperationalError as e:
                print(f"Error migrating customers: {e}")
            
            # Migrate vehicles
            print("Migrating vehicles...")
            try:
                cursor.execute('SELECT * FROM vehicles')
                vehicles = cursor.fetchall()
                
                for vehicle_row in vehicles:
                    vehicle_data = {
                        'registration': vehicle_row['registration'],
                        'make': vehicle_row.get('make'),
                        'model': vehicle_row.get('model'),
                        'color': vehicle_row.get('color'),
                        'fuel_type': vehicle_row.get('fuel_type'),
                        'mileage': vehicle_row.get('mileage')
                    }
                    
                    # Map customer_id
                    if vehicle_row.get('customer_id') and vehicle_row['customer_id'] in customer_map:
                        vehicle_data['customer_id'] = customer_map[vehicle_row['customer_id']]
                    
                    # Handle MOT date
                    if vehicle_row.get('mot_due'):
                        try:
                            vehicle_data['mot_expiry'] = datetime.strptime(vehicle_row['mot_due'], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                    
                    # Create vehicle without DVLA fetch to preserve existing data
                    vehicle = Vehicle(**vehicle_data)
                    vehicle.save()
                    print(f"  Migrated vehicle: {vehicle.registration}")
                
            except sqlite3.OperationalError as e:
                print(f"Error migrating vehicles: {e}")
            
            conn.close()
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Migration error: {e}")
            db.session.rollback()


if __name__ == '__main__':
    migrate_database()
