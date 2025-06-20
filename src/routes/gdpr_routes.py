#!/usr/bin/env python3
"""
GDPR Compliance API Routes
Handles data subject rights, consent management, and data protection
"""

import json
import os
import tempfile
from datetime import datetime

from flask import Blueprint, jsonify, request, send_file

from services.gdpr_service import GDPRService

gdpr_bp = Blueprint('gdpr', __name__)

# Initialize GDPR service
db_path = os.path.join(os.path.dirname(os.path.dirname(
    os.path.dirname(__file__))), 'instance', 'garage.db')
gdpr_service = GDPRService(db_path)


@gdpr_bp.route('/api/gdpr/consent', methods=['POST'])
def record_consent():
    """Record customer consent for data processing"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        purpose = data.get('purpose')
        granted = data.get('granted', False)
        legal_basis = data.get('legal_basis', 'consent')

        if not customer_id or not purpose:
            return jsonify({
                'success': False,
                'error': 'Customer ID and purpose are required'
            }), 400

        # Get client information
        ip_address = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        user_agent = request.headers.get('User-Agent')

        success = gdpr_service.record_consent(
            customer_id, purpose, granted, ip_address, user_agent, legal_basis
        )

        if success:
            return jsonify({
                'success': True,
                'message': f'Consent {"granted" if granted else "withdrawn"} for {purpose}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to record consent'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/consent/<int:customer_id>')
def get_customer_consents(customer_id):
    """Get all consent records for a customer"""
    try:
        consents = gdpr_service.get_customer_consents(customer_id)

        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'consents': consents
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/data-export/<int:customer_id>')
def export_customer_data(customer_id):
    """Export all customer data (data portability)"""
    try:
        # Log the data access
        ip_address = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        gdpr_service.log_data_access(
            customer_id, 'API_USER', 'EXPORT',
            'Full data export request', 'Data portability', ip_address
        )

        export_result = gdpr_service.export_customer_data(customer_id)

        if export_result['success']:
            return jsonify({
                'success': True,
                'export_data': export_result['data'],
                'export_date': export_result['data']['export_date'],
                'customer_id': customer_id
            })
        else:
            return jsonify({
                'success': False,
                'error': export_result['error']
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/data-export/<int:customer_id>/download')
def download_customer_data(customer_id):
    """Download customer data as JSON file"""
    try:
        export_result = gdpr_service.export_customer_data(customer_id)

        if not export_result['success']:
            return jsonify({
                'success': False,
                'error': export_result['error']
            }), 404

        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False)
        json.dump(export_result['data'], temp_file, indent=2, default=str)
        temp_file.close()

        filename = f"customer_data_export_{customer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        return send_file(
            temp_file.name,
            as_attachment=True,
            download_name=filename,
            mimetype='application/json'
        )

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/data-deletion/<int:customer_id>', methods=['POST'])
def delete_customer_data(customer_id):
    """Delete customer data (right to erasure)"""
    try:
        data = request.get_json() or {}
        deletion_reason = data.get(
            'reason', 'Customer request for data deletion')
        confirm_deletion = data.get('confirm', False)

        if not confirm_deletion:
            return jsonify({
                'success': False,
                'error': 'Deletion must be explicitly confirmed'
            }), 400

        # Log the deletion request
        ip_address = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        gdpr_service.log_data_access(
            customer_id, 'API_USER', 'DELETE_REQUEST',
            'Customer data deletion request', deletion_reason, ip_address
        )

        deletion_result = gdpr_service.delete_customer_data(
            customer_id, deletion_reason)

        if deletion_result['success']:
            return jsonify({
                'success': True,
                'message': f"Customer data deleted successfully",
                'customer_name': deletion_result['customer_name'],
                'deleted_records': deletion_result['deleted_records'],
                'deletion_date': deletion_result['deletion_date']
            })
        else:
            return jsonify({
                'success': False,
                'error': deletion_result['error']
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/access-log/<int:customer_id>')
def get_access_log(customer_id):
    """Get data access log for a customer"""
    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT accessed_by, access_type, data_accessed, purpose, 
                   ip_address, access_date
            FROM data_access_log 
            WHERE customer_id = ?
            ORDER BY access_date DESC
            LIMIT 100
        ''', (customer_id,))

        access_log = []
        for row in cursor.fetchall():
            access_log.append({
                'accessed_by': row[0],
                'access_type': row[1],
                'data_accessed': row[2],
                'purpose': row[3],
                'ip_address': row[4],
                'access_date': row[5]
            })

        conn.close()

        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'access_log': access_log
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/compliance-status')
def get_compliance_status():
    """Get overall GDPR compliance status"""
    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if GDPR tables exist
        cursor.execute('''
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('consent_records', 'data_access_log', 'data_processing_activities')
        ''')
        gdpr_tables = [row[0] for row in cursor.fetchall()]

        # Get consent statistics
        cursor.execute(
            'SELECT COUNT(*) FROM consent_records WHERE granted = 1')
        active_consents = cursor.fetchone(
        )[0] if 'consent_records' in gdpr_tables else 0

        # Get access log statistics
        cursor.execute(
            'SELECT COUNT(*) FROM data_access_log WHERE access_date > date("now", "-30 days")')
        recent_access = cursor.fetchone(
        )[0] if 'data_access_log' in gdpr_tables else 0

        # Get customer count
        cursor.execute('SELECT COUNT(*) FROM customers')
        total_customers = cursor.fetchone()[0]

        conn.close()

        compliance_checks = {
            'gdpr_tables_created': len(gdpr_tables) >= 3,
            'consent_management_active': active_consents > 0,
            'access_logging_active': recent_access > 0,
            'data_export_available': True,  # API endpoints exist
            'data_deletion_available': True  # API endpoints exist
        }

        overall_compliance = all(compliance_checks.values())

        return jsonify({
            'success': True,
            'compliance_status': {
                'overall_compliant': overall_compliance,
                'checks': compliance_checks,
                'statistics': {
                    'total_customers': total_customers,
                    'active_consents': active_consents,
                    'recent_data_access': recent_access
                },
                'recommendations': [
                    'Implement consent collection in customer registration' if not compliance_checks[
                        'consent_management_active'] else None,
                    'Enable access logging for all customer data operations' if not compliance_checks[
                        'access_logging_active'] else None
                ]
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/data-processing-activities')
def get_data_processing_activities():
    """Get data processing activities register"""
    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT activity_name, purpose, legal_basis, data_categories,
                   retention_period, third_party_sharing, security_measures, created_date
            FROM data_processing_activities
            ORDER BY created_date DESC
        ''')

        activities = []
        for row in cursor.fetchall():
            activities.append({
                'activity_name': row[0],
                'purpose': row[1],
                'legal_basis': row[2],
                'data_categories': row[3],
                'retention_period': row[4],
                'third_party_sharing': bool(row[5]),
                'security_measures': row[6],
                'created_date': row[7]
            })

        conn.close()

        return jsonify({
            'success': True,
            'processing_activities': activities
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@gdpr_bp.route('/api/gdpr/data-processing-activities', methods=['POST'])
def add_data_processing_activity():
    """Add a new data processing activity"""
    try:
        data = request.get_json()

        required_fields = ['activity_name', 'purpose', 'legal_basis']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO data_processing_activities 
            (activity_name, purpose, legal_basis, data_categories, retention_period,
             third_party_sharing, security_measures)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['activity_name'],
            data['purpose'],
            data['legal_basis'],
            data.get('data_categories', ''),
            data.get('retention_period', 0),
            data.get('third_party_sharing', False),
            data.get('security_measures', '')
        ))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Data processing activity added successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
