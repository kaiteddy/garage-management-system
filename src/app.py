#!/usr/bin/env python3
"""
Modular Flask application for the Garage Management System
Clean, organized structure with separated concerns
"""

import os
import sys
from datetime import datetime
from flask import Flask, render_template, send_from_directory, jsonify, request

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

    @app.route('/safari-test.html')
    def safari_test():
        """Safari compatibility test page"""
        return send_from_directory('static', 'safari-test.html')

    @app.route('/minimal-test.html')
    def minimal_test():
        """Minimal Safari test page"""
        return send_from_directory('static', 'minimal-test.html')

    @app.route('/simple-dashboard.html')
    def simple_dashboard():
        """Simple dashboard test page"""
        return send_from_directory('static', 'simple-dashboard.html')

    @app.route('/garage-app-rebuilt.html')
    def garage_app_rebuilt():
        """Rebuilt garage management application"""
        return send_from_directory('static', 'garage-app-rebuilt.html')

    @app.route('/rebuilt')
    def rebuilt_app():
        """Rebuilt garage management application (short URL)"""
        return send_from_directory('static', 'garage-app-rebuilt.html')

    @app.route('/<path:filename>')
    def serve_static_files(filename):
        """Serve static HTML files from static directory"""
        if filename.endswith('.html'):
            return send_from_directory('static', filename)
        else:
            return "File not found", 404

    @app.route('/health')
    def health_check():
        """Health check endpoint for Docker and monitoring"""
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'service': 'garage-management-system',
            'version': '1.0.0'
        }, 200

    # Enhanced API endpoints for customer profiles and documents
    @app.route('/api/customer/<int:customer_id>')
    def get_customer_profile(customer_id):
        """Get comprehensive customer profile with all related data"""
        try:
            import sqlite3
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Get customer details
            cursor.execute('''
                SELECT id, account_number, name, company, address, postcode,
                       phone, mobile, email, created_date
                FROM customers WHERE id = ?
            ''', (customer_id,))

            customer_row = cursor.fetchone()
            if not customer_row:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            customer = {
                'id': customer_row[0],
                'account_number': customer_row[1],
                'name': customer_row[2],
                'company': customer_row[3],
                'address': customer_row[4],
                'postcode': customer_row[5],
                'phone': customer_row[6],
                'mobile': customer_row[7],
                'email': customer_row[8],
                'created_date': customer_row[9]
            }

            # Get customer's vehicles
            cursor.execute('''
                SELECT id, registration, make, model, year, color, engine_size,
                       fuel_type, mot_due, tax_due
                FROM vehicles WHERE customer_id = ?
                ORDER BY registration
            ''', (customer_id,))

            vehicles = []
            for row in cursor.fetchall():
                vehicles.append({
                    'id': row[0],
                    'registration': row[1],
                    'make': row[2],
                    'model': row[3],
                    'year': row[4],
                    'color': row[5],
                    'engine_size': row[6],
                    'fuel_type': row[7],
                    'mot_due': row[8],
                    'tax_due': row[9]
                })

            # Get customer's jobs
            cursor.execute('''
                SELECT j.id, j.job_number, j.description, j.status, j.labour_cost,
                       j.parts_cost, j.total_amount, j.created_date, j.completed_date,
                       v.registration as vehicle_registration
                FROM jobs j
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                WHERE j.customer_id = ?
                ORDER BY j.created_date DESC
            ''', (customer_id,))

            jobs = []
            for row in cursor.fetchall():
                jobs.append({
                    'id': row[0],
                    'job_number': row[1],
                    'description': row[2],
                    'status': row[3],
                    'labour_cost': row[4],
                    'parts_cost': row[5],
                    'total_amount': row[6],
                    'created_date': row[7],
                    'completed_date': row[8],
                    'vehicle_registration': row[9]
                })

            # Get customer's invoices
            cursor.execute('''
                SELECT id, invoice_number, invoice_date, due_date, total_amount,
                       status, payment_status
                FROM invoices WHERE customer_id = ?
                ORDER BY invoice_date DESC
            ''', (customer_id,))

            invoices = []
            for row in cursor.fetchall():
                invoices.append({
                    'id': row[0],
                    'invoice_number': row[1],
                    'invoice_date': row[2],
                    'due_date': row[3],
                    'total_amount': row[4],
                    'status': row[5],
                    'payment_status': row[6]
                })

            conn.close()

            return jsonify({
                'success': True,
                'customer': customer,
                'vehicles': vehicles,
                'jobs': jobs,
                'invoices': invoices
            })

        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/customer/<int:customer_id>/documents')
    def get_customer_documents(customer_id):
        """Get all documents for a specific customer"""
        try:
            import sqlite3
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check if documents table exists, create if not
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    vehicle_id INTEGER,
                    job_id INTEGER,
                    name TEXT NOT NULL,
                    type TEXT,
                    category TEXT,
                    file_path TEXT,
                    size INTEGER,
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id),
                    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                    FOREIGN KEY (job_id) REFERENCES jobs (id)
                )
            ''')

            cursor.execute('''
                SELECT id, name, type, category, file_path, size, created_date
                FROM documents
                WHERE customer_id = ?
                ORDER BY created_date DESC
            ''', (customer_id,))

            documents = []
            for row in cursor.fetchall():
                documents.append({
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'category': row[3],
                    'file_path': row[4],
                    'size': row[5],
                    'created_date': row[6]
                })

            conn.close()

            return jsonify({
                'success': True,
                'documents': documents
            })

        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/vehicles/<registration>')
    def get_vehicle_profile(registration):
        """Get comprehensive vehicle profile with all related data"""
        try:
            import sqlite3
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Get vehicle details
            cursor.execute('''
                SELECT v.id, v.registration, v.make, v.model, v.year, v.color,
                       v.engine_size, v.fuel_type, v.mot_due, v.tax_due, v.customer_id,
                       c.name as customer_name, c.phone, c.email
                FROM vehicles v
                LEFT JOIN customers c ON v.customer_id = c.id
                WHERE v.registration = ?
            ''', (registration,))

            vehicle_row = cursor.fetchone()
            if not vehicle_row:
                return jsonify({'success': False, 'error': 'Vehicle not found'}), 404

            vehicle = {
                'id': vehicle_row[0],
                'registration': vehicle_row[1],
                'make': vehicle_row[2],
                'model': vehicle_row[3],
                'year': vehicle_row[4],
                'color': vehicle_row[5],
                'engine_size': vehicle_row[6],
                'fuel_type': vehicle_row[7],
                'mot_due': vehicle_row[8],
                'tax_due': vehicle_row[9],
                'customer_id': vehicle_row[10]
            }

            customer = {
                'id': vehicle_row[10],
                'name': vehicle_row[11],
                'phone': vehicle_row[12],
                'email': vehicle_row[13]
            }

            # Get vehicle's jobs
            cursor.execute('''
                SELECT id, job_number, description, status, labour_cost,
                       parts_cost, total_amount, created_date, completed_date
                FROM jobs
                WHERE vehicle_id = ?
                ORDER BY created_date DESC
            ''', (vehicle['id'],))

            jobs = []
            for row in cursor.fetchall():
                jobs.append({
                    'id': row[0],
                    'job_number': row[1],
                    'description': row[2],
                    'status': row[3],
                    'labour_cost': row[4],
                    'parts_cost': row[5],
                    'total_amount': row[6],
                    'created_date': row[7],
                    'completed_date': row[8]
                })

            # Get vehicle's invoices
            cursor.execute('''
                SELECT id, invoice_number, invoice_date, due_date, total_amount,
                       status, payment_status
                FROM invoices
                WHERE vehicle_id = ?
                ORDER BY invoice_date DESC
            ''', (vehicle['id'],))

            invoices = []
            for row in cursor.fetchall():
                invoices.append({
                    'id': row[0],
                    'invoice_number': row[1],
                    'invoice_date': row[2],
                    'due_date': row[3],
                    'total_amount': row[4],
                    'status': row[5],
                    'payment_status': row[6]
                })

            conn.close()

            return jsonify({
                'success': True,
                'vehicle': vehicle,
                'customer': customer,
                'jobs': jobs,
                'invoices': invoices
            })

        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500


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
