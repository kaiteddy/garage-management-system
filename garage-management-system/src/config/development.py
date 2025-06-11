"""
Development configuration for the Garage Management System.
"""
import os
from .base import BaseConfig


class DevelopmentConfig(BaseConfig):
    """Development configuration class."""
    
    DEBUG = True
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///garage_dev.db'
    SQLALCHEMY_ECHO = True  # Log SQL queries in development
    
    # Logging settings
    LOG_LEVEL = 'DEBUG'
