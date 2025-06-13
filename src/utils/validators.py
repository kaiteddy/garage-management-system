"""
Validation utility functions for the Garage Management System.
"""
import re


def validate_email(email):
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone):
    """
    Validate UK phone number format.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not phone:
        return False
    
    # Remove spaces, dashes, and parentheses
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    
    # UK phone number patterns
    patterns = [
        r'^(\+44|0044|44)?[1-9]\d{8,9}$',  # Standard UK numbers
        r'^(\+44|0044|44)?7\d{9}$',        # Mobile numbers
        r'^(\+44|0044|44)?20\d{8}$',       # London numbers
    ]
    
    return any(re.match(pattern, cleaned) for pattern in patterns)


def validate_registration(registration):
    """
    Validate UK vehicle registration format.
    
    Args:
        registration: Registration number to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not registration:
        return False
    
    # Remove spaces and convert to uppercase
    cleaned = registration.replace(' ', '').upper()
    
    # UK registration patterns
    patterns = [
        r'^[A-Z]{2}\d{2}[A-Z]{3}$',     # Current format (AB12 CDE)
        r'^[A-Z]\d{1,3}[A-Z]{3}$',     # Prefix format (A123 BCD)
        r'^[A-Z]{3}\d{1,3}[A-Z]$',     # Suffix format (ABC 123D)
        r'^[A-Z]{1,3}\d{1,4}$',        # Dateless format (AB 1234)
    ]
    
    return any(re.match(pattern, cleaned) for pattern in patterns)


def validate_postcode(postcode):
    """
    Validate UK postcode format.
    
    Args:
        postcode: Postcode to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not postcode:
        return False
    
    # Remove spaces and convert to uppercase
    cleaned = postcode.replace(' ', '').upper()
    
    # UK postcode pattern
    pattern = r'^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$'
    
    return bool(re.match(pattern, cleaned))


def validate_required_fields(data, required_fields):
    """
    Validate that required fields are present and not empty.
    
    Args:
        data: Dictionary of data to validate
        required_fields: List of required field names
        
    Returns:
        tuple: (is_valid, missing_fields)
    """
    missing_fields = []
    
    for field in required_fields:
        if field not in data or not data[field] or str(data[field]).strip() == '':
            missing_fields.append(field)
    
    return len(missing_fields) == 0, missing_fields


def sanitize_string(value, max_length=None):
    """
    Sanitize string input by trimming whitespace and limiting length.
    
    Args:
        value: String value to sanitize
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized string
    """
    if not value:
        return ''
    
    sanitized = str(value).strip()
    
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def normalize_registration(registration):
    """
    Normalize vehicle registration format.
    
    Args:
        registration: Registration number to normalize
        
    Returns:
        str: Normalized registration number
    """
    if not registration:
        return ''
    
    # Remove spaces and convert to uppercase
    normalized = registration.replace(' ', '').upper()
    
    # Add space for current format (AB12CDE -> AB12 CDE)
    if len(normalized) == 7 and normalized[:2].isalpha() and normalized[2:4].isdigit():
        normalized = f"{normalized[:4]} {normalized[4:]}"
    
    return normalized
