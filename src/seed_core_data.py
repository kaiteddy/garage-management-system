#!/usr/bin/env python3
"""
Seed core data for the Garage Management System
Adds sample customers, vehicles, jobs, and invoices
"""

import os
import random
import sqlite3
import sys
from datetime import datetime, timedelta

# Add the src directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def get_db_path():
    """Get database path"""
    return os.path.join(os.path.dirname(__file__), '..', 'instance', 'garage.db')


def seed_customers():
    """Add sample customers"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("🧑‍🤝‍🧑 Adding sample customers...")

        sample_customers = [
            ('CUST001', 'John Doe', 'Doe Enterprises', '123 Main St, London',
             'SW1A 1AA', '02071234567', '07700900123', 'john.doe@example.com'),
            ('CUST002', 'Jane Smith', '', '456 High St, Manchester', 'M1 1AA',
             '01612345678', '07700900456', 'jane.smith@example.com'),
            ('CUST003', 'Robert Johnson', 'Johnson Ltd', '789 Park Lane, Birmingham',
             'B1 1AA', '01214567890', '07700900789', 'robert.johnson@example.com'),
            ('CUST004', 'Sarah Williams', '', '101 Queen St, Edinburgh', 'EH1 1AA',
             '01312345678', '07700900234', 'sarah.williams@example.com'),
            ('CUST005', 'Michael Brown', 'Brown Motors', '202 King St, Glasgow',
             'G1 1AA', '01412345678', '07700900567', 'michael.brown@example.com')
        ]

        for customer in sample_customers:
            cursor.execute('''
                INSERT OR IGNORE INTO customers 
                (account_number, name, company, address, postcode, phone, mobile, email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', customer)

        conn.commit()
        print(f"✅ Added {len(sample_customers)} sample customers")

    except Exception as e:
        print(f"❌ Error adding customers: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_vehicles():
    """Add sample vehicles"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("🚗 Adding sample vehicles...")

        # Get customer IDs
        cursor.execute("SELECT id FROM customers")
        customer_ids = [row[0] for row in cursor.fetchall()]

        if not customer_ids:
            print("⚠️ No customers found. Please add customers first.")
            return

        sample_vehicles = [
            ('AB12CDE', 'Ford', 'Focus', 2018, 'Blue', 'Petrol', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
             (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d'), 45000, random.choice(customer_ids)),
            ('EF34GHI', 'Volkswagen', 'Golf', 2019, 'Black', 'Diesel', (datetime.now() + timedelta(days=45)).strftime(
                '%Y-%m-%d'), (datetime.now() + timedelta(days=75)).strftime('%Y-%m-%d'), 35000, random.choice(customer_ids)),
            ('JK56LMN', 'Toyota', 'Corolla', 2020, 'Silver', 'Hybrid', (datetime.now() + timedelta(days=60)).strftime(
                '%Y-%m-%d'), (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d'), 25000, random.choice(customer_ids)),
            ('OP78QRS', 'BMW', '3 Series', 2021, 'White', 'Petrol', (datetime.now() + timedelta(days=75)).strftime('%Y-%m-%d'),
             (datetime.now() + timedelta(days=105)).strftime('%Y-%m-%d'), 15000, random.choice(customer_ids)),
            ('TU90VWX', 'Audi', 'A4', 2022, 'Red', 'Diesel', (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d'),
             (datetime.now() + timedelta(days=120)).strftime('%Y-%m-%d'), 5000, random.choice(customer_ids)),
            ('YZ12ABC', 'Mercedes', 'C-Class', 2020, 'Grey', 'Petrol', (datetime.now() + timedelta(days=15)).strftime(
                '%Y-%m-%d'), (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d'), 30000, random.choice(customer_ids)),
            ('DE34FGH', 'Honda', 'Civic', 2019, 'Green', 'Petrol', (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
             (datetime.now() + timedelta(days=35)).strftime('%Y-%m-%d'), 40000, random.choice(customer_ids)),
            ('IJ56KLM', 'Nissan', 'Qashqai', 2021, 'Blue', 'Diesel', (datetime.now() + timedelta(days=120)).strftime('%Y-%m-%d'),
             (datetime.now() + timedelta(days=150)).strftime('%Y-%m-%d'), 20000, random.choice(customer_ids))
        ]

        for vehicle in sample_vehicles:
            cursor.execute('''
                INSERT OR IGNORE INTO vehicles 
                (registration, make, model, year, color, fuel_type, mot_expiry, tax_due, mileage, customer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', vehicle)

        conn.commit()
        print(f"✅ Added {len(sample_vehicles)} sample vehicles")

    except Exception as e:
        print(f"❌ Error adding vehicles: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_jobs():
    """Add sample jobs"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("🔧 Adding sample jobs...")

        # Get customer and vehicle IDs
        cursor.execute("SELECT id FROM customers")
        customer_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute("SELECT id, customer_id FROM vehicles")
        vehicles = [(row[0], row[1]) for row in cursor.fetchall()]

        if not customer_ids or not vehicles:
            print("⚠️ No customers or vehicles found. Please add them first.")
            return

        # Status options: BOOKED_IN, IN_PROGRESS, AWAITING_PARTS, COMPLETED, INVOICED, PAID
        # Priority options: LOW, NORMAL, HIGH, URGENT
        statuses = ['BOOKED_IN', 'IN_PROGRESS',
                    'AWAITING_PARTS', 'COMPLETED', 'INVOICED', 'PAID']
        priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

        sample_jobs = []

        for i in range(1, 11):
            # Select a random vehicle and its associated customer
            vehicle_id, customer_id = random.choice(vehicles)

            # Generate random job data
            job_number = f'JOB-{2025}0{i:03d}'
            description = random.choice([
                'Annual service and MOT',
                'Brake pad replacement',
                'Oil and filter change',
                'Timing belt replacement',
                'Clutch replacement',
                'Engine diagnostics',
                'Air conditioning regas',
                'Suspension repair',
                'Exhaust system replacement',
                'Electrical fault diagnosis'
            ])
            status = random.choice(statuses)
            priority = random.choice(priorities)
            assigned_technician = random.choice(
                ['John Smith', 'Sarah Johnson', 'Mike Wilson'])

            estimated_hours = round(random.uniform(1.0, 8.0), 1)
            actual_hours = round(random.uniform(estimated_hours * 0.8, estimated_hours * 1.2),
                                 1) if status in ['COMPLETED', 'INVOICED', 'PAID'] else 0.0

            labour_cost = actual_hours * \
                random.uniform(
                    50.0, 80.0) if actual_hours > 0 else estimated_hours * random.uniform(50.0, 80.0)
            parts_cost = random.uniform(50.0, 500.0)
            total_amount = labour_cost + parts_cost

            created_date = (
                datetime.now() - timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d')
            started_date = (datetime.now() - timedelta(days=random.randint(1, 20))
                            ).strftime('%Y-%m-%d') if status != 'BOOKED_IN' else None
            completed_date = (datetime.now() - timedelta(days=random.randint(1, 10))).strftime(
                '%Y-%m-%d') if status in ['COMPLETED', 'INVOICED', 'PAID'] else None
            due_date = (
                datetime.now() + timedelta(days=random.randint(1, 14))).strftime('%Y-%m-%d')

            notes = "Customer requested work to be completed ASAP." if priority in [
                'HIGH', 'URGENT'] else ""
            internal_notes = "Parts ordered from main supplier." if status == 'AWAITING_PARTS' else ""

            customer_authorization = 1 if status != 'BOOKED_IN' else 0
            bay_number = f'BAY{random.randint(1, 4)}'

            sample_jobs.append((
                job_number, customer_id, vehicle_id, description, status, priority, assigned_technician,
                estimated_hours, actual_hours, labour_cost, parts_cost, total_amount,
                created_date, started_date, completed_date, due_date, notes, internal_notes,
                customer_authorization, bay_number
            ))

        for job in sample_jobs:
            cursor.execute('''
                INSERT OR IGNORE INTO jobs 
                (job_number, customer_id, vehicle_id, description, status, priority, assigned_technician,
                estimated_hours, actual_hours, labour_cost, parts_cost, total_amount,
                created_date, started_date, completed_date, due_date, notes, internal_notes,
                customer_authorization, bay_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', job)

        conn.commit()
        print(f"✅ Added {len(sample_jobs)} sample jobs")

    except Exception as e:
        print(f"❌ Error adding jobs: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_invoices():
    """Add sample invoices"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("📝 Adding sample invoices...")

        # Get completed jobs
        cursor.execute("""
            SELECT j.id, j.customer_id, j.vehicle_id, j.total_amount, j.completed_date
            FROM jobs j
            WHERE j.status IN ('COMPLETED', 'INVOICED', 'PAID')
        """)
        completed_jobs = cursor.fetchall()

        if not completed_jobs:
            print("⚠️ No completed jobs found. Please add jobs first.")
            return

        sample_invoices = []

        for i, job in enumerate(completed_jobs):
            job_id, customer_id, vehicle_id, amount, completed_date = job

            # Generate invoice data
            invoice_number = f'INV-{2025}0{i+1:03d}'
            vat_amount = amount * 0.2  # 20% VAT
            total_amount = amount + vat_amount

            # Randomly select status
            status = random.choice(['PENDING', 'PAID'])

            created_date = completed_date
            due_date = (datetime.strptime(completed_date, '%Y-%m-%d') +
                        timedelta(days=30)).strftime('%Y-%m-%d')
            paid_date = (datetime.strptime(completed_date, '%Y-%m-%d') + timedelta(
                days=random.randint(1, 25))).strftime('%Y-%m-%d') if status == 'PAID' else None

            payment_method = random.choice(
                ['CARD', 'BANK_TRANSFER', 'CASH', 'CHEQUE']) if status == 'PAID' else None

            notes = "Thank you for your business!" if status == 'PAID' else "Payment due within 30 days."
            is_locked = 1 if status == 'PAID' else 0

            sample_invoices.append((
                invoice_number, job_id, customer_id, vehicle_id, amount, vat_amount, total_amount,
                status, created_date, due_date, paid_date, payment_method, notes, is_locked
            ))

        for invoice in sample_invoices:
            cursor.execute('''
                INSERT OR IGNORE INTO invoices 
                (invoice_number, job_id, customer_id, vehicle_id, amount, vat_amount, total_amount,
                status, created_date, due_date, paid_date, payment_method, notes, is_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', invoice)

            # Update job status if invoice is created
            job_id = invoice[1]
            invoice_status = invoice[7]
            job_status = 'PAID' if invoice_status == 'PAID' else 'INVOICED'

            cursor.execute('''
                UPDATE jobs
                SET status = ?
                WHERE id = ?
            ''', (job_status, job_id))

        conn.commit()
        print(f"✅ Added {len(sample_invoices)} sample invoices")

    except Exception as e:
        print(f"❌ Error adding invoices: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_appointments():
    """Add sample appointments"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("📅 Adding sample appointments...")

        # Get customer and vehicle IDs
        cursor.execute("SELECT id FROM customers")
        customer_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute("SELECT id, customer_id FROM vehicles")
        vehicles = [(row[0], row[1]) for row in cursor.fetchall()]

        cursor.execute("SELECT id FROM technicians")
        technician_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute("SELECT id FROM workshop_bays")
        bay_ids = [row[0] for row in cursor.fetchall()]

        if not customer_ids or not vehicles or not technician_ids or not bay_ids:
            print("⚠️ Missing required data. Please add customers, vehicles, technicians, and workshop bays first.")
            return

        # Get existing job IDs
        cursor.execute("SELECT id FROM jobs WHERE status = 'BOOKED_IN'")
        job_ids = [row[0] for row in cursor.fetchall()]

        sample_appointments = []

        # Add appointments for existing jobs
        for job_id in job_ids:
            cursor.execute(
                "SELECT customer_id, vehicle_id FROM jobs WHERE id = ?", (job_id,))
            job_data = cursor.fetchone()

            if job_data:
                customer_id, vehicle_id = job_data

                # Generate appointment data
                appointment_date = (
                    datetime.now() + timedelta(days=random.randint(1, 14))).strftime('%Y-%m-%d')
                start_hour = random.randint(9, 15)
                start_time = f'{start_hour:02d}:00'
                end_time = f'{start_hour + 2:02d}:00'

                estimated_duration = 120  # 2 hours
                service_type = random.choice(
                    ['Service', 'MOT', 'Repair', 'Diagnostic'])
                description = f"{service_type} appointment for vehicle"

                status = 'SCHEDULED'
                priority = random.choice(['NORMAL', 'HIGH'])

                technician_id = random.choice(technician_ids)
                bay_id = random.choice(bay_ids)

                sample_appointments.append((
                    job_id, customer_id, vehicle_id, technician_id, bay_id,
                    appointment_date, start_time, end_time, estimated_duration,
                    service_type, description, status, priority
                ))

        # Add some additional appointments without jobs
        for i in range(5):
            vehicle_id, customer_id = random.choice(vehicles)

            # Generate appointment data
            appointment_date = (
                datetime.now() + timedelta(days=random.randint(1, 21))).strftime('%Y-%m-%d')
            start_hour = random.randint(9, 15)
            start_time = f'{start_hour:02d}:00'
            end_time = f'{start_hour + 1:02d}:00'

            estimated_duration = 60  # 1 hour
            service_type = random.choice(
                ['Service', 'MOT', 'Repair', 'Diagnostic'])
            description = f"{service_type} appointment for vehicle"

            status = 'SCHEDULED'
            priority = 'NORMAL'

            technician_id = random.choice(technician_ids)
            bay_id = random.choice(bay_ids)

            sample_appointments.append((
                None, customer_id, vehicle_id, technician_id, bay_id,
                appointment_date, start_time, end_time, estimated_duration,
                service_type, description, status, priority
            ))

        for appointment in sample_appointments:
            cursor.execute('''
                INSERT OR IGNORE INTO appointments 
                (job_id, customer_id, vehicle_id, technician_id, bay_id,
                appointment_date, start_time, end_time, estimated_duration,
                service_type, description, status, priority)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', appointment)

        conn.commit()
        print(f"✅ Added {len(sample_appointments)} sample appointments")

    except Exception as e:
        print(f"❌ Error adding appointments: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_job_sheets():
    """Add sample job sheets"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("📋 Adding sample job sheets...")

        # Get job IDs
        cursor.execute("SELECT id FROM jobs")
        job_ids = [row[0] for row in cursor.fetchall()]

        # Get template IDs
        cursor.execute("SELECT id FROM job_sheet_templates")
        template_ids = [row[0] for row in cursor.fetchall()]

        if not job_ids or not template_ids:
            print("⚠️ No jobs or templates found. Please add them first.")
            return

        sample_job_sheets = []

        for i, job_id in enumerate(job_ids):
            # Generate job sheet data
            sheet_number = f'JS-{2025}0{i+1:03d}'
            template_id = random.choice(template_ids)

            # Get template details
            cursor.execute(
                "SELECT default_instructions, default_safety_notes, default_parts, default_tools, default_checks FROM job_sheet_templates WHERE id = ?", (template_id,))
            template = cursor.fetchone()

            if template:
                work_instructions = template[0]
                safety_notes = template[1]
                parts_required = template[2]
                tools_required = template[3]
                quality_checks = template[4]

                # Randomly select status
                status = random.choice(['DRAFT', 'IN_PROGRESS', 'COMPLETED'])

                # Dates based on status
                created_date = (
                    datetime.now() - timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d')
                completed_date = (datetime.now() - timedelta(days=random.randint(1, 10))
                                  ).strftime('%Y-%m-%d') if status == 'COMPLETED' else None

                # Signatures based on status
                technician_signature = "John Smith" if status in [
                    'COMPLETED'] else None
                supervisor_signature = "Mike Wilson" if status in [
                    'COMPLETED'] else None
                customer_signature = "Customer" if status in [
                    'COMPLETED'] else None
                signed_date = completed_date if status in [
                    'COMPLETED'] else None

                sample_job_sheets.append((
                    job_id, sheet_number, template_id, work_instructions, safety_notes,
                    parts_required, tools_required, quality_checks,
                    technician_signature, supervisor_signature, customer_signature,
                    signed_date, completed_date, status, created_date
                ))

        for job_sheet in sample_job_sheets:
            cursor.execute('''
                INSERT OR IGNORE INTO job_sheets 
                (job_id, sheet_number, template_id, work_instructions, safety_notes,
                parts_required, tools_required, quality_checks,
                technician_signature, supervisor_signature, customer_signature,
                signed_date, completed_date, status, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', job_sheet)

        conn.commit()
        print(f"✅ Added {len(sample_job_sheets)} sample job sheets")

    except Exception as e:
        print(f"❌ Error adding job sheets: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_quotes():
    """Add sample quotes"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("💰 Adding sample quotes...")

        # Get customer and vehicle IDs
        cursor.execute("SELECT id FROM customers")
        customer_ids = [row[0] for row in cursor.fetchall()]

        cursor.execute("SELECT id, customer_id FROM vehicles")
        vehicles = [(row[0], row[1]) for row in cursor.fetchall()]

        if not customer_ids or not vehicles:
            print("⚠️ No customers or vehicles found. Please add them first.")
            return

        sample_quotes = []

        for i in range(1, 8):
            # Select a random vehicle and its associated customer
            vehicle_id, customer_id = random.choice(vehicles)

            # Generate quote data
            quote_number = f'QUO-{2025}0{i:03d}'
            description = random.choice([
                'Full service quote',
                'Brake system replacement',
                'Clutch replacement',
                'Engine rebuild',
                'Suspension overhaul',
                'Timing belt and water pump',
                'Exhaust system replacement'
            ])

            labour_cost = random.uniform(100.0, 800.0)
            parts_cost = random.uniform(50.0, 1000.0)
            total_amount = labour_cost + parts_cost
            vat_amount = total_amount * 0.2  # 20% VAT
            final_total = total_amount + vat_amount

            # Randomly select status
            status = random.choice(
                ['DRAFT', 'PENDING', 'ACCEPTED', 'DECLINED'])

            created_date = (
                datetime.now() - timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d')
            valid_until = (datetime.now() + timedelta(days=30)
                           ).strftime('%Y-%m-%d')
            sent_date = (datetime.now() - timedelta(days=random.randint(1, 25))
                         ).strftime('%Y-%m-%d') if status != 'DRAFT' else None
            accepted_date = (datetime.now() - timedelta(days=random.randint(1, 20))
                             ).strftime('%Y-%m-%d') if status == 'ACCEPTED' else None

            notes = "Customer requested detailed breakdown of parts."
            terms_conditions = "Quote valid for 30 days. All parts and labor guaranteed for 12 months."

            sample_quotes.append((
                quote_number, customer_id, vehicle_id, description,
                labour_cost, parts_cost, total_amount, vat_amount, final_total,
                status, valid_until, created_date, sent_date, accepted_date,
                notes, terms_conditions
            ))

        for quote in sample_quotes:
            cursor.execute('''
                INSERT OR IGNORE INTO quotes 
                (quote_number, customer_id, vehicle_id, description,
                labour_cost, parts_cost, total_amount, vat_amount, final_total,
                status, valid_until, created_date, sent_date, accepted_date,
                notes, terms_conditions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', quote)

        conn.commit()
        print(f"✅ Added {len(sample_quotes)} sample quotes")

    except Exception as e:
        print(f"❌ Error adding quotes: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    """Main function"""
    print("🚀 Seeding core data for Garage Management System...")

    # Seed data in the correct order to maintain referential integrity
    seed_customers()
    seed_vehicles()
    seed_jobs()
    seed_invoices()
    seed_appointments()
    seed_job_sheets()
    seed_quotes()

    print("\n🎉 Core data seeding completed!")
    print("\nThe system now has sample data for:")
    print("- Customers")
    print("- Vehicles")
    print("- Jobs")
    print("- Invoices")
    print("- Appointments")
    print("- Job Sheets")
    print("- Quotes")
    print("- Technicians")
    print("- Workshop Bays")
    print("- Job Sheet Templates")


if __name__ == "__main__":
    main()
