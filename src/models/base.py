"""
Base model class for the Garage Management System.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from . import db


class BaseModel(db.Model):
    """Base model class with common fields and methods."""
    
    __abstract__ = True
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def save(self):
        """Save the model to the database."""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Delete the model from the database."""
        db.session.delete(self)
        db.session.commit()
    
    def to_dict(self):
        """Convert model to dictionary."""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            elif hasattr(value, 'date') and callable(getattr(value, 'date')):
                # Handle date objects
                value = value.isoformat()
            result[column.name] = value
        return result
    
    def update(self, **kwargs):
        """Update model attributes."""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.utcnow()
        db.session.commit()
        return self
    
    @classmethod
    def create(cls, **kwargs):
        """Create a new instance of the model."""
        instance = cls(**kwargs)
        return instance.save()
    
    @classmethod
    def get_by_id(cls, id):
        """Get model by ID."""
        return cls.query.get(id)
    
    @classmethod
    def get_all(cls):
        """Get all instances of the model."""
        return cls.query.all()
    
    def __repr__(self):
        return f'<{self.__class__.__name__} {self.id}>'
