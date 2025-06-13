"""
Centralized application settings and configuration management.
"""
import os
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class DatabaseConfig:
    """Database configuration settings."""
    url: str = 'sqlite:///garage_management.db'
    echo: bool = False
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600


@dataclass
class DVLAConfig:
    """DVLA API configuration settings."""
    client_id: str = ''
    client_secret: str = ''
    api_key: str = ''
    token_url: str = 'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token'
    base_url: str = 'https://driver-vehicle-licensing.api.gov.uk'
    timeout: int = 30
    retry_attempts: int = 3


@dataclass
class SMSConfig:
    """SMS service configuration settings."""
    provider: str = 'twilio'
    account_sid: str = ''
    auth_token: str = ''
    from_number: str = '+44 7488 896449'
    timeout: int = 30
    retry_attempts: int = 3


@dataclass
class BusinessConfig:
    """Business information configuration."""
    name: str = 'Eli Motors'
    phone: str = '0208 203 6449'
    email: str = ''
    address_line1: str = ''
    address_line2: str = ''
    city: str = ''
    postcode: str = ''
    vat_number: str = ''
    company_number: str = ''


@dataclass
class SecurityConfig:
    """Security configuration settings."""
    secret_key: str = ''
    jwt_secret_key: str = ''
    jwt_access_token_expires: int = 3600  # 1 hour
    password_hash_rounds: int = 12
    max_login_attempts: int = 5
    lockout_duration: int = 900  # 15 minutes


@dataclass
class LoggingConfig:
    """Logging configuration settings."""
    level: str = 'INFO'
    format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    file_path: str = 'logs/garage_management.log'
    max_file_size: int = 10485760  # 10MB
    backup_count: int = 5
    console_output: bool = True


@dataclass
class ApplicationConfig:
    """Main application configuration."""
    debug: bool = False
    testing: bool = False
    host: str = '0.0.0.0'
    port: int = 5000
    timezone: str = 'Europe/London'
    date_format: str = 'DD-MM-YYYY'
    currency: str = 'GBP'
    language: str = 'en-GB'
    pagination_per_page: int = 20
    max_pagination_per_page: int = 100
    file_upload_max_size: int = 16777216  # 16MB
    allowed_file_extensions: list = None
    
    def __post_init__(self):
        if self.allowed_file_extensions is None:
            self.allowed_file_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png']


class ConfigManager:
    """Centralized configuration manager."""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or self._get_default_config_file()
        self.config_dir = Path(self.config_file).parent
        
        # Initialize configuration objects
        self.database = DatabaseConfig()
        self.dvla = DVLAConfig()
        self.sms = SMSConfig()
        self.business = BusinessConfig()
        self.security = SecurityConfig()
        self.logging = LoggingConfig()
        self.application = ApplicationConfig()
        
        # Load configuration
        self.load_config()
    
    def _get_default_config_file(self) -> str:
        """Get default configuration file path."""
        config_dir = Path(__file__).parent
        return str(config_dir / 'app_config.json')
    
    def load_config(self):
        """Load configuration from file and environment variables."""
        # Load from file if exists
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    file_config = json.load(f)
                self._apply_config_dict(file_config)
            except Exception as e:
                print(f"Warning: Failed to load config file {self.config_file}: {e}")
        
        # Override with environment variables
        self._load_from_environment()
        
        # Ensure config directory exists
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def _apply_config_dict(self, config_dict: Dict[str, Any]):
        """Apply configuration from dictionary."""
        for section_name, section_config in config_dict.items():
            if hasattr(self, section_name):
                section_obj = getattr(self, section_name)
                for key, value in section_config.items():
                    if hasattr(section_obj, key):
                        setattr(section_obj, key, value)
    
    def _load_from_environment(self):
        """Load configuration from environment variables."""
        env_mappings = {
            # Database
            'DATABASE_URL': ('database', 'url'),
            'DATABASE_ECHO': ('database', 'echo'),
            
            # DVLA
            'DVLA_CLIENT_ID': ('dvla', 'client_id'),
            'DVLA_CLIENT_SECRET': ('dvla', 'client_secret'),
            'DVLA_API_KEY': ('dvla', 'api_key'),
            
            # SMS
            'TWILIO_ACCOUNT_SID': ('sms', 'account_sid'),
            'TWILIO_AUTH_TOKEN': ('sms', 'auth_token'),
            'TWILIO_FROM_NUMBER': ('sms', 'from_number'),
            
            # Business
            'BUSINESS_NAME': ('business', 'name'),
            'BUSINESS_PHONE': ('business', 'phone'),
            'BUSINESS_EMAIL': ('business', 'email'),
            
            # Security
            'SECRET_KEY': ('security', 'secret_key'),
            'JWT_SECRET_KEY': ('security', 'jwt_secret_key'),
            
            # Application
            'FLASK_DEBUG': ('application', 'debug'),
            'FLASK_HOST': ('application', 'host'),
            'FLASK_PORT': ('application', 'port'),
        }
        
        for env_var, (section, key) in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                section_obj = getattr(self, section)
                
                # Convert value to appropriate type
                current_value = getattr(section_obj, key)
                if isinstance(current_value, bool):
                    value = value.lower() in ('true', '1', 'yes', 'on')
                elif isinstance(current_value, int):
                    try:
                        value = int(value)
                    except ValueError:
                        continue
                elif isinstance(current_value, float):
                    try:
                        value = float(value)
                    except ValueError:
                        continue
                
                setattr(section_obj, key, value)
    
    def save_config(self):
        """Save current configuration to file."""
        config_dict = {
            'database': asdict(self.database),
            'dvla': asdict(self.dvla),
            'sms': asdict(self.sms),
            'business': asdict(self.business),
            'security': asdict(self.security),
            'logging': asdict(self.logging),
            'application': asdict(self.application)
        }
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config_dict, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving config file: {e}")
            return False
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask-compatible configuration dictionary."""
        return {
            'DEBUG': self.application.debug,
            'TESTING': self.application.testing,
            'SECRET_KEY': self.security.secret_key or os.urandom(32).hex(),
            'SQLALCHEMY_DATABASE_URI': self.database.url,
            'SQLALCHEMY_ECHO': self.database.echo,
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
            'SQLALCHEMY_ENGINE_OPTIONS': {
                'pool_size': self.database.pool_size,
                'max_overflow': self.database.max_overflow,
                'pool_timeout': self.database.pool_timeout,
                'pool_recycle': self.database.pool_recycle
            },
            'MAX_CONTENT_LENGTH': self.application.file_upload_max_size,
            'JWT_SECRET_KEY': self.security.jwt_secret_key or self.security.secret_key,
            'JWT_ACCESS_TOKEN_EXPIRES': self.security.jwt_access_token_expires
        }
    
    def get_dvla_config(self) -> Dict[str, Any]:
        """Get DVLA API configuration."""
        return asdict(self.dvla)
    
    def get_sms_config(self) -> Dict[str, Any]:
        """Get SMS service configuration."""
        return asdict(self.sms)
    
    def get_business_config(self) -> Dict[str, Any]:
        """Get business information configuration."""
        return asdict(self.business)
    
    def update_section(self, section_name: str, updates: Dict[str, Any]) -> bool:
        """Update a configuration section."""
        if not hasattr(self, section_name):
            return False
        
        section_obj = getattr(self, section_name)
        for key, value in updates.items():
            if hasattr(section_obj, key):
                setattr(section_obj, key, value)
        
        return self.save_config()
    
    def reset_to_defaults(self):
        """Reset configuration to default values."""
        self.database = DatabaseConfig()
        self.dvla = DVLAConfig()
        self.sms = SMSConfig()
        self.business = BusinessConfig()
        self.security = SecurityConfig()
        self.logging = LoggingConfig()
        self.application = ApplicationConfig()
    
    def validate_config(self) -> Dict[str, list]:
        """Validate configuration and return any errors."""
        errors = {
            'database': [],
            'dvla': [],
            'sms': [],
            'business': [],
            'security': [],
            'logging': [],
            'application': []
        }
        
        # Validate database
        if not self.database.url:
            errors['database'].append('Database URL is required')
        
        # Validate DVLA (if configured)
        if self.dvla.client_id and not self.dvla.client_secret:
            errors['dvla'].append('DVLA client secret is required when client ID is set')
        
        # Validate SMS (if configured)
        if self.sms.account_sid and not self.sms.auth_token:
            errors['sms'].append('SMS auth token is required when account SID is set')
        
        # Validate security
        if not self.security.secret_key:
            errors['security'].append('Secret key is required for production')
        
        # Validate application
        if self.application.port < 1 or self.application.port > 65535:
            errors['application'].append('Port must be between 1 and 65535')
        
        # Remove empty error lists
        return {k: v for k, v in errors.items() if v}


# Global configuration instance
config_manager = ConfigManager()


def get_config_manager() -> ConfigManager:
    """Get the global configuration manager instance."""
    return config_manager


def get_flask_config() -> Dict[str, Any]:
    """Get Flask configuration dictionary."""
    return config_manager.get_flask_config()
