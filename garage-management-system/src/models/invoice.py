"""
Invoice model for the Garage Management System.
"""
from . import db
from .base import BaseModel


class Invoice(BaseModel):
    """Invoice model."""
    
    __tablename__ = 'invoices'
    
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='pending')
    due_date = db.Column(db.Date)
    paid_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    
    # Foreign keys
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=True)
    estimate_id = db.Column(db.Integer, db.ForeignKey('estimates.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        if not self.due_date:
            from datetime import datetime, timedelta
            self.due_date = (datetime.now() + timedelta(days=30)).date()
    
    def generate_invoice_number(self):
        """Generate a unique invoice number."""
        import random
        from datetime import datetime
        
        # Generate invoice number with format: INV-YYYYMMDD-XXXX
        date_str = datetime.now().strftime('%Y%m%d')
        
        while True:
            random_part = f"{random.randint(1000, 9999)}"
            invoice_number = f"INV-{date_str}-{random_part}"
            if not Invoice.query.filter_by(invoice_number=invoice_number).first():
                return invoice_number
    
    @property
    def status_display(self):
        """Get human-readable status."""
        status_map = {
            'pending': 'Pending',
            'sent': 'Sent',
            'paid': 'Paid',
            'partial': 'Partially Paid',
            'overdue': 'Overdue',
            'cancelled': 'Cancelled'
        }
        return status_map.get(self.status, self.status.title())
    
    @property
    def is_overdue(self):
        """Check if invoice is overdue."""
        if self.status == 'paid' or not self.due_date:
            return False
        from datetime import date
        return self.due_date < date.today()
    
    @property
    def days_overdue(self):
        """Get number of days overdue."""
        if not self.is_overdue:
            return 0
        from datetime import date
        return (date.today() - self.due_date).days
    
    def mark_as_paid(self, paid_date=None):
        """Mark invoice as paid."""
        from datetime import date
        self.status = 'paid'
        self.paid_date = paid_date or date.today()
        self.save()
    
    def to_dict(self):
        """Convert invoice to dictionary with additional computed fields."""
        data = super().to_dict()
        data.update({
            'status_display': self.status_display,
            'is_overdue': self.is_overdue,
            'days_overdue': self.days_overdue,
            'vehicle_registration': self.vehicle.registration if self.vehicle else None,
            'customer_name': self.customer.full_name if self.customer else None,
            'job_number': self.job.job_number if self.job else None,
            'estimate_number': self.estimate.estimate_number if self.estimate else None
        })
        return data
    
    @classmethod
    def search(cls, query):
        """Search invoices by invoice number."""
        search_term = f'%{query}%'
        return cls.query.filter(
            cls.invoice_number.ilike(search_term)
        ).all()
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}: {self.status}>'
