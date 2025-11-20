"""Data validation utilities."""
from typing import Any, Dict, List, Optional, Tuple, Union
import re
from datetime import datetime
from decimal import Decimal


class ValidationError(Exception):
    """Raised when validation fails."""
    def __init__(self, field: str, message: str, value: Any = None):
        self.field = field
        self.message = message
        self.value = value
        super().__init__(f"{field}: {message} (value: {value})")


def validate_required(field: str, value: Any) -> Optional[ValidationError]:
    """Validate that a required field is not empty."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return ValidationError(field, "Field is required")
    return None


def validate_type(field: str, value: Any, expected_type: type) -> Optional[ValidationError]:
    """Validate that a value is of the expected type."""
    if value is None:
        return None
    
    if not isinstance(value, expected_type):
        try:
            # Try to convert to the expected type
            if expected_type == int:
                int(value)
            elif expected_type == float:
                float(value)
            elif expected_type == Decimal:
                Decimal(str(value))
            elif expected_type == datetime:
                if not isinstance(value, str):
                    raise ValueError("Expected string for datetime")
                # Try common date formats
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
                    try:
                        datetime.strptime(value, fmt)
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError("Invalid date format")
        except (ValueError, TypeError) as e:
            return ValidationError(
                field, 
                f"Expected {expected_type.__name__}, got {type(value).__name__}",
                value
            )
    return None


def validate_regex(field: str, value: Any, pattern: str) -> Optional[ValidationError]:
    """Validate that a string matches a regex pattern."""
    if value is None:
        return None
    
    if not re.match(pattern, str(value)):
        return ValidationError(
            field,
            f"Value does not match pattern: {pattern}",
            value
        )
    return None


def validate_in(field: str, value: Any, allowed_values: list) -> Optional[ValidationError]:
    """Validate that a value is in the allowed values list."""
    if value is None:
        return None
    
    if value not in allowed_values:
        return ValidationError(
            field,
            f"Value must be one of {allowed_values}",
            value
        )
    return None


def validate_length(
    field: str, 
    value: Any, 
    min_length: int = None, 
    max_length: int = None
) -> Optional[ValidationError]:
    """Validate the length of a string or collection."""
    if value is None:
        return None
    
    length = len(str(value)) if not hasattr(value, '__len__') else len(value)
    
    if min_length is not None and length < min_length:
        return ValidationError(
            field,
            f"Length must be at least {min_length} characters",
            value
        )
    
    if max_length is not None and length > max_length:
        return ValidationError(
            field,
            f"Length must be at most {max_length} characters",
            value
        )
    
    return None


class RecordValidator:
    """Validates records against a set of rules."""
    
    def __init__(self, rules: Dict[str, list] = None):
        """Initialize with validation rules.
        
        Args:
            rules: A dictionary mapping field names to lists of validation rules.
                  Each rule is a tuple of (validator_function, *args, **kwargs).
        """
        self.rules = rules or {}
    
    def add_rule(self, field: str, *validators):
        """Add validation rules for a field."""
        if field not in self.rules:
            self.rules[field] = []
        self.rules[field].extend(validators)
    
    def validate(self, record: dict) -> List[ValidationError]:
        """Validate a record against the rules."""
        errors = []
        
        for field, validators in self.rules.items():
            value = record.get(field)
            
            for validator in validators:
                if callable(validator):
                    error = validator(field, value)
                elif isinstance(validator, (list, tuple)) and callable(validator[0]):
                    validator_func = validator[0]
                    args = validator[1:] if len(validator) > 1 else []
                    error = validator_func(field, value, *args)
                else:
                    continue
                
                if error:
                    errors.append(error)
                    break  # Stop after first error per field
        
        return errors
    
    def is_valid(self, record: dict) -> Tuple[bool, List[ValidationError]]:
        """Check if a record is valid and return any errors."""
        errors = self.validate(record)
        return len(errors) == 0, errors
