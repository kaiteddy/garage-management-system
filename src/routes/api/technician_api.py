"""
Technician API Routes
Handles technician management endpoints
"""

import os
import sqlite3
from flask import Blueprint, jsonify, request
from datetime import datetime

technician_api_bp = Blueprint('technician_api', __name__)

def get_db_path():
    """Get database path"""
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')

@technician_api_bp.route('/api/technicians')
def get_technicians():
    """Get all technicians"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all active technicians
        cursor.execute('''
            SELECT id, name, email, phone, specialization, hourly_rate, 
                   is_active, start_time, end_time, created_date
            FROM technicians 
            WHERE is_active = 1
            ORDER BY name
        ''')
        
        technicians = []
        for row in cursor.fetchall():
            technician = {
                'id': row['id'],
                'name': row['name'],
                'email': row['email'],
                'phone': row['phone'],
                'specialization': row['specialization'],
                'hourly_rate': row['hourly_rate'],
                'is_active': bool(row['is_active']),
                'start_time': row['start_time'] or '08:00',
                'end_time': row['end_time'] or '17:00',
                'created_date': row['created_date']
            }
            technicians.append(technician)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'technicians': technicians,
            'total': len(technicians)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@technician_api_bp.route('/api/technicians/<int:technician_id>')
def get_technician(technician_id):
    """Get specific technician details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, email, phone, specialization, hourly_rate, 
                   is_active, start_time, end_time, created_date
            FROM technicians 
            WHERE id = ?
        ''', (technician_id,))
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Technician not found'
            }), 404
        
        technician = {
            'id': row['id'],
            'name': row['name'],
            'email': row['email'],
            'phone': row['phone'],
            'specialization': row['specialization'],
            'hourly_rate': row['hourly_rate'],
            'is_active': bool(row['is_active']),
            'start_time': row['start_time'] or '08:00',
            'end_time': row['end_time'] or '17:00',
            'created_date': row['created_date']
        }
        
        conn.close()
        
        return jsonify({
            'success': True,
            'technician': technician
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@technician_api_bp.route('/api/technicians', methods=['POST'])
def create_technician():
    """Create a new technician"""
    try:
        data = request.get_json()
        
        if not data or not data.get('name'):
            return jsonify({
                'success': False,
                'error': 'Technician name is required'
            }), 400
        
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO technicians (name, email, phone, specialization, hourly_rate, 
                                   is_active, start_time, end_time, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('email'),
            data.get('phone'),
            data.get('specialization'),
            data.get('hourly_rate', 0.0),
            data.get('is_active', True),
            data.get('start_time', '08:00'),
            data.get('end_time', '17:00'),
            datetime.now().date()
        ))
        
        technician_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'technician_id': technician_id,
            'message': 'Technician created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
