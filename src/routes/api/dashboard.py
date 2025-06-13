"""
Dashboard API routes for the Garage Management System.
"""
from flask import Blueprint, jsonify
from models import Customer, Vehicle
from services.database_service import get_db_connection

dashboard_api = Blueprint('dashboard_api', __name__)


@dashboard_api.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics."""
    try:
        # Get basic counts using SQLAlchemy models
        customer_count = Customer.query.count()
        vehicle_count = Vehicle.query.count()
        
        # Get additional stats using raw SQL for legacy tables
        conn = get_db_connection()
        stats = {
            'customers': customer_count,
            'vehicles': vehicle_count,
            'jobs': 0,
            'estimates': 0,
            'invoices': 0,
            'revenue': 0.0
        }
        
        if conn:
            cursor = conn.cursor()
            
            # Get job count
            cursor.execute('SELECT COUNT(*) as count FROM jobs')
            result = cursor.fetchone()
            if result:
                stats['jobs'] = result['count']
            
            # Get estimate count
            cursor.execute('SELECT COUNT(*) as count FROM estimates')
            result = cursor.fetchone()
            if result:
                stats['estimates'] = result['count']
            
            # Get invoice count and revenue
            cursor.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM invoices WHERE status = "paid"')
            result = cursor.fetchone()
            if result:
                stats['invoices'] = result['count']
                stats['revenue'] = float(result['revenue']) if result['revenue'] else 0.0
            
            conn.close()
        
        return jsonify({
            'status': 'success',
            'data': stats
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@dashboard_api.route('/dashboard/recent-activity', methods=['GET'])
def get_recent_activity():
    """Get recent activity for dashboard."""
    try:
        activity = []
        
        # Get recent customers
        recent_customers = Customer.query.order_by(Customer.created_at.desc()).limit(5).all()
        for customer in recent_customers:
            activity.append({
                'type': 'customer',
                'title': f'New customer: {customer.full_name}',
                'date': customer.created_at.isoformat(),
                'id': customer.id
            })
        
        # Get recent vehicles
        recent_vehicles = Vehicle.query.order_by(Vehicle.created_at.desc()).limit(5).all()
        for vehicle in recent_vehicles:
            activity.append({
                'type': 'vehicle',
                'title': f'New vehicle: {vehicle.registration}',
                'date': vehicle.created_at.isoformat(),
                'id': vehicle.id
            })
        
        # Sort by date (most recent first)
        activity.sort(key=lambda x: x['date'], reverse=True)
        
        return jsonify({
            'status': 'success',
            'data': activity[:10]  # Return top 10 most recent
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@dashboard_api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for API."""
    try:
        # Test database connection
        customer_count = Customer.query.count()
        vehicle_count = Vehicle.query.count()
        
        conn = get_db_connection()
        db_status = 'connected' if conn else 'disconnected'
        if conn:
            conn.close()
        
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'customers': customer_count,
            'vehicles': vehicle_count,
            'service': 'garage-management-api',
            'version': '1.0.0'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
