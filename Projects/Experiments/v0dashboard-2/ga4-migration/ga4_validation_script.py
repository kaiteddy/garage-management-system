#!/usr/bin/env python3
"""
GA4 Data Migration Validation Script

This script validates the migrated data to ensure integrity and completeness.
"""

import csv
import sys
import os
import logging
import psycopg2
import psycopg2.extras
from typing import Dict, List, Tuple
from decimal import Decimal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ga4_validation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class GA4Validator:
    def __init__(self, db_config: Dict[str, str], csv_directory: str):
        """Initialize the validator."""
        self.db_config = db_config
        self.csv_directory = csv_directory
        self.conn = None
        self.cursor = None
        self.validation_results = {}

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

    def count_csv_records(self, filename: str) -> int:
        """Count records in CSV file."""
        filepath = os.path.join(self.csv_directory, filename)
        
        if not os.path.exists(filepath):
            logger.error(f"CSV file not found: {filepath}")
            return 0
        
        # Try different encodings
        for encoding in ['latin-1', 'utf-8', 'cp1252']:
            try:
                with open(filepath, 'r', encoding=encoding) as f:
                    reader = csv.DictReader(f)
                    count = sum(1 for row in reader)
                return count
            except UnicodeDecodeError:
                continue
        
        logger.error(f"Could not decode {filename}")
        return 0

    def validate_record_counts(self):
        """Validate that record counts match between CSV and database."""
        logger.info("Validating record counts...")
        
        validations = [
            ('customers', 'Customers.csv'),
            ('vehicles', 'Vehicles.csv'),
            ('documents', 'Documents.csv'),
            ('line_items', 'LineItems.csv'),
            ('appointments', 'Appointments.csv'),
            ('receipts', 'Receipts.csv'),
            ('stock_items', 'Stock.csv'),
            ('reminders', 'Reminders.csv'),
            ('reminder_templates', 'Reminder_Templates.csv')
        ]
        
        results = {}
        
        for table_name, csv_file in validations:
            # Count CSV records
            csv_count = self.count_csv_records(csv_file)
            
            # Count database records
            self.cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
            db_count = self.cursor.fetchone()['count']
            
            # Calculate difference
            difference = abs(csv_count - db_count)
            match_percentage = (min(csv_count, db_count) / max(csv_count, db_count) * 100) if max(csv_count, db_count) > 0 else 100
            
            results[table_name] = {
                'csv_count': csv_count,
                'db_count': db_count,
                'difference': difference,
                'match_percentage': match_percentage,
                'status': 'PASS' if difference == 0 else 'FAIL'
            }
            
            logger.info(f"{table_name}: CSV={csv_count}, DB={db_count}, Diff={difference}, Match={match_percentage:.1f}%")
        
        self.validation_results['record_counts'] = results
        return results

    def validate_referential_integrity(self):
        """Validate foreign key relationships."""
        logger.info("Validating referential integrity...")
        
        integrity_checks = [
            {
                'name': 'vehicles_customer_fk',
                'query': """
                    SELECT COUNT(*) as count FROM vehicles v 
                    LEFT JOIN customers c ON v.customer_id = c.id 
                    WHERE v.customer_id IS NOT NULL AND c.id IS NULL
                """,
                'description': 'Vehicles with invalid customer references'
            },
            {
                'name': 'documents_customer_fk',
                'query': """
                    SELECT COUNT(*) as count FROM documents d 
                    LEFT JOIN customers c ON d.customer_id = c.id 
                    WHERE d.customer_id IS NOT NULL AND c.id IS NULL
                """,
                'description': 'Documents with invalid customer references'
            },
            {
                'name': 'documents_vehicle_fk',
                'query': """
                    SELECT COUNT(*) as count FROM documents d 
                    LEFT JOIN vehicles v ON d.vehicle_id = v.id 
                    WHERE d.vehicle_id IS NOT NULL AND v.id IS NULL
                """,
                'description': 'Documents with invalid vehicle references'
            },
            {
                'name': 'line_items_document_fk',
                'query': """
                    SELECT COUNT(*) as count FROM line_items li 
                    LEFT JOIN documents d ON li.document_id = d.id 
                    WHERE li.document_id IS NOT NULL AND d.id IS NULL
                """,
                'description': 'Line items with invalid document references'
            },
            {
                'name': 'receipts_document_fk',
                'query': """
                    SELECT COUNT(*) as count FROM receipts r 
                    LEFT JOIN documents d ON r.document_id = d.id 
                    WHERE r.document_id IS NOT NULL AND d.id IS NULL
                """,
                'description': 'Receipts with invalid document references'
            }
        ]
        
        results = {}
        
        for check in integrity_checks:
            try:
                self.cursor.execute(check['query'])
                invalid_count = self.cursor.fetchone()['count']
                
                results[check['name']] = {
                    'invalid_count': invalid_count,
                    'description': check['description'],
                    'status': 'PASS' if invalid_count == 0 else 'FAIL'
                }
                
                logger.info(f"{check['name']}: {invalid_count} invalid references")
                
            except Exception as e:
                logger.error(f"Error checking {check['name']}: {e}")
                results[check['name']] = {
                    'invalid_count': -1,
                    'description': check['description'],
                    'status': 'ERROR',
                    'error': str(e)
                }
        
        self.validation_results['referential_integrity'] = results
        return results

    def validate_data_quality(self):
        """Validate data quality issues."""
        logger.info("Validating data quality...")
        
        quality_checks = [
            {
                'name': 'customers_missing_surname',
                'query': "SELECT COUNT(*) as count FROM customers WHERE surname IS NULL OR surname = ''",
                'description': 'Customers without surname'
            },
            {
                'name': 'vehicles_missing_registration',
                'query': "SELECT COUNT(*) as count FROM vehicles WHERE registration IS NULL OR registration = ''",
                'description': 'Vehicles without registration'
            },
            {
                'name': 'vehicles_missing_make_model',
                'query': "SELECT COUNT(*) as count FROM vehicles WHERE make IS NULL OR model IS NULL",
                'description': 'Vehicles without make or model'
            },
            {
                'name': 'documents_missing_type',
                'query': "SELECT COUNT(*) as count FROM documents WHERE document_type IS NULL",
                'description': 'Documents without type'
            },
            {
                'name': 'line_items_zero_quantity',
                'query': "SELECT COUNT(*) as count FROM line_items WHERE quantity <= 0",
                'description': 'Line items with zero or negative quantity'
            },
            {
                'name': 'line_items_missing_description',
                'query': "SELECT COUNT(*) as count FROM line_items WHERE description IS NULL OR description = ''",
                'description': 'Line items without description'
            },
            {
                'name': 'receipts_zero_amount',
                'query': "SELECT COUNT(*) as count FROM receipts WHERE amount <= 0",
                'description': 'Receipts with zero or negative amount'
            }
        ]
        
        results = {}
        
        for check in quality_checks:
            try:
                self.cursor.execute(check['query'])
                issue_count = self.cursor.fetchone()['count']
                
                results[check['name']] = {
                    'issue_count': issue_count,
                    'description': check['description'],
                    'status': 'PASS' if issue_count == 0 else 'WARNING'
                }
                
                logger.info(f"{check['name']}: {issue_count} issues found")
                
            except Exception as e:
                logger.error(f"Error checking {check['name']}: {e}")
                results[check['name']] = {
                    'issue_count': -1,
                    'description': check['description'],
                    'status': 'ERROR',
                    'error': str(e)
                }
        
        self.validation_results['data_quality'] = results
        return results

    def validate_financial_totals(self):
        """Validate financial calculations."""
        logger.info("Validating financial totals...")
        
        # Sample validation of document totals
        financial_checks = [
            {
                'name': 'document_totals_consistency',
                'query': """
                    SELECT COUNT(*) as count FROM documents 
                    WHERE ABS((total_net + total_tax) - total_gross) > 0.01
                """,
                'description': 'Documents with inconsistent total calculations'
            },
            {
                'name': 'negative_totals',
                'query': """
                    SELECT COUNT(*) as count FROM documents 
                    WHERE total_gross < 0 AND document_type != 'credit_note'
                """,
                'description': 'Non-credit documents with negative totals'
            },
            {
                'name': 'line_item_totals',
                'query': """
                    SELECT COUNT(*) as count FROM line_items 
                    WHERE ABS((line_net + line_tax) - line_gross) > 0.01
                """,
                'description': 'Line items with inconsistent total calculations'
            }
        ]
        
        results = {}
        
        for check in financial_checks:
            try:
                self.cursor.execute(check['query'])
                issue_count = self.cursor.fetchone()['count']
                
                results[check['name']] = {
                    'issue_count': issue_count,
                    'description': check['description'],
                    'status': 'PASS' if issue_count == 0 else 'WARNING'
                }
                
                logger.info(f"{check['name']}: {issue_count} issues found")
                
            except Exception as e:
                logger.error(f"Error checking {check['name']}: {e}")
                results[check['name']] = {
                    'issue_count': -1,
                    'description': check['description'],
                    'status': 'ERROR',
                    'error': str(e)
                }
        
        self.validation_results['financial_totals'] = results
        return results

    def generate_validation_report(self):
        """Generate a comprehensive validation report."""
        logger.info("Generating validation report...")
        
        report_lines = [
            "=" * 80,
            "GA4 DATA MIGRATION VALIDATION REPORT",
            "=" * 80,
            ""
        ]
        
        # Record counts section
        if 'record_counts' in self.validation_results:
            report_lines.extend([
                "RECORD COUNTS VALIDATION",
                "-" * 40,
                f"{'Table':<20} {'CSV':<10} {'DB':<10} {'Diff':<8} {'Match%':<8} {'Status':<8}",
                "-" * 40
            ])
            
            for table, result in self.validation_results['record_counts'].items():
                report_lines.append(
                    f"{table:<20} {result['csv_count']:<10} {result['db_count']:<10} "
                    f"{result['difference']:<8} {result['match_percentage']:<8.1f} {result['status']:<8}"
                )
            report_lines.append("")
        
        # Referential integrity section
        if 'referential_integrity' in self.validation_results:
            report_lines.extend([
                "REFERENTIAL INTEGRITY VALIDATION",
                "-" * 40
            ])
            
            for check, result in self.validation_results['referential_integrity'].items():
                status_text = f"{result['status']} ({result['invalid_count']} invalid)"
                report_lines.append(f"{result['description']}: {status_text}")
            report_lines.append("")
        
        # Data quality section
        if 'data_quality' in self.validation_results:
            report_lines.extend([
                "DATA QUALITY VALIDATION",
                "-" * 40
            ])
            
            for check, result in self.validation_results['data_quality'].items():
                status_text = f"{result['status']} ({result['issue_count']} issues)"
                report_lines.append(f"{result['description']}: {status_text}")
            report_lines.append("")
        
        # Financial totals section
        if 'financial_totals' in self.validation_results:
            report_lines.extend([
                "FINANCIAL TOTALS VALIDATION",
                "-" * 40
            ])
            
            for check, result in self.validation_results['financial_totals'].items():
                status_text = f"{result['status']} ({result['issue_count']} issues)"
                report_lines.append(f"{result['description']}: {status_text}")
            report_lines.append("")
        
        report_lines.extend([
            "=" * 80,
            "END OF VALIDATION REPORT",
            "=" * 80
        ])
        
        # Write report to file
        with open('ga4_validation_report.txt', 'w') as f:
            f.write('\n'.join(report_lines))
        
        # Also log the report
        for line in report_lines:
            logger.info(line)

    def run_validation(self):
        """Run the complete validation process."""
        try:
            self.connect_db()
            
            logger.info("Starting GA4 data validation...")
            
            # Run all validations
            self.validate_record_counts()
            self.validate_referential_integrity()
            self.validate_data_quality()
            self.validate_financial_totals()
            
            # Generate report
            self.generate_validation_report()
            
            logger.info("Validation completed successfully!")
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
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
    
    # Create validator and run
    validator = GA4Validator(db_config, csv_directory)
    validator.run_validation()


if __name__ == '__main__':
    main()
