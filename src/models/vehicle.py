from datetime import datetime, timezone
import requests
from flask import current_app
from . import db

def utc_now():
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)

class Vehicle(db.Model):
    __tablename__ = 'vehicles'

    id = db.Column(db.Integer, primary_key=True)
    registration = db.Column(db.String(10), unique=True, nullable=False)
    make = db.Column(db.String(50))
    model = db.Column(db.String(50))
    year = db.Column(db.Integer)
    color = db.Column(db.String(30))
    fuel_type = db.Column(db.String(20))
    mot_expiry = db.Column(db.Date)
    tax_due = db.Column(db.Date)
    mileage = db.Column(db.Integer)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    jobs = db.relationship('Job', backref='vehicle', lazy=True)
    invoices = db.relationship('Invoice', backref='vehicle', lazy=True)

    def __init__(self, registration):
        self.registration = registration
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

    def to_dict(self):
        return {
            'id': self.id,
            'registration': self.registration,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'color': self.color,
            'fuel_type': self.fuel_type,
            'mot_expiry': self.mot_expiry.isoformat() if self.mot_expiry and str(self.mot_expiry).strip() else None,
            'tax_due': self.tax_due.isoformat() if self.tax_due and str(self.tax_due).strip() else None,
            'mileage': self.mileage,
            'customer_id': self.customer_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }