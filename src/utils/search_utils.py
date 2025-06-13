"""
Search utilities for consistent search functionality across the application.
"""
from sqlalchemy import or_, and_
from models import db


class SearchHelper:
    """Helper class for building search queries."""
    
    @staticmethod
    def build_customer_search_query(base_query, search_term):
        """
        Build search query for customers.
        
        Args:
            base_query: Base SQLAlchemy query
            search_term: Search term
            
        Returns:
            Modified query with search filters
        """
        if not search_term:
            return base_query
        
        search_pattern = f'%{search_term}%'
        
        return base_query.filter(
            or_(
                db.Customer.name.ilike(search_pattern),
                db.Customer.company.ilike(search_pattern),
                db.Customer.email.ilike(search_pattern),
                db.Customer.phone.ilike(search_pattern),
                db.Customer.mobile.ilike(search_pattern),
                db.Customer.account_number.ilike(search_pattern),
                db.Customer.address_line1.ilike(search_pattern),
                db.Customer.address_line2.ilike(search_pattern),
                db.Customer.city.ilike(search_pattern),
                db.Customer.postcode.ilike(search_pattern)
            )
        )
    
    @staticmethod
    def build_vehicle_search_query(base_query, search_term):
        """
        Build search query for vehicles.
        
        Args:
            base_query: Base SQLAlchemy query
            search_term: Search term
            
        Returns:
            Modified query with search filters
        """
        if not search_term:
            return base_query
        
        search_pattern = f'%{search_term}%'
        
        return base_query.filter(
            or_(
                db.Vehicle.registration.ilike(search_pattern),
                db.Vehicle.make.ilike(search_pattern),
                db.Vehicle.model.ilike(search_pattern),
                db.Vehicle.color.ilike(search_pattern),
                db.Vehicle.fuel_type.ilike(search_pattern)
            )
        )
    
    @staticmethod
    def build_job_search_query(base_query, search_term):
        """
        Build search query for jobs.
        
        Args:
            base_query: Base SQLAlchemy query
            search_term: Search term
            
        Returns:
            Modified query with search filters
        """
        if not search_term:
            return base_query
        
        search_pattern = f'%{search_term}%'
        
        return base_query.filter(
            or_(
                db.Job.job_number.ilike(search_pattern),
                db.Job.description.ilike(search_pattern),
                db.Job.status.ilike(search_pattern)
            )
        )
    
    @staticmethod
    def normalize_search_term(search_term):
        """
        Normalize search term for consistent searching.
        
        Args:
            search_term: Raw search term
            
        Returns:
            Normalized search term
        """
        if not search_term:
            return None
        
        # Strip whitespace and convert to lowercase
        normalized = search_term.strip().lower()
        
        # Remove extra spaces
        normalized = ' '.join(normalized.split())
        
        return normalized if normalized else None
    
    @staticmethod
    def build_advanced_search_filters(filters):
        """
        Build advanced search filters from a dictionary of criteria.
        
        Args:
            filters: Dictionary of search criteria
            
        Returns:
            List of SQLAlchemy filter conditions
        """
        conditions = []
        
        for field, value in filters.items():
            if not value:
                continue
                
            if field == 'date_from' and hasattr(db.Model, 'created_at'):
                conditions.append(db.Model.created_at >= value)
            elif field == 'date_to' and hasattr(db.Model, 'created_at'):
                conditions.append(db.Model.created_at <= value)
            elif field == 'status':
                conditions.append(db.Model.status == value)
            # Add more field-specific filters as needed
        
        return conditions
    
    @staticmethod
    def apply_sorting(query, sort_by=None, sort_order='desc'):
        """
        Apply sorting to a query.
        
        Args:
            query: SQLAlchemy query
            sort_by: Field to sort by
            sort_order: Sort order ('asc' or 'desc')
            
        Returns:
            Query with sorting applied
        """
        if not sort_by:
            # Default sorting by created_at if available
            if hasattr(query.column_descriptions[0]['type'], 'created_at'):
                sort_by = 'created_at'
            else:
                return query
        
        # Get the model class from the query
        model_class = query.column_descriptions[0]['type']
        
        if hasattr(model_class, sort_by):
            field = getattr(model_class, sort_by)
            if sort_order.lower() == 'asc':
                return query.order_by(field.asc())
            else:
                return query.order_by(field.desc())
        
        return query
