"""
Invoice API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.invoice_service import InvoiceService
from utils.exceptions import GarageManagementError
from utils.response_utils import ResponseFormatter
from utils.pagination_utils import PaginationHelper

invoices_api = Blueprint('invoices_api', __name__)


@invoices_api.route('/invoices', methods=['GET'])
def get_invoices():
    """Get all invoices with pagination and search."""
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

        # Get invoices from service
        result = InvoiceService.get_all_invoices(
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


@invoices_api.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get invoice by ID with related data."""
    try:
        invoice_data = InvoiceService.get_invoice_by_id(invoice_id)
        return ResponseFormatter.success(invoice_data)

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@invoices_api.route('/invoices', methods=['POST'])
def create_invoice():
    """Create a new invoice."""
    try:
        data = request.get_json()

        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)

        invoice = InvoiceService.create_invoice(data)
        return ResponseFormatter.success(
            invoice.to_dict(),
            message='Invoice created successfully',
            status_code=201
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(e.message, error_code=e.error_code)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@invoices_api.route('/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    """Update invoice information."""
    try:
        data = request.get_json()

        if not data:
            return ResponseFormatter.error('No data provided', status_code=400)

        invoice = InvoiceService.update_invoice(invoice_id, data)
        return ResponseFormatter.success(
            invoice.to_dict(),
            message='Invoice updated successfully'
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@invoices_api.route('/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Delete an invoice."""
    try:
        InvoiceService.delete_invoice(invoice_id)
        return ResponseFormatter.success(message='Invoice deleted successfully')

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@invoices_api.route('/invoices/status/<status>', methods=['GET'])
def get_invoices_by_status(status):
    """Get invoices by status."""
    try:
        invoices = InvoiceService.get_invoices_by_status(status)
        invoices_data = [invoice.to_dict() for invoice in invoices]
        return ResponseFormatter.success(invoices_data)

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)


@invoices_api.route('/invoices/<int:invoice_id>/mark-paid', methods=['POST'])
def mark_invoice_as_paid(invoice_id):
    """Mark an invoice as paid."""
    try:
        invoice = InvoiceService.mark_as_paid(invoice_id)
        return ResponseFormatter.success(
            invoice.to_dict(),
            message='Invoice marked as paid successfully'
        )

    except GarageManagementError as e:
        return ResponseFormatter.error(
            e.message,
            error_code=e.error_code,
            status_code=404 if 'not found' in e.message.lower() else 400
        )

    except Exception as e:
        return ResponseFormatter.error(str(e), status_code=500)
