"""
Invoice API Routes
Extracted from monolithic app.py
"""

import os
import sqlite3
from flask import Blueprint, jsonify, request
from models import Invoice, Customer, Job

invoice_bp = Blueprint('invoice', __name__)

@invoice_bp.route('/api/invoices')
def get_invoices():
    """Get all invoices"""
    try:
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT i.id, i.invoice_number, i.job_id, i.customer_id, i.vehicle_id,
                   i.amount, i.vat_amount, i.total_amount, i.status,
                   i.created_date, i.due_date, i.paid_date, i.payment_method, i.notes,
                   c.account_number, c.name as customer_name,
                   j.job_number, j.description as job_description
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            ORDER BY i.id DESC
            LIMIT 100
        ''')

        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'job_id': row[2],
                'customer_id': row[3],
                'vehicle_id': row[4],
                'amount': row[5],
                'vat_amount': row[6],
                'total_amount': row[7],
                'status': row[8],
                'created_date': row[9],
                'due_date': row[10],
                'paid_date': row[11],
                'payment_method': row[12],
                'notes': row[13],
                'customer_account': row[14],
                'customer_name': row[15],
                'job_number': row[16],
                'job_description': row[17]
            })

        conn.close()

        return jsonify({
            'success': True,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@invoice_bp.route('/api/invoices', methods=['POST'])
def create_invoice():
    """Create a new invoice"""
    try:
        data = request.get_json()
        
        invoice = Invoice(
            invoice_number=data.get('invoice_number'),
            job_id=data.get('job_id'),
            customer_id=data.get('customer_id'),
            vehicle_id=data.get('vehicle_id'),
            amount=data.get('amount', 0.0),
            vat_amount=data.get('vat_amount', 0.0),
            total_amount=data.get('total_amount', 0.0),
            status=data.get('status', 'PENDING'),
            due_date=data.get('due_date'),
            payment_method=data.get('payment_method'),
            notes=data.get('notes')
        )
        
        from models import db
        db.session.add(invoice)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'invoice': invoice.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@invoice_bp.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    """Update an existing invoice"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        data = request.get_json()
        
        # Update fields if provided
        if 'invoice_number' in data:
            invoice.invoice_number = data['invoice_number']
        if 'job_id' in data:
            invoice.job_id = data['job_id']
        if 'customer_id' in data:
            invoice.customer_id = data['customer_id']
        if 'vehicle_id' in data:
            invoice.vehicle_id = data['vehicle_id']
        if 'amount' in data:
            invoice.amount = data['amount']
        if 'vat_amount' in data:
            invoice.vat_amount = data['vat_amount']
        if 'total_amount' in data:
            invoice.total_amount = data['total_amount']
        if 'status' in data:
            invoice.status = data['status']
        if 'due_date' in data:
            invoice.due_date = data['due_date']
        if 'paid_date' in data:
            invoice.paid_date = data['paid_date']
        if 'payment_method' in data:
            invoice.payment_method = data['payment_method']
        if 'notes' in data:
            invoice.notes = data['notes']
        
        from models import db
        db.session.commit()
        
        return jsonify({
            'success': True,
            'invoice': invoice.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@invoice_bp.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Delete an invoice"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        from models import db
        db.session.delete(invoice)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Invoice deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
