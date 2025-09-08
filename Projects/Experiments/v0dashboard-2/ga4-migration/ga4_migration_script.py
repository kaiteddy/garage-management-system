#!/usr/bin/env python3
"""
GA4 Garage Management System Data Migration Script

This script migrates data from GA4 CSV exports to a PostgreSQL database
following the normalized schema design.
"""

import csv
import sys
import os
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Any
import uuid

# Increase CSV field size limit
csv.field_size_limit(sys.maxsize)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ga4_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class GA4Migrator:
    def __init__(self, db_config: Dict[str, str], csv_directory: str):
        """Initialize the migrator with database config and CSV directory."""
        self.db_config = db_config
        self.csv_directory = csv_directory
        self.conn = None
        self.cursor = None
        
        # Mapping tables for foreign key resolution
        self.customer_mapping = {}  # legacy_id -> uuid
        self.vehicle_mapping = {}   # legacy_id -> uuid
        self.document_mapping = {}  # legacy_id -> uuid
        self.stock_mapping = {}     # legacy_id -> uuid
        self.appointment_mapping = {} # legacy_id -> uuid
        self.supplier_mapping = {}  # legacy_id -> uuid
        self.template_mapping = {}  # legacy_id -> uuid
        
        # Statistics
        self.stats = {
            'customers': {'processed': 0, 'errors': 0},
            'vehicles': {'processed': 0, 'errors': 0},
            'documents': {'processed': 0, 'errors': 0},
            'line_items': {'processed': 0, 'errors': 0},
            'appointments': {'processed': 0, 'errors': 0},
            'receipts': {'processed': 0, 'errors': 0},
            'stock_items': {'processed': 0, 'errors': 0},
            'reminders': {'processed': 0, 'errors': 0},
            'reminder_templates': {'processed': 0, 'errors': 0},
            'customer_contacts': {'processed': 0, 'errors': 0}
        }

    def connect_db(self):
        """Connect to PostgreSQL database."""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            logger.info("Connected to database successfully")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise

    def disconnect_db(self):
        """Disconnect from database."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Disconnected from database")

    def load_csv(self, filename: str, encoding: str = 'latin-1') -> List[Dict]:
        """Load CSV file with proper encoding handling."""
        filepath = os.path.join(self.csv_directory, filename)
        
        if not os.path.exists(filepath):
            logger.error(f"CSV file not found: {filepath}")
            return []
        
        # Try different encodings
        encodings = [encoding, 'utf-8', 'latin-1', 'cp1252']
        
        for enc in encodings:
            try:
                with open(filepath, 'r', encoding=enc) as f:
                    reader = csv.DictReader(f)
                    data = list(reader)
                logger.info(f"Loaded {filename} with {len(data)} records using {enc} encoding")
                return data
            except UnicodeDecodeError:
                continue
        
        logger.error(f"Could not decode {filename} with any encoding")
        return []

    def safe_convert_date(self, date_str: str) -> Optional[str]:
        """Convert date string to ISO format."""
        if not date_str or date_str.strip() == '':
            return None
        
        try:
            # Handle DD/MM/YYYY format
            if '/' in date_str:
                dt = datetime.strptime(date_str.strip(), '%d/%m/%Y')
                return dt.strftime('%Y-%m-%d')
            # Handle other formats as needed
            return date_str
        except ValueError:
            logger.warning(f"Could not parse date: {date_str}")
            return None

    def safe_convert_datetime(self, datetime_str: str) -> Optional[str]:
        """Convert datetime string to ISO format."""
        if not datetime_str or datetime_str.strip() == '':
            return None
        
        try:
            # Handle DD/MM/YYYY HH:MM:SS format
            if '/' in datetime_str and ':' in datetime_str:
                dt = datetime.strptime(datetime_str.strip(), '%d/%m/%Y %H:%M:%S')
                return dt.strftime('%Y-%m-%d %H:%M:%S')
            # Handle date only
            return self.safe_convert_date(datetime_str)
        except ValueError:
            logger.warning(f"Could not parse datetime: {datetime_str}")
            return None

    def safe_convert_decimal(self, value: str, default: Decimal = Decimal('0')) -> Decimal:
        """Convert string to decimal safely."""
        if not value or value.strip() == '':
            return default
        
        try:
            # Remove commas and convert
            clean_value = value.replace(',', '').strip()
            return Decimal(clean_value)
        except (InvalidOperation, ValueError):
            logger.warning(f"Could not convert to decimal: {value}")
            return default

    def safe_convert_int(self, value: str, default: int = 0) -> int:
        """Convert string to integer safely."""
        if not value or value.strip() == '':
            return default
        
        try:
            return int(float(value.replace(',', '').strip()))
        except (ValueError, TypeError):
            logger.warning(f"Could not convert to integer: {value}")
            return default

    def safe_convert_bool(self, value: str, default: bool = False) -> bool:
        """Convert string to boolean safely."""
        if not value or value.strip() == '':
            return default
        
        value = value.strip().lower()
        if value in ('1', 'true', 'yes', 'y'):
            return True
        elif value in ('0', 'false', 'no', 'n'):
            return False
        else:
            return default

    def migrate_customers(self):
        """Migrate customers table."""
        logger.info("Starting customers migration...")
        
        customers_data = self.load_csv('Customers.csv')
        if not customers_data:
            return
        
        insert_sql = """
        INSERT INTO customers (
            legacy_id, account_number, title, forename, surname, company_name,
            email, telephone, mobile, no_email, house_no, road, locality, town,
            county, postcode, classification, how_found_us, regular_customer,
            account_held, credit_limit, credit_terms, force_tax_free, labour_rate,
            labour_discount_percent, parts_discount_percent, trade_parts,
            reminders_allowed, last_invoice_date, notes, created_at, updated_at
        ) VALUES (
            %(legacy_id)s, %(account_number)s, %(title)s, %(forename)s, %(surname)s,
            %(company_name)s, %(email)s, %(telephone)s, %(mobile)s, %(no_email)s,
            %(house_no)s, %(road)s, %(locality)s, %(town)s, %(county)s, %(postcode)s,
            %(classification)s, %(how_found_us)s, %(regular_customer)s, %(account_held)s,
            %(credit_limit)s, %(credit_terms)s, %(force_tax_free)s, %(labour_rate)s,
            %(labour_discount_percent)s, %(parts_discount_percent)s, %(trade_parts)s,
            %(reminders_allowed)s, %(last_invoice_date)s, %(notes)s, %(created_at)s,
            %(updated_at)s
        ) RETURNING id, legacy_id
        """
        
        for row in customers_data:
            try:
                # Extract mobile number from combined field
                mobile = row.get('contactMobile', '')
                if mobile and ' ' in mobile:
                    mobile = mobile.split(' ')[0]  # Take first part before space
                
                customer_data = {
                    'legacy_id': row['_ID'],
                    'account_number': row.get('AccountNumber') or None,
                    'title': row.get('nameTitle') or None,
                    'forename': row.get('nameForename') or None,
                    'surname': row.get('nameSurname') or 'Unknown',
                    'company_name': row.get('nameCompany') or None,
                    'email': row.get('contactEmail') or None,
                    'telephone': row.get('contactTelephone') or None,
                    'mobile': mobile or None,
                    'no_email': self.safe_convert_bool(row.get('contactNoEmail')),
                    'house_no': row.get('addressHouseNo') or None,
                    'road': row.get('addressRoad') or None,
                    'locality': row.get('addressLocality') or None,
                    'town': row.get('addressTown') or None,
                    'county': row.get('addressCounty') or None,
                    'postcode': row.get('addressPostCode') or None,
                    'classification': row.get('classification') or None,
                    'how_found_us': row.get('HowFoundUs') or None,
                    'regular_customer': self.safe_convert_bool(row.get('regularCustomer')),
                    'account_held': self.safe_convert_bool(row.get('AccountHeld')),
                    'credit_limit': self.safe_convert_decimal(row.get('AccountCreditLimit')),
                    'credit_terms': self.safe_convert_int(row.get('AccountCreditTerms'), 30),
                    'force_tax_free': self.safe_convert_bool(row.get('rates_ForceTaxFree')),
                    'labour_rate': self.safe_convert_decimal(row.get('rates_LabourRate')) or None,
                    'labour_discount_percent': self.safe_convert_decimal(row.get('rates_LabourDiscountPercent')),
                    'parts_discount_percent': self.safe_convert_decimal(row.get('rates_PartsDiscountPercent')),
                    'trade_parts': self.safe_convert_bool(row.get('rates_TradeParts')),
                    'reminders_allowed': self.safe_convert_bool(row.get('remindersAllowed'), True),
                    'last_invoice_date': self.safe_convert_date(row.get('status_LastInvoiceDate')),
                    'notes': row.get('Notes') or None,
                    'created_at': self.safe_convert_datetime(row.get('sys_TimeStamp_Creation')),
                    'updated_at': self.safe_convert_datetime(row.get('sys_TimeStamp_Modification'))
                }
                
                self.cursor.execute(insert_sql, customer_data)
                result = self.cursor.fetchone()
                
                # Store mapping for foreign key resolution
                self.customer_mapping[row['_ID']] = result['id']
                
                self.stats['customers']['processed'] += 1
                
                # Process additional contacts
                self.process_additional_contacts(row, result['id'])
                
            except Exception as e:
                logger.error(f"Error processing customer {row.get('_ID', 'unknown')}: {e}")
                self.stats['customers']['errors'] += 1
                continue
        
        self.conn.commit()
        logger.info(f"Customers migration completed: {self.stats['customers']['processed']} processed, {self.stats['customers']['errors']} errors")

    def process_additional_contacts(self, customer_row: Dict, customer_id: str):
        """Process additional customer contacts."""
        contact_sql = """
        INSERT INTO customer_contacts (customer_id, contact_name, contact_number, contact_type)
        VALUES (%(customer_id)s, %(contact_name)s, %(contact_number)s, %(contact_type)s)
        """
        
        for i in range(1, 4):  # AdditionalContactName1-3
            name_field = f'AdditionalContactName{i}'
            number_field = f'AdditionalContactNumber{i}'
            
            name = customer_row.get(name_field)
            number = customer_row.get(number_field)
            
            if name or number:
                try:
                    contact_data = {
                        'customer_id': customer_id,
                        'contact_name': name or None,
                        'contact_number': number or None,
                        'contact_type': 'additional'
                    }
                    
                    self.cursor.execute(contact_sql, contact_data)
                    self.stats['customer_contacts']['processed'] += 1
                    
                except Exception as e:
                    logger.error(f"Error processing additional contact for customer {customer_id}: {e}")
                    self.stats['customer_contacts']['errors'] += 1

    def migrate_vehicles(self):
        """Migrate vehicles table."""
        logger.info("Starting vehicles migration...")

        vehicles_data = self.load_csv('Vehicles.csv')
        if not vehicles_data:
            return

        insert_sql = """
        INSERT INTO vehicles (
            legacy_id, customer_id, registration, registration_id, vin, make, model,
            colour, date_of_registration, date_of_manufacture, vehicle_type, body_style,
            engine_cc, engine_code, engine_no, fuel_type, cylinders, valve_count,
            power_bhp, power_kw, torque_nm, torque_lbft, co2_emissions, euro_status,
            width_mm, height_mm, kerb_weight_min, kerb_weight_max, key_code, radio_code,
            paint_code, transmission, drive_type, last_invoice_date, notes, reminder_notes
        ) VALUES (
            %(legacy_id)s, %(customer_id)s, %(registration)s, %(registration_id)s, %(vin)s,
            %(make)s, %(model)s, %(colour)s, %(date_of_registration)s, %(date_of_manufacture)s,
            %(vehicle_type)s, %(body_style)s, %(engine_cc)s, %(engine_code)s, %(engine_no)s,
            %(fuel_type)s, %(cylinders)s, %(valve_count)s, %(power_bhp)s, %(power_kw)s,
            %(torque_nm)s, %(torque_lbft)s, %(co2_emissions)s, %(euro_status)s, %(width_mm)s,
            %(height_mm)s, %(kerb_weight_min)s, %(kerb_weight_max)s, %(key_code)s,
            %(radio_code)s, %(paint_code)s, %(transmission)s, %(drive_type)s,
            %(last_invoice_date)s, %(notes)s, %(reminder_notes)s
        ) RETURNING id, legacy_id
        """

        for row in vehicles_data:
            try:
                # Resolve customer foreign key
                customer_id = self.customer_mapping.get(row.get('_ID_Customer'))
                if not customer_id and row.get('_ID_Customer'):
                    logger.warning(f"Customer not found for vehicle {row['_ID']}: {row.get('_ID_Customer')}")

                vehicle_data = {
                    'legacy_id': row['_ID'],
                    'customer_id': customer_id,
                    'registration': row.get('Registration') or 'Unknown',
                    'registration_id': row.get('_RegID') or None,
                    'vin': row.get('VIN') or None,
                    'make': row.get('Make') or 'Unknown',
                    'model': row.get('Model') or 'Unknown',
                    'colour': row.get('Colour') or None,
                    'date_of_registration': self.safe_convert_date(row.get('DateofReg')),
                    'date_of_manufacture': self.safe_convert_date(row.get('DateofManufacture')),
                    'vehicle_type': row.get('TypeofVehicle') or None,
                    'body_style': row.get('BodyStyle') or None,
                    'engine_cc': self.safe_convert_int(row.get('EngineCC')) or None,
                    'engine_code': row.get('EngineCode') or None,
                    'engine_no': row.get('EngineNo') or None,
                    'fuel_type': row.get('FuelType') or None,
                    'cylinders': self.safe_convert_int(row.get('CylinderCount')) or None,
                    'valve_count': self.safe_convert_int(row.get('ValveCount')) or None,
                    'power_bhp': self.safe_convert_decimal(row.get('Power_MaxBHP')) or None,
                    'power_kw': self.safe_convert_decimal(row.get('Power_MaxKW')) or None,
                    'torque_nm': self.safe_convert_decimal(row.get('MaxTorqueatNm')) or None,
                    'torque_lbft': self.safe_convert_decimal(row.get('MaxTorqueatLbFt')) or None,
                    'co2_emissions': self.safe_convert_int(row.get('CO2')) or None,
                    'euro_status': row.get('EuroStatus') or None,
                    'width_mm': self.safe_convert_int(row.get('Widthmm')) or None,
                    'height_mm': self.safe_convert_int(row.get('Heightmm')) or None,
                    'kerb_weight_min': self.safe_convert_int(row.get('KerbWeightMin')) or None,
                    'kerb_weight_max': self.safe_convert_int(row.get('KerbWeightMax')) or None,
                    'key_code': row.get('KeyCode') or None,
                    'radio_code': row.get('RadioCode') or None,
                    'paint_code': row.get('Paintcode') or None,
                    'transmission': row.get('Transmission') or None,
                    'drive_type': row.get('DriveType') or None,
                    'last_invoice_date': self.safe_convert_date(row.get('status_LastInvoiceDate')),
                    'notes': row.get('Notes') or None,
                    'reminder_notes': row.get('Notes_Reminders') or None
                }

                self.cursor.execute(insert_sql, vehicle_data)
                result = self.cursor.fetchone()

                # Store mapping for foreign key resolution
                self.vehicle_mapping[row['_ID']] = result['id']

                self.stats['vehicles']['processed'] += 1

            except Exception as e:
                logger.error(f"Error processing vehicle {row.get('_ID', 'unknown')}: {e}")
                self.stats['vehicles']['errors'] += 1
                continue

        self.conn.commit()
        logger.info(f"Vehicles migration completed: {self.stats['vehicles']['processed']} processed, {self.stats['vehicles']['errors']} errors")

    def migrate_appointments(self):
        """Migrate appointments table."""
        logger.info("Starting appointments migration...")

        appointments_data = self.load_csv('Appointments.csv')
        if not appointments_data:
            return

        insert_sql = """
        INSERT INTO appointments (
            legacy_id, customer_id, vehicle_id, appointment_date, start_time, end_time,
            duration, appointment_type, resource, description
        ) VALUES (
            %(legacy_id)s, %(customer_id)s, %(vehicle_id)s, %(appointment_date)s,
            %(start_time)s, %(end_time)s, %(duration)s, %(appointment_type)s,
            %(resource)s, %(description)s
        ) RETURNING id, legacy_id
        """

        for row in appointments_data:
            try:
                # Resolve foreign keys
                customer_id = self.customer_mapping.get(row.get('_ID_Customer'))
                vehicle_id = self.vehicle_mapping.get(row.get('_ID_Vehicle'))

                appointment_data = {
                    'legacy_id': row['_ID'],
                    'customer_id': customer_id,
                    'vehicle_id': vehicle_id,
                    'appointment_date': self.safe_convert_date(row.get('ApptDateStart')),
                    'start_time': row.get('ApptTimeStart') or None,
                    'end_time': row.get('ApptTimeEnd') or None,
                    'duration': self.safe_convert_int(row.get('ApptDuration')) or None,
                    'appointment_type': row.get('ApptType') or None,
                    'resource': row.get('ApptResource') or None,
                    'description': row.get('ApptDescEntry') or None
                }

                self.cursor.execute(insert_sql, appointment_data)
                result = self.cursor.fetchone()

                # Store mapping for foreign key resolution
                self.appointment_mapping[row['_ID']] = result['id']

                self.stats['appointments']['processed'] += 1

            except Exception as e:
                logger.error(f"Error processing appointment {row.get('_ID', 'unknown')}: {e}")
                self.stats['appointments']['errors'] += 1
                continue

        self.conn.commit()
        logger.info(f"Appointments migration completed: {self.stats['appointments']['processed']} processed, {self.stats['appointments']['errors']} errors")

    def run_migration(self):
        """Run the complete migration process."""
        try:
            self.connect_db()

            logger.info("Starting GA4 data migration...")

            # Migration order is important due to foreign key dependencies
            self.migrate_customers()
            self.migrate_vehicles()
            self.migrate_appointments()
            # Add other migration methods here

            # Print final statistics
            logger.info("Migration completed successfully!")
            logger.info("Final Statistics:")
            for table, stats in self.stats.items():
                if stats['processed'] > 0 or stats['errors'] > 0:
                    logger.info(f"  {table}: {stats['processed']} processed, {stats['errors']} errors")

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            if self.conn:
                self.conn.rollback()
            raise
        finally:
            self.disconnect_db()


def main():
    """Main entry point."""
    # Database configuration
    db_config = {
        'host': 'localhost',
        'database': 'ga4_garage',
        'user': 'postgres',
        'password': 'your_password',
        'port': 5432
    }

    # CSV directory path
    csv_directory = '/Users/adamrutstein/Desktop/GA4 EXPORT'

    # Create migrator and run
    migrator = GA4Migrator(db_config, csv_directory)
    migrator.run_migration()


if __name__ == '__main__':
    main()
