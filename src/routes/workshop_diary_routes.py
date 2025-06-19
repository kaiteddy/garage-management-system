#!/usr/bin/env python3
"""
Enhanced Workshop Diary API Routes
Professional scheduling system with drag-and-drop, bay allocation, and technician management
"""

import os
import json
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from services.workshop_diary_service import WorkshopDiaryService

workshop_diary_bp = Blueprint('workshop_diary', __name__)

# Initialize workshop diary service
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
diary_service = WorkshopDiaryService(db_path)

@workshop_diary_bp.route('/api/workshop/technicians')
def get_technicians():
    """Get all technicians with their skills and availability"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        technicians = diary_service.get_technicians(active_only)
        
        return jsonify({
            'success': True,
            'technicians': technicians,
            'count': len(technicians)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/bays')
def get_workshop_bays():
    """Get all workshop bays with their specifications"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        bays = diary_service.get_workshop_bays(active_only)
        
        return jsonify({
            'success': True,
            'bays': bays,
            'count': len(bays)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/appointments')
def get_appointments():
    """Get appointments for a specific period"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            # Default to current week
            today = datetime.now()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            start_date = start_of_week.strftime('%Y-%m-%d')
            end_date = end_of_week.strftime('%Y-%m-%d')
        
        appointments = diary_service.get_appointments_for_period(start_date, end_date)
        
        return jsonify({
            'success': True,
            'appointments': appointments,
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'count': len(appointments)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/availability')
def check_availability():
    """Check availability for a specific time slot"""
    try:
        date = request.args.get('date')
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')
        technician_id = request.args.get('technician_id', type=int)
        bay_id = request.args.get('bay_id', type=int)
        
        if not all([date, start_time, end_time]):
            return jsonify({
                'success': False,
                'error': 'Date, start_time, and end_time are required'
            }), 400
        
        availability = diary_service.check_availability(
            date, start_time, end_time, technician_id, bay_id
        )
        
        return jsonify({
            'success': True,
            'availability': availability,
            'date': date,
            'time_slot': {
                'start_time': start_time,
                'end_time': end_time
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/appointments/<int:appointment_id>/move', methods=['POST'])
def move_appointment(appointment_id):
    """Move an appointment to a new time slot (drag and drop)"""
    try:
        data = request.get_json()
        
        required_fields = ['new_date', 'new_start_time']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        result = diary_service.move_appointment(
            appointment_id=appointment_id,
            new_date=data['new_date'],
            new_start_time=data['new_start_time'],
            new_technician_id=data.get('new_technician_id'),
            new_bay_id=data.get('new_bay_id')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/scheduling-suggestions')
def get_scheduling_suggestions():
    """Get optimal scheduling suggestions"""
    try:
        service_type = request.args.get('service_type')
        estimated_duration = request.args.get('estimated_duration', type=int, default=60)
        preferred_date = request.args.get('preferred_date')
        
        if not service_type:
            return jsonify({
                'success': False,
                'error': 'Service type is required'
            }), 400
        
        suggestions = diary_service.get_optimal_scheduling_suggestions(
            service_type, estimated_duration, preferred_date
        )
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'count': len(suggestions),
            'criteria': {
                'service_type': service_type,
                'estimated_duration': estimated_duration,
                'preferred_date': preferred_date
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/service-templates')
def get_service_templates():
    """Get all service templates"""
    try:
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, estimated_duration, required_skills,
                   bay_requirements, default_price, active
            FROM service_templates
            WHERE active = 1
            ORDER BY name
        ''')
        
        templates = []
        for row in cursor.fetchall():
            templates.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'estimated_duration': row[3],
                'required_skills': json.loads(row[4]) if row[4] else [],
                'bay_requirements': json.loads(row[5]) if row[5] else [],
                'default_price': row[6],
                'active': bool(row[7])
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'templates': templates,
            'count': len(templates)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/service-templates', methods=['POST'])
def create_service_template():
    """Create a new service template"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'estimated_duration']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        result = diary_service.create_service_template(
            name=data['name'],
            description=data.get('description', ''),
            estimated_duration=data['estimated_duration'],
            required_skills=data.get('required_skills', []),
            bay_requirements=data.get('bay_requirements', []),
            default_price=data.get('default_price', 0.0)
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/utilization')
def get_workshop_utilization():
    """Get workshop utilization statistics"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            # Default to current week
            today = datetime.now()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            start_date = start_of_week.strftime('%Y-%m-%d')
            end_date = end_of_week.strftime('%Y-%m-%d')
        
        utilization = diary_service.get_workshop_utilization(start_date, end_date)
        
        return jsonify(utilization)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/technicians', methods=['POST'])
def create_technician():
    """Create a new technician"""
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({
                'success': False,
                'error': 'Technician name is required'
            }), 400
        
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO technicians 
            (name, email, phone, skills, hourly_rate, start_time, end_time, lunch_start, lunch_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('email', ''),
            data.get('phone', ''),
            json.dumps(data.get('skills', [])),
            data.get('hourly_rate', 0.0),
            data.get('start_time', '08:00'),
            data.get('end_time', '17:00'),
            data.get('lunch_start', '12:00'),
            data.get('lunch_end', '13:00')
        ))
        
        technician_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'technician_id': technician_id,
            'message': 'Technician created successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/bays', methods=['POST'])
def create_workshop_bay():
    """Create a new workshop bay"""
    try:
        data = request.get_json()
        
        required_fields = ['bay_number', 'bay_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO workshop_bays 
            (bay_number, bay_name, bay_type, equipment, max_vehicle_size, lift_capacity)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['bay_number'],
            data['bay_name'],
            data.get('bay_type', 'GENERAL'),
            json.dumps(data.get('equipment', [])),
            data.get('max_vehicle_size', 'STANDARD'),
            data.get('lift_capacity', 2000)
        ))
        
        bay_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'bay_id': bay_id,
            'message': 'Workshop bay created successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workshop_diary_bp.route('/api/workshop/dashboard')
def get_workshop_dashboard():
    """Get workshop dashboard summary"""
    try:
        # Get today's appointments
        today = datetime.now().strftime('%Y-%m-%d')
        today_appointments = diary_service.get_appointments_for_period(today, today)
        
        # Get this week's utilization
        start_of_week = datetime.now() - timedelta(days=datetime.now().weekday())
        end_of_week = start_of_week + timedelta(days=6)
        utilization = diary_service.get_workshop_utilization(
            start_of_week.strftime('%Y-%m-%d'),
            end_of_week.strftime('%Y-%m-%d')
        )
        
        # Get resource counts
        technicians = diary_service.get_technicians()
        bays = diary_service.get_workshop_bays()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'today': {
                    'date': today,
                    'appointments': today_appointments,
                    'appointment_count': len(today_appointments)
                },
                'resources': {
                    'technician_count': len(technicians),
                    'bay_count': len(bays)
                },
                'utilization': utilization
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
