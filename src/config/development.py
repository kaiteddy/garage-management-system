"""
Development configuration for the Garage Management System.
"""
import os
from .base import BaseConfig


class DevelopmentConfig(BaseConfig):
    """Development configuration class."""

    def __init__(self):
        super().__init__()
        # Override settings for development
        self.config_manager.application.debug = True
        self.config_manager.database.echo = True
        self.config_manager.database.url = os.environ.get('DATABASE_URL') or 'sqlite:///garage_dev.db'
        self._apply_settings()

    @classmethod
    def create(cls):
        """Create development configuration instance."""
        return cls()
    
    # Logging settings
    LOG_LEVEL = 'DEBUG'
