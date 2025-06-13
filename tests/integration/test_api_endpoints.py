"""
Integration tests for API endpoints.
"""
import pytest
import json
from unittest.mock import patch, Mock


class TestCustomersAPI:
    """Integration tests for customers API."""
    
    def test_get_customers_success(self, client):
        """Test successful customers retrieval."""
        with patch('routes.api.customers.CustomerService') as mock_service:
            mock_service.get_all_customers.return_value = {
                'customers': [
                    {'id': 1, 'name': 'John Doe', 'email': 'john@example.com'}
                ],
                'total': 1,
                'current_page': 1,
                'pages': 1,
                'has_next': False,
                'has_prev': False
            }
            
            response = client.get('/api/customers')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert len(data['data']['customers']) == 1
    
    def test_get_customers_with_search(self, client):
        """Test customers retrieval with search parameter."""
        with patch('routes.api.customers.CustomerService') as mock_service:
            mock_service.get_all_customers.return_value = {
                'customers': [],
                'total': 0,
                'current_page': 1,
                'pages': 0,
                'has_next': False,
                'has_prev': False
            }
            
            response = client.get('/api/customers?search=john')
            
            assert response.status_code == 200
            mock_service.get_all_customers.assert_called_once()
            call_args = mock_service.get_all_customers.call_args[1]
            assert call_args['search'] == 'john'
    
    def test_create_customer_success(self, client):
        """Test successful customer creation."""
        customer_data = {
            'name': 'Jane Smith',
            'email': 'jane@example.com',
            'phone': '01234567890'
        }
        
        with patch('routes.api.customers.CustomerService') as mock_service:
            mock_customer = Mock()
            mock_customer.to_dict.return_value = {'id': 1, **customer_data}
            mock_service.create_customer.return_value = mock_customer
            
            response = client.post('/api/customers', 
                                 data=json.dumps(customer_data),
                                 content_type='application/json')
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['name'] == 'Jane Smith'
    
    def test_create_customer_validation_error(self, client):
        """Test customer creation with validation error."""
        customer_data = {
            'email': 'invalid-email'  # Missing name
        }
        
        with patch('routes.api.customers.CustomerService') as mock_service:
            from utils.exceptions import ValidationError
            mock_service.create_customer.side_effect = ValidationError('Name is required')
            
            response = client.post('/api/customers',
                                 data=json.dumps(customer_data),
                                 content_type='application/json')
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Name is required' in data['message']


class TestVehiclesAPI:
    """Integration tests for vehicles API."""
    
    def test_get_vehicles_success(self, client):
        """Test successful vehicles retrieval."""
        with patch('routes.api.vehicles.VehicleService') as mock_service:
            mock_service.get_all_vehicles.return_value = {
                'vehicles': [
                    {'id': 1, 'registration': 'AB12 CDE', 'make': 'Ford', 'model': 'Focus'}
                ],
                'total': 1,
                'current_page': 1,
                'pages': 1,
                'has_next': False,
                'has_prev': False
            }
            
            response = client.get('/api/vehicles')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert len(data['data']['vehicles']) == 1
    
    def test_get_vehicle_by_id_success(self, client):
        """Test successful vehicle retrieval by ID."""
        with patch('routes.api.vehicles.VehicleService') as mock_service:
            mock_service.get_vehicle_by_id.return_value = {
                'id': 1,
                'registration': 'AB12 CDE',
                'make': 'Ford',
                'model': 'Focus'
            }
            
            response = client.get('/api/vehicles/1')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['registration'] == 'AB12 CDE'
    
    def test_get_vehicle_by_id_not_found(self, client):
        """Test vehicle retrieval with non-existent ID."""
        with patch('routes.api.vehicles.VehicleService') as mock_service:
            from utils.exceptions import NotFoundError
            mock_service.get_vehicle_by_id.side_effect = NotFoundError('Vehicle not found')
            
            response = client.get('/api/vehicles/999')
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert data['status'] == 'error'


class TestJobsAPI:
    """Integration tests for jobs API."""
    
    def test_get_jobs_success(self, client):
        """Test successful jobs retrieval."""
        with patch('routes.api.jobs.JobService') as mock_service:
            mock_service.get_all_jobs.return_value = {
                'jobs': [
                    {'id': 1, 'job_number': 'JOB-001', 'description': 'Annual service'}
                ],
                'total': 1,
                'current_page': 1,
                'pages': 1,
                'has_next': False,
                'has_prev': False
            }
            
            response = client.get('/api/jobs')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert len(data['data']['jobs']) == 1
    
    def test_create_job_success(self, client):
        """Test successful job creation."""
        job_data = {
            'description': 'Brake pad replacement',
            'customer_id': 1,
            'vehicle_id': 1
        }
        
        with patch('routes.api.jobs.JobService') as mock_service:
            mock_job = Mock()
            mock_job.to_dict.return_value = {'id': 1, 'job_number': 'JOB-001', **job_data}
            mock_service.create_job.return_value = mock_job
            
            response = client.post('/api/jobs',
                                 data=json.dumps(job_data),
                                 content_type='application/json')
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['description'] == 'Brake pad replacement'


class TestMonitoringAPI:
    """Integration tests for monitoring API."""
    
    def test_health_check_healthy(self, client):
        """Test health check endpoint - healthy status."""
        with patch('routes.api.monitoring.get_health_status') as mock_health:
            mock_health.return_value = {
                'status': 'healthy',
                'timestamp': '2024-01-01T12:00:00',
                'checks': {
                    'database': {'status': 'healthy'},
                    'application': {'status': 'healthy'}
                }
            }
            
            response = client.get('/api/monitoring/health')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['status'] == 'healthy'
    
    def test_health_check_critical(self, client):
        """Test health check endpoint - critical status."""
        with patch('routes.api.monitoring.get_health_status') as mock_health:
            mock_health.return_value = {
                'status': 'critical',
                'timestamp': '2024-01-01T12:00:00',
                'checks': {
                    'database': {'status': 'critical'},
                    'application': {'status': 'healthy'}
                }
            }
            
            response = client.get('/api/monitoring/health')
            
            assert response.status_code == 503  # Service Unavailable
            data = json.loads(response.data)
            assert data['status'] == 'success'  # API call succeeded
            assert data['data']['status'] == 'critical'  # But system is critical
    
    def test_get_metrics_success(self, client):
        """Test metrics endpoint."""
        with patch('routes.api.monitoring.get_performance_metrics') as mock_metrics:
            mock_metrics.return_value = {
                'cpu_usage': {'avg': 45.0, 'max': 60.0, 'unit': 'percent'},
                'memory_usage': {'avg': 70.0, 'max': 85.0, 'unit': 'percent'}
            }
            
            response = client.get('/api/monitoring/metrics')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'cpu_usage' in data['data']['metrics']
    
    def test_get_metrics_with_hours_parameter(self, client):
        """Test metrics endpoint with hours parameter."""
        with patch('routes.api.monitoring.get_performance_metrics') as mock_metrics:
            mock_metrics.return_value = {}
            
            response = client.get('/api/monitoring/metrics?hours=6')
            
            assert response.status_code == 200
            mock_metrics.assert_called_once_with(6)
    
    def test_ping_endpoint(self, client):
        """Test ping endpoint."""
        with patch('routes.api.monitoring.get_system_monitor') as mock_monitor:
            mock_monitor.return_value.get_health_summary.return_value = {
                'timestamp': '2024-01-01T12:00:00'
            }
            
            response = client.get('/api/monitoring/ping')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['message'] == 'pong'
    
    def test_readiness_check_ready(self, client):
        """Test readiness check - ready status."""
        with patch('routes.api.monitoring.get_system_monitor') as mock_monitor:
            mock_monitor.return_value.check_database_health.return_value = {
                'status': 'healthy'
            }
            
            response = client.get('/api/monitoring/ready')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['data']['status'] == 'ready'
    
    def test_readiness_check_not_ready(self, client):
        """Test readiness check - not ready status."""
        with patch('routes.api.monitoring.get_system_monitor') as mock_monitor:
            mock_monitor.return_value.check_database_health.return_value = {
                'status': 'critical'
            }
            
            response = client.get('/api/monitoring/ready')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert data['status'] == 'error'
    
    def test_liveness_check(self, client):
        """Test liveness check."""
        response = client.get('/api/monitoring/live')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['status'] == 'alive'
    
    def test_log_client_error(self, client):
        """Test client error logging."""
        error_data = {
            'type': 'javascript',
            'message': 'Uncaught TypeError',
            'filename': 'app.js',
            'line': 42
        }
        
        response = client.post('/api/monitoring/errors',
                             data=json.dumps(error_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'logged successfully' in data['message']
    
    def test_log_client_error_no_data(self, client):
        """Test client error logging without data."""
        response = client.post('/api/monitoring/errors',
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'


class TestErrorHandling:
    """Test error handling across API endpoints."""
    
    def test_404_error_handling(self, client):
        """Test 404 error handling."""
        response = client.get('/api/nonexistent-endpoint')
        
        assert response.status_code == 404
    
    def test_method_not_allowed(self, client):
        """Test method not allowed error."""
        response = client.delete('/api/customers')  # DELETE not allowed
        
        assert response.status_code == 405
    
    def test_invalid_json_data(self, client):
        """Test invalid JSON data handling."""
        response = client.post('/api/customers',
                             data='invalid json',
                             content_type='application/json')
        
        assert response.status_code == 400
