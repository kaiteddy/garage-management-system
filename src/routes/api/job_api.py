"""
Job API Routes
Handles all job-related API endpoints
"""

import os
import sqlite3

from flask import Blueprint, jsonify, request

job_api_bp = Blueprint('job_api', __name__)


def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')


@job_api_bp.route('/api/jobs')
def get_jobs():
    """Get all jobs"""
    try:
        # Use direct SQLite query for now
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                   j.status, j.priority, j.assigned_technician, j.estimated_hours, j.actual_hours,
                   j.labour_cost, j.parts_cost, j.total_amount,
                   j.created_date, j.started_date, j.completed_date, j.due_date,
                   j.notes, j.internal_notes, j.customer_authorization, j.bay_number,
                   c.account_number, c.name as customer_name,
                   v.registration, v.make, v.model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            ORDER BY j.created_date DESC, j.priority DESC
            LIMIT 100
        ''')

        jobs = []
        for row in cursor.fetchall():
            jobs.append({
                'id': row[0],
                'job_number': row[1],
                'customer_id': row[2],
                'vehicle_id': row[3],
                'description': row[4],
                'status': row[5],
                'priority': row[6],
                'assigned_technician': row[7],
                'estimated_hours': row[8],
                'actual_hours': row[9],
                'labour_cost': row[10],
                'parts_cost': row[11],
                'total_amount': row[12],
                'created_date': row[13],
                'started_date': row[14],
                'completed_date': row[15],
                'due_date': row[16],
                'notes': row[17],
                'internal_notes': row[18],
                'customer_authorization': bool(row[19]),
                'bay_number': row[20],
                'customer_account': row[21],
                'customer_name': row[22],
                'vehicle_registration': row[23],
                'vehicle_make': row[24],
                'vehicle_model': row[25]
            })

        conn.close()

        return jsonify({
            'success': True,
            'jobs': jobs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@job_api_bp.route('/api/job/<int:job_id>')
def get_job(job_id):
    """Get specific job details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get job details with customer and vehicle info
        cursor.execute('''
            SELECT j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                   j.status, j.priority, j.assigned_technician, j.estimated_hours, j.actual_hours,
                   j.labour_cost, j.parts_cost, j.total_amount,
                   j.created_date, j.started_date, j.completed_date, j.due_date,
                   j.notes, j.internal_notes, j.customer_authorization, j.bay_number,
                   c.account_number, c.name as customer_name, c.phone, c.email,
                   v.registration, v.make, v.model, v.year
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            WHERE j.id = ?
        ''', (job_id,))

        job_row = cursor.fetchone()
        if not job_row:
            return jsonify({
                'success': False,
                'error': 'Job not found'
            }), 404

        job = {
            'id': job_row[0],
            'job_number': job_row[1],
            'customer_id': job_row[2],
            'vehicle_id': job_row[3],
            'description': job_row[4],
            'status': job_row[5],
            'priority': job_row[6],
            'assigned_technician': job_row[7],
            'estimated_hours': job_row[8],
            'actual_hours': job_row[9],
            'labour_cost': job_row[10],
            'parts_cost': job_row[11],
            'total_amount': job_row[12],
            'created_date': job_row[13],
            'started_date': job_row[14],
            'completed_date': job_row[15],
            'due_date': job_row[16],
            'notes': job_row[17],
            'internal_notes': job_row[18],
            'customer_authorization': bool(job_row[19]),
            'bay_number': job_row[20],
            'customer_account': job_row[21],
            'customer_name': job_row[22],
            'customer_phone': job_row[23],
            'customer_email': job_row[24],
            'vehicle_registration': job_row[25],
            'vehicle_make': job_row[26],
            'vehicle_model': job_row[27],
            'vehicle_year': job_row[28]
        }

        conn.close()

        return jsonify({
            'success': True,
            'job': job
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
