#!/usr/bin/env python3
"""
Initialize workshop data - technicians, bays, and sample appointments
"""

import os
import sqlite3
import sys
from datetime import datetime, timedelta


def init_workshop_data():
    """Initialize workshop data with technicians, bays, and sample appointments"""

    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    if not os.path.exists(db_path):
        print("❌ Database not found. Please run the main application first to create the database.")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("🔄 Initializing workshop data...")

        # Create tables first (in case they don't exist)
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

        # Insert sample technicians
        technicians = [
            ('John Smith', 'john.smith@elimotors.com',
             '07123456789', 'MOT Testing', 25.00, '08:00', '17:00'),
            ('Sarah Johnson', 'sarah.johnson@elimotors.com',
             '07234567890', 'Diagnostics', 28.00, '08:30', '17:30'),
            ('Mike Wilson', 'mike.wilson@elimotors.com',
             '07345678901', 'Engine Repair', 30.00, '08:00', '16:30'),
            ('Emma Davis', 'emma.davis@elimotors.com',
             '07456789012', 'Bodywork', 26.00, '09:00', '17:00'),
            ('Tom Brown', 'tom.brown@elimotors.com', '07567890123',
             'General Service', 24.00, '08:00', '17:00')
        ]

        for tech in technicians:
            cursor.execute('''
                INSERT OR IGNORE INTO technicians 
                (name, email, phone, specialization, hourly_rate, start_time, end_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', tech)

        print(f"✅ Added {len(technicians)} technicians")

        # Insert workshop bays
        bays = [
            ('1', 'Bay 1 - MOT', 'MOT',
             '["MOT Testing Equipment", "Brake Tester", "Emissions Tester"]'),
            ('2', 'Bay 2 - Service', 'GENERAL',
             '["2-Post Lift", "Air Tools", "Oil Drain"]'),
            ('3', 'Bay 3 - Diagnostics', 'DIAGNOSTIC',
             '["4-Post Lift", "Diagnostic Scanner", "Oscilloscope"]'),
            ('4', 'Bay 4 - Heavy Repair', 'LIFT',
             '["4-Post Heavy Lift", "Engine Crane", "Welding Equipment"]'),
            ('5', 'Bay 5 - Quick Service', 'GENERAL',
             '["Quick Lift", "Tyre Machine", "Wheel Balancer"]'),
            ('6', 'Bay 6 - Bodywork', 'BODYWORK',
             '["Paint Booth", "Body Repair Tools", "Spray Equipment"]')
        ]

        for bay in bays:
            cursor.execute('''
                INSERT OR IGNORE INTO workshop_bays 
                (bay_number, bay_name, bay_type, equipment)
                VALUES (?, ?, ?, ?)
            ''', bay)

        print(f"✅ Added {len(bays)} workshop bays")

        # Insert job sheet templates
        templates = [
            (
                'MOT Test', 'MOT', 'Standard MOT test procedure',
                '''1. Check vehicle identification
2. Test lights and electrical systems
3. Check steering and suspension
4. Test brakes and handbrake
5. Examine tyres and wheels
6. Check exhaust emissions
7. Test horn and mirrors
8. Inspect body and structure
9. Complete MOT certificate''',
                '''- Ensure vehicle is properly positioned on MOT bay
- Check all safety equipment is functional
- Wear appropriate PPE
- Follow MOT testing manual procedures''',
                '[]',
                '["MOT Testing Equipment", "Brake Tester", "Emissions Tester", "Light Tester"]',
                '["Lights check", "Brake test", "Emissions test", "Suspension check", "Tyre inspection"]',
                45
            ),
            (
                'Full Service', 'SERVICE', 'Comprehensive vehicle service',
                '''1. Check engine oil and filter
2. Inspect air filter
3. Check brake fluid and pads
4. Test battery and charging system
5. Inspect belts and hoses
6. Check tyre pressures and condition
7. Test lights and electrical systems
8. Check exhaust system
9. Road test vehicle''',
                '''- Ensure engine is cool before starting
- Use proper lifting procedures
- Dispose of waste materials correctly
- Check for any recalls or technical bulletins''',
                '["Engine Oil", "Oil Filter", "Air Filter", "Brake Fluid"]',
                '["Socket Set", "Oil Drain Pan", "Torque Wrench", "Multimeter"]',
                '["Oil level check", "Filter inspection", "Brake test", "Light test", "Road test"]',
                90
            ),
            (
                'Brake Service', 'REPAIR', 'Brake system service and repair',
                '''1. Remove wheels and inspect brake components
2. Check brake pad thickness
3. Inspect brake discs for wear/damage
4. Check brake fluid level and condition
5. Test brake pedal feel and travel
6. Inspect brake lines and hoses
7. Check handbrake operation
8. Road test braking performance''',
                '''- Never work under vehicle supported only by jack
- Use proper brake fluid - do not mix types
- Ensure brake system is properly bled
- Test brakes thoroughly before returning vehicle''',
                '["Brake Pads", "Brake Fluid", "Brake Cleaner"]',
                '["Brake Caliper Tool", "Brake Bleeding Kit", "Torque Wrench"]',
                '["Pad thickness check", "Disc inspection", "Fluid test", "Brake test"]',
                120
            )
        ]

        for template in templates:
            cursor.execute('''
                INSERT OR IGNORE INTO job_sheet_templates 
                (name, service_type, description, default_instructions, default_safety_notes, 
                 default_parts, default_tools, default_checks, estimated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', template)

        print(f"✅ Added {len(templates)} job sheet templates")

        # Create some sample appointments for the next few days
        today = datetime.now().date()

        # Get some customer and vehicle IDs for sample appointments
        cursor.execute('SELECT id FROM customers LIMIT 5')
        customer_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute('SELECT id FROM vehicles LIMIT 5')
        vehicle_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute('SELECT id FROM technicians LIMIT 3')
        technician_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute('SELECT id FROM workshop_bays LIMIT 3')
        bay_ids = [row[0] for row in cursor.fetchall()]

        if customer_ids and vehicle_ids and technician_ids and bay_ids:
            sample_appointments = [
                (customer_ids[0], vehicle_ids[0], technician_ids[0], bay_ids[0],
                 today, '09:00', '10:00', 60, 'MOT Test', 'Annual MOT test', 'SCHEDULED', 'NORMAL'),
                (customer_ids[1], vehicle_ids[1], technician_ids[1], bay_ids[1],
                 today, '10:30', '12:00', 90, 'Full Service', 'Comprehensive service', 'SCHEDULED', 'NORMAL'),
                (customer_ids[2], vehicle_ids[2], technician_ids[2], bay_ids[2],
                 today + timedelta(days=1), '14:00', '16:00', 120, 'Brake Repair', 'Brake pad replacement', 'SCHEDULED', 'HIGH'),
                (customer_ids[3], vehicle_ids[3], technician_ids[0], bay_ids[0],
                 today + timedelta(days=1), '09:30', '10:15', 45, 'MOT Test', 'MOT retest', 'SCHEDULED', 'URGENT'),
                (customer_ids[4], vehicle_ids[4], technician_ids[1], bay_ids[1],
                 today + timedelta(days=2), '11:00', '12:30', 90, 'Diagnostics', 'Engine fault diagnosis', 'SCHEDULED', 'HIGH')
            ]

            for apt in sample_appointments:
                cursor.execute('''
                    INSERT OR IGNORE INTO appointments 
                    (customer_id, vehicle_id, technician_id, bay_id, appointment_date, 
                     start_time, end_time, estimated_duration, service_type, description, status, priority)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', apt)

            print(f"✅ Added {len(sample_appointments)} sample appointments")

        # Create some sample quotes
        if customer_ids and vehicle_ids:
            sample_quotes = [
                (customer_ids[0], vehicle_ids[0], 'Annual MOT Test', 45.00, 0.00, 'SENT',
                 (today + timedelta(days=30)).isoformat(), 'Standard MOT test with certificate'),
                (customer_ids[1], vehicle_ids[1], 'Full Service Package', 120.00, 85.50, 'APPROVED',
                 (today + timedelta(days=14)).isoformat(), 'Comprehensive service including oil change and filter replacement'),
                (customer_ids[2], vehicle_ids[2], 'Brake Pad Replacement', 80.00, 65.00, 'DRAFT',
                 (today + timedelta(days=21)).isoformat(), 'Front brake pads and discs replacement'),
                (customer_ids[3], vehicle_ids[3], 'Engine Diagnostics', 75.00, 0.00, 'SENT',
                 (today + timedelta(days=7)).isoformat(), 'Computer diagnostic check for engine fault codes'),
                (customer_ids[4], vehicle_ids[4], 'Clutch Repair', 350.00, 180.00, 'REJECTED',
                 (today + timedelta(days=45)).isoformat(), 'Clutch replacement and flywheel resurface')
            ]

            for quote_data in sample_quotes:
                customer_id, vehicle_id, description, labour, parts, status, valid_until, notes = quote_data

                # Calculate totals
                subtotal = labour + parts
                vat_amount = subtotal * 0.20
                total_amount = subtotal + vat_amount

                # Generate quote number
                cursor.execute('SELECT COUNT(*) FROM quotes')
                count = cursor.fetchone()[0]
                quote_number = f"QT{(count + 1):06d}"

                cursor.execute('''
                    INSERT INTO quotes
                    (quote_number, customer_id, vehicle_id, description, labour_cost, parts_cost,
                     total_amount, vat_amount, status, valid_until, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (quote_number, customer_id, vehicle_id, description, labour, parts,
                      total_amount, vat_amount, status, valid_until, notes))

            print(f"✅ Added {len(sample_quotes)} sample quotes")

        # Commit changes
        conn.commit()
        print("✅ Workshop data initialization completed successfully!")

        # Show summary
        cursor.execute('SELECT COUNT(*) FROM technicians WHERE is_active = 1')
        tech_count = cursor.fetchone()[0]

        cursor.execute(
            'SELECT COUNT(*) FROM workshop_bays WHERE is_available = 1')
        bay_count = cursor.fetchone()[0]

        cursor.execute(
            'SELECT COUNT(*) FROM job_sheet_templates WHERE is_active = 1')
        template_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM appointments')
        appointment_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM quotes')
        quote_count = cursor.fetchone()[0]

        print(f"\n📊 Workshop Summary:")
        print(f"   Active Technicians: {tech_count}")
        print(f"   Available Bays: {bay_count}")
        print(f"   Job Templates: {template_count}")
        print(f"   Appointments: {appointment_count}")
        print(f"   Quotes: {quote_count}")

        conn.close()
        return True

    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == '__main__':
    print("🚀 Workshop Data Initialization Script")
    print("=" * 50)

    success = init_workshop_data()

    if success:
        print("\n🎉 Workshop data initialized successfully!")
        print("You can now use the Workshop Diary and Job Sheet features.")
    else:
        print("\n❌ Workshop data initialization failed!")
        sys.exit(1)
