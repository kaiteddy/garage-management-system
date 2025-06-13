"""
Main routes for the Garage Management System.
Handles page rendering and navigation with modern GUI.
"""
from flask import Blueprint, render_template, request, jsonify, send_from_directory, current_app
from datetime import datetime
import os

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Main dashboard page with modern GUI."""
    return render_template('dashboard/modern.html')


@main_bp.route('/dashboard')
def dashboard():
    """Dashboard page - redirect to modern version."""
    return render_template('dashboard/modern.html')


@main_bp.route('/customers')
def customers():
    """Customers management page with modern GUI."""
    return render_template('customers/modern.html')


@main_bp.route('/vehicles')
def vehicles():
    """Vehicles management page."""
    return render_template('vehicles/index.html')


@main_bp.route('/jobs')
def jobs():
    """Jobs management page."""
    return render_template('jobs/index.html')


@main_bp.route('/estimates')
def estimates():
    """Estimates management page."""
    return render_template('estimates/index.html')


@main_bp.route('/invoices')
def invoices():
    """Invoices management page."""
    return render_template('invoices/index.html')


@main_bp.route('/monitoring')
def monitoring():
    """System monitoring page."""
    return render_template('monitoring.html')


@main_bp.route('/demo')
def demo():
    """Demo page showcasing the modern GUI."""
    return send_from_directory(os.path.join(current_app.root_path, '..'), 'demo_modern_gui.html')


@main_bp.route('/templates/<path:template_name>')
def serve_template(template_name):
    """Serve page templates for backward compatibility."""
    return send_from_directory(os.path.join(current_app.static_folder, 'templates'), template_name)


@main_bp.route('/<path:filename>')
def static_files(filename):
    """Serve static files."""
    return send_from_directory(current_app.static_folder, filename)


@main_bp.route('/search')
def global_search():
    """Global search functionality."""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'results': []})

    # Mock search results - in production, this would search the database
    mock_results = [
        {
            'type': 'customer',
            'id': 1,
            'title': 'John Smith',
            'subtitle': 'john.smith@email.com',
            'url': '/customers/1'
        },
        {
            'type': 'vehicle',
            'id': 1,
            'title': 'BMW 320i - AB12 CDE',
            'subtitle': 'John Smith',
            'url': '/vehicles/1'
        }
    ]

    # Filter results based on query
    filtered_results = [
        result for result in mock_results
        if query.lower() in result['title'].lower()
    ]

    return jsonify({'results': filtered_results[:10]})


@main_bp.route('/notifications')
def notifications():
    """Get user notifications."""
    mock_notifications = [
        {
            'id': 1,
            'type': 'info',
            'title': 'MOT Due Soon',
            'message': 'BMW 320i (AB12 CDE) MOT expires in 7 days',
            'timestamp': datetime.now().isoformat(),
            'read': False
        }
    ]

    return jsonify({'notifications': mock_notifications})


@main_bp.route('/health')
def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'service': 'garage-management-system',
        'version': '2.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }


# Template filters
@main_bp.app_template_filter('currency')
def currency_filter(value):
    """Format currency for templates."""
    try:
        return f"£{float(value):,.2f}"
    except (ValueError, TypeError):
        return f"£0.00"
