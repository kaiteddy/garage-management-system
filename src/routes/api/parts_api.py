"""
Parts API Routes
Handles all parts-related API endpoints
"""

import os
import sqlite3
from datetime import datetime
from flask import Blueprint, jsonify

parts_api_bp = Blueprint('parts_api', __name__)

def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')

@parts_api_bp.route('/api/parts')
def get_parts():
    """Get all parts"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if parts table exists, if not create a basic response
        cursor.execute('''
            SELECT name FROM sqlite_master WHERE type='table' AND name='parts'
        ''')
        
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': True,
                'parts': [],
                'message': 'Parts table not yet created. This is a placeholder endpoint.'
            })

        cursor.execute('''
            SELECT id, part_number, name, description, supplier, cost_price, 
                   selling_price, stock_quantity, minimum_stock, location, 
                   created_date, updated_date
            FROM parts
            ORDER BY name
            LIMIT 100
        ''')

        parts = []
        for row in cursor.fetchall():
            parts.append({
                'id': row[0],
                'part_number': row[1],
                'name': row[2],
                'description': row[3],
                'supplier': row[4],
                'cost_price': row[5],
                'selling_price': row[6],
                'stock_quantity': row[7],
                'minimum_stock': row[8],
                'location': row[9],
                'created_date': row[10],
                'updated_date': row[11]
            })

        conn.close()

        return jsonify({
            'success': True,
            'parts': parts
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@parts_api_bp.route('/api/parts/low-stock')
def get_low_stock_parts():
    """Get parts with low stock"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if parts table exists
        cursor.execute('''
            SELECT name FROM sqlite_master WHERE type='table' AND name='parts'
        ''')
        
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': True,
                'parts': [],
                'message': 'Parts table not yet created.'
            })

        cursor.execute('''
            SELECT id, part_number, name, description, supplier, cost_price, 
                   selling_price, stock_quantity, minimum_stock, location
            FROM parts
            WHERE stock_quantity <= minimum_stock
            ORDER BY (stock_quantity - minimum_stock) ASC
        ''')

        parts = []
        for row in cursor.fetchall():
            parts.append({
                'id': row[0],
                'part_number': row[1],
                'name': row[2],
                'description': row[3],
                'supplier': row[4],
                'cost_price': row[5],
                'selling_price': row[6],
                'stock_quantity': row[7],
                'minimum_stock': row[8],
                'location': row[9],
                'stock_status': 'critical' if row[7] == 0 else 'low'
            })

        conn.close()

        return jsonify({
            'success': True,
            'parts': parts
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@parts_api_bp.route('/api/parts/stats')
def get_parts_stats():
    """Get parts statistics"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if parts table exists
        cursor.execute('''
            SELECT name FROM sqlite_master WHERE type='table' AND name='parts'
        ''')
        
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': True,
                'stats': {
                    'total_parts': 0,
                    'low_stock_count': 0,
                    'out_of_stock_count': 0,
                    'total_value': 0
                },
                'message': 'Parts table not yet created.'
            })

        # Get total parts count
        cursor.execute('SELECT COUNT(*) FROM parts')
        total_parts = cursor.fetchone()[0]

        # Get low stock count
        cursor.execute('SELECT COUNT(*) FROM parts WHERE stock_quantity <= minimum_stock')
        low_stock_count = cursor.fetchone()[0]

        # Get out of stock count
        cursor.execute('SELECT COUNT(*) FROM parts WHERE stock_quantity = 0')
        out_of_stock_count = cursor.fetchone()[0]

        # Get total inventory value
        cursor.execute('SELECT SUM(stock_quantity * cost_price) FROM parts')
        total_value = cursor.fetchone()[0] or 0

        conn.close()

        return jsonify({
            'success': True,
            'stats': {
                'total_parts': total_parts,
                'low_stock_count': low_stock_count,
                'out_of_stock_count': out_of_stock_count,
                'total_value': total_value
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
