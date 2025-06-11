"""
Vehicle service for business logic operations.
"""
from models import Vehicle, Customer, db
from utils.exceptions import ValidationError, NotFoundError, DuplicateError
from utils.validators import validate_registration, validate_required_fields, normalize_registration
from .dvla_service import DVLAService


class VehicleService:
    """Service class for vehicle operations."""
    
    @staticmethod
    def get_all_vehicles(page=1, per_page=20, search=None, customer_id=None):
        """
        Get all vehicles with pagination and search.
        
        Args:
            page: Page number
            per_page: Items per page
            search: Search query
            customer_id: Filter by customer ID
            
        Returns:
            dict: Paginated vehicle data
        """
        query = Vehicle.query
        
        if customer_id:
            query = query.filter(Vehicle.customer_id == customer_id)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                db.or_(
                    Vehicle.registration.ilike(search_term),
                    Vehicle.make.ilike(search_term),
                    Vehicle.model.ilike(search_term)
                )
            )
        
        query = query.order_by(Vehicle.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'vehicles': [vehicle.to_dict() for vehicle in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    
    @staticmethod
    def get_vehicle_by_id(vehicle_id):
        """
        Get vehicle by ID.
        
        Args:
            vehicle_id: Vehicle ID
            
        Returns:
            Vehicle: Vehicle object
            
        Raises:
            NotFoundError: If vehicle not found
        """
        vehicle = Vehicle.get_by_id(vehicle_id)
        if not vehicle:
            raise NotFoundError('Vehicle', vehicle_id)
        return vehicle
    
    @staticmethod
    def get_vehicle_by_registration(registration):
        """
        Get vehicle by registration.
        
        Args:
            registration: Vehicle registration
            
        Returns:
            Vehicle: Vehicle object or None
        """
        normalized_reg = normalize_registration(registration)
        return Vehicle.query.filter_by(registration=normalized_reg).first()
    
    @staticmethod
    def create_vehicle(data):
        """
        Create a new vehicle with DVLA data.
        
        Args:
            data: Vehicle data dictionary
            
        Returns:
            Vehicle: Created vehicle object
            
        Raises:
            ValidationError: If validation fails
            DuplicateError: If vehicle already exists
        """
        # Validate required fields
        required_fields = ['registration']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        if not is_valid:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate registration format
        registration = data['registration']
        if not validate_registration(registration):
            raise ValidationError("Invalid registration format", field='registration')
        
        # Normalize registration
        normalized_reg = normalize_registration(registration)
        
        # Check for duplicate registration
        existing = Vehicle.query.filter_by(registration=normalized_reg).first()
        if existing:
            raise DuplicateError('Vehicle', 'registration', normalized_reg)
        
        # Validate customer if provided
        if 'customer_id' in data and data['customer_id']:
            customer = Customer.get_by_id(data['customer_id'])
            if not customer:
                raise ValidationError("Invalid customer ID", field='customer_id')
        
        try:
            # Create vehicle (this will automatically fetch DVLA data)
            vehicle_data = data.copy()
            vehicle_data['registration'] = normalized_reg
            
            vehicle = Vehicle(**vehicle_data)
            vehicle.save()
            
            return vehicle
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to create vehicle: {str(e)}")
    
    @staticmethod
    def update_vehicle(vehicle_id, data):
        """
        Update vehicle information.
        
        Args:
            vehicle_id: Vehicle ID
            data: Updated vehicle data
            
        Returns:
            Vehicle: Updated vehicle object
            
        Raises:
            NotFoundError: If vehicle not found
            ValidationError: If validation fails
        """
        vehicle = VehicleService.get_vehicle_by_id(vehicle_id)
        
        # Validate registration if provided
        if 'registration' in data:
            registration = data['registration']
            if not validate_registration(registration):
                raise ValidationError("Invalid registration format", field='registration')
            
            normalized_reg = normalize_registration(registration)
            
            # Check for duplicate registration (excluding current vehicle)
            existing = Vehicle.query.filter(
                Vehicle.registration == normalized_reg,
                Vehicle.id != vehicle_id
            ).first()
            if existing:
                raise DuplicateError('Vehicle', 'registration', normalized_reg)
            
            data['registration'] = normalized_reg
        
        # Validate customer if provided
        if 'customer_id' in data and data['customer_id']:
            customer = Customer.get_by_id(data['customer_id'])
            if not customer:
                raise ValidationError("Invalid customer ID", field='customer_id')
        
        try:
            # If registration is being updated, fetch new DVLA data
            if 'registration' in data:
                vehicle.registration = data['registration']
                vehicle.fetch_dvla_data()
                # Remove registration from data to avoid double update
                data = {k: v for k, v in data.items() if k != 'registration'}
            
            if data:  # Only update if there's remaining data
                vehicle.update(**data)
            
            return vehicle
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to update vehicle: {str(e)}")
    
    @staticmethod
    def delete_vehicle(vehicle_id):
        """
        Delete a vehicle.
        
        Args:
            vehicle_id: Vehicle ID
            
        Raises:
            NotFoundError: If vehicle not found
            ValidationError: If vehicle has associated records
        """
        vehicle = VehicleService.get_vehicle_by_id(vehicle_id)
        
        # Check if vehicle has associated jobs
        if vehicle.jobs:
            raise ValidationError("Cannot delete vehicle with associated jobs")
        
        try:
            vehicle.delete()
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to delete vehicle: {str(e)}")
    
    @staticmethod
    def refresh_dvla_data(vehicle_id):
        """
        Refresh DVLA data for a vehicle.
        
        Args:
            vehicle_id: Vehicle ID
            
        Returns:
            Vehicle: Updated vehicle object
            
        Raises:
            NotFoundError: If vehicle not found
        """
        vehicle = VehicleService.get_vehicle_by_id(vehicle_id)
        
        try:
            success = vehicle.fetch_dvla_data()
            if success:
                vehicle.save()
            return vehicle
        except Exception as e:
            db.session.rollback()
            raise ValidationError(f"Failed to refresh DVLA data: {str(e)}")
    
    @staticmethod
    def search_vehicles(query):
        """
        Search vehicles by various fields.
        
        Args:
            query: Search query
            
        Returns:
            list: List of matching vehicles
        """
        return Vehicle.search(query)
    
    @staticmethod
    def get_vehicles_by_mot_status(status='due_soon', days=30):
        """
        Get vehicles by MOT status.
        
        Args:
            status: MOT status ('expired', 'due_soon', 'valid')
            days: Days threshold for 'due_soon'
            
        Returns:
            list: List of vehicles matching status
        """
        from datetime import date, timedelta
        
        today = date.today()
        
        if status == 'expired':
            return Vehicle.query.filter(
                Vehicle.mot_expiry < today
            ).all()
        elif status == 'due_soon':
            threshold_date = today + timedelta(days=days)
            return Vehicle.query.filter(
                Vehicle.mot_expiry.between(today, threshold_date)
            ).all()
        elif status == 'valid':
            threshold_date = today + timedelta(days=days)
            return Vehicle.query.filter(
                Vehicle.mot_expiry > threshold_date
            ).all()
        else:
            return []
