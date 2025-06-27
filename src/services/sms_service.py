"""
Unified SMS Service
Consolidates all SMS functionality for MOT reminders, customer communications, and notifications
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import sqlite3
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

class UnifiedSMSService:
    """Unified SMS service for all garage communications"""
    
    def __init__(self, db_path: str = None):
        """Initialize the unified SMS service"""
        self.db_path = db_path or os.path.join(os.path.dirname(os.path.dirname(__file__)), 'garage_management.db')
        self.logger = logging.getLogger(__name__)
        
        # Initialize Twilio client
        self.twilio_client = None
        self.twilio_phone_number = None
        self._init_twilio()
        
        # Initialize database
        self._init_database()
        
        self.logger.info("Unified SMS service initialized")
    
    def _init_twilio(self):
        """Initialize Twilio client with credentials"""
        try:
            account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
            auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
            self.twilio_phone_number = os.environ.get('TWILIO_PHONE_NUMBER')
            
            if account_sid and auth_token and self.twilio_phone_number:
                self.twilio_client = Client(account_sid, auth_token)
                self.logger.info("✅ Twilio SMS service initialized")
            else:
                self.logger.warning("⚠️ Twilio credentials not configured - SMS will run in demo mode")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Twilio: {e}")
    
    def _init_database(self):
        """Initialize SMS database tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # SMS communications table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sms_communications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER,
                        vehicle_registration TEXT,
                        phone_number TEXT NOT NULL,
                        message_type TEXT NOT NULL,
                        message_content TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        sent_at TIMESTAMP,
                        delivered_at TIMESTAMP,
                        twilio_sid TEXT,
                        error_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_id) REFERENCES customers (id)
                    )
                ''')
                
                # SMS templates table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sms_templates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        template_name TEXT UNIQUE NOT NULL,
                        template_type TEXT NOT NULL,
                        subject TEXT,
                        message_content TEXT NOT NULL,
                        variables TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # SMS settings table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sms_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        setting_name TEXT UNIQUE NOT NULL,
                        setting_value TEXT,
                        description TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                conn.commit()
                self.logger.info("✅ SMS database tables initialized")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize SMS database: {e}")
    
    def send_mot_reminder(self, vehicle_registration: str, customer_name: str, 
                         phone_number: str, mot_expiry_date: str, 
                         days_remaining: int) -> Dict[str, Any]:
        """Send MOT reminder SMS"""
        
        # Generate MOT reminder message
        if days_remaining < 0:
            urgency = "URGENT"
            message = f"URGENT: {customer_name}, your vehicle {vehicle_registration} MOT expired {abs(days_remaining)} days ago. Book your MOT test immediately to avoid penalties."
        elif days_remaining == 0:
            urgency = "CRITICAL"
            message = f"CRITICAL: {customer_name}, your vehicle {vehicle_registration} MOT expires TODAY. Book your test immediately."
        elif days_remaining <= 7:
            urgency = "URGENT"
            message = f"URGENT: {customer_name}, your vehicle {vehicle_registration} MOT expires in {days_remaining} days ({mot_expiry_date}). Book your test now."
        elif days_remaining <= 30:
            urgency = "REMINDER"
            message = f"MOT Reminder: {customer_name}, your vehicle {vehicle_registration} MOT expires in {days_remaining} days ({mot_expiry_date}). Book your test soon."
        else:
            urgency = "NOTICE"
            message = f"MOT Notice: {customer_name}, your vehicle {vehicle_registration} MOT expires on {mot_expiry_date}. Plan ahead for your test."
        
        return self._send_sms(
            phone_number=phone_number,
            message=message,
            message_type='mot_reminder',
            vehicle_registration=vehicle_registration,
            metadata={'urgency': urgency, 'days_remaining': days_remaining}
        )
    
    def send_appointment_reminder(self, customer_name: str, phone_number: str,
                                appointment_date: str, appointment_time: str,
                                service_type: str) -> Dict[str, Any]:
        """Send appointment reminder SMS"""
        
        message = f"Appointment Reminder: {customer_name}, you have a {service_type} appointment on {appointment_date} at {appointment_time}. Please arrive 10 minutes early."
        
        return self._send_sms(
            phone_number=phone_number,
            message=message,
            message_type='appointment_reminder',
            metadata={'appointment_date': appointment_date, 'service_type': service_type}
        )
    
    def send_job_completion_notice(self, customer_name: str, phone_number: str,
                                 vehicle_registration: str, job_description: str,
                                 total_cost: float) -> Dict[str, Any]:
        """Send job completion notice SMS"""
        
        message = f"Job Complete: {customer_name}, your {vehicle_registration} {job_description} is ready for collection. Total: £{total_cost:.2f}. Please call to arrange pickup."
        
        return self._send_sms(
            phone_number=phone_number,
            message=message,
            message_type='job_completion',
            vehicle_registration=vehicle_registration,
            metadata={'job_description': job_description, 'total_cost': total_cost}
        )
    
    def send_custom_message(self, phone_number: str, message: str,
                          customer_name: str = None, 
                          vehicle_registration: str = None) -> Dict[str, Any]:
        """Send custom SMS message"""
        
        return self._send_sms(
            phone_number=phone_number,
            message=message,
            message_type='custom',
            vehicle_registration=vehicle_registration,
            metadata={'customer_name': customer_name}
        )
    
    def _send_sms(self, phone_number: str, message: str, message_type: str,
                  vehicle_registration: str = None, customer_id: int = None,
                  metadata: Dict = None) -> Dict[str, Any]:
        """Internal method to send SMS and log to database"""
        
        result = {
            'success': False,
            'message_id': None,
            'status': 'failed',
            'error': None
        }
        
        # Clean phone number
        clean_phone = self._clean_phone_number(phone_number)
        if not clean_phone:
            result['error'] = 'Invalid phone number format'
            return result
        
        # Log to database first
        message_id = self._log_sms_to_database(
            customer_id=customer_id,
            vehicle_registration=vehicle_registration,
            phone_number=clean_phone,
            message_type=message_type,
            message_content=message,
            status='pending'
        )
        
        result['message_id'] = message_id
        
        try:
            if self.twilio_client and self.twilio_phone_number:
                # Send via Twilio
                twilio_message = self.twilio_client.messages.create(
                    body=message,
                    from_=self.twilio_phone_number,
                    to=clean_phone
                )
                
                # Update database with success
                self._update_sms_status(
                    message_id=message_id,
                    status='sent',
                    twilio_sid=twilio_message.sid,
                    sent_at=datetime.now()
                )
                
                result['success'] = True
                result['status'] = 'sent'
                result['twilio_sid'] = twilio_message.sid
                
                self.logger.info(f"✅ SMS sent successfully to {clean_phone}")
                
            else:
                # Demo mode - simulate sending
                self._update_sms_status(
                    message_id=message_id,
                    status='demo_sent',
                    sent_at=datetime.now()
                )
                
                result['success'] = True
                result['status'] = 'demo_sent'
                
                self.logger.info(f"📱 SMS simulated (demo mode) to {clean_phone}")
                
        except TwilioException as e:
            error_msg = f"Twilio error: {str(e)}"
            self._update_sms_status(
                message_id=message_id,
                status='failed',
                error_message=error_msg
            )
            result['error'] = error_msg
            self.logger.error(f"❌ SMS failed: {error_msg}")
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            self._update_sms_status(
                message_id=message_id,
                status='failed',
                error_message=error_msg
            )
            result['error'] = error_msg
            self.logger.error(f"❌ SMS failed: {error_msg}")
        
        return result
    
    def _clean_phone_number(self, phone_number: str) -> Optional[str]:
        """Clean and validate phone number"""
        if not phone_number:
            return None
        
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, phone_number))
        
        # Handle UK mobile numbers
        if digits_only.startswith('07') and len(digits_only) == 11:
            return f"+44{digits_only[1:]}"
        elif digits_only.startswith('447') and len(digits_only) == 13:
            return f"+{digits_only}"
        elif digits_only.startswith('44') and len(digits_only) == 12:
            return f"+{digits_only}"
        
        return None
    
    def _log_sms_to_database(self, customer_id: int, vehicle_registration: str,
                           phone_number: str, message_type: str, 
                           message_content: str, status: str) -> int:
        """Log SMS to database and return message ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO sms_communications 
                    (customer_id, vehicle_registration, phone_number, message_type, 
                     message_content, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    customer_id, vehicle_registration, phone_number, message_type,
                    message_content, status, datetime.now(), datetime.now()
                ))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            self.logger.error(f"❌ Failed to log SMS to database: {e}")
            return None
    
    def _update_sms_status(self, message_id: int, status: str, 
                          twilio_sid: str = None, sent_at: datetime = None,
                          delivered_at: datetime = None, error_message: str = None):
        """Update SMS status in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE sms_communications 
                    SET status = ?, twilio_sid = ?, sent_at = ?, 
                        delivered_at = ?, error_message = ?, updated_at = ?
                    WHERE id = ?
                ''', (
                    status, twilio_sid, sent_at, delivered_at, 
                    error_message, datetime.now(), message_id
                ))
                conn.commit()
        except Exception as e:
            self.logger.error(f"❌ Failed to update SMS status: {e}")
    
    def get_sms_history(self, limit: int = 100, message_type: str = None) -> List[Dict]:
        """Get SMS communication history"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = '''
                    SELECT id, customer_id, vehicle_registration, phone_number,
                           message_type, message_content, status, sent_at,
                           delivered_at, error_message, created_at
                    FROM sms_communications
                '''
                params = []
                
                if message_type:
                    query += ' WHERE message_type = ?'
                    params.append(message_type)
                
                query += ' ORDER BY created_at DESC LIMIT ?'
                params.append(limit)
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                return [
                    {
                        'id': row[0],
                        'customer_id': row[1],
                        'vehicle_registration': row[2],
                        'phone_number': row[3],
                        'message_type': row[4],
                        'message_content': row[5],
                        'status': row[6],
                        'sent_at': row[7],
                        'delivered_at': row[8],
                        'error_message': row[9],
                        'created_at': row[10]
                    }
                    for row in rows
                ]
                
        except Exception as e:
            self.logger.error(f"❌ Failed to get SMS history: {e}")
            return []
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for SMS service"""
        return {
            'status': 'healthy',
            'twilio_configured': self.twilio_client is not None,
            'database_accessible': os.path.exists(self.db_path)
        }
