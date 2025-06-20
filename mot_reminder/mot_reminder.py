import os
import time
from datetime import datetime, timedelta

import requests
import schedule
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


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
        print(f"Error formatting date '{date_string}': {e}")
        return str(date_string)  # Return original if parsing fails


class MOTReminder:
    def __init__(self):
        self.client_id = os.getenv('DVSA_CLIENT_ID') or os.getenv('CLIENT_ID')
        self.client_secret = os.getenv(
            'DVSA_CLIENT_SECRET') or os.getenv('CLIENT_SECRET')
        self.api_key = os.getenv('DVSA_API_KEY') or os.getenv('API_KEY')
        self.token_url = os.getenv('DVSA_TOKEN_URL') or os.getenv('TOKEN_URL')
        self.scope = "https://tapi.dvsa.gov.uk/.default"
        self.base_url = "https://history.mot.api.gov.uk/v1/trade/vehicles"
        self.access_token = None
        self.token_expiry = None

    def get_access_token(self):
        """
        Get OAuth access token from Microsoft Azure AD
        """
        try:
            # Check if we have a valid token
            if self.access_token and self.token_expiry and datetime.now() < self.token_expiry:
                return self.access_token

            # Get new token
            payload = {
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': self.scope
            }

            response = requests.post(self.token_url, data=payload)

            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                # Set token expiry to 55 minutes (giving 5-minute buffer)
                self.token_expiry = datetime.now() + timedelta(minutes=55)
                return self.access_token
            else:
                print(
                    f"Error getting access token: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error in authentication: {str(e)}")
            return None

    def get_vehicle_details(self, registration_number):
        """
        Get vehicle details from DVSA MOT History API
        """
        try:
            token = self.get_access_token()
            if not token:
                return None

            headers = {
                'Authorization': f'Bearer {token}',
                'X-API-Key': self.api_key
            }

            url = f"{self.base_url}/registration/{registration_number.replace(' ', '')}"
            response = requests.get(url, headers=headers)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error fetching vehicle details: {str(e)}")
            return None

    def check_mot_status(self, registration_number):
        """
        Check MOT status and return days until expiry
        """
        vehicle_data = self.get_vehicle_details(registration_number)

        if not vehicle_data:
            return None

        try:
            # Get the most recent MOT test
            mot_tests = vehicle_data.get('motTests', [])
            if not mot_tests:
                return None

            latest_test = mot_tests[0]  # Most recent test is first in the list

            # Handle different date formats that the API might return
            expiry_date_str = latest_test['expiryDate']

            try:
                # Try the expected format first
                expiry_date = datetime.strptime(expiry_date_str, '%Y.%m.%d')
            except ValueError:
                try:
                    # Try alternative format
                    expiry_date = datetime.strptime(
                        expiry_date_str, '%Y-%m-%d')
                except ValueError:
                    try:
                        # If both fail, try ISO format
                        expiry_date = datetime.fromisoformat(
                            expiry_date_str.replace('Z', '+00:00'))
                    except ValueError:
                        print(
                            f"ERROR: Could not parse expiry date format: '{expiry_date_str}'")
                        return None

            today = datetime.now()
            days_until_expiry = (expiry_date - today).days

            # Format dates for display
            formatted_expiry = format_date_for_display(
                latest_test['expiryDate'])
            formatted_completed = format_date_for_display(
                latest_test.get('completedDate', 'Unknown'))

            return {
                'registration': registration_number,
                'make': vehicle_data.get('make', 'Unknown'),
                'model': vehicle_data.get('model', 'Unknown'),
                'mot_expiry_date': formatted_expiry,
                'days_until_expiry': days_until_expiry,
                'is_expired': days_until_expiry < 0,
                'last_test_date': formatted_completed,
                'test_result': latest_test.get('testResult', 'Unknown')
            }
        except Exception as e:
            print(f"Error processing MOT data: {str(e)}")
            return None

    def send_reminder(self, vehicle_info):
        """
        Send reminder for MOT expiry
        """
        if vehicle_info['days_until_expiry'] <= 30 and not vehicle_info['is_expired']:
            print(f"\nMOT Reminder for {vehicle_info['registration']}:")
            print(f"Vehicle: {vehicle_info['make']} {vehicle_info['model']}")
            print(f"MOT expires in {vehicle_info['days_until_expiry']} days")
            print(f"Expiry date: {vehicle_info['mot_expiry_date']}")
            print(f"Last test date: {vehicle_info['last_test_date']}")
            print(f"Last test result: {vehicle_info['test_result']}")
            print("Please book your MOT test soon!\n")
        elif vehicle_info['is_expired']:
            print(f"\nURGENT: MOT EXPIRED for {vehicle_info['registration']}")
            print(f"Vehicle: {vehicle_info['make']} {vehicle_info['model']}")
            print(f"MOT expired on {vehicle_info['mot_expiry_date']}")
            print(f"Last test date: {vehicle_info['last_test_date']}")
            print(f"Last test result: {vehicle_info['test_result']}")
            print("Please book your MOT test immediately!\n")


def main():
    # Create .env file if it doesn't exist
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write('''CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
API_KEY=your_api_key_here
TOKEN_URL=your_token_url_here''')
        print("Created .env file. Please add your credentials.")
        return

    reminder = MOTReminder()

    # Example usage
    def check_vehicles():
        # Add your vehicle registration numbers here
        vehicles = ['AB12CDE']  # Replace with actual registration numbers

        for reg in vehicles:
            vehicle_info = reminder.check_mot_status(reg)
            if vehicle_info:
                reminder.send_reminder(vehicle_info)

    # Schedule daily checks
    schedule.every().day.at("09:00").do(check_vehicles)

    print("MOT Reminder Service Started")
    print("Checking vehicles daily at 09:00")

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
