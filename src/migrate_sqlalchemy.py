#!/usr/bin/env python3
"""
Migrate data from SQLite tables to SQLAlchemy models
This script will create the SQLAlchemy models in the database and populate them with data
"""

import os
import sqlite3
import sys
from datetime import datetime

from app import app, db
from models import (Appointment, Customer, Invoice, Job, JobPart, JobSheet,
                    JobSheetTemplate, Part, Quote, Supplier, Technician,
                    Vehicle, WorkshopBay)

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def get_db_path():
    """Get database path"""
    return os.path.join(os.path.dirname(__file__), '..', 'instance', 'garage.db')


def get_sqlite_connection():
    """Get SQLite connection"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def create_sqlalchemy_tables():
    """Create SQLAlchemy tables"""
    print("🔧 Creating SQLAlchemy tables...")
    with app.app_context():
        db.create_all()
    print("✅ SQLAlchemy tables created successfully")


def migrate_customers():
    """Migrate customers from SQLite to SQLAlchemy"""
    print("🧑‍🤝‍🧑 Migrating customers...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all customers from SQLite
    cursor.execute("""
        SELECT id, account_number, name, company, address, postcode, phone, mobile, email, 
               created_date, updated_date
        FROM customers
    """)

    customers = cursor.fetchall()
    conn.close()

    # Add customers to SQLAlchemy
    with app.app_context():
        for customer in customers:
            # Check if customer already exists
            existing = Customer.query.get(customer['id'])
            if existing:
                continue

            new_customer = Customer(
                id=customer['id'],
                account_number=customer['account_number'],
                name=customer['name'],
                company=customer['company'],
                address=customer['address'],
                postcode=customer['postcode'],
                phone=customer['phone'],
                mobile=customer['mobile'],
                email=customer['email'],
                created_date=customer['created_date'],
                updated_date=customer['updated_date']
            )
            db.session.add(new_customer)

        db.session.commit()

    print(f"✅ Migrated {len(customers)} customers")


def migrate_vehicles():
    """Migrate vehicles from SQLite to SQLAlchemy"""
    print("🚗 Migrating vehicles...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all vehicles from SQLite
    cursor.execute("""
        SELECT id, registration, make, model, year, color, fuel_type, mot_expiry, tax_due, 
               mileage, customer_id, created_at, updated_at
        FROM vehicles
    """)

    vehicles = cursor.fetchall()
    conn.close()

    # Add vehicles to SQLAlchemy
    with app.app_context():
        for vehicle in vehicles:
            # Check if vehicle already exists
            existing = Vehicle.query.get(vehicle['id'])
            if existing:
                continue

            new_vehicle = Vehicle(
                id=vehicle['id'],
                registration=vehicle['registration'],
                make=vehicle['make'],
                model=vehicle['model'],
                year=vehicle['year'],
                color=vehicle['color'],
                fuel_type=vehicle['fuel_type'],
                mot_expiry=vehicle['mot_expiry'],
                tax_due=vehicle['tax_due'],
                mileage=vehicle['mileage'],
                customer_id=vehicle['customer_id'],
                created_at=vehicle['created_at'],
                updated_at=vehicle['updated_at']
            )
            db.session.add(new_vehicle)

        db.session.commit()

    print(f"✅ Migrated {len(vehicles)} vehicles")


def migrate_technicians():
    """Migrate technicians from SQLite to SQLAlchemy"""
    print("👨‍🔧 Migrating technicians...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all technicians from SQLite
    cursor.execute("""
        SELECT id, name, email, phone, specialization, hourly_rate, is_active, 
               start_time, end_time, created_date
        FROM technicians
    """)

    technicians = cursor.fetchall()
    conn.close()

    # Add technicians to SQLAlchemy
    with app.app_context():
        for technician in technicians:
            # Check if technician already exists
            existing = Technician.query.get(technician['id'])
            if existing:
                continue

            new_technician = Technician(
                id=technician['id'],
                name=technician['name'],
                email=technician['email'],
                phone=technician['phone'],
                specialization=technician['specialization'],
                hourly_rate=technician['hourly_rate'],
                is_active=bool(technician['is_active']),
                start_time=technician['start_time'],
                end_time=technician['end_time'],
                created_date=technician['created_date']
            )
            db.session.add(new_technician)

        db.session.commit()

    print(f"✅ Migrated {len(technicians)} technicians")


def migrate_workshop_bays():
    """Migrate workshop bays from SQLite to SQLAlchemy"""
    print("🔧 Migrating workshop bays...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all workshop bays from SQLite
    cursor.execute("""
        SELECT id, bay_number, bay_name, bay_type, is_available, equipment, notes
        FROM workshop_bays
    """)

    workshop_bays = cursor.fetchall()
    conn.close()

    # Add workshop bays to SQLAlchemy
    with app.app_context():
        for bay in workshop_bays:
            # Check if workshop bay already exists
            existing = WorkshopBay.query.get(bay['id'])
            if existing:
                continue

            new_bay = WorkshopBay(
                id=bay['id'],
                bay_number=bay['bay_number'],
                bay_name=bay['bay_name'],
                bay_type=bay['bay_type'],
                is_available=bool(bay['is_available']),
                equipment=bay['equipment'],
                notes=bay['notes']
            )
            db.session.add(new_bay)

        db.session.commit()

    print(f"✅ Migrated {len(workshop_bays)} workshop bays")


def migrate_jobs():
    """Migrate jobs from SQLite to SQLAlchemy"""
    print("🔧 Migrating jobs...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all jobs from SQLite
    cursor.execute("""
        SELECT id, job_number, customer_id, vehicle_id, description, status, priority, 
               assigned_technician, estimated_hours, actual_hours, labour_cost, parts_cost, 
               total_amount, created_date, started_date, completed_date, due_date, notes, 
               internal_notes, customer_authorization, bay_number
        FROM jobs
    """)

    jobs = cursor.fetchall()
    conn.close()

    # Add jobs to SQLAlchemy
    with app.app_context():
        for job in jobs:
            # Check if job already exists
            existing = Job.query.get(job['id'])
            if existing:
                continue

            new_job = Job(
                id=job['id'],
                job_number=job['job_number'],
                customer_id=job['customer_id'],
                vehicle_id=job['vehicle_id'],
                description=job['description'],
                status=job['status'],
                priority=job['priority'],
                assigned_technician=job['assigned_technician'],
                estimated_hours=job['estimated_hours'],
                actual_hours=job['actual_hours'],
                labour_cost=job['labour_cost'],
                parts_cost=job['parts_cost'],
                total_amount=job['total_amount'],
                created_date=job['created_date'],
                started_date=job['started_date'],
                completed_date=job['completed_date'],
                due_date=job['due_date'],
                notes=job['notes'],
                internal_notes=job['internal_notes'],
                customer_authorization=bool(job['customer_authorization']),
                bay_number=job['bay_number']
            )
            db.session.add(new_job)

        db.session.commit()

    print(f"✅ Migrated {len(jobs)} jobs")


def migrate_invoices():
    """Migrate invoices from SQLite to SQLAlchemy"""
    print("📝 Migrating invoices...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all invoices from SQLite
    cursor.execute("""
        SELECT id, invoice_number, job_id, customer_id, vehicle_id, amount, vat_amount, 
               total_amount, status, created_date, due_date, paid_date, payment_method, 
               notes, is_locked
        FROM invoices
    """)

    invoices = cursor.fetchall()
    conn.close()

    # Add invoices to SQLAlchemy
    with app.app_context():
        for invoice in invoices:
            # Check if invoice already exists
            existing = Invoice.query.get(invoice['id'])
            if existing:
                continue

            new_invoice = Invoice(
                id=invoice['id'],
                invoice_number=invoice['invoice_number'],
                job_id=invoice['job_id'],
                customer_id=invoice['customer_id'],
                vehicle_id=invoice['vehicle_id'],
                amount=invoice['amount'],
                vat_amount=invoice['vat_amount'],
                total_amount=invoice['total_amount'],
                status=invoice['status'],
                created_date=invoice['created_date'],
                due_date=invoice['due_date'],
                paid_date=invoice['paid_date'],
                payment_method=invoice['payment_method'],
                notes=invoice['notes'],
                is_locked=bool(invoice['is_locked'])
            )
            db.session.add(new_invoice)

        db.session.commit()

    print(f"✅ Migrated {len(invoices)} invoices")


def migrate_job_sheet_templates():
    """Migrate job sheet templates from SQLite to SQLAlchemy"""
    print("📋 Migrating job sheet templates...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all job sheet templates from SQLite
    cursor.execute("""
        SELECT id, name, service_type, description, default_instructions, default_safety_notes, 
               default_parts, default_tools, default_checks, estimated_time, is_active, created_date
        FROM job_sheet_templates
    """)

    templates = cursor.fetchall()
    conn.close()

    # Add job sheet templates to SQLAlchemy
    with app.app_context():
        for template in templates:
            # Check if template already exists
            existing = JobSheetTemplate.query.get(template['id'])
            if existing:
                continue

            new_template = JobSheetTemplate(
                id=template['id'],
                name=template['name'],
                service_type=template['service_type'],
                description=template['description'],
                default_instructions=template['default_instructions'],
                default_safety_notes=template['default_safety_notes'],
                default_parts=template['default_parts'],
                default_tools=template['default_tools'],
                default_checks=template['default_checks'],
                estimated_time=template['estimated_time'],
                is_active=bool(template['is_active']),
                created_date=template['created_date']
            )
            db.session.add(new_template)

        db.session.commit()

    print(f"✅ Migrated {len(templates)} job sheet templates")


def migrate_job_sheets():
    """Migrate job sheets from SQLite to SQLAlchemy"""
    print("📋 Migrating job sheets...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all job sheets from SQLite
    cursor.execute("""
        SELECT id, job_id, sheet_number, template_id, work_instructions, safety_notes, 
               parts_required, tools_required, quality_checks, technician_signature, 
               supervisor_signature, customer_signature, signed_date, completed_date, 
               status, created_date
        FROM job_sheets
    """)

    job_sheets = cursor.fetchall()
    conn.close()

    # Add job sheets to SQLAlchemy
    with app.app_context():
        for sheet in job_sheets:
            # Check if job sheet already exists
            existing = JobSheet.query.get(sheet['id'])
            if existing:
                continue

            new_sheet = JobSheet(
                id=sheet['id'],
                job_id=sheet['job_id'],
                sheet_number=sheet['sheet_number'],
                template_id=sheet['template_id'],
                work_instructions=sheet['work_instructions'],
                safety_notes=sheet['safety_notes'],
                parts_required=sheet['parts_required'],
                tools_required=sheet['tools_required'],
                quality_checks=sheet['quality_checks'],
                technician_signature=sheet['technician_signature'],
                supervisor_signature=sheet['supervisor_signature'],
                customer_signature=sheet['customer_signature'],
                signed_date=sheet['signed_date'],
                completed_date=sheet['completed_date'],
                status=sheet['status'],
                created_date=sheet['created_date']
            )
            db.session.add(new_sheet)

        db.session.commit()

    print(f"✅ Migrated {len(job_sheets)} job sheets")


def migrate_quotes():
    """Migrate quotes from SQLite to SQLAlchemy"""
    print("💰 Migrating quotes...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all quotes from SQLite
    cursor.execute("""
        SELECT id, quote_number, customer_id, vehicle_id, description, labour_cost, parts_cost, 
               total_amount, vat_amount, final_total, status, valid_until, created_date, 
               sent_date, accepted_date, notes, terms_conditions
        FROM quotes
    """)

    quotes = cursor.fetchall()
    conn.close()

    # Add quotes to SQLAlchemy
    with app.app_context():
        for quote in quotes:
            # Check if quote already exists
            existing = Quote.query.get(quote['id'])
            if existing:
                continue

            new_quote = Quote(
                id=quote['id'],
                quote_number=quote['quote_number'],
                customer_id=quote['customer_id'],
                vehicle_id=quote['vehicle_id'],
                description=quote['description'],
                labour_cost=quote['labour_cost'],
                parts_cost=quote['parts_cost'],
                total_amount=quote['total_amount'],
                vat_amount=quote['vat_amount'],
                final_total=quote['final_total'],
                status=quote['status'],
                valid_until=quote['valid_until'],
                created_date=quote['created_date'],
                sent_date=quote['sent_date'],
                accepted_date=quote['accepted_date'],
                notes=quote['notes'],
                terms_conditions=quote['terms_conditions']
            )
            db.session.add(new_quote)

        db.session.commit()

    print(f"✅ Migrated {len(quotes)} quotes")


def migrate_appointments():
    """Migrate appointments from SQLite to SQLAlchemy"""
    print("📅 Migrating appointments...")
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Get all appointments from SQLite
    cursor.execute("""
        SELECT id, job_id, customer_id, vehicle_id, technician_id, bay_id, appointment_date, 
               start_time, end_time, estimated_duration, service_type, description, status, 
               priority, customer_notified, reminder_sent, created_date, notes
        FROM appointments
    """)

    appointments = cursor.fetchall()
    conn.close()

    # Add appointments to SQLAlchemy
    with app.app_context():
        for appointment in appointments:
            # Check if appointment already exists
            existing = Appointment.query.get(appointment['id'])
            if existing:
                continue

            new_appointment = Appointment(
                id=appointment['id'],
                job_id=appointment['job_id'],
                customer_id=appointment['customer_id'],
                vehicle_id=appointment['vehicle_id'],
                technician_id=appointment['technician_id'],
                bay_id=appointment['bay_id'],
                appointment_date=appointment['appointment_date'],
                start_time=appointment['start_time'],
                end_time=appointment['end_time'],
                estimated_duration=appointment['estimated_duration'],
                service_type=appointment['service_type'],
                description=appointment['description'],
                status=appointment['status'],
                priority=appointment['priority'],
                customer_notified=bool(appointment['customer_notified']),
                reminder_sent=bool(appointment['reminder_sent']),
                created_date=appointment['created_date'],
                notes=appointment['notes']
            )
            db.session.add(new_appointment)

        db.session.commit()

    print(f"✅ Migrated {len(appointments)} appointments")


def main():
    """Main function"""
    print("🚀 Migrating data from SQLite to SQLAlchemy...")

    # Create SQLAlchemy tables
    create_sqlalchemy_tables()

    # Migrate data
    migrate_customers()
    migrate_vehicles()
    migrate_technicians()
    migrate_workshop_bays()
    migrate_jobs()
    migrate_invoices()
    migrate_job_sheet_templates()
    migrate_job_sheets()
    migrate_quotes()
    migrate_appointments()

    print("\n🎉 Data migration completed!")
    print("\nThe system now has SQLAlchemy models for:")
    print("- Customers")
    print("- Vehicles")
    print("- Technicians")
    print("- Workshop Bays")
    print("- Jobs")
    print("- Invoices")
    print("- Job Sheet Templates")
    print("- Job Sheets")
    print("- Quotes")
    print("- Appointments")


if __name__ == "__main__":
    main()
