"""
Customer API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.customer_service import CustomerService
from utils.exceptions import GarageManagementError

customers_api = Blueprint('customers_api', __name__)


@customers_api.route('/customers', methods=['GET'])
def get_customers():
    """Get all customers with pagination and search."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        
        # Limit per_page to prevent abuse
        per_page = min(per_page, 100)
        
        result = CustomerService.get_all_customers(
            page=page,
            per_page=per_page,
            search=search if search else None
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@customers_api.route('/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    """Get customer by ID with related data."""
    try:
        customer = CustomerService.get_customer_by_id(customer_id)
        
        # Get related data
        customer_data = customer.to_dict()
        customer_data['vehicles'] = [vehicle.to_dict() for vehicle in customer.vehicles]
        customer_data['jobs'] = [job.to_dict() for job in customer.jobs]
        customer_data['estimates'] = [estimate.to_dict() for estimate in customer.estimates]
        customer_data['invoices'] = [invoice.to_dict() for invoice in customer.invoices]
        
        return jsonify({
            'status': 'success',
            'data': customer_data
        })
        
    except GarageManagementError as e:
        return jsonify({
            'status': 'error',
            'message': e.message,
            'error_code': e.error_code
        }), 404 if 'not found' in e.message.lower() else 400
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@customers_api.route('/customers', methods=['POST'])
def create_customer():
    """Create a new customer."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        customer = CustomerService.create_customer(data)
        
        return jsonify({
            'status': 'success',
            'data': customer.to_dict(),
            'message': 'Customer created successfully'
        }), 201
        
    except GarageManagementError as e:
        return jsonify({
            'status': 'error',
            'message': e.message,
            'error_code': e.error_code
        }), 400
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@customers_api.route('/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Update customer information."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        customer = CustomerService.update_customer(customer_id, data)
        
        return jsonify({
            'status': 'success',
            'data': customer.to_dict(),
            'message': 'Customer updated successfully'
        })
        
    except GarageManagementError as e:
        return jsonify({
            'status': 'error',
            'message': e.message,
            'error_code': e.error_code
        }), 404 if 'not found' in e.message.lower() else 400
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@customers_api.route('/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """Delete a customer."""
    try:
        CustomerService.delete_customer(customer_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Customer deleted successfully'
        })
        
    except GarageManagementError as e:
        return jsonify({
            'status': 'error',
            'message': e.message,
            'error_code': e.error_code
        }), 404 if 'not found' in e.message.lower() else 400
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@customers_api.route('/customers/search', methods=['GET'])
def search_customers():
    """Search customers."""
    try:
        query = request.args.get('q', '')
        
        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Search query is required'
            }), 400
        
        customers = CustomerService.search_customers(query)
        
        return jsonify({
            'status': 'success',
            'data': [customer.to_dict() for customer in customers]
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
