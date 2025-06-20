#!/usr/bin/env python3
"""
GDPR Compliance Service
Handles data subject rights, consent management, and data protection
"""

import hashlib
import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional


@dataclass
class ConsentRecord:
    """Consent record structure"""
    purpose: str
    granted: bool
    timestamp: datetime
    ip_address: str
    user_agent: str


class GDPRService:
    """Service for GDPR compliance and data protection"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_gdpr_tables()

    def _ensure_gdpr_tables(self):
        """Create GDPR-related tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Consent management table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS consent_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    purpose VARCHAR(100) NOT NULL,
                    granted BOOLEAN NOT NULL,
                    granted_date DATETIME,
                    withdrawn_date DATETIME,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    legal_basis VARCHAR(50),
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            # Data access log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS data_access_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    accessed_by VARCHAR(100),
                    access_type VARCHAR(50),
                    data_accessed TEXT,
                    purpose VARCHAR(200),
                    ip_address VARCHAR(45),
                    access_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            # Data processing activities table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS data_processing_activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    activity_name VARCHAR(100) NOT NULL,
                    purpose VARCHAR(200),
                    legal_basis VARCHAR(50),
                    data_categories TEXT,
                    retention_period INTEGER,
                    third_party_sharing BOOLEAN DEFAULT 0,
                    security_measures TEXT,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Data breach log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS data_breach_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    breach_type VARCHAR(50),
                    description TEXT,
                    affected_records INTEGER,
                    severity VARCHAR(20),
                    discovered_date DATETIME,
                    reported_date DATETIME,
                    resolved_date DATETIME,
                    notification_required BOOLEAN,
                    dpa_notified BOOLEAN DEFAULT 0,
                    customers_notified BOOLEAN DEFAULT 0,
                    remedial_actions TEXT,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            conn.commit()
            conn.close()

        except Exception as e:
            print(f"Error creating GDPR tables: {str(e)}")

    def record_consent(self, customer_id: int, purpose: str, granted: bool,
                       ip_address: str = None, user_agent: str = None,
                       legal_basis: str = 'consent') -> bool:
        """Record customer consent for data processing"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Check if consent already exists
            cursor.execute('''
                SELECT id FROM consent_records 
                WHERE customer_id = ? AND purpose = ? AND withdrawn_date IS NULL
            ''', (customer_id, purpose))

            existing_consent = cursor.fetchone()

            if existing_consent and not granted:
                # Withdraw existing consent
                cursor.execute('''
                    UPDATE consent_records 
                    SET withdrawn_date = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ''', (existing_consent[0],))
            elif granted:
                # Grant new consent or update existing
                if existing_consent:
                    cursor.execute('''
                        UPDATE consent_records 
                        SET granted = ?, granted_date = CURRENT_TIMESTAMP,
                            ip_address = ?, user_agent = ?
                        WHERE id = ?
                    ''', (granted, ip_address, user_agent, existing_consent[0]))
                else:
                    cursor.execute('''
                        INSERT INTO consent_records 
                        (customer_id, purpose, granted, granted_date, ip_address, user_agent, legal_basis)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
                    ''', (customer_id, purpose, granted, ip_address, user_agent, legal_basis))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print(f"Error recording consent: {str(e)}")
            return False

    def get_customer_consents(self, customer_id: int) -> List[Dict]:
        """Get all consent records for a customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT purpose, granted, granted_date, withdrawn_date, legal_basis
                FROM consent_records 
                WHERE customer_id = ?
                ORDER BY granted_date DESC
            ''', (customer_id,))

            consents = []
            for row in cursor.fetchall():
                consents.append({
                    'purpose': row[0],
                    'granted': bool(row[1]),
                    'granted_date': row[2],
                    'withdrawn_date': row[3],
                    'legal_basis': row[4],
                    'is_active': row[3] is None and row[1]
                })

            conn.close()
            return consents

        except Exception as e:
            print(f"Error getting customer consents: {str(e)}")
            return []

    def log_data_access(self, customer_id: int, accessed_by: str, access_type: str,
                        data_accessed: str, purpose: str, ip_address: str = None) -> bool:
        """Log data access for audit trail"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO data_access_log 
                (customer_id, accessed_by, access_type, data_accessed, purpose, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (customer_id, accessed_by, access_type, data_accessed, purpose, ip_address))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print(f"Error logging data access: {str(e)}")
            return False

    def export_customer_data(self, customer_id: int) -> Dict:
        """Export all customer data for data portability"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get customer data
            cursor.execute('''
                SELECT id, account_number, name, company, address, postcode,
                       phone, mobile, email, created_date, updated_date
                FROM customers WHERE id = ?
            ''', (customer_id,))

            customer_row = cursor.fetchone()
            if not customer_row:
                return {'success': False, 'error': 'Customer not found'}

            customer_data = {
                'id': customer_row[0],
                'account_number': customer_row[1],
                'name': customer_row[2],
                'company': customer_row[3],
                'address': customer_row[4],
                'postcode': customer_row[5],
                'phone': customer_row[6],
                'mobile': customer_row[7],
                'email': customer_row[8],
                'created_date': customer_row[9],
                'updated_date': customer_row[10]
            }

            # Get vehicles
            cursor.execute('''
                SELECT registration, make, model, year, color, fuel_type,
                       mot_expiry, tax_due, mileage, created_at
                FROM vehicles WHERE customer_id = ?
            ''', (customer_id,))

            vehicles = []
            for row in cursor.fetchall():
                vehicles.append({
                    'registration': row[0],
                    'make': row[1],
                    'model': row[2],
                    'year': row[3],
                    'color': row[4],
                    'fuel_type': row[5],
                    'mot_expiry': row[6],
                    'tax_due': row[7],
                    'mileage': row[8],
                    'created_at': row[9]
                })

            # Get jobs
            cursor.execute('''
                SELECT job_number, description, status, labour_cost, parts_cost,
                       total_amount, created_date, completed_date, notes
                FROM jobs WHERE customer_id = ?
            ''', (customer_id,))

            jobs = []
            for row in cursor.fetchall():
                jobs.append({
                    'job_number': row[0],
                    'description': row[1],
                    'status': row[2],
                    'labour_cost': row[3],
                    'parts_cost': row[4],
                    'total_amount': row[5],
                    'created_date': row[6],
                    'completed_date': row[7],
                    'notes': row[8]
                })

            # Get invoices
            cursor.execute('''
                SELECT invoice_number, amount, vat_amount, total_amount,
                       status, created_date, due_date, paid_date, payment_method, notes
                FROM invoices WHERE customer_id = ?
            ''', (customer_id,))

            invoices = []
            for row in cursor.fetchall():
                invoices.append({
                    'invoice_number': row[0],
                    'amount': row[1],
                    'vat_amount': row[2],
                    'total_amount': row[3],
                    'status': row[4],
                    'created_date': row[5],
                    'due_date': row[6],
                    'paid_date': row[7],
                    'payment_method': row[8],
                    'notes': row[9]
                })

            # Get consent records
            consents = self.get_customer_consents(customer_id)

            # Get data access log
            cursor.execute('''
                SELECT accessed_by, access_type, data_accessed, purpose, access_date
                FROM data_access_log WHERE customer_id = ?
                ORDER BY access_date DESC
            ''', (customer_id,))

            access_log = []
            for row in cursor.fetchall():
                access_log.append({
                    'accessed_by': row[0],
                    'access_type': row[1],
                    'data_accessed': row[2],
                    'purpose': row[3],
                    'access_date': row[4]
                })

            conn.close()

            # Log this data export
            self.log_data_access(
                customer_id, 'SYSTEM', 'EXPORT',
                'Full customer data export', 'Data portability request'
            )

            export_data = {
                'export_date': datetime.now().isoformat(),
                'customer': customer_data,
                'vehicles': vehicles,
                'jobs': jobs,
                'invoices': invoices,
                'consents': consents,
                'access_log': access_log
            }

            return {
                'success': True,
                'data': export_data,
                'format': 'JSON',
                'customer_id': customer_id
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def delete_customer_data(self, customer_id: int, deletion_reason: str = 'Customer request') -> Dict:
        """Delete customer data (right to erasure)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Check if customer exists
            cursor.execute(
                'SELECT name FROM customers WHERE id = ?', (customer_id,))
            customer = cursor.fetchone()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}

            # Log the deletion request
            self.log_data_access(
                customer_id, 'SYSTEM', 'DELETE',
                'Customer data deletion', deletion_reason
            )

            # Delete in order to respect foreign key constraints
            tables_to_delete = [
                'consent_records',
                'data_access_log',
                'invoices',
                'jobs',
                'vehicles',
                'customers'
            ]

            deleted_records = {}

            for table in tables_to_delete:
                cursor.execute(
                    f'SELECT COUNT(*) FROM {table} WHERE customer_id = ?', (customer_id,))
                count = cursor.fetchone()[0]

                if count > 0:
                    cursor.execute(
                        f'DELETE FROM {table} WHERE customer_id = ?', (customer_id,))
                    deleted_records[table] = count

            conn.commit()
            conn.close()

            return {
                'success': True,
                'customer_name': customer[0],
                'deleted_records': deleted_records,
                'deletion_date': datetime.now().isoformat(),
                'reason': deletion_reason
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
