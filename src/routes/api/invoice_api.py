"""
Invoice API Routes
Handles all invoice-related API endpoints
"""

import os
import sqlite3
from datetime import datetime

from flask import Blueprint, jsonify

invoice_api_bp = Blueprint('invoice_api', __name__)


def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')


@invoice_api_bp.route('/api/invoices')
def get_invoices():
    """Get all invoices"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT i.id, i.invoice_number, i.customer_id, i.job_id, i.amount, i.vat_amount,
                   i.total_amount, i.status, i.created_date, i.due_date, i.paid_date,
                   i.payment_method, i.notes,
                   c.account_number, c.name as customer_name,
                   j.job_number, j.description as job_description
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            ORDER BY i.created_date DESC
            LIMIT 100
        ''')

        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'customer_id': row[2],
                'job_id': row[3],
                'amount': row[4],
                'vat_amount': row[5],
                'total_amount': row[6],
                'status': row[7],
                'created_date': row[8],
                'due_date': row[9],
                'paid_date': row[10],
                'payment_method': row[11],
                'notes': row[12],
                'customer_account': row[13],
                'customer_name': row[14],
                'job_number': row[15],
                'job_description': row[16]
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


@invoice_api_bp.route('/api/invoice/<int:invoice_id>')
def get_invoice(invoice_id):
    """Get specific invoice details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT i.id, i.invoice_number, i.customer_id, i.job_id, i.amount, i.vat_amount,
                   i.total_amount, i.status, i.created_date, i.due_date, i.paid_date,
                   i.payment_method, i.notes,
                   c.account_number, c.name as customer_name, c.phone, c.email,
                   j.job_number, j.description as job_description
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.id = ?
        ''', (invoice_id,))

        invoice_row = cursor.fetchone()
        if not invoice_row:
            return jsonify({
                'success': False,
                'error': 'Invoice not found'
            }), 404

        invoice = {
            'id': invoice_row[0],
            'invoice_number': invoice_row[1],
            'customer_id': invoice_row[2],
            'job_id': invoice_row[3],
            'amount': invoice_row[4],
            'vat_amount': invoice_row[5],
            'total_amount': invoice_row[6],
            'status': invoice_row[7],
            'created_date': invoice_row[8],
            'due_date': invoice_row[9],
            'paid_date': invoice_row[10],
            'payment_method': invoice_row[11],
            'notes': invoice_row[12],
            'customer_account': invoice_row[13],
            'customer_name': invoice_row[14],
            'customer_phone': invoice_row[15],
            'customer_email': invoice_row[16],
            'job_number': invoice_row[17],
            'job_description': invoice_row[18]
        }

        conn.close()

        return jsonify({
            'success': True,
            'invoice': invoice
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@invoice_api_bp.route('/api/invoices/stats')
def get_invoice_stats():
    """Get invoice statistics"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get invoice counts by status
        cursor.execute('''
            SELECT status, COUNT(*) as count, SUM(total_amount) as total
            FROM invoices
            GROUP BY status
        ''')

        stats = {}
        for row in cursor.fetchall():
            stats[row[0]] = {
                'count': row[1],
                'total': row[2] or 0
            }

        # Get overdue invoices
        cursor.execute('''
            SELECT COUNT(*) as overdue_count, SUM(total_amount) as overdue_total
            FROM invoices
            WHERE status = 'PENDING' AND due_date < date('now')
        ''')

        overdue_row = cursor.fetchone()
        stats['overdue'] = {
            'count': overdue_row[0] or 0,
            'total': overdue_row[1] or 0
        }

        conn.close()

        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
