"""
GDPR compliance routes for the Garage Management System.
"""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from auth.decorators import admin_required, manager_required
from gdpr.models import ConsentRecord, DataSubjectRequest, DataProcessingRecord
from gdpr.utils import export_user_data, delete_user_data, anonymize_data
from models import db
import io
import zipfile

gdpr_bp = Blueprint('gdpr', __name__)


@gdpr_bp.route('/privacy-policy', methods=['GET'])
def privacy_policy():
    """Get privacy policy information."""
    try:
        policy = {
            'last_updated': '2024-01-01',
            'controller': {
                'name': current_app.config.get('COMPANY_NAME', 'Garage Management System'),
                'address': current_app.config.get('COMPANY_ADDRESS', ''),
                'phone': current_app.config.get('COMPANY_PHONE', ''),
                'email': current_app.config.get('COMPANY_EMAIL', 'info@garagemanagement.com')
            },
            'dpo': {
                'name': current_app.config.get('DPO_NAME', ''),
                'email': current_app.config.get('DPO_EMAIL', 'dpo@garagemanagement.com'),
                'phone': current_app.config.get('DPO_PHONE', '')
            },
            'data_processing': [],
            'rights': [
                'Right to access your personal data',
                'Right to rectification of inaccurate data',
                'Right to erasure (right to be forgotten)',
                'Right to restrict processing',
                'Right to data portability',
                'Right to object to processing',
                'Right to withdraw consent'
            ],
            'retention_periods': {
                'customer_data': '7 years after last service',
                'vehicle_data': '10 years for MOT records',
                'audit_logs': '7 years',
                'session_data': '30 days after session end'
            }
        }
        
        # Get data processing activities
        processing_records = DataProcessingRecord.query.all()
        policy['data_processing'] = [record.to_dict() for record in processing_records]
        
        return jsonify({
            'status': 'success',
            'policy': policy
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Privacy policy error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve privacy policy',
            'error_code': 'PRIVACY_POLICY_ERROR'
        }), 500


@gdpr_bp.route('/consent', methods=['POST'])
def record_consent():
    """Record user consent."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        consent_type = data.get('consent_type')
        purpose = data.get('purpose')
        granted = data.get('granted', False)
        
        if not consent_type or not purpose:
            return jsonify({
                'status': 'error',
                'message': 'Consent type and purpose are required',
                'error_code': 'MISSING_FIELDS'
            }), 400
        
        # Create consent record
        consent = ConsentRecord(
            user_id=current_user.id if current_user.is_authenticated else None,
            email=data.get('email'),
            consent_type=consent_type,
            purpose=purpose,
            legal_basis=data.get('legal_basis', 'Consent'),
            granted=granted,
            granted_at=datetime.utcnow() if granted else None,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            consent_method='web_form'
        )
        
        db.session.add(consent)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Consent recorded successfully',
            'consent_id': consent.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Consent recording error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to record consent',
            'error_code': 'CONSENT_ERROR'
        }), 500


@gdpr_bp.route('/consent/withdraw', methods=['POST'])
@login_required
def withdraw_consent():
    """Withdraw user consent."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        consent_id = data.get('consent_id')
        
        if not consent_id:
            return jsonify({
                'status': 'error',
                'message': 'Consent ID is required',
                'error_code': 'MISSING_CONSENT_ID'
            }), 400
        
        # Find and withdraw consent
        consent = ConsentRecord.query.filter_by(
            id=consent_id,
            user_id=current_user.id
        ).first()
        
        if not consent:
            return jsonify({
                'status': 'error',
                'message': 'Consent record not found',
                'error_code': 'CONSENT_NOT_FOUND'
            }), 404
        
        consent.withdraw()
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Consent withdrawn successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Consent withdrawal error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to withdraw consent',
            'error_code': 'CONSENT_WITHDRAWAL_ERROR'
        }), 500


@gdpr_bp.route('/data-request', methods=['POST'])
@login_required
def submit_data_request():
    """Submit a data subject request."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        request_type = data.get('request_type')
        description = data.get('description', '')
        
        valid_types = ['access', 'rectification', 'erasure', 'portability', 'restriction']
        if request_type not in valid_types:
            return jsonify({
                'status': 'error',
                'message': f'Invalid request type. Must be one of: {", ".join(valid_types)}',
                'error_code': 'INVALID_REQUEST_TYPE'
            }), 400
        
        # Create data subject request
        data_request = DataSubjectRequest(
            user_id=current_user.id,
            email=current_user.email,
            request_type=request_type,
            description=description,
            specific_data=json.dumps(data.get('specific_data', {})),
            identity_verified=True,  # Already authenticated
            verification_method='login_authentication',
            verification_date=datetime.utcnow()
        )
        
        db.session.add(data_request)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Data request submitted successfully',
            'request_id': data_request.id,
            'due_date': data_request.due_date.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Data request submission error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to submit data request',
            'error_code': 'DATA_REQUEST_ERROR'
        }), 500


@gdpr_bp.route('/data-requests', methods=['GET'])
@login_required
def get_data_requests():
    """Get user's data subject requests."""
    try:
        requests = DataSubjectRequest.query.filter_by(
            user_id=current_user.id
        ).order_by(DataSubjectRequest.created_at.desc()).all()
        
        return jsonify({
            'status': 'success',
            'requests': [req.to_dict() for req in requests]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Data requests retrieval error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve data requests',
            'error_code': 'DATA_REQUESTS_ERROR'
        }), 500


@gdpr_bp.route('/export-data', methods=['POST'])
@login_required
def export_my_data():
    """Export user's personal data."""
    try:
        # Export user data
        export_data = export_user_data(current_user.id)
        
        if not export_data:
            return jsonify({
                'status': 'error',
                'message': 'Failed to export data',
                'error_code': 'EXPORT_ERROR'
            }), 500
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add main data export
            zip_file.writestr(
                'personal_data.json',
                json.dumps(export_data, indent=2, default=str)
            )
            
            # Add privacy policy
            zip_file.writestr(
                'privacy_policy.txt',
                f"Your data was exported on {datetime.utcnow().isoformat()}\n"
                f"For questions about your data, contact: {current_app.config.get('DPO_EMAIL', 'dpo@garagemanagement.com')}"
            )
        
        zip_buffer.seek(0)
        
        return send_file(
            zip_buffer,
            as_attachment=True,
            download_name=f'personal_data_{current_user.id}_{datetime.utcnow().strftime("%Y%m%d")}.zip',
            mimetype='application/zip'
        )
        
    except Exception as e:
        current_app.logger.error(f"Data export error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to export data',
            'error_code': 'DATA_EXPORT_ERROR'
        }), 500


@gdpr_bp.route('/delete-account', methods=['POST'])
@login_required
def delete_my_account():
    """Delete user account and data."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        password = data.get('password')
        confirmation = data.get('confirmation')
        
        if not password:
            return jsonify({
                'status': 'error',
                'message': 'Password is required',
                'error_code': 'MISSING_PASSWORD'
            }), 400
        
        if confirmation != 'DELETE':
            return jsonify({
                'status': 'error',
                'message': 'Please type "DELETE" to confirm account deletion',
                'error_code': 'INVALID_CONFIRMATION'
            }), 400
        
        # Verify password
        if not current_user.check_password(password):
            return jsonify({
                'status': 'error',
                'message': 'Invalid password',
                'error_code': 'INVALID_PASSWORD'
            }), 400
        
        # Delete user data
        anonymize_instead = data.get('anonymize_instead', True)
        result = delete_user_data(current_user.id, anonymize_instead)
        
        if result['success']:
            # Log out user
            from auth.auth_manager import AuthManager
            auth_manager = AuthManager()
            auth_manager.logout_user_session()
            
            return jsonify({
                'status': 'success',
                'message': f'Account {"anonymized" if anonymize_instead else "deleted"} successfully',
                'result': result
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': result['error'],
                'error_code': 'ACCOUNT_DELETION_ERROR'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Account deletion error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to delete account',
            'error_code': 'ACCOUNT_DELETION_ERROR'
        }), 500


@gdpr_bp.route('/admin/data-requests', methods=['GET'])
@manager_required
def admin_get_data_requests():
    """Get all data subject requests (admin)."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = DataSubjectRequest.query
        
        if status:
            query = query.filter_by(status=status)
        
        requests = query.order_by(DataSubjectRequest.created_at.desc())\
                       .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'status': 'success',
            'requests': [req.to_dict() for req in requests.items],
            'pagination': {
                'page': page,
                'pages': requests.pages,
                'per_page': per_page,
                'total': requests.total
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Admin data requests error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve data requests',
            'error_code': 'ADMIN_DATA_REQUESTS_ERROR'
        }), 500


@gdpr_bp.route('/admin/data-request/<int:request_id>/process', methods=['POST'])
@manager_required
def admin_process_data_request(request_id):
    """Process a data subject request (admin)."""
    try:
        data_request = DataSubjectRequest.query.get_or_404(request_id)
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        action = data.get('action')  # 'approve', 'reject', 'extend'
        response = data.get('response', '')
        
        if action == 'approve':
            data_request.status = 'completed'
            data_request.complete_request(response)
            data_request.assigned_to = current_user.id
            
        elif action == 'reject':
            rejection_reason = data.get('rejection_reason', '')
            data_request.reject_request(rejection_reason)
            data_request.assigned_to = current_user.id
            
        elif action == 'extend':
            extension_days = data.get('extension_days', 60)
            data_request.extend_deadline(extension_days)
            data_request.status = 'in_progress'
            data_request.assigned_to = current_user.id
            
        else:
            return jsonify({
                'status': 'error',
                'message': 'Invalid action',
                'error_code': 'INVALID_ACTION'
            }), 400
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Request {action}d successfully',
            'request': data_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Data request processing error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to process data request',
            'error_code': 'DATA_REQUEST_PROCESSING_ERROR'
        }), 500


@gdpr_bp.route('/admin/compliance-report', methods=['GET'])
@admin_required
def compliance_report():
    """Generate GDPR compliance report."""
    try:
        # Get statistics
        total_requests = DataSubjectRequest.query.count()
        pending_requests = DataSubjectRequest.query.filter_by(status='pending').count()
        overdue_requests = DataSubjectRequest.query.filter(
            DataSubjectRequest.due_date < datetime.utcnow(),
            DataSubjectRequest.status.in_(['pending', 'in_progress'])
        ).count()
        
        consent_records = ConsentRecord.query.count()
        active_consents = ConsentRecord.query.filter_by(granted=True).count()
        
        processing_activities = DataProcessingRecord.query.count()
        
        report = {
            'generated_at': datetime.utcnow().isoformat(),
            'data_subject_requests': {
                'total': total_requests,
                'pending': pending_requests,
                'overdue': overdue_requests
            },
            'consent_management': {
                'total_records': consent_records,
                'active_consents': active_consents
            },
            'data_processing': {
                'registered_activities': processing_activities
            },
            'compliance_status': 'compliant' if overdue_requests == 0 else 'attention_required'
        }
        
        return jsonify({
            'status': 'success',
            'report': report
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Compliance report error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate compliance report',
            'error_code': 'COMPLIANCE_REPORT_ERROR'
        }), 500
