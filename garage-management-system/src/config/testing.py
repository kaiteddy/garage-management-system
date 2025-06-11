"""
Testing configuration for the Garage Management System.
"""
from .base import BaseConfig


class TestingConfig(BaseConfig):
    """Testing configuration class."""
    
    TESTING = True
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ECHO = False
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
    
    # Logging settings
    LOG_LEVEL = 'ERROR'
