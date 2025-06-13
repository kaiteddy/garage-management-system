"""
Job service for business logic operations.
"""
from models import Job, Customer, Vehicle, db
from utils.exceptions import ValidationError, NotFoundError, DuplicateError
from utils.validators import validate_required_fields
from utils.search_utils import SearchHelper
from utils.pagination_utils import PaginationHelper
from datetime import datetime
import uuid


class JobService:
    """Service class for job operations."""
    
    @staticmethod
    def get_all_jobs(page=1, per_page=20, search=None, customer_id=None, vehicle_id=None, status=None):
        """
        Get all jobs with pagination and search.
        
        Args:
            page: Page number
            per_page: Items per page
            search: Search query
            customer_id: Filter by customer ID
            vehicle_id: Filter by vehicle ID
            status: Filter by job status
            
        Returns:
            dict: Paginated job data
        """
        query = Job.query
        
        # Apply filters
        if customer_id:
            query = query.filter(Job.customer_id == customer_id)
        
        if vehicle_id:
            query = query.filter(Job.vehicle_id == vehicle_id)
        
        if status:
            query = query.filter(Job.status == status)
        
        # Apply search
        if search:
            query = SearchHelper.build_job_search_query(query, search)
        
        # Apply sorting
        query = query.order_by(Job.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Format results with related data
        jobs_data = []
        for job in pagination.items:
            job_dict = job.to_dict()
            
            # Add related data
            if job.vehicle:
                job_dict['vehicle'] = {
                    'id': job.vehicle.id,
                    'registration': job.vehicle.registration,
                    'make': job.vehicle.make,
                    'model': job.vehicle.model
                }
            
            if job.customer:
                job_dict['customer'] = {
                    'id': job.customer.id,
                    'name': job.customer.name,
                    'company': job.customer.company
                }
            
            # Add estimates and invoices count
            job_dict['estimates_count'] = len(job.estimates)
            job_dict['invoices_count'] = len(job.invoices)
            
            jobs_data.append(job_dict)
        
        return {
            'jobs': jobs_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    
    @staticmethod
    def get_job_by_id(job_id):
        """
        Get job by ID with related data.
        
        Args:
            job_id: Job ID
            
        Returns:
            dict: Job data with related information
            
        Raises:
            NotFoundError: If job not found
        """
        job = Job.get_by_id(job_id)
        if not job:
            raise NotFoundError('Job', job_id)
        
        job_data = job.to_dict()
        
        # Add related data
        if job.vehicle:
            job_data['vehicle'] = job.vehicle.to_dict()
        
        if job.customer:
            job_data['customer'] = job.customer.to_dict()
        
        # Add estimates and invoices
        job_data['estimates'] = [estimate.to_dict() for estimate in job.estimates]
        job_data['invoices'] = [invoice.to_dict() for invoice in job.invoices]
        
        return job_data
    
    @staticmethod
    def create_job(data):
        """
        Create a new job.
        
        Args:
            data: Job data dictionary
            
        Returns:
            Job: Created job object
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate required fields
        required_fields = ['description', 'customer_id']
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
        
        try:
            # Generate job number if not provided
            if not data.get('job_number'):
                data['job_number'] = JobService._generate_job_number()
            
            # Set default status if not provided
            if not data.get('status'):
                data['status'] = 'pending'
            
            # Set default total amount if not provided
            if not data.get('total_amount'):
                data['total_amount'] = 0.0
            
            job = Job.create(**data)
            return job
            
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to create job: {str(e)}")
    
    @staticmethod
    def update_job(job_id, data):
        """
        Update job information.
        
        Args:
            job_id: Job ID
            data: Updated job data
            
        Returns:
            Job: Updated job object
            
        Raises:
            NotFoundError: If job not found
            ValidationError: If validation fails
        """
        job = Job.get_by_id(job_id)
        if not job:
            raise NotFoundError('Job', job_id)
        
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
        
        try:
            job.update(**data)
            return job
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to update job: {str(e)}")
    
    @staticmethod
    def delete_job(job_id):
        """
        Delete a job.
        
        Args:
            job_id: Job ID
            
        Raises:
            NotFoundError: If job not found
            ValidationError: If job has associated records
        """
        job = Job.get_by_id(job_id)
        if not job:
            raise NotFoundError('Job', job_id)
        
        # Check if job has associated estimates or invoices
        if job.estimates or job.invoices:
            raise ValidationError("Cannot delete job with associated estimates or invoices")
        
        try:
            job.delete()
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to delete job: {str(e)}")
    
    @staticmethod
    def get_jobs_by_status(status):
        """
        Get jobs by status.
        
        Args:
            status: Job status
            
        Returns:
            list: List of jobs with the specified status
        """
        return Job.query.filter_by(status=status).order_by(Job.created_at.desc()).all()
    
    @staticmethod
    def _generate_job_number():
        """
        Generate a unique job number.
        
        Returns:
            str: Unique job number
        """
        # Generate job number with current date and random suffix
        date_str = datetime.now().strftime('%Y%m%d')
        random_suffix = str(uuid.uuid4())[:8].upper()
        job_number = f"JOB-{date_str}-{random_suffix}"
        
        # Ensure uniqueness
        while Job.query.filter_by(job_number=job_number).first():
            random_suffix = str(uuid.uuid4())[:8].upper()
            job_number = f"JOB-{date_str}-{random_suffix}"
        
        return job_number
