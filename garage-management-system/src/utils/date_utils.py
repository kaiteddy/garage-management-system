"""
Date utility functions for the Garage Management System.
"""
from datetime import datetime, date


def format_date_for_display(date_value):
    """
    Convert date from various formats to DD-MM-YYYY format for display.
    
    Args:
        date_value: Date string, date object, or datetime object
        
    Returns:
        str: Formatted date string in DD-MM-YYYY format or '-' if invalid
    """
    if not date_value or date_value == '-' or date_value == '':
        return '-'
    
    try:
        # Handle date objects
        if isinstance(date_value, date):
            return date_value.strftime('%d-%m-%Y')
        
        # Handle datetime objects
        if isinstance(date_value, datetime):
            return date_value.strftime('%d-%m-%Y')
        
        # Handle string dates
        if isinstance(date_value, str):
            # Handle YYYY-MM-DD format
            if '-' in date_value and len(date_value) == 10:
                date_obj = datetime.strptime(date_value, '%Y-%m-%d')
                return date_obj.strftime('%d-%m-%Y')
            
            # Handle DD-MM-YYYY format (already correct)
            elif '-' in date_value and len(date_value) == 10:
                # Validate it's a valid date
                datetime.strptime(date_value, '%d-%m-%Y')
                return date_value
            
            # Handle MM/DD/YYYY format
            elif '/' in date_value:
                date_obj = datetime.strptime(date_value, '%m/%d/%Y')
                return date_obj.strftime('%d-%m-%Y')
        
        return str(date_value)  # Return as-is if format is unrecognized
        
    except (ValueError, TypeError):
        return str(date_value) if date_value else '-'


def parse_date(date_string, input_format='%Y-%m-%d'):
    """
    Parse a date string into a date object.
    
    Args:
        date_string: Date string to parse
        input_format: Expected format of the input string
        
    Returns:
        date: Parsed date object or None if invalid
    """
    if not date_string or date_string == '-' or date_string == '':
        return None
    
    try:
        return datetime.strptime(date_string, input_format).date()
    except (ValueError, TypeError):
        # Try common formats
        formats = ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y']
        for fmt in formats:
            try:
                return datetime.strptime(date_string, fmt).date()
            except (ValueError, TypeError):
                continue
        return None


def is_date_expired(date_value, buffer_days=0):
    """
    Check if a date is expired (past today + buffer days).
    
    Args:
        date_value: Date to check
        buffer_days: Number of days to add as buffer
        
    Returns:
        bool: True if expired, False otherwise
    """
    if not date_value:
        return False
    
    try:
        check_date = date_value
        if isinstance(date_value, str):
            check_date = parse_date(date_value)
        
        if not check_date:
            return False
        
        from datetime import timedelta
        threshold_date = date.today() + timedelta(days=buffer_days)
        return check_date < threshold_date
        
    except (ValueError, TypeError):
        return False


def get_date_status(date_value, warning_days=30):
    """
    Get status of a date (expired, warning, valid).
    
    Args:
        date_value: Date to check
        warning_days: Days before expiry to show warning
        
    Returns:
        str: 'expired', 'warning', 'valid', or 'unknown'
    """
    if not date_value:
        return 'unknown'
    
    try:
        check_date = date_value
        if isinstance(date_value, str):
            check_date = parse_date(date_value)
        
        if not check_date:
            return 'unknown'
        
        today = date.today()
        from datetime import timedelta
        warning_date = today + timedelta(days=warning_days)
        
        if check_date < today:
            return 'expired'
        elif check_date <= warning_date:
            return 'warning'
        else:
            return 'valid'
            
    except (ValueError, TypeError):
        return 'unknown'
