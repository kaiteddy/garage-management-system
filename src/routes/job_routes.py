"""
Job API Routes
Extracted from monolithic app.py
"""

import os
import sqlite3

from flask import Blueprint, jsonify, request

from models import Customer, Job, Vehicle

job_bp = Blueprint('job', __name__)


@job_bp.route('/api/jobs')
def get_jobs():
    """Get all jobs"""
    try:
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
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
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
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

# Technicians endpoint moved to src/routes/api/technician_api.py

# Workshop bays endpoint moved to src/routes/api/workshop_bay_api.py

# Appointments endpoint moved to src/routes/api/appointment_api.py


@job_bp.route('/api/job-sheet-templates')
def get_job_sheet_templates():
    """Get job sheet templates"""
    try:
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, name, service_type, description, default_instructions,
                   default_safety_notes, default_parts, default_tools, default_checks,
                   estimated_time, is_active
            FROM job_sheet_templates
            WHERE is_active = 1
            ORDER BY name
        ''')

        templates = []
        for row in cursor.fetchall():
            templates.append({
                'id': row[0],
                'name': row[1],
                'service_type': row[2],
                'description': row[3],
                'default_instructions': row[4],
                'default_safety_notes': row[5],
                'default_parts': row[6],
                'default_tools': row[7],
                'default_checks': row[8],
                'estimated_time': row[9],
                'is_active': bool(row[10])
            })

        conn.close()

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
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT js.id, js.job_id, js.sheet_number, js.template_id, js.work_instructions,
                   js.safety_notes, js.parts_required, js.tools_required, js.quality_checks,
                   js.technician_signature, js.supervisor_signature, js.customer_signature,
                   js.signed_date, js.completed_date, js.status, js.created_date,
                   j.job_number, j.description as job_description,
                   c.name as customer_name, v.registration as vehicle_registration,
                   t.name as template_name
            FROM job_sheets js
            LEFT JOIN jobs j ON js.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            LEFT JOIN job_sheet_templates t ON js.template_id = t.id
            ORDER BY js.created_date DESC
        ''')

        job_sheets = []
        for row in cursor.fetchall():
            job_sheets.append({
                'id': row[0],
                'job_id': row[1],
                'sheet_number': row[2],
                'template_id': row[3],
                'work_instructions': row[4],
                'safety_notes': row[5],
                'parts_required': row[6],
                'tools_required': row[7],
                'quality_checks': row[8],
                'technician_signature': row[9],
                'supervisor_signature': row[10],
                'customer_signature': row[11],
                'signed_date': row[12],
                'completed_date': row[13],
                'status': row[14],
                'created_date': row[15],
                'job_number': row[16],
                'job_description': row[17],
                'customer_name': row[18],
                'vehicle_registration': row[19],
                'template_name': row[20]
            })

        conn.close()

        return jsonify({
            'success': True,
            'job_sheets': job_sheets
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@job_bp.route('/api/job-sheets', methods=['POST'])
def create_job_sheet():
    """Create a new job sheet"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('job_id'):
            return jsonify({
                'success': False,
                'error': 'Job ID is required'
            }), 400

        # Generate sheet number
        import time
        sheet_number = f"JS-{int(time.time())}"

        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO job_sheets (
                job_id, sheet_number, template_id, work_instructions, safety_notes,
                parts_required, tools_required, quality_checks, status, created_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
        ''', (
            data['job_id'],
            sheet_number,
            data.get('template_id'),
            data.get('work_instructions', ''),
            data.get('safety_notes', ''),
            data.get('parts_required', '[]'),
            data.get('tools_required', '[]'),
            data.get('quality_checks', '[]'),
            data.get('status', 'DRAFT')
        ))

        job_sheet_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'job_sheet_id': job_sheet_id,
            'sheet_number': sheet_number,
            'message': 'Job sheet created successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Quotes endpoint moved to src/routes/api/quote_api.py


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
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
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
