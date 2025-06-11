"""
User model for the Garage Management System.
"""
from . import db
from .base import BaseModel


class User(BaseModel):
    """User model."""

    __tablename__ = 'users'

    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(20), default='user')

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        """Convert user to dictionary (excluding sensitive data)."""
        data = super().to_dict()
        # Remove sensitive fields
        data.pop('password_hash', None)
        return data
