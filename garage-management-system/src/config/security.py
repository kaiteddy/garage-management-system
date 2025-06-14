"""
Security configuration for the Garage Management System.
"""
import os
from datetime import timedelta


class SecurityConfig:
    """Security-specific configuration."""
    
    # Authentication settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or os.urandom(32).hex()
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Session security
    SESSION_COOKIE_SECURE = True  # HTTPS only
    SESSION_COOKIE_HTTPONLY = True  # No JavaScript access
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    
    # Password security
    BCRYPT_LOG_ROUNDS = 12
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_NUMBERS = True
    PASSWORD_REQUIRE_SYMBOLS = True
    
    # Rate limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'memory://')
    RATELIMIT_DEFAULT = "100 per hour"
    RATELIMIT_LOGIN_ATTEMPTS = "5 per minute"
    RATELIMIT_API_CALLS = "1000 per hour"
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000').split(',')
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    
    # Security headers
    FORCE_HTTPS = os.environ.get('FORCE_HTTPS', 'False').lower() == 'true'
    CONTENT_SECURITY_POLICY = {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
        'style-src': "'self' 'unsafe-inline'",
        'img-src': "'self' data: https:",
        'font-src': "'self'",
        'connect-src': "'self'",
        'frame-ancestors': "'none'",
    }
    
    # File upload security
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'xlsx'}
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # Database encryption
    DATABASE_ENCRYPTION_KEY = os.environ.get('DATABASE_ENCRYPTION_KEY')
    ENCRYPT_SENSITIVE_FIELDS = True
    
    # Audit logging
    AUDIT_LOG_ENABLED = True
    AUDIT_LOG_FILE = 'audit.log'
    AUDIT_LOG_LEVEL = 'INFO'
    
    # GDPR settings
    GDPR_ENABLED = True
    DATA_RETENTION_DAYS = 2555  # 7 years
    CONSENT_REQUIRED = True
    
    # Multi-factor authentication
    MFA_ENABLED = os.environ.get('MFA_ENABLED', 'False').lower() == 'true'
    MFA_ISSUER_NAME = 'Garage Management System'
    
    # API security
    API_KEY_REQUIRED = os.environ.get('API_KEY_REQUIRED', 'False').lower() == 'true'
    API_RATE_LIMIT = "1000 per hour"
    
    # Backup security
    BACKUP_ENCRYPTION_ENABLED = True
    BACKUP_RETENTION_DAYS = 90
    
    # Security monitoring
    FAILED_LOGIN_THRESHOLD = 5
    ACCOUNT_LOCKOUT_DURATION = timedelta(minutes=30)
    SUSPICIOUS_ACTIVITY_THRESHOLD = 10
    
    # Email security (for notifications)
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_PORT = 587
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Security notifications
    SECURITY_EMAIL_SENDER = os.environ.get('SECURITY_EMAIL_SENDER', 'security@garagemanagement.com')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@garagemanagement.com')
    
    @classmethod
    def validate_password(cls, password):
        """
        Validate password against security requirements.
        
        Args:
            password (str): Password to validate
            
        Returns:
            tuple: (is_valid, error_messages)
        """
        errors = []
        
        if len(password) < cls.PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {cls.PASSWORD_MIN_LENGTH} characters long")
        
        if cls.PASSWORD_REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if cls.PASSWORD_REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if cls.PASSWORD_REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if cls.PASSWORD_REQUIRE_SYMBOLS and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
