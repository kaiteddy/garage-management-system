#!/usr/bin/env python3
"""
Audit Trail & Logging API Routes
Handles audit trail queries, security monitoring, and compliance reporting
"""

import json
import os
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from services.audit_service import AuditService, AuditSeverity

audit_bp = Blueprint('audit', __name__)

# Initialize audit service
db_path = os.path.join(os.path.dirname(os.path.dirname(
    os.path.dirname(__file__))), 'instance', 'garage.db')
audit_service = AuditService(db_path)


@audit_bp.route('/api/audit/trail')
def get_audit_trail():
    """Get audit trail with optional filtering"""
    try:
        # Get query parameters
        resource_type = request.args.get('resource_type')
        resource_id = request.args.get('resource_id')
        user_id = request.args.get('user_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 100))

        # Validate limit
        if limit > 1000:
            limit = 1000

        audit_trail = audit_service.get_audit_trail(
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        return jsonify({
            'success': True,
            'audit_trail': audit_trail,
            'count': len(audit_trail),
            'filters': {
                'resource_type': resource_type,
                'resource_id': resource_id,
                'user_id': user_id,
                'start_date': start_date,
                'end_date': end_date,
                'limit': limit
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/security-events')
def get_security_events():
    """Get security events with optional filtering"""
    try:
        severity = request.args.get('severity')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 100))

        if limit > 1000:
            limit = 1000

        security_events = audit_service.get_security_events(
            severity=severity,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        return jsonify({
            'success': True,
            'security_events': security_events,
            'count': len(security_events)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/performance')
def get_performance_metrics():
    """Get performance metrics"""
    try:
        endpoint = request.args.get('endpoint')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        metrics = audit_service.get_performance_metrics(
            endpoint=endpoint,
            start_date=start_date,
            end_date=end_date
        )

        return jsonify({
            'success': True,
            'performance_metrics': metrics
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/errors')
def get_error_summary():
    """Get error summary statistics"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        error_summary = audit_service.get_error_summary(
            start_date=start_date,
            end_date=end_date
        )

        return jsonify({
            'success': True,
            'error_summary': error_summary
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/log-event', methods=['POST'])
def log_audit_event():
    """Manually log an audit event"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['event_type', 'action', 'user_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        # Get client information
        ip_address = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        user_agent = request.headers.get('User-Agent')

        # Determine event type and severity
        event_type_map = {
            'DATA_ACCESS': audit_service.AuditEventType.DATA_ACCESS,
            'DATA_MODIFY': audit_service.AuditEventType.DATA_MODIFY,
            'DATA_DELETE': audit_service.AuditEventType.DATA_DELETE,
            'DATA_EXPORT': audit_service.AuditEventType.DATA_EXPORT,
            'SYSTEM_CONFIG': audit_service.AuditEventType.SYSTEM_CONFIG,
            'API_CALL': audit_service.AuditEventType.API_CALL,
            'SECURITY_EVENT': audit_service.AuditEventType.SECURITY_EVENT,
            'COMPLIANCE_EVENT': audit_service.AuditEventType.COMPLIANCE_EVENT
        }

        severity_map = {
            'LOW': AuditSeverity.LOW,
            'MEDIUM': AuditSeverity.MEDIUM,
            'HIGH': AuditSeverity.HIGH,
            'CRITICAL': AuditSeverity.CRITICAL
        }

        event_type = event_type_map.get(
            data['event_type'], audit_service.AuditEventType.API_CALL)
        severity = severity_map.get(
            data.get('severity', 'MEDIUM'), AuditSeverity.MEDIUM)

        # Create audit event
        from services.audit_service import AuditEvent

        event = AuditEvent(
            event_type=event_type,
            severity=severity,
            user_id=data['user_id'],
            resource_type=data.get('resource_type', ''),
            resource_id=data.get('resource_id', ''),
            action=data['action'],
            details=data.get('details', {}),
            ip_address=ip_address or '',
            user_agent=user_agent or '',
            timestamp=datetime.now()
        )

        success = audit_service.log_event(event)

        if success:
            return jsonify({
                'success': True,
                'message': 'Audit event logged successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to log audit event'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/log-security-event', methods=['POST'])
def log_security_event():
    """Log a security event"""
    try:
        data = request.get_json()

        required_fields = ['event_type', 'attempted_action']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        # Get client information
        source_ip = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        user_agent = request.headers.get('User-Agent')

        severity_map = {
            'LOW': AuditSeverity.LOW,
            'MEDIUM': AuditSeverity.MEDIUM,
            'HIGH': AuditSeverity.HIGH,
            'CRITICAL': AuditSeverity.CRITICAL
        }

        severity = severity_map.get(
            data.get('severity', 'MEDIUM'), AuditSeverity.MEDIUM)

        success = audit_service.log_security_event(
            event_type=data['event_type'],
            severity=severity,
            source_ip=source_ip,
            attempted_action=data['attempted_action'],
            failure_reason=data.get('failure_reason'),
            blocked=data.get('blocked', False),
            user_agent=user_agent
        )

        if success:
            return jsonify({
                'success': True,
                'message': 'Security event logged successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to log security event'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/compliance-events')
def get_compliance_events():
    """Get compliance events"""
    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, compliance_type, event_description, customer_id, data_subject,
                   legal_basis, retention_period, action_required, due_date,
                   completed_date, timestamp
            FROM compliance_events
            ORDER BY timestamp DESC
            LIMIT 100
        ''')

        compliance_events = []
        for row in cursor.fetchall():
            compliance_events.append({
                'id': row[0],
                'compliance_type': row[1],
                'event_description': row[2],
                'customer_id': row[3],
                'data_subject': row[4],
                'legal_basis': row[5],
                'retention_period': row[6],
                'action_required': bool(row[7]),
                'due_date': row[8],
                'completed_date': row[9],
                'timestamp': row[10]
            })

        conn.close()

        return jsonify({
            'success': True,
            'compliance_events': compliance_events,
            'count': len(compliance_events)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/cleanup', methods=['POST'])
def cleanup_old_logs():
    """Clean up old log entries"""
    try:
        data = request.get_json() or {}
        retention_days = data.get('retention_days', 365)

        # Validate retention period
        if retention_days < 30:
            return jsonify({
                'success': False,
                'error': 'Minimum retention period is 30 days'
            }), 400

        result = audit_service.cleanup_old_logs(retention_days)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@audit_bp.route('/api/audit/dashboard')
def get_audit_dashboard():
    """Get audit dashboard summary"""
    try:
        # Get date range (last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')

        # Get various metrics
        recent_audit_trail = audit_service.get_audit_trail(
            start_date=start_date_str,
            end_date=end_date_str,
            limit=10
        )

        security_events = audit_service.get_security_events(
            start_date=start_date_str,
            end_date=end_date_str,
            limit=10
        )

        performance_metrics = audit_service.get_performance_metrics(
            start_date=start_date_str,
            end_date=end_date_str
        )

        error_summary = audit_service.get_error_summary(
            start_date=start_date_str,
            end_date=end_date_str
        )

        return jsonify({
            'success': True,
            'dashboard': {
                'period': {
                    'start_date': start_date_str,
                    'end_date': end_date_str,
                    'days': 30
                },
                'recent_audit_events': recent_audit_trail,
                'security_events': security_events,
                'performance_metrics': performance_metrics,
                'error_summary': error_summary
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
