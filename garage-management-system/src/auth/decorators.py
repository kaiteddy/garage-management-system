"""
Authentication decorators for the Garage Management System.
"""
from functools import wraps
from flask import jsonify, request, current_app
from flask_login import current_user


def admin_required(f):
    """Decorator to require admin privileges."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({
                'status': 'error',
                'message': 'Authentication required',
                'error_code': 'AUTH_REQUIRED'
            }), 401
        
        if not getattr(current_user, 'is_admin', False):
            return jsonify({
                'status': 'error',
                'message': 'Admin privileges required',
                'error_code': 'ADMIN_REQUIRED'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function


def manager_required(f):
    """Decorator to require manager or admin privileges."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({
                'status': 'error',
                'message': 'Authentication required',
                'error_code': 'AUTH_REQUIRED'
            }), 401
        
        # Check if user is admin or manager
        is_admin = getattr(current_user, 'is_admin', False)
        is_manager = getattr(current_user, 'is_manager', False)
        
        if not (is_admin or is_manager):
            return jsonify({
                'status': 'error',
                'message': 'Manager privileges required',
                'error_code': 'MANAGER_REQUIRED'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function


def api_key_required(f):
    """Decorator to require API key authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({
                'status': 'error',
                'message': 'API key required',
                'error_code': 'API_KEY_REQUIRED'
            }), 401
        
        # Validate API key (simplified)
        from .models import User
        user = User.query.filter_by(api_key=api_key).first()
        
        if not user or not user.is_active:
            return jsonify({
                'status': 'error',
                'message': 'Invalid API key',
                'error_code': 'INVALID_API_KEY'
            }), 401
        
        # Set current user context
        request.current_user = user
        
        return f(*args, **kwargs)
    return decorated_function


def rate_limit_exempt(f):
    """Decorator to exempt endpoint from rate limiting."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import g
        g.rate_limit_exempt = True
        return f(*args, **kwargs)
    return decorated_function
