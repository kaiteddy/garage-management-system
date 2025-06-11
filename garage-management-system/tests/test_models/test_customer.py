"""
Tests for Customer model.
"""
import pytest
from src.models import Customer, db


def test_customer_creation(app):
    """Test customer creation."""
    with app.app_context():
        customer = Customer(
            name='Test Customer',
            company='Test Company',
            email='test@example.com'
        )
        customer.save()
        
        assert customer.id is not None
        assert customer.name == 'Test Customer'
        assert customer.company == 'Test Company'
        assert customer.email == 'test@example.com'
        assert customer.account_number is not None


def test_customer_to_dict(app):
    """Test customer serialization."""
    with app.app_context():
        customer = Customer(
            name='Test Customer',
            email='test@example.com'
        )
        customer.save()
        
        data = customer.to_dict()
        
        assert 'id' in data
        assert 'name' in data
        assert 'email' in data
        assert 'created_at' in data
        assert 'updated_at' in data
        assert data['name'] == 'Test Customer'
        assert data['email'] == 'test@example.com'


def test_customer_search(app):
    """Test customer search functionality."""
    with app.app_context():
        # Create test customers
        customer1 = Customer(name='John Doe', email='john@example.com')
        customer2 = Customer(name='Jane Smith', company='Smith Corp')
        customer1.save()
        customer2.save()
        
        # Search by name
        results = Customer.search('John')
        assert len(results) == 1
        assert results[0].name == 'John Doe'
        
        # Search by company
        results = Customer.search('Smith')
        assert len(results) == 1
        assert results[0].company == 'Smith Corp'
        
        # Search by email
        results = Customer.search('john@example.com')
        assert len(results) == 1
        assert results[0].email == 'john@example.com'


def test_customer_full_name_property(app):
    """Test customer full_name property."""
    with app.app_context():
        # Customer with company
        customer1 = Customer(name='John Doe', company='Doe Corp')
        assert customer1.full_name == 'Doe Corp'
        
        # Customer without company
        customer2 = Customer(name='Jane Smith')
        assert customer2.full_name == 'Jane Smith'


def test_customer_account_number_generation(app):
    """Test automatic account number generation."""
    with app.app_context():
        customer1 = Customer(name='Test Customer 1')
        customer2 = Customer(name='Test Customer 2')
        
        customer1.save()
        customer2.save()
        
        assert customer1.account_number is not None
        assert customer2.account_number is not None
        assert customer1.account_number != customer2.account_number
        assert len(customer1.account_number) == 8
        assert customer1.account_number.isdigit()


def test_customer_relationships(app):
    """Test customer relationships."""
    with app.app_context():
        customer = Customer(name='Test Customer')
        customer.save()
        
        # Test that relationships are properly set up
        assert hasattr(customer, 'vehicles')
        assert hasattr(customer, 'jobs')
        assert hasattr(customer, 'estimates')
        assert hasattr(customer, 'invoices')
        
        # Test that relationships return empty lists initially
        assert customer.vehicles == []
        assert customer.jobs == []
        assert customer.estimates == []
        assert customer.invoices == []
