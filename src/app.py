#!/usr/bin/env python3
"""
Modular Flask application for the Garage Management System
Clean, organized structure with separated concerns
"""

import os
import sys
from datetime import datetime

from flask import Flask, render_template, send_from_directory

from models import db

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import models and database


def create_app():
    """Application factory pattern"""
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get(
        'SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 100 * \
        1024 * 1024  # 100MB for large file uploads

    # Initialize database
    db.init_app(app)

    # Register blueprints
    register_blueprints(app)

    # Register core routes
    register_core_routes(app)

    # Initialize services
    initialize_services(app)

    return app


def register_blueprints(app):
    """Register all blueprint modules"""
    try:
        # API Blueprints
        from routes.api.appointment_api import appointment_api_bp
        from routes.api.customer_api import customer_api_bp
        from routes.api.dashboard_api import dashboard_api_bp
        from routes.api.invoice_api import invoice_api_bp
        from routes.api.job_api import job_api_bp
        from routes.api.parts_api import parts_api_bp
        from routes.api.quote_api import quote_api_bp
        from routes.api.reports_api import reports_api_bp
        from routes.api.search_api import search_api_bp
        from routes.api.technician_api import technician_api_bp
        from routes.api.vehicle_api import vehicle_api_bp
        from routes.api.workshop_bay_api import workshop_bay_api_bp

        app.register_blueprint(customer_api_bp)
        app.register_blueprint(vehicle_api_bp)
        app.register_blueprint(job_api_bp)
        app.register_blueprint(dashboard_api_bp)
        app.register_blueprint(invoice_api_bp)
        app.register_blueprint(parts_api_bp)
        app.register_blueprint(reports_api_bp)
        app.register_blueprint(search_api_bp)
        app.register_blueprint(technician_api_bp)
        app.register_blueprint(workshop_bay_api_bp)
        app.register_blueprint(appointment_api_bp)
        app.register_blueprint(quote_api_bp)
        print("✅ API blueprints registered successfully")

        # Feature Blueprints
        from routes.audit_routes import audit_bp
        from routes.customer_portal_routes import customer_portal_bp
        from routes.digital_job_sheets_routes import digital_job_sheets_bp
        from routes.enhanced_dvsa_routes import enhanced_dvsa_bp
        from routes.gdpr_routes import gdpr_bp
        from routes.google_drive_routes import google_drive_bp
        from routes.parts_supplier_routes import parts_supplier_bp
        from routes.upload_routes import upload_bp
        from routes.vat_routes import vat_bp
        from routes.workshop_diary_routes import workshop_diary_bp

        app.register_blueprint(upload_bp, url_prefix='/upload')
        app.register_blueprint(google_drive_bp, url_prefix='/google-drive')
        app.register_blueprint(vat_bp)
        app.register_blueprint(gdpr_bp)
        app.register_blueprint(enhanced_dvsa_bp)
        app.register_blueprint(audit_bp)
        app.register_blueprint(workshop_diary_bp)
        app.register_blueprint(digital_job_sheets_bp)
        app.register_blueprint(parts_supplier_bp)
        app.register_blueprint(customer_portal_bp)
        print("✅ Feature blueprints registered successfully")

    except Exception as e:
        print(f"❌ Failed to register blueprints: {e}")


def register_core_routes(app):
    """Register core application routes"""

    @app.route('/')
    def index():
        """Main garage management interface"""
        return send_from_directory('static', 'index.html')

    @app.route('/modern-ui')
    def modern_dashboard():
        """Modern dashboard interface"""
        try:
            return render_template('dashboard/modern.html')
        except:
            return send_from_directory('static', 'index.html')

    @app.route('/booking')
    def online_booking():
        """Online booking interface for customers"""
        try:
            return render_template('online-booking.html')
        except:
            return send_from_directory('static', 'index.html')

    @app.route('/css/<path:filename>')
    def serve_css(filename):
        """Serve CSS files from static/css directory"""
        return send_from_directory('static/css', filename)

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        """Serve JavaScript files from static/js directory"""
        return send_from_directory('static/js', filename)

    @app.route('/components/<path:filename>')
    def serve_components(filename):
        """Serve component files from static/components directory"""
        return send_from_directory('static/components', filename)


def initialize_services(app):
    """Initialize application services"""
    try:
        # Initialize MOT service
        sys.path.append(os.path.join(
            os.path.dirname(os.path.dirname(__file__))))
        from mot_service import IntegratedMOTService

        with app.app_context():
            mot_service = IntegratedMOTService()
            app.mot_service = mot_service
            print("✅ MOT service initialized successfully")

    except Exception as e:
        print(f"❌ Failed to initialize MOT service: {e}")
        app.mot_service = None

    try:
        # Register MOT blueprint
        mot_reminder_path = os.path.join(os.path.dirname(
            os.path.dirname(__file__)), 'mot_reminder')
        sys.path.insert(0, mot_reminder_path)
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "mot_app", os.path.join(mot_reminder_path, "app.py"))
        mot_app_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mot_app_module)

        mot_app_module.init_mot_blueprint(app)
        app.register_blueprint(mot_app_module.mot_bp, url_prefix='/mot')
        print("✅ MOT blueprint registered successfully")
    except Exception as e:
        print(f"❌ Failed to register MOT blueprint: {e}")


def create_tables():
    """Create database tables if they don't exist"""
    try:
        db.create_all()
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"❌ Database initialization error: {e}")


# Create the application instance
app = create_app()

if __name__ == '__main__':
    print("🚀 Starting Modular Garage Management System...")
    print("📊 Main interface: http://127.0.0.1:5001")
    print("🔧 Modular architecture with separated concerns")

    # Create database tables if they don't exist
    with app.app_context():
        create_tables()

    # Run the application
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        threaded=True
    )
