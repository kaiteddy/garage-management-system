"""
Job model for the Garage Management System.
"""
from . import db
from .base import BaseModel


class Job(BaseModel):
    """Job model."""
    
    __tablename__ = 'jobs'
    
    job_number = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    total_amount = db.Column(db.Numeric(10, 2))
    notes = db.Column(db.Text)
    
    # Foreign keys
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    
    # Relationships
    estimates = db.relationship('Estimate', backref='job', lazy=True)
    invoices = db.relationship('Invoice', backref='job', lazy=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.job_number:
            self.job_number = self.generate_job_number()
    
    def generate_job_number(self):
        """Generate a unique job number."""
        import random
        from datetime import datetime
        
        # Generate job number with format: JOB-YYYYMMDD-XXXX
        date_str = datetime.now().strftime('%Y%m%d')
        
        while True:
            random_part = f"{random.randint(1000, 9999)}"
            job_number = f"JOB-{date_str}-{random_part}"
            if not Job.query.filter_by(job_number=job_number).first():
                return job_number
    
    @property
    def status_display(self):
        """Get human-readable status."""
        status_map = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'on_hold': 'On Hold'
        }
        return status_map.get(self.status, self.status.title())
    
    def to_dict(self):
        """Convert job to dictionary with additional computed fields."""
        data = super().to_dict()
        data.update({
            'status_display': self.status_display,
            'vehicle_registration': self.vehicle.registration if self.vehicle else None,
            'customer_name': self.customer.full_name if self.customer else None,
            'estimate_count': len(self.estimates),
            'invoice_count': len(self.invoices)
        })
        return data
    
    @classmethod
    def search(cls, query):
        """Search jobs by job number or description."""
        search_term = f'%{query}%'
        return cls.query.filter(
            db.or_(
                cls.job_number.ilike(search_term),
                cls.description.ilike(search_term)
            )
        ).all()
    
    def __repr__(self):
        return f'<Job {self.job_number}: {self.status}>'
