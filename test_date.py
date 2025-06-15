from datetime import datetime

def format_date_for_display(date_string):
    """Convert date from YYYY-MM-DD to DD-MM-YYYY format for display"""
    if not date_string or date_string == '-' or date_string == '':
        return '-'
    
    try:
        # Parse the date string
        if '-' in date_string:
            # Handle YYYY-MM-DD format
            date_obj = datetime.strptime(date_string, '%Y-%m-%d')
        elif '/' in date_string:
            # Handle MM/DD/YYYY or DD/MM/YYYY format
            date_obj = datetime.strptime(date_string, '%m/%d/%Y')
        else:
            return date_string  # Return as-is if format is unrecognized
        
        # Format as DD-MM-YYYY
        return date_obj.strftime('%d-%m-%Y')
    except ValueError:
        return date_string  # Return original if parsing fails

# Test the function
print("Testing date formatting:")
print("2020-07-10 ->", format_date_for_display('2020-07-10'))
print("2021-01-13 ->", format_date_for_display('2021-01-13'))
print("2023-03-15 ->", format_date_for_display('2023-03-15'))
print("Empty string ->", format_date_for_display(''))
print("None ->", format_date_for_display(None)) 