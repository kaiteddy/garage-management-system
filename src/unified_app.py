#!/usr/bin/env python3
"""
Unified Garage Management System
Single integrated application with all functionality consolidated
"""

import logging
import os
import sys

from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from livereload import Server

from routes.mot_routes import mot_bp
from unified_database import UnifiedDatabase

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import core services that exist
try:
    from services.enhanced_dvsa_service import EnhancedDVSAService
except ImportError:
    EnhancedDVSAService = None

try:
    from services.sms_service import UnifiedSMSService
except ImportError:
    UnifiedSMSService = None

# Import core route blueprints that exist
try:
    from routes.dashboard_routes import dashboard_bp
except ImportError:
    dashboard_bp = None

try:
    from routes.customer_routes import customer_bp
except ImportError:
    customer_bp = None

try:
    from routes.vehicle_routes import vehicle_bp
except ImportError:
    vehicle_bp = None

try:
    from routes.upload_routes import upload_bp
except ImportError:
    upload_bp = None

try:
    from routes.feedback_routes import feedback_bp
except ImportError:
    feedback_bp = None

try:
    from routes.google_drive_routes import google_drive_bp
except ImportError:
    google_drive_bp = None

# Import integrated MOT routes

# Import unified database


def create_unified_app():
    """Create the unified Garage Management System application"""
    # Get the absolute path to the src directory
    src_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Configure the Flask app with proper template and static folders
    app = Flask(__name__,
                static_folder=os.path.join(src_dir, 'static'),
                template_folder=os.path.join(src_dir, 'templates'))
    
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    CORS(app)  # Enable CORS for all routes

    # Configure app
    app.config['SECRET_KEY'] = os.environ.get(
        'SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

    # Enable CORS for all routes
    CORS(app)

    # Handle proxy headers if behind reverse proxy
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1,
                            x_proto=1, x_host=1, x_prefix=1)

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("🚀 Initializing Unified Garage Management System...")

    # Initialize core services
    services = {}

    try:
        # Define database path for services
        db_path = os.path.join(os.path.dirname(
            os.path.abspath(__file__)), 'garage_management.db')

        # Initialize only available services
        if EnhancedDVSAService:
            services['dvsa'] = EnhancedDVSAService(db_path)
            print("✅ DVSA service integrated successfully")

        if UnifiedSMSService:
            services['sms'] = UnifiedSMSService(db_path)
            print("✅ SMS service integrated successfully")

        # Initialize unified database
        services['database'] = UnifiedDatabase()
        print("✅ Unified database service integrated successfully")

        print("✅ Core services initialized successfully")

    except Exception as e:
        print(f"⚠️ Warning: Some services failed to initialize: {e}")

    # Store services in app context
    app.services = services

    # Register available blueprints
    print("📋 Registering application blueprints...")

    # Register only available blueprints
    blueprints = [
        (dashboard_bp, '', 'Dashboard'),
        (customer_bp, '', 'Customer'),
        (vehicle_bp, '', 'Vehicle'),
        (upload_bp, '/', 'Upload'),  # Mount at root to handle /upload directly
        (feedback_bp, '', 'Feedback'),
        (google_drive_bp, '', 'Google Drive'),
        (mot_bp, '', 'MOT'),
        # Add other blueprints here as they are created
    ]

    try:
        from routes.unified_api_routes import unified_api_bp
        blueprints.append((unified_api_bp, '', 'Unified API'))
    except ImportError as e:
        print(f"⚠️ Unified API routes not available: {e}")

    registered_count = 0
    for blueprint, prefix, name in blueprints:
        if blueprint:
            try:
                app.register_blueprint(blueprint, url_prefix=prefix)
                print(f"✅ {name} blueprint registered at {prefix}")
                # Debug: Print blueprint routes
                if hasattr(blueprint, 'deferred_functions'):
                    print(
                        f"   Routes: {len(blueprint.deferred_functions)} functions")
                registered_count += 1
            except Exception as e:
                print(f"⚠️ Failed to register {name} blueprint: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"⚠️ {name} blueprint not available")

    print(f"✅ {registered_count} blueprints registered successfully")

    # Main application routes
    @app.route('/')
    def home():
        """Serve the main application interface"""
        return render_template('index.html')

    @app.route('/integrated')
    def integrated_dashboard():
        """Integrated dashboard"""
        return send_from_directory(app.static_folder, 'integrated_dashboard.html')

    @app.route('/templates/<path:filename>')
    def serve_templates(filename):
        """Serve template files"""
        return send_from_directory(app.template_folder, filename)

    @app.route('/static/<path:filename>')
    def serve_static_files(filename):
        """Serve static files"""
        try:
            return send_from_directory(app.static_folder, filename)
        except Exception as e:
            app.logger.error(f"Error serving static file {filename}: {str(e)}")
            return str(e), 404

    @app.route('/settings')
    def settings_page():
        """Settings page with Data Upload tab"""
        return send_from_directory(app.static_folder, 'settings.html')

    @app.route('/health')
    def health_check():
        """Unified health check for all services"""
        health_status = {
            'success': True,
            'application': 'Unified Garage Management System',
            'status': 'healthy',
            'services': {}
        }

        # Check all services
        for service_name, service in app.services.items():
            try:
                if hasattr(service, 'health_check'):
                    health_status['services'][service_name] = service.health_check()
                else:
                    health_status['services'][service_name] = {
                        'status': 'available'}
            except Exception as e:
                health_status['services'][service_name] = {
                    'status': 'error', 'error': str(e)}

        return jsonify(health_status)

    @app.route('/debug/routes')
    def debug_routes():
        """Debug endpoint to list all registered routes"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': rule.rule
            })
        return jsonify({
            'success': True,
            'total_routes': len(routes),
            'routes': sorted(routes, key=lambda x: x['rule'])
        })

    # Static file serving
    @app.route('/css/<path:filename>')
    def css_files(filename):
        return send_from_directory('static/css', filename)

    @app.route('/js/<path:filename>')
    def js_files(filename):
        return send_from_directory('static/js', filename)

    @app.route('/components/<path:filename>')
    def component_files(filename):
        return send_from_directory('static/components', filename)

    @app.route('/assets/<path:filename>')
    def asset_files(filename):
        return send_from_directory('static/assets', filename)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500

    return app


def main():
    """Main entry point for the unified application"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Unified Garage Management System')
    parser.add_argument('--port', type=int, default=5000,
                        help='Port to run the application on')
    parser.add_argument('--host', default='0.0.0.0',
                        help='Host to bind the application to')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug mode')

    args = parser.parse_args()

    # Create the unified application
    app = create_unified_app()

    print(f"🚀 Starting Unified Garage Management System...")
    print(f"📊 Main interface: http://{args.host}:{args.port}")
    print(f"🔧 Integrated dashboard: http://{args.host}:{args.port}/integrated")
    print(f"🚗 MOT system: http://{args.host}:{args.port}/mot")
    print(f"📤 Upload interface: http://{args.host}:{args.port}/upload")
    print(f"✅ All systems unified and ready!")

    # Configure development server with live reload
    if app.debug:
        # Enable template auto-reload
        app.config['TEMPLATES_AUTO_RELOAD'] = True
        
        # Configure livereload server
        server = Server(app.wsgi_app)
        
        # Watch template files for changes
        server.watch('templates/*.html')
        server.watch('static/*.css')
        server.watch('static/*.js')
        
        # Start the server with livereload
        server.serve(host=args.host, port=args.port, debug=True, reloader_type='stat')
    else:
        # Production configuration
        app.run(host=args.host, port=args.port)

if __name__ == '__main__':
    main()
