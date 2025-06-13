"""
Pagination utilities for consistent pagination handling.
"""
from flask import request


class PaginationHelper:
    """Helper class for handling pagination parameters and logic."""
    
    @staticmethod
    def get_pagination_params(default_per_page=20, max_per_page=100):
        """
        Extract and validate pagination parameters from request.
        
        Args:
            default_per_page: Default items per page
            max_per_page: Maximum allowed items per page
            
        Returns:
            tuple: (page, per_page) validated parameters
        """
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', default_per_page, type=int)
        
        # Ensure page is at least 1
        page = max(1, page)
        
        # Limit per_page to prevent abuse
        per_page = min(per_page, max_per_page)
        per_page = max(1, per_page)  # Ensure at least 1
        
        return page, per_page
    
    @staticmethod
    def get_search_params():
        """
        Extract search parameters from request.
        
        Returns:
            dict: Search parameters
        """
        search = request.args.get('search', '').strip()
        customer_id = request.args.get('customer_id', type=int)
        
        return {
            'search': search if search else None,
            'customer_id': customer_id
        }
    
    @staticmethod
    def format_pagination_result(pagination_obj, formatter=None):
        """
        Format SQLAlchemy pagination object into standardized response.
        
        Args:
            pagination_obj: SQLAlchemy pagination object
            formatter: Optional function to format items
            
        Returns:
            dict: Formatted pagination response
        """
        items = pagination_obj.items
        
        if formatter:
            items = [formatter(item) for item in items]
        else:
            items = [item.to_dict() if hasattr(item, 'to_dict') else item for item in items]
        
        return {
            'items': items,
            'pagination': {
                'total': pagination_obj.total,
                'page': pagination_obj.page,
                'per_page': pagination_obj.per_page,
                'pages': pagination_obj.pages,
                'has_next': pagination_obj.has_next,
                'has_prev': pagination_obj.has_prev,
                'next_num': pagination_obj.next_num,
                'prev_num': pagination_obj.prev_num
            }
        }
    
    @staticmethod
    def calculate_offset(page, per_page):
        """
        Calculate offset for manual pagination.
        
        Args:
            page: Page number (1-based)
            per_page: Items per page
            
        Returns:
            int: Offset for database query
        """
        return (page - 1) * per_page
    
    @staticmethod
    def create_pagination_info(total_items, page, per_page):
        """
        Create pagination info for manual pagination.
        
        Args:
            total_items: Total number of items
            page: Current page number
            per_page: Items per page
            
        Returns:
            dict: Pagination information
        """
        total_pages = (total_items + per_page - 1) // per_page
        
        return {
            'total': total_items,
            'page': page,
            'per_page': per_page,
            'pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1,
            'next_num': page + 1 if page < total_pages else None,
            'prev_num': page - 1 if page > 1 else None
        }
