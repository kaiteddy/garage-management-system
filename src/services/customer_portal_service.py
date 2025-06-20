#!/usr/bin/env python3
"""
Customer Self-Service Portal Service
Customer portal for work approval, communication, and online booking
"""

import hashlib
import json
import os
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional


@dataclass
class CustomerSession:
    """Customer session structure"""
    customer_id: int
    session_token: str
    expires_at: datetime
    ip_address: str


@dataclass
class WorkApproval:
    """Work approval structure"""
    job_id: int
    customer_id: int
    work_description: str
    estimated_cost: float
    approval_status: str
    approval_date: datetime = None


class CustomerPortalService:
    """Service for customer self-service portal"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_portal_tables()

    def _ensure_portal_tables(self):
        """Create customer portal tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Customer portal sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customer_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    session_token VARCHAR(64) UNIQUE NOT NULL,
                    expires_at DATETIME NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            # Work approvals table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS work_approvals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    customer_id INTEGER NOT NULL,
                    work_description TEXT,
                    estimated_cost REAL,
                    approval_status VARCHAR(20) DEFAULT 'PENDING',
                    approval_date DATETIME,
                    approval_notes TEXT,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (job_id) REFERENCES jobs (id),
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            # Customer communications table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customer_communications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    job_id INTEGER,
                    communication_type VARCHAR(20) NOT NULL,
                    subject VARCHAR(200),
                    message TEXT,
                    sender VARCHAR(20) DEFAULT 'GARAGE',
                    read_status BOOLEAN DEFAULT 0,
                    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id),
                    FOREIGN KEY (job_id) REFERENCES jobs (id)
                )
            ''')

            # Online booking requests table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS online_booking_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    customer_name VARCHAR(100),
                    customer_email VARCHAR(100),
                    customer_phone VARCHAR(20),
                    vehicle_registration VARCHAR(10),
                    vehicle_make VARCHAR(50),
                    vehicle_model VARCHAR(50),
                    service_type VARCHAR(100),
                    preferred_date DATE,
                    preferred_time TIME,
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_date DATETIME,
                    appointment_id INTEGER,
                    FOREIGN KEY (customer_id) REFERENCES customers (id),
                    FOREIGN KEY (appointment_id) REFERENCES appointments (id)
                )
            ''')

            # Customer portal preferences table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customer_portal_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER UNIQUE NOT NULL,
                    email_notifications BOOLEAN DEFAULT 1,
                    sms_notifications BOOLEAN DEFAULT 1,
                    work_approval_notifications BOOLEAN DEFAULT 1,
                    appointment_reminders BOOLEAN DEFAULT 1,
                    marketing_communications BOOLEAN DEFAULT 0,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            conn.commit()
            conn.close()

        except Exception as e:
            print(f"Error creating portal tables: {str(e)}")

    def create_customer_session(self, customer_email: str, ip_address: str = None,
                                user_agent: str = None) -> Dict:
        """Create a customer portal session"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Find customer by email
            cursor.execute(
                'SELECT id, name FROM customers WHERE email = ?', (customer_email,))
            customer = cursor.fetchone()

            if not customer:
                return {'success': False, 'error': 'Customer not found'}

            customer_id = customer[0]
            customer_name = customer[1]

            # Generate session token
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(hours=24)  # 24-hour session

            # Clean up old sessions for this customer
            cursor.execute(
                'DELETE FROM customer_sessions WHERE customer_id = ?', (customer_id,))

            # Create new session
            cursor.execute('''
                INSERT INTO customer_sessions 
                (customer_id, session_token, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            ''', (customer_id, session_token, expires_at, ip_address, user_agent))

            conn.commit()
            conn.close()

            return {
                'success': True,
                'session_token': session_token,
                'customer_id': customer_id,
                'customer_name': customer_name,
                'expires_at': expires_at.isoformat()
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def validate_session(self, session_token: str) -> Dict:
        """Validate customer session token"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT cs.customer_id, cs.expires_at, c.name, c.email
                FROM customer_sessions cs
                JOIN customers c ON cs.customer_id = c.id
                WHERE cs.session_token = ? AND cs.expires_at > CURRENT_TIMESTAMP
            ''', (session_token,))

            session = cursor.fetchone()

            if not session:
                conn.close()
                return {'success': False, 'error': 'Invalid or expired session'}

            # Update last activity
            cursor.execute('''
                UPDATE customer_sessions 
                SET last_activity = CURRENT_TIMESTAMP 
                WHERE session_token = ?
            ''', (session_token,))

            conn.commit()
            conn.close()

            return {
                'success': True,
                'customer_id': session[0],
                'customer_name': session[2],
                'customer_email': session[3]
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_customer_jobs(self, customer_id: int, status: str = None) -> List[Dict]:
        """Get jobs for a customer with optional status filtering"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT j.id, j.job_number, j.description, j.status, j.labour_cost,
                       j.parts_cost, j.total_amount, j.created_date, j.completed_date,
                       v.registration, v.make, v.model
                FROM jobs j
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                WHERE j.customer_id = ?
            '''
            params = [customer_id]

            if status:
                query += ' AND j.status = ?'
                params.append(status)

            query += ' ORDER BY j.created_date DESC'

            cursor.execute(query, params)

            jobs = []
            for row in cursor.fetchall():
                jobs.append({
                    'id': row[0],
                    'job_number': row[1],
                    'description': row[2],
                    'status': row[3],
                    'labour_cost': row[4],
                    'parts_cost': row[5],
                    'total_amount': row[6],
                    'created_date': row[7],
                    'completed_date': row[8],
                    'vehicle': {
                        'registration': row[9],
                        'make': row[10],
                        'model': row[11]
                    }
                })

            conn.close()
            return jobs

        except Exception as e:
            print(f"Error getting customer jobs: {str(e)}")
            return []

    def get_pending_approvals(self, customer_id: int) -> List[Dict]:
        """Get pending work approvals for a customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT wa.id, wa.job_id, wa.work_description, wa.estimated_cost,
                       wa.created_date, j.job_number, j.description as job_description,
                       v.registration, v.make, v.model
                FROM work_approvals wa
                JOIN jobs j ON wa.job_id = j.id
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                WHERE wa.customer_id = ? AND wa.approval_status = 'PENDING'
                ORDER BY wa.created_date DESC
            ''', (customer_id,))

            approvals = []
            for row in cursor.fetchall():
                approvals.append({
                    'id': row[0],
                    'job_id': row[1],
                    'work_description': row[2],
                    'estimated_cost': row[3],
                    'created_date': row[4],
                    'job_number': row[5],
                    'job_description': row[6],
                    'vehicle': {
                        'registration': row[7],
                        'make': row[8],
                        'model': row[9]
                    }
                })

            conn.close()
            return approvals

        except Exception as e:
            print(f"Error getting pending approvals: {str(e)}")
            return []

    def approve_work(self, approval_id: int, customer_id: int, approved: bool,
                     notes: str = None) -> Dict:
        """Approve or reject work"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Verify approval belongs to customer
            cursor.execute('''
                SELECT job_id FROM work_approvals 
                WHERE id = ? AND customer_id = ? AND approval_status = 'PENDING'
            ''', (approval_id, customer_id))

            approval = cursor.fetchone()
            if not approval:
                conn.close()
                return {'success': False, 'error': 'Approval not found or already processed'}

            job_id = approval[0]
            status = 'APPROVED' if approved else 'REJECTED'

            # Update approval
            cursor.execute('''
                UPDATE work_approvals 
                SET approval_status = ?, approval_date = CURRENT_TIMESTAMP,
                    approval_notes = ?, updated_date = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (status, notes, approval_id))

            # Update job status if approved
            if approved:
                cursor.execute('''
                    UPDATE jobs SET status = 'APPROVED' WHERE id = ?
                ''', (job_id,))

            conn.commit()
            conn.close()

            return {
                'success': True,
                'message': f'Work {"approved" if approved else "rejected"} successfully'
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def create_online_booking(self, booking_data: Dict) -> Dict:
        """Create an online booking request"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Check if customer exists by email
            customer_id = None
            if booking_data.get('customer_email'):
                cursor.execute(
                    'SELECT id FROM customers WHERE email = ?', (booking_data['customer_email'],))
                customer = cursor.fetchone()
                customer_id = customer[0] if customer else None

            cursor.execute('''
                INSERT INTO online_booking_requests
                (customer_id, customer_name, customer_email, customer_phone,
                 vehicle_registration, vehicle_make, vehicle_model, service_type,
                 preferred_date, preferred_time, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                customer_id,
                booking_data.get('customer_name'),
                booking_data.get('customer_email'),
                booking_data.get('customer_phone'),
                booking_data.get('vehicle_registration'),
                booking_data.get('vehicle_make'),
                booking_data.get('vehicle_model'),
                booking_data.get('service_type'),
                booking_data.get('preferred_date'),
                booking_data.get('preferred_time'),
                booking_data.get('description')
            ))

            booking_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return {
                'success': True,
                'booking_id': booking_id,
                'message': 'Booking request submitted successfully'
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_customer_communications(self, customer_id: int, unread_only: bool = False) -> List[Dict]:
        """Get communications for a customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT cc.id, cc.job_id, cc.communication_type, cc.subject,
                       cc.message, cc.sender, cc.read_status, cc.sent_date,
                       j.job_number
                FROM customer_communications cc
                LEFT JOIN jobs j ON cc.job_id = j.id
                WHERE cc.customer_id = ?
            '''
            params = [customer_id]

            if unread_only:
                query += ' AND cc.read_status = 0'

            query += ' ORDER BY cc.sent_date DESC'

            cursor.execute(query, params)

            communications = []
            for row in cursor.fetchall():
                communications.append({
                    'id': row[0],
                    'job_id': row[1],
                    'communication_type': row[2],
                    'subject': row[3],
                    'message': row[4],
                    'sender': row[5],
                    'read_status': bool(row[6]),
                    'sent_date': row[7],
                    'job_number': row[8]
                })

            conn.close()
            return communications

        except Exception as e:
            print(f"Error getting customer communications: {str(e)}")
            return []
