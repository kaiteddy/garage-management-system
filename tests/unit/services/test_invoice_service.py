"""
Unit tests for InvoiceService.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, date

from services.invoice_service import InvoiceService
from utils.exceptions import ValidationError, NotFoundError


class TestInvoiceService:
    """Test cases for InvoiceService."""
    
    def test_get_all_invoices_success(self):
        """Test successful retrieval of all invoices."""
        mock_invoices = [Mock(), Mock(), Mock()]
        
        with patch('services.invoice_service.Invoice') as mock_invoice:
            mock_query = Mock()
            mock_invoice.query = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = Mock(
                items=mock_invoices,
                total=3,
                pages=1,
                current_page=1,
                has_next=False,
                has_prev=False
            )
            
            result = InvoiceService.get_all_invoices(page=1, per_page=20)
            
            assert result['total'] == 3
            assert len(result['invoices']) == 3
            assert result['current_page'] == 1
    
    def test_get_all_invoices_with_filters(self):
        """Test invoice retrieval with filters."""
        with patch('services.invoice_service.Invoice') as mock_invoice:
            mock_query = Mock()
            mock_invoice.query = mock_query
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
            
            InvoiceService.get_all_invoices(
                customer_id=1,
                vehicle_id=2,
                status='pending'
            )
            
            # Verify filters were applied
            assert mock_query.filter.call_count >= 3
    
    def test_get_invoice_by_id_success(self):
        """Test successful invoice retrieval by ID."""
        mock_invoice = Mock()
        mock_invoice.id = 1
        mock_invoice.invoice_number = 'INV-001'
        
        with patch('services.invoice_service.Invoice') as mock_invoice_class:
            mock_invoice_class.get_by_id.return_value = mock_invoice
            
            result = InvoiceService.get_invoice_by_id(1)
            
            assert result['id'] == 1
            assert result['invoice_number'] == 'INV-001'
    
    def test_get_invoice_by_id_not_found(self):
        """Test invoice retrieval with non-existent ID."""
        with patch('services.invoice_service.Invoice') as mock_invoice:
            mock_invoice.get_by_id.return_value = None
            
            with pytest.raises(NotFoundError):
                InvoiceService.get_invoice_by_id(999)
    
    def test_create_invoice_success(self):
        """Test successful invoice creation."""
        invoice_data = {
            'customer_id': 1,
            'amount': 250.00
        }
        
        mock_invoice = Mock()
        mock_invoice.id = 1
        
        with patch('services.invoice_service.Customer') as mock_customer, \
             patch('services.invoice_service.Invoice') as mock_invoice_class:
            
            mock_customer.get_by_id.return_value = Mock(id=1)
            mock_invoice_class.create.return_value = mock_invoice
            
            with patch('services.invoice_service.InvoiceService._generate_invoice_number') as mock_gen:
                mock_gen.return_value = 'INV-20240101-TEST001'
                
                result = InvoiceService.create_invoice(invoice_data)
                
                assert result == mock_invoice
                mock_invoice_class.create.assert_called_once()
    
    def test_create_invoice_missing_required_fields(self):
        """Test invoice creation with missing required fields."""
        invoice_data = {
            'customer_id': 1
            # Missing amount
        }
        
        with pytest.raises(ValidationError) as exc_info:
            InvoiceService.create_invoice(invoice_data)
        
        assert 'Missing required fields' in str(exc_info.value)
    
    def test_create_invoice_invalid_customer(self):
        """Test invoice creation with invalid customer ID."""
        invoice_data = {
            'customer_id': 999,
            'amount': 250.00
        }
        
        with patch('services.invoice_service.Customer') as mock_customer:
            mock_customer.get_by_id.return_value = None
            
            with pytest.raises(ValidationError) as exc_info:
                InvoiceService.create_invoice(invoice_data)
            
            assert 'Invalid customer ID' in str(exc_info.value)
    
    def test_update_invoice_success(self):
        """Test successful invoice update."""
        mock_invoice = Mock()
        update_data = {
            'amount': 300.00,
            'status': 'paid'
        }
        
        with patch('services.invoice_service.Invoice') as mock_invoice_class:
            mock_invoice_class.get_by_id.return_value = mock_invoice
            mock_invoice.update = Mock()
            
            result = InvoiceService.update_invoice(1, update_data)
            
            assert result == mock_invoice
            mock_invoice.update.assert_called_once_with(**update_data)
    
    def test_delete_invoice_success(self):
        """Test successful invoice deletion."""
        mock_invoice = Mock()
        mock_invoice.delete = Mock()
        
        with patch('services.invoice_service.Invoice') as mock_invoice_class:
            mock_invoice_class.get_by_id.return_value = mock_invoice
            
            InvoiceService.delete_invoice(1)
            
            mock_invoice.delete.assert_called_once()
    
    def test_get_invoices_by_status(self):
        """Test invoice retrieval by status."""
        mock_invoices = [Mock(), Mock()]
        
        with patch('services.invoice_service.Invoice') as mock_invoice:
            mock_query = Mock()
            mock_invoice.query = mock_query
            mock_query.filter_by.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.all.return_value = mock_invoices
            
            result = InvoiceService.get_invoices_by_status('pending')
            
            assert result == mock_invoices
            mock_query.filter_by.assert_called_once_with(status='pending')
    
    def test_mark_invoice_as_paid(self):
        """Test marking invoice as paid."""
        mock_invoice = Mock()
        mock_invoice.status = 'pending'
        mock_invoice.update = Mock()
        
        with patch('services.invoice_service.Invoice') as mock_invoice_class, \
             patch('services.invoice_service.datetime') as mock_datetime:
            
            mock_invoice_class.get_by_id.return_value = mock_invoice
            mock_datetime.now.return_value = datetime(2024, 1, 15)
            
            result = InvoiceService.mark_invoice_as_paid(1)
            
            assert result == mock_invoice
            mock_invoice.update.assert_called_once_with(
                status='paid',
                paid_at=datetime(2024, 1, 15)
            )
    
    def test_mark_already_paid_invoice(self):
        """Test marking already paid invoice."""
        mock_invoice = Mock()
        mock_invoice.status = 'paid'
        
        with patch('services.invoice_service.Invoice') as mock_invoice_class:
            mock_invoice_class.get_by_id.return_value = mock_invoice
            
            with pytest.raises(ValidationError) as exc_info:
                InvoiceService.mark_invoice_as_paid(1)
            
            assert 'already paid' in str(exc_info.value)
    
    def test_generate_invoice_number(self):
        """Test invoice number generation."""
        with patch('services.invoice_service.datetime') as mock_datetime, \
             patch('services.invoice_service.uuid') as mock_uuid, \
             patch('services.invoice_service.Invoice') as mock_invoice:
            
            mock_datetime.now.return_value.strftime.return_value = '20240101'
            mock_uuid.uuid4.return_value = Mock(__str__=lambda x: 'abcd1234-5678-9012-3456-789012345678')
            mock_invoice.query.filter_by.return_value.first.return_value = None
            
            result = InvoiceService._generate_invoice_number()
            
            assert result.startswith('INV-20240101-')
            assert len(result) == 21  # INV-YYYYMMDD-XXXXXXXX
    
    def test_calculate_invoice_totals(self):
        """Test invoice totals calculation."""
        invoice_data = {
            'subtotal': 100.00,
            'tax_rate': 20.0,  # 20% VAT
            'discount': 10.00
        }
        
        result = InvoiceService._calculate_invoice_totals(invoice_data)
        
        expected_tax = (100.00 - 10.00) * 0.20  # 18.00
        expected_total = 90.00 + 18.00  # 108.00
        
        assert result['tax_amount'] == expected_tax
        assert result['total_amount'] == expected_total
    
    def test_validate_invoice_data(self):
        """Test invoice data validation."""
        # Valid data
        valid_data = {
            'customer_id': 1,
            'amount': 100.00
        }
        
        # Should not raise exception
        InvoiceService._validate_invoice_data(valid_data)
        
        # Invalid data - negative amount
        invalid_data = {
            'customer_id': 1,
            'amount': -50.00
        }
        
        with pytest.raises(ValidationError) as exc_info:
            InvoiceService._validate_invoice_data(invalid_data)
        
        assert 'Amount must be positive' in str(exc_info.value)
    
    def test_get_overdue_invoices(self):
        """Test retrieval of overdue invoices."""
        mock_invoices = [Mock(), Mock()]
        
        with patch('services.invoice_service.Invoice') as mock_invoice, \
             patch('services.invoice_service.datetime') as mock_datetime:
            
            mock_datetime.now.return_value.date.return_value = date(2024, 1, 15)
            mock_query = Mock()
            mock_invoice.query = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.all.return_value = mock_invoices
            
            result = InvoiceService.get_overdue_invoices()
            
            assert result == mock_invoices
            mock_query.filter.assert_called_once()
    
    def test_get_invoice_statistics(self):
        """Test invoice statistics calculation."""
        with patch('services.invoice_service.db') as mock_db:
            # Mock database query results
            mock_db.session.query.return_value.filter.return_value.scalar.side_effect = [
                5,      # total_invoices
                3,      # paid_invoices
                2,      # pending_invoices
                1500.00,  # total_amount
                1200.00,  # paid_amount
                300.00   # pending_amount
            ]
            
            result = InvoiceService.get_invoice_statistics()
            
            assert result['total_invoices'] == 5
            assert result['paid_invoices'] == 3
            assert result['pending_invoices'] == 2
            assert result['total_amount'] == 1500.00
            assert result['paid_amount'] == 1200.00
            assert result['pending_amount'] == 300.00
            assert result['payment_rate'] == 60.0  # 3/5 * 100
