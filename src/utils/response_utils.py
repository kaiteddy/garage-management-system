"""
Response utilities for standardized API responses.
"""
from flask import jsonify
from utils.date_utils import format_date_for_display


class ResponseFormatter:
    """Utility class for formatting API responses."""
    
    @staticmethod
    def success(data=None, message=None, status_code=200):
        """
        Create a standardized success response.
        
        Args:
            data: Response data
            message: Success message
            status_code: HTTP status code
            
        Returns:
            Flask response object
        """
        response = {'status': 'success'}
        
        if data is not None:
            response['data'] = data
        if message:
            response['message'] = message
            
        return jsonify(response), status_code
    
    @staticmethod
    def error(message, error_code=None, status_code=400):
        """
        Create a standardized error response.
        
        Args:
            message: Error message
            error_code: Application-specific error code
            status_code: HTTP status code
            
        Returns:
            Flask response object
        """
        response = {
            'status': 'error',
            'message': message
        }
        
        if error_code:
            response['error_code'] = error_code
            
        return jsonify(response), status_code
    
    @staticmethod
    def format_vehicle_data(vehicle_data):
        """
        Format vehicle data for API response.
        
        Args:
            vehicle_data: Vehicle data dictionary or list
            
        Returns:
            Formatted vehicle data
        """
        if isinstance(vehicle_data, list):
            return [ResponseFormatter._format_single_vehicle(v) for v in vehicle_data]
        else:
            return ResponseFormatter._format_single_vehicle(vehicle_data)
    
    @staticmethod
    def _format_single_vehicle(vehicle_data):
        """Format a single vehicle's data."""
        if isinstance(vehicle_data, dict):
            formatted = vehicle_data.copy()
        else:
            # Assume it's a model object
            formatted = vehicle_data.to_dict()
        
        # Format dates for display
        formatted['mot_due'] = format_date_for_display(formatted.get('mot_expiry'))
        formatted['tax_due'] = format_date_for_display(formatted.get('tax_due'))
        
        return formatted
    
    @staticmethod
    def format_customer_data(customer_data):
        """
        Format customer data for API response.
        
        Args:
            customer_data: Customer data dictionary or list
            
        Returns:
            Formatted customer data
        """
        if isinstance(customer_data, list):
            return [ResponseFormatter._format_single_customer(c) for c in customer_data]
        else:
            return ResponseFormatter._format_single_customer(customer_data)
    
    @staticmethod
    def _format_single_customer(customer_data):
        """Format a single customer's data."""
        if isinstance(customer_data, dict):
            return customer_data.copy()
        else:
            # Assume it's a model object
            return customer_data.to_dict()
    
    @staticmethod
    def paginated_response(items, total, page, per_page, has_next, has_prev, formatter=None):
        """
        Create a standardized paginated response.
        
        Args:
            items: List of items
            total: Total number of items
            page: Current page number
            per_page: Items per page
            has_next: Whether there's a next page
            has_prev: Whether there's a previous page
            formatter: Optional formatter function for items
            
        Returns:
            Formatted paginated response
        """
        if formatter:
            items = formatter(items)
        
        return {
            'items': items,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'pages': (total + per_page - 1) // per_page,
                'has_next': has_next,
                'has_prev': has_prev
            }
        }
