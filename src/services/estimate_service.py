"""
Estimate service for business logic operations.
"""
from models import Estimate, Job, Customer, Vehicle, db
from utils.exceptions import ValidationError, NotFoundError, DuplicateError
from utils.validators import validate_required_fields
from utils.search_utils import SearchHelper
from datetime import datetime, timedelta
import uuid


class EstimateService:
    """Service class for estimate operations."""
    
    @staticmethod
    def get_all_estimates(page=1, per_page=20, search=None, customer_id=None, vehicle_id=None, status=None):
        """
        Get all estimates with pagination and search.
        
        Args:
            page: Page number
            per_page: Items per page
            search: Search query
            customer_id: Filter by customer ID
            vehicle_id: Filter by vehicle ID
            status: Filter by estimate status
            
        Returns:
            dict: Paginated estimate data
        """
        query = Estimate.query
        
        # Apply filters
        if customer_id:
            query = query.filter(Estimate.customer_id == customer_id)
        
        if vehicle_id:
            query = query.filter(Estimate.vehicle_id == vehicle_id)
        
        if status:
            query = query.filter(Estimate.status == status)
        
        # Apply search
        if search:
            search_pattern = f'%{search}%'
            query = query.filter(
                db.or_(
                    Estimate.estimate_number.ilike(search_pattern),
                    Estimate.description.ilike(search_pattern),
                    Estimate.status.ilike(search_pattern)
                )
            )
        
        # Apply sorting
        query = query.order_by(Estimate.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Format results with related data
        estimates_data = []
        for estimate in pagination.items:
            estimate_dict = estimate.to_dict()
            
            # Add related data
            if estimate.vehicle:
                estimate_dict['vehicle'] = {
                    'id': estimate.vehicle.id,
                    'registration': estimate.vehicle.registration,
                    'make': estimate.vehicle.make,
                    'model': estimate.vehicle.model
                }
            
            if estimate.customer:
                estimate_dict['customer'] = {
                    'id': estimate.customer.id,
                    'name': estimate.customer.name,
                    'company': estimate.customer.company
                }
            
            if estimate.job:
                estimate_dict['job'] = {
                    'id': estimate.job.id,
                    'job_number': estimate.job.job_number,
                    'description': estimate.job.description
                }
            
            # Add status information
            estimate_dict['is_expired'] = EstimateService._is_estimate_expired(estimate)
            
            estimates_data.append(estimate_dict)
        
        return {
            'estimates': estimates_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    
    @staticmethod
    def get_estimate_by_id(estimate_id):
        """
        Get estimate by ID with related data.
        
        Args:
            estimate_id: Estimate ID
            
        Returns:
            dict: Estimate data with related information
            
        Raises:
            NotFoundError: If estimate not found
        """
        estimate = Estimate.get_by_id(estimate_id)
        if not estimate:
            raise NotFoundError('Estimate', estimate_id)
        
        estimate_data = estimate.to_dict()
        
        # Add related data
        if estimate.vehicle:
            estimate_data['vehicle'] = estimate.vehicle.to_dict()
        
        if estimate.customer:
            estimate_data['customer'] = estimate.customer.to_dict()
        
        if estimate.job:
            estimate_data['job'] = estimate.job.to_dict()
        
        # Add status information
        estimate_data['is_expired'] = EstimateService._is_estimate_expired(estimate)
        
        return estimate_data
    
    @staticmethod
    def create_estimate(data):
        """
        Create a new estimate.
        
        Args:
            data: Estimate data dictionary
            
        Returns:
            Estimate: Created estimate object
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate required fields
        required_fields = ['description', 'customer_id', 'total_amount']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        if not is_valid:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate customer exists
        customer = Customer.get_by_id(data['customer_id'])
        if not customer:
            raise ValidationError("Invalid customer ID", field='customer_id')
        
        # Validate vehicle if provided
        if data.get('vehicle_id'):
            vehicle = Vehicle.get_by_id(data['vehicle_id'])
            if not vehicle:
                raise ValidationError("Invalid vehicle ID", field='vehicle_id')
        
        # Validate job if provided
        if data.get('job_id'):
            job = Job.get_by_id(data['job_id'])
            if not job:
                raise ValidationError("Invalid job ID", field='job_id')
        
        try:
            # Generate estimate number if not provided
            if not data.get('estimate_number'):
                data['estimate_number'] = EstimateService._generate_estimate_number()
            
            # Set default status if not provided
            if not data.get('status'):
                data['status'] = 'draft'
            
            # Set default valid_until date if not provided (30 days from now)
            if not data.get('valid_until'):
                data['valid_until'] = datetime.now().date() + timedelta(days=30)
            
            estimate = Estimate.create(**data)
            return estimate
            
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to create estimate: {str(e)}")
    
    @staticmethod
    def update_estimate(estimate_id, data):
        """
        Update estimate information.
        
        Args:
            estimate_id: Estimate ID
            data: Updated estimate data
            
        Returns:
            Estimate: Updated estimate object
            
        Raises:
            NotFoundError: If estimate not found
            ValidationError: If validation fails
        """
        estimate = Estimate.get_by_id(estimate_id)
        if not estimate:
            raise NotFoundError('Estimate', estimate_id)
        
        # Validate customer if provided
        if 'customer_id' in data and data['customer_id']:
            customer = Customer.get_by_id(data['customer_id'])
            if not customer:
                raise ValidationError("Invalid customer ID", field='customer_id')
        
        # Validate vehicle if provided
        if 'vehicle_id' in data and data['vehicle_id']:
            vehicle = Vehicle.get_by_id(data['vehicle_id'])
            if not vehicle:
                raise ValidationError("Invalid vehicle ID", field='vehicle_id')
        
        # Validate job if provided
        if 'job_id' in data and data['job_id']:
            job = Job.get_by_id(data['job_id'])
            if not job:
                raise ValidationError("Invalid job ID", field='job_id')
        
        try:
            estimate.update(**data)
            return estimate
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to update estimate: {str(e)}")
    
    @staticmethod
    def delete_estimate(estimate_id):
        """
        Delete an estimate.
        
        Args:
            estimate_id: Estimate ID
            
        Raises:
            NotFoundError: If estimate not found
            ValidationError: If estimate has associated records
        """
        estimate = Estimate.get_by_id(estimate_id)
        if not estimate:
            raise NotFoundError('Estimate', estimate_id)
        
        # Check if estimate has associated invoices
        if estimate.invoices:
            raise ValidationError("Cannot delete estimate with associated invoices")
        
        try:
            estimate.delete()
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to delete estimate: {str(e)}")
    
    @staticmethod
    def get_estimates_by_status(status):
        """
        Get estimates by status.
        
        Args:
            status: Estimate status
            
        Returns:
            list: List of estimates with the specified status
        """
        return Estimate.query.filter_by(status=status).order_by(Estimate.created_at.desc()).all()
    
    @staticmethod
    def get_expired_estimates():
        """
        Get all expired estimates.
        
        Returns:
            list: List of expired estimates
        """
        today = datetime.now().date()
        return Estimate.query.filter(Estimate.valid_until < today).all()
    
    @staticmethod
    def _generate_estimate_number():
        """
        Generate a unique estimate number.
        
        Returns:
            str: Unique estimate number
        """
        # Generate estimate number with current date and random suffix
        date_str = datetime.now().strftime('%Y%m%d')
        random_suffix = str(uuid.uuid4())[:8].upper()
        estimate_number = f"EST-{date_str}-{random_suffix}"
        
        # Ensure uniqueness
        while Estimate.query.filter_by(estimate_number=estimate_number).first():
            random_suffix = str(uuid.uuid4())[:8].upper()
            estimate_number = f"EST-{date_str}-{random_suffix}"
        
        return estimate_number
    
    @staticmethod
    def _is_estimate_expired(estimate):
        """
        Check if an estimate is expired.
        
        Args:
            estimate: Estimate object
            
        Returns:
            bool: True if expired, False otherwise
        """
        if not estimate.valid_until:
            return False
        
        today = datetime.now().date()
        return estimate.valid_until < today
