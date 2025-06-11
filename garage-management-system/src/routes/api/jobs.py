"""
Job API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from services.database_service import get_db_connection

jobs_api = Blueprint('jobs_api', __name__)


@jobs_api.route('/jobs', methods=['GET'])
def get_jobs():
    """Get all jobs."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT j.*, v.registration, c.name as customer_name, c.company as customer_company,
                   e.estimate_number, e.status as estimate_status
            FROM jobs j
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN estimates e ON j.id = e.job_id
            ORDER BY j.created_date DESC
        ''')
        
        jobs = []
        for row in cursor.fetchall():
            jobs.append({
                'id': row['id'],
                'job_number': row['job_number'],
                'registration': row['registration'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'description': row['description'],
                'status': row['status'],
                'total_amount': row['total_amount'],
                'created_date': row['created_date'],
                'estimate_number': row['estimate_number'],
                'estimate_status': row['estimate_status']
            })
        
        conn.close()
        return jsonify({
            'status': 'success',
            'data': jobs
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@jobs_api.route('/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Get job by ID."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT j.*, v.registration, c.name as customer_name, c.company as customer_company
            FROM jobs j
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE j.id = ?
        ''', (job_id,))
        
        job = cursor.fetchone()
        if not job:
            return jsonify({
                'status': 'error',
                'message': 'Job not found'
            }), 404
        
        job_data = dict(job)
        
        # Get related estimates
        cursor.execute('SELECT * FROM estimates WHERE job_id = ?', (job_id,))
        estimates = [dict(row) for row in cursor.fetchall()]
        
        # Get related invoices
        cursor.execute('SELECT * FROM invoices WHERE job_id = ?', (job_id,))
        invoices = [dict(row) for row in cursor.fetchall()]
        
        job_data['estimates'] = estimates
        job_data['invoices'] = invoices
        
        conn.close()
        return jsonify({
            'status': 'success',
            'data': job_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
