#!/usr/bin/env python3
"""
SMS Service for MOT Reminder Tool
Handles SMS notifications using Twilio API with template support
"""

import os
import re
from datetime import datetime

import phonenumbers
from dotenv import load_dotenv
from phonenumbers import NumberParseException
from twilio.rest import Client

# Load environment variables from multiple possible locations
load_dotenv()  # Current directory
load_dotenv(os.path.join(os.path.dirname(__file__),
            '..', 'src', '.env'))  # src/.env
load_dotenv(os.path.join(os.path.dirname(
    __file__), '..', '.env'))  # parent/.env


def format_date_for_display(date_string):
    """Convert date from various formats to DD-MM-YYYY format for display"""
    if not date_string or date_string == '-' or date_string == '' or date_string == 'Unknown':
        return '-'

    # If already in DD-MM-YYYY format, return as-is
    if isinstance(date_string, str) and len(date_string) == 10:
        parts = date_string.split('-')
        if len(parts) == 3 and len(parts[0]) == 2 and len(parts[1]) == 2 and len(parts[2]) == 4:
            return date_string

    try:
        date_obj = None

        # Handle different date formats
        if 'T' in str(date_string):
            # Handle ISO format with timezone first (before checking for dashes)
            try:
                date_str = str(date_string)

                # Try different approaches for ISO parsing
                try:
                    # First try: replace Z with +00:00
                    if date_str.endswith('Z'):
                        date_str_fixed = date_str[:-1] + '+00:00'
                        date_obj = datetime.fromisoformat(date_str_fixed)
                    else:
                        date_obj = datetime.fromisoformat(date_str)
                except (ValueError, AttributeError):
                    # Fallback: parse just the date part
                    try:
                        date_part = date_str.split('T')[0]
                        date_obj = datetime.strptime(date_part, '%Y-%m-%d')
                    except ValueError:
                        pass
            except (ValueError, TypeError):
                pass
        elif '.' in str(date_string):
            # Handle YYYY.MM.DD format (DVSA API format)
            try:
                date_obj = datetime.strptime(str(date_string), '%Y.%m.%d')
            except ValueError:
                # Try DD.MM.YYYY format
                try:
                    date_obj = datetime.strptime(str(date_string), '%d.%m.%Y')
                except ValueError:
                    pass
        elif '-' in str(date_string):
            # Handle various dash formats
            parts = str(date_string).split('-')
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    # YYYY-MM-DD format
                    try:
                        date_obj = datetime.strptime(
                            str(date_string), '%Y-%m-%d')
                    except ValueError:
                        pass
                elif len(parts[2]) == 4:
                    # DD-MM-YYYY format (already formatted)
                    return str(date_string)
        elif '/' in str(date_string):
            # Handle slash formats
            try:
                # Try MM/DD/YYYY format first
                date_obj = datetime.strptime(str(date_string), '%m/%d/%Y')
            except ValueError:
                try:
                    # Try DD/MM/YYYY format
                    date_obj = datetime.strptime(str(date_string), '%d/%m/%Y')
                except ValueError:
                    try:
                        # Try YYYY/MM/DD format
                        date_obj = datetime.strptime(
                            str(date_string), '%Y/%m/%d')
                    except ValueError:
                        pass
        else:
            # Try basic date parsing for numeric formats
            try:
                date_obj = datetime.strptime(str(date_string), '%Y%m%d')
            except (ValueError, TypeError):
                pass

        if date_obj:
            # Format as DD-MM-YYYY
            return date_obj.strftime('%d-%m-%Y')
        else:
            # If all parsing fails, return original
            return str(date_string)

    except Exception as e:
        return str(date_string)  # Return original if parsing fails


class SMSService:
    def __init__(self):
        """Initialize SMS service with Twilio credentials"""
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_FROM_NUMBER')

        # Check if credentials are real (not placeholder values)
        is_real_credentials = (
            self.account_sid and
            self.auth_token and
            self.from_number and
            not self.account_sid.startswith('your_') and
            not self.auth_token.startswith('your_') and
            not self.from_number.startswith('your_')
        )

        # Initialize Twilio client if real credentials are available
        if is_real_credentials:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                print("✅ SMS Service configured for real sending")
            except Exception as e:
                self.client = None
                print(f"❌ Twilio client initialization failed: {e}")
        else:
            self.client = None
            print(
                "⚠️ Twilio credentials not configured or using placeholders. SMS service will run in demo mode.")

    def validate_phone_number(self, phone_number, country_code='GB'):
        """
        Validate and format phone number

        Args:
            phone_number (str): Phone number to validate
            country_code (str): Country code (default: GB for UK)

        Returns:
            str: Formatted phone number in E164 format, or None if invalid
        """
        try:
            # Convert to string and clean basic formatting
            phone_str = str(phone_number).strip()
            if not phone_str:
                return None

            # Remove common separators but keep + and digits
            cleaned = re.sub(r'[\s\-\(\)]', '', phone_str)

            # Parse the phone number
            parsed = phonenumbers.parse(cleaned, country_code)

            # For demo purposes, be more lenient with validation
            # Check if it's a possible number (less strict than is_valid_number)
            if phonenumbers.is_possible_number(parsed):
                # Return in E164 format
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            else:
                # For demo/testing, allow basic UK mobile format
                if re.match(r'^(\+44|0)?7\d{9}$', cleaned):
                    # Convert to E164 format manually
                    if cleaned.startswith('+44'):
                        return cleaned
                    elif cleaned.startswith('44'):
                        return '+' + cleaned
                    elif cleaned.startswith('07'):
                        return '+44' + cleaned[1:]
                    else:
                        return '+44' + cleaned
                return None

        except (NumberParseException, Exception) as e:
            # Fallback for demo numbers
            cleaned = re.sub(r'[^\d+]', '', str(phone_number))
            if re.match(r'^(\+44|0)?7\d{9}$', cleaned):
                if cleaned.startswith('+44'):
                    return cleaned
                elif cleaned.startswith('44'):
                    return '+' + cleaned
                elif cleaned.startswith('07'):
                    return '+44' + cleaned[1:]
                else:
                    return '+44' + cleaned
            return None

    def clean_customer_name(self, customer_name):
        """
        Clean and extract a usable first name from customer data

        Args:
            customer_name (str): Raw customer name data

        Returns:
            str: Clean first name or None if unusable
        """
        if not customer_name or not customer_name.strip():
            return None

        # Remove common prefixes and clean the name
        name = customer_name.strip()

        # Remove titles (Mr, Mrs, Ms, Dr, etc.)
        name = re.sub(r'^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?)\s+',
                      '', name, flags=re.IGNORECASE)

        # Handle cases where name contains contact info (like "John Smith t: 123 m: 456 e: email")
        # Extract just the name part before any contact details
        name_parts = re.split(
            r'\s+(?:t:|m:|e:|tel:|mobile:|email:)', name, flags=re.IGNORECASE)
        if name_parts:
            name = name_parts[0].strip()

        # Split by spaces and take the first meaningful part
        parts = name.split()
        if parts:
            first_part = parts[0].strip()

            # Check if it looks like a real name (not just numbers or weird characters)
            if re.match(r'^[A-Za-z][A-Za-z\'\-\.]*$', first_part) and len(first_part) > 1:
                return first_part.title()  # Capitalize properly

        return None

    def should_send_sms(self, vehicle_info, mobile_number, customer_name=None):
        """
        Determine if SMS should be sent based on data quality

        Args:
            vehicle_info (dict): Vehicle information
            mobile_number (str): Customer mobile number
            customer_name (str): Customer name (optional)

        Returns:
            dict: {'should_send': bool, 'reason': str}
        """
        # Check if vehicle is already booked in
        if vehicle_info.get('is_booked_in'):
            return {'should_send': False, 'reason': 'Vehicle is already booked in'}

        # Must have a valid mobile number
        if not mobile_number or not mobile_number.strip():
            return {'should_send': False, 'reason': 'No mobile number available'}

        # Validate mobile number format
        formatted_number = self.validate_phone_number(mobile_number)
        if not formatted_number:
            return {'should_send': False, 'reason': 'Invalid mobile number format'}

        # Must have vehicle registration
        if not vehicle_info.get('registration'):
            return {'should_send': False, 'reason': 'No vehicle registration'}

        # Must have make/model info
        if not vehicle_info.get('make') or not vehicle_info.get('model'):
            return {'should_send': False, 'reason': 'Missing vehicle make/model information'}

        # Must have MOT expiry date
        if not vehicle_info.get('mot_expiry_date'):
            return {'should_send': False, 'reason': 'No MOT expiry date available'}

        return {'should_send': True, 'reason': 'All required data available'}

    def create_message_from_template(self, template_name, vehicle_info, customer_name=None):
        """
        Create SMS message from template

        Args:
            template_name (str): Template name ('expired', 'critical', 'due_soon', 'reminder')
            vehicle_info (dict): Vehicle information
            customer_name (str): Customer name (optional)

        Returns:
            str: Formatted SMS message
        """
        templates = {
            'expired': """MOT Reminder - Eli Motors
{customer_greeting}Your {make} {model} ({registration}) MOT expired on {expiry_date}.
Please arrange your MOT test at your earliest convenience.
Call Eli Motors: 0208 203 6449 to book your appointment.""",

            'critical': """MOT Reminder - Eli Motors
{customer_greeting}Your {make} {model} ({registration}) MOT expires in {days_left} days on {expiry_date}.
We recommend booking your MOT test soon to maintain continuous coverage.
Call Eli Motors: 0208 203 6449 to arrange your test.""",

            'due_soon': """MOT Reminder - Eli Motors
{customer_greeting}Your {make} {model} ({registration}) MOT expires in {days_left} days on {expiry_date}.
Please book your MOT test to ensure continuous coverage.
Call Eli Motors: 0208 203 6449 to schedule your test.""",

            'reminder': """MOT Reminder - Eli Motors
{customer_greeting}Your {make} {model} ({registration}) MOT expires on {expiry_date}.
Please book your MOT test when convenient.
Call Eli Motors: 0208 203 6449 for more information."""
        }

        template = templates.get(template_name, templates['reminder'])

        # Prepare customer greeting with intelligent name handling
        if customer_name and customer_name.strip():
            # Clean and format the customer name
            clean_name = self.clean_customer_name(customer_name.strip())
            if clean_name:
                customer_greeting = f"Hi {clean_name}, "
            else:
                customer_greeting = ""  # No greeting if name is unclear
        else:
            customer_greeting = ""  # No greeting if no name available

        # Format the message
        try:
            # Ensure expiry date is formatted correctly
            expiry_date = vehicle_info.get('mot_expiry_date', 'Unknown')
            if expiry_date != 'Unknown':
                expiry_date = format_date_for_display(expiry_date)

            message = template.format(
                customer_greeting=customer_greeting,
                make=vehicle_info.get('make', 'Unknown'),
                model=vehicle_info.get('model', 'Unknown'),
                registration=vehicle_info.get('registration', 'Unknown'),
                expiry_date=expiry_date,
                days_left=abs(vehicle_info.get('days_until_expiry', 0))
            )
            return message
        except KeyError as e:
            print(f"Error formatting template: {e}")
            return f"MOT reminder for {vehicle_info.get('registration', 'your vehicle')}"

    def determine_template_type(self, vehicle_info):
        """
        Determine which template to use based on vehicle MOT status

        Args:
            vehicle_info (dict): Vehicle information

        Returns:
            str: Template name
        """
        days_until_expiry = vehicle_info.get('days_until_expiry', 0)
        is_expired = vehicle_info.get('is_expired', False)

        if is_expired:
            return 'expired'
        elif days_until_expiry <= 7:
            return 'critical'
        elif days_until_expiry <= 30:
            return 'due_soon'
        else:
            return 'reminder'

    def send_sms(self, to_number, message, vehicle_registration=None):
        """
        Send SMS message

        Args:
            to_number (str): Recipient phone number
            message (str): SMS message content
            vehicle_registration (str): Vehicle registration for logging

        Returns:
            dict: Result with success status and details
        """
        # Validate phone number
        formatted_number = self.validate_phone_number(to_number)
        if not formatted_number:
            return {
                'success': False,
                'error': f'Invalid phone number: {to_number}',
                'message_sid': None
            }

        # Check if Twilio client is available
        if not self.client:
            # Demo mode - just log the message
            print(f"\n📱 SMS DEMO MODE:")
            print(f"To: {formatted_number}")
            print(f"Vehicle: {vehicle_registration or 'Unknown'}")
            print(f"Message: {message}")
            print("-" * 50)

            return {
                'success': True,
                'error': None,
                'message_sid': 'DEMO_' + datetime.now().strftime('%Y%m%d_%H%M%S'),
                'demo_mode': True
            }

        try:
            # Send SMS via Twilio (private system - no callback)
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=formatted_number
            )

            print(
                f"✅ SMS sent to {formatted_number} for {vehicle_registration or 'vehicle'}")
            print(f"   Message SID: {message_obj.sid}")

            return {
                'success': True,
                'error': None,
                'message_sid': message_obj.sid,
                'demo_mode': False
            }

        except Exception as e:
            print(f"❌ Failed to send SMS to {formatted_number}: {str(e)}")

            return {
                'success': False,
                'error': str(e),
                'message_sid': None
            }

    def send_mot_reminder(self, vehicle_info, mobile_number, customer_name=None):
        """
        Send MOT reminder SMS for a specific vehicle

        Args:
            vehicle_info (dict): Vehicle information
            mobile_number (str): Customer mobile number
            customer_name (str): Customer name (optional)

        Returns:
            dict: Result with success status and details
        """
        # Check if we should send SMS based on data quality
        validation = self.should_send_sms(
            vehicle_info, mobile_number, customer_name)
        if not validation['should_send']:
            return {
                'success': False,
                'error': f"SMS not sent: {validation['reason']}",
                'template_type': None,
                'message_sid': None
            }

        # Determine template type
        template_type = self.determine_template_type(vehicle_info)

        # Create message from template
        message = self.create_message_from_template(
            template_type, vehicle_info, customer_name)

        # Send SMS
        result = self.send_sms(
            to_number=mobile_number,
            message=message,
            vehicle_registration=vehicle_info.get('registration')
        )

        # Add template info to result
        result['template_type'] = template_type
        result['customer_name'] = customer_name

        return result

    def send_bulk_reminders(self, vehicles_with_contacts):
        """
        Send bulk MOT reminders

        Args:
            vehicles_with_contacts (list): List of dicts with vehicle_info, mobile_number, customer_name

        Returns:
            dict: Summary of bulk send results
        """
        results = {
            'total': len(vehicles_with_contacts),
            'sent': 0,
            'failed': 0,
            'errors': [],
            'details': []
        }

        for item in vehicles_with_contacts:
            vehicle_info = item.get('vehicle_info')
            mobile_number = item.get('mobile_number')
            customer_name = item.get('customer_name')

            if not vehicle_info or not mobile_number:
                results['failed'] += 1
                results['errors'].append(
                    f"Missing data for {vehicle_info.get('registration', 'unknown vehicle') if vehicle_info else 'unknown vehicle'}")
                continue

            result = self.send_mot_reminder(
                vehicle_info, mobile_number, customer_name)

            if result['success']:
                results['sent'] += 1
            else:
                results['failed'] += 1
                results['errors'].append(
                    f"{vehicle_info.get('registration', 'unknown')}: {result['error']}")

            results['details'].append(result)

        return results

    def get_service_status(self):
        """
        Get SMS service status

        Returns:
            dict: Service status information
        """
        status = {
            'configured': bool(self.client),
            'demo_mode': not bool(self.client),
            'from_number': self.from_number if self.from_number else 'Not configured',
            'account_sid': self.account_sid[:8] + '...' if self.account_sid else 'Not configured'
        }

        return status
