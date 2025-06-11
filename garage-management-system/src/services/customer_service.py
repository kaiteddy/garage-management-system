"""
Customer service for business logic operations.
"""
from models import Customer, db
from utils.exceptions import ValidationError, NotFoundError, DuplicateError
from utils.validators import validate_email, validate_phone, validate_required_fields


class CustomerService:
    """Service class for customer operations."""
    
    @staticmethod
    def get_all_customers(page=1, per_page=20, search=None):
        """
        Get all customers with pagination and search.
        
        Args:
            page: Page number
            per_page: Items per page
            search: Search query
            
        Returns:
            dict: Paginated customer data
        """
        query = Customer.query
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                db.or_(
                    Customer.name.ilike(search_term),
                    Customer.company.ilike(search_term),
                    Customer.account_number.ilike(search_term),
                    Customer.email.ilike(search_term)
                )
            )
        
        query = query.order_by(Customer.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'customers': [customer.to_dict() for customer in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    
    @staticmethod
    def get_customer_by_id(customer_id):
        """
        Get customer by ID.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Customer: Customer object
            
        Raises:
            NotFoundError: If customer not found
        """
        customer = Customer.get_by_id(customer_id)
        if not customer:
            raise NotFoundError('Customer', customer_id)
        return customer
    
    @staticmethod
    def get_customer_by_account_number(account_number):
        """
        Get customer by account number.
        
        Args:
            account_number: Account number
            
        Returns:
            Customer: Customer object or None
        """
        return Customer.query.filter_by(account_number=account_number).first()
    
    @staticmethod
    def create_customer(data):
        """
        Create a new customer.
        
        Args:
            data: Customer data dictionary
            
        Returns:
            Customer: Created customer object
            
        Raises:
            ValidationError: If validation fails
            DuplicateError: If customer already exists
        """
        # Validate required fields
        required_fields = ['name']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        if not is_valid:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate email if provided
        if data.get('email') and not validate_email(data['email']):
            raise ValidationError("Invalid email format", field='email')
        
        # Validate phone if provided
        if data.get('phone') and not validate_phone(data['phone']):
            raise ValidationError("Invalid phone format", field='phone')
        
        # Validate mobile if provided
        if data.get('mobile') and not validate_phone(data['mobile']):
            raise ValidationError("Invalid mobile format", field='mobile')
        
        # Check for duplicate email
        if data.get('email'):
            existing = Customer.query.filter_by(email=data['email']).first()
            if existing:
                raise DuplicateError('Customer', 'email', data['email'])
        
        try:
            customer = Customer.create(**data)
            return customer
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to create customer: {str(e)}")
    
    @staticmethod
    def update_customer(customer_id, data):
        """
        Update customer information.
        
        Args:
            customer_id: Customer ID
            data: Updated customer data
            
        Returns:
            Customer: Updated customer object
            
        Raises:
            NotFoundError: If customer not found
            ValidationError: If validation fails
        """
        customer = CustomerService.get_customer_by_id(customer_id)
        
        # Validate email if provided
        if 'email' in data and data['email'] and not validate_email(data['email']):
            raise ValidationError("Invalid email format", field='email')
        
        # Validate phone if provided
        if 'phone' in data and data['phone'] and not validate_phone(data['phone']):
            raise ValidationError("Invalid phone format", field='phone')
        
        # Validate mobile if provided
        if 'mobile' in data and data['mobile'] and not validate_phone(data['mobile']):
            raise ValidationError("Invalid mobile format", field='mobile')
        
        # Check for duplicate email (excluding current customer)
        if 'email' in data and data['email']:
            existing = Customer.query.filter(
                Customer.email == data['email'],
                Customer.id != customer_id
            ).first()
            if existing:
                raise DuplicateError('Customer', 'email', data['email'])
        
        try:
            customer.update(**data)
            return customer
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to update customer: {str(e)}")
    
    @staticmethod
    def delete_customer(customer_id):
        """
        Delete a customer.
        
        Args:
            customer_id: Customer ID
            
        Raises:
            NotFoundError: If customer not found
            ValidationError: If customer has associated records
        """
        customer = CustomerService.get_customer_by_id(customer_id)
        
        # Check if customer has associated vehicles
        if customer.vehicles:
            raise ValidationError("Cannot delete customer with associated vehicles")
        
        # Check if customer has associated jobs
        if customer.jobs:
            raise ValidationError("Cannot delete customer with associated jobs")
        
        try:
            customer.delete()
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to delete customer: {str(e)}")
    
    @staticmethod
    def search_customers(query):
        """
        Search customers by various fields.
        
        Args:
            query: Search query
            
        Returns:
            list: List of matching customers
        """
        return Customer.search(query)
