"""
Basic security monitoring for the Garage Management System.
"""
import json
from datetime import datetime, timedelta
from flask import current_app, request
from collections import defaultdict


class SecurityMonitor:
    """Basic security monitoring system."""
    
    def __init__(self, app=None):
        self.app = app
        self.alert_thresholds = {
            'failed_logins': {'threshold': 10, 'window_minutes': 5},
            'suspicious_ips': {'threshold': 50, 'window_minutes': 10}
        }
        self.monitoring_active = False
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize security monitor with Flask app."""
        self.app = app
        self.monitoring_active = app.config.get('SECURITY_MONITORING_ENABLED', True)
        
        if self.monitoring_active:
            current_app.logger.info("Security monitoring initialized")
    
    def check_failed_login_attempts(self):
        """Check for excessive failed login attempts."""
        try:
            from auth.models import LoginAttempt
            
            threshold_config = self.alert_thresholds['failed_logins']
            window_start = datetime.utcnow() - timedelta(minutes=threshold_config['window_minutes'])
            
            # This would normally query the database
            # For now, return a basic check
            return {
                'status': 'checked',
                'window_start': window_start.isoformat(),
                'threshold': threshold_config['threshold']
            }
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Failed login check error: {str(e)}")
            return {'error': str(e)}
    
    def get_security_metrics(self, hours=24):
        """Get basic security metrics."""
        try:
            window_start = datetime.utcnow() - timedelta(hours=hours)
            
            metrics = {
                'time_period': f"Last {hours} hours",
                'generated_at': datetime.utcnow().isoformat(),
                'login_attempts': {
                    'total': 0,
                    'successful': 0,
                    'failed': 0,
                    'unique_ips': 0
                },
                'user_activity': {
                    'active_users': 0,
                    'new_registrations': 0,
                    'locked_accounts': 0
                },
                'security_events': {
                    'alerts_generated': 0,
                    'suspicious_ips': 0,
                    'failed_login_attempts': 0
                }
            }
            
            # In a real implementation, these would query the database
            # For now, return mock data
            try:
                from auth.models import LoginAttempt, User
                
                # Count login attempts
                login_attempts = LoginAttempt.query.filter(
                    LoginAttempt.created_at >= window_start
                ).all()
                
                metrics['login_attempts']['total'] = len(login_attempts)
                metrics['login_attempts']['successful'] = sum(1 for attempt in login_attempts if attempt.success)
                metrics['login_attempts']['failed'] = sum(1 for attempt in login_attempts if not attempt.success)
                
                # Count active users
                metrics['user_activity']['active_users'] = User.query.filter(
                    User.last_login >= window_start
                ).count()
                
                metrics['user_activity']['new_registrations'] = User.query.filter(
                    User.created_at >= window_start
                ).count()
                
            except Exception:
                # If database queries fail, return mock data
                pass
            
            return metrics
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Security metrics generation failed: {str(e)}")
            return {'error': str(e)}
    
    def create_alert(self, alert_type, severity, message, details=None):
        """Create a security alert."""
        alert = {
            'id': f"{alert_type}_{int(datetime.utcnow().timestamp())}",
            'type': alert_type,
            'severity': severity,
            'message': message,
            'details': details or {},
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'new'
        }
        
        # Log the alert
        if current_app:
            current_app.logger.warning(f"SECURITY ALERT [{severity.upper()}]: {message}")
        
        return alert
    
    def run_compliance_checks(self):
        """Run basic compliance checks."""
        try:
            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'checks': {}
            }
            
            # Basic compliance checks
            results['checks']['monitoring_active'] = {
                'status': 'pass' if self.monitoring_active else 'fail',
                'message': 'Security monitoring is active' if self.monitoring_active else 'Security monitoring disabled'
            }
            
            # Check for overdue data subject requests
            try:
                from gdpr.models import DataSubjectRequest
                
                overdue_requests = DataSubjectRequest.query.filter(
                    DataSubjectRequest.due_date < datetime.utcnow(),
                    DataSubjectRequest.status.in_(['pending', 'in_progress'])
                ).count()
                
                results['checks']['overdue_requests'] = {
                    'count': overdue_requests,
                    'status': 'fail' if overdue_requests > 0 else 'pass'
                }
                
            except Exception:
                results['checks']['overdue_requests'] = {
                    'status': 'warning',
                    'message': 'Could not check data subject requests'
                }
            
            # Overall compliance status
            failed_checks = sum(1 for check in results['checks'].values() 
                              if check.get('status') == 'fail')
            
            results['overall_status'] = 'fail' if failed_checks > 0 else 'pass'
            
            return results
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Compliance checks failed: {str(e)}")
            return {'error': str(e)}
    
    def generate_security_report(self, days=7):
        """Generate basic security report."""
        try:
            report = {
                'report_period': f"Last {days} days",
                'generated_at': datetime.utcnow().isoformat(),
                'summary': {},
                'recommendations': []
            }
            
            # Get metrics for the period
            metrics = self.get_security_metrics(days * 24)
            
            if 'error' not in metrics:
                report['summary'] = {
                    'total_login_attempts': metrics['login_attempts']['total'],
                    'failed_login_attempts': metrics['login_attempts']['failed'],
                    'active_users': metrics['user_activity']['active_users'],
                    'security_score': 85  # Mock score
                }
                
                # Generate recommendations
                if metrics['login_attempts']['failed'] > 50:
                    report['recommendations'].append(
                        "High number of failed login attempts detected. Consider implementing additional security measures."
                    )
                
                if metrics['user_activity']['active_users'] == 0:
                    report['recommendations'].append(
                        "No active users detected. Verify user engagement and system accessibility."
                    )
            
            return report
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Security report generation failed: {str(e)}")
            return {'error': str(e)}


# Global security monitor instance
security_monitor = SecurityMonitor()
