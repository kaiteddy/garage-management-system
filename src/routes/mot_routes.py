"""
MOT Routes - Integrated MOT Reminder System
Handles all MOT-related API endpoints within the main application
"""

import os
import sqlite3
import sys
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request

# Add the src directory to the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Create MOT blueprint
mot_bp = Blueprint('mot', __name__)

# Database path for unified database
DB_PATH = os.path.join(os.path.dirname(
    os.path.dirname(__file__)), 'garage_management.db')


@mot_bp.route('/')
def mot_dashboard():
    """Main MOT dashboard page - redirect to integrated dashboard"""
    try:
        from flask import redirect

        # Simple redirect to integrated dashboard with MOT hash
        return redirect('/integrated#mot-reminders', code=302)
    except Exception as e:
        print(f"Error redirecting to MOT dashboard: {e}")
        return f"Error loading MOT dashboard: {e}", 500


@mot_bp.route('/upload')
def mot_upload_page():
    """MOT data upload page with Google Drive integration"""
    from flask import send_from_directory
    return send_from_directory('static', 'upload.html')


@mot_bp.route('/sms')
def sms_center():
    """SMS Center page for MOT reminders"""
    try:
        from flask import render_template
        return render_template('sms_centre.html')
    except Exception as e:
        print(f"Error rendering SMS centre: {e}")
        # Fallback to a simple HTML page
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SMS Centre - Garage Management System</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h1><i class="fas fa-sms"></i> SMS Centre</h1>
                <p>SMS functionality is being integrated into the main system.</p>
                <div class="alert alert-info">
                    <strong>Note:</strong> SMS features are available through the integrated dashboard.
                </div>
                <a href="/integrated" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Back to Integrated Dashboard
                </a>
            </div>
        </body>
        </html>
        """, 200


@mot_bp.route('/api/vehicles')
def get_mot_vehicles():
    """Get all MOT vehicles from unified database"""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            # Get vehicles with MOT data and customer information
            # Handle both colour and color columns for compatibility
            cursor.execute('''
                SELECT
                    v.id, v.registration, v.make, v.model,
                    COALESCE(v.year, 0) as year,
                    COALESCE(v.colour, v.color, '') as colour,
                    COALESCE(v.fuel_type, '') as fuel_type,
                    COALESCE(c.first_name, '') as first_name,
                    COALESCE(c.last_name, '') as last_name,
                    COALESCE(c.phone_primary, c.mobile, '') as phone_primary,
                    m.expiry_date, m.test_result,
                    CASE
                        WHEN m.expiry_date < date('now') THEN 'expired'
                        WHEN m.expiry_date <= date('now', '+7 days') THEN 'critical'
                        WHEN m.expiry_date <= date('now', '+30 days') THEN 'due_soon'
                        WHEN m.expiry_date IS NULL THEN 'unknown'
                        ELSE 'valid'
                    END as status,
                    CASE
                        WHEN m.expiry_date IS NOT NULL
                        THEN CAST(julianday(m.expiry_date) - julianday('now') AS INTEGER)
                        ELSE NULL
                    END as days_remaining
                FROM vehicles v
                LEFT JOIN customers c ON v.customer_id = c.id
                LEFT JOIN mot_records m ON v.id = m.vehicle_id AND m.is_current = 1
                WHERE COALESCE(v.is_active, 1) = 1
                ORDER BY
                    CASE
                        WHEN m.expiry_date < date('now') THEN 1
                        WHEN m.expiry_date <= date('now', '+7 days') THEN 2
                        WHEN m.expiry_date <= date('now', '+30 days') THEN 3
                        ELSE 4
                    END,
                    m.expiry_date ASC
            ''')

            rows = cursor.fetchall()
            vehicles = []

            for row in rows:
                vehicle = {
                    'id': row[0],
                    'registration': row[1],
                    'make': row[2] or 'Unknown',
                    'model': row[3] or '',
                    'year': row[4],
                    'colour': row[5],
                    'fuel_type': row[6],
                    'customer_name': f"{row[7] or ''} {row[8] or ''}".strip() or 'Unknown Customer',
                    'mobile': row[9] or '',
                    'mot_expiry': row[10],
                    'test_result': row[11],
                    'status': row[12],
                    'days_remaining': row[13] or 0
                }
                vehicles.append(vehicle)

            # Group vehicles by status
            grouped = {
                'expired': [v for v in vehicles if v['status'] == 'expired'],
                'critical': [v for v in vehicles if v['status'] == 'critical'],
                'due_soon': [v for v in vehicles if v['status'] == 'due_soon'],
                'valid': [v for v in vehicles if v['status'] == 'valid']
            }

            return jsonify({
                'success': True,
                'vehicles': vehicles,
                'grouped': grouped,
                'total_count': len(vehicles),
                'count': len(vehicles),
                'sendable_count': len([v for v in vehicles if v.get('mobile')])
            })

    except Exception as e:
        print(f"Error getting MOT vehicles: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mot_bp.route('/api/vehicles', methods=['POST'])
def add_mot_vehicle():
    """Add a vehicle to MOT monitoring in unified database"""
    try:
        data = request.get_json()
        registration = data.get('registration', '').strip().upper()
        customer_name = data.get('customer_name', '').strip()
        mobile_number = data.get('mobile_number', '').strip()

        if not registration:
            return jsonify({'success': False, 'error': 'Registration required'})

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            # Parse customer name
            names = customer_name.split(' ', 1) if customer_name else [
                'Unknown', '']
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''

            # Create or find customer
            cursor.execute('''
                INSERT OR IGNORE INTO customers (first_name, last_name, phone_primary)
                VALUES (?, ?, ?)
            ''', (first_name, last_name, mobile_number))

            cursor.execute('''
                SELECT id FROM customers
                WHERE first_name = ? AND last_name = ? AND phone_primary = ?
            ''', (first_name, last_name, mobile_number))

            customer_row = cursor.fetchone()
            if not customer_row:
                return jsonify({'success': False, 'error': 'Failed to create customer'})

            customer_id = customer_row[0]

            # Create vehicle
            cursor.execute('''
                INSERT OR IGNORE INTO vehicles (customer_id, registration)
                VALUES (?, ?)
            ''', (customer_id, registration))

            conn.commit()

            return jsonify({
                'success': True,
                'message': f'Vehicle {registration} added successfully',
                'registration': registration
            })

    except Exception as e:
        print(f"Error adding MOT vehicle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mot_bp.route('/api/vehicles/<registration>/history')
def get_vehicle_history(registration):
    """Get MOT history for a specific vehicle from unified database"""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            # Get vehicle and MOT history
            cursor.execute('''
                SELECT
                    v.id, v.registration, v.make, v.model, v.year,
                    c.first_name, c.last_name,
                    m.test_date, m.expiry_date, m.test_result,
                    m.test_number, m.mileage, m.defects, m.advisories
                FROM vehicles v
                LEFT JOIN customers c ON v.customer_id = c.id
                LEFT JOIN mot_records m ON v.id = m.vehicle_id
                WHERE v.registration = ?
                ORDER BY m.test_date DESC
            ''', (registration,))

            rows = cursor.fetchall()

            if not rows:
                return jsonify({
                    'success': False,
                    'error': 'Vehicle not found'
                })

            # Build response
            vehicle_info = {
                'registration': rows[0][1],
                'make': rows[0][2],
                'model': rows[0][3],
                'year': rows[0][4],
                'customer_name': f"{rows[0][5] or ''} {rows[0][6] or ''}".strip()
            }

            mot_tests = []
            for row in rows:
                if row[7]:  # If test_date exists
                    mot_tests.append({
                        'test_date': row[7],
                        'expiry_date': row[8],
                        'test_result': row[9],
                        'test_number': row[10],
                        'mileage': row[11],
                        'defects': row[12],
                        'advisories': row[13]
                    })

            return jsonify({
                'success': True,
                'registration': registration,
                'vehicle_info': vehicle_info,
                'mot_tests': mot_tests,
                'total_tests': len(mot_tests)
            })

    except Exception as e:
        print(f"Error getting vehicle history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mot_bp.route('/api/sms/status')
def get_sms_status():
    """Get SMS service status"""
    try:
        # Return SMS service status
        return jsonify({
            'success': True,
            'sms_service': {
                'status': 'available',
                'provider': 'demo',
                'description': 'SMS service running in demo mode'
            }
        })

    except Exception as e:
        print(f"Error getting SMS status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mot_bp.route('/api/sms/send', methods=['POST'])
def send_mot_sms():
    """Send MOT reminder SMS using unified SMS service"""
    try:
        data = request.get_json()
        registrations = data.get('registrations', [])

        if not registrations:
            return jsonify({'success': False, 'error': 'No vehicles specified'})

        send_results = {
            'success': True,
            'total_requested': len(registrations),
            'sent': 0,
            'failed': 0,
            'skipped': 0,
            'results': [],
            'summary': []
        }

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            for registration in registrations:
                # Get vehicle and customer info
                cursor.execute('''
                    SELECT
                        v.registration, c.first_name, c.last_name, c.phone_primary,
                        m.expiry_date,
                        CAST(julianday(m.expiry_date) - julianday('now') AS INTEGER) as days_remaining
                    FROM vehicles v
                    LEFT JOIN customers c ON v.customer_id = c.id
                    LEFT JOIN mot_records m ON v.id = m.vehicle_id AND m.is_current = 1
                    WHERE v.registration = ?
                ''', (registration,))

                row = cursor.fetchone()

                if not row:
                    send_results['failed'] += 1
                    send_results['results'].append({
                        'registration': registration,
                        'status': 'failed',
                        'error': 'Vehicle not found'
                    })
                    continue

                if not row[3]:  # No phone number
                    send_results['skipped'] += 1
                    send_results['results'].append({
                        'registration': registration,
                        'status': 'skipped',
                        'error': 'No phone number'
                    })
                    continue

                # Use unified SMS service (would be injected in real app)
                customer_name = f"{row[1] or ''} {row[2] or ''}".strip()

                # Simulate SMS sending for now
                send_results['sent'] += 1
                send_results['results'].append({
                    'registration': registration,
                    'status': 'sent',
                    'message': f'MOT reminder sent to {customer_name} (demo mode)'
                })

        send_results['summary'] = [
            f"✅ {send_results['sent']} SMS sent successfully",
            f"❌ {send_results['failed']} failed",
            f"⏭️ {send_results['skipped']} skipped"
        ]

        return jsonify(send_results)

    except Exception as e:
        print(f"Error sending MOT SMS: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mot_bp.route('/health')
def mot_health():
    """MOT service health check"""
    try:
        # Check database connectivity
        database_available = os.path.exists(DB_PATH)

        return jsonify({
            'success': True,
            'service': 'MOT Reminders (Unified)',
            'status': 'healthy',
            'database_available': database_available,
            'unified_system': True
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@mot_bp.route('/api/health')
def mot_api_health():
    """MOT API health check"""
    try:
        # Check database connectivity
        database_available = os.path.exists(DB_PATH)

        return jsonify({
            'success': True,
            'service': 'MOT API (Unified)',
            'status': 'healthy',
            'database_available': database_available,
            'unified_system': True
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
