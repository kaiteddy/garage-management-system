"""
Estimate API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.database_service import get_db_connection

estimates_api = Blueprint('estimates_api', __name__)


@estimates_api.route('/estimates', methods=['GET'])
def get_estimates():
    """Get all estimates."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT e.*, v.registration, c.name as customer_name, c.company as customer_company,
                   j.job_number, j.description as job_description
            FROM estimates e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN customers c ON e.customer_id = c.id
            LEFT JOIN jobs j ON e.job_id = j.id
            ORDER BY e.created_date DESC
        ''')
        
        estimates = []
        for row in cursor.fetchall():
            estimates.append({
                'id': row['id'],
                'estimate_number': row['estimate_number'],
                'job_number': row['job_number'],
                'registration': row['registration'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'description': row['description'],
                'status': row['status'],
                'total_amount': row['total_amount'],
                'created_date': row['created_date'],
                'valid_until': row['valid_until'],
                'job_description': row['job_description']
            })
        
        conn.close()
        return jsonify({
            'status': 'success',
            'data': estimates
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@estimates_api.route('/estimates/<int:estimate_id>', methods=['GET'])
def get_estimate(estimate_id):
    """Get estimate by ID."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT e.*, v.registration, c.name as customer_name, c.company as customer_company,
                   j.job_number
            FROM estimates e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN customers c ON e.customer_id = c.id
            LEFT JOIN jobs j ON e.job_id = j.id
            WHERE e.id = ?
        ''', (estimate_id,))
        
        estimate = cursor.fetchone()
        if not estimate:
            return jsonify({
                'status': 'error',
                'message': 'Estimate not found'
            }), 404
        
        estimate_data = dict(estimate)
        
        # Get related invoices
        cursor.execute('SELECT * FROM invoices WHERE estimate_id = ?', (estimate_id,))
        invoices = [dict(row) for row in cursor.fetchall()]
        
        estimate_data['invoices'] = invoices
        
        conn.close()
        return jsonify({
            'status': 'success',
            'data': estimate_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
