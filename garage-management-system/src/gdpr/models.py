"""
Basic GDPR compliance models for the Garage Management System.
"""
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()


class ConsentRecord(db.Model):
    """Model for tracking user consent."""
    
    __tablename__ = 'consent_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    email = db.Column(db.String(120))
    
    # Consent details
    consent_type = db.Column(db.String(50), nullable=False)
    purpose = db.Column(db.String(255), nullable=False)
    legal_basis = db.Column(db.String(100))
    
    # Consent status
    granted = db.Column(db.Boolean, default=False)
    granted_at = db.Column(db.DateTime)
    withdrawn_at = db.Column(db.DateTime)
    
    # Technical details
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    consent_method = db.Column(db.String(50))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConsentRecord {self.consent_type}:{self.granted}>'
    
    def is_valid(self):
        """Check if consent is still valid."""
        if not self.granted:
            return False
        
        if self.withdrawn_at:
            return False
        
        return True
    
    def withdraw(self):
        """Withdraw consent."""
        self.granted = False
        self.withdrawn_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email': self.email,
            'consent_type': self.consent_type,
            'purpose': self.purpose,
            'legal_basis': self.legal_basis,
            'granted': self.granted,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'withdrawn_at': self.withdrawn_at.isoformat() if self.withdrawn_at else None,
            'is_valid': self.is_valid(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class DataSubjectRequest(db.Model):
    """Model for tracking data subject requests."""
    
    __tablename__ = 'data_subject_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    email = db.Column(db.String(120))
    
    # Request details
    request_type = db.Column(db.String(50), nullable=False)  # access, rectification, erasure, portability
    description = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed, rejected
    
    # Processing
    processed_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    response = db.Column(db.Text)
    
    # Deadlines
    due_date = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.due_date:
            self.due_date = datetime.utcnow() + timedelta(days=30)
    
    def is_overdue(self):
        """Check if request is overdue."""
        return datetime.utcnow() > self.due_date and self.status not in ['completed', 'rejected']
    
    def complete_request(self, response):
        """Mark request as completed."""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        self.response = response
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email': self.email,
            'request_type': self.request_type,
            'description': self.description,
            'status': self.status,
            'response': self.response,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'is_overdue': self.is_overdue(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def __repr__(self):
        return f'<DataSubjectRequest {self.request_type}:{self.status}>'
