"""
Base configuration for the Garage Management System.
"""
import os
from datetime import timedelta


class BaseConfig:
    """Base configuration class using centralized settings."""

    def __init__(self):
        # Import here to avoid circular imports
        from config.settings import get_config_manager
        self.config_manager = get_config_manager()
        self._apply_settings()

    def _apply_settings(self):
        """Apply settings from configuration manager."""
        # Get Flask configuration
        flask_config = self.config_manager.get_flask_config()
        for key, value in flask_config.items():
            setattr(self, key, value)

        # DVLA API settings
        dvla_config = self.config_manager.get_dvla_config()
        for key, value in dvla_config.items():
            setattr(self, f'DVLA_{key.upper()}', value)

        # SMS settings
        sms_config = self.config_manager.get_sms_config()
        for key, value in sms_config.items():
            setattr(self, f'TWILIO_{key.upper()}', value)

        # Business settings
        business_config = self.config_manager.get_business_config()
        for key, value in business_config.items():
            setattr(self, f'BUSINESS_{key.upper()}', value)

        # Application settings
        app_config = self.config_manager.application
        self.ITEMS_PER_PAGE = app_config.pagination_per_page
        self.MAX_CONTENT_LENGTH = app_config.file_upload_max_size
        self.DATE_FORMAT = app_config.date_format
        self.CURRENCY = app_config.currency
        self.LANGUAGE = app_config.language
        self.TIMEZONE = app_config.timezone

        # Logging settings
        log_config = self.config_manager.logging
        self.LOG_LEVEL = log_config.level
        self.LOG_FILE = log_config.file_path

        # Session settings
        self.PERMANENT_SESSION_LIFETIME = timedelta(days=1)

        # File upload settings
        self.UPLOAD_FOLDER = 'uploads'
        self.ALLOWED_EXTENSIONS = set(app_config.allowed_file_extensions)

    @classmethod
    def create(cls):
        """Create configuration instance."""
        return cls()
