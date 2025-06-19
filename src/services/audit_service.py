#!/usr/bin/env python3
"""
Audit Trail & Logging Service
Comprehensive logging system for compliance, security, and operational monitoring
"""

import os
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

class AuditEventType(Enum):
    """Audit event types"""
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    DATA_ACCESS = "DATA_ACCESS"
    DATA_MODIFY = "DATA_MODIFY"
    DATA_DELETE = "DATA_DELETE"
    DATA_EXPORT = "DATA_EXPORT"
    SYSTEM_CONFIG = "SYSTEM_CONFIG"
    API_CALL = "API_CALL"
    SECURITY_EVENT = "SECURITY_EVENT"
    COMPLIANCE_EVENT = "COMPLIANCE_EVENT"
    ERROR_EVENT = "ERROR_EVENT"

class AuditSeverity(Enum):
    """Audit event severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

@dataclass
class AuditEvent:
    """Audit event structure"""
    event_type: AuditEventType
    severity: AuditSeverity
    user_id: str
    resource_type: str
    resource_id: str
    action: str
    details: Dict[str, Any]
    ip_address: str
    user_agent: str
    timestamp: datetime

class AuditService:
    """Service for audit trail and compliance logging"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_audit_tables()
    
    def _ensure_audit_tables(self):
        """Create audit-related tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Main audit log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    user_id VARCHAR(100),
                    resource_type VARCHAR(50),
                    resource_id VARCHAR(100),
                    action VARCHAR(100) NOT NULL,
                    details TEXT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    session_id VARCHAR(100),
                    request_id VARCHAR(100),
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Security events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    source_ip VARCHAR(45),
                    user_agent TEXT,
                    attempted_action VARCHAR(200),
                    failure_reason VARCHAR(200),
                    blocked BOOLEAN DEFAULT 0,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # System performance log
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint VARCHAR(200),
                    method VARCHAR(10),
                    response_time_ms INTEGER,
                    status_code INTEGER,
                    user_id VARCHAR(100),
                    ip_address VARCHAR(45),
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Error log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS error_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    error_type VARCHAR(50),
                    error_message TEXT,
                    stack_trace TEXT,
                    endpoint VARCHAR(200),
                    user_id VARCHAR(100),
                    ip_address VARCHAR(45),
                    request_data TEXT,
                    severity VARCHAR(20),
                    resolved BOOLEAN DEFAULT 0,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Compliance events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS compliance_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    compliance_type VARCHAR(50) NOT NULL,
                    event_description TEXT,
                    customer_id INTEGER,
                    data_subject VARCHAR(100),
                    legal_basis VARCHAR(50),
                    retention_period INTEGER,
                    action_required BOOLEAN DEFAULT 0,
                    due_date DATE,
                    completed_date DATE,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')
            
            # Create indexes for performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_security_timestamp ON security_events(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_log(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_error_timestamp ON error_log(timestamp)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error creating audit tables: {str(e)}")
    
    def log_event(self, event: AuditEvent) -> bool:
        """Log an audit event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO audit_log 
                (event_type, severity, user_id, resource_type, resource_id, action,
                 details, ip_address, user_agent, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                event.event_type.value,
                event.severity.value,
                event.user_id,
                event.resource_type,
                event.resource_id,
                event.action,
                json.dumps(event.details) if event.details else None,
                event.ip_address,
                event.user_agent,
                event.timestamp.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error logging audit event: {str(e)}")
            return False
    
    def log_data_access(self, user_id: str, resource_type: str, resource_id: str,
                       action: str, ip_address: str = None, user_agent: str = None,
                       details: Dict = None) -> bool:
        """Log data access event"""
        event = AuditEvent(
            event_type=AuditEventType.DATA_ACCESS,
            severity=AuditSeverity.LOW,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            details=details or {},
            ip_address=ip_address or '',
            user_agent=user_agent or '',
            timestamp=datetime.now()
        )
        return self.log_event(event)
    
    def log_data_modification(self, user_id: str, resource_type: str, resource_id: str,
                            action: str, old_values: Dict = None, new_values: Dict = None,
                            ip_address: str = None, user_agent: str = None) -> bool:
        """Log data modification event"""
        details = {
            'old_values': old_values or {},
            'new_values': new_values or {}
        }
        
        event = AuditEvent(
            event_type=AuditEventType.DATA_MODIFY,
            severity=AuditSeverity.MEDIUM,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            details=details,
            ip_address=ip_address or '',
            user_agent=user_agent or '',
            timestamp=datetime.now()
        )
        return self.log_event(event)
    
    def log_security_event(self, event_type: str, severity: AuditSeverity,
                          source_ip: str, attempted_action: str,
                          failure_reason: str = None, blocked: bool = False,
                          user_agent: str = None) -> bool:
        """Log security event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_events 
                (event_type, severity, source_ip, user_agent, attempted_action,
                 failure_reason, blocked)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                event_type,
                severity.value,
                source_ip,
                user_agent,
                attempted_action,
                failure_reason,
                blocked
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error logging security event: {str(e)}")
            return False
    
    def log_performance(self, endpoint: str, method: str, response_time_ms: int,
                       status_code: int, user_id: str = None, ip_address: str = None) -> bool:
        """Log performance metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO performance_log 
                (endpoint, method, response_time_ms, status_code, user_id, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (endpoint, method, response_time_ms, status_code, user_id, ip_address))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error logging performance: {str(e)}")
            return False
    
    def log_error(self, error_type: str, error_message: str, stack_trace: str = None,
                 endpoint: str = None, user_id: str = None, ip_address: str = None,
                 request_data: Dict = None, severity: AuditSeverity = AuditSeverity.MEDIUM) -> bool:
        """Log error event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO error_log 
                (error_type, error_message, stack_trace, endpoint, user_id,
                 ip_address, request_data, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                error_type,
                error_message,
                stack_trace,
                endpoint,
                user_id,
                ip_address,
                json.dumps(request_data) if request_data else None,
                severity.value
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error logging error event: {str(e)}")
            return False
    
    def log_compliance_event(self, compliance_type: str, event_description: str,
                           customer_id: int = None, data_subject: str = None,
                           legal_basis: str = None, retention_period: int = None,
                           action_required: bool = False, due_date: str = None) -> bool:
        """Log compliance event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO compliance_events 
                (compliance_type, event_description, customer_id, data_subject,
                 legal_basis, retention_period, action_required, due_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                compliance_type,
                event_description,
                customer_id,
                data_subject,
                legal_basis,
                retention_period,
                action_required,
                due_date
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error logging compliance event: {str(e)}")
            return False

    def get_audit_trail(self, resource_type: str = None, resource_id: str = None,
                       user_id: str = None, start_date: str = None, end_date: str = None,
                       limit: int = 100) -> List[Dict]:
        """Get audit trail with optional filtering"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT id, event_type, severity, user_id, resource_type, resource_id,
                       action, details, ip_address, user_agent, timestamp
                FROM audit_log
                WHERE 1=1
            '''
            params = []

            if resource_type:
                query += ' AND resource_type = ?'
                params.append(resource_type)

            if resource_id:
                query += ' AND resource_id = ?'
                params.append(resource_id)

            if user_id:
                query += ' AND user_id = ?'
                params.append(user_id)

            if start_date:
                query += ' AND timestamp >= ?'
                params.append(start_date)

            if end_date:
                query += ' AND timestamp <= ?'
                params.append(end_date)

            query += ' ORDER BY timestamp DESC LIMIT ?'
            params.append(limit)

            cursor.execute(query, params)

            audit_trail = []
            for row in cursor.fetchall():
                audit_trail.append({
                    'id': row[0],
                    'event_type': row[1],
                    'severity': row[2],
                    'user_id': row[3],
                    'resource_type': row[4],
                    'resource_id': row[5],
                    'action': row[6],
                    'details': json.loads(row[7]) if row[7] else {},
                    'ip_address': row[8],
                    'user_agent': row[9],
                    'timestamp': row[10]
                })

            conn.close()
            return audit_trail

        except Exception as e:
            print(f"Error getting audit trail: {str(e)}")
            return []

    def get_security_events(self, severity: str = None, start_date: str = None,
                           end_date: str = None, limit: int = 100) -> List[Dict]:
        """Get security events with optional filtering"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT id, event_type, severity, source_ip, user_agent,
                       attempted_action, failure_reason, blocked, timestamp
                FROM security_events
                WHERE 1=1
            '''
            params = []

            if severity:
                query += ' AND severity = ?'
                params.append(severity)

            if start_date:
                query += ' AND timestamp >= ?'
                params.append(start_date)

            if end_date:
                query += ' AND timestamp <= ?'
                params.append(end_date)

            query += ' ORDER BY timestamp DESC LIMIT ?'
            params.append(limit)

            cursor.execute(query, params)

            events = []
            for row in cursor.fetchall():
                events.append({
                    'id': row[0],
                    'event_type': row[1],
                    'severity': row[2],
                    'source_ip': row[3],
                    'user_agent': row[4],
                    'attempted_action': row[5],
                    'failure_reason': row[6],
                    'blocked': bool(row[7]),
                    'timestamp': row[8]
                })

            conn.close()
            return events

        except Exception as e:
            print(f"Error getting security events: {str(e)}")
            return []

    def get_performance_metrics(self, endpoint: str = None, start_date: str = None,
                               end_date: str = None) -> Dict:
        """Get performance metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT AVG(response_time_ms), MIN(response_time_ms), MAX(response_time_ms),
                       COUNT(*), endpoint
                FROM performance_log
                WHERE 1=1
            '''
            params = []

            if endpoint:
                query += ' AND endpoint = ?'
                params.append(endpoint)

            if start_date:
                query += ' AND timestamp >= ?'
                params.append(start_date)

            if end_date:
                query += ' AND timestamp <= ?'
                params.append(end_date)

            if endpoint:
                query += ' GROUP BY endpoint'

            cursor.execute(query, params)

            if endpoint:
                metrics = []
                for row in cursor.fetchall():
                    metrics.append({
                        'endpoint': row[4],
                        'avg_response_time': round(row[0], 2) if row[0] else 0,
                        'min_response_time': row[1] or 0,
                        'max_response_time': row[2] or 0,
                        'request_count': row[3]
                    })
                return {'metrics': metrics}
            else:
                row = cursor.fetchone()
                return {
                    'avg_response_time': round(row[0], 2) if row[0] else 0,
                    'min_response_time': row[1] or 0,
                    'max_response_time': row[2] or 0,
                    'total_requests': row[3]
                }

        except Exception as e:
            print(f"Error getting performance metrics: {str(e)}")
            return {}

    def get_error_summary(self, start_date: str = None, end_date: str = None) -> Dict:
        """Get error summary statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT error_type, severity, COUNT(*) as count
                FROM error_log
                WHERE 1=1
            '''
            params = []

            if start_date:
                query += ' AND timestamp >= ?'
                params.append(start_date)

            if end_date:
                query += ' AND timestamp <= ?'
                params.append(end_date)

            query += ' GROUP BY error_type, severity ORDER BY count DESC'

            cursor.execute(query, params)

            error_summary = []
            for row in cursor.fetchall():
                error_summary.append({
                    'error_type': row[0],
                    'severity': row[1],
                    'count': row[2]
                })

            # Get total error count
            cursor.execute('''
                SELECT COUNT(*) FROM error_log
                WHERE timestamp >= ? AND timestamp <= ?
            ''', (start_date or '1900-01-01', end_date or '2100-01-01'))

            total_errors = cursor.fetchone()[0]

            conn.close()

            return {
                'total_errors': total_errors,
                'error_breakdown': error_summary
            }

        except Exception as e:
            print(f"Error getting error summary: {str(e)}")
            return {}

    def cleanup_old_logs(self, retention_days: int = 365) -> Dict:
        """Clean up old log entries based on retention policy"""
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Count records to be deleted
            tables = ['audit_log', 'security_events', 'performance_log', 'error_log']
            deleted_counts = {}

            for table in tables:
                cursor.execute(f'SELECT COUNT(*) FROM {table} WHERE timestamp < ?', (cutoff_date,))
                count = cursor.fetchone()[0]

                if count > 0:
                    cursor.execute(f'DELETE FROM {table} WHERE timestamp < ?', (cutoff_date,))
                    deleted_counts[table] = count

            conn.commit()
            conn.close()

            return {
                'success': True,
                'retention_days': retention_days,
                'cutoff_date': cutoff_date.isoformat(),
                'deleted_records': deleted_counts
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
