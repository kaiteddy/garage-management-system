"""
Workshop Bay API Routes
Handles workshop bay management endpoints
"""

import os
import sqlite3
from flask import Blueprint, jsonify, request
from datetime import datetime, date

workshop_bay_api_bp = Blueprint('workshop_bay_api', __name__)

def get_db_path():
    """Get database path"""
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')

@workshop_bay_api_bp.route('/api/workshop-bays')
def get_workshop_bays():
    """Get all workshop bays with current occupancy status"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all workshop bays with current occupancy
        cursor.execute('''
            SELECT wb.id, wb.bay_number, wb.bay_name, wb.bay_type, 
                   wb.is_available, wb.equipment, wb.notes,
                   CASE 
                       WHEN a.id IS NOT NULL THEN 1 
                       ELSE 0 
                   END as is_occupied,
                   a.appointment_date, a.start_time, a.end_time,
                   c.name as customer_name,
                   v.registration as vehicle_registration
            FROM workshop_bays wb
            LEFT JOIN appointments a ON wb.id = a.bay_id 
                AND a.appointment_date = ? 
                AND a.status IN ('SCHEDULED', 'IN_PROGRESS')
                AND TIME('now', 'localtime') BETWEEN a.start_time AND a.end_time
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            ORDER BY wb.bay_number
        ''', (date.today(),))
        
        bays = []
        for row in cursor.fetchall():
            bay = {
                'id': row['id'],
                'bay_number': row['bay_number'],
                'bay_name': row['bay_name'],
                'bay_type': row['bay_type'],
                'is_available': bool(row['is_available']),
                'is_occupied': bool(row['is_occupied']),
                'equipment': row['equipment'],
                'notes': row['notes'],
                'current_appointment': {
                    'appointment_date': row['appointment_date'],
                    'start_time': row['start_time'],
                    'end_time': row['end_time'],
                    'customer_name': row['customer_name'],
                    'vehicle_registration': row['vehicle_registration']
                } if row['is_occupied'] else None
            }
            bays.append(bay)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'workshop_bays': bays,
            'total': len(bays),
            'available': len([b for b in bays if b['is_available'] and not b['is_occupied']]),
            'occupied': len([b for b in bays if b['is_occupied']])
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_bay_api_bp.route('/api/workshop-bays/<int:bay_id>')
def get_workshop_bay(bay_id):
    """Get specific workshop bay details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, bay_number, bay_name, bay_type, is_available, equipment, notes
            FROM workshop_bays 
            WHERE id = ?
        ''', (bay_id,))
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Workshop bay not found'
            }), 404
        
        bay = {
            'id': row['id'],
            'bay_number': row['bay_number'],
            'bay_name': row['bay_name'],
            'bay_type': row['bay_type'],
            'is_available': bool(row['is_available']),
            'equipment': row['equipment'],
            'notes': row['notes']
        }
        
        conn.close()
        
        return jsonify({
            'success': True,
            'workshop_bay': bay
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_bay_api_bp.route('/api/workshop-bays', methods=['POST'])
def create_workshop_bay():
    """Create a new workshop bay"""
    try:
        data = request.get_json()
        
        if not data or not data.get('bay_number'):
            return jsonify({
                'success': False,
                'error': 'Bay number is required'
            }), 400
        
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO workshop_bays (bay_number, bay_name, bay_type, is_available, equipment, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['bay_number'],
            data.get('bay_name'),
            data.get('bay_type', 'GENERAL'),
            data.get('is_available', True),
            data.get('equipment'),
            data.get('notes')
        ))
        
        bay_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'bay_id': bay_id,
            'message': 'Workshop bay created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
