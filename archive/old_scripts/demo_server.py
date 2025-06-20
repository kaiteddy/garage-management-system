#!/usr/bin/env python3
"""
Demo server for the Garage Management System Modern GUI
Showcases the beautiful interface without complex dependencies
"""
import json
import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request, send_from_directory

# Create Flask app
app = Flask(__name__,
            template_folder='src/templates',
            static_folder='src/static')
app.config['SECRET_KEY'] = 'demo-secret-key'

# Mock data for demonstration
MOCK_CUSTOMERS = [
    {
        'id': 1,
        'first_name': 'John',
        'last_name': 'Smith',
        'email': 'john.smith@email.com',
        'phone': '07123 456789',
        'company': None,
        'address': '123 Main Street',
        'city': 'London',
        'postcode': 'SW1A 1AA',
        'is_active': True,
        'vehicles_count': 2,
        'total_spent': 2450.00,
        'last_service': '2024-05-15',
        'created_at': '2023-01-15'
    },
    {
        'id': 2,
        'first_name': 'Sarah',
        'last_name': 'Johnson',
        'email': 'sarah.johnson@email.com',
        'phone': '07987 654321',
        'company': 'Johnson Logistics Ltd',
        'address': '456 Business Park',
        'city': 'Manchester',
        'postcode': 'M1 1AA',
        'is_active': True,
        'vehicles_count': 5,
        'total_spent': 8750.00,
        'last_service': '2024-06-01',
        'created_at': '2022-08-20'
    },
    {
        'id': 3,
        'first_name': 'Michael',
        'last_name': 'Brown',
        'email': 'mike.brown@email.com',
        'phone': '07555 123456',
        'company': None,
        'address': '789 Oak Avenue',
        'city': 'Birmingham',
        'postcode': 'B1 1AA',
        'is_active': True,
        'vehicles_count': 1,
        'total_spent': 1200.00,
        'last_service': '2024-04-20',
        'created_at': '2023-03-10'
    }
]

MOCK_DASHBOARD_DATA = {
    'total_revenue': 24580.00,
    'revenue_change': 12.5,
    'active_jobs': 12,
    'urgent_jobs': 3,
    'pending_estimates': 8,
    'estimate_value': 3240.00,
    'outstanding_amount': 1890.00,
    'overdue_count': 2
}

MOCK_CUSTOMER_STATS = {
    'total_customers': len(MOCK_CUSTOMERS),
    'active_customers': 15,
    'new_customers': 3,
    'total_revenue': 45230.00
}

# Routes


@app.route('/')
def index():
    """Main dashboard page."""
    return render_template('dashboard/modern.html')


@app.route('/dashboard')
def dashboard():
    """Dashboard page."""
    return render_template('dashboard/modern.html')


@app.route('/customers')
def customers():
    """Customers page."""
    return render_template('customers/modern.html')


@app.route('/demo')
def demo():
    """Demo page with all components."""
    return send_from_directory('.', 'demo_modern_gui.html')

# API Routes for demo data


@app.route('/api/dashboard/metrics')
def dashboard_metrics():
    """Get dashboard metrics."""
    return jsonify({
        'status': 'success',
        'data': MOCK_DASHBOARD_DATA
    })


@app.route('/api/dashboard/activity')
def dashboard_activity():
    """Get recent activity."""
    mock_activity = [
        {
            'id': 1,
            'type': 'job_completed',
            'title': 'Annual Service Completed',
            'description': 'BMW 320i - AB12 CDE',
            'amount': 250.00,
            'created_at': datetime.now().isoformat()
        },
        {
            'id': 2,
            'type': 'invoice_paid',
            'title': 'Invoice Payment Received',
            'description': 'INV-001 - John Smith',
            'amount': 450.00,
            'created_at': (datetime.now() - timedelta(hours=2)).isoformat()
        },
        {
            'id': 3,
            'type': 'customer_added',
            'title': 'New Customer Added',
            'description': 'Sarah Johnson',
            'created_at': (datetime.now() - timedelta(hours=5)).isoformat()
        }
    ]

    return jsonify({
        'status': 'success',
        'data': mock_activity
    })


@app.route('/api/dashboard/schedule')
def dashboard_schedule():
    """Get today's schedule."""
    mock_schedule = [
        {
            'id': 1,
            'time': '09:00',
            'customer_name': 'John Smith',
            'service_type': 'Annual Service',
            'vehicle_registration': 'AB12 CDE',
            'status': 'scheduled'
        },
        {
            'id': 2,
            'time': '11:30',
            'customer_name': 'Sarah Johnson',
            'service_type': 'Brake Inspection',
            'vehicle_registration': 'XY98 ZAB',
            'status': 'in_progress'
        },
        {
            'id': 3,
            'time': '14:00',
            'customer_name': 'Michael Brown',
            'service_type': 'Oil Change',
            'vehicle_registration': 'CD34 EFG',
            'status': 'scheduled'
        }
    ]

    return jsonify({
        'status': 'success',
        'data': mock_schedule
    })


@app.route('/api/dashboard/upcoming-mots')
def upcoming_mots():
    """Get upcoming MOTs."""
    mock_mots = [
        {
            'id': 1,
            'vehicle_registration': 'AB12 CDE',
            'customer_name': 'John Smith',
            'mot_expiry': '2024-07-15',
            'days_until_expiry': 32
        },
        {
            'id': 2,
            'vehicle_registration': 'XY98 ZAB',
            'customer_name': 'Sarah Johnson',
            'mot_expiry': '2024-06-25',
            'days_until_expiry': 12
        }
    ]

    return jsonify({
        'status': 'success',
        'data': mock_mots
    })


@app.route('/api/dashboard/revenue-chart')
def revenue_chart():
    """Get revenue chart data."""
    days = int(request.args.get('days', 30))

    # Generate mock chart data
    labels = []
    values = []

    for i in range(days):
        date = datetime.now() - timedelta(days=days-i-1)
        labels.append(date.strftime('%Y-%m-%d'))
        # Generate some realistic revenue data
        base_value = 800 + (i * 10)
        variation = (i % 7) * 50  # Weekly pattern
        values.append(base_value + variation)

    return jsonify({
        'status': 'success',
        'data': {
            'labels': labels,
            'values': values
        }
    })


@app.route('/api/customers')
def api_customers():
    """Get customers list."""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 25))
    search = request.args.get('search', '')

    # Filter customers based on search
    filtered_customers = MOCK_CUSTOMERS
    if search:
        search_lower = search.lower()
        filtered_customers = [
            c for c in MOCK_CUSTOMERS
            if search_lower in c['first_name'].lower()
            or search_lower in c['last_name'].lower()
            or search_lower in c['email'].lower()
        ]

    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated_customers = filtered_customers[start:end]

    return jsonify({
        'status': 'success',
        'data': {
            'customers': paginated_customers,
            'total': len(filtered_customers),
            'page': page,
            'per_page': per_page,
            'pages': (len(filtered_customers) + per_page - 1) // per_page
        }
    })


@app.route('/api/customers/stats')
def customers_stats():
    """Get customer statistics."""
    return jsonify({
        'status': 'success',
        'data': MOCK_CUSTOMER_STATS
    })


@app.route('/api/customers/<int:customer_id>')
def customer_detail(customer_id):
    """Get customer details."""
    customer = next(
        (c for c in MOCK_CUSTOMERS if c['id'] == customer_id), None)

    if not customer:
        return jsonify({
            'status': 'error',
            'message': 'Customer not found'
        }), 404

    # Add additional details for the detail view
    customer_detail = customer.copy()
    customer_detail.update({
        'jobs_count': 8,
        'estimates_count': 3,
        'notes': 'Preferred customer - always pays on time. Prefers morning appointments.',
        'updated_at': datetime.now().isoformat()
    })

    return jsonify({
        'status': 'success',
        'data': customer_detail
    })


@app.route('/api/monitoring/health')
def monitoring_health():
    """Get system health status."""
    return jsonify({
        'status': 'success',
        'data': {
            'checks': {
                'database': {
                    'status': 'healthy',
                    'details': {'response_time': 15.2}
                },
                'redis': {
                    'status': 'healthy',
                    'details': {'response_time': 2.1}
                },
                'disk_space': {
                    'status': 'healthy',
                    'details': {'usage': '45%'}
                },
                'memory': {
                    'status': 'warning',
                    'details': {'usage': '78%'}
                }
            }
        }
    })

# Template filters


@app.template_filter('currency')
def currency_filter(value):
    """Format currency."""
    try:
        return f"£{float(value):,.2f}"
    except (ValueError, TypeError):
        return "£0.00"


@app.template_filter('datetime')
def datetime_filter(value, format='%Y-%m-%d %H:%M'):
    """Format datetime."""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return value

    if isinstance(value, datetime):
        return value.strftime(format)

    return value

# Error handlers


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return f"""
    <h1>Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <p><a href="/">Go to Dashboard</a> | <a href="/demo">View Demo</a></p>
    """, 404


if __name__ == '__main__':
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    🚀 GARAGE MANAGEMENT SYSTEM - DEMO SERVER 🚀             ║
    ║                                                              ║
    ║    Modern Professional Interface • Live Demo                 ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝

    🌐 Server starting on: http://localhost:5003
    🎨 Modern Dashboard: http://localhost:5003/
    👥 Customer Management: http://localhost:5003/customers
    🎯 Component Demo: http://localhost:5003/demo

    ✨ Features:
    • Beautiful Modern Interface
    • Responsive Design (Mobile/Tablet/Desktop)
    • Real-time Dashboard with Charts
    • Advanced Customer Management
    • Professional UI Components

    🛑 Press Ctrl+C to stop the server
    """)

    app.run(host='0.0.0.0', port=5003, debug=True)
