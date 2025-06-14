"""
GDPR utility functions for the Garage Management System.
"""
import json
import hashlib
from datetime import datetime
from flask import current_app


def export_user_data(user_id):
    """Export all user data for GDPR compliance."""
    try:
        from auth.models import User
        from gdpr.models import ConsentRecord, DataSubjectRequest
        
        user = User.query.get(user_id)
        if not user:
            return None
        
        # Collect all user data
        export_data = {
            'export_info': {
                'user_id': user_id,
                'export_date': datetime.utcnow().isoformat(),
                'format': 'JSON',
                'version': '1.0'
            },
            'personal_data': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active
            },
            'consent_records': [],
            'data_requests': [],
            'business_data': {
                'note': 'Business data (vehicles, jobs, etc.) may be retained for legal and operational purposes'
            }
        }
        
        # Add consent records
        consent_records = ConsentRecord.query.filter_by(user_id=user_id).all()
        for consent in consent_records:
            export_data['consent_records'].append(consent.to_dict())
        
        # Add data subject requests
        data_requests = DataSubjectRequest.query.filter_by(user_id=user_id).all()
        for request in data_requests:
            export_data['data_requests'].append(request.to_dict())
        
        return export_data
        
    except Exception as e:
        if current_app:
            current_app.logger.error(f"User data export failed: {str(e)}")
        return None


def delete_user_data(user_id, anonymize_instead=True):
    """Delete or anonymize user data for GDPR compliance."""
    try:
        from auth.models import User
        from gdpr.models import ConsentRecord, DataSubjectRequest
        from models import db
        
        user = User.query.get(user_id)
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        if anonymize_instead:
            # Anonymize user data instead of deleting
            anonymous_id = f"anon_{hashlib.md5(str(user_id).encode()).hexdigest()[:8]}"
            
            user.username = anonymous_id
            user.email = f"{anonymous_id}@anonymized.local"
            user.first_name = "Anonymized"
            user.last_name = "User"
            user.is_active = False
            
            # Mark consent records as withdrawn
            consent_records = ConsentRecord.query.filter_by(user_id=user_id).all()
            for consent in consent_records:
                consent.withdraw()
            
            db.session.commit()
            
            return {
                'success': True,
                'action': 'anonymized',
                'anonymous_id': anonymous_id,
                'records_affected': {
                    'user_record': 1,
                    'consent_records': len(consent_records)
                }
            }
        else:
            # Complete deletion (use with caution)
            # Delete related records first
            ConsentRecord.query.filter_by(user_id=user_id).delete()
            DataSubjectRequest.query.filter_by(user_id=user_id).delete()
            
            # Delete user
            db.session.delete(user)
            db.session.commit()
            
            return {
                'success': True,
                'action': 'deleted',
                'user_id': user_id
            }
            
    except Exception as e:
        if current_app:
            current_app.logger.error(f"User data deletion failed: {str(e)}")
        return {'success': False, 'error': str(e)}


def anonymize_data(data, salt=None):
    """Anonymize sensitive data using consistent hashing."""
    if not data:
        return data
    
    if salt is None:
        salt = current_app.config.get('PSEUDONYMIZATION_SALT', 'default_salt')
    
    # Create consistent hash
    hash_input = f"{data}{salt}".encode('utf-8')
    hash_value = hashlib.sha256(hash_input).hexdigest()
    
    # Return first 8 characters as anonymized value
    return f"anon_{hash_value[:8]}"


def validate_consent(user_id, purpose):
    """Validate if user has given consent for a specific purpose."""
    try:
        from gdpr.models import ConsentRecord
        
        consent = ConsentRecord.query.filter_by(
            user_id=user_id,
            purpose=purpose,
            granted=True
        ).first()
        
        return consent and consent.is_valid()
        
    except Exception as e:
        if current_app:
            current_app.logger.error(f"Consent validation failed: {str(e)}")
        return False


def log_data_processing(activity_name, purpose, legal_basis, data_categories, user_id=None):
    """Log data processing activity for compliance."""
    try:
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'activity_name': activity_name,
            'purpose': purpose,
            'legal_basis': legal_basis,
            'data_categories': data_categories,
            'user_id': user_id
        }
        
        if current_app:
            current_app.logger.info(f"DATA PROCESSING: {json.dumps(log_entry)}")
        
        return True
        
    except Exception as e:
        if current_app:
            current_app.logger.error(f"Data processing logging failed: {str(e)}")
        return False


def check_data_retention_compliance():
    """Check data retention compliance."""
    try:
        from auth.models import User
        from gdpr.models import ConsentRecord
        
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {}
        }
        
        # Check for users with old data
        old_user_threshold = datetime.utcnow().replace(year=datetime.utcnow().year - 7)
        old_users = User.query.filter(
            User.created_at < old_user_threshold,
            User.last_login < old_user_threshold
        ).count()
        
        results['checks']['old_inactive_users'] = {
            'count': old_users,
            'status': 'warning' if old_users > 0 else 'pass',
            'message': f"{old_users} users with old inactive data"
        }
        
        # Check for expired consents
        expired_consents = ConsentRecord.query.filter(
            ConsentRecord.granted == True,
            ConsentRecord.created_at < old_user_threshold
        ).count()
        
        results['checks']['expired_consents'] = {
            'count': expired_consents,
            'status': 'warning' if expired_consents > 0 else 'pass',
            'message': f"{expired_consents} potentially expired consents"
        }
        
        return results
        
    except Exception as e:
        if current_app:
            current_app.logger.error(f"Data retention check failed: {str(e)}")
        return {'error': str(e)}


def generate_privacy_notice():
    """Generate privacy notice content."""
    return {
        'controller': {
            'name': current_app.config.get('COMPANY_NAME', 'Garage Management System'),
            'email': current_app.config.get('COMPANY_EMAIL', 'info@garagemanagement.com'),
            'address': current_app.config.get('COMPANY_ADDRESS', ''),
            'phone': current_app.config.get('COMPANY_PHONE', '')
        },
        'dpo': {
            'name': current_app.config.get('DPO_NAME', ''),
            'email': current_app.config.get('DPO_EMAIL', 'dpo@garagemanagement.com'),
            'phone': current_app.config.get('DPO_PHONE', '')
        },
        'purposes': [
            'Providing garage management services',
            'Customer relationship management',
            'Vehicle service tracking',
            'Legal compliance and record keeping'
        ],
        'legal_bases': [
            'Contract performance',
            'Legal obligation',
            'Legitimate interests'
        ],
        'data_categories': [
            'Personal identifiers (name, email)',
            'Contact information',
            'Vehicle information',
            'Service history'
        ],
        'retention_periods': {
            'customer_data': '7 years after last service',
            'vehicle_data': '10 years for MOT records',
            'consent_records': 'Until withdrawn plus 3 years',
            'audit_logs': '7 years'
        },
        'rights': [
            'Right to access your personal data',
            'Right to rectification of inaccurate data',
            'Right to erasure (right to be forgotten)',
            'Right to restrict processing',
            'Right to data portability',
            'Right to object to processing',
            'Right to withdraw consent'
        ]
    }
