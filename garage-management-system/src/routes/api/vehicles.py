"""
Vehicle API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.vehicle_service import VehicleService
from utils.exceptions import GarageManagementError
from utils.date_utils import format_date_for_display

vehicles_api = Blueprint('vehicles_api', __name__)


@vehicles_api.route('/vehicles', methods=['GET'])
def get_vehicles():
    """Get all vehicles with pagination and search."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        customer_id = request.args.get('customer_id', type=int)
        
        # Limit per_page to prevent abuse
        per_page = min(per_page, 100)
        
        result = VehicleService.get_all_vehicles(
            page=page,
            per_page=per_page,
            search=search if search else None,
            customer_id=customer_id
        )
        
        # Format dates for display
        for vehicle in result['vehicles']:
            vehicle['mot_due'] = format_date_for_display(vehicle.get('mot_expiry'))
            vehicle['tax_due'] = format_date_for_display(vehicle.get('tax_due'))
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@vehicles_api.route('/vehicles/<int:vehicle_id>', methods=['GET'])
def get_vehicle(vehicle_id):
    """Get vehicle by ID with related data."""
    try:
        vehicle = VehicleService.get_vehicle_by_id(vehicle_id)
        
        # Get related data
        vehicle_data = vehicle.to_dict()
        vehicle_data['jobs'] = [job.to_dict() for job in vehicle.jobs]
        vehicle_data['estimates'] = [estimate.to_dict() for estimate in vehicle.estimates]
        vehicle_data['invoices'] = [invoice.to_dict() for invoice in vehicle.invoices]
        
        # Format dates for display
        vehicle_data['mot_due'] = format_date_for_display(vehicle_data.get('mot_expiry'))
        vehicle_data['tax_due'] = format_date_for_display(vehicle_data.get('tax_due'))
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data
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


@vehicles_api.route('/vehicles', methods=['POST'])
def create_vehicle():
    """Create a new vehicle with DVLA data."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        vehicle = VehicleService.create_vehicle(data)
        
        # Format response data
        vehicle_data = vehicle.to_dict()
        vehicle_data['mot_due'] = format_date_for_display(vehicle_data.get('mot_expiry'))
        vehicle_data['tax_due'] = format_date_for_display(vehicle_data.get('tax_due'))
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data,
            'message': 'Vehicle created successfully'
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


@vehicles_api.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update vehicle information."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        vehicle = VehicleService.update_vehicle(vehicle_id, data)
        
        # Format response data
        vehicle_data = vehicle.to_dict()
        vehicle_data['mot_due'] = format_date_for_display(vehicle_data.get('mot_expiry'))
        vehicle_data['tax_due'] = format_date_for_display(vehicle_data.get('tax_due'))
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data,
            'message': 'Vehicle updated successfully'
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


@vehicles_api.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """Delete a vehicle."""
    try:
        VehicleService.delete_vehicle(vehicle_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Vehicle deleted successfully'
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


@vehicles_api.route('/vehicles/<int:vehicle_id>/refresh-dvla', methods=['POST'])
def refresh_dvla_data(vehicle_id):
    """Refresh DVLA data for a vehicle."""
    try:
        vehicle = VehicleService.refresh_dvla_data(vehicle_id)
        
        # Format response data
        vehicle_data = vehicle.to_dict()
        vehicle_data['mot_due'] = format_date_for_display(vehicle_data.get('mot_expiry'))
        vehicle_data['tax_due'] = format_date_for_display(vehicle_data.get('tax_due'))
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data,
            'message': 'DVLA data refreshed successfully'
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


@vehicles_api.route('/vehicles/search', methods=['GET'])
def search_vehicles():
    """Search vehicles."""
    try:
        query = request.args.get('q', '')
        
        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Search query is required'
            }), 400
        
        vehicles = VehicleService.search_vehicles(query)
        
        # Format dates for display
        vehicle_data = []
        for vehicle in vehicles:
            data = vehicle.to_dict()
            data['mot_due'] = format_date_for_display(data.get('mot_expiry'))
            data['tax_due'] = format_date_for_display(data.get('tax_due'))
            vehicle_data.append(data)
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@vehicles_api.route('/vehicles/mot-status/<status>', methods=['GET'])
def get_vehicles_by_mot_status(status):
    """Get vehicles by MOT status."""
    try:
        days = request.args.get('days', 30, type=int)
        
        vehicles = VehicleService.get_vehicles_by_mot_status(status, days)
        
        # Format dates for display
        vehicle_data = []
        for vehicle in vehicles:
            data = vehicle.to_dict()
            data['mot_due'] = format_date_for_display(data.get('mot_expiry'))
            data['tax_due'] = format_date_for_display(data.get('tax_due'))
            vehicle_data.append(data)
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
