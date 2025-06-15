import os
import sys
import pandas as pd
import sqlite3
from datetime import datetime
import numpy as np

# Add the src directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'garage.db')

# GA4 data directory
GA4_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ga4_complete_data')

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def safe_str(value):
    """Convert value to string, handling NaN values"""
    if pd.isna(value):
        return ''
    return str(value)

def safe_float(value):
    """Convert value to float, handling NaN values"""
    if pd.isna(value):
        return 0.0
    try:
        return float(value)
    except:
        return 0.0

def safe_int(value):
    """Convert value to int, handling NaN values"""
    if pd.isna(value):
        return 0
    try:
        return int(value)
    except:
        return 0

def import_customers(cursor, customers_df):
    """Import customers from GA4 data"""
    print(f"Importing {len(customers_df)} customers...")
    imported_count = 0
    
    for _, row in customers_df.iterrows():
        try:
            # Build name from title, forename, surname
            name_parts = []
            if not pd.isna(row.get('title')):
                name_parts.append(str(row['title']))
            if not pd.isna(row.get('forename')):
                name_parts.append(str(row['forename']))
            if not pd.isna(row.get('surname')):
                name_parts.append(str(row['surname']))
            
            name = ' '.join(name_parts) if name_parts else safe_str(row.get('company_name', ''))
            
            # Build address
            address_parts = []
            if not pd.isna(row.get('address_house_no')):
                address_parts.append(str(row['address_house_no']))
            if not pd.isna(row.get('address_road')):
                address_parts.append(str(row['address_road']))
            if not pd.isna(row.get('address_locality')):
                address_parts.append(str(row['address_locality']))
            if not pd.isna(row.get('address_town')):
                address_parts.append(str(row['address_town']))
            if not pd.isna(row.get('address_county')):
                address_parts.append(str(row['address_county']))
            
            address = ', '.join(address_parts)
            
            # Use mobile or telephone
            phone = safe_str(row.get('mobile', '')) or safe_str(row.get('telephone', ''))
            
            cursor.execute('''
                INSERT OR REPLACE INTO customers (
                    account_number, name, company, address, postcode, 
                    phone, email, created_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                safe_str(row.get('account_number', '')),
                name,
                safe_str(row.get('company_name', '')),
                address,
                safe_str(row.get('address_postcode', '')),
                phone,
                safe_str(row.get('email', '')),
                datetime.now().strftime('%Y-%m-%d')
            ))
            imported_count += 1
        except Exception as e:
            print(f"Error importing customer {row.get('id')}: {e}")
    
    print(f"Successfully imported {imported_count} customers")

def import_vehicles(cursor, vehicles_df):
    """Import vehicles from GA4 data"""
    print(f"Importing {len(vehicles_df)} vehicles...")
    imported_count = 0
    
    for _, row in vehicles_df.iterrows():
        try:
            # Skip vehicles without registration
            registration = safe_str(row.get('registration', ''))
            if not registration or registration == '*':
                continue
                
            # Get customer_id from account_number
            customer_account = safe_str(row.get('customer_account', ''))
            customer_id = None
            
            if customer_account:
                cursor.execute('SELECT id FROM customers WHERE account_number = ?', (customer_account,))
                customer_result = cursor.fetchone()
                if customer_result:
                    customer_id = customer_result[0]

            cursor.execute('''
                INSERT OR REPLACE INTO vehicles (
                    registration, make, model, color, fuel_type,
                    mot_due, mileage, customer_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                registration,
                safe_str(row.get('make', '')),
                safe_str(row.get('model', '')),
                safe_str(row.get('color', '')),
                safe_str(row.get('fuel_type', '')),
                safe_str(row.get('mot_due_date', '')),
                safe_int(row.get('mileage', 0)),
                customer_id
            ))
            imported_count += 1
        except Exception as e:
            print(f"Error importing vehicle {row.get('id')}: {e}")
    
    print(f"Successfully imported {imported_count} vehicles")

def import_jobs_and_invoices(cursor, documents_df):
    """Import jobs and invoices from document summary data"""
    print(f"Processing {len(documents_df)} documents...")
    jobs_imported = 0
    invoices_imported = 0
    
    for _, row in documents_df.iterrows():
        try:
            doc_type = safe_str(row.get('Doc Type', ''))
            doc_number = safe_str(row.get('Doc No', ''))
            
            if not doc_number:
                continue
            
            # Get customer_id from ID Customer or Customer Account
            customer_id = None
            id_customer = safe_str(row.get('ID Customer', ''))
            customer_account = safe_str(row.get('Customer Account', ''))
            
            if customer_account:
                cursor.execute('SELECT id FROM customers WHERE account_number = ?', (customer_account,))
                customer_result = cursor.fetchone()
                if customer_result:
                    customer_id = customer_result[0]
            
            # Get vehicle_id from Vehicle Reg
            vehicle_id = None
            vehicle_reg = safe_str(row.get('Vehicle Reg', ''))
            if vehicle_reg:
                cursor.execute('SELECT id FROM vehicles WHERE registration = ?', (vehicle_reg,))
                vehicle_result = cursor.fetchone()
                if vehicle_result:
                    vehicle_id = vehicle_result[0]
            
            # Create job description from available data
            description_parts = []
            if not pd.isna(row.get('Make')):
                description_parts.append(f"Make: {row['Make']}")
            if not pd.isna(row.get('Model')):
                description_parts.append(f"Model: {row['Model']}")
            if doc_type == 'JS':
                description_parts.append("Job Sheet")
            elif doc_type == 'SI':
                description_parts.append("Service Invoice")
            elif doc_type == 'ES':
                description_parts.append("Estimate")
            
            description = ' - '.join(description_parts) if description_parts else f"Document {doc_number}"
            
            total_amount = safe_float(row.get('Grand Total', 0))
            created_date = safe_str(row.get('Date Created', datetime.now().strftime('%Y-%m-%d')))
            
            # Import as job if it's a job sheet or has significant work
            if doc_type in ['JS', 'SI'] or total_amount > 0:
                cursor.execute('''
                    INSERT OR REPLACE INTO jobs (
                        job_number, vehicle_id, customer_id, description,
                        status, total_amount, created_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"J-{doc_number}",
                    vehicle_id,
                    customer_id,
                    description,
                    'COMPLETED' if safe_str(row.get('Date Paid', '')) else 'PENDING',
                    total_amount,
                    created_date
                ))
                job_id = cursor.lastrowid
                jobs_imported += 1
                
                # Create corresponding invoice
                cursor.execute('''
                    INSERT OR REPLACE INTO invoices (
                        invoice_number, job_id, customer_id, vehicle_id,
                        amount, status, created_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    doc_number,
                    job_id,
                    customer_id,
                    vehicle_id,
                    total_amount,
                    'PAID' if safe_str(row.get('Date Paid', '')) else 'PENDING',
                    created_date
                ))
                invoices_imported += 1
                
        except Exception as e:
            print(f"Error importing document {row.get('Doc No')}: {e}")
    
    print(f"Successfully imported {jobs_imported} jobs and {invoices_imported} invoices")

def main():
    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Read GA4 data files
        print(f"Reading data from {GA4_DATA_DIR}")
        
        # Read main data files
        customers_df = pd.read_excel(os.path.join(GA4_DATA_DIR, 'customers.xlsx'))
        vehicles_df = pd.read_excel(os.path.join(GA4_DATA_DIR, 'vehicles.xlsx'))
        documents_df = pd.read_excel(os.path.join(GA4_DATA_DIR, 'document_summary.xlsx'))
        
        print(f"Loaded {len(customers_df)} customers, {len(vehicles_df)} vehicles, {len(documents_df)} documents")
        
        # Clear existing data to avoid conflicts
        print("Clearing existing data...")
        cursor.execute('DELETE FROM invoices')
        cursor.execute('DELETE FROM jobs')
        cursor.execute('DELETE FROM vehicles')
        cursor.execute('DELETE FROM customers')
        
        # Import data in order
        import_customers(cursor, customers_df)
        import_vehicles(cursor, vehicles_df)
        import_jobs_and_invoices(cursor, documents_df)

        # Commit changes
        conn.commit()
        print("Data import completed successfully!")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM vehicles")
        vehicle_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM jobs")
        job_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM invoices")
        invoice_count = cursor.fetchone()[0]
        
        print(f"\nFinal counts:")
        print(f"Customers: {customer_count}")
        print(f"Vehicles: {vehicle_count}")
        print(f"Jobs: {job_count}")
        print(f"Invoices: {invoice_count}")

    except Exception as e:
        print(f"Error during import: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 