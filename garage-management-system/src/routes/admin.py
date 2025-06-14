"""
Admin routes for security and system management.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from auth.decorators import admin_required, manager_required
from auth.models import User, Role, Permission, LoginAttempt
from auth.audit import AuditLog
from security.monitoring import security_monitor
from security.backup import backup_service
from gdpr.compliance import GDPRCompliance
from models import db
import json
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@manager_required
def get_users():
    """Get all users with pagination."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        role_filter = request.args.get('role')
        status_filter = request.args.get('status')
        
        query = User.query
        
        # Apply filters
        if search:
            query = query.filter(
                (User.username.contains(search)) |
                (User.email.contains(search)) |
                (User.first_name.contains(search)) |
                (User.last_name.contains(search))
            )
        
        if role_filter:
            role = Role.query.filter_by(name=role_filter).first()
            if role:
                query = query.filter_by(role_id=role.id)
        
        if status_filter == 'active':
            query = query.filter_by(is_active=True)
        elif status_filter == 'inactive':
            query = query.filter_by(is_active=False)
        elif status_filter == 'locked':
            query = query.filter(User.locked_until.isnot(None))
        
        users = query.order_by(User.created_at.desc())\
                    .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'status': 'success',
            'users': [user.to_dict() for user in users.items],
            'pagination': {
                'page': page,
                'pages': users.pages,
                'per_page': per_page,
                'total': users.total
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get users error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve users',
            'error_code': 'USERS_RETRIEVAL_ERROR'
        }), 500


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user details."""
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        # Store old values for audit
        old_values = user.to_dict()
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'phone', 'is_active', 'role_id']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        
        # Handle role change
        if 'role' in data:
            role = Role.query.filter_by(name=data['role']).first()
            if role:
                user.role_id = role.id
        
        db.session.commit()
        
        # Log the change
        from auth.audit import log_user_action
        log_user_action(
            user=user,
            action='admin_update_user',
            resource_type='user',
            resource_id=user_id,
            old_values=old_values,
            new_values=user.to_dict()
        )
        
        return jsonify({
            'status': 'success',
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update user error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update user',
            'error_code': 'USER_UPDATE_ERROR'
        }), 500


@admin_bp.route('/users/<int:user_id>/unlock', methods=['POST'])
@admin_required
def unlock_user(user_id):
    """Unlock a locked user account."""
    try:
        user = User.query.get_or_404(user_id)
        
        if not user.is_locked():
            return jsonify({
                'status': 'error',
                'message': 'User account is not locked',
                'error_code': 'ACCOUNT_NOT_LOCKED'
            }), 400
        
        user.unlock_account()
        
        # Log the action
        from auth.audit import log_user_action
        log_user_action(
            user=user,
            action='admin_unlock_account',
            resource_type='user',
            resource_id=user_id
        )
        
        return jsonify({
            'status': 'success',
            'message': 'User account unlocked successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Unlock user error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to unlock user account',
            'error_code': 'UNLOCK_ERROR'
        }), 500


@admin_bp.route('/security/metrics', methods=['GET'])
@admin_required
def get_security_metrics():
    """Get security metrics and statistics."""
    try:
        hours = request.args.get('hours', 24, type=int)
        metrics = security_monitor.get_security_metrics(hours)
        
        return jsonify({
            'status': 'success',
            'metrics': metrics
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Security metrics error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve security metrics',
            'error_code': 'SECURITY_METRICS_ERROR'
        }), 500


@admin_bp.route('/security/report', methods=['GET'])
@admin_required
def get_security_report():
    """Generate comprehensive security report."""
    try:
        days = request.args.get('days', 7, type=int)
        report = security_monitor.generate_security_report(days)
        
        return jsonify({
            'status': 'success',
            'report': report
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Security report error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate security report',
            'error_code': 'SECURITY_REPORT_ERROR'
        }), 500


@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs():
    """Get audit logs with filtering and pagination."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        user_id = request.args.get('user_id', type=int)
        action = request.args.get('action')
        resource_type = request.args.get('resource_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = AuditLog.query
        
        # Apply filters
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if action:
            query = query.filter(AuditLog.action.contains(action))
        
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(AuditLog.created_at >= start_dt)
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(AuditLog.created_at <= end_dt)
        
        logs = query.order_by(AuditLog.created_at.desc())\
                   .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'status': 'success',
            'logs': [log.to_dict() for log in logs.items],
            'pagination': {
                'page': page,
                'pages': logs.pages,
                'per_page': per_page,
                'total': logs.total
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Audit logs error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve audit logs',
            'error_code': 'AUDIT_LOGS_ERROR'
        }), 500


@admin_bp.route('/backup/create', methods=['POST'])
@admin_required
def create_backup():
    """Create a system backup."""
    try:
        data = request.get_json() or {}
        include_logs = data.get('include_logs', True)
        
        # Create backup
        result = backup_service.create_full_backup(include_logs=include_logs)
        
        if result['success']:
            return jsonify({
                'status': 'success',
                'message': 'Backup created successfully',
                'backup': {
                    'name': result['backup_name'],
                    'path': result['backup_path'],
                    'size': result['size'],
                    'created_at': datetime.utcnow().isoformat()
                }
            }), 201
        else:
            return jsonify({
                'status': 'error',
                'message': result['error'],
                'error_code': 'BACKUP_CREATION_ERROR'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Backup creation error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create backup',
            'error_code': 'BACKUP_ERROR'
        }), 500


@admin_bp.route('/backup/list', methods=['GET'])
@admin_required
def list_backups():
    """List available backups."""
    try:
        import os
        
        backup_dir = backup_service.backup_dir
        backups = []
        
        if os.path.exists(backup_dir):
            for filename in os.listdir(backup_dir):
                if filename.startswith('garage_backup_'):
                    file_path = os.path.join(backup_dir, filename)
                    stat = os.stat(file_path)
                    
                    backups.append({
                        'name': filename,
                        'size': stat.st_size,
                        'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'encrypted': filename.endswith('.enc')
                    })
        
        # Sort by creation date (newest first)
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'status': 'success',
            'backups': backups
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List backups error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to list backups',
            'error_code': 'BACKUP_LIST_ERROR'
        }), 500


@admin_bp.route('/roles', methods=['GET'])
@admin_required
def get_roles():
    """Get all roles and their permissions."""
    try:
        roles = Role.query.all()
        
        roles_data = []
        for role in roles:
            role_data = role.to_dict() if hasattr(role, 'to_dict') else {
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'is_active': role.is_active,
                'created_at': role.created_at.isoformat() if role.created_at else None
            }
            role_data['permissions'] = [perm.name for perm in role.permissions]
            roles_data.append(role_data)
        
        return jsonify({
            'status': 'success',
            'roles': roles_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get roles error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve roles',
            'error_code': 'ROLES_ERROR'
        }), 500


@admin_bp.route('/permissions', methods=['GET'])
@admin_required
def get_permissions():
    """Get all available permissions."""
    try:
        permissions = Permission.query.all()
        
        permissions_data = []
        for perm in permissions:
            perm_data = {
                'id': perm.id,
                'name': perm.name,
                'description': perm.description,
                'resource': perm.resource,
                'action': perm.action
            }
            permissions_data.append(perm_data)
        
        return jsonify({
            'status': 'success',
            'permissions': permissions_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get permissions error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve permissions',
            'error_code': 'PERMISSIONS_ERROR'
        }), 500


@admin_bp.route('/system/status', methods=['GET'])
@admin_required
def get_system_status():
    """Get overall system status and health."""
    try:
        # Database status
        try:
            db.session.execute('SELECT 1')
            db_status = 'healthy'
        except Exception:
            db_status = 'error'
        
        # Security monitoring status
        monitoring_status = 'active' if security_monitor.monitoring_active else 'inactive'
        
        # Recent activity
        recent_logins = LoginAttempt.query.filter(
            LoginAttempt.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        recent_audit_logs = AuditLog.query.filter(
            AuditLog.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        # User statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        locked_users = User.query.filter(User.locked_until.isnot(None)).count()
        
        status = {
            'timestamp': datetime.utcnow().isoformat(),
            'database': {
                'status': db_status,
                'connection': 'ok' if db_status == 'healthy' else 'error'
            },
            'security': {
                'monitoring_status': monitoring_status,
                'recent_logins_24h': recent_logins,
                'recent_audit_logs_24h': recent_audit_logs
            },
            'users': {
                'total': total_users,
                'active': active_users,
                'locked': locked_users
            },
            'overall_status': 'healthy' if all([
                db_status == 'healthy',
                monitoring_status == 'active'
            ]) else 'warning'
        }
        
        return jsonify({
            'status': 'success',
            'system_status': status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"System status error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve system status',
            'error_code': 'SYSTEM_STATUS_ERROR'
        }), 500


@admin_bp.route('/gdpr/compliance-check', methods=['POST'])
@admin_required
def run_gdpr_compliance_check():
    """Run GDPR compliance check."""
    try:
        gdpr_compliance = GDPRCompliance()
        results = gdpr_compliance.run_compliance_checks()
        
        return jsonify({
            'status': 'success',
            'compliance_results': results
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"GDPR compliance check error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to run compliance check',
            'error_code': 'GDPR_COMPLIANCE_ERROR'
        }), 500


@admin_bp.route('/security/alerts/configure', methods=['POST'])
@admin_required
def configure_security_alerts():
    """Configure security alert thresholds."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No configuration data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        # Update alert thresholds
        for alert_type, config in data.items():
            if alert_type in security_monitor.alert_thresholds:
                security_monitor.alert_thresholds[alert_type].update(config)
        
        return jsonify({
            'status': 'success',
            'message': 'Security alert configuration updated',
            'current_config': security_monitor.alert_thresholds
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Security alert configuration error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to configure security alerts',
            'error_code': 'ALERT_CONFIG_ERROR'
        }), 500


@admin_bp.route('/maintenance/cleanup', methods=['POST'])
@admin_required
def run_maintenance_cleanup():
    """Run maintenance cleanup tasks."""
    try:
        data = request.get_json() or {}
        tasks = data.get('tasks', ['sessions', 'audit_logs', 'backups'])
        
        results = {}
        
        # Cleanup expired sessions
        if 'sessions' in tasks:
            from auth.auth_manager import AuthManager
            auth_manager = AuthManager()
            cleaned_sessions = auth_manager.cleanup_expired_sessions()
            results['sessions'] = f"Cleaned {cleaned_sessions} expired sessions"
        
        # Cleanup old audit logs
        if 'audit_logs' in tasks:
            retention_days = current_app.config.get('AUDIT_LOG_RETENTION_DAYS', 365)
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            
            deleted_logs = AuditLog.query.filter(
                AuditLog.created_at < cutoff_date
            ).delete()
            db.session.commit()
            
            results['audit_logs'] = f"Deleted {deleted_logs} old audit logs"
        
        # Cleanup old backups
        if 'backups' in tasks:
            backup_service._cleanup_old_backups()
            results['backups'] = "Old backups cleaned up"
        
        return jsonify({
            'status': 'success',
            'message': 'Maintenance cleanup completed',
            'results': results
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Maintenance cleanup error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to run maintenance cleanup',
            'error_code': 'MAINTENANCE_ERROR'
        }), 500
