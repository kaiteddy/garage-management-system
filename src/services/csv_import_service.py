import os
import re
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import pandas as pd


class CSVImportService:
    """Service for importing CSV data into the garage management system"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.supported_tables = {
            'customers': self._import_customers,
            'vehicles': self._import_vehicles,
            'jobs': self._import_jobs,
            'invoices': self._import_invoices,
            'parts': self._import_parts,
            'suppliers': self._import_suppliers,
            'expenses': self._import_expenses,
            'document_extras': self._import_document_extras,
            'documents': self._import_documents,
            'receipts': self._import_receipts
        }

    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def safe_str(self, value) -> str:
        """Convert value to string, handling NaN values"""
        if pd.isna(value) or value is None:
            return ''
        return str(value).strip()

    def safe_int(self, value) -> int:
        """Safely convert value to integer"""
        if pd.isna(value) or value is None or value == '':
            return 0
        try:
            return int(float(str(value)))
        except (ValueError, TypeError):
            return 0

    def safe_float(self, value) -> float:
        """Safely convert value to float"""
        if pd.isna(value) or value is None or value == '':
            return 0.0
        try:
            return float(str(value))
        except (ValueError, TypeError):
            return 0.0

    def safe_date(self, value) -> str:
        """Safely convert value to date string"""
        if pd.isna(value) or value is None or value == '':
            return ''

        date_str = str(value).strip()
        if date_str in ['01/01/2000', '30/12/2024']:  # Common placeholder dates
            return ''

        # Try to parse various date formats
        try:
            # Try DD/MM/YYYY format first
            if '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    day, month, year = parts
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

            # Try other formats if needed
            return date_str
        except:
            return ''

    def clean_registration(self, registration: str) -> str:
        """Clean and standardize vehicle registration"""
        if not registration:
            return ''

        # Remove spaces and convert to uppercase
        cleaned = re.sub(r'[^A-Z0-9]', '', registration.upper())
        return cleaned

    def safe_float(self, value) -> float:
        """Convert value to float, handling NaN values"""
        if pd.isna(value) or value is None:
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def safe_int(self, value) -> int:
        """Convert value to int, handling NaN values"""
        if pd.isna(value) or value is None:
            return 0
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def safe_date(self, value) -> str:
        """Convert value to date string, handling various formats"""
        if pd.isna(value) or value is None:
            return ''

        try:
            # Try to parse as datetime
            if isinstance(value, str):
                # Handle various date formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y']:
                    try:
                        dt = datetime.strptime(value, fmt)
                        return dt.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
            elif hasattr(value, 'strftime'):
                return value.strftime('%Y-%m-%d')

            return str(value)
        except:
            return ''

    def clean_registration(self, reg: str) -> str:
        """Clean and format vehicle registration"""
        if not reg:
            return ''

        # Remove spaces and convert to uppercase
        reg = re.sub(r'[^A-Z0-9]', '', reg.upper())

        # Basic UK registration format validation
        if len(reg) >= 6 and len(reg) <= 8:
            return reg

        return reg  # Return as-is if doesn't match expected format

    def parse_customer_field(self, customer_field: str) -> Dict[str, str]:
        """Parse customer field containing name, phone, mobile, email"""
        result = {
            'name': '',
            'phone': '',
            'mobile': '',
            'email': ''
        }

        if not customer_field:
            return result

        # Extract email
        email_match = re.search(r'e:\s*([^\s]+@[^\s]+)', customer_field)
        if email_match:
            result['email'] = email_match.group(1)

        # Extract mobile
        mobile_match = re.search(r'm:\s*([0-9\s+()-]+)', customer_field)
        if mobile_match:
            result['mobile'] = re.sub(r'[^\d+]', '', mobile_match.group(1))

        # Extract phone
        phone_match = re.search(r't:\s*([0-9\s+()-]+)', customer_field)
        if phone_match:
            result['phone'] = re.sub(r'[^\d+]', '', phone_match.group(1))

        # Extract name (everything before first 't:' or 'm:' or 'e:')
        name_match = re.match(r'^([^tme:]+?)(?:\s+[tme]:|$)', customer_field)
        if name_match:
            result['name'] = name_match.group(1).strip()

        return result

    def import_csv_file(self, file_path: str, table_name: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Import CSV file into specified table"""
        if table_name not in self.supported_tables:
            return {
                'success': False,
                'error': f'Unsupported table: {table_name}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }

        try:
            # Try different encodings to handle various CSV exports
            encodings_to_try = ['utf-8', 'latin-1',
                                'cp1252', 'iso-8859-1', 'utf-16']
            df = None

            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    print(f"Successfully read CSV with {encoding} encoding")
                    break
                except UnicodeDecodeError:
                    continue
                except Exception as e:
                    # If it's not an encoding error, try other options
                    if 'codec' not in str(e).lower() and 'decode' not in str(e).lower():
                        continue

            if df is None:
                # Try with error handling
                try:
                    df = pd.read_csv(
                        file_path, encoding='utf-8', errors='replace')
                    print("Read CSV with UTF-8 encoding and error replacement")
                except:
                    try:
                        df = pd.read_csv(
                            file_path, encoding='latin-1', on_bad_lines='skip')
                        print("Read CSV with latin-1 encoding, skipping bad lines")
                    except:
                        return {
                            'success': False,
                            'error': 'Could not read CSV file with any supported encoding',
                            'imported': 0,
                            'failed': 0,
                            'duplicates': 0
                        }

            # Import using appropriate method
            return self.supported_tables[table_name](df, options or {})

        except Exception as e:
            return {
                'success': False,
                'error': f'Error reading CSV file: {str(e)}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }

    def _import_customers(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import customers from DataFrame"""
        conn = self.get_db_connection()
        cursor = conn.cursor()

        imported = 0
        failed = 0
        duplicates = 0
        errors = []

        try:
            for index, row in df.iterrows():
                try:
                    # Handle different column naming conventions
                    customer_data = {}

                    # Try to extract customer info from 'Customer' field if it exists (MOT reminder format)
                    if 'Customer' in row and pd.notna(row['Customer']):
                        parsed = self.parse_customer_field(
                            str(row['Customer']))
                        customer_data.update(parsed)

                    # ELI MOTORS format mapping (using correct column names)
                    if 'AccountNumber' in row:
                        # ELI MOTORS format - use the actual column names from your CSV
                        customer_data['account_number'] = self.safe_str(
                            row.get('AccountNumber', ''))

                        # Build full name from correct columns
                        name_parts = []
                        forename = self.safe_str(
                            row.get('nameForename', '')).strip()
                        surname = self.safe_str(
                            row.get('nameSurname', '')).strip()
                        company = self.safe_str(
                            row.get('nameCompany', '')).strip()

                        if forename and forename != 'nan':
                            name_parts.append(forename)
                        if surname and surname != 'nan':
                            name_parts.append(surname)

                        customer_data['name'] = ' '.join(
                            name_parts) if name_parts else ''
                        customer_data['company'] = company if company != 'nan' else ''

                        # Build address from correct columns
                        address_parts = []
                        house_no = self.safe_str(
                            row.get('addressHouseNo', '')).strip()
                        road = self.safe_str(
                            row.get('addressRoad', '')).strip()
                        locality = self.safe_str(
                            row.get('addressLocality', '')).strip()
                        county = self.safe_str(
                            row.get('addressCounty', '')).strip()

                        if house_no and house_no != 'nan':
                            address_parts.append(house_no)
                        if road and road != 'nan':
                            address_parts.append(road)
                        if locality and locality != 'nan':
                            address_parts.append(locality)
                        if county and county != 'nan':
                            address_parts.append(county)

                        customer_data['address'] = ', '.join(
                            address_parts) if address_parts else ''
                        customer_data['postcode'] = self.safe_str(
                            row.get('addressPostCode', ''))

                        # Extract contact info from correct columns
                        customer_data['email'] = self.safe_str(
                            row.get('contactEmail', ''))
                        customer_data['mobile'] = self.safe_str(
                            row.get('contactMobile', ''))
                        customer_data['phone'] = self.safe_str(
                            row.get('contactTelephone', ''))

                        # Clean contact info
                        if customer_data['email'] == 'nan' or '@' not in customer_data['email']:
                            customer_data['email'] = ''
                        if customer_data['mobile'] == 'nan':
                            customer_data['mobile'] = ''
                        if customer_data['phone'] == 'nan':
                            customer_data['phone'] = ''
                    else:
                        # Standard format or other formats
                        customer_data['account_number'] = self.safe_str(
                            row.get('Account Number', row.get('account_number', '')))
                        customer_data['name'] = customer_data.get(
                            'name') or self.safe_str(row.get('Name', row.get('name', '')))
                        customer_data['company'] = self.safe_str(
                            row.get('Company', row.get('company', '')))
                        customer_data['address'] = self.safe_str(
                            row.get('Address', row.get('address', '')))
                        customer_data['postcode'] = self.safe_str(
                            row.get('Postcode', row.get('postcode', '')))
                        customer_data['phone'] = customer_data.get(
                            'phone') or self.safe_str(row.get('Phone', row.get('phone', '')))
                        customer_data['mobile'] = customer_data.get('mobile') or self.safe_str(
                            row.get('Mobile', row.get('mobile', '')))
                        customer_data['email'] = customer_data.get(
                            'email') or self.safe_str(row.get('Email', row.get('email', '')))

                    # Skip if no name or account number
                    if not customer_data['name'] and not customer_data['account_number']:
                        failed += 1
                        errors.append(
                            f"Row {index + 1}: Missing name and account number")
                        continue

                    # Check for duplicates by account number or name
                    existing_customer = None

                    # First try to find by account number
                    if customer_data['account_number']:
                        cursor.execute(
                            'SELECT id FROM customers WHERE account_number = ?', (customer_data['account_number'],))
                        existing_customer = cursor.fetchone()

                    # If not found by account number, try by name (for cases where account number might be missing)
                    if not existing_customer and customer_data['name']:
                        cursor.execute(
                            'SELECT id FROM customers WHERE name = ?', (customer_data['name'],))
                        existing_customer = cursor.fetchone()

                    if existing_customer:
                        if options.get('update_duplicates', False):
                            # Update existing customer
                            update_query = '''
                                UPDATE customers SET
                                    name = ?, company = ?, address = ?, postcode = ?,
                                    phone = ?, mobile = ?, email = ?, updated_date = ?
                                WHERE id = ?
                            '''
                            cursor.execute(update_query, (
                                customer_data['name'],
                                customer_data['company'],
                                customer_data['address'],
                                customer_data['postcode'],
                                customer_data['phone'],
                                customer_data['mobile'],
                                customer_data['email'],
                                datetime.now().strftime('%Y-%m-%d'),
                                existing_customer[0]
                            ))
                            imported += 1
                        else:
                            duplicates += 1
                        continue

                    # Insert new customer with constraint handling
                    try:
                        cursor.execute('''
                            INSERT INTO customers (
                                account_number, name, company, address, postcode,
                                phone, mobile, email, created_date
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_data['account_number'],
                            customer_data['name'],
                            customer_data['company'],
                            customer_data['address'],
                            customer_data['postcode'],
                            customer_data['phone'],
                            customer_data['mobile'],
                            customer_data['email'],
                            datetime.now().strftime('%Y-%m-%d')
                        ))
                        imported += 1
                    except sqlite3.IntegrityError as e:
                        if 'UNIQUE constraint failed' in str(e):
                            # This is a duplicate we missed in our check - treat as duplicate
                            duplicates += 1
                        else:
                            failed += 1
                            errors.append(
                                f"Row {index + 1}: Database constraint error: {str(e)}")
                    except Exception as e:
                        failed += 1
                        errors.append(
                            f"Row {index + 1}: Insert error: {str(e)}")

                except Exception as e:
                    failed += 1
                    errors.append(f"Row {index + 1}: {str(e)}")

            conn.commit()

        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'error': f'Database error: {str(e)}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }
        finally:
            conn.close()

        return {
            'success': True,
            'imported': imported,
            'failed': failed,
            'duplicates': duplicates,
            'errors': errors[:10]  # Limit to first 10 errors
        }

    def _import_vehicles(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import vehicles from DataFrame"""
        conn = self.get_db_connection()
        cursor = conn.cursor()

        imported = 0
        failed = 0
        duplicates = 0
        errors = []

        try:
            for index, row in df.iterrows():
                try:
                    # Handle different formats - ELI MOTORS vs standard
                    if '_ID_Customer' in row:
                        # ELI MOTORS vehicles format
                        registration = self.clean_registration(
                            self.safe_str(row.get('Registration', '')))
                        make = self.safe_str(row.get('Make', ''))
                        model = self.safe_str(row.get('Model', ''))
                        color = self.safe_str(row.get('Colour', ''))
                        fuel_type = self.safe_str(row.get('FuelType', ''))

                        # Extract year from DateofReg (DD/MM/YYYY format)
                        year = 0
                        date_of_reg = self.safe_str(row.get('DateofReg', ''))
                        if date_of_reg and '/' in date_of_reg:
                            try:
                                parts = date_of_reg.split('/')
                                if len(parts) == 3:
                                    year = int(parts[2])
                            except:
                                year = 0

                        # Handle customer linking via _ID_Customer
                        customer_id_ref = self.safe_str(
                            row.get('_ID_Customer', ''))
                        customer_id = None
                        if customer_id_ref and customer_id_ref != 'nan':
                            # Try multiple matching strategies for ELI MOTORS customer IDs

                            # Strategy 1: Direct match
                            cursor.execute(
                                'SELECT id FROM customers WHERE account_number = ?', (customer_id_ref,))
                            customer_result = cursor.fetchone()

                            # Strategy 2: Try with .0 suffix (many ELI MOTORS IDs have this)
                            if not customer_result:
                                cursor.execute(
                                    'SELECT id FROM customers WHERE account_number = ?', (f"{customer_id_ref}.0",))
                                customer_result = cursor.fetchone()

                            # Strategy 3: Try without .0 suffix
                            if not customer_result and customer_id_ref.endswith('.0'):
                                clean_ref = customer_id_ref[:-2]
                                cursor.execute(
                                    'SELECT id FROM customers WHERE account_number = ?', (clean_ref,))
                                customer_result = cursor.fetchone()

                            # Strategy 4: Try zero-padded versions (004 vs 4)
                            if not customer_result:
                                try:
                                    numeric_ref = int(float(customer_id_ref))
                                    # Try zero-padded 3-digit format
                                    padded_ref = f"{numeric_ref:03d}"
                                    cursor.execute(
                                        'SELECT id FROM customers WHERE account_number = ?', (padded_ref,))
                                    customer_result = cursor.fetchone()
                                except:
                                    pass

                            if customer_result:
                                customer_id = customer_result[0]

                        mileage = 0  # Not typically in ELI MOTORS vehicle data
                        mot_expiry = ''
                        tax_due = ''

                    else:
                        # Standard format
                        registration = self.clean_registration(self.safe_str(
                            row.get('Registration', row.get('registration', ''))))
                        make = self.safe_str(
                            row.get('Make', row.get('make', '')))
                        model = self.safe_str(
                            row.get('Model', row.get('model', '')))
                        year = self.safe_int(
                            row.get('Year', row.get('year', 0)))
                        color = self.safe_str(
                            row.get('Color', row.get('Colour', row.get('color', ''))))
                        fuel_type = self.safe_str(
                            row.get('Fuel Type', row.get('FuelType', row.get('fuel_type', ''))))
                        mileage = self.safe_int(
                            row.get('Mileage', row.get('mileage', 0)))
                        mot_expiry = self.safe_date(
                            row.get('MOT Expiry', row.get('mot_expiry', '')))
                        tax_due = self.safe_date(
                            row.get('Tax Due', row.get('tax_due', '')))

                        # Handle customer linking
                        customer_account = self.safe_str(
                            row.get('Customer Account', row.get('customer_account', '')))
                        customer_id = None
                        if customer_account:
                            cursor.execute(
                                'SELECT id FROM customers WHERE account_number = ?', (customer_account,))
                            customer_result = cursor.fetchone()
                            if customer_result:
                                customer_id = customer_result[0]

                    if not registration:
                        failed += 1
                        errors.append(f"Row {index + 1}: Missing registration")
                        continue

                    # Check for duplicates
                    cursor.execute(
                        'SELECT id FROM vehicles WHERE registration = ?', (registration,))
                    existing = cursor.fetchone()
                    if existing:
                        if options.get('update_duplicates', False):
                            # Update existing vehicle
                            cursor.execute('''
                                UPDATE vehicles SET
                                    make = ?, model = ?, year = ?, color = ?, fuel_type = ?,
                                    mot_expiry = ?, tax_due = ?, mileage = ?, customer_id = ?,
                                    updated_at = ?
                                WHERE registration = ?
                            ''', (
                                make, model, year, color, fuel_type,
                                mot_expiry, tax_due, mileage, customer_id,
                                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                registration
                            ))
                            imported += 1
                        else:
                            duplicates += 1
                        continue

                    # Insert new vehicle
                    cursor.execute('''
                        INSERT INTO vehicles (
                            registration, make, model, year, color, fuel_type,
                            mot_expiry, tax_due, mileage, customer_id, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        registration, make, model, year, color, fuel_type,
                        mot_expiry, tax_due, mileage, customer_id,
                        datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    ))

                    imported += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"Row {index + 1}: {str(e)}")

            conn.commit()

        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'error': f'Database error: {str(e)}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }
        finally:
            conn.close()

        return {
            'success': True,
            'imported': imported,
            'failed': failed,
            'duplicates': duplicates,
            'errors': errors[:10]
        }

    def _import_jobs(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import jobs from DataFrame - placeholder for now"""
        return {'success': True, 'imported': 0, 'failed': 0, 'duplicates': 0, 'errors': []}

    def _import_invoices(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import invoices from DataFrame - placeholder for now"""
        return {'success': True, 'imported': 0, 'failed': 0, 'duplicates': 0, 'errors': []}

    def _import_parts(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import parts from DataFrame - placeholder for now"""
        return {'success': True, 'imported': 0, 'failed': 0, 'duplicates': 0, 'errors': []}

    def _import_suppliers(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import suppliers from DataFrame - placeholder for now"""
        return {'success': True, 'imported': 0, 'failed': 0, 'duplicates': 0, 'errors': []}

    def _import_expenses(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import expenses from DataFrame - placeholder for now"""
        return {'success': True, 'imported': 0, 'failed': 0, 'duplicates': 0, 'errors': []}

    def _import_document_extras(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import document extras (job descriptions) from DataFrame"""
        conn = self.get_db_connection()
        cursor = conn.cursor()

        imported = 0
        failed = 0
        duplicates = 0
        errors = []

        try:
            for index, row in df.iterrows():
                try:
                    # Get the document ID and labour description
                    doc_id = self.safe_str(row.get('_ID', ''))
                    labour_description = self.safe_str(
                        row.get('Labour Description', ''))
                    doc_notes = self.safe_str(row.get('docNotes', ''))

                    if not doc_id:
                        failed += 1
                        errors.append(f"Row {index + 1}: Missing document ID")
                        continue

                    if not labour_description:
                        failed += 1
                        errors.append(
                            f"Row {index + 1}: Missing labour description")
                        continue

                    # Check if we can find a job with this ID or create a new one
                    cursor.execute(
                        'SELECT id FROM jobs WHERE job_number = ?', (doc_id,))
                    existing_job = cursor.fetchone()

                    if existing_job:
                        # Update existing job with description
                        if options.get('update_duplicates', False):
                            cursor.execute('''
                                UPDATE jobs SET
                                    description = ?,
                                    notes = ?
                                WHERE job_number = ?
                            ''', (labour_description, doc_notes, doc_id))
                            imported += 1
                        else:
                            duplicates += 1
                    else:
                        # Create new job record with the description
                        cursor.execute('''
                            INSERT INTO jobs (
                                job_number, description, notes, status, created_date
                            ) VALUES (?, ?, ?, ?, ?)
                        ''', (
                            doc_id,
                            labour_description,
                            doc_notes,
                            'COMPLETED',  # Assume these are completed jobs
                            datetime.now().strftime('%Y-%m-%d')
                        ))
                        imported += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"Row {index + 1}: {str(e)}")

            conn.commit()

        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'error': f'Database error: {str(e)}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }
        finally:
            conn.close()

        return {
            'success': True,
            'imported': imported,
            'failed': failed,
            'duplicates': duplicates,
            'errors': errors[:10]  # Limit to first 10 errors
        }

    def _import_documents(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import ELI MOTORS documents (jobs, invoices, vehicles) from DataFrame"""
        conn = self.get_db_connection()
        cursor = conn.cursor()

        imported_jobs = 0
        imported_invoices = 0
        imported_vehicles = 0
        failed = 0
        duplicates = 0
        errors = []

        try:
            for index, row in df.iterrows():
                try:
                    # Get basic document info
                    doc_id = self.safe_str(row.get('_ID', ''))
                    doc_type = self.safe_str(row.get('docType', ''))
                    doc_status = self.safe_str(row.get('docStatus', ''))

                    if not doc_id:
                        failed += 1
                        errors.append(f"Row {index + 1}: Missing document ID")
                        continue

                    # Extract customer info - try multiple fields for ELI MOTORS format
                    customer_account = None
                    customer_id = None

                    # Try different customer account fields in ELI MOTORS documents
                    for field in ['custAccountHeld', 'custAccountNumber', 'custAccount']:
                        if not customer_account:
                            customer_account = self.safe_str(
                                row.get(field, ''))
                            if customer_account and customer_account != 'nan':
                                break

                    if customer_account and customer_account != 'nan':
                        # Use same multi-strategy matching as vehicles
                        # Strategy 1: Direct match
                        cursor.execute(
                            'SELECT id FROM customers WHERE account_number = ?', (customer_account,))
                        customer_result = cursor.fetchone()

                        # Strategy 2: Try with .0 suffix
                        if not customer_result:
                            cursor.execute(
                                'SELECT id FROM customers WHERE account_number = ?', (f"{customer_account}.0",))
                            customer_result = cursor.fetchone()

                        # Strategy 3: Try without .0 suffix
                        if not customer_result and customer_account.endswith('.0'):
                            clean_account = customer_account[:-2]
                            cursor.execute(
                                'SELECT id FROM customers WHERE account_number = ?', (clean_account,))
                            customer_result = cursor.fetchone()

                        # Strategy 4: Try zero-padded versions
                        if not customer_result:
                            try:
                                numeric_account = int(float(customer_account))
                                padded_account = f"{numeric_account:03d}"
                                cursor.execute(
                                    'SELECT id FROM customers WHERE account_number = ?', (padded_account,))
                                customer_result = cursor.fetchone()
                            except:
                                pass

                        if customer_result:
                            customer_id = customer_result[0]

                    # Extract and import vehicle info (these fields are at the end and correct)
                    vehicle_reg = self.safe_str(row.get('vehRegistration', ''))
                    vehicle_id = None
                    if vehicle_reg and vehicle_reg != 'nan':
                        # Clean registration
                        vehicle_reg_clean = self.clean_registration(
                            vehicle_reg)

                        # Check if vehicle exists
                        cursor.execute(
                            'SELECT id FROM vehicles WHERE registration = ?', (vehicle_reg_clean,))
                        vehicle_result = cursor.fetchone()

                        if vehicle_result:
                            vehicle_id = vehicle_result[0]
                        else:
                            # Create new vehicle
                            vehicle_make = self.safe_str(
                                row.get('vehMake', ''))
                            vehicle_model = self.safe_str(
                                row.get('vehModel', ''))
                            vehicle_mileage = self.safe_int(
                                row.get('vehMileage', 0))

                            if vehicle_make and vehicle_make != 'nan':
                                cursor.execute('''
                                    INSERT INTO vehicles (
                                        registration, make, model, mileage, customer_id, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?)
                                ''', (
                                    vehicle_reg_clean,
                                    vehicle_make if vehicle_make != 'nan' else '',
                                    vehicle_model if vehicle_model != 'nan' else '',
                                    vehicle_mileage,
                                    customer_id,
                                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                ))
                                vehicle_id = cursor.lastrowid
                                imported_vehicles += 1

                    # Extract financial data
                    labour_gross = self.safe_float(
                        row.get('us_SubTotal_LabourGROSS', 0))
                    labour_net = self.safe_float(
                        row.get('us_SubTotal_LabourNET', 0))
                    parts_gross = self.safe_float(
                        row.get('us_SubTotal_PartsGROSS', 0))
                    parts_net = self.safe_float(
                        row.get('us_SubTotal_PartsNET', 0))
                    total_gross = self.safe_float(row.get('us_TotalGROSS', 0))
                    total_net = self.safe_float(row.get('us_TotalNET', 0))
                    total_tax = self.safe_float(row.get('us_TotalTAX', 0))

                    # Extract dates
                    created_date = self.safe_date(
                        row.get('docDate_Created', ''))
                    issued_date = self.safe_date(row.get('docDate_Issued', ''))
                    paid_date = self.safe_date(row.get('docDate_Paid', ''))
                    due_date = self.safe_date(row.get('docDate_DueBy', ''))

                    # Determine job status
                    job_status = 'COMPLETED' if doc_status == 'Issued' else 'PENDING'

                    # Create or update job
                    job_number = self.safe_str(
                        row.get('docNumber_Jobsheet', '')) or doc_id
                    cursor.execute(
                        'SELECT id FROM jobs WHERE job_number = ?', (job_number,))
                    existing_job = cursor.fetchone()

                    if existing_job:
                        if options.get('update_duplicates', False):
                            cursor.execute('''
                                UPDATE jobs SET
                                    customer_id = ?, vehicle_id = ?, status = ?,
                                    labour_cost = ?, parts_cost = ?, total_amount = ?,
                                    created_date = ?, completed_date = ?
                                WHERE job_number = ?
                            ''', (
                                customer_id, vehicle_id, job_status,
                                labour_net, parts_net, total_net,
                                created_date or datetime.now().strftime('%Y-%m-%d'),
                                issued_date,
                                job_number
                            ))
                            job_id = existing_job[0]
                            imported_jobs += 1
                        else:
                            job_id = existing_job[0]
                            duplicates += 1
                    else:
                        cursor.execute('''
                            INSERT INTO jobs (
                                job_number, customer_id, vehicle_id, status,
                                labour_cost, parts_cost, total_amount,
                                created_date, completed_date
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            job_number, customer_id, vehicle_id, job_status,
                            labour_net, parts_net, total_net,
                            created_date or datetime.now().strftime('%Y-%m-%d'),
                            issued_date
                        ))
                        job_id = cursor.lastrowid
                        imported_jobs += 1

                    # Create invoice if this is an invoice document
                    invoice_number = self.safe_str(
                        row.get('docNumber_Invoice', ''))
                    if invoice_number and doc_type == 'SI':  # Sales Invoice
                        cursor.execute(
                            'SELECT id FROM invoices WHERE invoice_number = ?', (invoice_number,))
                        existing_invoice = cursor.fetchone()

                        # Determine invoice status
                        invoice_status = 'PAID' if paid_date else (
                            'PENDING' if doc_status == 'Issued' else 'DRAFT')

                        # Extract payment info
                        payment_method = self.safe_str(
                            row.get('accPaymentMethod', ''))

                        if existing_invoice:
                            if options.get('update_duplicates', False):
                                cursor.execute('''
                                    UPDATE invoices SET
                                        job_id = ?, customer_id = ?, vehicle_id = ?,
                                        amount = ?, vat_amount = ?, total_amount = ?,
                                        status = ?, created_date = ?, due_date = ?,
                                        paid_date = ?, payment_method = ?
                                    WHERE invoice_number = ?
                                ''', (
                                    job_id, customer_id, vehicle_id,
                                    total_net, total_tax, total_gross,
                                    invoice_status, created_date or datetime.now().strftime('%Y-%m-%d'),
                                    due_date, paid_date, payment_method,
                                    invoice_number
                                ))
                                imported_invoices += 1
                            else:
                                duplicates += 1
                        else:
                            cursor.execute('''
                                INSERT INTO invoices (
                                    invoice_number, job_id, customer_id, vehicle_id,
                                    amount, vat_amount, total_amount, status,
                                    created_date, due_date, paid_date, payment_method
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                invoice_number, job_id, customer_id, vehicle_id,
                                total_net, total_tax, total_gross, invoice_status,
                                created_date or datetime.now().strftime('%Y-%m-%d'),
                                due_date, paid_date, payment_method
                            ))
                            imported_invoices += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"Row {index + 1}: {str(e)}")

            conn.commit()

        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'error': f'Database error: {str(e)}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }
        finally:
            conn.close()

        total_imported = imported_jobs + imported_invoices + imported_vehicles

        return {
            'success': True,
            'imported': total_imported,
            'failed': failed,
            'duplicates': duplicates,
            'errors': errors[:10],
            'details': {
                'jobs': imported_jobs,
                'invoices': imported_invoices,
                'vehicles': imported_vehicles
            }
        }

    def _import_receipts(self, df: pd.DataFrame, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import ELI MOTORS receipts/payments from DataFrame"""
        conn = self.get_db_connection()
        cursor = conn.cursor()

        imported = 0
        failed = 0
        duplicates = 0
        errors = []

        try:
            for index, row in df.iterrows():
                try:
                    # Get basic payment info
                    payment_id = self.safe_str(row.get('_ID', ''))
                    document_id = self.safe_str(row.get('_ID_Document', ''))
                    amount = self.safe_float(row.get('Amount', 0))
                    payment_date = self.safe_date(row.get('Date', ''))
                    description = self.safe_str(row.get('Description', ''))
                    method = self.safe_str(row.get('Method', ''))

                    if not payment_id:
                        failed += 1
                        errors.append(f"Row {index + 1}: Missing payment ID")
                        continue

                    if not document_id:
                        failed += 1
                        errors.append(f"Row {index + 1}: Missing document ID")
                        continue

                    if amount == 0:
                        failed += 1
                        errors.append(
                            f"Row {index + 1}: Invalid amount: {amount} (zero amounts not allowed)")
                        continue

                    # Note: Negative amounts are valid (credit notes, refunds, adjustments)

                    # Find related invoice and job
                    invoice_id = None
                    job_id = None
                    customer_id = None

                    # Try to find invoice by document ID (could be job number or invoice number)
                    cursor.execute(
                        'SELECT id, job_id, customer_id FROM invoices WHERE invoice_number = ?', (document_id,))
                    invoice_result = cursor.fetchone()
                    if invoice_result:
                        invoice_id = invoice_result[0]
                        job_id = invoice_result[1]
                        customer_id = invoice_result[2]
                    else:
                        # Try to find by job number
                        cursor.execute(
                            'SELECT id, customer_id FROM jobs WHERE job_number = ?', (document_id,))
                        job_result = cursor.fetchone()
                        if job_result:
                            job_id = job_result[0]
                            customer_id = job_result[1]

                    # Extract reconciliation info
                    reconciled = self.safe_str(
                        row.get('Reconciled', '')) == '1'
                    reconciled_date = self.safe_date(
                        row.get('Reconciled_Date', ''))
                    reconciled_ref = self.safe_str(
                        row.get('Reconciled_Ref', ''))

                    # Extract surcharge info
                    surcharge_applied = self.safe_str(
                        row.get('SurchargeApplied', '')) == '1'
                    surcharge_gross = self.safe_float(
                        row.get('SurchargeGROSS', 0))
                    surcharge_net = self.safe_float(row.get('SurchargeNET', 0))
                    surcharge_tax = self.safe_float(row.get('SurchargeTAX', 0))

                    # Check for duplicates
                    cursor.execute(
                        'SELECT id FROM payments WHERE payment_reference = ?', (payment_id,))
                    existing = cursor.fetchone()
                    if existing:
                        if options.get('update_duplicates', False):
                            # Update existing payment
                            cursor.execute('''
                                UPDATE payments SET
                                    invoice_id = ?, job_id = ?, customer_id = ?,
                                    amount = ?, payment_date = ?, payment_method = ?,
                                    description = ?, reconciled = ?, reconciled_date = ?,
                                    reconciled_reference = ?, surcharge_applied = ?,
                                    surcharge_gross = ?, surcharge_net = ?, surcharge_tax = ?
                                WHERE payment_reference = ?
                            ''', (
                                invoice_id, job_id, customer_id,
                                amount, payment_date, method,
                                description, reconciled, reconciled_date,
                                reconciled_ref, surcharge_applied,
                                surcharge_gross, surcharge_net, surcharge_tax,
                                payment_id
                            ))
                            imported += 1
                        else:
                            duplicates += 1
                        continue

                    # Determine payment type based on amount and method
                    payment_type = "PAYMENT"
                    if amount < 0:
                        payment_type = "CREDIT_NOTE" if method == "Credit Note" else "REFUND"
                    elif method == "Credit Note":
                        payment_type = "CREDIT_NOTE"

                    # Insert new payment
                    cursor.execute('''
                        INSERT INTO payments (
                            payment_reference, invoice_id, job_id, customer_id,
                            amount, payment_date, payment_method, description,
                            reconciled, reconciled_date, reconciled_reference,
                            surcharge_applied, surcharge_gross, surcharge_net, surcharge_tax,
                            created_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        payment_id, invoice_id, job_id, customer_id,
                        amount, payment_date, f"{method} ({payment_type})", description,
                        reconciled, reconciled_date, reconciled_ref,
                        surcharge_applied, surcharge_gross, surcharge_net, surcharge_tax,
                        datetime.now().strftime('%Y-%m-%d')
                    ))

                    imported += 1

                    # Update invoice status if payment found
                    if invoice_id and payment_date:
                        cursor.execute('''
                            UPDATE invoices SET
                                status = 'PAID',
                                paid_date = ?,
                                payment_method = ?
                            WHERE id = ?
                        ''', (payment_date, method, invoice_id))

                except Exception as e:
                    failed += 1
                    errors.append(f"Row {index + 1}: {str(e)}")

            conn.commit()

        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'error': f'Database error: {str(e)}',
                'imported': 0,
                'failed': 0,
                'duplicates': 0
            }
        finally:
            conn.close()

        return {
            'success': True,
            'imported': imported,
            'failed': failed,
            'duplicates': duplicates,
            'errors': errors[:10]  # Limit to first 10 errors
        }
