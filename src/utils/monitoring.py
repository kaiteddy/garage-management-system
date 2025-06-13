"""
Monitoring and health check utilities for the Garage Management System.
"""
import time
import psutil
import threading
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any

from config.logging import get_logger
from utils.database_utils import DatabaseUtils

logger = get_logger('monitoring')


@dataclass
class HealthMetric:
    """Health metric data structure."""
    name: str
    value: float
    unit: str
    status: str  # 'healthy', 'warning', 'critical'
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Optional[Dict[str, str]] = None


class SystemMonitor:
    """System monitoring and health checks."""
    
    def __init__(self):
        self.metrics_history = defaultdict(lambda: deque(maxlen=1000))
        self.health_checks = {}
        self.performance_metrics = defaultdict(lambda: deque(maxlen=100))
        self.is_monitoring = False
        self.monitor_thread = None
        self.check_interval = 60  # seconds
        
        # Thresholds
        self.thresholds = {
            'cpu_usage': {'warning': 70, 'critical': 90},
            'memory_usage': {'warning': 80, 'critical': 95},
            'disk_usage': {'warning': 85, 'critical': 95},
            'response_time': {'warning': 2000, 'critical': 5000},  # milliseconds
            'error_rate': {'warning': 5, 'critical': 10},  # percentage
        }
    
    def start_monitoring(self):
        """Start continuous monitoring."""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("System monitoring started")
    
    def stop_monitoring(self):
        """Stop continuous monitoring."""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("System monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.is_monitoring:
            try:
                self.collect_system_metrics()
                self.run_health_checks()
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(self.check_interval)
    
    def collect_system_metrics(self):
        """Collect system performance metrics."""
        timestamp = datetime.now()
        
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self.record_metric('cpu_usage', cpu_percent, 'percent', timestamp)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self.record_metric('memory_usage', memory.percent, 'percent', timestamp)
            self.record_metric('memory_available', memory.available / (1024**3), 'GB', timestamp)
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self.record_metric('disk_usage', disk_percent, 'percent', timestamp)
            self.record_metric('disk_free', disk.free / (1024**3), 'GB', timestamp)
            
            # Network metrics
            network = psutil.net_io_counters()
            self.record_metric('network_bytes_sent', network.bytes_sent, 'bytes', timestamp)
            self.record_metric('network_bytes_recv', network.bytes_recv, 'bytes', timestamp)
            
            # Process metrics
            process = psutil.Process()
            self.record_metric('process_memory', process.memory_info().rss / (1024**2), 'MB', timestamp)
            self.record_metric('process_cpu', process.cpu_percent(), 'percent', timestamp)
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
    
    def record_metric(self, name: str, value: float, unit: str, timestamp: datetime, tags: Dict[str, str] = None):
        """Record a performance metric."""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=timestamp,
            tags=tags
        )
        
        self.performance_metrics[name].append(metric)
        
        # Log critical metrics
        if name in self.thresholds:
            threshold = self.thresholds[name]
            if value >= threshold['critical']:
                logger.error(f"CRITICAL: {name} is {value}{unit} (threshold: {threshold['critical']}{unit})")
            elif value >= threshold['warning']:
                logger.warning(f"WARNING: {name} is {value}{unit} (threshold: {threshold['warning']}{unit})")
    
    def run_health_checks(self):
        """Run all health checks."""
        timestamp = datetime.now()
        
        # Database health
        db_health = self.check_database_health()
        self.health_checks['database'] = HealthMetric(
            name='database',
            value=1 if db_health['status'] == 'healthy' else 0,
            unit='boolean',
            status=db_health['status'],
            timestamp=timestamp,
            details=db_health
        )
        
        # Application health
        app_health = self.check_application_health()
        self.health_checks['application'] = HealthMetric(
            name='application',
            value=1 if app_health['status'] == 'healthy' else 0,
            unit='boolean',
            status=app_health['status'],
            timestamp=timestamp,
            details=app_health
        )
        
        # System health
        system_health = self.check_system_health()
        self.health_checks['system'] = HealthMetric(
            name='system',
            value=1 if system_health['status'] == 'healthy' else 0,
            unit='boolean',
            status=system_health['status'],
            timestamp=timestamp,
            details=system_health
        )
    
    def check_database_health(self) -> Dict[str, Any]:
        """Check database health."""
        try:
            start_time = time.time()
            
            # Test database connection
            stats = DatabaseUtils.get_database_stats()
            
            if 'error' in stats:
                return {
                    'status': 'critical',
                    'message': f"Database error: {stats['error']}",
                    'response_time': None
                }
            
            response_time = (time.time() - start_time) * 1000  # milliseconds
            
            # Check response time
            if response_time > 5000:
                status = 'critical'
            elif response_time > 2000:
                status = 'warning'
            else:
                status = 'healthy'
            
            return {
                'status': status,
                'response_time': response_time,
                'total_tables': stats.get('total_tables', 0),
                'message': f"Database responding in {response_time:.2f}ms"
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'critical',
                'message': f"Database health check failed: {e}",
                'response_time': None
            }
    
    def check_application_health(self) -> Dict[str, Any]:
        """Check application health."""
        try:
            # Check if all required services are available
            issues = []
            
            # Check error rate
            error_rate = self.calculate_error_rate()
            if error_rate > 10:
                issues.append(f"High error rate: {error_rate:.1f}%")
            
            # Check response times
            avg_response_time = self.get_average_response_time()
            if avg_response_time and avg_response_time > 5000:
                issues.append(f"Slow response time: {avg_response_time:.0f}ms")
            
            status = 'critical' if issues else 'healthy'
            
            return {
                'status': status,
                'error_rate': error_rate,
                'avg_response_time': avg_response_time,
                'issues': issues,
                'message': 'Application healthy' if not issues else f"{len(issues)} issues detected"
            }
            
        except Exception as e:
            logger.error(f"Application health check failed: {e}")
            return {
                'status': 'critical',
                'message': f"Application health check failed: {e}"
            }
    
    def check_system_health(self) -> Dict[str, Any]:
        """Check system health."""
        try:
            issues = []
            
            # Get latest metrics
            cpu_usage = self.get_latest_metric('cpu_usage')
            memory_usage = self.get_latest_metric('memory_usage')
            disk_usage = self.get_latest_metric('disk_usage')
            
            # Check thresholds
            if cpu_usage and cpu_usage > self.thresholds['cpu_usage']['warning']:
                issues.append(f"High CPU usage: {cpu_usage:.1f}%")
            
            if memory_usage and memory_usage > self.thresholds['memory_usage']['warning']:
                issues.append(f"High memory usage: {memory_usage:.1f}%")
            
            if disk_usage and disk_usage > self.thresholds['disk_usage']['warning']:
                issues.append(f"High disk usage: {disk_usage:.1f}%")
            
            # Determine status
            critical_issues = [issue for issue in issues if 'High' in issue and 
                             any(str(self.thresholds[key]['critical']) in issue 
                                 for key in self.thresholds)]
            
            if critical_issues:
                status = 'critical'
            elif issues:
                status = 'warning'
            else:
                status = 'healthy'
            
            return {
                'status': status,
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'disk_usage': disk_usage,
                'issues': issues,
                'message': 'System healthy' if not issues else f"{len(issues)} issues detected"
            }
            
        except Exception as e:
            logger.error(f"System health check failed: {e}")
            return {
                'status': 'critical',
                'message': f"System health check failed: {e}"
            }
    
    def get_latest_metric(self, name: str) -> Optional[float]:
        """Get the latest value for a metric."""
        if name in self.performance_metrics and self.performance_metrics[name]:
            return self.performance_metrics[name][-1].value
        return None
    
    def calculate_error_rate(self) -> float:
        """Calculate error rate from recent metrics."""
        # This would be implemented based on actual error tracking
        # For now, return a placeholder
        return 0.0
    
    def get_average_response_time(self) -> Optional[float]:
        """Get average response time from recent metrics."""
        if 'response_time' in self.performance_metrics:
            recent_metrics = list(self.performance_metrics['response_time'])[-10:]
            if recent_metrics:
                return sum(m.value for m in recent_metrics) / len(recent_metrics)
        return None
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get overall health summary."""
        if not self.health_checks:
            return {'status': 'unknown', 'message': 'No health data available'}
        
        statuses = [check.status for check in self.health_checks.values()]
        
        if 'critical' in statuses:
            overall_status = 'critical'
        elif 'warning' in statuses:
            overall_status = 'warning'
        else:
            overall_status = 'healthy'
        
        return {
            'status': overall_status,
            'timestamp': datetime.now().isoformat(),
            'checks': {name: asdict(check) for name, check in self.health_checks.items()},
            'message': f"System status: {overall_status}"
        }
    
    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get metrics summary for the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        summary = {}
        
        for metric_name, metrics in self.performance_metrics.items():
            recent_metrics = [m for m in metrics if m.timestamp >= cutoff_time]
            
            if recent_metrics:
                values = [m.value for m in recent_metrics]
                summary[metric_name] = {
                    'count': len(values),
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                    'latest': values[-1],
                    'unit': recent_metrics[-1].unit
                }
        
        return summary


# Global monitor instance
system_monitor = SystemMonitor()


def get_system_monitor() -> SystemMonitor:
    """Get the global system monitor instance."""
    return system_monitor


def start_monitoring():
    """Start system monitoring."""
    system_monitor.start_monitoring()


def stop_monitoring():
    """Stop system monitoring."""
    system_monitor.stop_monitoring()


def get_health_status() -> Dict[str, Any]:
    """Get current health status."""
    return system_monitor.get_health_summary()


def get_performance_metrics(hours: int = 1) -> Dict[str, Any]:
    """Get performance metrics summary."""
    return system_monitor.get_metrics_summary(hours)
