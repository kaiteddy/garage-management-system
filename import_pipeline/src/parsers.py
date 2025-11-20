"""Data parsing and type conversion utilities."""
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, Optional, Union
import re


def parse_decimal(value: Any) -> Optional[Decimal]:
    """Parse a value to Decimal, handling various string formats."""
    if value is None or value == '':
        return None
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    try:
        # Remove any currency symbols and thousands separators
        cleaned = re.sub(r'[^\d.-]', '', str(value).strip())
        return Decimal(cleaned) if cleaned else None
    except (ValueError, InvalidOperation):
        return None


def parse_date(value: Any, format: str = '%d/%m/%Y') -> Optional[str]:
    """Parse a date string to ISO format (YYYY-MM-DD)."""
    if not value:
        return None
    
    # If it's already a date object
    if hasattr(value, 'strftime'):
        return value.strftime('%Y-%m-%d')
    
    # Try parsing with the specified format
    try:
        date_obj = datetime.strptime(str(value).strip(), format)
        return date_obj.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        pass
    
    # Try some common formats as fallback
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d'):
        try:
            date_obj = datetime.strptime(str(value).strip(), fmt)
            return date_obj.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return None


def parse_bool(value: Any) -> Optional[bool]:
    """Parse a value to boolean."""
    if value is None or value == '':
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', 't', 'yes', 'y', '1', 'on')
    return bool(value)


def parse_int(value: Any) -> Optional[int]:
    """Parse a value to integer, handling empty strings and None."""
    if value is None or value == '':
        return None
    try:
        return int(float(str(value).strip().replace(',', '')))
    except (ValueError, TypeError):
        return None


def parse_text(value: Any) -> Optional[str]:
    """Parse a value to text, handling None and empty strings."""
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


# Map of type names to parser functions
PARSERS = {
    'decimal': parse_decimal,
    'date': parse_date,
    'boolean': parse_bool,
    'integer': parse_int,
    'text': parse_text,
    'string': parse_text,  # Alias for text
}


def get_parser(type_name: str) -> Callable:
    """Get a parser function by type name."""
    return PARSERS.get(type_name.lower(), parse_text)


def parse_value(value: Any, type_name: str) -> Any:
    """Parse a value using the specified type name."""
    parser = get_parser(type_name)
    return parser(value)


def clean_field_name(name: str) -> str:
    """Clean a field name to be a valid Python/PostgreSQL identifier."""
    # Replace spaces and special characters with underscores
    cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', str(name).strip())
    # Remove leading digits/underscores
    cleaned = re.sub(r'^[0-9_]+', '', cleaned)
    # Convert to lowercase
    return cleaned.lower()


def clean_record(record: dict, field_mapping: dict) -> dict:
    """Clean a record according to field mappings and type information."""
    cleaned = {}
    
    for csv_field, db_field in field_mapping.items():
        if csv_field in record:
            cleaned[db_field] = record[csv_field]
    
    return cleaned
