"""
Models package for the Garage Management System.
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models to ensure they are registered with SQLAlchemy
from .base import BaseModel
from .customer import Customer
from .vehicle import Vehicle
from .job import Job
from .estimate import Estimate
from .invoice import Invoice

# Import authentication models
from auth.models import User, Role, Permission, UserSession, LoginAttempt

# Import audit models
from auth.audit import AuditLog

# Import GDPR models
from gdpr.models import ConsentRecord, DataSubjectRequest, DataProcessingRecord, DataRetentionPolicy

__all__ = [
    'db',
    'BaseModel',
    'Customer',
    'Vehicle',
    'Job',
    'Estimate',
    'Invoice',
    'User',
    'Role',
    'Permission',
    'UserSession',
    'LoginAttempt',
    'AuditLog',
    'ConsentRecord',
    'DataSubjectRequest',
    'DataProcessingRecord',
    'DataRetentionPolicy'
]