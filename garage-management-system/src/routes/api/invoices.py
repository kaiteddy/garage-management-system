"""
Invoice API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.database_service import get_db_connection

invoices_api = Blueprint('invoices_api', __name__)


@invoices_api.route('/invoices', methods=['GET'])
def get_invoices():
    """Get all invoices."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT i.*, v.registration, c.name as customer_name, c.company as customer_company,
                   j.description as job_description, e.estimate_number
            FROM invoices i
            LEFT JOIN vehicles v ON i.vehicle_id = v.id
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN estimates e ON i.estimate_id = e.id
            ORDER BY i.created_date DESC
        ''')
        
        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row['id'],
                'invoice_number': row['invoice_number'],
                'registration': row['registration'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'job_description': row['job_description'],
                'estimate_number': row['estimate_number'],
                'amount': row['amount'],
                'status': row['status'],
                'created_date': row['created_date']
            })
        
        conn.close()
        return jsonify({
            'status': 'success',
            'data': invoices
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@invoices_api.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get invoice by ID."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT i.*, v.registration, c.name as customer_name, c.company as customer_company,
                   j.description as job_description, e.estimate_number
            FROM invoices i
            LEFT JOIN vehicles v ON i.vehicle_id = v.id
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN estimates e ON i.estimate_id = e.id
            WHERE i.id = ?
        ''', (invoice_id,))
        
        invoice = cursor.fetchone()
        if not invoice:
            return jsonify({
                'status': 'error',
                'message': 'Invoice not found'
            }), 404
        
        invoice_data = dict(invoice)
        
        conn.close()
        return jsonify({
            'status': 'success',
            'data': invoice_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
