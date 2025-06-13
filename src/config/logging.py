"""
Logging configuration for the Garage Management System.
"""
import os
import logging
import logging.handlers
from pathlib import Path
from typing import Optional
from config.settings import get_config_manager


class LoggingManager:
    """Manages application logging configuration."""
    
    def __init__(self):
        self.config = get_config_manager().logging
        self.loggers = {}
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging configuration."""
        # Create logs directory if it doesn't exist
        log_file_path = Path(self.config.file_path)
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, self.config.level.upper()))
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # Create formatters
        detailed_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
        )
        simple_formatter = logging.Formatter(self.config.format)
        
        # File handler with rotation
        if self.config.file_path:
            file_handler = logging.handlers.RotatingFileHandler(
                self.config.file_path,
                maxBytes=self.config.max_file_size,
                backupCount=self.config.backup_count
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(detailed_formatter)
            root_logger.addHandler(file_handler)
        
        # Console handler
        if self.config.console_output:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(getattr(logging, self.config.level.upper()))
            console_handler.setFormatter(simple_formatter)
            root_logger.addHandler(console_handler)
        
        # Error file handler
        error_log_path = log_file_path.parent / 'errors.log'
        error_handler = logging.handlers.RotatingFileHandler(
            error_log_path,
            maxBytes=self.config.max_file_size,
            backupCount=self.config.backup_count
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(detailed_formatter)
        root_logger.addHandler(error_handler)
        
        # Setup specific loggers
        self.setup_specific_loggers()
    
    def setup_specific_loggers(self):
        """Setup specific loggers for different components."""
        # Database logger
        db_logger = logging.getLogger('database')
        db_logger.setLevel(logging.INFO)
        
        # API logger
        api_logger = logging.getLogger('api')
        api_logger.setLevel(logging.INFO)
        
        # DVLA logger
        dvla_logger = logging.getLogger('dvla')
        dvla_logger.setLevel(logging.INFO)
        
        # SMS logger
        sms_logger = logging.getLogger('sms')
        sms_logger.setLevel(logging.INFO)
        
        # Security logger
        security_logger = logging.getLogger('security')
        security_logger.setLevel(logging.WARNING)
        
        # Store loggers
        self.loggers.update({
            'database': db_logger,
            'api': api_logger,
            'dvla': dvla_logger,
            'sms': sms_logger,
            'security': security_logger
        })
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get a logger by name."""
        if name in self.loggers:
            return self.loggers[name]
        
        logger = logging.getLogger(name)
        self.loggers[name] = logger
        return logger
    
    def set_level(self, level: str):
        """Set logging level for all loggers."""
        log_level = getattr(logging, level.upper())
        
        # Update root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)
        
        # Update console handler
        for handler in root_logger.handlers:
            if isinstance(handler, logging.StreamHandler) and not isinstance(handler, logging.FileHandler):
                handler.setLevel(log_level)
        
        # Update config
        self.config.level = level.upper()
    
    def add_file_handler(self, logger_name: str, file_path: str, level: str = 'INFO'):
        """Add a file handler to a specific logger."""
        logger = self.get_logger(logger_name)
        
        # Create directory if it doesn't exist
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Create file handler
        file_handler = logging.handlers.RotatingFileHandler(
            file_path,
            maxBytes=self.config.max_file_size,
            backupCount=self.config.backup_count
        )
        file_handler.setLevel(getattr(logging, level.upper()))
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(file_handler)
    
    def log_request(self, request, response_status: int, response_time: float):
        """Log HTTP request details."""
        api_logger = self.get_logger('api')
        
        log_data = {
            'method': request.method,
            'url': request.url,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'status': response_status,
            'response_time': f"{response_time:.3f}s"
        }
        
        if response_status >= 400:
            api_logger.warning(f"HTTP {response_status} - {log_data}")
        else:
            api_logger.info(f"HTTP {response_status} - {log_data}")
    
    def log_database_operation(self, operation: str, table: str, duration: float, success: bool = True):
        """Log database operation details."""
        db_logger = self.get_logger('database')
        
        log_data = {
            'operation': operation,
            'table': table,
            'duration': f"{duration:.3f}s",
            'success': success
        }
        
        if success:
            db_logger.info(f"DB Operation - {log_data}")
        else:
            db_logger.error(f"DB Operation Failed - {log_data}")
    
    def log_dvla_request(self, registration: str, success: bool, response_time: float, error: Optional[str] = None):
        """Log DVLA API request details."""
        dvla_logger = self.get_logger('dvla')
        
        log_data = {
            'registration': registration,
            'success': success,
            'response_time': f"{response_time:.3f}s"
        }
        
        if error:
            log_data['error'] = error
        
        if success:
            dvla_logger.info(f"DVLA Request - {log_data}")
        else:
            dvla_logger.error(f"DVLA Request Failed - {log_data}")
    
    def log_sms_sent(self, to_number: str, success: bool, message_id: Optional[str] = None, error: Optional[str] = None):
        """Log SMS sending details."""
        sms_logger = self.get_logger('sms')
        
        log_data = {
            'to_number': to_number[-4:],  # Only log last 4 digits for privacy
            'success': success
        }
        
        if message_id:
            log_data['message_id'] = message_id
        
        if error:
            log_data['error'] = error
        
        if success:
            sms_logger.info(f"SMS Sent - {log_data}")
        else:
            sms_logger.error(f"SMS Failed - {log_data}")
    
    def log_security_event(self, event_type: str, user_id: Optional[str] = None, ip_address: Optional[str] = None, details: Optional[dict] = None):
        """Log security-related events."""
        security_logger = self.get_logger('security')
        
        log_data = {
            'event_type': event_type,
            'timestamp': logging.Formatter().formatTime(logging.LogRecord('', 0, '', 0, '', (), None))
        }
        
        if user_id:
            log_data['user_id'] = user_id
        
        if ip_address:
            log_data['ip_address'] = ip_address
        
        if details:
            log_data.update(details)
        
        if event_type in ['login_failed', 'unauthorized_access', 'data_breach']:
            security_logger.error(f"Security Event - {log_data}")
        else:
            security_logger.warning(f"Security Event - {log_data}")
    
    def log_performance_metric(self, metric_name: str, value: float, unit: str = 'ms'):
        """Log performance metrics."""
        perf_logger = self.get_logger('performance')
        
        log_data = {
            'metric': metric_name,
            'value': value,
            'unit': unit
        }
        
        perf_logger.info(f"Performance Metric - {log_data}")
    
    def log_business_event(self, event_type: str, entity_type: str, entity_id: str, details: Optional[dict] = None):
        """Log business-related events."""
        business_logger = self.get_logger('business')
        
        log_data = {
            'event_type': event_type,
            'entity_type': entity_type,
            'entity_id': entity_id
        }
        
        if details:
            log_data.update(details)
        
        business_logger.info(f"Business Event - {log_data}")
    
    def get_log_stats(self) -> dict:
        """Get logging statistics."""
        log_file_path = Path(self.config.file_path)
        
        stats = {
            'log_file_exists': log_file_path.exists(),
            'log_file_size': 0,
            'error_count': 0,
            'warning_count': 0,
            'info_count': 0
        }
        
        if log_file_path.exists():
            stats['log_file_size'] = log_file_path.stat().st_size
            
            # Count log levels (simplified - would need more sophisticated parsing for accuracy)
            try:
                with open(log_file_path, 'r') as f:
                    content = f.read()
                    stats['error_count'] = content.count(' - ERROR - ')
                    stats['warning_count'] = content.count(' - WARNING - ')
                    stats['info_count'] = content.count(' - INFO - ')
            except Exception:
                pass
        
        return stats


# Global logging manager instance
logging_manager = LoggingManager()


def get_logger(name: str = None) -> logging.Logger:
    """Get a logger instance."""
    if name:
        return logging_manager.get_logger(name)
    return logging.getLogger()


def setup_flask_logging(app):
    """Setup Flask-specific logging."""
    # Disable Flask's default logging
    app.logger.handlers.clear()
    
    # Use our logging configuration
    app.logger.setLevel(logging.INFO)
    
    # Add request logging middleware
    @app.before_request
    def log_request_info():
        app.logger.info(f"Request: {request.method} {request.url}")
    
    @app.after_request
    def log_response_info(response):
        app.logger.info(f"Response: {response.status_code}")
        return response


# Convenience functions
def log_api_request(request, response_status: int, response_time: float):
    """Log API request."""
    logging_manager.log_request(request, response_status, response_time)


def log_db_operation(operation: str, table: str, duration: float, success: bool = True):
    """Log database operation."""
    logging_manager.log_database_operation(operation, table, duration, success)


def log_dvla_request(registration: str, success: bool, response_time: float, error: str = None):
    """Log DVLA request."""
    logging_manager.log_dvla_request(registration, success, response_time, error)


def log_sms_sent(to_number: str, success: bool, message_id: str = None, error: str = None):
    """Log SMS sending."""
    logging_manager.log_sms_sent(to_number, success, message_id, error)


def log_security_event(event_type: str, user_id: str = None, ip_address: str = None, details: dict = None):
    """Log security event."""
    logging_manager.log_security_event(event_type, user_id, ip_address, details)


def log_business_event(event_type: str, entity_type: str, entity_id: str, details: dict = None):
    """Log business event."""
    logging_manager.log_business_event(event_type, entity_type, entity_id, details)
