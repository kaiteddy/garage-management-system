"""
Job API Routes
Extracted from monolithic app.py
"""

import os
import sqlite3
from flask import Blueprint, jsonify, request
from models import Job, Customer, Vehicle

job_bp = Blueprint('job', __name__)

@job_bp.route('/api/jobs')
def get_jobs():
    """Get all jobs"""
    try:
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
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

@job_bp.route('/api/jobs/kanban')
def get_jobs_kanban():
    """Get jobs in kanban format"""
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                   j.status, j.priority, j.assigned_technician, j.estimated_hours,
                   j.labour_cost, j.parts_cost, j.total_amount, j.created_date, j.due_date,
                   c.name as customer_name, v.registration, v.make, v.model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            WHERE j.status IN ('BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'QUALITY_CHECK', 'COMPLETED')
            ORDER BY j.priority DESC, j.created_date ASC
        ''')

        # Group jobs by status with proper structure
        kanban_data = {
            'BOOKED_IN': {'jobs': [], 'count': 0},
            'IN_PROGRESS': {'jobs': [], 'count': 0},
            'AWAITING_PARTS': {'jobs': [], 'count': 0},
            'QUALITY_CHECK': {'jobs': [], 'count': 0},
            'COMPLETED': {'jobs': [], 'count': 0}
        }

        for row in cursor.fetchall():
            job = {
                'id': row[0],
                'job_number': row[1],
                'customer_id': row[2],
                'vehicle_id': row[3],
                'description': row[4],
                'status': row[5],
                'priority': row[6],
                'assigned_technician': row[7],
                'estimated_hours': row[8],
                'labour_cost': row[9],
                'parts_cost': row[10],
                'total_amount': row[11],
                'created_date': row[12],
                'due_date': row[13],
                'customer_name': row[14],
                'vehicle_registration': row[15],
                'vehicle_make': row[16],
                'vehicle_model': row[17]
            }

            status = job['status']
            if status in kanban_data:
                kanban_data[status]['jobs'].append(job)
                kanban_data[status]['count'] += 1

        conn.close()

        return jsonify({
            'success': True,
            'kanban': kanban_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/technicians')
def get_technicians():
    """Get all technicians"""
    try:
        # Return mock data for now since technicians table might not exist
        technicians = [
            {'id': 1, 'name': 'John Smith', 'specialization': 'General Repair'},
            {'id': 2, 'name': 'Mike Johnson', 'specialization': 'MOT Testing'},
            {'id': 3, 'name': 'Sarah Wilson', 'specialization': 'Diagnostics'},
            {'id': 4, 'name': 'David Brown', 'specialization': 'Bodywork'}
        ]
        
        return jsonify({
            'success': True,
            'technicians': technicians
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/workshop-bays')
def get_workshop_bays():
    """Get all workshop bays"""
    try:
        # Return mock data for now
        bays = [
            {'id': 1, 'bay_number': 'Bay 1', 'bay_type': 'GENERAL', 'is_available': True},
            {'id': 2, 'bay_number': 'Bay 2', 'bay_type': 'MOT', 'is_available': False},
            {'id': 3, 'bay_number': 'Bay 3', 'bay_type': 'LIFT', 'is_available': True},
            {'id': 4, 'bay_number': 'Bay 4', 'bay_type': 'DIAGNOSTIC', 'is_available': True}
        ]
        
        return jsonify({
            'success': True,
            'bays': bays
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/appointments')
def get_appointments():
    """Get appointments"""
    try:
        # Return empty appointments for now
        return jsonify({
            'success': True,
            'appointments': []
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/job-sheet-templates')
def get_job_sheet_templates():
    """Get job sheet templates"""
    try:
        # Return mock templates
        templates = [
            {'id': 1, 'name': 'MOT Test', 'service_type': 'MOT'},
            {'id': 2, 'name': 'Annual Service', 'service_type': 'SERVICE'},
            {'id': 3, 'name': 'Brake Repair', 'service_type': 'REPAIR'},
            {'id': 4, 'name': 'Engine Diagnostics', 'service_type': 'DIAGNOSTIC'}
        ]
        
        return jsonify({
            'success': True,
            'templates': templates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/job-sheets')
def get_job_sheets():
    """Get job sheets"""
    try:
        # Return empty job sheets for now
        return jsonify({
            'success': True,
            'job_sheets': []
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/quotes')
def get_quotes():
    """Get quotes"""
    try:
        # Return empty quotes for now
        return jsonify({
            'success': True,
            'quotes': []
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_bp.route('/api/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    """Update job status for kanban board"""
    try:
        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({
                'success': False,
                'error': 'Status is required'
            }), 400

        # Use direct SQLite update for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE jobs
            SET status = ?, updated_date = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_status, job_id))

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Job not found'
            }), 404

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Job status updated successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
