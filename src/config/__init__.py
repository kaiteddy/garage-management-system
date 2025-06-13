"""
Configuration module for the Garage Management System.
"""
from .base import BaseConfig
from .development import DevelopmentConfig
from .production import ProductionConfig
from .testing import TestingConfig


def get_config(config_name):
    """Get configuration class based on environment name."""
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
        'default': DevelopmentConfig
    }
    
    return config_map.get(config_name, DevelopmentConfig)
