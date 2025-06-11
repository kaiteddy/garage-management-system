"""
Production configuration for the Garage Management System.
"""
import os
from .base import BaseConfig


class ProductionConfig(BaseConfig):
    """Production configuration class."""
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///garage.db'
    SQLALCHEMY_ECHO = False
    
    # Security settings
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set in production")
    
    # Logging settings
    LOG_LEVEL = 'WARNING'
