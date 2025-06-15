"""
Vehicle API Routes
Extracted from monolithic app.py
"""

import os
import sqlite3
from flask import Blueprint, jsonify, request
from models.vehicle import Vehicle
from models import Job, Invoice

vehicle_bp = Blueprint('vehicle', __name__)

@vehicle_bp.route('/api/vehicles')
def get_vehicles():
    """Get all vehicles"""
    try:
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
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

@vehicle_bp.route('/api/vehicle/<int:vehicle_id>')
def get_vehicle(vehicle_id):
    """Get specific vehicle details by integer ID"""
    try:
        vehicle = Vehicle.query.get_or_404(vehicle_id)

        # Get vehicle's jobs
        jobs = Job.query.filter_by(vehicle_id=vehicle_id).all()

        # Get vehicle's invoices
        invoices = Invoice.query.filter_by(vehicle_id=vehicle_id).all()

        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict(),
            'jobs': [job.to_dict() for job in jobs],
            'invoices': [invoice.to_dict() for invoice in invoices]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vehicle_bp.route('/api/vehicles/<vehicle_identifier>')
def get_vehicle_by_identifier(vehicle_identifier):
    """Get specific vehicle details by ID or registration"""
    try:
        # Try to find vehicle by integer ID first
        try:
            vehicle_id = int(vehicle_identifier)
            vehicle = Vehicle.query.get(vehicle_id)
        except ValueError:
            # If not an integer, search by registration
            vehicle = Vehicle.query.filter_by(registration=vehicle_identifier.upper()).first()

        if not vehicle:
            return jsonify({
                'success': False,
                'error': 'Vehicle not found'
            }), 404

        # Get vehicle's jobs and invoices using direct SQL for better performance
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get jobs
        cursor.execute('''
            SELECT id, job_number, description, status, labour_cost, parts_cost,
                   total_amount, created_date, completed_date, notes
            FROM jobs WHERE vehicle_id = ?
            ORDER BY id DESC
        ''', (vehicle.id,))

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

        # Get invoices
        cursor.execute('''
            SELECT id, invoice_number, amount, vat_amount, total_amount,
                   status, created_date, due_date, paid_date, payment_method, notes
            FROM invoices WHERE vehicle_id = ?
            ORDER BY id DESC
        ''', (vehicle.id,))

        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'amount': row[2],
                'vat_amount': row[3],
                'total_amount': row[4],
                'status': row[5],
                'created_date': row[6],
                'due_date': row[7],
                'paid_date': row[8],
                'payment_method': row[9],
                'notes': row[10]
            })

        conn.close()

        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict(),
            'jobs': jobs,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vehicle_bp.route('/api/vehicles', methods=['POST'])
def create_vehicle():
    """Create a new vehicle"""
    try:
        data = request.get_json()
        
        vehicle = Vehicle(
            registration=data.get('registration', '').upper(),
            make=data.get('make'),
            model=data.get('model'),
            year=data.get('year'),
            color=data.get('color'),
            fuel_type=data.get('fuel_type'),
            mot_expiry=data.get('mot_expiry'),
            tax_due=data.get('tax_due'),
            mileage=data.get('mileage'),
            customer_id=data.get('customer_id')
        )
        
        from models import db
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vehicle_bp.route('/api/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update an existing vehicle"""
    try:
        vehicle = Vehicle.query.get_or_404(vehicle_id)
        data = request.get_json()
        
        # Update fields if provided
        if 'registration' in data:
            vehicle.registration = data['registration'].upper()
        if 'make' in data:
            vehicle.make = data['make']
        if 'model' in data:
            vehicle.model = data['model']
        if 'year' in data:
            vehicle.year = data['year']
        if 'color' in data:
            vehicle.color = data['color']
        if 'fuel_type' in data:
            vehicle.fuel_type = data['fuel_type']
        if 'mot_expiry' in data:
            vehicle.mot_expiry = data['mot_expiry']
        if 'tax_due' in data:
            vehicle.tax_due = data['tax_due']
        if 'mileage' in data:
            vehicle.mileage = data['mileage']
        if 'customer_id' in data:
            vehicle.customer_id = data['customer_id']
        
        from models import db
        db.session.commit()
        
        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vehicle_bp.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """Delete a vehicle"""
    try:
        vehicle = Vehicle.query.get_or_404(vehicle_id)
        
        from models import db
        db.session.delete(vehicle)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vehicle deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
