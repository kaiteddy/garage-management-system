#!/usr/bin/env python3
"""
MOT Reminder Service for Garage Management System
Integrates DVSA API and SMS functionality into the main application
"""

import os
import sys
import json
import requests
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import phonenumbers
from phonenumbers import NumberParseException

# Add the mot_reminder directory to the path to import existing modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'mot_reminder'))

try:
    from mot_reminder import MOTReminder
    from sms_service import SMSService
except ImportError:
    print("Warning: MOT reminder modules not found. Some functionality may be limited.")
    MOTReminder = None
    SMSService = None

app = Flask(__name__)
CORS(app)

class IntegratedMOTService:
    def __init__(self):
        """Initialize the integrated MOT service"""
        self.db_path = os.path.join(os.path.dirname(__file__), 'garage_management.db')
        self.init_database()
        
        # Initialize MOT reminder and SMS services
        if MOTReminder:
            self.mot_reminder = MOTReminder()
        else:
            self.mot_reminder = None
            
        if SMSService:
            self.sms_service = SMSService()
        else:
            self.sms_service = None
    
    def init_database(self):
        """Initialize database tables for MOT tracking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create customers table for MOT service (independent from main garage system)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                mobile TEXT,
                email TEXT,
                address TEXT,
                postcode TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create vehicles table for MOT service (independent from main garage system)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration TEXT UNIQUE NOT NULL,
                customer_id INTEGER,
                make TEXT,
                model TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')

        # Create MOT vehicles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS mot_vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration TEXT UNIQUE NOT NULL,
                make TEXT,
                model TEXT,
                customer_id INTEGER,
                customer_name TEXT,
                mobile_number TEXT,
                mot_expiry_date TEXT,
                days_until_expiry INTEGER,
                is_expired BOOLEAN,
                last_test_date TEXT,
                test_result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        
        # Create MOT reminders log table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS mot_reminders_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_registration TEXT,
                customer_name TEXT,
                mobile_number TEXT,
                message_type TEXT,
                message_content TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT,
                message_sid TEXT,
                days_until_expiry INTEGER,
                mot_expiry_date TEXT,
                delivery_status TEXT,
                delivery_error_code TEXT,
                delivery_error_message TEXT,
                delivery_updated_at TIMESTAMP
            )
        ''')

        # Add delivery status columns to existing table if they don't exist
        try:
            cursor.execute('ALTER TABLE mot_reminders_log ADD COLUMN delivery_status TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_reminders_log ADD COLUMN delivery_error_code TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_reminders_log ADD COLUMN delivery_error_message TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_reminders_log ADD COLUMN delivery_updated_at TIMESTAMP')
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Create vehicle flags table for manual overrides
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicle_flags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration TEXT UNIQUE,
                flag_type TEXT,
                flag_reason TEXT,
                manual_override BOOLEAN DEFAULT FALSE,
                override_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create failed registrations table for manual review
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS failed_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_registration TEXT NOT NULL,
                customer_name TEXT,
                mobile_number TEXT,
                error_message TEXT,
                upload_batch_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed BOOLEAN DEFAULT FALSE,
                corrected_registration TEXT,
                status TEXT DEFAULT 'pending'
            )
        ''')

        # Add archive columns if they don't exist (for existing databases)
        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN is_archived BOOLEAN DEFAULT FALSE')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN archived_at TIMESTAMP')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN archive_reason TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Add upload tracking columns
        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN uploaded_at TIMESTAMP')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN upload_batch_id TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN sms_sent_at TIMESTAMP')
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Add customer integration columns
        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN main_customer_id INTEGER')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_vehicles ADD COLUMN main_vehicle_id INTEGER')
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Add missing columns to SMS history table if they don't exist
        try:
            cursor.execute('ALTER TABLE mot_reminders_log ADD COLUMN days_until_expiry INTEGER')
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute('ALTER TABLE mot_reminders_log ADD COLUMN mot_expiry_date TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        conn.commit()
        conn.close()

    def classify_vehicle_status(self, vehicle):
        """
        Classify vehicle based on MOT status and days until expiry

        Args:
            vehicle (dict): Vehicle data

        Returns:
            dict: Classification with status, flag info, and send recommendation
        """
        days_until_expiry = vehicle.get('days_until_expiry', 0)
        is_expired = vehicle.get('is_expired', False)
        registration = vehicle.get('registration', '')

        # Check for long-term MOT (potentially SORN/written off)
        if days_until_expiry > 365:
            return {
                'status': 'long_term',
                'flag_type': 'LONG_TERM_MOT',
                'flag_reason': f'MOT expires in {days_until_expiry} days (potentially SORN/written off)',
                'send_by_default': False,
                'priority': 4,
                'visual_indicator': '🔒',
                'status_text': f'{days_until_expiry} days (Flagged)'
            }

        # Check for expired MOT
        if is_expired:
            return {
                'status': 'expired',
                'flag_type': None,
                'flag_reason': None,
                'send_by_default': True,
                'priority': 1,
                'visual_indicator': '🚨',
                'status_text': 'EXPIRED'
            }

        # Check for critical (≤7 days)
        if days_until_expiry <= 7:
            return {
                'status': 'critical',
                'flag_type': None,
                'flag_reason': None,
                'send_by_default': True,
                'priority': 2,
                'visual_indicator': '⚠️',
                'status_text': f'{days_until_expiry} days left'
            }

        # Check for due soon (8-30 days)
        if days_until_expiry <= 30:
            return {
                'status': 'due_soon',
                'flag_type': None,
                'flag_reason': None,
                'send_by_default': True,
                'priority': 3,
                'visual_indicator': '📅',
                'status_text': f'{days_until_expiry} days left'
            }

        # Normal vehicles (31-365 days)
        return {
            'status': 'normal',
            'flag_type': None,
            'flag_reason': None,
            'send_by_default': True,
            'priority': 3,
            'visual_indicator': '✅',
            'status_text': f'{days_until_expiry} days left'
        }

    def check_recent_sms_sent(self, registration, days_threshold=7):
        """
        Check if SMS was sent recently to avoid duplicates

        Args:
            registration (str): Vehicle registration
            days_threshold (int): Days to check back for recent SMS

        Returns:
            dict: Recent SMS info or None
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT sent_at, message_type, status
            FROM mot_reminders_log
            WHERE vehicle_registration = ?
            AND status = 'sent'
            AND datetime(sent_at) > datetime('now', '-{} days')
            ORDER BY sent_at DESC
            LIMIT 1
        '''.format(days_threshold), (registration,))

        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                'has_recent_sms': True,
                'last_sent': result[0],
                'message_type': result[1],
                'status': result[2]
            }

        return {'has_recent_sms': False}

    def get_customer_by_registration(self, registration):
        """Get customer information by vehicle registration"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Try to find customer by vehicle registration in the main vehicles table
        cursor.execute('''
            SELECT c.id, c.name, c.mobile, c.email, c.address, c.postcode
            FROM customers c
            JOIN vehicles v ON c.id = v.customer_id
            WHERE v.registration = ?
        ''', (registration,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'id': result[0],
                'name': result[1],
                'mobile': result[2],
                'email': result[3],
                'address': result[4],
                'postcode': result[5]
            }
        return None
    
    def add_mot_vehicle(self, registration, customer_name=None, mobile_number=None, upload_batch_id=None):
        """Add a vehicle to MOT monitoring"""
        try:
            # Check DVSA API for MOT data - only use real DVLA data
            if self.mot_reminder:
                mot_data = self.mot_reminder.check_mot_status(registration)
                if not mot_data:
                    # Add to failed registrations for manual review
                    self.add_failed_registration(
                        original_registration=registration,
                        customer_name=customer_name,
                        mobile_number=mobile_number,
                        error_message='Could not retrieve MOT data from DVLA. Registration may be invalid or not found.',
                        upload_batch_id=upload_batch_id
                    )
                    return {'success': False, 'error': 'Could not retrieve MOT data from DVLA. Registration added to manual review queue.'}
            else:
                return {'success': False, 'error': 'DVLA API service not available. Cannot add vehicle without real MOT data.'}
            
            # Try to get customer info from existing database
            existing_customer = self.get_customer_by_registration(registration)
            if existing_customer and not customer_name:
                customer_name = existing_customer['name']
                mobile_number = existing_customer['mobile']

            # Try to link with main garage database
            main_customer_id = None
            main_vehicle_id = None

            customer_link = self.link_mot_vehicle_to_customer(registration, customer_name, mobile_number)
            if customer_link:
                main_customer_id = customer_link['customer_id']
                main_vehicle_id = customer_link.get('vehicle_id')

                # Update customer info from main database if available
                if not customer_name and customer_link.get('customer_name'):
                    customer_name = customer_link['customer_name']
                if not mobile_number and customer_link.get('customer_phone'):
                    mobile_number = customer_link['customer_phone']

            # Save to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            current_time = datetime.now().isoformat()
            cursor.execute('''
                INSERT OR REPLACE INTO mot_vehicles
                (registration, make, model, customer_name, mobile_number,
                 mot_expiry_date, days_until_expiry, is_expired,
                 last_test_date, test_result, updated_at, uploaded_at, upload_batch_id,
                 main_customer_id, main_vehicle_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                registration,
                mot_data.get('make', 'Unknown'),
                mot_data.get('model', 'Unknown'),
                customer_name or '',
                mobile_number or '',
                mot_data.get('mot_expiry_date', ''),
                mot_data.get('days_until_expiry', 0),
                mot_data.get('is_expired', False),
                mot_data.get('last_test_date', ''),
                mot_data.get('test_result', 'Unknown'),
                current_time,
                current_time,  # uploaded_at
                upload_batch_id or f"manual_{int(datetime.now().timestamp() * 1000)}",
                main_customer_id,
                main_vehicle_id
            ))

            # If no existing customer found, create one in main database if we have enough info
            if not customer_link and customer_name and mobile_number:
                new_customer = self.create_customer_in_main_db(customer_name, mobile_number)
                if new_customer:
                    main_customer_id = new_customer['customer_id']

                    # Create vehicle record in main database
                    main_vehicle_id = self.create_vehicle_in_main_db(
                        registration,
                        mot_data.get('make', 'Unknown'),
                        mot_data.get('model', 'Unknown'),
                        main_customer_id,
                        mot_data.get('mot_expiry_date')
                    )

                    # Update MOT vehicle record with main database IDs
                    cursor.execute('''
                        UPDATE mot_vehicles
                        SET main_customer_id = ?, main_vehicle_id = ?
                        WHERE registration = ?
                    ''', (main_customer_id, main_vehicle_id, registration))

            # Log MOT reminder creation to customer history
            if main_customer_id and main_vehicle_id:
                self.log_mot_activity_to_customer_history(
                    main_customer_id,
                    main_vehicle_id,
                    'MOT_REMINDER_CREATED',
                    f'MOT reminder created for {registration}. Expires: {mot_data.get("mot_expiry_date", "Unknown")}',
                    registration
                )
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'data': mot_data}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def add_failed_registration(self, original_registration, customer_name=None, mobile_number=None, error_message=None, upload_batch_id=None):
        """Add a failed registration for manual review"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO failed_registrations
                (original_registration, customer_name, mobile_number, error_message, upload_batch_id)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                original_registration,
                customer_name or '',
                mobile_number or '',
                error_message or 'Registration not found in DVLA database',
                upload_batch_id or ''
            ))

            conn.commit()
            conn.close()

            return {'success': True}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_failed_registrations(self, status='pending'):
        """Get failed registrations for manual review"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if status == 'all':
            cursor.execute('''
                SELECT id, original_registration, customer_name, mobile_number,
                       error_message, upload_batch_id, created_at, reviewed,
                       corrected_registration, status
                FROM failed_registrations
                ORDER BY created_at DESC
            ''')
        else:
            cursor.execute('''
                SELECT id, original_registration, customer_name, mobile_number,
                       error_message, upload_batch_id, created_at, reviewed,
                       corrected_registration, status
                FROM failed_registrations
                WHERE status = ?
                ORDER BY created_at DESC
            ''', (status,))

        failed_regs = []
        for row in cursor.fetchall():
            failed_regs.append({
                'id': row[0],
                'original_registration': row[1],
                'customer_name': row[2],
                'mobile_number': row[3],
                'error_message': row[4],
                'upload_batch_id': row[5],
                'created_at': row[6],
                'reviewed': bool(row[7]),
                'corrected_registration': row[8],
                'status': row[9]
            })

        conn.close()
        return failed_regs

    def update_failed_registration(self, failed_id, corrected_registration, action='retry'):
        """Update a failed registration with corrected data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if action == 'retry':
                # Try to add the corrected registration
                result = self.add_mot_vehicle(corrected_registration)

                if result['success']:
                    # Mark as resolved
                    cursor.execute('''
                        UPDATE failed_registrations
                        SET corrected_registration = ?, reviewed = TRUE, status = 'resolved'
                        WHERE id = ?
                    ''', (corrected_registration, failed_id))

                    conn.commit()
                    conn.close()

                    return {'success': True, 'message': 'Registration corrected and added successfully', 'data': result['data']}
                else:
                    # Update with new error
                    cursor.execute('''
                        UPDATE failed_registrations
                        SET corrected_registration = ?, reviewed = TRUE, status = 'failed_retry',
                            error_message = ?
                        WHERE id = ?
                    ''', (corrected_registration, result['error'], failed_id))

                    conn.commit()
                    conn.close()

                    return {'success': False, 'error': result['error']}

            elif action == 'dismiss':
                # Mark as dismissed
                cursor.execute('''
                    UPDATE failed_registrations
                    SET reviewed = TRUE, status = 'dismissed'
                    WHERE id = ?
                ''', (failed_id,))

                conn.commit()
                conn.close()

                return {'success': True, 'message': 'Registration dismissed'}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_all_mot_vehicles(self, include_flagged=True, include_archived=False):
        """
        Get all vehicles in MOT monitoring with smart filtering

        Args:
            include_flagged (bool): Whether to include flagged vehicles
            include_archived (bool): Whether to include archived vehicles

        Returns:
            list: Vehicles with classification and filtering info
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Build query based on archive filter
        if include_archived:
            cursor.execute('''
                SELECT registration, make, model, customer_name, mobile_number,
                       mot_expiry_date, days_until_expiry, is_expired,
                       last_test_date, test_result, updated_at,
                       COALESCE(is_archived, 0) as is_archived,
                       archived_at, archive_reason, uploaded_at, upload_batch_id, sms_sent_at,
                       main_customer_id, main_vehicle_id
                FROM mot_vehicles
                ORDER BY COALESCE(is_archived, 0) ASC, is_expired DESC, days_until_expiry ASC
            ''')
        else:
            cursor.execute('''
                SELECT registration, make, model, customer_name, mobile_number,
                       mot_expiry_date, days_until_expiry, is_expired,
                       last_test_date, test_result, updated_at,
                       COALESCE(is_archived, 0) as is_archived,
                       archived_at, archive_reason, uploaded_at, upload_batch_id, sms_sent_at,
                       main_customer_id, main_vehicle_id
                FROM mot_vehicles
                WHERE COALESCE(is_archived, 0) = 0
                ORDER BY is_expired DESC, days_until_expiry ASC
            ''')

        vehicles = []
        for row in cursor.fetchall():
            vehicle = {
                'registration': row[0],
                'make': row[1],
                'model': row[2],
                'customer_name': row[3],
                'mobile_number': row[4],
                'mot_expiry_date': row[5],
                'days_until_expiry': row[6],
                'is_expired': bool(row[7]),
                'last_test_date': row[8],
                'test_result': row[9],
                'updated_at': row[10],
                'is_archived': bool(row[11]) if len(row) > 11 else False,
                'archived_at': row[12] if len(row) > 12 else None,
                'archive_reason': row[13] if len(row) > 13 else None,
                'uploaded_at': row[14] if len(row) > 14 else None,
                'upload_batch_id': row[15] if len(row) > 15 else None,
                'sms_sent_at': row[16] if len(row) > 16 else None,
                'main_customer_id': row[17] if len(row) > 17 else None,
                'main_vehicle_id': row[18] if len(row) > 18 else None
            }

            # Add classification
            classification = self.classify_vehicle_status(vehicle)
            vehicle.update(classification)

            # Check for recent SMS
            recent_sms = self.check_recent_sms_sent(vehicle['registration'])
            vehicle['recent_sms'] = recent_sms

            # Check data quality
            has_mobile = bool(vehicle.get('mobile_number', '').strip())
            has_complete_data = all([
                vehicle.get('registration'),
                vehicle.get('make'),
                vehicle.get('model'),
                vehicle.get('mot_expiry_date')
            ])

            vehicle['has_mobile'] = has_mobile
            vehicle['has_complete_data'] = has_complete_data
            vehicle['can_send_sms'] = has_mobile and has_complete_data

            # Determine if should be included based on filtering
            if not include_flagged and vehicle.get('flag_type'):
                continue

            vehicles.append(vehicle)

        conn.close()
        return vehicles

    def archive_vehicle(self, registration, reason='Manual archive'):
        """Archive a vehicle from active MOT monitoring"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE mot_vehicles
                SET is_archived = TRUE,
                    archived_at = ?,
                    archive_reason = ?
                WHERE registration = ?
            ''', (datetime.now().isoformat(), reason, registration))

            if cursor.rowcount == 0:
                conn.close()
                return {'success': False, 'error': 'Vehicle not found'}

            conn.commit()
            conn.close()

            return {'success': True, 'message': f'Vehicle {registration} archived successfully'}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def unarchive_vehicle(self, registration):
        """Unarchive a vehicle to return it to active MOT monitoring"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE mot_vehicles
                SET is_archived = FALSE,
                    archived_at = NULL,
                    archive_reason = NULL
                WHERE registration = ?
            ''', (registration,))

            if cursor.rowcount == 0:
                conn.close()
                return {'success': False, 'error': 'Vehicle not found'}

            conn.commit()
            conn.close()

            return {'success': True, 'message': f'Vehicle {registration} unarchived successfully'}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def archive_multiple_vehicles(self, registrations, reason='Bulk archive'):
        """Archive multiple vehicles at once"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            archived_count = 0
            for registration in registrations:
                cursor.execute('''
                    UPDATE mot_vehicles
                    SET is_archived = TRUE,
                        archived_at = ?,
                        archive_reason = ?
                    WHERE registration = ? AND COALESCE(is_archived, 0) = 0
                ''', (datetime.now().isoformat(), reason, registration))

                if cursor.rowcount > 0:
                    archived_count += 1

            conn.commit()
            conn.close()

            return {
                'success': True,
                'message': f'{archived_count} vehicles archived successfully',
                'archived_count': archived_count
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_mot_reminder_sms(self, registrations):
        """Send MOT reminder SMS to selected vehicles"""
        if not self.sms_service:
            return {'success': False, 'error': 'SMS service not available'}
        
        results = []
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for registration in registrations:
            cursor.execute('''
                SELECT registration, make, model, customer_name, mobile_number,
                       mot_expiry_date, days_until_expiry, is_expired, main_customer_id, main_vehicle_id
                FROM mot_vehicles
                WHERE registration = ?
            ''', (registration,))
            
            vehicle_data = cursor.fetchone()
            if not vehicle_data or not vehicle_data[4]:  # No mobile number
                results.append({
                    'registration': registration,
                    'success': False,
                    'error': 'No mobile number available'
                })
                continue
            
            vehicle_info = {
                'registration': vehicle_data[0],
                'make': vehicle_data[1],
                'model': vehicle_data[2],
                'mot_expiry_date': vehicle_data[5],
                'days_until_expiry': vehicle_data[6],
                'is_expired': bool(vehicle_data[7])
            }
            
            # Send SMS
            sms_result = self.sms_service.send_mot_reminder(
                vehicle_info, 
                vehicle_data[4],  # mobile_number
                vehicle_data[3]   # customer_name
            )
            
            # Log the SMS attempt with enhanced data
            cursor.execute('''
                INSERT INTO mot_reminders_log
                (vehicle_registration, customer_name, mobile_number,
                 message_type, message_content, status, message_sid,
                 days_until_expiry, mot_expiry_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                registration,
                vehicle_data[3],
                vehicle_data[4],
                sms_result.get('template_type', 'unknown'),
                'SMS reminder sent',
                'sent' if sms_result['success'] else 'failed',
                sms_result.get('message_sid', ''),
                vehicle_data[6],  # days_until_expiry
                vehicle_data[5]   # mot_expiry_date
            ))
            
            results.append({
                'registration': registration,
                'success': sms_result['success'],
                'error': sms_result.get('error'),
                'template_type': sms_result.get('template_type')
            })

            # Auto-archive vehicle after successful SMS and record SMS sent time
            if sms_result['success']:
                sms_sent_time = datetime.now().isoformat()
                cursor.execute('''
                    UPDATE mot_vehicles
                    SET is_archived = TRUE,
                        archived_at = ?,
                        archive_reason = ?,
                        sms_sent_at = ?
                    WHERE registration = ?
                ''', (sms_sent_time, 'Auto-archived after SMS sent', sms_sent_time, registration))

                # Log SMS activity to customer history if linked
                if len(vehicle_data) >= 10 and vehicle_data[8] and vehicle_data[9]:  # main_customer_id and main_vehicle_id
                    template_type = sms_result.get('template_type', 'reminder')
                    self.log_mot_activity_to_customer_history(
                        vehicle_data[8],  # main_customer_id
                        vehicle_data[9],  # main_vehicle_id
                        'MOT_SMS_SENT',
                        f'MOT reminder SMS sent ({template_type}) to {vehicle_data[4]} for {registration}',
                        registration
                    )

        conn.commit()
        conn.close()

        return {
            'success': True,
            'results': results,
            'total_sent': len([r for r in results if r['success']]),
            'total_failed': len([r for r in results if not r['success']])
        }

    def get_main_garage_db_connection(self):
        """Get connection to main garage database"""
        try:
            main_db_path = os.path.join(os.path.dirname(self.db_path), 'garage.db')
            return sqlite3.connect(main_db_path)
        except Exception as e:
            print(f"Error connecting to main garage database: {e}")
            return None

    def link_mot_vehicle_to_customer(self, registration, customer_name=None, mobile_number=None):
        """Link MOT vehicle to existing customer in main garage database"""
        try:
            main_conn = self.get_main_garage_db_connection()
            if not main_conn:
                return None

            main_cursor = main_conn.cursor()

            # First, try to find customer by vehicle registration
            main_cursor.execute('''
                SELECT c.id, c.name, c.phone, c.email, v.id as vehicle_id
                FROM customers c
                JOIN vehicles v ON c.id = v.customer_id
                WHERE v.registration = ?
            ''', (registration,))

            result = main_cursor.fetchone()
            if result:
                main_conn.close()
                return {
                    'customer_id': result[0],
                    'customer_name': result[1],
                    'customer_phone': result[2],
                    'customer_email': result[3],
                    'vehicle_id': result[4]
                }

            # If not found by registration, try to find by customer name and phone
            if customer_name or mobile_number:
                query_parts = []
                params = []

                if customer_name:
                    query_parts.append("c.name LIKE ?")
                    params.append(f"%{customer_name}%")

                if mobile_number:
                    # Clean mobile number for comparison
                    clean_mobile = ''.join(filter(str.isdigit, mobile_number))
                    if len(clean_mobile) >= 10:
                        query_parts.append("REPLACE(REPLACE(c.phone, ' ', ''), '-', '') LIKE ?")
                        params.append(f"%{clean_mobile[-10:]}%")

                if query_parts:
                    main_cursor.execute(f'''
                        SELECT c.id, c.name, c.phone, c.email
                        FROM customers c
                        WHERE {' OR '.join(query_parts)}
                        LIMIT 1
                    ''', params)

                    result = main_cursor.fetchone()
                    if result:
                        main_conn.close()
                        return {
                            'customer_id': result[0],
                            'customer_name': result[1],
                            'customer_phone': result[2],
                            'customer_email': result[3],
                            'vehicle_id': None
                        }

            main_conn.close()
            return None

        except Exception as e:
            print(f"Error linking MOT vehicle to customer: {e}")
            return None

    def create_customer_in_main_db(self, customer_name, mobile_number, email=None):
        """Create new customer in main garage database"""
        try:
            main_conn = self.get_main_garage_db_connection()
            if not main_conn:
                return None

            main_cursor = main_conn.cursor()

            # Generate account number
            main_cursor.execute("SELECT COUNT(*) FROM customers")
            count = main_cursor.fetchone()[0]
            account_number = f"CUST{count + 1:04d}"

            # Insert new customer
            main_cursor.execute('''
                INSERT INTO customers (account_number, name, phone, email, created_date)
                VALUES (?, ?, ?, ?, ?)
            ''', (account_number, customer_name, mobile_number, email, datetime.now().isoformat()))

            customer_id = main_cursor.lastrowid
            main_conn.commit()
            main_conn.close()

            return {
                'customer_id': customer_id,
                'account_number': account_number,
                'customer_name': customer_name,
                'customer_phone': mobile_number,
                'customer_email': email
            }

        except Exception as e:
            print(f"Error creating customer in main database: {e}")
            return None

    def create_vehicle_in_main_db(self, registration, make, model, customer_id, mot_expiry_date=None):
        """Create vehicle record in main garage database"""
        try:
            main_conn = self.get_main_garage_db_connection()
            if not main_conn:
                return None

            main_cursor = main_conn.cursor()

            # Insert new vehicle
            main_cursor.execute('''
                INSERT INTO vehicles (registration, make, model, customer_id, mot_due)
                VALUES (?, ?, ?, ?, ?)
            ''', (registration, make, model, customer_id, mot_expiry_date))

            vehicle_id = main_cursor.lastrowid
            main_conn.commit()
            main_conn.close()

            return vehicle_id

        except Exception as e:
            print(f"Error creating vehicle in main database: {e}")
            return None

    def log_mot_activity_to_customer_history(self, customer_id, vehicle_id, activity_type, description, registration):
        """Log MOT activity to customer service history in main database"""
        try:
            main_conn = self.get_main_garage_db_connection()
            if not main_conn:
                return False

            main_cursor = main_conn.cursor()

            # Create a service history entry for MOT activity
            # We'll use the jobs table to track MOT activities as service entries
            job_number = f"MOT-{registration}-{int(datetime.now().timestamp())}"

            main_cursor.execute('''
                INSERT INTO jobs (job_number, vehicle_id, customer_id, description, status, total_amount, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (job_number, vehicle_id, customer_id, description, activity_type, 0.0, datetime.now().isoformat()))

            main_conn.commit()
            main_conn.close()
            return True

        except Exception as e:
            print(f"Error logging MOT activity to customer history: {e}")
            return False

# Initialize the service
mot_service = IntegratedMOTService()

# API Routes
@app.route('/api/mot/vehicles', methods=['GET'])
def get_mot_vehicles():
    """Get all MOT vehicles with smart filtering"""
    include_flagged = request.args.get('include_flagged', 'true').lower() == 'true'
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    vehicles = mot_service.get_all_mot_vehicles(include_flagged=include_flagged, include_archived=include_archived)

    # Group vehicles by status for easier frontend handling
    grouped = {
        'expired': [],
        'critical': [],
        'due_soon': [],
        'normal': [],
        'long_term': []
    }

    for vehicle in vehicles:
        status = vehicle.get('status', 'normal')
        grouped[status].append(vehicle)

    return jsonify({
        'success': True,
        'vehicles': vehicles,
        'grouped': grouped,
        'total_count': len(vehicles),
        'sendable_count': len([v for v in vehicles if v.get('can_send_sms') and v.get('send_by_default')])
    })

@app.route('/api/mot/vehicles', methods=['POST'])
def add_mot_vehicle():
    """Add a vehicle to MOT monitoring"""
    data = request.get_json()
    registration = data.get('registration', '').strip().upper()
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    
    if not registration:
        return jsonify({'success': False, 'error': 'Registration required'})
    
    result = mot_service.add_mot_vehicle(registration, customer_name, mobile_number)
    return jsonify(result)

@app.route('/api/mot/sms/send', methods=['POST'])
def send_mot_sms():
    """Send MOT reminder SMS to manually selected vehicles"""
    data = request.get_json()
    registrations = data.get('registrations', [])
    force_send = data.get('force_send', False)  # Override recent SMS check

    if not registrations:
        return jsonify({'success': False, 'error': 'No vehicles specified'})

    # Enhanced validation and duplicate checking
    vehicles = mot_service.get_all_mot_vehicles()
    vehicle_map = {v['registration']: v for v in vehicles}

    send_results = {
        'success': True,
        'total_requested': len(registrations),
        'sent': 0,
        'failed': 0,
        'skipped': 0,
        'results': [],
        'summary': []
    }

    for registration in registrations:
        vehicle = vehicle_map.get(registration)
        if not vehicle:
            send_results['results'].append({
                'registration': registration,
                'success': False,
                'reason': 'Vehicle not found',
                'skipped': True
            })
            send_results['skipped'] += 1
            continue

        # Check if can send SMS
        if not vehicle.get('can_send_sms'):
            reason = 'Missing mobile number' if not vehicle.get('has_mobile') else 'Incomplete vehicle data'
            send_results['results'].append({
                'registration': registration,
                'success': False,
                'reason': reason,
                'skipped': True
            })
            send_results['skipped'] += 1
            continue

        # Check for recent SMS unless forced
        if not force_send and vehicle.get('recent_sms', {}).get('has_recent_sms'):
            send_results['results'].append({
                'registration': registration,
                'success': False,
                'reason': f"SMS sent recently on {vehicle['recent_sms']['last_sent']}",
                'skipped': True
            })
            send_results['skipped'] += 1
            continue

        # Send SMS
        sms_result = mot_service.send_mot_reminder_sms([registration])
        if sms_result['success'] and sms_result['results']:
            vehicle_result = sms_result['results'][0]
            if vehicle_result['success']:
                send_results['sent'] += 1
            else:
                send_results['failed'] += 1
            send_results['results'].append(vehicle_result)
        else:
            send_results['failed'] += 1
            send_results['results'].append({
                'registration': registration,
                'success': False,
                'reason': sms_result.get('error', 'Unknown error')
            })

    # Create summary
    if send_results['sent'] > 0:
        send_results['summary'].append(f"{send_results['sent']} SMS sent successfully")
    if send_results['failed'] > 0:
        send_results['summary'].append(f"{send_results['failed']} SMS failed")
    if send_results['skipped'] > 0:
        send_results['summary'].append(f"{send_results['skipped']} vehicles skipped")

    return jsonify(send_results)

@app.route('/api/mot/statistics', methods=['GET'])
def get_mot_statistics():
    """Get MOT statistics"""
    vehicles = mot_service.get_all_mot_vehicles()

    stats = {
        'total': len(vehicles),
        'expired': len([v for v in vehicles if v['is_expired']]),
        'critical': len([v for v in vehicles if not v['is_expired'] and v['days_until_expiry'] <= 7]),
        'due_soon': len([v for v in vehicles if not v['is_expired'] and 8 <= v['days_until_expiry'] <= 30]),
        'valid': len([v for v in vehicles if not v['is_expired'] and v['days_until_expiry'] > 30])
    }

    return jsonify({'success': True, 'statistics': stats})

@app.route('/api/mot/failed-registrations', methods=['GET'])
def get_failed_registrations():
    """Get failed registrations for manual review"""
    status = request.args.get('status', 'pending')
    failed_regs = mot_service.get_failed_registrations(status)
    return jsonify({'success': True, 'failed_registrations': failed_regs})

@app.route('/api/mot/sms/delivery-status', methods=['POST'])
def sms_delivery_status():
    """Handle SMS delivery status callbacks from Twilio"""
    try:
        # Get delivery status data from Twilio
        message_sid = request.form.get('MessageSid')
        message_status = request.form.get('MessageStatus')
        error_code = request.form.get('ErrorCode')
        error_message = request.form.get('ErrorMessage')

        if not message_sid:
            return jsonify({'success': False, 'error': 'Missing MessageSid'}), 400

        # Update delivery status in database
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        # Update the SMS log with delivery status
        cursor.execute('''
            UPDATE mot_reminders_log
            SET delivery_status = ?, delivery_error_code = ?, delivery_error_message = ?,
                delivery_updated_at = CURRENT_TIMESTAMP
            WHERE message_sid = ?
        ''', (message_status, error_code, error_message, message_sid))

        conn.commit()
        conn.close()

        print(f"📱 SMS Delivery Status Update:")
        print(f"   Message SID: {message_sid}")
        print(f"   Status: {message_status}")
        if error_code:
            print(f"   Error: {error_code} - {error_message}")

        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"❌ Error handling delivery status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/sms/status', methods=['GET'])
def get_sms_service_status():
    """Get SMS service configuration status"""
    try:
        if not mot_service.sms_service:
            return jsonify({
                'success': True,
                'configured': False,
                'demo_mode': True,
                'status': 'SMS service not available'
            })

        # Get status from SMS service
        status = mot_service.sms_service.get_service_status()

        return jsonify({
            'success': True,
            'configured': status['configured'],
            'demo_mode': status['demo_mode'],
            'from_number': status['from_number'],
            'account_sid': status['account_sid'],
            'status': 'Real SMS sending enabled' if status['configured'] else 'Demo mode'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'configured': False,
            'demo_mode': True,
            'status': 'Error checking SMS service'
        }), 500

@app.route('/api/mot/sms/check-delivery-status', methods=['POST'])
def check_delivery_status():
    """Manually check delivery status for recent SMS messages"""
    try:
        if not mot_service.sms_service or not mot_service.sms_service.client:
            return jsonify({'success': False, 'error': 'SMS service not configured'}), 400

        # Get recent messages without delivery status
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, message_sid, vehicle_registration, sent_at
            FROM mot_reminders_log
            WHERE message_sid IS NOT NULL
            AND message_sid != ''
            AND (delivery_status IS NULL OR delivery_status = '')
            AND sent_at > datetime('now', '-24 hours')
            ORDER BY sent_at DESC
            LIMIT 50
        ''')

        messages = cursor.fetchall()
        updated_count = 0

        for msg_id, message_sid, registration, sent_at in messages:
            try:
                # Fetch message status from Twilio
                message = mot_service.sms_service.client.messages(message_sid).fetch()

                # Update database with current status
                cursor.execute('''
                    UPDATE mot_reminders_log
                    SET delivery_status = ?, delivery_error_code = ?, delivery_error_message = ?,
                        delivery_updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (message.status, message.error_code, message.error_message, msg_id))

                updated_count += 1
                print(f"📱 Updated delivery status for {registration}: {message.status}")

            except Exception as e:
                print(f"❌ Error checking status for {registration}: {e}")
                continue

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'total_checked': len(messages)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/sms/history', methods=['GET'])
def get_sms_history():
    """Get SMS sending history"""
    registration = request.args.get('registration')
    limit = int(request.args.get('limit', 50))

    conn = sqlite3.connect(mot_service.db_path)
    cursor = conn.cursor()

    if registration:
        cursor.execute('''
            SELECT vehicle_registration, customer_name, mobile_number,
                   message_type, sent_at, status, message_sid,
                   days_until_expiry, mot_expiry_date, delivery_status,
                   delivery_error_code, delivery_error_message, delivery_updated_at
            FROM mot_reminders_log
            WHERE vehicle_registration = ?
            ORDER BY sent_at DESC
            LIMIT ?
        ''', (registration, limit))
    else:
        cursor.execute('''
            SELECT vehicle_registration, customer_name, mobile_number,
                   message_type, sent_at, status, message_sid,
                   days_until_expiry, mot_expiry_date, delivery_status,
                   delivery_error_code, delivery_error_message, delivery_updated_at
            FROM mot_reminders_log
            ORDER BY sent_at DESC
            LIMIT ?
        ''', (limit,))

    history = []
    for row in cursor.fetchall():
        history.append({
            'registration': row[0],
            'customer_name': row[1],
            'mobile_number': row[2],
            'message_type': row[3],
            'sent_at': row[4],
            'status': row[5],
            'message_sid': row[6],
            'days_until_expiry': row[7],
            'mot_expiry_date': row[8],
            'delivery_status': row[9],
            'delivery_error_code': row[10],
            'delivery_error_message': row[11],
            'delivery_updated_at': row[12]
        })

    conn.close()
    return jsonify({'success': True, 'history': history})

@app.route('/api/mot/failed-registrations/<int:failed_id>', methods=['PUT'])
def update_failed_registration(failed_id):
    """Update a failed registration"""
    data = request.get_json()
    corrected_registration = data.get('corrected_registration', '').strip().upper()
    action = data.get('action', 'retry')  # 'retry' or 'dismiss'

    if action == 'retry' and not corrected_registration:
        return jsonify({'success': False, 'error': 'Corrected registration required for retry'})

    result = mot_service.update_failed_registration(failed_id, corrected_registration, action)
    return jsonify(result)

@app.route('/api/mot/failed-registrations/bulk', methods=['POST'])
def bulk_update_failed_registrations():
    """Bulk update failed registrations"""
    data = request.get_json()
    updates = data.get('updates', [])

    results = []
    for update in updates:
        failed_id = update.get('id')
        corrected_registration = update.get('corrected_registration', '').strip().upper()
        action = update.get('action', 'retry')

        result = mot_service.update_failed_registration(failed_id, corrected_registration, action)
        results.append({
            'id': failed_id,
            'success': result['success'],
            'error': result.get('error'),
            'message': result.get('message')
        })

    return jsonify({
        'success': True,
        'results': results,
        'total_processed': len(results),
        'successful': len([r for r in results if r['success']]),
        'failed': len([r for r in results if not r['success']])
    })

@app.route('/api/mot/vehicles/<registration>/archive', methods=['POST'])
def archive_vehicle(registration):
    """Archive a vehicle from active MOT monitoring"""
    data = request.get_json() or {}
    reason = data.get('reason', 'Manual archive')

    result = mot_service.archive_vehicle(registration, reason)
    return jsonify(result)

@app.route('/api/mot/vehicles/<registration>/unarchive', methods=['POST'])
def unarchive_vehicle(registration):
    """Unarchive a vehicle to return it to active MOT monitoring"""
    result = mot_service.unarchive_vehicle(registration)
    return jsonify(result)

@app.route('/api/mot/vehicles/archive/bulk', methods=['POST'])
def bulk_archive_vehicles():
    """Archive multiple vehicles at once"""
    data = request.get_json()
    registrations = data.get('registrations', [])
    reason = data.get('reason', 'Bulk archive')

    if not registrations:
        return jsonify({'success': False, 'error': 'No vehicles specified'})

    result = mot_service.archive_multiple_vehicles(registrations, reason)
    return jsonify(result)

@app.route('/api/mot/vehicles/archived', methods=['GET'])
def get_archived_vehicles():
    """Get all archived vehicles"""
    vehicles = mot_service.get_all_mot_vehicles(include_flagged=True, include_archived=True)
    archived_vehicles = [v for v in vehicles if v.get('is_archived')]

    return jsonify({
        'success': True,
        'vehicles': archived_vehicles,
        'total_count': len(archived_vehicles)
    })

@app.route('/api/mot/customer/<registration>', methods=['GET'])
def get_customer_by_vehicle_registration(registration):
    """Get customer information linked to a vehicle registration"""
    try:
        # First check if vehicle has stored customer link
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT main_customer_id, main_vehicle_id, customer_name, mobile_number
            FROM mot_vehicles
            WHERE registration = ?
        ''', (registration,))

        result = cursor.fetchone()
        conn.close()

        if result and result[0]:  # Has main_customer_id
            main_customer_id = result[0]

            # Get customer details from main database
            main_conn = mot_service.get_main_garage_db_connection()
            if main_conn:
                main_cursor = main_conn.cursor()

                main_cursor.execute('''
                    SELECT id, name, phone, email, account_number
                    FROM customers
                    WHERE id = ?
                ''', (main_customer_id,))

                customer_data = main_cursor.fetchone()
                main_conn.close()

                if customer_data:
                    return jsonify({
                        'success': True,
                        'customer': {
                            'customer_id': customer_data[0],
                            'customer_name': customer_data[1],
                            'customer_phone': customer_data[2],
                            'customer_email': customer_data[3],
                            'account_number': customer_data[4],
                            'vehicle_id': result[1]
                        }
                    })

        # Fallback to dynamic linking
        customer_link = mot_service.link_mot_vehicle_to_customer(registration)
        if customer_link:
            return jsonify({
                'success': True,
                'customer': customer_link
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No customer found for this vehicle'
            }), 404

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/customer/history/<customer_id>', methods=['GET'])
def get_customer_mot_history(customer_id):
    """Get MOT history for a specific customer"""
    try:
        main_conn = mot_service.get_main_garage_db_connection()
        if not main_conn:
            return jsonify({'success': False, 'error': 'Cannot connect to main database'}), 500

        main_cursor = main_conn.cursor()

        # Get customer's vehicles and their MOT history
        main_cursor.execute('''
            SELECT v.registration, v.make, v.model, v.mot_due
            FROM vehicles v
            WHERE v.customer_id = ?
        ''', (customer_id,))

        vehicles = []
        for row in main_cursor.fetchall():
            registration = row[0]

            # Get MOT reminder data for this vehicle
            mot_conn = sqlite3.connect(mot_service.db_path)
            mot_cursor = mot_conn.cursor()

            mot_cursor.execute('''
                SELECT mot_expiry_date, days_until_expiry, is_expired, last_test_date, test_result,
                       uploaded_at, sms_sent_at, is_archived
                FROM mot_vehicles
                WHERE registration = ?
            ''', (registration,))

            mot_data = mot_cursor.fetchone()

            # Get SMS history for this vehicle
            mot_cursor.execute('''
                SELECT sent_at, message_type, status, delivery_status
                FROM mot_reminders_log
                WHERE vehicle_registration = ?
                ORDER BY sent_at DESC
            ''', (registration,))

            sms_history = []
            for sms_row in mot_cursor.fetchall():
                sms_history.append({
                    'sent_at': sms_row[0],
                    'message_type': sms_row[1],
                    'status': sms_row[2],
                    'delivery_status': sms_row[3]
                })

            mot_conn.close()

            vehicle_info = {
                'registration': registration,
                'make': row[1],
                'model': row[2],
                'mot_due_main_db': row[3],
                'mot_data': {
                    'mot_expiry_date': mot_data[0] if mot_data else None,
                    'days_until_expiry': mot_data[1] if mot_data else None,
                    'is_expired': bool(mot_data[2]) if mot_data else None,
                    'last_test_date': mot_data[3] if mot_data else None,
                    'test_result': mot_data[4] if mot_data else None,
                    'uploaded_at': mot_data[5] if mot_data else None,
                    'sms_sent_at': mot_data[6] if mot_data else None,
                    'is_archived': bool(mot_data[7]) if mot_data else None
                } if mot_data else None,
                'sms_history': sms_history
            }

            vehicles.append(vehicle_info)

        main_conn.close()

        return jsonify({
            'success': True,
            'vehicles': vehicles,
            'total_vehicles': len(vehicles)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/link-existing-vehicles', methods=['POST'])
def link_existing_vehicles():
    """Retroactively link existing MOT vehicles to customers in main database"""
    try:
        # Get all MOT vehicles that don't have customer links
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT registration, customer_name, mobile_number
            FROM mot_vehicles
            WHERE main_customer_id IS NULL
        ''')

        unlinked_vehicles = cursor.fetchall()
        conn.close()

        linked_count = 0
        created_count = 0
        results = []

        for registration, customer_name, mobile_number in unlinked_vehicles:
            # Try to link to existing customer
            customer_link = mot_service.link_mot_vehicle_to_customer(registration, customer_name, mobile_number)

            if customer_link:
                # Update MOT vehicle with customer link
                conn = sqlite3.connect(mot_service.db_path)
                cursor = conn.cursor()

                cursor.execute('''
                    UPDATE mot_vehicles
                    SET main_customer_id = ?, main_vehicle_id = ?
                    WHERE registration = ?
                ''', (customer_link['customer_id'], customer_link.get('vehicle_id'), registration))

                conn.commit()
                conn.close()

                linked_count += 1
                results.append({
                    'registration': registration,
                    'status': 'linked',
                    'customer_id': customer_link['customer_id'],
                    'customer_name': customer_link['customer_name']
                })

            elif customer_name and mobile_number:
                # Create new customer if we have enough info
                new_customer = mot_service.create_customer_in_main_db(customer_name, mobile_number)

                if new_customer:
                    # Create vehicle record in main database
                    main_vehicle_id = mot_service.create_vehicle_in_main_db(
                        registration,
                        'Unknown',  # We don't have make/model from MOT data here
                        'Unknown',
                        new_customer['customer_id']
                    )

                    # Update MOT vehicle with customer link
                    conn = sqlite3.connect(mot_service.db_path)
                    cursor = conn.cursor()

                    cursor.execute('''
                        UPDATE mot_vehicles
                        SET main_customer_id = ?, main_vehicle_id = ?
                        WHERE registration = ?
                    ''', (new_customer['customer_id'], main_vehicle_id, registration))

                    conn.commit()
                    conn.close()

                    created_count += 1
                    results.append({
                        'registration': registration,
                        'status': 'created',
                        'customer_id': new_customer['customer_id'],
                        'customer_name': new_customer['customer_name']
                    })
                else:
                    results.append({
                        'registration': registration,
                        'status': 'failed',
                        'error': 'Could not create customer'
                    })
            else:
                results.append({
                    'registration': registration,
                    'status': 'skipped',
                    'error': 'Insufficient customer information'
                })

        return jsonify({
            'success': True,
            'total_processed': len(unlinked_vehicles),
            'linked_to_existing': linked_count,
            'created_new_customers': created_count,
            'results': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002, host='127.0.0.1')
