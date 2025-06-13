"""
User model for authentication and authorization.
"""
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
import secrets
import jwt
from . import db
from .base import BaseModel


class User(UserMixin, BaseModel):
    """User model for authentication."""

    __tablename__ = 'users'

    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='mechanic')
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)

    # Security fields
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Role definitions
    ROLES = {
        'admin': 'Administrator',
        'manager': 'Manager',
        'mechanic': 'Mechanic',
        'receptionist': 'Receptionist'
    }

    # Permissions by role
    PERMISSIONS = {
        'admin': [
            'manage_users', 'manage_settings', 'view_reports', 'manage_customers',
            'manage_vehicles', 'manage_jobs', 'manage_estimates', 'manage_invoices',
            'delete_records', 'export_data'
        ],
        'manager': [
            'view_reports', 'manage_customers', 'manage_vehicles', 'manage_jobs',
            'manage_estimates', 'manage_invoices', 'export_data'
        ],
        'mechanic': [
            'view_customers', 'view_vehicles', 'manage_jobs', 'create_estimates'
        ],
        'receptionist': [
            'manage_customers', 'view_vehicles', 'view_jobs', 'manage_estimates',
            'manage_invoices'
        ]
    }

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.utcnow()

    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)

    def is_account_locked(self):
        """Check if account is locked due to failed login attempts."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def lock_account(self, duration_minutes=30):
        """Lock account for specified duration."""
        self.locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.save()

    def unlock_account(self):
        """Unlock account and reset failed attempts."""
        self.locked_until = None
        self.failed_login_attempts = 0
        self.save()

    def increment_failed_login(self):
        """Increment failed login attempts and lock if threshold reached."""
        self.failed_login_attempts += 1

        # Lock account after 5 failed attempts
        if self.failed_login_attempts >= 5:
            self.lock_account()

        self.save()

    def reset_failed_login(self):
        """Reset failed login attempts on successful login."""
        self.failed_login_attempts = 0
        self.last_login = datetime.utcnow()
        self.save()

    def has_permission(self, permission):
        """Check if user has specific permission."""
        if not self.is_active:
            return False

        role_permissions = self.PERMISSIONS.get(self.role, [])
        return permission in role_permissions

    def has_role(self, role):
        """Check if user has specific role."""
        return self.role == role

    def is_admin(self):
        """Check if user is admin."""
        return self.role == 'admin'

    def is_manager(self):
        """Check if user is manager or admin."""
        return self.role in ['admin', 'manager']

    def generate_auth_token(self, expires_in=3600):
        """Generate JWT authentication token."""
        payload = {
            'user_id': self.id,
            'username': self.username,
            'role': self.role,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }

        from flask import current_app
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    @staticmethod
    def verify_auth_token(token):
        """Verify JWT authentication token."""
        try:
            from flask import current_app
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload['user_id'])

            if user and user.is_active and not user.is_account_locked():
                return user
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

        return None

    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary."""
        data = super().to_dict()
        data.update({
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'role': self.role,
            'role_display': self.ROLES.get(self.role, self.role),
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'permissions': self.PERMISSIONS.get(self.role, [])
        })

        # Remove sensitive fields
        data.pop('password_hash', None)

        if include_sensitive:
            data.update({
                'failed_login_attempts': self.failed_login_attempts,
                'is_locked': self.is_account_locked(),
                'locked_until': self.locked_until.isoformat() if self.locked_until else None,
                'password_changed_at': self.password_changed_at.isoformat()
            })

        return data
