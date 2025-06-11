"""
Vehicle model for the Garage Management System.
"""
from datetime import datetime
import requests
from flask import current_app
from . import db
from .base import BaseModel


class Vehicle(BaseModel):
    """Vehicle model with DVLA integration."""

    __tablename__ = 'vehicles'

    registration = db.Column(db.String(10), unique=True, nullable=False)
    make = db.Column(db.String(50))
    model = db.Column(db.String(50))
    year = db.Column(db.Integer)
    color = db.Column(db.String(30))
    fuel_type = db.Column(db.String(20))
    mot_expiry = db.Column(db.Date)
    tax_due = db.Column(db.Date)
    mileage = db.Column(db.Integer)

    # Foreign key
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)

    # Relationships
    jobs = db.relationship('Job', backref='vehicle', lazy=True)
    estimates = db.relationship('Estimate', backref='vehicle', lazy=True)
    invoices = db.relationship('Invoice', backref='vehicle', lazy=True)

    def __init__(self, registration, **kwargs):
        super().__init__(**kwargs)
        self.registration = registration.upper().replace(' ', '')  # Normalize registration
        self.fetch_dvla_data()

    def fetch_dvla_data(self):
        """Fetch vehicle details from DVLA API"""
        try:
            # DVLA API endpoint
            url = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles"
            
            # Headers required for DVLA API
            headers = {
                "x-api-key": current_app.config['DVLA_API_KEY'],
                "Content-Type": "application/json"
            }
            
            # Request body
            data = {
                "registrationNumber": self.registration
            }
            
            # Make API request
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                vehicle_data = response.json()
                
                # Update vehicle details
                self.make = vehicle_data.get('make')
                self.model = vehicle_data.get('model')
                self.year = vehicle_data.get('yearOfManufacture')
                self.color = vehicle_data.get('colour')
                self.fuel_type = vehicle_data.get('fuelType')
                self.mot_expiry = datetime.strptime(vehicle_data.get('motExpiryDate'), '%Y-%m-%d').date() if vehicle_data.get('motExpiryDate') else None
                self.tax_due = datetime.strptime(vehicle_data.get('taxDueDate'), '%Y-%m-%d').date() if vehicle_data.get('taxDueDate') else None
                
                return True
            else:
                current_app.logger.error(f"DVLA API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            current_app.logger.error(f"Error fetching DVLA data: {str(e)}")
            return False

    @property
    def display_name(self):
        """Get display name for the vehicle."""
        parts = [self.make, self.model]
        if self.year:
            parts.insert(0, str(self.year))
        return ' '.join(filter(None, parts)) or self.registration

    @property
    def mot_status(self):
        """Get MOT status."""
        if not self.mot_expiry:
            return 'unknown'

        from datetime import date, timedelta
        today = date.today()

        if self.mot_expiry < today:
            return 'expired'
        elif self.mot_expiry <= today + timedelta(days=30):
            return 'due_soon'
        else:
            return 'valid'

    @property
    def tax_status(self):
        """Get tax status."""
        if not self.tax_due:
            return 'unknown'

        from datetime import date, timedelta
        today = date.today()

        if self.tax_due < today:
            return 'expired'
        elif self.tax_due <= today + timedelta(days=30):
            return 'due_soon'
        else:
            return 'valid'

    def to_dict(self):
        """Convert vehicle to dictionary with additional computed fields."""
        data = super().to_dict()
        data.update({
            'display_name': self.display_name,
            'mot_status': self.mot_status,
            'tax_status': self.tax_status,
            'customer_name': self.customer.full_name if self.customer else None
        })
        return data

    @classmethod
    def search(cls, query):
        """Search vehicles by registration, make, or model."""
        search_term = f'%{query}%'
        return cls.query.filter(
            db.or_(
                cls.registration.ilike(search_term),
                cls.make.ilike(search_term),
                cls.model.ilike(search_term)
            )
        ).all()

    def __repr__(self):
        return f'<Vehicle {self.registration}: {self.display_name}>'