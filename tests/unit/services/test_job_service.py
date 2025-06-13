"""
Unit tests for JobService.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from services.job_service import JobService
from utils.exceptions import ValidationError, NotFoundError
from models import Job, Customer, Vehicle


class TestJobService:
    """Test cases for JobService."""
    
    def test_get_all_jobs_success(self, app_context, sample_customer, sample_vehicle):
        """Test successful retrieval of all jobs."""
        # Create test jobs
        jobs = []
        for i in range(3):
            job = Job(
                job_number=f'JOB-TEST-{i+1:03d}',
                description=f'Test job {i+1}',
                status='pending',
                customer_id=sample_customer.id,
                vehicle_id=sample_vehicle.id
            )
            jobs.append(job)
        
        with patch('services.job_service.Job') as mock_job:
            mock_query = Mock()
            mock_job.query = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = Mock(
                items=jobs,
                total=3,
                pages=1,
                current_page=1,
                has_next=False,
                has_prev=False
            )
            
            result = JobService.get_all_jobs(page=1, per_page=20)
            
            assert result['total'] == 3
            assert len(result['jobs']) == 3
            assert result['current_page'] == 1
    
    def test_get_all_jobs_with_search(self, app_context):
        """Test job retrieval with search functionality."""
        with patch('services.job_service.Job') as mock_job, \
             patch('services.job_service.SearchHelper') as mock_search:
            
            mock_query = Mock()
            mock_job.query = mock_query
            mock_search.build_job_search_query.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = Mock(
                items=[],
                total=0,
                pages=0,
                current_page=1,
                has_next=False,
                has_prev=False
            )
            
            JobService.get_all_jobs(search='test search')
            
            mock_search.build_job_search_query.assert_called_once_with(mock_query, 'test search')
    
    def test_get_job_by_id_success(self, app_context, sample_job):
        """Test successful job retrieval by ID."""
        with patch('services.job_service.Job') as mock_job:
            mock_job.get_by_id.return_value = sample_job
            
            result = JobService.get_job_by_id(sample_job.id)
            
            assert result['id'] == sample_job.id
            assert result['job_number'] == sample_job.job_number
            mock_job.get_by_id.assert_called_once_with(sample_job.id)
    
    def test_get_job_by_id_not_found(self, app_context):
        """Test job retrieval with non-existent ID."""
        with patch('services.job_service.Job') as mock_job:
            mock_job.get_by_id.return_value = None
            
            with pytest.raises(NotFoundError) as exc_info:
                JobService.get_job_by_id(999)
            
            assert 'Job' in str(exc_info.value)
            assert '999' in str(exc_info.value)
    
    def test_create_job_success(self, app_context, sample_customer_data):
        """Test successful job creation."""
        job_data = {
            'description': 'Test job creation',
            'customer_id': 1,
            'vehicle_id': 1,
            'status': 'pending'
        }
        
        mock_job = Mock()
        mock_job.id = 1
        mock_job.job_number = 'JOB-20240101-TEST001'
        
        with patch('services.job_service.Customer') as mock_customer, \
             patch('services.job_service.Vehicle') as mock_vehicle, \
             patch('services.job_service.Job') as mock_job_class:
            
            mock_customer.get_by_id.return_value = Mock(id=1)
            mock_vehicle.get_by_id.return_value = Mock(id=1)
            mock_job_class.create.return_value = mock_job
            
            with patch('services.job_service.JobService._generate_job_number') as mock_gen:
                mock_gen.return_value = 'JOB-20240101-TEST001'
                
                result = JobService.create_job(job_data)
                
                assert result == mock_job
                mock_job_class.create.assert_called_once()
    
    def test_create_job_missing_required_fields(self, app_context):
        """Test job creation with missing required fields."""
        job_data = {
            'customer_id': 1
            # Missing description
        }
        
        with pytest.raises(ValidationError) as exc_info:
            JobService.create_job(job_data)
        
        assert 'Missing required fields' in str(exc_info.value)
        assert 'description' in str(exc_info.value)
    
    def test_create_job_invalid_customer(self, app_context):
        """Test job creation with invalid customer ID."""
        job_data = {
            'description': 'Test job',
            'customer_id': 999
        }
        
        with patch('services.job_service.Customer') as mock_customer:
            mock_customer.get_by_id.return_value = None
            
            with pytest.raises(ValidationError) as exc_info:
                JobService.create_job(job_data)
            
            assert 'Invalid customer ID' in str(exc_info.value)
    
    def test_update_job_success(self, app_context, sample_job):
        """Test successful job update."""
        update_data = {
            'description': 'Updated description',
            'status': 'completed'
        }
        
        with patch('services.job_service.Job') as mock_job:
            mock_job.get_by_id.return_value = sample_job
            sample_job.update = Mock()
            
            result = JobService.update_job(sample_job.id, update_data)
            
            assert result == sample_job
            sample_job.update.assert_called_once_with(**update_data)
    
    def test_update_job_not_found(self, app_context):
        """Test job update with non-existent ID."""
        with patch('services.job_service.Job') as mock_job:
            mock_job.get_by_id.return_value = None
            
            with pytest.raises(NotFoundError):
                JobService.update_job(999, {'description': 'Updated'})
    
    def test_delete_job_success(self, app_context, sample_job):
        """Test successful job deletion."""
        sample_job.estimates = []
        sample_job.invoices = []
        sample_job.delete = Mock()
        
        with patch('services.job_service.Job') as mock_job:
            mock_job.get_by_id.return_value = sample_job
            
            JobService.delete_job(sample_job.id)
            
            sample_job.delete.assert_called_once()
    
    def test_delete_job_with_associated_records(self, app_context, sample_job):
        """Test job deletion with associated estimates/invoices."""
        sample_job.estimates = [Mock()]  # Has associated estimates
        sample_job.invoices = []
        
        with patch('services.job_service.Job') as mock_job:
            mock_job.get_by_id.return_value = sample_job
            
            with pytest.raises(ValidationError) as exc_info:
                JobService.delete_job(sample_job.id)
            
            assert 'Cannot delete job with associated' in str(exc_info.value)
    
    def test_get_jobs_by_status(self, app_context):
        """Test job retrieval by status."""
        mock_jobs = [Mock(), Mock()]
        
        with patch('services.job_service.Job') as mock_job:
            mock_query = Mock()
            mock_job.query = mock_query
            mock_query.filter_by.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.all.return_value = mock_jobs
            
            result = JobService.get_jobs_by_status('pending')
            
            assert result == mock_jobs
            mock_query.filter_by.assert_called_once_with(status='pending')
    
    def test_generate_job_number(self, app_context):
        """Test job number generation."""
        with patch('services.job_service.datetime') as mock_datetime, \
             patch('services.job_service.uuid') as mock_uuid, \
             patch('services.job_service.Job') as mock_job:
            
            mock_datetime.now.return_value.strftime.return_value = '20240101'
            mock_uuid.uuid4.return_value = Mock(__str__=lambda x: 'abcd1234-5678-9012-3456-789012345678')
            mock_job.query.filter_by.return_value.first.return_value = None
            
            result = JobService._generate_job_number()
            
            assert result.startswith('JOB-20240101-')
            assert len(result) == 21  # JOB-YYYYMMDD-XXXXXXXX
    
    def test_generate_job_number_ensures_uniqueness(self, app_context):
        """Test that job number generation ensures uniqueness."""
        with patch('services.job_service.datetime') as mock_datetime, \
             patch('services.job_service.uuid') as mock_uuid, \
             patch('services.job_service.Job') as mock_job:
            
            mock_datetime.now.return_value.strftime.return_value = '20240101'
            mock_uuid.uuid4.side_effect = [
                Mock(__str__=lambda x: 'duplicate-uuid'),
                Mock(__str__=lambda x: 'unique-uuid')
            ]
            
            # First call returns existing job (duplicate), second returns None (unique)
            mock_job.query.filter_by.return_value.first.side_effect = [Mock(), None]
            
            result = JobService._generate_job_number()
            
            assert 'UNIQUE-UU' in result  # Should use the second UUID
            assert mock_uuid.uuid4.call_count == 2
