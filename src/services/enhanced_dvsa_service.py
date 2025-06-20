#!/usr/bin/env python3
"""
Enhanced DVSA Integration Service
Extends current MOT integration with tax status, automated reminders, and comprehensive vehicle data
"""

import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import requests


@dataclass
class VehicleData:
    """Comprehensive vehicle data structure"""
    registration: str
    make: str
    model: str
    year: int
    color: str
    fuel_type: str
    mot_expiry: str
    tax_due: str
    tax_status: str
    mot_status: str
    co2_emissions: int
    engine_capacity: int
    euro_status: str


class EnhancedDVSAService:
    """Enhanced DVSA service with MOT and tax integration"""

    def __init__(self, db_path: str):
        self.db_path = db_path

        # DVSA MOT API credentials (existing)
        self.dvsa_client_id = os.getenv(
            'DVSA_CLIENT_ID', '2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f')
        self.dvsa_client_secret = os.getenv('DVSA_CLIENT_SECRET')
        self.dvsa_api_key = os.getenv('DVSA_API_KEY')
        self.dvsa_token_url = 'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token'
        self.dvsa_base_url = 'https://history.mot.api.gov.uk/v1/trade/vehicles'

        # DVLA Vehicle Enquiry API credentials
        self.dvla_api_key = os.getenv('DVLA_API_KEY')
        self.dvla_base_url = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'

        # Token management
        self.dvsa_access_token = None
        self.token_expiry = None

        self._ensure_enhanced_tables()

    def _ensure_enhanced_tables(self):
        """Create enhanced vehicle tracking tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Enhanced vehicle data table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS enhanced_vehicle_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration VARCHAR(10) UNIQUE NOT NULL,
                    make VARCHAR(50),
                    model VARCHAR(50),
                    year INTEGER,
                    color VARCHAR(30),
                    fuel_type VARCHAR(20),
                    mot_expiry DATE,
                    tax_due DATE,
                    tax_status VARCHAR(20),
                    mot_status VARCHAR(20),
                    co2_emissions INTEGER,
                    engine_capacity INTEGER,
                    euro_status VARCHAR(10),
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    data_source VARCHAR(20) DEFAULT 'DVSA',
                    customer_id INTEGER,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            # Automated reminder schedule table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS reminder_schedule (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration VARCHAR(10) NOT NULL,
                    reminder_type VARCHAR(20) NOT NULL,
                    scheduled_date DATE NOT NULL,
                    sent_date DATETIME,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    customer_id INTEGER,
                    mobile_number VARCHAR(20),
                    email VARCHAR(100),
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')

            # Vehicle history tracking
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vehicle_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration VARCHAR(10) NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    event_date DATE,
                    description TEXT,
                    data_source VARCHAR(20),
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            conn.commit()
            conn.close()

        except Exception as e:
            print(f"Error creating enhanced DVSA tables: {str(e)}")

    def get_dvsa_access_token(self) -> Optional[str]:
        """Get OAuth access token for DVSA API"""
        try:
            # Check if we have a valid token
            if self.dvsa_access_token and self.token_expiry and datetime.now() < self.token_expiry:
                return self.dvsa_access_token

            if not self.dvsa_client_secret:
                print("DVSA client secret not configured")
                return None

            # Get new token
            payload = {
                'grant_type': 'client_credentials',
                'client_id': self.dvsa_client_id,
                'client_secret': self.dvsa_client_secret,
                'scope': 'https://tapi.dvsa.gov.uk/.default'
            }

            response = requests.post(
                self.dvsa_token_url, data=payload, timeout=30)

            if response.status_code == 200:
                token_data = response.json()
                self.dvsa_access_token = token_data['access_token']
                # Set token expiry to 55 minutes (giving 5-minute buffer)
                self.token_expiry = datetime.now() + timedelta(minutes=55)
                return self.dvsa_access_token
            else:
                print(
                    f"Error getting DVSA access token: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error in DVSA authentication: {str(e)}")
            return None

    def get_mot_data(self, registration: str) -> Optional[Dict]:
        """Get MOT data from DVSA API"""
        try:
            token = self.get_dvsa_access_token()
            if not token:
                return None

            headers = {
                'Authorization': f'Bearer {token}',
                'X-API-Key': self.dvsa_api_key
            }

            url = f"{self.dvsa_base_url}/registration/{registration.replace(' ', '')}"
            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                return response.json()
            else:
                print(
                    f"DVSA API error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error fetching MOT data: {str(e)}")
            return None

    def get_tax_data(self, registration: str) -> Optional[Dict]:
        """Get tax data from DVLA API"""
        try:
            if not self.dvla_api_key:
                print("DVLA API key not configured")
                return None

            headers = {
                'x-api-key': self.dvla_api_key,
                'Content-Type': 'application/json'
            }

            data = {
                'registrationNumber': registration.replace(' ', '').upper()
            }

            response = requests.post(
                self.dvla_base_url, headers=headers, json=data, timeout=30)

            if response.status_code == 200:
                return response.json()
            else:
                print(
                    f"DVLA API error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error fetching tax data: {str(e)}")
            return None

    def get_comprehensive_vehicle_data(self, registration: str) -> Dict:
        """Get comprehensive vehicle data from both DVSA and DVLA"""
        try:
            registration = registration.replace(' ', '').upper()

            # Get MOT data from DVSA
            mot_data = self.get_mot_data(registration)

            # Get tax data from DVLA
            tax_data = self.get_tax_data(registration)

            # Combine data
            vehicle_info = {
                'registration': registration,
                'data_sources': [],
                'last_updated': datetime.now().isoformat()
            }

            # Process MOT data
            if mot_data:
                vehicle_info['data_sources'].append('DVSA')
                vehicle_info.update({
                    'make': mot_data.get('make', ''),
                    'model': mot_data.get('model', ''),
                    'year': mot_data.get('yearOfManufacture'),
                    'color': mot_data.get('primaryColour', ''),
                    'fuel_type': mot_data.get('fuelType', ''),
                    'engine_capacity': mot_data.get('engineSize'),
                })

                # Process MOT tests
                if mot_data.get('motTests'):
                    latest_test = mot_data['motTests'][0]  # Most recent test
                    vehicle_info.update({
                        'mot_expiry': latest_test.get('expiryDate'),
                        'mot_status': latest_test.get('testResult', 'UNKNOWN'),
                        'last_mot_date': latest_test.get('completedDate')
                    })

            # Process tax data
            if tax_data:
                vehicle_info['data_sources'].append('DVLA')
                vehicle_info.update({
                    'tax_due': tax_data.get('taxDueDate'),
                    'tax_status': tax_data.get('taxStatus', 'UNKNOWN'),
                    'co2_emissions': tax_data.get('co2Emissions'),
                    'euro_status': tax_data.get('euroStatus'),
                    'wheel_plan': tax_data.get('wheelplan'),
                    'revenue_weight': tax_data.get('revenueWeight')
                })

                # Override with DVLA data if available (more current)
                if tax_data.get('make'):
                    vehicle_info['make'] = tax_data['make']
                if tax_data.get('colour'):
                    vehicle_info['color'] = tax_data['colour']
                if tax_data.get('fuelType'):
                    vehicle_info['fuel_type'] = tax_data['fuelType']

            # Calculate days until expiry
            if vehicle_info.get('mot_expiry'):
                try:
                    expiry_date = datetime.strptime(
                        vehicle_info['mot_expiry'], '%Y-%m-%d')
                    days_until_expiry = (expiry_date - datetime.now()).days
                    vehicle_info['days_until_mot_expiry'] = days_until_expiry
                    vehicle_info['mot_expired'] = days_until_expiry < 0
                except ValueError:
                    pass

            if vehicle_info.get('tax_due'):
                try:
                    tax_date = datetime.strptime(
                        vehicle_info['tax_due'], '%Y-%m-%d')
                    days_until_tax = (tax_date - datetime.now()).days
                    vehicle_info['days_until_tax_due'] = days_until_tax
                    vehicle_info['tax_expired'] = days_until_tax < 0
                except ValueError:
                    pass

            return {
                'success': True,
                'vehicle_data': vehicle_info,
                'data_sources': vehicle_info['data_sources']
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_pending_reminders(self) -> List[Dict]:
        """Get pending reminders that need to be sent"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, registration, reminder_type, scheduled_date,
                       customer_id, mobile_number, email
                FROM reminder_schedule
                WHERE status = 'PENDING'
                AND scheduled_date <= CURRENT_DATE
                ORDER BY scheduled_date
            ''')

            pending_reminders = []
            for row in cursor.fetchall():
                pending_reminders.append({
                    'id': row[0],
                    'registration': row[1],
                    'reminder_type': row[2],
                    'scheduled_date': row[3],
                    'customer_id': row[4],
                    'mobile_number': row[5],
                    'email': row[6]
                })

            conn.close()
            return pending_reminders

        except Exception as e:
            print(f"Error getting pending reminders: {str(e)}")
            return []

    def mark_reminder_sent(self, reminder_id: int) -> bool:
        """Mark a reminder as sent"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE reminder_schedule
                SET status = 'SENT', sent_date = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (reminder_id,))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print(f"Error marking reminder as sent: {str(e)}")
            return False

    def get_vehicle_history(self, registration: str) -> List[Dict]:
        """Get vehicle history events"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT event_type, event_date, description, data_source, created_date
                FROM vehicle_history
                WHERE registration = ?
                ORDER BY created_date DESC
                LIMIT 50
            ''', (registration,))

            history = []
            for row in cursor.fetchall():
                history.append({
                    'event_type': row[0],
                    'event_date': row[1],
                    'description': row[2],
                    'data_source': row[3],
                    'created_date': row[4]
                })

            conn.close()
            return history

        except Exception as e:
            print(f"Error getting vehicle history: {str(e)}")
            return []

    def store_vehicle_data(self, vehicle_data: Dict, customer_id: int = None) -> bool:
        """Store comprehensive vehicle data in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Insert or update enhanced vehicle data
            cursor.execute('''
                INSERT OR REPLACE INTO enhanced_vehicle_data 
                (registration, make, model, year, color, fuel_type, mot_expiry, tax_due,
                 tax_status, mot_status, co2_emissions, engine_capacity, euro_status,
                 last_updated, data_source, customer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
            ''', (
                vehicle_data.get('registration'),
                vehicle_data.get('make'),
                vehicle_data.get('model'),
                vehicle_data.get('year'),
                vehicle_data.get('color'),
                vehicle_data.get('fuel_type'),
                vehicle_data.get('mot_expiry'),
                vehicle_data.get('tax_due'),
                vehicle_data.get('tax_status'),
                vehicle_data.get('mot_status'),
                vehicle_data.get('co2_emissions'),
                vehicle_data.get('engine_capacity'),
                vehicle_data.get('euro_status'),
                ','.join(vehicle_data.get('data_sources', [])),
                customer_id
            ))

            # Log vehicle history event
            cursor.execute('''
                INSERT INTO vehicle_history 
                (registration, event_type, event_date, description, data_source)
                VALUES (?, ?, CURRENT_DATE, ?, ?)
            ''', (
                vehicle_data.get('registration'),
                'DATA_UPDATE',
                f"Vehicle data updated from {', '.join(vehicle_data.get('data_sources', []))}",
                ','.join(vehicle_data.get('data_sources', []))
            ))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print(f"Error storing vehicle data: {str(e)}")
            return False

    def schedule_automated_reminders(self, registration: str, customer_id: int = None) -> Dict:
        """Schedule automated reminders for MOT and tax"""
        try:
            # Get vehicle data
            vehicle_result = self.get_comprehensive_vehicle_data(registration)
            if not vehicle_result['success']:
                return vehicle_result

            vehicle_data = vehicle_result['vehicle_data']

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get customer contact info if customer_id provided
            mobile_number = None
            email = None
            if customer_id:
                cursor.execute(
                    'SELECT mobile, email FROM customers WHERE id = ?', (customer_id,))
                customer_row = cursor.fetchone()
                if customer_row:
                    mobile_number = customer_row[0]
                    email = customer_row[1]

            scheduled_reminders = []

            # Schedule MOT reminders
            if vehicle_data.get('mot_expiry'):
                try:
                    mot_expiry = datetime.strptime(
                        vehicle_data['mot_expiry'], '%Y-%m-%d')

                    # Schedule reminders at 30, 14, and 7 days before expiry
                    reminder_days = [30, 14, 7]

                    for days in reminder_days:
                        reminder_date = mot_expiry - timedelta(days=days)

                        # Only schedule future reminders
                        if reminder_date > datetime.now():
                            cursor.execute('''
                                INSERT OR REPLACE INTO reminder_schedule 
                                (registration, reminder_type, scheduled_date, customer_id, mobile_number, email)
                                VALUES (?, ?, ?, ?, ?, ?)
                            ''', (
                                registration, f'MOT_{days}D', reminder_date.date(
                                ),
                                customer_id, mobile_number, email
                            ))

                            scheduled_reminders.append({
                                'type': f'MOT reminder ({days} days)',
                                'scheduled_date': reminder_date.date().isoformat()
                            })

                except ValueError:
                    pass

            # Schedule tax reminders
            if vehicle_data.get('tax_due'):
                try:
                    tax_due = datetime.strptime(
                        vehicle_data['tax_due'], '%Y-%m-%d')

                    # Schedule reminders at 14 and 7 days before expiry
                    reminder_days = [14, 7]

                    for days in reminder_days:
                        reminder_date = tax_due - timedelta(days=days)

                        # Only schedule future reminders
                        if reminder_date > datetime.now():
                            cursor.execute('''
                                INSERT OR REPLACE INTO reminder_schedule 
                                (registration, reminder_type, scheduled_date, customer_id, mobile_number, email)
                                VALUES (?, ?, ?, ?, ?, ?)
                            ''', (
                                registration, f'TAX_{days}D', reminder_date.date(
                                ),
                                customer_id, mobile_number, email
                            ))

                            scheduled_reminders.append({
                                'type': f'Tax reminder ({days} days)',
                                'scheduled_date': reminder_date.date().isoformat()
                            })

                except ValueError:
                    pass

            conn.commit()
            conn.close()

            return {
                'success': True,
                'scheduled_reminders': scheduled_reminders,
                'vehicle_registration': registration
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
