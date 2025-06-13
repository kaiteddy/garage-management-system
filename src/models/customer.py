"""
Customer model for the Garage Management System.
"""
from . import db
from .base import BaseModel


class Customer(BaseModel):
    """Customer model."""
    
    __tablename__ = 'customers'
    
    account_number = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(100))
    address = db.Column(db.Text)
    postcode = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    mobile = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # Relationships
    vehicles = db.relationship('Vehicle', backref='customer', lazy=True, cascade='all, delete-orphan')
    jobs = db.relationship('Job', backref='customer', lazy=True)
    estimates = db.relationship('Estimate', backref='customer', lazy=True)
    invoices = db.relationship('Invoice', backref='customer', lazy=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.account_number:
            self.account_number = self.generate_account_number()
    
    def generate_account_number(self):
        """Generate a unique account number."""
        import random
        import string
        
        # Generate a random account number
        while True:
            account_number = ''.join(random.choices(string.digits, k=8))
            if not Customer.query.filter_by(account_number=account_number).first():
                return account_number
    
    @property
    def full_name(self):
        """Get the full display name (company or name)."""
        return self.company if self.company else self.name
    
    @property
    def primary_contact(self):
        """Get the primary contact method."""
        return self.mobile or self.phone or self.email
    
    def to_dict(self):
        """Convert customer to dictionary with additional computed fields."""
        data = super().to_dict()
        data['full_name'] = self.full_name
        data['primary_contact'] = self.primary_contact
        data['vehicle_count'] = len(self.vehicles)
        return data
    
    @classmethod
    def search(cls, query):
        """Search customers by name, company, or account number."""
        search_term = f'%{query}%'
        return cls.query.filter(
            db.or_(
                cls.name.ilike(search_term),
                cls.company.ilike(search_term),
                cls.account_number.ilike(search_term),
                cls.email.ilike(search_term)
            )
        ).all()
    
    def __repr__(self):
        return f'<Customer {self.account_number}: {self.full_name}>'
