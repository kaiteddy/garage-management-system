"""
Unit tests for monitoring utilities.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from utils.monitoring import SystemMonitor, HealthMetric, PerformanceMetric


class TestSystemMonitor:
    """Test cases for SystemMonitor."""
    
    def setup_method(self):
        """Setup test environment."""
        self.monitor = SystemMonitor()
    
    def test_init(self):
        """Test monitor initialization."""
        assert self.monitor.is_monitoring is False
        assert self.monitor.monitor_thread is None
        assert self.monitor.check_interval == 60
        assert 'cpu_usage' in self.monitor.thresholds
    
    def test_record_metric(self):
        """Test metric recording."""
        timestamp = datetime.now()
        
        self.monitor.record_metric('test_metric', 50.0, 'percent', timestamp)
        
        assert 'test_metric' in self.monitor.performance_metrics
        assert len(self.monitor.performance_metrics['test_metric']) == 1
        
        metric = self.monitor.performance_metrics['test_metric'][0]
        assert metric.name == 'test_metric'
        assert metric.value == 50.0
        assert metric.unit == 'percent'
        assert metric.timestamp == timestamp
    
    def test_record_metric_with_threshold_warning(self):
        """Test metric recording with warning threshold."""
        with patch('utils.monitoring.logger') as mock_logger:
            self.monitor.record_metric('cpu_usage', 75.0, 'percent', datetime.now())
            
            mock_logger.warning.assert_called_once()
            assert 'WARNING' in mock_logger.warning.call_args[0][0]
    
    def test_record_metric_with_threshold_critical(self):
        """Test metric recording with critical threshold."""
        with patch('utils.monitoring.logger') as mock_logger:
            self.monitor.record_metric('cpu_usage', 95.0, 'percent', datetime.now())
            
            mock_logger.error.assert_called_once()
            assert 'CRITICAL' in mock_logger.error.call_args[0][0]
    
    @patch('utils.monitoring.psutil')
    def test_collect_system_metrics(self, mock_psutil):
        """Test system metrics collection."""
        # Mock psutil responses
        mock_psutil.cpu_percent.return_value = 45.0
        mock_psutil.virtual_memory.return_value = Mock(percent=60.0, available=4*1024**3)
        mock_psutil.disk_usage.return_value = Mock(used=50*1024**3, total=100*1024**3, free=50*1024**3)
        mock_psutil.net_io_counters.return_value = Mock(bytes_sent=1000, bytes_recv=2000)
        mock_psutil.Process.return_value = Mock(
            memory_info=Mock(return_value=Mock(rss=100*1024**2)),
            cpu_percent=Mock(return_value=5.0)
        )
        
        self.monitor.collect_system_metrics()
        
        # Verify metrics were recorded
        assert 'cpu_usage' in self.monitor.performance_metrics
        assert 'memory_usage' in self.monitor.performance_metrics
        assert 'disk_usage' in self.monitor.performance_metrics
        assert 'process_memory' in self.monitor.performance_metrics
    
    def test_check_database_health_success(self):
        """Test successful database health check."""
        with patch('utils.monitoring.DatabaseUtils') as mock_db_utils:
            mock_db_utils.get_database_stats.return_value = {
                'total_tables': 5,
                'tables': {}
            }
            
            result = self.monitor.check_database_health()
            
            assert result['status'] == 'healthy'
            assert 'response_time' in result
            assert result['total_tables'] == 5
    
    def test_check_database_health_error(self):
        """Test database health check with error."""
        with patch('utils.monitoring.DatabaseUtils') as mock_db_utils:
            mock_db_utils.get_database_stats.return_value = {
                'error': 'Connection failed'
            }
            
            result = self.monitor.check_database_health()
            
            assert result['status'] == 'critical'
            assert 'Connection failed' in result['message']
    
    def test_check_database_health_slow_response(self):
        """Test database health check with slow response."""
        with patch('utils.monitoring.DatabaseUtils') as mock_db_utils, \
             patch('utils.monitoring.time') as mock_time:
            
            # Mock slow response (3 seconds)
            mock_time.time.side_effect = [0, 3]
            mock_db_utils.get_database_stats.return_value = {'total_tables': 5}
            
            result = self.monitor.check_database_health()
            
            assert result['status'] == 'warning'
            assert result['response_time'] == 3000  # milliseconds
    
    def test_check_application_health(self):
        """Test application health check."""
        with patch.object(self.monitor, 'calculate_error_rate', return_value=2.0), \
             patch.object(self.monitor, 'get_average_response_time', return_value=1500.0):
            
            result = self.monitor.check_application_health()
            
            assert result['status'] == 'healthy'
            assert result['error_rate'] == 2.0
            assert result['avg_response_time'] == 1500.0
            assert len(result['issues']) == 0
    
    def test_check_application_health_with_issues(self):
        """Test application health check with issues."""
        with patch.object(self.monitor, 'calculate_error_rate', return_value=15.0), \
             patch.object(self.monitor, 'get_average_response_time', return_value=6000.0):
            
            result = self.monitor.check_application_health()
            
            assert result['status'] == 'critical'
            assert len(result['issues']) == 2
            assert any('error rate' in issue.lower() for issue in result['issues'])
            assert any('response time' in issue.lower() for issue in result['issues'])
    
    def test_check_system_health_healthy(self):
        """Test system health check - healthy state."""
        # Add some healthy metrics
        timestamp = datetime.now()
        self.monitor.record_metric('cpu_usage', 30.0, 'percent', timestamp)
        self.monitor.record_metric('memory_usage', 50.0, 'percent', timestamp)
        self.monitor.record_metric('disk_usage', 40.0, 'percent', timestamp)
        
        result = self.monitor.check_system_health()
        
        assert result['status'] == 'healthy'
        assert len(result['issues']) == 0
        assert result['cpu_usage'] == 30.0
        assert result['memory_usage'] == 50.0
        assert result['disk_usage'] == 40.0
    
    def test_check_system_health_warning(self):
        """Test system health check - warning state."""
        # Add metrics that trigger warnings
        timestamp = datetime.now()
        self.monitor.record_metric('cpu_usage', 75.0, 'percent', timestamp)  # Warning threshold
        self.monitor.record_metric('memory_usage', 50.0, 'percent', timestamp)
        self.monitor.record_metric('disk_usage', 40.0, 'percent', timestamp)
        
        result = self.monitor.check_system_health()
        
        assert result['status'] == 'warning'
        assert len(result['issues']) == 1
        assert 'High CPU usage' in result['issues'][0]
    
    def test_check_system_health_critical(self):
        """Test system health check - critical state."""
        # Add metrics that trigger critical alerts
        timestamp = datetime.now()
        self.monitor.record_metric('cpu_usage', 95.0, 'percent', timestamp)  # Critical threshold
        self.monitor.record_metric('memory_usage', 98.0, 'percent', timestamp)  # Critical threshold
        
        result = self.monitor.check_system_health()
        
        assert result['status'] == 'critical'
        assert len(result['issues']) >= 2
    
    def test_get_latest_metric(self):
        """Test getting latest metric value."""
        timestamp = datetime.now()
        self.monitor.record_metric('test_metric', 100.0, 'units', timestamp)
        self.monitor.record_metric('test_metric', 200.0, 'units', timestamp)
        
        latest = self.monitor.get_latest_metric('test_metric')
        
        assert latest == 200.0
    
    def test_get_latest_metric_not_found(self):
        """Test getting latest metric for non-existent metric."""
        latest = self.monitor.get_latest_metric('nonexistent_metric')
        
        assert latest is None
    
    def test_get_health_summary_healthy(self):
        """Test health summary - healthy state."""
        # Mock health checks
        timestamp = datetime.now()
        self.monitor.health_checks = {
            'database': HealthMetric('database', 1, 'boolean', 'healthy', timestamp),
            'application': HealthMetric('application', 1, 'boolean', 'healthy', timestamp),
            'system': HealthMetric('system', 1, 'boolean', 'healthy', timestamp)
        }
        
        summary = self.monitor.get_health_summary()
        
        assert summary['status'] == 'healthy'
        assert len(summary['checks']) == 3
    
    def test_get_health_summary_critical(self):
        """Test health summary - critical state."""
        timestamp = datetime.now()
        self.monitor.health_checks = {
            'database': HealthMetric('database', 0, 'boolean', 'critical', timestamp),
            'application': HealthMetric('application', 1, 'boolean', 'healthy', timestamp)
        }
        
        summary = self.monitor.get_health_summary()
        
        assert summary['status'] == 'critical'
    
    def test_get_health_summary_warning(self):
        """Test health summary - warning state."""
        timestamp = datetime.now()
        self.monitor.health_checks = {
            'database': HealthMetric('database', 1, 'boolean', 'healthy', timestamp),
            'application': HealthMetric('application', 1, 'boolean', 'warning', timestamp)
        }
        
        summary = self.monitor.get_health_summary()
        
        assert summary['status'] == 'warning'
    
    def test_get_metrics_summary(self):
        """Test metrics summary calculation."""
        # Add some test metrics
        base_time = datetime.now()
        for i in range(5):
            timestamp = base_time - timedelta(minutes=i*10)
            self.monitor.record_metric('test_metric', float(i*10), 'units', timestamp)
        
        summary = self.monitor.get_metrics_summary(hours=1)
        
        assert 'test_metric' in summary
        metric_summary = summary['test_metric']
        assert metric_summary['count'] == 5
        assert metric_summary['min'] == 0.0
        assert metric_summary['max'] == 40.0
        assert metric_summary['unit'] == 'units'
    
    def test_get_metrics_summary_time_filter(self):
        """Test metrics summary with time filtering."""
        # Add metrics outside time range
        old_time = datetime.now() - timedelta(hours=2)
        recent_time = datetime.now() - timedelta(minutes=30)
        
        self.monitor.record_metric('test_metric', 100.0, 'units', old_time)
        self.monitor.record_metric('test_metric', 200.0, 'units', recent_time)
        
        summary = self.monitor.get_metrics_summary(hours=1)
        
        # Should only include recent metric
        assert summary['test_metric']['count'] == 1
        assert summary['test_metric']['latest'] == 200.0


class TestHealthMetric:
    """Test cases for HealthMetric dataclass."""
    
    def test_health_metric_creation(self):
        """Test HealthMetric creation."""
        timestamp = datetime.now()
        metric = HealthMetric(
            name='test_check',
            value=1.0,
            unit='boolean',
            status='healthy',
            timestamp=timestamp,
            details={'response_time': 100}
        )
        
        assert metric.name == 'test_check'
        assert metric.value == 1.0
        assert metric.unit == 'boolean'
        assert metric.status == 'healthy'
        assert metric.timestamp == timestamp
        assert metric.details['response_time'] == 100


class TestPerformanceMetric:
    """Test cases for PerformanceMetric dataclass."""
    
    def test_performance_metric_creation(self):
        """Test PerformanceMetric creation."""
        timestamp = datetime.now()
        metric = PerformanceMetric(
            name='cpu_usage',
            value=45.5,
            unit='percent',
            timestamp=timestamp,
            tags={'host': 'server1'}
        )
        
        assert metric.name == 'cpu_usage'
        assert metric.value == 45.5
        assert metric.unit == 'percent'
        assert metric.timestamp == timestamp
        assert metric.tags['host'] == 'server1'
