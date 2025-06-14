"""
GDPR compliance service for the Garage Management System.
"""
from datetime import datetime, timedelta
from flask import current_app
from models import db
from .models import ConsentRecord, DataSubjectRequest
from .utils import check_data_retention_compliance, validate_consent, log_data_processing


class GDPRCompliance:
    """GDPR compliance management service."""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize GDPR compliance with Flask app."""
        self.app = app
        
        try:
            current_app.logger.info("GDPR compliance service initialized")
        except:
            pass
    
    def check_consent_validity(self, user_id, purpose):
        """Check if user has valid consent for a specific purpose."""
        try:
            return validate_consent(user_id, purpose)
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Consent validity check failed: {str(e)}")
            return False
    
    def record_data_processing(self, user_id, activity, purpose, legal_basis='Contract'):
        """Record data processing activity for compliance."""
        try:
            return log_data_processing(
                activity_name=activity,
                purpose=purpose,
                legal_basis=legal_basis,
                data_categories=['personal_identifiers', 'contact_details'],
                user_id=user_id
            )
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Data processing recording failed: {str(e)}")
            return False
    
    def handle_data_subject_request(self, request_id):
        """Process a data subject request."""
        try:
            request_obj = DataSubjectRequest.query.get(request_id)
            if not request_obj:
                return {'success': False, 'error': 'Request not found'}
            
            if request_obj.request_type == 'access':
                return self._handle_access_request(request_obj)
            elif request_obj.request_type == 'erasure':
                return self._handle_erasure_request(request_obj)
            elif request_obj.request_type == 'portability':
                return self._handle_portability_request(request_obj)
            elif request_obj.request_type == 'rectification':
                return self._handle_rectification_request(request_obj)
            else:
                return {'success': False, 'error': 'Unknown request type'}
                
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Data subject request handling failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _handle_access_request(self, request_obj):
        """Handle data access request."""
        try:
            from .utils import export_user_data
            
            # Export user data
            export_data = export_user_data(request_obj.user_id)
            
            if export_data:
                request_obj.complete_request(
                    "Data export completed. Download available in user portal."
                )
                db.session.commit()
                
                return {'success': True, 'data': export_data}
            else:
                return {'success': False, 'error': 'Data export failed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_erasure_request(self, request_obj):
        """Handle data erasure request."""
        try:
            from .utils import delete_user_data
            
            # Check if erasure is legally required or if we can refuse
            if self._can_refuse_erasure(request_obj):
                request_obj.status = 'rejected'
                request_obj.response = (
                    "Erasure request cannot be fulfilled due to legal obligations "
                    "to retain data for business and regulatory purposes."
                )
                db.session.commit()
                return {'success': True, 'action': 'rejected'}
            
            # Proceed with erasure (anonymization)
            result = delete_user_data(request_obj.user_id, anonymize_instead=True)
            
            if result['success']:
                request_obj.complete_request(
                    "Personal data has been anonymized in accordance with GDPR requirements."
                )
                db.session.commit()
                
                return {'success': True, 'action': 'anonymized', 'result': result}
            else:
                return {'success': False, 'error': result.get('error', 'Erasure failed')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_portability_request(self, request_obj):
        """Handle data portability request."""
        try:
            from .utils import export_user_data
            
            # Export data in structured format
            export_data = export_user_data(request_obj.user_id)
            
            if export_data:
                # Filter to only include data provided by the user
                portable_data = {
                    'personal_data': export_data.get('personal_data', {}),
                    'consent_records': export_data.get('consent_records', [])
                }
                
                request_obj.complete_request(
                    "Data portability export completed. Download available in user portal."
                )
                db.session.commit()
                
                return {'success': True, 'data': portable_data}
            else:
                return {'success': False, 'error': 'Data export failed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_rectification_request(self, request_obj):
        """Handle data rectification request."""
        try:
            # This would require manual review in most cases
            request_obj.status = 'in_progress'
            request_obj.response = (
                "Rectification request received. Our team will review the requested "
                "changes and contact you within 5 business days."
            )
            db.session.commit()
            
            return {'success': True, 'action': 'manual_review_required'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _can_refuse_erasure(self, request_obj):
        """Determine if erasure request can be refused based on legal grounds."""
        # For a garage management system, we might have legal obligations
        # to retain data for tax, safety, or regulatory purposes
        # For this implementation, we'll allow erasure but use anonymization
        return False
    
    def run_compliance_checks(self):
        """Run automated compliance checks."""
        try:
            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'checks': {}
            }
            
            # Check overdue data subject requests
            overdue_requests = DataSubjectRequest.query.filter(
                DataSubjectRequest.due_date < datetime.utcnow(),
                DataSubjectRequest.status.in_(['pending', 'in_progress'])
            ).count()
            
            results['checks']['overdue_requests'] = {
                'count': overdue_requests,
                'status': 'fail' if overdue_requests > 0 else 'pass'
            }
            
            # Check data retention compliance
            retention_results = check_data_retention_compliance()
            results['checks']['data_retention'] = retention_results
            
            # Check consent validity
            expired_consents = ConsentRecord.query.filter(
                ConsentRecord.granted == True,
                ConsentRecord.created_at < datetime.utcnow() - timedelta(days=365*3)  # 3 years
            ).count()
            
            results['checks']['expired_consents'] = {
                'count': expired_consents,
                'status': 'warning' if expired_consents > 0 else 'pass'
            }
            
            # Overall compliance status
            failed_checks = sum(1 for check in results['checks'].values() 
                              if isinstance(check, dict) and check.get('status') == 'fail')
            
            results['overall_status'] = 'fail' if failed_checks > 0 else 'pass'
            
            return results
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Compliance checks failed: {str(e)}")
            return {'error': str(e)}
    
    def generate_compliance_report(self):
        """Generate comprehensive compliance report."""
        try:
            report = {
                'generated_at': datetime.utcnow().isoformat(),
                'period': {
                    'start': (datetime.utcnow() - timedelta(days=30)).isoformat(),
                    'end': datetime.utcnow().isoformat()
                },
                'metrics': {},
                'compliance_status': {},
                'recommendations': []
            }
            
            # Data subject requests metrics
            total_requests = DataSubjectRequest.query.count()
            completed_requests = DataSubjectRequest.query.filter_by(status='completed').count()
            
            report['metrics']['data_subject_requests'] = {
                'total': total_requests,
                'completed': completed_requests,
                'completion_rate': (completed_requests / total_requests * 100) if total_requests > 0 else 0
            }
            
            # Consent metrics
            total_consents = ConsentRecord.query.count()
            active_consents = ConsentRecord.query.filter_by(granted=True).count()
            
            report['metrics']['consent_management'] = {
                'total_records': total_consents,
                'active_consents': active_consents
            }
            
            # Run compliance checks
            compliance_checks = self.run_compliance_checks()
            report['compliance_status'] = compliance_checks
            
            # Generate recommendations
            if compliance_checks.get('overall_status') == 'fail':
                report['recommendations'].append(
                    "Address overdue data subject requests immediately"
                )
            
            if compliance_checks.get('checks', {}).get('expired_consents', {}).get('count', 0) > 0:
                report['recommendations'].append(
                    "Review and refresh expired consent records"
                )
            
            return report
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Compliance report generation failed: {str(e)}")
            return {'error': str(e)}
    
    def cleanup_expired_data(self):
        """Clean up expired data according to retention policies."""
        try:
            results = check_data_retention_compliance()
            
            # Log cleanup results
            if current_app:
                current_app.logger.info(f"Data retention cleanup completed: {results}")
            
            return results
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Data cleanup failed: {str(e)}")
            return {'error': str(e)}
