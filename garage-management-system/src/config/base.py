"""
Base configuration for the Garage Management System.
"""
import os
from datetime import timedelta
from .security import SecurityConfig


class BaseConfig(SecurityConfig):
    """Base configuration class with security settings."""

    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()

    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///garage.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # DVLA API settings
    DVLA_API_KEY = os.environ.get('DVLA_API_KEY') or 'your-dvla-api-key-here'

    # Session settings (inherited from SecurityConfig but can be overridden)
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

    # Application settings
    ITEMS_PER_PAGE = 20
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload

    # Logging settings
    LOG_LEVEL = 'INFO'
    LOG_FILE = 'garage_management.log'

    # Security logging
    SECURITY_LOG_FILE = 'security.log'
    AUDIT_LOG_FILE = 'audit.log'

    # Company information for GDPR
    COMPANY_NAME = os.environ.get('COMPANY_NAME', 'Garage Management System')
    COMPANY_ADDRESS = os.environ.get('COMPANY_ADDRESS', '')
    COMPANY_PHONE = os.environ.get('COMPANY_PHONE', '')
    COMPANY_EMAIL = os.environ.get('COMPANY_EMAIL', 'info@garagemanagement.com')

    # Data Protection Officer contact
    DPO_NAME = os.environ.get('DPO_NAME', '')
    DPO_EMAIL = os.environ.get('DPO_EMAIL', 'dpo@garagemanagement.com')
    DPO_PHONE = os.environ.get('DPO_PHONE', '')

    # Other settings
    DEBUG = False
    TESTING = False

    # Feature flags
    ENABLE_REGISTRATION = os.environ.get('ENABLE_REGISTRATION', 'True').lower() == 'true'
    ENABLE_PASSWORD_RESET = os.environ.get('ENABLE_PASSWORD_RESET', 'True').lower() == 'true'
    ENABLE_EMAIL_VERIFICATION = os.environ.get('ENABLE_EMAIL_VERIFICATION', 'False').lower() == 'true'
