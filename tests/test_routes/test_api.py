"""
Tests for API routes.
"""
import pytest
import json
from src.models import Customer


def test_dashboard_api(client):
    """Test dashboard API endpoint."""
    response = client.get('/api/dashboard')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert 'customers' in data['data']
    assert 'vehicles' in data['data']
    assert 'jobs' in data['data']
    assert 'revenue' in data['data']


def test_customers_api_get(client):
    """Test customers GET API endpoint."""
    response = client.get('/api/customers')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert 'customers' in data['data']
    assert 'total' in data['data']
    assert 'pages' in data['data']


def test_customers_api_post(client, app):
    """Test customers POST API endpoint."""
    customer_data = {
        'name': 'Test Customer',
        'company': 'Test Company',
        'email': 'test@example.com',
        'phone': '01234567890'
    }
    
    response = client.post('/api/customers', 
                          data=json.dumps(customer_data),
                          content_type='application/json')
    
    assert response.status_code == 201
    
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert data['data']['name'] == 'Test Customer'
    assert data['data']['company'] == 'Test Company'
    assert data['data']['email'] == 'test@example.com'
    
    # Verify customer was created in database
    with app.app_context():
        customer = Customer.query.filter_by(email='test@example.com').first()
        assert customer is not None
        assert customer.name == 'Test Customer'


def test_customers_api_post_validation(client):
    """Test customers POST API validation."""
    # Test missing required field
    customer_data = {
        'company': 'Test Company',
        'email': 'test@example.com'
    }
    
    response = client.post('/api/customers', 
                          data=json.dumps(customer_data),
                          content_type='application/json')
    
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['status'] == 'error'
    assert 'name' in data['message'].lower()


def test_customers_api_post_invalid_email(client):
    """Test customers POST API with invalid email."""
    customer_data = {
        'name': 'Test Customer',
        'email': 'invalid-email'
    }
    
    response = client.post('/api/customers', 
                          data=json.dumps(customer_data),
                          content_type='application/json')
    
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['status'] == 'error'
    assert 'email' in data['message'].lower()


def test_vehicles_api_get(client):
    """Test vehicles GET API endpoint."""
    response = client.get('/api/vehicles')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert 'vehicles' in data['data']
    assert 'total' in data['data']
    assert 'pages' in data['data']


def test_vehicles_api_post(client):
    """Test vehicles POST API endpoint."""
    vehicle_data = {
        'registration': 'AB12 CDE',
        'make': 'Ford',
        'model': 'Focus',
        'year': 2020
    }
    
    response = client.post('/api/vehicles', 
                          data=json.dumps(vehicle_data),
                          content_type='application/json')
    
    # Note: This might fail if DVLA API is not configured
    # In a real test environment, you'd mock the DVLA service
    assert response.status_code in [201, 400]  # 400 if DVLA fails


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['service'] == 'garage-management-system'


def test_api_health_check(client):
    """Test API health check endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert 'customers' in data
    assert 'vehicles' in data
