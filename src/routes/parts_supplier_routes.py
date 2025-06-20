#!/usr/bin/env python3
"""
Parts Supplier Integration API Routes
Framework for integrating with GSF Car Parts, Euro Car Parts, and other suppliers
"""

import json
import os
from datetime import datetime

from flask import Blueprint, jsonify, request

from services.parts_supplier_service import PartsSupplierService

parts_supplier_bp = Blueprint('parts_supplier', __name__)

# Initialize parts supplier service
db_path = os.path.join(os.path.dirname(os.path.dirname(
    os.path.dirname(__file__))), 'instance', 'garage.db')
parts_service = PartsSupplierService(db_path)


@parts_supplier_bp.route('/api/parts/search')
def search_parts():
    """Search parts across all suppliers"""
    try:
        search_term = request.args.get('search_term')
        vehicle_reg = request.args.get('vehicle_reg')
        supplier = request.args.get('supplier')

        if not search_term:
            return jsonify({
                'success': False,
                'error': 'Search term is required'
            }), 400

        if supplier == 'gsf':
            results = parts_service.search_parts_gsf(search_term, vehicle_reg)
        elif supplier == 'euro':
            results = parts_service.search_parts_euro_car_parts(
                search_term, vehicle_reg)
        else:
            results = parts_service.search_parts_all_suppliers(
                search_term, vehicle_reg)

        # Convert dataclass results to dictionaries
        search_results = []
        for result in results:
            search_results.append({
                'part_number': result.part_number,
                'description': result.description,
                'brand': result.brand,
                'price': result.price,
                'availability': result.availability,
                'supplier': result.supplier,
                'supplier_part_id': result.supplier_part_id,
                'image_url': result.image_url,
                'specifications': result.specifications
            })

        return jsonify({
            'success': True,
            'search_results': search_results,
            'count': len(search_results),
            'search_criteria': {
                'search_term': search_term,
                'vehicle_reg': vehicle_reg,
                'supplier': supplier
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/catalog')
def get_parts_catalog():
    """Get parts from local catalog"""
    try:
        category = request.args.get('category')
        supplier = request.args.get('supplier')

        parts = parts_service.get_parts_catalog(category, supplier)

        return jsonify({
            'success': True,
            'parts': parts,
            'count': len(parts),
            'filters': {
                'category': category,
                'supplier': supplier
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/catalog', methods=['POST'])
def add_part_to_catalog():
    """Add a part to the local catalog"""
    try:
        data = request.get_json()

        required_fields = ['part_number',
                           'description', 'brand', 'price', 'supplier']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        # Create PartSearchResult object
        from services.parts_supplier_service import PartSearchResult

        part_result = PartSearchResult(
            part_number=data['part_number'],
            description=data['description'],
            brand=data['brand'],
            price=data['price'],
            availability=data.get('availability', 'Unknown'),
            supplier=data['supplier'],
            supplier_part_id=data.get('supplier_part_id', ''),
            image_url=data.get('image_url'),
            specifications=data.get('specifications')
        )

        result = parts_service.add_part_to_catalog(
            part_result,
            data.get('markup_percent', 25.0)
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/suppliers')
def get_suppliers():
    """Get configured suppliers"""
    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, name, api_endpoint, active
            FROM supplier_configs
            ORDER BY name
        ''')

        suppliers = []
        for row in cursor.fetchall():
            suppliers.append({
                'id': row[0],
                'name': row[1],
                'api_endpoint': row[2],
                'active': bool(row[3])
            })

        conn.close()

        return jsonify({
            'success': True,
            'suppliers': suppliers,
            'count': len(suppliers)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/suppliers', methods=['POST'])
def add_supplier():
    """Add a new supplier configuration"""
    try:
        data = request.get_json()

        required_fields = ['name', 'api_endpoint', 'api_key']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        result = parts_service.add_supplier_config(
            name=data['name'],
            api_endpoint=data['api_endpoint'],
            api_key=data['api_key'],
            username=data.get('username'),
            password=data.get('password')
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/orders')
def get_parts_orders():
    """Get parts orders with optional filtering"""
    try:
        status = request.args.get('status')
        supplier = request.args.get('supplier')

        orders = parts_service.get_parts_orders(status, supplier)

        return jsonify({
            'success': True,
            'orders': orders,
            'count': len(orders),
            'filters': {
                'status': status,
                'supplier': supplier
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/orders', methods=['POST'])
def create_parts_order():
    """Create a new parts order"""
    try:
        data = request.get_json()

        required_fields = ['supplier_name', 'parts_list']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        if not data['parts_list']:
            return jsonify({
                'success': False,
                'error': 'Parts list cannot be empty'
            }), 400

        result = parts_service.create_parts_order(
            supplier_name=data['supplier_name'],
            parts_list=data['parts_list'],
            job_id=data.get('job_id')
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update parts order status"""
    try:
        data = request.get_json()

        if not data.get('status'):
            return jsonify({
                'success': False,
                'error': 'Status is required'
            }), 400

        result = parts_service.update_order_status(
            order_id=order_id,
            status=data['status'],
            delivery_date=data.get('delivery_date')
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/usage', methods=['POST'])
def record_parts_usage():
    """Record parts usage for a job"""
    try:
        data = request.get_json()

        required_fields = ['job_id', 'parts_used']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        result = parts_service.record_parts_usage(
            job_id=data['job_id'],
            parts_used=data['parts_used'],
            technician=data.get('technician')
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/low-stock')
def get_low_stock_parts():
    """Get parts that are below reorder level"""
    try:
        low_stock_parts = parts_service.get_low_stock_parts()

        return jsonify({
            'success': True,
            'low_stock_parts': low_stock_parts,
            'count': len(low_stock_parts)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/analytics')
def get_parts_analytics():
    """Get parts usage and cost analytics"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        result = parts_service.get_parts_analytics(start_date, end_date)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@parts_supplier_bp.route('/api/parts/dashboard')
def get_parts_dashboard():
    """Get parts management dashboard summary"""
    try:
        # Get low stock parts
        low_stock_parts = parts_service.get_low_stock_parts()

        # Get recent orders
        recent_orders = parts_service.get_parts_orders()[:10]

        # Get analytics for last 30 days
        analytics_result = parts_service.get_parts_analytics()
        analytics = analytics_result.get(
            'analytics', {}) if analytics_result.get('success') else {}

        return jsonify({
            'success': True,
            'dashboard': {
                'low_stock_alert': {
                    'parts': low_stock_parts[:5],  # Top 5 low stock items
                    'count': len(low_stock_parts)
                },
                'recent_orders': recent_orders,
                'analytics_summary': analytics.get('summary', {}),
                'top_suppliers': analytics.get('supplier_spending', [])[:3]
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
