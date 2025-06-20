"""
Appointment API Routes
Handles appointment management endpoints
"""

import os
import sqlite3
from datetime import date, datetime

from flask import Blueprint, jsonify, request

appointment_api_bp = Blueprint('appointment_api', __name__)


def get_db_path():
    """Get database path"""
    project_root = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')


@appointment_api_bp.route('/api/appointments')
def get_appointments():
    """Get appointments with optional filtering by date range or customer"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        customer_id = request.args.get('customer_id')

        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Build query based on filters
        base_query = '''
            SELECT a.id, a.job_id, a.customer_id, a.vehicle_id, a.technician_id, a.bay_id,
                   a.appointment_date, a.start_time, a.end_time, a.estimated_duration,
                   a.service_type, a.description, a.status, a.priority,
                   a.customer_notified, a.reminder_sent, a.created_date, a.notes,
                   c.name as customer_name, c.phone as customer_phone,
                   v.registration as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model,
                   t.name as technician_name,
                   wb.bay_number, wb.bay_name
            FROM appointments a
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            LEFT JOIN technicians t ON a.technician_id = t.id
            LEFT JOIN workshop_bays wb ON a.bay_id = wb.id
        '''

        conditions = []
        params = []

        if start_date and end_date:
            conditions.append('a.appointment_date BETWEEN ? AND ?')
            params.extend([start_date, end_date])
        elif start_date:
            conditions.append('a.appointment_date >= ?')
            params.append(start_date)
        elif end_date:
            conditions.append('a.appointment_date <= ?')
            params.append(end_date)

        if customer_id:
            conditions.append('a.customer_id = ?')
            params.append(customer_id)

        if conditions:
            base_query += ' WHERE ' + ' AND '.join(conditions)

        base_query += ' ORDER BY a.appointment_date, a.start_time'

        cursor.execute(base_query, params)

        appointments = []
        for row in cursor.fetchall():
            appointment = {
                'id': row['id'],
                'job_id': row['job_id'],
                'customer_id': row['customer_id'],
                'vehicle_id': row['vehicle_id'],
                'technician_id': row['technician_id'],
                'bay_id': row['bay_id'],
                'appointment_date': row['appointment_date'],
                'start_time': row['start_time'],
                'end_time': row['end_time'],
                'estimated_duration': row['estimated_duration'],
                'service_type': row['service_type'],
                'description': row['description'],
                'status': row['status'],
                'priority': row['priority'],
                'customer_notified': bool(row['customer_notified']),
                'reminder_sent': bool(row['reminder_sent']),
                'created_date': row['created_date'],
                'notes': row['notes'],
                'customer': {
                    'name': row['customer_name'],
                    'phone': row['customer_phone']
                } if row['customer_name'] else None,
                'vehicle': {
                    'registration': row['vehicle_registration'],
                    'make': row['vehicle_make'],
                    'model': row['vehicle_model']
                } if row['vehicle_registration'] else None,
                'technician': {
                    'name': row['technician_name']
                } if row['technician_name'] else None,
                'bay': {
                    'bay_number': row['bay_number'],
                    'bay_name': row['bay_name']
                } if row['bay_number'] else None
            }
            appointments.append(appointment)

        conn.close()

        return jsonify({
            'success': True,
            'appointments': appointments,
            'total': len(appointments),
            'filters': {
                'start_date': start_date,
                'end_date': end_date,
                'customer_id': customer_id
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@appointment_api_bp.route('/api/appointments/<int:appointment_id>')
def get_appointment(appointment_id):
    """Get specific appointment details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT a.id, a.job_id, a.customer_id, a.vehicle_id, a.technician_id, a.bay_id,
                   a.appointment_date, a.start_time, a.end_time, a.estimated_duration,
                   a.service_type, a.description, a.status, a.priority,
                   a.customer_notified, a.reminder_sent, a.created_date, a.notes,
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   v.registration as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model,
                   t.name as technician_name, t.phone as technician_phone,
                   wb.bay_number, wb.bay_name
            FROM appointments a
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            LEFT JOIN technicians t ON a.technician_id = t.id
            LEFT JOIN workshop_bays wb ON a.bay_id = wb.id
            WHERE a.id = ?
        ''', (appointment_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Appointment not found'
            }), 404

        appointment = {
            'id': row['id'],
            'job_id': row['job_id'],
            'customer_id': row['customer_id'],
            'vehicle_id': row['vehicle_id'],
            'technician_id': row['technician_id'],
            'bay_id': row['bay_id'],
            'appointment_date': row['appointment_date'],
            'start_time': row['start_time'],
            'end_time': row['end_time'],
            'estimated_duration': row['estimated_duration'],
            'service_type': row['service_type'],
            'description': row['description'],
            'status': row['status'],
            'priority': row['priority'],
            'customer_notified': bool(row['customer_notified']),
            'reminder_sent': bool(row['reminder_sent']),
            'created_date': row['created_date'],
            'notes': row['notes'],
            'customer': {
                'name': row['customer_name'],
                'phone': row['customer_phone'],
                'email': row['customer_email']
            } if row['customer_name'] else None,
            'vehicle': {
                'registration': row['vehicle_registration'],
                'make': row['vehicle_make'],
                'model': row['vehicle_model']
            } if row['vehicle_registration'] else None,
            'technician': {
                'name': row['technician_name'],
                'phone': row['technician_phone']
            } if row['technician_name'] else None,
            'bay': {
                'bay_number': row['bay_number'],
                'bay_name': row['bay_name']
            } if row['bay_number'] else None
        }

        conn.close()

        return jsonify({
            'success': True,
            'appointment': appointment
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
