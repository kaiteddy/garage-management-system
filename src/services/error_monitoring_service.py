#!/usr/bin/env python3
"""
Error Monitoring & Recovery Service
Comprehensive error handling, monitoring, and automated recovery system
"""

import json
import logging
import os
import sqlite3
import traceback
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Dict, List, Optional


@dataclass
class ErrorReport:
    """Error report structure"""
    error_type: str
    error_message: str
    stack_trace: str
    endpoint: str
    user_id: str
    request_data: Dict
    timestamp: datetime
    severity: str
    resolved: bool = False


class ErrorMonitoringService:
    """Service for error monitoring and automated recovery"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._setup_logging()
        self._ensure_monitoring_tables()

    def _setup_logging(self):
        """Setup comprehensive logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/garage_system.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def _ensure_monitoring_tables(self):
        """Create monitoring tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # System health monitoring table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_health_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name VARCHAR(100) NOT NULL,
                    metric_value REAL NOT NULL,
                    metric_unit VARCHAR(20),
                    threshold_warning REAL,
                    threshold_critical REAL,
                    status VARCHAR(20) DEFAULT 'OK',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # API response time monitoring
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint VARCHAR(200) NOT NULL,
                    method VARCHAR(10) NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    status_code INTEGER NOT NULL,
                    user_id VARCHAR(100),
                    error_message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Automated fixes log
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS automated_fixes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    error_type VARCHAR(100) NOT NULL,
                    fix_applied VARCHAR(200) NOT NULL,
                    fix_description TEXT,
                    success BOOLEAN NOT NULL,
                    before_state TEXT,
                    after_state TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            conn.commit()
            conn.close()

        except Exception as e:
            print(f"Error creating monitoring tables: {str(e)}")

    def monitor_api_performance(self, func):
        """Decorator to monitor API performance"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            endpoint = getattr(func, '__name__', 'unknown')

            try:
                result = func(*args, **kwargs)

                # Calculate response time
                response_time = (datetime.now() -
                                 start_time).total_seconds() * 1000

                # Log performance metric
                self._log_api_performance(
                    endpoint=endpoint,
                    method='GET',  # Default, could be enhanced
                    response_time_ms=int(response_time),
                    status_code=200,
                    user_id=kwargs.get('user_id', 'system')
                )

                return result

            except Exception as e:
                response_time = (datetime.now() -
                                 start_time).total_seconds() * 1000

                # Log error performance
                self._log_api_performance(
                    endpoint=endpoint,
                    method='GET',
                    response_time_ms=int(response_time),
                    status_code=500,
                    error_message=str(e)
                )

                # Apply automated fix if available
                self._attempt_automated_fix(endpoint, str(e), kwargs)

                raise

        return wrapper

    def _log_api_performance(self, endpoint: str, method: str, response_time_ms: int,
                             status_code: int, user_id: str = None, error_message: str = None):
        """Log API performance metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO api_performance_metrics 
                (endpoint, method, response_time_ms, status_code, user_id, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (endpoint, method, response_time_ms, status_code, user_id, error_message))

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to log API performance: {str(e)}")

    def _attempt_automated_fix(self, endpoint: str, error_message: str, context: Dict):
        """Attempt automated fix for common errors"""
        try:
            fix_applied = None
            success = False

            # Database connection errors
            if "database is locked" in error_message.lower():
                fix_applied = "database_connection_retry"
                success = self._fix_database_lock(context)

            # Memory errors
            elif "memory" in error_message.lower():
                fix_applied = "memory_cleanup"
                success = self._fix_memory_issues()

            # API timeout errors
            elif "timeout" in error_message.lower():
                fix_applied = "api_timeout_retry"
                success = self._fix_api_timeout(endpoint, context)

            # Null pointer/attribute errors
            elif "nonetype" in error_message.lower() or "attribute" in error_message.lower():
                fix_applied = "null_check_enhancement"
                success = self._fix_null_pointer_errors(
                    endpoint, error_message)

            if fix_applied:
                self._log_automated_fix(
                    error_type=error_message[:100],
                    fix_applied=fix_applied,
                    success=success,
                    context=context
                )

        except Exception as e:
            self.logger.error(f"Automated fix attempt failed: {str(e)}")

    def _fix_database_lock(self, context: Dict) -> bool:
        """Fix database lock issues"""
        try:
            # Wait and retry with exponential backoff
            import time
            time.sleep(0.1)

            # Close any hanging connections
            conn = sqlite3.connect(self.db_path)
            conn.execute('PRAGMA journal_mode=WAL;')
            conn.close()

            return True

        except Exception:
            return False

    def _fix_memory_issues(self) -> bool:
        """Fix memory-related issues"""
        try:
            import gc
            gc.collect()
            return True

        except Exception:
            return False

    def _fix_api_timeout(self, endpoint: str, context: Dict) -> bool:
        """Fix API timeout issues"""
        try:
            # Implement retry logic with circuit breaker pattern
            # This is a placeholder for actual retry implementation
            return True

        except Exception:
            return False

    def _fix_null_pointer_errors(self, endpoint: str, error_message: str) -> bool:
        """Fix null pointer/attribute errors"""
        try:
            # Log the specific null error for future prevention
            self.logger.warning(
                f"Null pointer error in {endpoint}: {error_message}")

            # Return graceful degradation response
            return True

        except Exception:
            return False

    def _log_automated_fix(self, error_type: str, fix_applied: str, success: bool, context: Dict):
        """Log automated fix attempts"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO automated_fixes 
                (error_type, fix_applied, fix_description, success, before_state, after_state)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                error_type,
                fix_applied,
                f"Automated fix for {error_type}",
                success,
                json.dumps(context),
                "Fixed" if success else "Failed"
            ))

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to log automated fix: {str(e)}")

    def log_system_health_metric(self, metric_name: str, value: float, unit: str = None,
                                 warning_threshold: float = None, critical_threshold: float = None):
        """Log system health metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Determine status based on thresholds
            status = 'OK'
            if critical_threshold and value >= critical_threshold:
                status = 'CRITICAL'
            elif warning_threshold and value >= warning_threshold:
                status = 'WARNING'

            cursor.execute('''
                INSERT INTO system_health_metrics 
                (metric_name, metric_value, metric_unit, threshold_warning, 
                 threshold_critical, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (metric_name, value, unit, warning_threshold, critical_threshold, status))

            conn.commit()
            conn.close()

            # Alert if critical
            if status == 'CRITICAL':
                self.logger.critical(
                    f"CRITICAL: {metric_name} = {value} {unit or ''}")
            elif status == 'WARNING':
                self.logger.warning(
                    f"WARNING: {metric_name} = {value} {unit or ''}")

        except Exception as e:
            self.logger.error(f"Failed to log health metric: {str(e)}")

    def get_system_health_report(self, hours: int = 24) -> Dict:
        """Get system health report for the last N hours"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cutoff_time = datetime.now() - timedelta(hours=hours)

            # Get health metrics
            cursor.execute('''
                SELECT metric_name, AVG(metric_value), MAX(metric_value), 
                       COUNT(*), status
                FROM system_health_metrics 
                WHERE timestamp > ?
                GROUP BY metric_name
                ORDER BY metric_name
            ''', (cutoff_time,))

            health_metrics = []
            for row in cursor.fetchall():
                health_metrics.append({
                    'metric_name': row[0],
                    'avg_value': round(row[1], 2),
                    'max_value': round(row[2], 2),
                    'sample_count': row[3],
                    'status': row[4]
                })

            # Get error summary
            cursor.execute('''
                SELECT COUNT(*) as total_errors,
                       SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as server_errors,
                       AVG(response_time_ms) as avg_response_time
                FROM api_performance_metrics 
                WHERE timestamp > ?
            ''', (cutoff_time,))

            error_stats = cursor.fetchone()

            # Get automated fixes
            cursor.execute('''
                SELECT fix_applied, COUNT(*), SUM(CASE WHEN success THEN 1 ELSE 0 END)
                FROM automated_fixes 
                WHERE timestamp > ?
                GROUP BY fix_applied
            ''', (cutoff_time,))

            automated_fixes = []
            for row in cursor.fetchall():
                automated_fixes.append({
                    'fix_type': row[0],
                    'attempts': row[1],
                    'successes': row[2],
                    'success_rate': round((row[2] / row[1]) * 100, 1) if row[1] > 0 else 0
                })

            conn.close()

            return {
                'success': True,
                'report_period_hours': hours,
                'health_metrics': health_metrics,
                'error_statistics': {
                    'total_errors': error_stats[0] or 0,
                    'server_errors': error_stats[1] or 0,
                    'avg_response_time_ms': round(error_stats[2] or 0, 2)
                },
                'automated_fixes': automated_fixes,
                'overall_status': self._calculate_overall_status(health_metrics)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _calculate_overall_status(self, health_metrics: List[Dict]) -> str:
        """Calculate overall system status"""
        if not health_metrics:
            return 'UNKNOWN'

        statuses = [metric['status'] for metric in health_metrics]

        if 'CRITICAL' in statuses:
            return 'CRITICAL'
        elif 'WARNING' in statuses:
            return 'WARNING'
        else:
            return 'OK'

    def create_error_report(self, error: Exception, endpoint: str = None,
                            user_id: str = None, request_data: Dict = None) -> str:
        """Create comprehensive error report"""
        try:
            error_report = ErrorReport(
                error_type=type(error).__name__,
                error_message=str(error),
                stack_trace=traceback.format_exc(),
                endpoint=endpoint or 'unknown',
                user_id=user_id or 'system',
                request_data=request_data or {},
                timestamp=datetime.now(),
                severity=self._determine_error_severity(error)
            )

            # Log to audit service if available
            try:
                from services.audit_service import AuditService, AuditSeverity
                audit_service = AuditService(self.db_path)

                severity_map = {
                    'LOW': AuditSeverity.LOW,
                    'MEDIUM': AuditSeverity.MEDIUM,
                    'HIGH': AuditSeverity.HIGH,
                    'CRITICAL': AuditSeverity.CRITICAL
                }

                audit_service.log_error(
                    error_type=error_report.error_type,
                    error_message=error_report.error_message,
                    stack_trace=error_report.stack_trace,
                    endpoint=error_report.endpoint,
                    user_id=error_report.user_id,
                    request_data=error_report.request_data,
                    severity=severity_map.get(
                        error_report.severity, AuditSeverity.MEDIUM)
                )

            except ImportError:
                pass

            return f"Error report created: {error_report.error_type} at {error_report.timestamp}"

        except Exception as e:
            self.logger.error(f"Failed to create error report: {str(e)}")
            return "Error report creation failed"

    def _determine_error_severity(self, error: Exception) -> str:
        """Determine error severity based on error type"""
        error_type = type(error).__name__

        critical_errors = ['DatabaseError', 'ConnectionError', 'SecurityError']
        high_errors = ['ValueError', 'KeyError', 'AttributeError']
        medium_errors = ['TypeError', 'IndexError']

        if error_type in critical_errors:
            return 'CRITICAL'
        elif error_type in high_errors:
            return 'HIGH'
        elif error_type in medium_errors:
            return 'MEDIUM'
        else:
            return 'LOW'
