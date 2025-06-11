"""
Base configuration for the Garage Management System.
"""
import os
from datetime import timedelta


class BaseConfig:
    """Base configuration class."""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here-change-in-production'
    
    # Database settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    
    # DVLA API settings
    DVLA_API_KEY = os.environ.get('DVLA_API_KEY') or 'your-dvla-api-key-here'
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)
    
    # Application settings
    ITEMS_PER_PAGE = 20
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    
    # Logging settings
    LOG_LEVEL = 'INFO'
    LOG_FILE = 'garage_management.log'
    
    # Other settings
    DEBUG = False
    TESTING = False
