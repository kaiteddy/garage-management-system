"""
Customer API Routes
Extracted from monolithic app.py
"""

import os
import sqlite3

from flask import Blueprint, jsonify, request

from models import Customer, Invoice, Job, Vehicle

customer_bp = Blueprint('customer', __name__)


@customer_bp.route('/api/customers')
def get_customers():
    """Get all customers"""
    try:
        customers = Customer.query.all()
        return jsonify({
            'success': True,
            'customers': [customer.to_dict() for customer in customers]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@customer_bp.route('/api/customer/<int:customer_id>')
def get_customer(customer_id):
    """Get specific customer details by integer ID"""
    try:
        customer = Customer.query.get_or_404(customer_id)

        # Get customer's vehicles
        vehicles = Vehicle.query.filter_by(customer_id=customer_id).all()

        # Get customer's jobs
        jobs = Job.query.filter_by(customer_id=customer_id).all()

        # Get customer's invoices
        invoices = Invoice.query.filter_by(customer_id=customer_id).all()

        return jsonify({
            'success': True,
            'customer': customer.to_dict(),
            'vehicles': [vehicle.to_dict() for vehicle in vehicles],
            'jobs': [job.to_dict() for job in jobs],
            'invoices': [invoice.to_dict() for invoice in invoices]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@customer_bp.route('/api/customers/<customer_identifier>')
def get_customer_by_identifier(customer_identifier):
    """Get specific customer details by ID or account number"""
    try:
        # Try to find customer by integer ID first
        try:
            customer_id = int(customer_identifier)
            customer = Customer.query.get(customer_id)
        except ValueError:
            # If not an integer, search by account number
            customer = Customer.query.filter_by(
                account_number=customer_identifier).first()

        if not customer:
            return jsonify({
                'success': False,
                'error': 'Customer not found'
            }), 404

        # Get customer's vehicles using direct SQL for better performance
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get vehicles
        cursor.execute('''
            SELECT id, registration, make, model, year, color, fuel_type,
                   mot_expiry, tax_due, mileage, created_at
            FROM vehicles WHERE customer_id = ?
            ORDER BY id DESC
        ''', (customer.id,))

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
                'mot_due': row[7],
                'tax_due': row[8],
                'mileage': row[9],
                'created_at': row[10]
            })

        # Get jobs
        cursor.execute('''
            SELECT id, job_number, description, status, labour_cost, parts_cost,
                   total_amount, created_date, completed_date, notes
            FROM jobs WHERE customer_id = ?
            ORDER BY id DESC
        ''', (customer.id,))

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
            FROM invoices WHERE customer_id = ?
            ORDER BY id DESC
        ''', (customer.id,))

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
            'customer': customer.to_dict(),
            'vehicles': vehicles,
            'jobs': jobs,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@customer_bp.route('/api/customers', methods=['POST'])
def create_customer():
    """Create a new customer"""
    try:
        data = request.get_json()

        customer = Customer(
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            account_number=data.get('account_number')
        )

        from models import db
        db.session.add(customer)
        db.session.commit()

        return jsonify({
            'success': True,
            'customer': customer.to_dict()
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@customer_bp.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Update an existing customer"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()

        # Update fields if provided
        if 'name' in data:
            customer.name = data['name']
        if 'email' in data:
            customer.email = data['email']
        if 'phone' in data:
            customer.phone = data['phone']
        if 'address' in data:
            customer.address = data['address']
        if 'account_number' in data:
            customer.account_number = data['account_number']

        from models import db
        db.session.commit()

        return jsonify({
            'success': True,
            'customer': customer.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@customer_bp.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """Delete a customer"""
    try:
        customer = Customer.query.get_or_404(customer_id)

        from models import db
        db.session.delete(customer)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Customer deleted successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
