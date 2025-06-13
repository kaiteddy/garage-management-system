"""
Authentication API routes.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user

from services.auth_service import AuthService
from utils.response_utils import ResponseFormatter
from utils.exceptions import ValidationError, AuthenticationError
from config.logging import get_logger

auth_api = Blueprint('auth_api', __name__)
logger = get_logger('auth_api')


@auth_api.route('/login', methods=['POST'])
def login():
    """User login endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        username_or_email = data.get('username') or data.get('email')
        password = data.get('password')
        remember_me = data.get('remember_me', False)
        
        if not username_or_email or not password:
            return ResponseFormatter.error('Username/email and password are required', status_code=400)
        
        # Authenticate user
        auth_result = AuthService.login(username_or_email, password, remember_me)
        
        return ResponseFormatter.success(
            data=auth_result,
            message='Login successful'
        )
        
    except AuthenticationError as e:
        logger.warning(f"Authentication failed: {e}")
        return ResponseFormatter.error(str(e), status_code=401)
    
    except ValidationError as e:
        return ResponseFormatter.error(str(e), status_code=400)
    
    except Exception as e:
        logger.error(f"Login error: {e}")
        return ResponseFormatter.error('Login failed', status_code=500)


@auth_api.route('/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint."""
    try:
        success = AuthService.logout()
        
        if success:
            return ResponseFormatter.success(message='Logout successful')
        else:
            return ResponseFormatter.error('Logout failed', status_code=500)
            
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return ResponseFormatter.error('Logout failed', status_code=500)


@auth_api.route('/register', methods=['POST'])
def register():
    """User registration endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        # Only admins can register new users
        if current_user.is_authenticated and not current_user.is_admin():
            return ResponseFormatter.error('Insufficient permissions', status_code=403)
        
        # Register user
        user = AuthService.register(data)
        
        return ResponseFormatter.success(
            data=user.to_dict(),
            message='User registered successfully',
            status_code=201
        )
        
    except ValidationError as e:
        return ResponseFormatter.error(str(e), status_code=400)
    
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return ResponseFormatter.error('Registration failed', status_code=500)


@auth_api.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return ResponseFormatter.error('Current password and new password are required', status_code=400)
        
        # Change password
        AuthService.change_password(current_user, current_password, new_password)
        
        return ResponseFormatter.success(message='Password changed successfully')
        
    except AuthenticationError as e:
        return ResponseFormatter.error(str(e), status_code=401)
    
    except ValidationError as e:
        return ResponseFormatter.error(str(e), status_code=400)
    
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return ResponseFormatter.error('Password change failed', status_code=500)


@auth_api.route('/reset-password', methods=['POST'])
def reset_password():
    """Initiate password reset endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        email = data.get('email')
        
        if not email:
            return ResponseFormatter.error('Email is required', status_code=400)
        
        # Initiate password reset
        AuthService.reset_password(email)
        
        # Always return success to prevent email enumeration
        return ResponseFormatter.success(
            message='If the email exists, a password reset link has been sent'
        )
        
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        return ResponseFormatter.error('Password reset failed', status_code=500)


@auth_api.route('/reset-password/confirm', methods=['POST'])
def confirm_password_reset():
    """Confirm password reset endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return ResponseFormatter.error('Token and new password are required', status_code=400)
        
        # Confirm password reset
        AuthService.confirm_password_reset(token, new_password)
        
        return ResponseFormatter.success(message='Password reset successful')
        
    except AuthenticationError as e:
        return ResponseFormatter.error(str(e), status_code=401)
    
    except ValidationError as e:
        return ResponseFormatter.error(str(e), status_code=400)
    
    except Exception as e:
        logger.error(f"Password reset confirmation error: {e}")
        return ResponseFormatter.error('Password reset failed', status_code=500)


@auth_api.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify authentication token endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        token = data.get('token')
        
        if not token:
            return ResponseFormatter.error('Token is required', status_code=400)
        
        # Verify token
        user_data = AuthService.verify_token(token)
        
        if user_data:
            return ResponseFormatter.success(data=user_data)
        else:
            return ResponseFormatter.error('Invalid or expired token', status_code=401)
            
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return ResponseFormatter.error('Token verification failed', status_code=500)


@auth_api.route('/refresh-token', methods=['POST'])
@login_required
def refresh_token():
    """Refresh authentication token endpoint."""
    try:
        # Generate new token
        new_token = AuthService.refresh_token(current_user)
        
        return ResponseFormatter.success(
            data={'token': new_token},
            message='Token refreshed successfully'
        )
        
    except AuthenticationError as e:
        return ResponseFormatter.error(str(e), status_code=401)
    
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return ResponseFormatter.error('Token refresh failed', status_code=500)


@auth_api.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get current user profile endpoint."""
    try:
        return ResponseFormatter.success(data=current_user.to_dict())
        
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        return ResponseFormatter.error('Failed to retrieve profile', status_code=500)


@auth_api.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update current user profile endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'email']
        
        for field in allowed_fields:
            if field in data:
                setattr(current_user, field, data[field])
        
        current_user.save()
        
        return ResponseFormatter.success(
            data=current_user.to_dict(),
            message='Profile updated successfully'
        )
        
    except ValidationError as e:
        return ResponseFormatter.error(str(e), status_code=400)
    
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return ResponseFormatter.error('Profile update failed', status_code=500)


@auth_api.route('/permissions', methods=['GET'])
@login_required
def get_permissions():
    """Get current user permissions endpoint."""
    try:
        permissions = current_user.PERMISSIONS.get(current_user.role, [])
        
        return ResponseFormatter.success(
            data={
                'role': current_user.role,
                'permissions': permissions
            }
        )
        
    except Exception as e:
        logger.error(f"Permissions retrieval error: {e}")
        return ResponseFormatter.error('Failed to retrieve permissions', status_code=500)


@auth_api.route('/check-permission', methods=['POST'])
@login_required
def check_permission():
    """Check if user has specific permission endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)
        
        permission = data.get('permission')
        
        if not permission:
            return ResponseFormatter.error('Permission is required', status_code=400)
        
        has_permission = AuthService.check_permission(current_user, permission)
        
        return ResponseFormatter.success(
            data={'has_permission': has_permission}
        )
        
    except Exception as e:
        logger.error(f"Permission check error: {e}")
        return ResponseFormatter.error('Permission check failed', status_code=500)


# Error handlers
@auth_api.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized access."""
    return ResponseFormatter.error('Unauthorized access', status_code=401)


@auth_api.errorhandler(403)
def forbidden(error):
    """Handle forbidden access."""
    return ResponseFormatter.error('Forbidden access', status_code=403)
