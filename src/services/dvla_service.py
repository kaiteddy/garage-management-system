"""
DVLA service for vehicle data retrieval.
"""
import requests
from datetime import datetime
from flask import current_app
from utils.exceptions import DVLAError


class DVLAService:
    """Service for interacting with DVLA API."""
    
    BASE_URL = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles"
    
    @classmethod
    def fetch_vehicle_data(cls, registration):
        """
        Fetch vehicle data from DVLA API.
        
        Args:
            registration: Vehicle registration number
            
        Returns:
            dict: Vehicle data from DVLA or None if failed
            
        Raises:
            DVLAError: If API request fails
        """
        try:
            # Get API key from configuration
            api_key = current_app.config.get('DVLA_API_KEY')
            if not api_key or api_key == 'your-dvla-api-key-here':
                current_app.logger.warning("DVLA API key not configured")
                return None
            
            # Prepare request
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json"
            }
            
            data = {
                "registrationNumber": registration.upper().replace(' ', '')
            }
            
            # Make API request
            response = requests.post(cls.BASE_URL, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                vehicle_data = response.json()
                return cls._process_vehicle_data(vehicle_data)
            
            elif response.status_code == 404:
                current_app.logger.info(f"Vehicle not found in DVLA: {registration}")
                return None
            
            else:
                error_msg = f"DVLA API error: {response.status_code}"
                if response.text:
                    error_msg += f" - {response.text}"
                
                current_app.logger.error(error_msg)
                raise DVLAError(error_msg, response.status_code)
                
        except requests.exceptions.Timeout:
            error_msg = "DVLA API request timed out"
            current_app.logger.error(error_msg)
            raise DVLAError(error_msg)
            
        except requests.exceptions.RequestException as e:
            error_msg = f"DVLA API request failed: {str(e)}"
            current_app.logger.error(error_msg)
            raise DVLAError(error_msg)
            
        except Exception as e:
            error_msg = f"Unexpected error fetching DVLA data: {str(e)}"
            current_app.logger.error(error_msg)
            raise DVLAError(error_msg)
    
    @classmethod
    def _process_vehicle_data(cls, raw_data):
        """
        Process raw DVLA data into standardized format.
        
        Args:
            raw_data: Raw data from DVLA API
            
        Returns:
            dict: Processed vehicle data
        """
        try:
            processed_data = {
                'make': raw_data.get('make'),
                'model': raw_data.get('model'),
                'year': raw_data.get('yearOfManufacture'),
                'color': raw_data.get('colour'),
                'fuel_type': raw_data.get('fuelType'),
                'mot_expiry': None,
                'tax_due': None
            }
            
            # Process MOT expiry date
            mot_date = raw_data.get('motExpiryDate')
            if mot_date:
                try:
                    processed_data['mot_expiry'] = datetime.strptime(mot_date, '%Y-%m-%d').date()
                except ValueError:
                    current_app.logger.warning(f"Invalid MOT date format: {mot_date}")
            
            # Process tax due date
            tax_date = raw_data.get('taxDueDate')
            if tax_date:
                try:
                    processed_data['tax_due'] = datetime.strptime(tax_date, '%Y-%m-%d').date()
                except ValueError:
                    current_app.logger.warning(f"Invalid tax date format: {tax_date}")
            
            return processed_data
            
        except Exception as e:
            current_app.logger.error(f"Error processing DVLA data: {str(e)}")
            return None
    
    @classmethod
    def is_api_available(cls):
        """
        Check if DVLA API is available and configured.
        
        Returns:
            bool: True if API is available, False otherwise
        """
        try:
            api_key = current_app.config.get('DVLA_API_KEY')
            return api_key and api_key != 'your-dvla-api-key-here'
        except Exception:
            return False
    
    @classmethod
    def validate_registration(cls, registration):
        """
        Validate registration format before API call.
        
        Args:
            registration: Registration number to validate
            
        Returns:
            bool: True if format is valid, False otherwise
        """
        if not registration:
            return False
        
        # Remove spaces and convert to uppercase
        cleaned = registration.replace(' ', '').upper()
        
        # Basic UK registration format validation
        import re
        patterns = [
            r'^[A-Z]{2}\d{2}[A-Z]{3}$',     # Current format (AB12 CDE)
            r'^[A-Z]\d{1,3}[A-Z]{3}$',     # Prefix format (A123 BCD)
            r'^[A-Z]{3}\d{1,3}[A-Z]$',     # Suffix format (ABC 123D)
            r'^[A-Z]{1,3}\d{1,4}$',        # Dateless format (AB 1234)
        ]
        
        return any(re.match(pattern, cleaned) for pattern in patterns)
