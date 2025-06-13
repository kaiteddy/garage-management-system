"""
Estimate API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.estimate_service import EstimateService
from utils.exceptions import GarageManagementError
from utils.response_utils import ResponseFormatter
from utils.pagination_utils import PaginationHelper

estimates_api = Blueprint('estimates_api', __name__)


@estimates_api.route('/estimates', methods=['GET'])
def get_estimates():
    """Get all estimates with pagination and search."""
    try:
        # Get pagination parameters
        page, per_page = PaginationHelper.get_pagination_params()

        # Get search parameters
        search_params = PaginationHelper.get_search_params()
        search = search_params.get('search')
        customer_id = search_params.get('customer_id')

        # Get additional filters
        vehicle_id = request.args.get('vehicle_id', type=int)
        status = request.args.get('status')

        # Get estimates from service
        result = EstimateService.get_all_estimates(
            page=page,
            per_page=per_page,
            search=search,
            customer_id=customer_id,
            vehicle_id=vehicle_id,
            status=status
        )

        return ResponseFormatter.success(result)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@estimates_api.route('/estimates/<int:estimate_id>', methods=['GET'])
def get_estimate(estimate_id):
    """Get estimate by ID with related data."""
    try:
        estimate_data = EstimateService.get_estimate_by_id(estimate_id)
        return ResponseFormatter.success(estimate_data)

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@estimates_api.route('/estimates', methods=['POST'])
def create_estimate():
    """Create a new estimate."""
    try:
        data = request.get_json()

        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)

        estimate = EstimateService.create_estimate(data)
        return ResponseFormatter.success(
            estimate.to_dict(),
            message='Estimate created successfully',
            status_code=201
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(e.message, error_code=e.error_code)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@estimates_api.route('/estimates/<int:estimate_id>', methods=['PUT'])
def update_estimate(estimate_id):
    """Update estimate information."""
    try:
        data = request.get_json()

        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)

        estimate = EstimateService.update_estimate(estimate_id, data)
        return ResponseFormatter.success(
            estimate.to_dict(),
            message='Estimate updated successfully'
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@estimates_api.route('/estimates/<int:estimate_id>', methods=['DELETE'])
def delete_estimate(estimate_id):
    """Delete an estimate."""
    try:
        EstimateService.delete_estimate(estimate_id)
        return ResponseFormatter.success(message='Estimate deleted successfully')

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@estimates_api.route('/estimates/status/<status>', methods=['GET'])
def get_estimates_by_status(status):
    """Get estimates by status."""
    try:
        estimates = EstimateService.get_estimates_by_status(status)
        estimates_data = [estimate.to_dict() for estimate in estimates]
        return ResponseFormatter.success(estimates_data)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@estimates_api.route('/estimates/expired', methods=['GET'])
def get_expired_estimates():
    """Get all expired estimates."""
    try:
        estimates = EstimateService.get_expired_estimates()
        estimates_data = [estimate.to_dict() for estimate in estimates]
        return ResponseFormatter.success(estimates_data)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)
