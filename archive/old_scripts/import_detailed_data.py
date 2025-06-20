#!/usr/bin/env python3
"""
Data Import Script for Garage Management System
Imports detailed parts, labour, and advisory information from various data sources
"""

import os
import sqlite3
import sys
from datetime import datetime

import pandas as pd

# Database path
DB_PATH = os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'src', 'garage.db')


def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def import_parts_from_csv(csv_file_path):
    """Import parts data from CSV file"""
    try:
        df = pd.read_csv(csv_file_path)
        conn = get_db_connection()
        cursor = conn.cursor()

        # Expected columns: invoice_number, job_number, part_number, description, quantity, unit_price, total_price, supplier
        for _, row in df.iterrows():
            # Find invoice_id and job_id from invoice_number/job_number
            invoice_id = None
            job_id = None

            if 'invoice_number' in row and pd.notna(row['invoice_number']):
                cursor.execute(
                    "SELECT id FROM invoices WHERE invoice_number = ?", (str(row['invoice_number']),))
                result = cursor.fetchone()
                if result:
                    invoice_id = result['id']

            if 'job_number' in row and pd.notna(row['job_number']):
                cursor.execute(
                    "SELECT id FROM jobs WHERE job_number = ?", (str(row['job_number']),))
                result = cursor.fetchone()
                if result:
                    job_id = result['id']

            # Insert part record
            cursor.execute('''
                INSERT INTO parts (invoice_id, job_id, part_number, description, quantity, unit_price, total_price, supplier, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                invoice_id,
                job_id,
                row.get('part_number', ''),
                row.get('description', ''),
                float(row.get('quantity', 0)) if pd.notna(
                    row.get('quantity')) else 0,
                float(row.get('unit_price', 0)) if pd.notna(
                    row.get('unit_price')) else 0,
                float(row.get('total_price', 0)) if pd.notna(
                    row.get('total_price')) else 0,
                row.get('supplier', ''),
                datetime.now().strftime('%Y-%m-%d')
            ))

        conn.commit()
        conn.close()
        print(
            f"Successfully imported {len(df)} parts records from {csv_file_path}")

    except Exception as e:
        print(f"Error importing parts from {csv_file_path}: {e}")


def import_labour_from_csv(csv_file_path):
    """Import labour data from CSV file"""
    try:
        df = pd.read_csv(csv_file_path)
        conn = get_db_connection()
        cursor = conn.cursor()

        # Expected columns: invoice_number, job_number, description, hours, rate, total_price, technician
        for _, row in df.iterrows():
            # Find invoice_id and job_id
            invoice_id = None
            job_id = None

            if 'invoice_number' in row and pd.notna(row['invoice_number']):
                cursor.execute(
                    "SELECT id FROM invoices WHERE invoice_number = ?", (str(row['invoice_number']),))
                result = cursor.fetchone()
                if result:
                    invoice_id = result['id']

            if 'job_number' in row and pd.notna(row['job_number']):
                cursor.execute(
                    "SELECT id FROM jobs WHERE job_number = ?", (str(row['job_number']),))
                result = cursor.fetchone()
                if result:
                    job_id = result['id']

            # Insert labour record
            cursor.execute('''
                INSERT INTO labour (invoice_id, job_id, description, hours, rate, total_price, technician, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                invoice_id,
                job_id,
                row.get('description', ''),
                float(row.get('hours', 0)) if pd.notna(
                    row.get('hours')) else 0,
                float(row.get('rate', 0)) if pd.notna(row.get('rate')) else 0,
                float(row.get('total_price', 0)) if pd.notna(
                    row.get('total_price')) else 0,
                row.get('technician', ''),
                datetime.now().strftime('%Y-%m-%d')
            ))

        conn.commit()
        conn.close()
        print(
            f"Successfully imported {len(df)} labour records from {csv_file_path}")

    except Exception as e:
        print(f"Error importing labour from {csv_file_path}: {e}")


def import_advisories_from_csv(csv_file_path):
    """Import advisory data from CSV file"""
    try:
        df = pd.read_csv(csv_file_path)
        conn = get_db_connection()
        cursor = conn.cursor()

        # Expected columns: invoice_number, job_number, vehicle_registration, description, severity, recommendation
        for _, row in df.iterrows():
            # Find invoice_id, job_id, and vehicle_id
            invoice_id = None
            job_id = None
            vehicle_id = None

            if 'invoice_number' in row and pd.notna(row['invoice_number']):
                cursor.execute(
                    "SELECT id FROM invoices WHERE invoice_number = ?", (str(row['invoice_number']),))
                result = cursor.fetchone()
                if result:
                    invoice_id = result['id']

            if 'job_number' in row and pd.notna(row['job_number']):
                cursor.execute(
                    "SELECT id FROM jobs WHERE job_number = ?", (str(row['job_number']),))
                result = cursor.fetchone()
                if result:
                    job_id = result['id']

            if 'vehicle_registration' in row and pd.notna(row['vehicle_registration']):
                cursor.execute("SELECT id FROM vehicles WHERE registration = ?", (str(
                    row['vehicle_registration']),))
                result = cursor.fetchone()
                if result:
                    vehicle_id = result['id']

            # Insert advisory record
            cursor.execute('''
                INSERT INTO advisories (invoice_id, job_id, vehicle_id, description, severity, recommendation, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                invoice_id,
                job_id,
                vehicle_id,
                row.get('description', ''),
                row.get('severity', 'INFO'),
                row.get('recommendation', ''),
                datetime.now().strftime('%Y-%m-%d')
            ))

        conn.commit()
        conn.close()
        print(
            f"Successfully imported {len(df)} advisory records from {csv_file_path}")

    except Exception as e:
        print(f"Error importing advisories from {csv_file_path}: {e}")


def create_sample_data_templates():
    """Create sample CSV templates for data import"""

    # Parts template
    parts_template = pd.DataFrame({
        'invoice_number': ['90941', '88769'],
        'job_number': ['J-90941', 'J-88769'],
        'part_number': ['BP001', 'OF002'],
        'description': ['Brake Pads - Front Set', 'Oil Filter'],
        'quantity': [1, 1],
        'unit_price': [45.50, 12.99],
        'total_price': [45.50, 12.99],
        'supplier': ['Euro Car Parts', 'GSF']
    })
    parts_template.to_csv('parts_template.csv', index=False)

    # Labour template
    labour_template = pd.DataFrame({
        'invoice_number': ['90941', '88769'],
        'job_number': ['J-90941', 'J-88769'],
        'description': ['Brake Pad Replacement', 'Oil Change Service'],
        'hours': [1.5, 0.5],
        'rate': [65.00, 65.00],
        'total_price': [97.50, 32.50],
        'technician': ['John Smith', 'Mike Jones']
    })
    labour_template.to_csv('labour_template.csv', index=False)

    # Advisories template
    advisories_template = pd.DataFrame({
        'invoice_number': ['90941', '88769'],
        'job_number': ['J-90941', 'J-88769'],
        'vehicle_registration': ['LS18 ZZA', 'RF53 FJO'],
        'description': ['Rear brake discs showing wear', 'Air filter requires replacement'],
        'severity': ['MINOR', 'ADVISORY'],
        'recommendation': ['Replace within 6 months', 'Replace at next service']
    })
    advisories_template.to_csv('advisories_template.csv', index=False)

    print("Created template files: parts_template.csv, labour_template.csv, advisories_template.csv")


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python import_detailed_data.py create_templates")
        print("  python import_detailed_data.py import_parts <csv_file>")
        print("  python import_detailed_data.py import_labour <csv_file>")
        print("  python import_detailed_data.py import_advisories <csv_file>")
        return

    command = sys.argv[1]

    if command == 'create_templates':
        create_sample_data_templates()
    elif command == 'import_parts' and len(sys.argv) > 2:
        import_parts_from_csv(sys.argv[2])
    elif command == 'import_labour' and len(sys.argv) > 2:
        import_labour_from_csv(sys.argv[2])
    elif command == 'import_advisories' and len(sys.argv) > 2:
        import_advisories_from_csv(sys.argv[2])
    else:
        print("Invalid command or missing file path")


if __name__ == '__main__':
    main()
