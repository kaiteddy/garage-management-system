#!/usr/bin/env python3
"""
Garage Management System - Data Import Script
Demonstrates how to import data with proper field mapping and validation
"""

import os
import sqlite3
import csv
import json
from datetime import datetime
from typing import Dict, List, Any

class GarageDataImporter:
    def __init__(self, db_path: str = None):
        """Initialize the data importer"""
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), 'garage_management.db')
        self.db_path = db_path
        
    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def import_customers(self, data: List[Dict[str, Any]]) -> List[int]:
        """Import customers data with validation"""
        print("🔄 Importing customers...")
        customer_ids = []
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for customer in data:
                try:
                    # Validate required fields
                    if not customer.get('first_name') and not customer.get('name'):
                        print(f"⚠️ Skipping customer: Missing name")
                        continue
                    
                    # Prepare data with defaults
                    customer_data = {
                        'first_name': customer.get('first_name', ''),
                        'last_name': customer.get('last_name', ''),
                        'name': customer.get('name', f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()),
                        'phone_primary': customer.get('phone_primary', customer.get('mobile', '')),
                        'phone_secondary': customer.get('phone_secondary', ''),
                        'email': customer.get('email', ''),
                        'address_line1': customer.get('address_line1', customer.get('address', '')),
                        'address_line2': customer.get('address_line2', ''),
                        'city': customer.get('city', ''),
                        'county': customer.get('county', ''),
                        'postcode': customer.get('postcode', ''),
                        'country': customer.get('country', 'UK'),
                        'date_of_birth': customer.get('date_of_birth'),
                        'notes': customer.get('notes', ''),
                        'is_active': customer.get('is_active', 1)
                    }
                    
                    # Insert customer
                    columns = ', '.join(customer_data.keys())
                    placeholders = ', '.join(['?' for _ in customer_data])
                    sql = f"INSERT INTO customers ({columns}) VALUES ({placeholders})"
                    
                    cursor.execute(sql, list(customer_data.values()))
                    customer_id = cursor.lastrowid
                    customer_ids.append(customer_id)
                    
                    print(f"✅ Imported customer: {customer_data['name']} (ID: {customer_id})")
                    
                except Exception as e:
                    print(f"❌ Error importing customer {customer.get('name', 'Unknown')}: {e}")
                    
        print(f"📊 Imported {len(customer_ids)} customers")
        return customer_ids
    
    def import_vehicles(self, data: List[Dict[str, Any]]) -> List[int]:
        """Import vehicles data with validation"""
        print("🔄 Importing vehicles...")
        vehicle_ids = []
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for vehicle in data:
                try:
                    # Validate required fields
                    if not vehicle.get('registration'):
                        print(f"⚠️ Skipping vehicle: Missing registration")
                        continue
                    
                    # Validate customer exists
                    customer_id = vehicle.get('customer_id')
                    if customer_id:
                        cursor.execute("SELECT id FROM customers WHERE id = ?", (customer_id,))
                        if not cursor.fetchone():
                            print(f"⚠️ Skipping vehicle {vehicle['registration']}: Customer ID {customer_id} not found")
                            continue
                    
                    # Prepare data with defaults
                    vehicle_data = {
                        'registration': vehicle['registration'].upper().replace(' ', ''),  # Normalize registration
                        'customer_id': customer_id,
                        'make': vehicle.get('make', ''),
                        'model': vehicle.get('model', ''),
                        'year': vehicle.get('year'),
                        'colour': vehicle.get('colour', vehicle.get('color', '')),
                        'fuel_type': vehicle.get('fuel_type', ''),
                        'mot_expiry': vehicle.get('mot_expiry'),
                        'tax_due': vehicle.get('tax_due'),
                        'mileage': vehicle.get('mileage'),
                        'vin': vehicle.get('vin', ''),
                        'engine_size': vehicle.get('engine_size', ''),
                        'is_active': vehicle.get('is_active', 1)
                    }
                    
                    # Insert vehicle
                    columns = ', '.join(vehicle_data.keys())
                    placeholders = ', '.join(['?' for _ in vehicle_data])
                    sql = f"INSERT INTO vehicles ({columns}) VALUES ({placeholders})"
                    
                    cursor.execute(sql, list(vehicle_data.values()))
                    vehicle_id = cursor.lastrowid
                    vehicle_ids.append(vehicle_id)
                    
                    print(f"✅ Imported vehicle: {vehicle_data['registration']} {vehicle_data['make']} {vehicle_data['model']} (ID: {vehicle_id})")
                    
                except sqlite3.IntegrityError as e:
                    if "UNIQUE constraint failed" in str(e):
                        print(f"⚠️ Vehicle {vehicle['registration']} already exists")
                    else:
                        print(f"❌ Database error for vehicle {vehicle.get('registration', 'Unknown')}: {e}")
                except Exception as e:
                    print(f"❌ Error importing vehicle {vehicle.get('registration', 'Unknown')}: {e}")
                    
        print(f"📊 Imported {len(vehicle_ids)} vehicles")
        return vehicle_ids
    
    def import_technicians(self, data: List[Dict[str, Any]]) -> List[int]:
        """Import technicians data with validation"""
        print("🔄 Importing technicians...")
        technician_ids = []
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for tech in data:
                try:
                    # Validate required fields
                    if not tech.get('first_name') or not tech.get('last_name'):
                        print(f"⚠️ Skipping technician: Missing name")
                        continue
                    
                    # Prepare data
                    tech_data = {
                        'first_name': tech['first_name'],
                        'last_name': tech['last_name'],
                        'email': tech.get('email', ''),
                        'phone': tech.get('phone', ''),
                        'specializations': tech.get('specializations', ''),
                        'hourly_rate': tech.get('hourly_rate'),
                        'is_active': tech.get('is_active', 1)
                    }
                    
                    # Insert technician
                    columns = ', '.join(tech_data.keys())
                    placeholders = ', '.join(['?' for _ in tech_data])
                    sql = f"INSERT INTO technicians ({columns}) VALUES ({placeholders})"
                    
                    cursor.execute(sql, list(tech_data.values()))
                    tech_id = cursor.lastrowid
                    technician_ids.append(tech_id)
                    
                    print(f"✅ Imported technician: {tech_data['first_name']} {tech_data['last_name']} (ID: {tech_id})")
                    
                except Exception as e:
                    print(f"❌ Error importing technician {tech.get('first_name', 'Unknown')}: {e}")
                    
        print(f"📊 Imported {len(technician_ids)} technicians")
        return technician_ids
    
    def import_from_csv(self, csv_file: str, table_type: str):
        """Import data from CSV file"""
        print(f"📁 Reading CSV file: {csv_file}")
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                data = list(csv_reader)
                
            if table_type == 'customers':
                return self.import_customers(data)
            elif table_type == 'vehicles':
                return self.import_vehicles(data)
            elif table_type == 'technicians':
                return self.import_technicians(data)
            else:
                print(f"❌ Unknown table type: {table_type}")
                return []
                
        except FileNotFoundError:
            print(f"❌ File not found: {csv_file}")
            return []
        except Exception as e:
            print(f"❌ Error reading CSV file: {e}")
            return []
    
    def import_from_json(self, json_file: str, table_type: str):
        """Import data from JSON file"""
        print(f"📁 Reading JSON file: {json_file}")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as file:
                data = json.load(file)
                
            if table_type == 'customers':
                return self.import_customers(data)
            elif table_type == 'vehicles':
                return self.import_vehicles(data)
            elif table_type == 'technicians':
                return self.import_technicians(data)
            else:
                print(f"❌ Unknown table type: {table_type}")
                return []
                
        except FileNotFoundError:
            print(f"❌ File not found: {json_file}")
            return []
        except Exception as e:
            print(f"❌ Error reading JSON file: {e}")
            return []

def create_sample_data():
    """Create sample data files for testing"""
    print("📝 Creating sample data files...")
    
    # Sample customers
    customers = [
        {
            "first_name": "John",
            "last_name": "Smith",
            "phone_primary": "07123456789",
            "email": "john.smith@email.com",
            "address_line1": "123 Main Street",
            "city": "London",
            "postcode": "SW1A 1AA"
        },
        {
            "first_name": "Sarah",
            "last_name": "Johnson",
            "phone_primary": "07987654321",
            "email": "sarah.j@email.com",
            "address_line1": "456 Oak Avenue",
            "city": "Manchester",
            "postcode": "M1 1AA"
        }
    ]
    
    # Sample vehicles
    vehicles = [
        {
            "registration": "AB12 CDE",
            "customer_id": 1,
            "make": "Ford",
            "model": "Focus",
            "year": 2018,
            "colour": "Blue",
            "fuel_type": "Petrol",
            "mot_expiry": "2025-03-15",
            "mileage": 45000
        },
        {
            "registration": "FG34 HIJ",
            "customer_id": 2,
            "make": "Toyota",
            "model": "Corolla",
            "year": 2020,
            "colour": "Silver",
            "fuel_type": "Hybrid",
            "mot_expiry": "2025-08-22",
            "mileage": 32000
        }
    ]
    
    # Sample technicians
    technicians = [
        {
            "first_name": "James",
            "last_name": "Wilson",
            "email": "james.wilson@garage.com",
            "phone": "07111222333",
            "specializations": "Engine Repair,Diagnostics,MOT Testing",
            "hourly_rate": 25.50
        }
    ]
    
    # Save to JSON files
    with open('sample_customers.json', 'w') as f:
        json.dump(customers, f, indent=2)
    
    with open('sample_vehicles.json', 'w') as f:
        json.dump(vehicles, f, indent=2)
    
    with open('sample_technicians.json', 'w') as f:
        json.dump(technicians, f, indent=2)
    
    print("✅ Sample data files created")

if __name__ == "__main__":
    print("🚀 Garage Management System - Data Import Script")
    print("=" * 50)
    
    # Create sample data
    create_sample_data()
    
    # Initialize importer
    importer = GarageDataImporter()
    
    # Import sample data
    print("\n📊 Starting data import...")
    
    # Import in correct order (respecting foreign keys)
    customer_ids = importer.import_from_json('sample_customers.json', 'customers')
    vehicle_ids = importer.import_from_json('sample_vehicles.json', 'vehicles')
    technician_ids = importer.import_from_json('sample_technicians.json', 'technicians')
    
    print(f"\n🎉 Import complete!")
    print(f"   Customers: {len(customer_ids)}")
    print(f"   Vehicles: {len(vehicle_ids)}")
    print(f"   Technicians: {len(technician_ids)}")
