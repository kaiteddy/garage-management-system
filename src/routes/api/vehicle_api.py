"""
Vehicle API Routes
Handles all vehicle-related API endpoints
"""

import os
import sqlite3

from flask import Blueprint, jsonify, request

vehicle_api_bp = Blueprint('vehicle_api', __name__)


def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')


@vehicle_api_bp.route('/api/vehicles')
def get_vehicles():
    """Get all vehicles"""
    try:
        # Use direct SQLite query for now
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT v.id, v.registration, v.make, v.model, v.year, v.color, v.fuel_type,
                   v.mot_expiry, v.tax_due, v.mileage, v.customer_id, v.created_at,
                   c.account_number, c.name as customer_name
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            ORDER BY v.id DESC
            LIMIT 100
        ''')

        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'id': row[0],
                'registration': row[1],
                'make': row[2],
                'model': row[3],
                'year': row[4],
                'color': row[5],
                'fuel_type': row[6],
                'mot_expiry': row[7],
                'tax_due': row[8],
                'mileage': row[9],
                'customer_id': row[10],
                'created_at': row[11],
                'customer_account': row[12],
                'customer_name': row[13]
            })

        conn.close()

        return jsonify({
            'success': True,
            'vehicles': vehicles
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vehicle_api_bp.route('/api/vehicle/<int:vehicle_id>')
def get_vehicle(vehicle_id):
    """Get specific vehicle details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get vehicle details with customer info
        cursor.execute('''
            SELECT v.id, v.registration, v.make, v.model, v.year, v.color, v.fuel_type,
                   v.mot_expiry, v.tax_due, v.mileage, v.customer_id, v.created_at,
                   c.account_number, c.name as customer_name, c.phone, c.email
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.id = ?
        ''', (vehicle_id,))

        vehicle_row = cursor.fetchone()
        if not vehicle_row:
            return jsonify({
                'success': False,
                'error': 'Vehicle not found'
            }), 404

        vehicle = {
            'id': vehicle_row[0],
            'registration': vehicle_row[1],
            'make': vehicle_row[2],
            'model': vehicle_row[3],
            'year': vehicle_row[4],
            'color': vehicle_row[5],
            'fuel_type': vehicle_row[6],
            'mot_expiry': vehicle_row[7],
            'tax_due': vehicle_row[8],
            'mileage': vehicle_row[9],
            'customer_id': vehicle_row[10],
            'created_at': vehicle_row[11],
            'customer_account': vehicle_row[12],
            'customer_name': vehicle_row[13],
            'customer_phone': vehicle_row[14],
            'customer_email': vehicle_row[15]
        }

        # Get vehicle's jobs
        cursor.execute('''
            SELECT id, job_number, description, status, labour_cost, parts_cost,
                   total_amount, created_date, completed_date, notes
            FROM jobs WHERE vehicle_id = ?
            ORDER BY id DESC
        ''', (vehicle_id,))

        jobs = []
        for row in cursor.fetchall():
            jobs.append({
                'id': row[0],
                'job_number': row[1],
                'description': row[2],
                'status': row[3],
                'labour_cost': row[4],
                'parts_cost': row[5],
                'total_amount': row[6],
                'created_date': row[7],
                'completed_date': row[8],
                'notes': row[9]
            })

        conn.close()

        return jsonify({
            'success': True,
            'vehicle': vehicle,
            'jobs': jobs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
