"""
Job API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.job_service import JobService
from utils.exceptions import GarageManagementError
from utils.response_utils import ResponseFormatter
from utils.pagination_utils import PaginationHelper

jobs_api = Blueprint('jobs_api', __name__)


@jobs_api.route('/jobs', methods=['GET'])
def get_jobs():
    """Get all jobs with pagination and search."""
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

        # Get jobs from service
        result = JobService.get_all_jobs(
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


@jobs_api.route('/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Get job by ID with related data."""
    try:
        job_data = JobService.get_job_by_id(job_id)
        return ResponseFormatter.success(job_data)

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@jobs_api.route('/jobs', methods=['POST'])
def create_job():
    """Create a new job."""
    try:
        data = request.get_json()

        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)

        job = JobService.create_job(data)
        return ResponseFormatter.success(
            job.to_dict(),
            message='Job created successfully',
            status_code=201
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(e.message, error_code=e.error_code)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@jobs_api.route('/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    """Update job information."""
    try:
        data = request.get_json()

        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)

        job = JobService.update_job(job_id, data)
        return ResponseFormatter.success(
            job.to_dict(),
            message='Job updated successfully'
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@jobs_api.route('/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Delete a job."""
    try:
        JobService.delete_job(job_id)
        return ResponseFormatter.success(message='Job deleted successfully')

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@jobs_api.route('/jobs/status/<status>', methods=['GET'])
def get_jobs_by_status(status):
    """Get jobs by status."""
    try:
        jobs = JobService.get_jobs_by_status(status)
        jobs_data = [job.to_dict() for job in jobs]
        return ResponseFormatter.success(jobs_data)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)
