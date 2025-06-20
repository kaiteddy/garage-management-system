"""
Online Booking API Routes
For appointment scheduling and availability
"""

import os
import sqlite3
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

booking_bp = Blueprint('booking', __name__)


@booking_bp.route('/api/booking/availability')
def get_availability():
    """Get available booking slots"""
    try:
        date = request.args.get('date')
        service_type = request.args.get('service_type', 'MOT')

        if not date:
            return jsonify({
                'success': False,
                'error': 'Date parameter is required'
            }), 400

        # Parse the date
        try:
            booking_date = datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }), 400

        # Generate mock availability slots
        slots = []
        start_hour = 9  # 9 AM
        end_hour = 17   # 5 PM
        slot_duration = 60  # 60 minutes per slot

        for hour in range(start_hour, end_hour):
            for minute in [0, 30]:  # 30-minute intervals
                if hour == end_hour - 1 and minute == 30:
                    break  # Don't add 4:30 PM slot

                slot_time = booking_date.replace(
                    hour=hour, minute=minute, second=0, microsecond=0)

                # Mock availability - some slots are booked
                is_available = not (hour == 10 and minute == 0) and not (
                    hour == 14 and minute == 30)

                slots.append({
                    'time': slot_time.strftime('%H:%M'),
                    'datetime': slot_time.isoformat(),
                    'available': is_available,
                    'service_type': service_type,
                    'duration': slot_duration
                })

        return jsonify({
            'success': True,
            'date': date,
            'service_type': service_type,
            'slots': slots
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@booking_bp.route('/api/booking/book', methods=['POST'])
def book_appointment():
    """Book an appointment"""
    try:
        data = request.get_json()

        required_fields = ['date', 'time', 'service_type',
                           'customer_name', 'phone', 'registration']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400

        # In a real implementation, you would:
        # 1. Check availability
        # 2. Save to database
        # 3. Send confirmation email/SMS

        # Mock booking confirmation
        booking_id = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return jsonify({
            'success': True,
            'booking_id': booking_id,
            'message': 'Appointment booked successfully',
            'details': {
                'booking_id': booking_id,
                'date': data['date'],
                'time': data['time'],
                'service_type': data['service_type'],
                'customer_name': data['customer_name'],
                'phone': data['phone'],
                'registration': data['registration'],
                'estimated_duration': '60 minutes'
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@booking_bp.route('/api/booking/services')
def get_services():
    """Get available services for booking"""
    try:
        services = [
            {
                'id': 'mot',
                'name': 'MOT Test',
                'duration': 60,
                'price': 54.85,
                'description': 'Annual MOT test for vehicles over 3 years old'
            },
            {
                'id': 'service',
                'name': 'Full Service',
                'duration': 120,
                'price': 150.00,
                'description': 'Comprehensive vehicle service and inspection'
            },
            {
                'id': 'interim_service',
                'name': 'Interim Service',
                'duration': 90,
                'price': 85.00,
                'description': 'Basic service between full services'
            },
            {
                'id': 'diagnostic',
                'name': 'Diagnostic Check',
                'duration': 45,
                'price': 65.00,
                'description': 'Computer diagnostic check for fault codes'
            },
            {
                'id': 'brake_check',
                'name': 'Brake Check',
                'duration': 30,
                'price': 25.00,
                'description': 'Free brake inspection and report'
            }
        ]

        return jsonify({
            'success': True,
            'services': services
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@booking_bp.route('/api/booking/appointments')
def get_appointments():
    """Get existing appointments"""
    try:
        # Return mock appointments for now
        appointments = [
            {
                'id': 1,
                'booking_id': 'BK20250615001',
                'date': '2025-06-17',
                'time': '10:00',
                'service_type': 'MOT',
                'customer_name': 'John Smith',
                'phone': '07123456789',
                'registration': 'AB12 CDE',
                'status': 'confirmed'
            },
            {
                'id': 2,
                'booking_id': 'BK20250615002',
                'date': '2025-06-17',
                'time': '14:30',
                'service_type': 'Service',
                'customer_name': 'Jane Doe',
                'phone': '07987654321',
                'registration': 'XY98 ZAB',
                'status': 'confirmed'
            }
        ]

        return jsonify({
            'success': True,
            'appointments': appointments
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
