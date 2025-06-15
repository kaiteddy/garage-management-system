#!/usr/bin/env python3
"""
Modular Flask application for the Garage Management System
Refactored from monolithic app.py
"""

import os
import sys
from flask import Flask, send_from_directory, render_template

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import database and models
from models import db

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Configure for large file uploads
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
    
    # Initialize database
    db.init_app(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register static file routes
    register_static_routes(app)
    
    # Initialize services
    initialize_services(app)
    
    return app

def register_blueprints(app):
    """Register all blueprint modules"""
    try:
        # Dashboard routes
        from routes.dashboard_routes import dashboard_bp
        app.register_blueprint(dashboard_bp)
        print("✅ Dashboard blueprint registered successfully")
        
        # Customer routes
        from routes.customer_routes import customer_bp
        app.register_blueprint(customer_bp)
        print("✅ Customer blueprint registered successfully")
        
        # Vehicle routes
        from routes.vehicle_routes import vehicle_bp
        app.register_blueprint(vehicle_bp)
        print("✅ Vehicle blueprint registered successfully")

        # Job routes
        from routes.job_routes import job_bp
        app.register_blueprint(job_bp)
        print("✅ Job blueprint registered successfully")

        # Invoice routes
        from routes.invoice_routes import invoice_bp
        app.register_blueprint(invoice_bp)
        print("✅ Invoice blueprint registered successfully")

        # Error routes
        from routes.error_routes import error_bp
        app.register_blueprint(error_bp)
        print("✅ Error blueprint registered successfully")

        # Booking routes
        from routes.booking_routes import booking_bp
        app.register_blueprint(booking_bp)
        print("✅ Booking blueprint registered successfully")

        # Upload routes (existing)
        from routes.upload_routes import upload_bp
        app.register_blueprint(upload_bp, url_prefix='/upload')
        print("✅ Upload blueprint registered successfully")
        
        # Google Drive routes (existing)
        from routes.google_drive_routes import google_drive_bp
        app.register_blueprint(google_drive_bp, url_prefix='/google-drive')
        print("✅ Google Drive blueprint registered successfully")
        
    except Exception as e:
        print(f"❌ Failed to register blueprint: {e}")

def register_static_routes(app):
    """Register static file serving routes"""
    
    @app.route('/')
    def index():
        """Main garage management interface"""
        return send_from_directory('static', 'index.html')
    
    @app.route('/modular')
    def modular_index():
        """Modular garage management interface"""
        return send_from_directory('static', 'index_modular.html')
    
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        """Serve CSS files from static/css directory"""
        return send_from_directory('static/css', filename)
    
    @app.route('/js/<path:filename>')
    def serve_js(filename):
        """Serve JavaScript files from static/js directory"""
        return send_from_directory('static/js', filename)
    
    @app.route('/modern')
    def modern_dashboard():
        """Modern dashboard interface"""
        try:
            return render_template('dashboard/modern.html')
        except:
            return send_from_directory('static', 'index_modular.html')

def initialize_services(app):
    """Initialize application services"""
    try:
        # Initialize MOT service
        sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))
        from mot_service import IntegratedMOTService
        
        with app.app_context():
            mot_service = IntegratedMOTService()
            app.mot_service = mot_service
            print("✅ MOT service initialized successfully")
            
    except Exception as e:
        print(f"❌ Failed to initialize MOT service: {e}")
        app.mot_service = None

# Create the application instance
app = create_app()

if __name__ == '__main__':
    print("🚀 Starting Modular Garage Management System...")
    print("📊 Dashboard: http://localhost:5001")
    print("🔧 Modular Interface: http://localhost:5001/modular")
    
    # Create database tables if they don't exist
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created/verified")
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        threaded=True
    )
