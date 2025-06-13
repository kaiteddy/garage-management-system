"""
Custom exceptions for the Garage Management System.
"""


class GarageManagementError(Exception):
    """Base exception for garage management system."""
    
    def __init__(self, message, error_code=None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
    
    def to_dict(self):
        """Convert exception to dictionary for API responses."""
        return {
            'error': self.__class__.__name__,
            'message': self.message,
            'error_code': self.error_code
        }


class ValidationError(GarageManagementError):
    """Exception raised for validation errors."""
    
    def __init__(self, message, field=None, error_code='VALIDATION_ERROR'):
        super().__init__(message, error_code)
        self.field = field
    
    def to_dict(self):
        """Convert validation error to dictionary."""
        data = super().to_dict()
        if self.field:
            data['field'] = self.field
        return data


class DVLAError(GarageManagementError):
    """Exception raised for DVLA API errors."""
    
    def __init__(self, message, status_code=None, error_code='DVLA_ERROR'):
        super().__init__(message, error_code)
        self.status_code = status_code
    
    def to_dict(self):
        """Convert DVLA error to dictionary."""
        data = super().to_dict()
        if self.status_code:
            data['status_code'] = self.status_code
        return data


class DatabaseError(GarageManagementError):
    """Exception raised for database errors."""
    
    def __init__(self, message, error_code='DATABASE_ERROR'):
        super().__init__(message, error_code)


class NotFoundError(GarageManagementError):
    """Exception raised when a resource is not found."""
    
    def __init__(self, resource_type, resource_id, error_code='NOT_FOUND'):
        message = f"{resource_type} with ID {resource_id} not found"
        super().__init__(message, error_code)
        self.resource_type = resource_type
        self.resource_id = resource_id
    
    def to_dict(self):
        """Convert not found error to dictionary."""
        data = super().to_dict()
        data.update({
            'resource_type': self.resource_type,
            'resource_id': self.resource_id
        })
        return data


class DuplicateError(GarageManagementError):
    """Exception raised when trying to create a duplicate resource."""
    
    def __init__(self, resource_type, field, value, error_code='DUPLICATE_ERROR'):
        message = f"{resource_type} with {field} '{value}' already exists"
        super().__init__(message, error_code)
        self.resource_type = resource_type
        self.field = field
        self.value = value
    
    def to_dict(self):
        """Convert duplicate error to dictionary."""
        data = super().to_dict()
        data.update({
            'resource_type': self.resource_type,
            'field': self.field,
            'value': self.value
        })
        return data
