"""
Invoice service for business logic operations.
"""
from models import Invoice, Job, Estimate, Customer, Vehicle, db
from utils.exceptions import ValidationError, NotFoundError, DuplicateError
from utils.validators import validate_required_fields
from datetime import datetime
import uuid


class InvoiceService:
    """Service class for invoice operations."""
    
    @staticmethod
    def get_all_invoices(page=1, per_page=20, search=None, customer_id=None, vehicle_id=None, status=None):
        """
        Get all invoices with pagination and search.
        
        Args:
            page: Page number
            per_page: Items per page
            search: Search query
            customer_id: Filter by customer ID
            vehicle_id: Filter by vehicle ID
            status: Filter by invoice status
            
        Returns:
            dict: Paginated invoice data
        """
        query = Invoice.query
        
        # Apply filters
        if customer_id:
            query = query.filter(Invoice.customer_id == customer_id)
        
        if vehicle_id:
            query = query.filter(Invoice.vehicle_id == vehicle_id)
        
        if status:
            query = query.filter(Invoice.status == status)
        
        # Apply search
        if search:
            search_pattern = f'%{search}%'
            query = query.filter(
                db.or_(
                    Invoice.invoice_number.ilike(search_pattern),
                    Invoice.status.ilike(search_pattern)
                )
            )
        
        # Apply sorting
        query = query.order_by(Invoice.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Format results with related data
        invoices_data = []
        for invoice in pagination.items:
            invoice_dict = invoice.to_dict()
            
            # Add related data
            if invoice.vehicle:
                invoice_dict['vehicle'] = {
                    'id': invoice.vehicle.id,
                    'registration': invoice.vehicle.registration,
                    'make': invoice.vehicle.make,
                    'model': invoice.vehicle.model
                }
            
            if invoice.customer:
                invoice_dict['customer'] = {
                    'id': invoice.customer.id,
                    'name': invoice.customer.name,
                    'company': invoice.customer.company
                }
            
            if invoice.job:
                invoice_dict['job'] = {
                    'id': invoice.job.id,
                    'job_number': invoice.job.job_number,
                    'description': invoice.job.description
                }
            
            if invoice.estimate:
                invoice_dict['estimate'] = {
                    'id': invoice.estimate.id,
                    'estimate_number': invoice.estimate.estimate_number
                }
            
            invoices_data.append(invoice_dict)
        
        return {
            'invoices': invoices_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    
    @staticmethod
    def get_invoice_by_id(invoice_id):
        """
        Get invoice by ID with related data.
        
        Args:
            invoice_id: Invoice ID
            
        Returns:
            dict: Invoice data with related information
            
        Raises:
            NotFoundError: If invoice not found
        """
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            raise NotFoundError('Invoice', invoice_id)
        
        invoice_data = invoice.to_dict()
        
        # Add related data
        if invoice.vehicle:
            invoice_data['vehicle'] = invoice.vehicle.to_dict()
        
        if invoice.customer:
            invoice_data['customer'] = invoice.customer.to_dict()
        
        if invoice.job:
            invoice_data['job'] = invoice.job.to_dict()
        
        if invoice.estimate:
            invoice_data['estimate'] = invoice.estimate.to_dict()
        
        return invoice_data
    
    @staticmethod
    def create_invoice(data):
        """
        Create a new invoice.
        
        Args:
            data: Invoice data dictionary
            
        Returns:
            Invoice: Created invoice object
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate required fields
        required_fields = ['customer_id', 'amount']
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
        
        # Validate estimate if provided
        if data.get('estimate_id'):
            estimate = Estimate.get_by_id(data['estimate_id'])
            if not estimate:
                raise ValidationError("Invalid estimate ID", field='estimate_id')
        
        # Validate amount is positive
        if data['amount'] <= 0:
            raise ValidationError("Invoice amount must be positive", field='amount')
        
        try:
            # Generate invoice number if not provided
            if not data.get('invoice_number'):
                data['invoice_number'] = InvoiceService._generate_invoice_number()
            
            # Set default status if not provided
            if not data.get('status'):
                data['status'] = 'pending'
            
            invoice = Invoice.create(**data)
            return invoice
            
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to create invoice: {str(e)}")
    
    @staticmethod
    def update_invoice(invoice_id, data):
        """
        Update invoice information.
        
        Args:
            invoice_id: Invoice ID
            data: Updated invoice data
            
        Returns:
            Invoice: Updated invoice object
            
        Raises:
            NotFoundError: If invoice not found
            ValidationError: If validation fails
        """
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            raise NotFoundError('Invoice', invoice_id)
        
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
        
        # Validate estimate if provided
        if 'estimate_id' in data and data['estimate_id']:
            estimate = Estimate.get_by_id(data['estimate_id'])
            if not estimate:
                raise ValidationError("Invalid estimate ID", field='estimate_id')
        
        # Validate amount if provided
        if 'amount' in data and data['amount'] <= 0:
            raise ValidationError("Invoice amount must be positive", field='amount')
        
        try:
            invoice.update(**data)
            return invoice
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to update invoice: {str(e)}")
    
    @staticmethod
    def delete_invoice(invoice_id):
        """
        Delete an invoice.
        
        Args:
            invoice_id: Invoice ID
            
        Raises:
            NotFoundError: If invoice not found
            ValidationError: If invoice cannot be deleted
        """
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            raise NotFoundError('Invoice', invoice_id)
        
        # Check if invoice is paid (might want to prevent deletion)
        if invoice.status == 'paid':
            raise ValidationError("Cannot delete paid invoice")
        
        try:
            invoice.delete()
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to delete invoice: {str(e)}")
    
    @staticmethod
    def get_invoices_by_status(status):
        """
        Get invoices by status.
        
        Args:
            status: Invoice status
            
        Returns:
            list: List of invoices with the specified status
        """
        return Invoice.query.filter_by(status=status).order_by(Invoice.created_at.desc()).all()
    
    @staticmethod
    def mark_as_paid(invoice_id):
        """
        Mark an invoice as paid.
        
        Args:
            invoice_id: Invoice ID
            
        Returns:
            Invoice: Updated invoice object
            
        Raises:
            NotFoundError: If invoice not found
        """
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            raise NotFoundError('Invoice', invoice_id)
        
        try:
            invoice.update(status='paid')
            return invoice
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to mark invoice as paid: {str(e)}")
    
    @staticmethod
    def _generate_invoice_number():
        """
        Generate a unique invoice number.
        
        Returns:
            str: Unique invoice number
        """
        # Generate invoice number with current date and random suffix
        date_str = datetime.now().strftime('%Y%m%d')
        random_suffix = str(uuid.uuid4())[:8].upper()
        invoice_number = f"INV-{date_str}-{random_suffix}"
        
        # Ensure uniqueness
        while Invoice.query.filter_by(invoice_number=invoice_number).first():
            random_suffix = str(uuid.uuid4())[:8].upper()
            invoice_number = f"INV-{date_str}-{random_suffix}"
        
        return invoice_number
