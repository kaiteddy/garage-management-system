"""
Unit tests for ResponseFormatter utility.
"""
import pytest
from unittest.mock import Mock
from flask import Flask, jsonify

from utils.response_utils import ResponseFormatter


class TestResponseFormatter:
    """Test cases for ResponseFormatter."""
    
    def setup_method(self):
        """Setup test environment."""
        self.app = Flask(__name__)
        self.app_context = self.app.app_context()
        self.app_context.push()
    
    def teardown_method(self):
        """Cleanup test environment."""
        self.app_context.pop()
    
    def test_success_response_basic(self):
        """Test basic success response."""
        response, status_code = ResponseFormatter.success()
        
        assert status_code == 200
        assert response.json['status'] == 'success'
        assert 'data' not in response.json
        assert 'message' not in response.json
    
    def test_success_response_with_data(self):
        """Test success response with data."""
        test_data = {'id': 1, 'name': 'Test'}
        response, status_code = ResponseFormatter.success(data=test_data)
        
        assert status_code == 200
        assert response.json['status'] == 'success'
        assert response.json['data'] == test_data
    
    def test_success_response_with_message(self):
        """Test success response with message."""
        test_message = 'Operation completed successfully'
        response, status_code = ResponseFormatter.success(message=test_message)
        
        assert status_code == 200
        assert response.json['status'] == 'success'
        assert response.json['message'] == test_message
    
    def test_success_response_custom_status_code(self):
        """Test success response with custom status code."""
        response, status_code = ResponseFormatter.success(status_code=201)
        
        assert status_code == 201
        assert response.json['status'] == 'success'
    
    def test_error_response_basic(self):
        """Test basic error response."""
        error_message = 'Something went wrong'
        response, status_code = ResponseFormatter.error(error_message)
        
        assert status_code == 400
        assert response.json['status'] == 'error'
        assert response.json['message'] == error_message
        assert 'error_code' not in response.json
    
    def test_error_response_with_error_code(self):
        """Test error response with error code."""
        error_message = 'Validation failed'
        error_code = 'VALIDATION_ERROR'
        response, status_code = ResponseFormatter.error(
            error_message, 
            error_code=error_code
        )
        
        assert status_code == 400
        assert response.json['status'] == 'error'
        assert response.json['message'] == error_message
        assert response.json['error_code'] == error_code
    
    def test_error_response_custom_status_code(self):
        """Test error response with custom status code."""
        response, status_code = ResponseFormatter.error(
            'Not found', 
            status_code=404
        )
        
        assert status_code == 404
        assert response.json['status'] == 'error'
    
    def test_format_vehicle_data_single_dict(self):
        """Test vehicle data formatting for single dictionary."""
        vehicle_data = {
            'id': 1,
            'registration': 'AB12 CDE',
            'mot_expiry': '2024-12-31',
            'tax_due': '2024-06-30'
        }
        
        with patch('utils.response_utils.format_date_for_display') as mock_format:
            mock_format.side_effect = lambda x: f"formatted_{x}" if x else None
            
            result = ResponseFormatter.format_vehicle_data(vehicle_data)
            
            assert result['id'] == 1
            assert result['registration'] == 'AB12 CDE'
            assert result['mot_due'] == 'formatted_2024-12-31'
            assert result['tax_due'] == 'formatted_2024-06-30'
    
    def test_format_vehicle_data_list(self):
        """Test vehicle data formatting for list of dictionaries."""
        vehicle_list = [
            {'id': 1, 'registration': 'AB12 CDE', 'mot_expiry': '2024-12-31'},
            {'id': 2, 'registration': 'XY98 ZAB', 'mot_expiry': '2024-11-30'}
        ]
        
        with patch('utils.response_utils.format_date_for_display') as mock_format:
            mock_format.side_effect = lambda x: f"formatted_{x}" if x else None
            
            result = ResponseFormatter.format_vehicle_data(vehicle_list)
            
            assert len(result) == 2
            assert result[0]['mot_due'] == 'formatted_2024-12-31'
            assert result[1]['mot_due'] == 'formatted_2024-11-30'
    
    def test_format_vehicle_data_model_object(self):
        """Test vehicle data formatting for model object."""
        mock_vehicle = Mock()
        mock_vehicle.to_dict.return_value = {
            'id': 1,
            'registration': 'AB12 CDE',
            'mot_expiry': '2024-12-31'
        }
        
        with patch('utils.response_utils.format_date_for_display') as mock_format:
            mock_format.return_value = 'formatted_date'
            
            result = ResponseFormatter.format_vehicle_data(mock_vehicle)
            
            assert result['id'] == 1
            assert result['mot_due'] == 'formatted_date'
            mock_vehicle.to_dict.assert_called_once()
    
    def test_format_customer_data_single_dict(self):
        """Test customer data formatting for single dictionary."""
        customer_data = {
            'id': 1,
            'name': 'John Doe',
            'email': 'john@example.com'
        }
        
        result = ResponseFormatter.format_customer_data(customer_data)
        
        assert result == customer_data
        assert result is not customer_data  # Should be a copy
    
    def test_format_customer_data_list(self):
        """Test customer data formatting for list."""
        customer_list = [
            {'id': 1, 'name': 'John Doe'},
            {'id': 2, 'name': 'Jane Smith'}
        ]
        
        result = ResponseFormatter.format_customer_data(customer_list)
        
        assert len(result) == 2
        assert result[0]['name'] == 'John Doe'
        assert result[1]['name'] == 'Jane Smith'
    
    def test_format_customer_data_model_object(self):
        """Test customer data formatting for model object."""
        mock_customer = Mock()
        mock_customer.to_dict.return_value = {
            'id': 1,
            'name': 'John Doe'
        }
        
        result = ResponseFormatter.format_customer_data(mock_customer)
        
        assert result['id'] == 1
        assert result['name'] == 'John Doe'
        mock_customer.to_dict.assert_called_once()
    
    def test_paginated_response_basic(self):
        """Test basic paginated response."""
        items = [{'id': 1}, {'id': 2}]
        
        result = ResponseFormatter.paginated_response(
            items=items,
            total=10,
            page=1,
            per_page=2,
            has_next=True,
            has_prev=False
        )
        
        assert result['items'] == items
        assert result['pagination']['total'] == 10
        assert result['pagination']['page'] == 1
        assert result['pagination']['per_page'] == 2
        assert result['pagination']['pages'] == 5  # 10 / 2
        assert result['pagination']['has_next'] is True
        assert result['pagination']['has_prev'] is False
    
    def test_paginated_response_with_formatter(self):
        """Test paginated response with formatter function."""
        items = [{'id': 1}, {'id': 2}]
        
        def mock_formatter(data):
            return [{'formatted': True, **item} for item in data]
        
        result = ResponseFormatter.paginated_response(
            items=items,
            total=2,
            page=1,
            per_page=2,
            has_next=False,
            has_prev=False,
            formatter=mock_formatter
        )
        
        assert result['items'][0]['formatted'] is True
        assert result['items'][0]['id'] == 1
    
    def test_paginated_response_edge_cases(self):
        """Test paginated response edge cases."""
        # Test with 0 total
        result = ResponseFormatter.paginated_response(
            items=[],
            total=0,
            page=1,
            per_page=20,
            has_next=False,
            has_prev=False
        )
        
        assert result['pagination']['pages'] == 0
        
        # Test with 1 item and per_page > 1
        result = ResponseFormatter.paginated_response(
            items=[{'id': 1}],
            total=1,
            page=1,
            per_page=20,
            has_next=False,
            has_prev=False
        )
        
        assert result['pagination']['pages'] == 1
