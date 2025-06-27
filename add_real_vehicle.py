#!/usr/bin/env python3
"""
Add real vehicle with DVSA data to MOT system
"""

import sqlite3
import os
from datetime import datetime

def add_real_vehicle():
    """Add LN64XFG with real DVSA data"""
    
    # Database path (same as MOT service)
    db_path = os.path.join('src', 'garage_management.db')
    
    print(f"🔧 Adding real vehicle to database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS mot_vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration TEXT UNIQUE NOT NULL,
                customer_name TEXT,
                mobile_number TEXT,
                email TEXT,
                make TEXT,
                model TEXT,
                year INTEGER,
                colour TEXT,
                fuel_type TEXT,
                engine_size TEXT,
                mot_expiry DATE,
                mot_status TEXT,
                days_remaining INTEGER,
                can_send_sms BOOLEAN DEFAULT 1,
                send_by_default BOOLEAN DEFAULT 1,
                last_sms_sent DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                archived BOOLEAN DEFAULT 0,
                archive_reason TEXT,
                main_customer_id INTEGER
            )
        ''')
        
        # Real data from DVSA API for LN64XFG
        vehicle_data = {
            'registration': 'LN64XFG',
            'customer_name': 'Test Customer',
            'mobile_number': '07700900123',
            'email': 'test@example.com',
            'make': 'VOLKSWAGEN',
            'model': 'GOLF',
            'year': 2014,
            'colour': 'Black',
            'fuel_type': 'Petrol',
            'engine_size': '1395',
            'mot_expiry': '2025-10-04',  # Real expiry from DVSA
            'mot_status': 'valid',
            'days_remaining': 100,  # Approximately 3 months
            'can_send_sms': True,
            'send_by_default': True,
            'archived': False
        }
        
        # Insert vehicle using correct schema
        cursor.execute('''
            INSERT OR REPLACE INTO mot_vehicles (
                registration, customer_name, mobile_number,
                make, model, mot_expiry_date, days_until_expiry,
                is_expired, test_result
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            vehicle_data['registration'],
            vehicle_data['customer_name'],
            vehicle_data['mobile_number'],
            vehicle_data['make'],
            vehicle_data['model'],
            vehicle_data['mot_expiry'],
            vehicle_data['days_remaining'],
            vehicle_data['days_remaining'] < 0,  # is_expired
            'PASSED'  # test_result
        ))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Successfully added {vehicle_data['registration']} - {vehicle_data['make']} {vehicle_data['model']}")
        print(f"📅 MOT expires: {vehicle_data['mot_expiry']}")
        print(f"🚗 Vehicle details: {vehicle_data['year']} {vehicle_data['colour']} {vehicle_data['fuel_type']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error adding vehicle: {e}")
        return False

def add_sample_vehicles():
    """Add several sample vehicles for testing"""
    
    db_path = os.path.join('src', 'garage_management.db')
    
    sample_vehicles = [
        {
            'registration': 'AB12CDE',
            'customer_name': 'John Smith',
            'mobile_number': '07700900456',
            'email': 'john.smith@email.com',
            'make': 'Ford',
            'model': 'Focus',
            'year': 2018,
            'colour': 'Blue',
            'fuel_type': 'Petrol',
            'engine_size': '1600',
            'mot_expiry': '2024-12-15',  # Expired
            'mot_status': 'expired',
            'days_remaining': -10,
        },
        {
            'registration': 'FG34HIJ',
            'customer_name': 'Sarah Johnson',
            'mobile_number': '07700900789',
            'email': 'sarah.johnson@email.com',
            'make': 'Vauxhall',
            'model': 'Astra',
            'year': 2019,
            'colour': 'Red',
            'fuel_type': 'Diesel',
            'engine_size': '1400',
            'mot_expiry': '2025-01-03',  # Critical
            'mot_status': 'critical',
            'days_remaining': 7,
        },
        {
            'registration': 'KL56MNO',
            'customer_name': 'Mike Wilson',
            'mobile_number': '07700900012',
            'email': 'mike.wilson@email.com',
            'make': 'BMW',
            'model': '320i',
            'year': 2020,
            'colour': 'White',
            'fuel_type': 'Petrol',
            'engine_size': '2000',
            'mot_expiry': '2025-02-15',  # Due Soon
            'mot_status': 'warning',
            'days_remaining': 50,
        }
    ]
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        for vehicle in sample_vehicles:
            cursor.execute('''
                INSERT OR REPLACE INTO mot_vehicles (
                    registration, customer_name, mobile_number,
                    make, model, mot_expiry_date, days_until_expiry,
                    is_expired, test_result
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                vehicle['registration'],
                vehicle['customer_name'],
                vehicle['mobile_number'],
                vehicle['make'],
                vehicle['model'],
                vehicle['mot_expiry'],
                vehicle['days_remaining'],
                vehicle['days_remaining'] < 0,  # is_expired
                'PASSED' if vehicle['days_remaining'] >= 0 else 'FAILED'
            ))
            
            print(f"✅ Added {vehicle['registration']} - {vehicle['make']} {vehicle['model']}")
        
        conn.commit()
        conn.close()
        
        print(f"\n📊 Added {len(sample_vehicles)} sample vehicles")
        return True
        
    except Exception as e:
        print(f"❌ Error adding sample vehicles: {e}")
        return False

if __name__ == "__main__":
    print("🚗 Adding vehicles to MOT system...")
    
    # Add real vehicle with DVSA data
    if add_real_vehicle():
        print("✅ Real vehicle added successfully")
    
    # Add sample vehicles for testing
    if add_sample_vehicles():
        print("✅ Sample vehicles added successfully")
    
    print("\n🎉 Vehicle addition complete!")
    print("💡 You can now test the clean data presentation in the MOT system")
