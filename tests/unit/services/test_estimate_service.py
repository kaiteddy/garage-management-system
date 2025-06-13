"""
Unit tests for EstimateService.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, date, timedelta

from services.estimate_service import EstimateService
from utils.exceptions import ValidationError, NotFoundError
from models import Estimate, Customer, Vehicle, Job


class TestEstimateService:
    """Test cases for EstimateService."""
    
    def test_get_all_estimates_success(self, app_context):
        """Test successful retrieval of all estimates."""
        mock_estimates = [Mock(), Mock(), Mock()]
        
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_query = Mock()
            mock_estimate.query = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = Mock(
                items=mock_estimates,
                total=3,
                pages=1,
                current_page=1,
                has_next=False,
                has_prev=False
            )
            
            result = EstimateService.get_all_estimates(page=1, per_page=20)
            
            assert result['total'] == 3
            assert len(result['estimates']) == 3
            assert result['current_page'] == 1
    
    def test_get_all_estimates_with_filters(self, app_context):
        """Test estimate retrieval with filters."""
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_query = Mock()
            mock_estimate.query = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = Mock(
                items=[],
                total=0,
                pages=0,
                current_page=1,
                has_next=False,
                has_prev=False
            )
            
            EstimateService.get_all_estimates(
                customer_id=1,
                vehicle_id=2,
                status='draft'
            )
            
            # Verify filters were applied
            assert mock_query.filter.call_count >= 3
    
    def test_get_estimate_by_id_success(self, app_context, sample_estimate):
        """Test successful estimate retrieval by ID."""
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_estimate.get_by_id.return_value = sample_estimate
            
            result = EstimateService.get_estimate_by_id(sample_estimate.id)
            
            assert result['id'] == sample_estimate.id
            assert result['estimate_number'] == sample_estimate.estimate_number
    
    def test_get_estimate_by_id_not_found(self, app_context):
        """Test estimate retrieval with non-existent ID."""
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_estimate.get_by_id.return_value = None
            
            with pytest.raises(NotFoundError):
                EstimateService.get_estimate_by_id(999)
    
    def test_create_estimate_success(self, app_context):
        """Test successful estimate creation."""
        estimate_data = {
            'description': 'Test estimate',
            'customer_id': 1,
            'total_amount': 250.00
        }
        
        mock_estimate = Mock()
        mock_estimate.id = 1
        
        with patch('services.estimate_service.Customer') as mock_customer, \
             patch('services.estimate_service.Estimate') as mock_estimate_class:
            
            mock_customer.get_by_id.return_value = Mock(id=1)
            mock_estimate_class.create.return_value = mock_estimate
            
            with patch('services.estimate_service.EstimateService._generate_estimate_number') as mock_gen:
                mock_gen.return_value = 'EST-20240101-TEST001'
                
                result = EstimateService.create_estimate(estimate_data)
                
                assert result == mock_estimate
                mock_estimate_class.create.assert_called_once()
    
    def test_create_estimate_missing_required_fields(self, app_context):
        """Test estimate creation with missing required fields."""
        estimate_data = {
            'customer_id': 1
            # Missing description and total_amount
        }
        
        with pytest.raises(ValidationError) as exc_info:
            EstimateService.create_estimate(estimate_data)
        
        assert 'Missing required fields' in str(exc_info.value)
    
    def test_create_estimate_invalid_customer(self, app_context):
        """Test estimate creation with invalid customer ID."""
        estimate_data = {
            'description': 'Test estimate',
            'customer_id': 999,
            'total_amount': 250.00
        }
        
        with patch('services.estimate_service.Customer') as mock_customer:
            mock_customer.get_by_id.return_value = None
            
            with pytest.raises(ValidationError) as exc_info:
                EstimateService.create_estimate(estimate_data)
            
            assert 'Invalid customer ID' in str(exc_info.value)
    
    def test_create_estimate_sets_defaults(self, app_context):
        """Test that estimate creation sets default values."""
        estimate_data = {
            'description': 'Test estimate',
            'customer_id': 1,
            'total_amount': 250.00
        }
        
        with patch('services.estimate_service.Customer') as mock_customer, \
             patch('services.estimate_service.Estimate') as mock_estimate_class, \
             patch('services.estimate_service.EstimateService._generate_estimate_number') as mock_gen, \
             patch('services.estimate_service.datetime') as mock_datetime:
            
            mock_customer.get_by_id.return_value = Mock(id=1)
            mock_gen.return_value = 'EST-20240101-TEST001'
            mock_datetime.now.return_value.date.return_value = date(2024, 1, 1)
            
            EstimateService.create_estimate(estimate_data)
            
            # Verify create was called with defaults
            call_args = mock_estimate_class.create.call_args[1]
            assert call_args['estimate_number'] == 'EST-20240101-TEST001'
            assert call_args['status'] == 'draft'
            assert call_args['valid_until'] == date(2024, 1, 31)  # 30 days later
    
    def test_update_estimate_success(self, app_context, sample_estimate):
        """Test successful estimate update."""
        update_data = {
            'description': 'Updated description',
            'total_amount': 300.00
        }
        
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_estimate.get_by_id.return_value = sample_estimate
            sample_estimate.update = Mock()
            
            result = EstimateService.update_estimate(sample_estimate.id, update_data)
            
            assert result == sample_estimate
            sample_estimate.update.assert_called_once_with(**update_data)
    
    def test_delete_estimate_success(self, app_context, sample_estimate):
        """Test successful estimate deletion."""
        sample_estimate.invoices = []
        sample_estimate.delete = Mock()
        
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_estimate.get_by_id.return_value = sample_estimate
            
            EstimateService.delete_estimate(sample_estimate.id)
            
            sample_estimate.delete.assert_called_once()
    
    def test_delete_estimate_with_invoices(self, app_context, sample_estimate):
        """Test estimate deletion with associated invoices."""
        sample_estimate.invoices = [Mock()]  # Has associated invoices
        
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_estimate.get_by_id.return_value = sample_estimate
            
            with pytest.raises(ValidationError) as exc_info:
                EstimateService.delete_estimate(sample_estimate.id)
            
            assert 'Cannot delete estimate with associated invoices' in str(exc_info.value)
    
    def test_get_estimates_by_status(self, app_context):
        """Test estimate retrieval by status."""
        mock_estimates = [Mock(), Mock()]
        
        with patch('services.estimate_service.Estimate') as mock_estimate:
            mock_query = Mock()
            mock_estimate.query = mock_query
            mock_query.filter_by.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.all.return_value = mock_estimates
            
            result = EstimateService.get_estimates_by_status('draft')
            
            assert result == mock_estimates
            mock_query.filter_by.assert_called_once_with(status='draft')
    
    def test_get_expired_estimates(self, app_context):
        """Test retrieval of expired estimates."""
        mock_estimates = [Mock(), Mock()]
        
        with patch('services.estimate_service.Estimate') as mock_estimate, \
             patch('services.estimate_service.datetime') as mock_datetime:
            
            mock_datetime.now.return_value.date.return_value = date(2024, 1, 15)
            mock_query = Mock()
            mock_estimate.query = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.all.return_value = mock_estimates
            
            result = EstimateService.get_expired_estimates()
            
            assert result == mock_estimates
            mock_query.filter.assert_called_once()
    
    def test_is_estimate_expired(self, app_context):
        """Test estimate expiry checking."""
        # Test expired estimate
        expired_estimate = Mock()
        expired_estimate.valid_until = date(2024, 1, 1)
        
        with patch('services.estimate_service.datetime') as mock_datetime:
            mock_datetime.now.return_value.date.return_value = date(2024, 1, 15)
            
            result = EstimateService._is_estimate_expired(expired_estimate)
            assert result is True
        
        # Test valid estimate
        valid_estimate = Mock()
        valid_estimate.valid_until = date(2024, 12, 31)
        
        with patch('services.estimate_service.datetime') as mock_datetime:
            mock_datetime.now.return_value.date.return_value = date(2024, 1, 15)
            
            result = EstimateService._is_estimate_expired(valid_estimate)
            assert result is False
        
        # Test estimate with no expiry date
        no_expiry_estimate = Mock()
        no_expiry_estimate.valid_until = None
        
        result = EstimateService._is_estimate_expired(no_expiry_estimate)
        assert result is False
    
    def test_generate_estimate_number(self, app_context):
        """Test estimate number generation."""
        with patch('services.estimate_service.datetime') as mock_datetime, \
             patch('services.estimate_service.uuid') as mock_uuid, \
             patch('services.estimate_service.Estimate') as mock_estimate:
            
            mock_datetime.now.return_value.strftime.return_value = '20240101'
            mock_uuid.uuid4.return_value = Mock(__str__=lambda x: 'abcd1234-5678-9012-3456-789012345678')
            mock_estimate.query.filter_by.return_value.first.return_value = None
            
            result = EstimateService._generate_estimate_number()
            
            assert result.startswith('EST-20240101-')
            assert len(result) == 21  # EST-YYYYMMDD-XXXXXXXX
