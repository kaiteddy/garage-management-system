"""
Quote API Routes
Handles quote management endpoints
"""

import os
import sqlite3
from datetime import date, datetime

from flask import Blueprint, jsonify, request

quote_api_bp = Blueprint('quote_api', __name__)


def get_db_path():
    """Get database path"""
    project_root = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')


@quote_api_bp.route('/api/quotes')
def get_quotes():
    """Get recent quotes, limited to 50 by default"""
    try:
        limit = request.args.get('limit', 50, type=int)
        customer_id = request.args.get('customer_id')
        status = request.args.get('status')

        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Build query with optional filters
        base_query = '''
            SELECT q.id, q.quote_number, q.customer_id, q.vehicle_id,
                   q.description, q.labour_cost, q.parts_cost, q.total_amount,
                   q.vat_amount, q.status, q.valid_until,
                   q.created_date, q.approved_date, q.notes,
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   v.registration as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN vehicles v ON q.vehicle_id = v.id
        '''

        conditions = []
        params = []

        if customer_id:
            conditions.append('q.customer_id = ?')
            params.append(customer_id)

        if status:
            conditions.append('q.status = ?')
            params.append(status)

        if conditions:
            base_query += ' WHERE ' + ' AND '.join(conditions)

        base_query += ' ORDER BY q.created_date DESC LIMIT ?'
        params.append(limit)

        cursor.execute(base_query, params)

        quotes = []
        for row in cursor.fetchall():
            quote = {
                'id': row['id'],
                'quote_number': row['quote_number'],
                'customer_id': row['customer_id'],
                'vehicle_id': row['vehicle_id'],
                'description': row['description'],
                'labour_cost': row['labour_cost'],
                'parts_cost': row['parts_cost'],
                'total_amount': row['total_amount'],
                'vat_amount': row['vat_amount'],
                # Calculate final total
                'final_total': (row['total_amount'] or 0) + (row['vat_amount'] or 0),
                'status': row['status'],
                'valid_until': row['valid_until'],
                'created_date': row['created_date'],
                'approved_date': row['approved_date'],
                'notes': row['notes'],
                'customer': {
                    'name': row['customer_name'],
                    'phone': row['customer_phone'],
                    'email': row['customer_email']
                } if row['customer_name'] else None,
                'vehicle': {
                    'registration': row['vehicle_registration'],
                    'make': row['vehicle_make'],
                    'model': row['vehicle_model']
                } if row['vehicle_registration'] else None
            }
            quotes.append(quote)

        conn.close()

        return jsonify({
            'success': True,
            'quotes': quotes,
            'total': len(quotes),
            'limit': limit,
            'filters': {
                'customer_id': customer_id,
                'status': status
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@quote_api_bp.route('/api/quotes/<int:quote_id>')
def get_quote(quote_id):
    """Get specific quote details"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT q.id, q.quote_number, q.customer_id, q.vehicle_id,
                   q.description, q.labour_cost, q.parts_cost, q.total_amount,
                   q.vat_amount, q.status, q.valid_until,
                   q.created_date, q.approved_date, q.notes, q.terms_conditions,
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   c.address as customer_address, c.postcode as customer_postcode,
                   v.registration as vehicle_registration, v.make as vehicle_make,
                   v.model as vehicle_model, v.year as vehicle_year
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN vehicles v ON q.vehicle_id = v.id
            WHERE q.id = ?
        ''', (quote_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Quote not found'
            }), 404

        quote = {
            'id': row['id'],
            'quote_number': row['quote_number'],
            'customer_id': row['customer_id'],
            'vehicle_id': row['vehicle_id'],
            'description': row['description'],
            'labour_cost': row['labour_cost'],
            'parts_cost': row['parts_cost'],
            'total_amount': row['total_amount'],
            'vat_amount': row['vat_amount'],
            # Calculate final total
            'final_total': (row['total_amount'] or 0) + (row['vat_amount'] or 0),
            'status': row['status'],
            'valid_until': row['valid_until'],
            'created_date': row['created_date'],
            'approved_date': row['approved_date'],
            'notes': row['notes'],
            'terms_conditions': row['terms_conditions'],
            'customer': {
                'name': row['customer_name'],
                'phone': row['customer_phone'],
                'email': row['customer_email'],
                'address': row['customer_address'],
                'postcode': row['customer_postcode']
            } if row['customer_name'] else None,
            'vehicle': {
                'registration': row['vehicle_registration'],
                'make': row['vehicle_make'],
                'model': row['vehicle_model'],
                'year': row['vehicle_year']
            } if row['vehicle_registration'] else None
        }

        conn.close()

        return jsonify({
            'success': True,
            'quote': quote
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@quote_api_bp.route('/api/quotes', methods=['POST'])
def create_quote():
    """Create a new quote"""
    try:
        data = request.get_json()

        if not data or not data.get('customer_id'):
            return jsonify({
                'success': False,
                'error': 'Customer ID is required'
            }), 400

        # Generate quote number
        quote_number = f"QT{datetime.now().strftime('%Y%m%d')}{datetime.now().microsecond // 1000:03d}"

        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO quotes (quote_number, customer_id, vehicle_id, description,
                              labour_cost, parts_cost, total_amount, vat_amount,
                              status, valid_until, created_date, notes, terms_conditions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            quote_number,
            data['customer_id'],
            data.get('vehicle_id'),
            data.get('description'),
            data.get('labour_cost', 0.0),
            data.get('parts_cost', 0.0),
            data.get('total_amount', 0.0),
            data.get('vat_amount', 0.0),
            data.get('status', 'DRAFT'),
            data.get('valid_until'),
            datetime.now().date(),
            data.get('notes'),
            data.get('terms_conditions')
        ))

        quote_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'quote_id': quote_id,
            'quote_number': quote_number,
            'message': 'Quote created successfully'
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
