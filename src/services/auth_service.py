"""
Authentication service for the Garage Management System.
"""
import re
from datetime import datetime, timedelta
from flask import request, current_app
from flask_login import login_user, logout_user, current_user
from werkzeug.security import check_password_hash

from models.user import User, UserSession
from utils.exceptions import ValidationError, AuthenticationError
from config.logging import get_logger

logger = get_logger('auth_service')


class AuthService:
    """Authentication service."""
    
    @staticmethod
    def login(username_or_email, password, remember_me=False):
        """Authenticate user and create session."""
        try:
            # Find user by username or email
            user = User.get_by_username(username_or_email)
            if not user:
                user = User.get_by_email(username_or_email)
            
            if not user:
                logger.warning(f"Login attempt with non-existent user: {username_or_email}")
                raise AuthenticationError("Invalid username/email or password")
            
            # Check if account is locked
            if user.is_account_locked():
                logger.warning(f"Login attempt on locked account: {user.username}")
                raise AuthenticationError("Account is temporarily locked due to multiple failed login attempts")
            
            # Check if account is active
            if not user.is_active:
                logger.warning(f"Login attempt on inactive account: {user.username}")
                raise AuthenticationError("Account is disabled")
            
            # Verify password
            if not user.check_password(password):
                user.increment_failed_login()
                logger.warning(f"Failed login attempt for user: {user.username}")
                raise AuthenticationError("Invalid username/email or password")
            
            # Successful login
            user.reset_failed_login()
            
            # Create session
            session = UserSession.create_session(
                user=user,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                expires_in_hours=24 if remember_me else 8
            )
            
            # Login user with Flask-Login
            login_user(user, remember=remember_me)
            
            logger.info(f"Successful login for user: {user.username}")
            
            return {
                'user': user.to_dict(),
                'token': user.generate_auth_token(),
                'session_token': session.session_token
            }
            
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Login error: {e}")
            raise AuthenticationError("Login failed")
    
    @staticmethod
    def logout():
        """Logout current user and invalidate session."""
        try:
            if current_user.is_authenticated:
                # Invalidate all user sessions
                sessions = UserSession.query.filter_by(
                    user_id=current_user.id,
                    is_active=True
                ).all()
                
                for session in sessions:
                    session.invalidate()
                
                logger.info(f"User logged out: {current_user.username}")
                logout_user()
                
            return True
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    @staticmethod
    def register(user_data):
        """Register new user."""
        try:
            # Validate user data
            AuthService._validate_registration_data(user_data)
            
            # Check if username already exists
            if User.get_by_username(user_data['username']):
                raise ValidationError("Username already exists")
            
            # Check if email already exists
            if User.get_by_email(user_data['email']):
                raise ValidationError("Email already exists")
            
            # Create user
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                role=user_data.get('role', 'mechanic'),
                is_active=user_data.get('is_active', True),
                is_verified=user_data.get('is_verified', False)
            )
            
            user.set_password(user_data['password'])
            user.save()
            
            logger.info(f"New user registered: {user.username}")
            
            return user
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Registration error: {e}")
            raise ValidationError("Registration failed")
    
    @staticmethod
    def change_password(user, current_password, new_password):
        """Change user password."""
        try:
            # Verify current password
            if not user.check_password(current_password):
                raise AuthenticationError("Current password is incorrect")
            
            # Validate new password
            AuthService._validate_password(new_password)
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Invalidate all existing sessions
            sessions = UserSession.query.filter_by(
                user_id=user.id,
                is_active=True
            ).all()
            
            for session in sessions:
                session.invalidate()
            
            logger.info(f"Password changed for user: {user.username}")
            
            return True
            
        except (AuthenticationError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Password change error: {e}")
            raise ValidationError("Password change failed")
    
    @staticmethod
    def reset_password(email):
        """Initiate password reset process."""
        try:
            user = User.get_by_email(email)
            if not user:
                # Don't reveal if email exists
                logger.warning(f"Password reset requested for non-existent email: {email}")
                return True
            
            if not user.is_active:
                logger.warning(f"Password reset requested for inactive user: {user.username}")
                return True
            
            # Generate reset token
            reset_token = user.generate_reset_token(expires_in=3600)  # 1 hour
            
            # TODO: Send email with reset link
            # EmailService.send_password_reset_email(user, reset_token)
            
            logger.info(f"Password reset initiated for user: {user.username}")
            
            return True
            
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return False
    
    @staticmethod
    def confirm_password_reset(token, new_password):
        """Confirm password reset with token."""
        try:
            user = User.verify_reset_token(token)
            if not user:
                raise AuthenticationError("Invalid or expired reset token")
            
            # Validate new password
            AuthService._validate_password(new_password)
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Invalidate all existing sessions
            sessions = UserSession.query.filter_by(
                user_id=user.id,
                is_active=True
            ).all()
            
            for session in sessions:
                session.invalidate()
            
            logger.info(f"Password reset completed for user: {user.username}")
            
            return True
            
        except (AuthenticationError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Password reset confirmation error: {e}")
            raise ValidationError("Password reset failed")
    
    @staticmethod
    def verify_token(token):
        """Verify authentication token."""
        try:
            user = User.verify_auth_token(token)
            if user:
                return user.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    @staticmethod
    def refresh_token(user):
        """Refresh authentication token."""
        try:
            if not user.is_active or user.is_account_locked():
                raise AuthenticationError("User account is not active")
            
            return user.generate_auth_token()
            
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise AuthenticationError("Token refresh failed")
    
    @staticmethod
    def check_permission(user, permission):
        """Check if user has specific permission."""
        if not user or not user.is_active:
            return False
        
        return user.has_permission(permission)
    
    @staticmethod
    def require_permission(permission):
        """Decorator to require specific permission."""
        def decorator(f):
            def decorated_function(*args, **kwargs):
                if not current_user.is_authenticated:
                    raise AuthenticationError("Authentication required")
                
                if not AuthService.check_permission(current_user, permission):
                    raise AuthenticationError("Insufficient permissions")
                
                return f(*args, **kwargs)
            
            decorated_function.__name__ = f.__name__
            return decorated_function
        
        return decorator
    
    @staticmethod
    def require_role(role):
        """Decorator to require specific role."""
        def decorator(f):
            def decorated_function(*args, **kwargs):
                if not current_user.is_authenticated:
                    raise AuthenticationError("Authentication required")
                
                if not current_user.has_role(role):
                    raise AuthenticationError("Insufficient role")
                
                return f(*args, **kwargs)
            
            decorated_function.__name__ = f.__name__
            return decorated_function
        
        return decorator
    
    @staticmethod
    def _validate_registration_data(data):
        """Validate user registration data."""
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"{field.replace('_', ' ').title()} is required")
        
        # Validate username
        if len(data['username']) < 3:
            raise ValidationError("Username must be at least 3 characters long")
        
        if not re.match(r'^[a-zA-Z0-9_]+$', data['username']):
            raise ValidationError("Username can only contain letters, numbers, and underscores")
        
        # Validate email
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email']):
            raise ValidationError("Invalid email format")
        
        # Validate password
        AuthService._validate_password(data['password'])
        
        # Validate names
        if len(data['first_name']) < 2:
            raise ValidationError("First name must be at least 2 characters long")
        
        if len(data['last_name']) < 2:
            raise ValidationError("Last name must be at least 2 characters long")
        
        # Validate role if provided
        if 'role' in data and data['role'] not in User.ROLES:
            raise ValidationError("Invalid role")
    
    @staticmethod
    def _validate_password(password):
        """Validate password strength."""
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            raise ValidationError("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            raise ValidationError("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            raise ValidationError("Password must contain at least one number")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError("Password must contain at least one special character")
    
    @staticmethod
    def cleanup_expired_sessions():
        """Clean up expired sessions."""
        try:
            count = UserSession.cleanup_expired()
            logger.info(f"Cleaned up {count} expired sessions")
            return count
            
        except Exception as e:
            logger.error(f"Session cleanup error: {e}")
            return 0
