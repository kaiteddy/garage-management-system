"""
Estimate model for the Garage Management System.
"""
from datetime import datetime, timedelta
from . import db
from .base import BaseModel


class Estimate(BaseModel):
    """Estimate model."""
    
    __tablename__ = 'estimates'
    
    estimate_number = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='draft')
    total_amount = db.Column(db.Numeric(10, 2))
    valid_until = db.Column(db.Date)
    notes = db.Column(db.Text)
    
    # Foreign keys
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    
    # Relationships
    invoices = db.relationship('Invoice', backref='estimate', lazy=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.estimate_number:
            self.estimate_number = self.generate_estimate_number()
        if not self.valid_until:
            self.valid_until = (datetime.now() + timedelta(days=30)).date()
    
    def generate_estimate_number(self):
        """Generate a unique estimate number."""
        import random
        from datetime import datetime
        
        # Generate estimate number with format: EST-YYYYMMDD-XXXX
        date_str = datetime.now().strftime('%Y%m%d')
        
        while True:
            random_part = f"{random.randint(1000, 9999)}"
            estimate_number = f"EST-{date_str}-{random_part}"
            if not Estimate.query.filter_by(estimate_number=estimate_number).first():
                return estimate_number
    
    @property
    def status_display(self):
        """Get human-readable status."""
        status_map = {
            'draft': 'Draft',
            'sent': 'Sent',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'expired': 'Expired'
        }
        return status_map.get(self.status, self.status.title())
    
    @property
    def is_expired(self):
        """Check if estimate is expired."""
        if not self.valid_until:
            return False
        from datetime import date
        return self.valid_until < date.today()
    
    def to_dict(self):
        """Convert estimate to dictionary with additional computed fields."""
        data = super().to_dict()
        data.update({
            'status_display': self.status_display,
            'is_expired': self.is_expired,
            'vehicle_registration': self.vehicle.registration if self.vehicle else None,
            'customer_name': self.customer.full_name if self.customer else None,
            'job_number': self.job.job_number if self.job else None,
            'invoice_count': len(self.invoices)
        })
        return data
    
    @classmethod
    def search(cls, query):
        """Search estimates by estimate number or description."""
        search_term = f'%{query}%'
        return cls.query.filter(
            db.or_(
                cls.estimate_number.ilike(search_term),
                cls.description.ilike(search_term)
            )
        ).all()
    
    def __repr__(self):
        return f'<Estimate {self.estimate_number}: {self.status}>'
