"""
Authentication routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, current_user, login_required
from auth.auth_manager import AuthManager
from auth.models import User
from auth.decorators import rate_limit_exempt
from auth.utils import generate_jwt_token, generate_mfa_qr_code
from gdpr.models import ConsentRecord
from models import db
import qrcode
import io
import base64

auth_bp = Blueprint('auth', __name__)
auth_manager = AuthManager()


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        username = data.get('username')
        password = data.get('password')
        mfa_token = data.get('mfa_token')
        remember_me = data.get('remember_me', False)
        
        if not username or not password:
            return jsonify({
                'status': 'error',
                'message': 'Username and password are required',
                'error_code': 'MISSING_CREDENTIALS'
            }), 400
        
        # Authenticate user
        result = auth_manager.authenticate_user(username, password, mfa_token)
        
        if result['success']:
            user = User.query.filter(
                (User.username == username) | (User.email == username)
            ).first()
            
            # Login user with Flask-Login
            login_user(user, remember=remember_me)
            
            return jsonify({
                'status': 'success',
                'message': 'Login successful',
                'user': result['user'],
                'jwt_token': result['jwt_token'],
                'session_id': result['session_id']
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': result['error'],
                'error_code': result['error_code'],
                'requires_mfa': result.get('requires_mfa', False)
            }), 401
            
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Login failed',
            'error_code': 'LOGIN_ERROR'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint."""
    try:
        # Logout user and cleanup session
        auth_manager.logout_user_session()
        
        return jsonify({
            'status': 'success',
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Logout failed',
            'error_code': 'LOGOUT_ERROR'
        }), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint."""
    try:
        if not current_app.config.get('ENABLE_REGISTRATION', True):
            return jsonify({
                'status': 'error',
                'message': 'Registration is disabled',
                'error_code': 'REGISTRATION_DISABLED'
            }), 403
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        # Check GDPR consent
        if current_app.config.get('GDPR_ENABLED', True):
            if not data.get('gdpr_consent'):
                return jsonify({
                    'status': 'error',
                    'message': 'GDPR consent is required',
                    'error_code': 'GDPR_CONSENT_REQUIRED'
                }), 400
        
        # Create user
        result = auth_manager.create_user(data)
        
        if result['success']:
            user = User.query.get(result['user']['id'])
            
            # Record GDPR consent if provided
            if data.get('gdpr_consent'):
                consent = ConsentRecord(
                    user_id=user.id,
                    consent_type='data_processing',
                    purpose='Account creation and service provision',
                    legal_basis='Contract',
                    granted=True,
                    granted_at=datetime.utcnow(),
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent'),
                    consent_method='web_form'
                )
                db.session.add(consent)
                
                user.gdpr_consent = True
                user.gdpr_consent_date = datetime.utcnow()
                db.session.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Registration successful',
                'user': result['user']
            }), 201
        else:
            return jsonify({
                'status': 'error',
                'message': result['error'],
                'error_code': result['error_code'],
                'details': result.get('details', [])
            }), 400
            
    except Exception as e:
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Registration failed',
            'error_code': 'REGISTRATION_ERROR'
        }), 500


@auth_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get current user profile."""
    try:
        return jsonify({
            'status': 'success',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Profile retrieval error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve profile',
            'error_code': 'PROFILE_ERROR'
        }), 500


@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update current user profile."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'phone']
        for field in allowed_fields:
            if field in data:
                setattr(current_user, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Profile update error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update profile',
            'error_code': 'PROFILE_UPDATE_ERROR'
        }), 500


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({
                'status': 'error',
                'message': 'Current and new passwords are required',
                'error_code': 'MISSING_PASSWORDS'
            }), 400
        
        # Verify current password
        if not current_user.check_password(current_password):
            return jsonify({
                'status': 'error',
                'message': 'Current password is incorrect',
                'error_code': 'INVALID_CURRENT_PASSWORD'
            }), 400
        
        # Validate new password
        from auth.utils import validate_password_strength
        is_valid, errors = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': 'New password does not meet requirements',
                'error_code': 'WEAK_PASSWORD',
                'details': errors
            }), 400
        
        # Update password
        current_user.set_password(new_password)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Password change error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to change password',
            'error_code': 'PASSWORD_CHANGE_ERROR'
        }), 500


@auth_bp.route('/setup-mfa', methods=['POST'])
@login_required
def setup_mfa():
    """Setup multi-factor authentication."""
    try:
        if not current_app.config.get('MFA_ENABLED', False):
            return jsonify({
                'status': 'error',
                'message': 'MFA is not enabled',
                'error_code': 'MFA_DISABLED'
            }), 403
        
        # Generate QR code for MFA setup
        qr_uri = current_user.setup_mfa()
        
        # Generate QR code image
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return jsonify({
            'status': 'success',
            'message': 'MFA setup initiated',
            'qr_code': f"data:image/png;base64,{img_str}",
            'secret': current_user.mfa_secret,
            'backup_codes': []  # Generate backup codes in production
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"MFA setup error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to setup MFA',
            'error_code': 'MFA_SETUP_ERROR'
        }), 500


@auth_bp.route('/verify-mfa', methods=['POST'])
@login_required
def verify_mfa():
    """Verify and enable MFA."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        token = data.get('token')
        
        if not token:
            return jsonify({
                'status': 'error',
                'message': 'MFA token is required',
                'error_code': 'MISSING_TOKEN'
            }), 400
        
        # Verify token
        if current_user.verify_mfa_token(token):
            current_user.mfa_enabled = True
            db.session.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'MFA enabled successfully'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Invalid MFA token',
                'error_code': 'INVALID_MFA_TOKEN'
            }), 400
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"MFA verification error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to verify MFA',
            'error_code': 'MFA_VERIFICATION_ERROR'
        }), 500


@auth_bp.route('/disable-mfa', methods=['POST'])
@login_required
def disable_mfa():
    """Disable multi-factor authentication."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        password = data.get('password')
        
        if not password:
            return jsonify({
                'status': 'error',
                'message': 'Password is required to disable MFA',
                'error_code': 'MISSING_PASSWORD'
            }), 400
        
        # Verify password
        if not current_user.check_password(password):
            return jsonify({
                'status': 'error',
                'message': 'Invalid password',
                'error_code': 'INVALID_PASSWORD'
            }), 400
        
        # Disable MFA
        current_user.mfa_enabled = False
        current_user.mfa_secret = None
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'MFA disabled successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"MFA disable error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to disable MFA',
            'error_code': 'MFA_DISABLE_ERROR'
        }), 500


@auth_bp.route('/generate-api-key', methods=['POST'])
@login_required
def generate_api_key():
    """Generate new API key for user."""
    try:
        # Generate new API key
        api_key = current_user.generate_api_key()
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'API key generated successfully',
            'api_key': api_key
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"API key generation error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate API key',
            'error_code': 'API_KEY_ERROR'
        }), 500


@auth_bp.route('/revoke-api-key', methods=['POST'])
@login_required
def revoke_api_key():
    """Revoke user's API key."""
    try:
        current_user.api_key = None
        current_user.api_key_created = None
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'API key revoked successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"API key revocation error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to revoke API key',
            'error_code': 'API_KEY_REVOCATION_ERROR'
        }), 500
