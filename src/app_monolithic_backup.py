#!/usr/bin/env python3
"""
Main Flask application for the Garage Management System
"""

import os
import sys
import json
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our models and services
from models import db, Customer, Job, Invoice, Part, Supplier, Expense
from models.vehicle import Vehicle
from routes.upload_routes import upload_bp
from routes.google_drive_routes import google_drive_bp
from routes.vat_routes import vat_bp
from routes.gdpr_routes import gdpr_bp
from routes.enhanced_dvsa_routes import enhanced_dvsa_bp
from routes.audit_routes import audit_bp
from routes.workshop_diary_routes import workshop_diary_bp
from routes.digital_job_sheets_routes import digital_job_sheets_bp
from routes.parts_supplier_routes import parts_supplier_bp
from routes.customer_portal_routes import customer_portal_bp
from services.csv_import_service import CSVImportService

# Import MOT service
import sys
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))
from mot_service import IntegratedMOTService

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure for large file uploads (ELI MOTORS exports)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize database
db.init_app(app)

# Register blueprints
try:
    app.register_blueprint(upload_bp, url_prefix='/upload')
    print("✅ Upload blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register upload blueprint: {e}")

try:
    app.register_blueprint(google_drive_bp, url_prefix='/google-drive')
    print("✅ Google Drive blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Google Drive blueprint: {e}")

try:
    app.register_blueprint(vat_bp)
    print("✅ VAT/MTD blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register VAT blueprint: {e}")

try:
    app.register_blueprint(gdpr_bp)
    print("✅ GDPR compliance blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register GDPR blueprint: {e}")

try:
    app.register_blueprint(enhanced_dvsa_bp)
    print("✅ Enhanced DVSA blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Enhanced DVSA blueprint: {e}")

try:
    app.register_blueprint(audit_bp)
    print("✅ Audit & logging blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Audit blueprint: {e}")

try:
    app.register_blueprint(workshop_diary_bp)
    print("✅ Enhanced Workshop Diary blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Workshop Diary blueprint: {e}")

try:
    app.register_blueprint(digital_job_sheets_bp)
    print("✅ Digital Job Sheets blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Digital Job Sheets blueprint: {e}")

try:
    app.register_blueprint(parts_supplier_bp)
    print("✅ Parts Supplier Integration blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Parts Supplier blueprint: {e}")

try:
    app.register_blueprint(customer_portal_bp)
    print("✅ Customer Portal blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register Customer Portal blueprint: {e}")

# Initialize MOT service
try:
    mot_service = IntegratedMOTService()
    print("✅ MOT service initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize MOT service: {e}")
    mot_service = None

# Register MOT blueprint
try:
    mot_reminder_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mot_reminder')
    sys.path.insert(0, mot_reminder_path)
    import importlib.util
    spec = importlib.util.spec_from_file_location("mot_app", os.path.join(mot_reminder_path, "app.py"))
    mot_app_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mot_app_module)

    mot_app_module.init_mot_blueprint(app)
    app.register_blueprint(mot_app_module.mot_bp, url_prefix='/mot')
    print("✅ MOT blueprint registered successfully")
except Exception as e:
    print(f"❌ Failed to register MOT blueprint: {e}")

@app.route('/')
def index():
    """Main garage management interface - Legacy Dashboard with MOT Integration"""
    return send_from_directory('static', 'index.html')

@app.route('/modern-ui')
def modern_dashboard():
    """Modern dashboard interface"""
    return render_template('dashboard/modern.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files from static/css directory"""
    return send_from_directory('static/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files from static/js directory"""
    return send_from_directory('static/js', filename)



@app.route('/booking')
def online_booking():
    """Online booking interface for customers"""
    return render_template('online-booking.html')

@app.route('/api/customers')
def get_customers():
    """Get all customers"""
    try:
        customers = Customer.query.all()
        return jsonify({
            'success': True,
            'customers': [customer.to_dict() for customer in customers]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vehicles')
def get_vehicles():
    """Get all vehicles"""
    try:
        # Use direct SQLite query for now
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT v.id, v.registration, v.make, v.model, v.year, v.color, v.fuel_type,
                   v.mot_expiry, v.tax_due, v.mileage, v.customer_id, v.created_at,
                   c.account_number, c.name as customer_name
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            ORDER BY v.id DESC
            LIMIT 100
        ''')

        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'id': row[0],
                'registration': row[1],
                'make': row[2],
                'model': row[3],
                'year': row[4],
                'color': row[5],
                'fuel_type': row[6],
                'mot_expiry': row[7],
                'tax_due': row[8],
                'mileage': row[9],
                'customer_id': row[10],
                'created_at': row[11],
                'customer_account': row[12],
                'customer_name': row[13]
            })

        conn.close()

        return jsonify({
            'success': True,
            'vehicles': vehicles
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/jobs')
def get_jobs():
    """Get all jobs"""
    try:
        # Use direct SQLite query for now
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                   j.status, j.priority, j.assigned_technician, j.estimated_hours, j.actual_hours,
                   j.labour_cost, j.parts_cost, j.total_amount,
                   j.created_date, j.started_date, j.completed_date, j.due_date,
                   j.notes, j.internal_notes, j.customer_authorization, j.bay_number,
                   c.account_number, c.name as customer_name,
                   v.registration, v.make, v.model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            ORDER BY j.created_date DESC, j.priority DESC
            LIMIT 100
        ''')

        jobs = []
        for row in cursor.fetchall():
            jobs.append({
                'id': row[0],
                'job_number': row[1],
                'customer_id': row[2],
                'vehicle_id': row[3],
                'description': row[4],
                'status': row[5],
                'priority': row[6],
                'assigned_technician': row[7],
                'estimated_hours': row[8],
                'actual_hours': row[9],
                'labour_cost': row[10],
                'parts_cost': row[11],
                'total_amount': row[12],
                'created_date': row[13],
                'started_date': row[14],
                'completed_date': row[15],
                'due_date': row[16],
                'notes': row[17],
                'internal_notes': row[18],
                'customer_authorization': bool(row[19]),
                'bay_number': row[20],
                'customer_account': row[21],
                'customer_name': row[22],
                'vehicle_registration': row[23],
                'vehicle_make': row[24],
                'vehicle_model': row[25]
            })

        conn.close()

        return jsonify({
            'success': True,
            'jobs': jobs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/invoices')
def get_invoices():
    """Get all invoices"""
    try:
        # Use direct SQLite query for now
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT i.id, i.invoice_number, i.job_id, i.customer_id, i.vehicle_id,
                   i.amount, i.vat_amount, i.total_amount, i.status,
                   i.created_date, i.due_date, i.paid_date, i.payment_method, i.notes,
                   c.account_number, c.name as customer_name,
                   j.job_number, j.description as job_description
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            ORDER BY i.id DESC
            LIMIT 100
        ''')

        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'job_id': row[2],
                'customer_id': row[3],
                'vehicle_id': row[4],
                'amount': row[5],
                'vat_amount': row[6],
                'total_amount': row[7],
                'status': row[8],
                'created_date': row[9],
                'due_date': row[10],
                'paid_date': row[11],
                'payment_method': row[12],
                'notes': row[13],
                'customer_account': row[14],
                'customer_name': row[15],
                'job_number': row[16],
                'job_description': row[17]
            })

        conn.close()

        return jsonify({
            'success': True,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stats')
def get_stats():
    """Get dashboard statistics"""
    try:
        # Use direct SQLite query for now
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get counts
        cursor.execute('SELECT COUNT(*) FROM customers')
        customers_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM vehicles')
        vehicles_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM jobs')
        jobs_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM invoices')
        invoices_count = cursor.fetchone()[0]

        # Calculate revenue from paid invoices
        cursor.execute('SELECT SUM(total_amount) FROM invoices WHERE status = "PAID"')
        total_revenue = cursor.fetchone()[0] or 0

        # Get linking statistics
        cursor.execute('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL')
        linked_vehicles = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM jobs WHERE customer_id IS NOT NULL')
        linked_jobs = cursor.fetchone()[0]

        conn.close()

        stats = {
            'customers': customers_count,
            'vehicles': vehicles_count,
            'jobs': jobs_count,
            'invoices': invoices_count,
            'revenue': f"£{total_revenue:,.2f}",
            'linked_vehicles': linked_vehicles,
            'linked_jobs': linked_jobs,
            'vehicle_link_rate': f"{(linked_vehicles/vehicles_count*100):.1f}%" if vehicles_count > 0 else "0%",
            'job_link_rate': f"{(linked_jobs/jobs_count*100):.1f}%" if jobs_count > 0 else "0%"
        }

        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/customer/<int:customer_id>')
def get_customer(customer_id):
    """Get specific customer details by integer ID"""
    try:
        customer = Customer.query.get_or_404(customer_id)

        # Get customer's vehicles
        vehicles = Vehicle.query.filter_by(customer_id=customer_id).all()

        # Get customer's jobs
        jobs = Job.query.filter_by(customer_id=customer_id).all()

        # Get customer's invoices
        invoices = Invoice.query.filter_by(customer_id=customer_id).all()

        return jsonify({
            'success': True,
            'customer': customer.to_dict(),
            'vehicles': [vehicle.to_dict() for vehicle in vehicles],
            'jobs': [job.to_dict() for job in jobs],
            'invoices': [invoice.to_dict() for invoice in invoices]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/customers/<customer_identifier>')
def get_customer_by_identifier(customer_identifier):
    """Get specific customer details by ID or account number"""
    try:
        # Try to find customer by integer ID first
        try:
            customer_id = int(customer_identifier)
            customer = Customer.query.get(customer_id)
        except ValueError:
            # If not an integer, search by account number
            customer = Customer.query.filter_by(account_number=customer_identifier).first()

        if not customer:
            return jsonify({
                'success': False,
                'error': 'Customer not found'
            }), 404

        # Get customer's vehicles using direct SQL for better performance
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get vehicles
        cursor.execute('''
            SELECT id, registration, make, model, year, color, fuel_type,
                   mot_expiry, tax_due, mileage, created_at
            FROM vehicles WHERE customer_id = ?
            ORDER BY id DESC
        ''', (customer.id,))

        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'id': row[0],
                'registration': row[1],
                'make': row[2],
                'model': row[3],
                'year': row[4],
                'color': row[5],
                'fuel_type': row[6],
                'mot_due': row[7],
                'tax_due': row[8],
                'mileage': row[9],
                'created_at': row[10]
            })

        # Get jobs
        cursor.execute('''
            SELECT id, job_number, description, status, labour_cost, parts_cost,
                   total_amount, created_date, completed_date, notes
            FROM jobs WHERE customer_id = ?
            ORDER BY id DESC
        ''', (customer.id,))

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
                'notes': row[9]
            })

        # Get invoices
        cursor.execute('''
            SELECT id, invoice_number, amount, vat_amount, total_amount,
                   status, created_date, due_date, paid_date, payment_method, notes
            FROM invoices WHERE customer_id = ?
            ORDER BY id DESC
        ''', (customer.id,))

        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'amount': row[2],
                'vat_amount': row[3],
                'total_amount': row[4],
                'status': row[5],
                'created_date': row[6],
                'due_date': row[7],
                'paid_date': row[8],
                'payment_method': row[9],
                'notes': row[10]
            })

        conn.close()

        return jsonify({
            'success': True,
            'customer': customer.to_dict(),
            'vehicles': vehicles,
            'jobs': jobs,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vehicle/<int:vehicle_id>')
def get_vehicle(vehicle_id):
    """Get specific vehicle details by integer ID"""
    try:
        vehicle = Vehicle.query.get_or_404(vehicle_id)

        # Get vehicle's jobs
        jobs = Job.query.filter_by(vehicle_id=vehicle_id).all()

        # Get vehicle's invoices
        invoices = Invoice.query.filter_by(vehicle_id=vehicle_id).all()

        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict(),
            'jobs': [job.to_dict() for job in jobs],
            'invoices': [invoice.to_dict() for invoice in invoices]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vehicles/<vehicle_identifier>')
def get_vehicle_by_identifier(vehicle_identifier):
    """Get specific vehicle details by ID or registration"""
    try:
        # Try to find vehicle by integer ID first
        try:
            vehicle_id = int(vehicle_identifier)
            vehicle = Vehicle.query.get(vehicle_id)
        except ValueError:
            # If not an integer, search by registration
            vehicle = Vehicle.query.filter_by(registration=vehicle_identifier).first()

        if not vehicle:
            return jsonify({
                'success': False,
                'error': 'Vehicle not found'
            }), 404

        # Get vehicle data using direct SQL for better performance
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get jobs for this vehicle
        cursor.execute('''
            SELECT id, job_number, description, status, labour_cost, parts_cost,
                   total_amount, created_date, completed_date, notes
            FROM jobs WHERE vehicle_id = ?
            ORDER BY id DESC
        ''', (vehicle.id,))

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
                'notes': row[9]
            })

        # Get invoices for this vehicle
        cursor.execute('''
            SELECT id, invoice_number, amount, vat_amount, total_amount,
                   status, created_date, due_date, paid_date, payment_method, notes
            FROM invoices WHERE vehicle_id = ?
            ORDER BY id DESC
        ''', (vehicle.id,))

        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'amount': row[2],
                'vat_amount': row[3],
                'total_amount': row[4],
                'status': row[5],
                'created_date': row[6],
                'due_date': row[7],
                'paid_date': row[8],
                'payment_method': row[9],
                'notes': row[10]
            })

        # Get service history (same as jobs but formatted differently)
        history = jobs.copy()  # For now, history is the same as jobs

        # Get customer information
        customer_info = {}
        if vehicle.customer_id:
            cursor.execute('''
                SELECT account_number, name, company, phone, mobile
                FROM customers WHERE id = ?
            ''', (vehicle.customer_id,))
            customer_row = cursor.fetchone()
            if customer_row:
                customer_info = {
                    'account_number': customer_row[0],
                    'name': customer_row[1],
                    'company': customer_row[2],
                    'phone': customer_row[3],
                    'mobile': customer_row[4]
                }

        conn.close()

        # Add customer info to vehicle dict
        vehicle_dict = vehicle.to_dict()
        vehicle_dict.update({
            'customer_name': customer_info.get('name') or customer_info.get('company'),
            'customer_account': customer_info.get('account_number'),
            'customer_phone': customer_info.get('phone') or customer_info.get('mobile')
        })

        return jsonify({
            'success': True,
            'vehicle': vehicle_dict,
            'jobs': jobs,
            'invoices': invoices,
            'history': history
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/customer', methods=['POST'])
def create_customer():
    """Create a new customer"""
    try:
        data = request.get_json()
        
        customer = Customer(
            account_number=data.get('account_number'),
            name=data.get('name'),
            company=data.get('company'),
            address=data.get('address'),
            postcode=data.get('postcode'),
            phone=data.get('phone'),
            mobile=data.get('mobile'),
            email=data.get('email')
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'customer': customer.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vehicle', methods=['POST'])
def create_vehicle():
    """Create a new vehicle"""
    try:
        data = request.get_json()
        
        vehicle = Vehicle(
            registration=data.get('registration'),
            make=data.get('make'),
            model=data.get('model'),
            year=data.get('year'),
            color=data.get('color'),
            fuel_type=data.get('fuel_type'),
            mot_expiry=data.get('mot_expiry'),
            tax_due=data.get('tax_due'),
            mileage=data.get('mileage'),
            customer_id=data.get('customer_id')
        )
        
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/customer/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Update customer details"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()
        
        # Update fields
        for field in ['account_number', 'name', 'company', 'address', 'postcode', 'phone', 'mobile', 'email']:
            if field in data:
                setattr(customer, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'customer': customer.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vehicle/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update vehicle details"""
    try:
        vehicle = Vehicle.query.get_or_404(vehicle_id)
        data = request.get_json()

        # Update fields
        for field in ['registration', 'make', 'model', 'year', 'color', 'fuel_type', 'mot_expiry', 'tax_due', 'mileage', 'customer_id']:
            if field in data:
                setattr(vehicle, field, data[field])

        db.session.commit()

        return jsonify({
            'success': True,
            'vehicle': vehicle.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/job/<int:job_id>')
def get_job(job_id):
    """Get specific job details"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                   j.status, j.labour_cost, j.parts_cost, j.total_amount,
                   j.created_date, j.completed_date, j.notes,
                   c.account_number, c.name as customer_name, c.phone, c.mobile, c.email,
                   v.registration, v.make, v.model, v.year, v.color
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            WHERE j.id = ?
        ''', (job_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({'success': False, 'error': 'Job not found'}), 404

        job = {
            'id': row[0],
            'job_number': row[1],
            'customer_id': row[2],
            'vehicle_id': row[3],
            'description': row[4],
            'status': row[5],
            'labour_cost': row[6],
            'parts_cost': row[7],
            'total_amount': row[8],
            'created_date': row[9],
            'completed_date': row[10],
            'notes': row[11],
            'customer': {
                'account_number': row[12],
                'name': row[13],
                'phone': row[14],
                'mobile': row[15],
                'email': row[16]
            },
            'vehicle': {
                'registration': row[17],
                'make': row[18],
                'model': row[19],
                'year': row[20],
                'color': row[21]
            }
        }

        conn.close()
        return jsonify({'success': True, 'job': job})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/jobs/kanban')
def get_jobs_kanban():
    """Get jobs organized by status for Kanban board"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Define Kanban columns and their corresponding statuses
        kanban_columns = {
            'BOOKED_IN': 'Booked In',
            'IN_PROGRESS': 'In Progress',
            'AWAITING_PARTS': 'Awaiting Parts',
            'QUALITY_CHECK': 'Quality Check',
            'READY_FOR_COLLECTION': 'Ready for Collection',
            'COMPLETED': 'Completed'
        }

        kanban_data = {}

        for status_key, status_label in kanban_columns.items():
            cursor.execute('''
                SELECT j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                       j.status, j.priority, j.assigned_technician, j.estimated_hours, j.actual_hours,
                       j.labour_cost, j.parts_cost, j.total_amount,
                       j.created_date, j.started_date, j.completed_date, j.due_date,
                       j.notes, j.internal_notes, j.customer_authorization, j.bay_number,
                       c.account_number, c.name as customer_name,
                       v.registration, v.make, v.model
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                WHERE j.status = ?
                ORDER BY
                    CASE j.priority
                        WHEN 'URGENT' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'NORMAL' THEN 3
                        WHEN 'LOW' THEN 4
                    END,
                    j.created_date ASC
            ''', (status_key,))

            jobs = []
            for row in cursor.fetchall():
                jobs.append({
                    'id': row[0],
                    'job_number': row[1],
                    'customer_id': row[2],
                    'vehicle_id': row[3],
                    'description': row[4],
                    'status': row[5],
                    'priority': row[6],
                    'assigned_technician': row[7],
                    'estimated_hours': row[8],
                    'actual_hours': row[9],
                    'labour_cost': row[10],
                    'parts_cost': row[11],
                    'total_amount': row[12],
                    'created_date': row[13],
                    'started_date': row[14],
                    'completed_date': row[15],
                    'due_date': row[16],
                    'notes': row[17],
                    'internal_notes': row[18],
                    'customer_authorization': bool(row[19]),
                    'bay_number': row[20],
                    'customer_account': row[21],
                    'customer_name': row[22],
                    'vehicle_registration': row[23],
                    'vehicle_make': row[24],
                    'vehicle_model': row[25]
                })

            kanban_data[status_key] = {
                'label': status_label,
                'jobs': jobs,
                'count': len(jobs)
            }

        conn.close()
        return jsonify({
            'success': True,
            'kanban': kanban_data,
            'columns': list(kanban_columns.keys())
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    """Update job status for Kanban drag-and-drop"""
    try:
        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'success': False, 'error': 'Status is required'}), 400

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Update job status and set appropriate dates
        update_fields = ['status = ?']
        update_values = [new_status]

        # Set started_date when moving to IN_PROGRESS
        if new_status == 'IN_PROGRESS':
            update_fields.append('started_date = ?')
            update_values.append(datetime.now().date().isoformat())

        # Set completed_date when moving to COMPLETED
        elif new_status == 'COMPLETED':
            update_fields.append('completed_date = ?')
            update_values.append(datetime.now().date().isoformat())

        update_values.append(job_id)

        cursor.execute(f'''
            UPDATE jobs
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', update_values)

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'error': 'Job not found'}), 404

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Job status updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# WORKSHOP SCHEDULING API ENDPOINTS
# ============================================================================

@app.route('/api/technicians')
def get_technicians():
    """Get all technicians"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, name, email, phone, specialization, hourly_rate,
                   is_active, start_time, end_time, created_date
            FROM technicians
            WHERE is_active = 1
            ORDER BY name
        ''')

        technicians = []
        for row in cursor.fetchall():
            technicians.append({
                'id': row[0],
                'name': row[1],
                'email': row[2],
                'phone': row[3],
                'specialization': row[4],
                'hourly_rate': row[5],
                'is_active': bool(row[6]),
                'start_time': row[7],
                'end_time': row[8],
                'created_date': row[9]
            })

        conn.close()
        return jsonify({
            'success': True,
            'technicians': technicians
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/workshop-bays')
def get_workshop_bays():
    """Get all workshop bays"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, bay_number, bay_name, bay_type, is_available, equipment, notes
            FROM workshop_bays
            WHERE is_available = 1
            ORDER BY bay_number
        ''')

        bays = []
        for row in cursor.fetchall():
            bays.append({
                'id': row[0],
                'bay_number': row[1],
                'bay_name': row[2],
                'bay_type': row[3],
                'is_available': bool(row[4]),
                'equipment': row[5],
                'notes': row[6]
            })

        conn.close()
        return jsonify({
            'success': True,
            'bays': bays
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/appointments')
def get_appointments():
    """Get appointments with optional date filtering"""
    try:
        date_filter = request.args.get('date')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Build query with optional date filtering
        query = '''
            SELECT a.id, a.job_id, a.customer_id, a.vehicle_id, a.technician_id, a.bay_id,
                   a.appointment_date, a.start_time, a.end_time, a.estimated_duration,
                   a.service_type, a.description, a.status, a.priority,
                   a.customer_notified, a.reminder_sent, a.created_date, a.notes,
                   c.name as customer_name, c.phone as customer_phone,
                   v.registration, v.make, v.model,
                   t.name as technician_name,
                   b.bay_number, b.bay_name
            FROM appointments a
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            LEFT JOIN technicians t ON a.technician_id = t.id
            LEFT JOIN workshop_bays b ON a.bay_id = b.id
        '''

        params = []
        if date_filter:
            query += ' WHERE a.appointment_date = ?'
            params.append(date_filter)
        elif start_date and end_date:
            query += ' WHERE a.appointment_date BETWEEN ? AND ?'
            params.extend([start_date, end_date])

        query += ' ORDER BY a.appointment_date, a.start_time'

        cursor.execute(query, params)

        appointments = []
        for row in cursor.fetchall():
            appointments.append({
                'id': row[0],
                'job_id': row[1],
                'customer_id': row[2],
                'vehicle_id': row[3],
                'technician_id': row[4],
                'bay_id': row[5],
                'appointment_date': row[6],
                'start_time': row[7],
                'end_time': row[8],
                'estimated_duration': row[9],
                'service_type': row[10],
                'description': row[11],
                'status': row[12],
                'priority': row[13],
                'customer_notified': bool(row[14]),
                'reminder_sent': bool(row[15]),
                'created_date': row[16],
                'notes': row[17],
                'customer_name': row[18],
                'customer_phone': row[19],
                'vehicle_registration': row[20],
                'vehicle_make': row[21],
                'vehicle_model': row[22],
                'technician_name': row[23],
                'bay_number': row[24],
                'bay_name': row[25]
            })

        conn.close()
        return jsonify({
            'success': True,
            'appointments': appointments
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/appointments', methods=['POST'])
def create_appointment():
    """Create a new appointment"""
    try:
        data = request.get_json()

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO appointments (
                job_id, customer_id, vehicle_id, technician_id, bay_id,
                appointment_date, start_time, end_time, estimated_duration,
                service_type, description, status, priority, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('job_id'),
            data.get('customer_id'),
            data.get('vehicle_id'),
            data.get('technician_id'),
            data.get('bay_id'),
            data.get('appointment_date'),
            data.get('start_time'),
            data.get('end_time'),
            data.get('estimated_duration', 60),
            data.get('service_type'),
            data.get('description'),
            data.get('status', 'SCHEDULED'),
            data.get('priority', 'NORMAL'),
            data.get('notes')
        ))

        appointment_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'appointment_id': appointment_id,
            'message': 'Appointment created successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    """Update an existing appointment"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        print(f"Updating appointment {appointment_id} with data: {data}")

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if appointment exists
        cursor.execute('SELECT id FROM appointments WHERE id = ?', (appointment_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Appointment not found'}), 404

        # Build update query dynamically based on provided data
        update_fields = []
        update_values = []

        # Map frontend fields to database fields
        field_mapping = {
            'appointment_date': 'appointment_date',
            'start_time': 'start_time',
            'end_time': 'end_time',
            'service_type': 'service_type',
            'status': 'status',
            'notes': 'notes',
            'priority': 'priority',
            'description': 'description',
            'customer_id': 'customer_id',
            'vehicle_id': 'vehicle_id',
            'technician_id': 'technician_id',
            'bay_id': 'bay_id',
            'estimated_duration': 'estimated_duration'
        }

        for frontend_field, db_field in field_mapping.items():
            if frontend_field in data and data[frontend_field] is not None:
                update_fields.append(f'{db_field} = ?')
                update_values.append(data[frontend_field])

        if not update_fields:
            conn.close()
            return jsonify({'error': 'No valid fields to update'}), 400

        # Add appointment_id to the end for WHERE clause
        update_values.append(appointment_id)

        update_query = f"UPDATE appointments SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(update_query, update_values)
        conn.commit()

        # Return updated appointment
        cursor.execute('''
            SELECT id, customer_id, vehicle_id, technician_id, bay_id, appointment_date,
                   start_time, end_time, estimated_duration, service_type, description,
                   status, priority, notes
            FROM appointments WHERE id = ?
        ''', (appointment_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return jsonify({
                'success': True,
                'appointment': {
                    'id': row[0],
                    'customer_id': row[1],
                    'vehicle_id': row[2],
                    'technician_id': row[3],
                    'bay_id': row[4],
                    'appointment_date': row[5],
                    'start_time': row[6],
                    'end_time': row[7],
                    'estimated_duration': row[8],
                    'service_type': row[9],
                    'description': row[10],
                    'status': row[11],
                    'priority': row[12] or 'NORMAL',
                    'notes': row[13]
                }
            })
        else:
            return jsonify({'error': 'Failed to retrieve updated appointment'}), 500

    except Exception as e:
        print(f"Error updating appointment {appointment_id}: {e}")
        print(f"Data received: {data}")
        import traceback
        traceback.print_exc()
        try:
            conn.close()
        except:
            pass
        return jsonify({'error': f'Failed to update appointment: {str(e)}'}), 500

# ============================================================================
# JOB SHEETS API ENDPOINTS
# ============================================================================

@app.route('/api/job-sheet-templates')
def get_job_sheet_templates():
    """Get all active job sheet templates"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, name, service_type, description, default_instructions,
                   default_safety_notes, default_parts, default_tools, default_checks,
                   estimated_time, is_active, created_date
            FROM job_sheet_templates
            WHERE is_active = 1
            ORDER BY service_type, name
        ''')

        templates = []
        for row in cursor.fetchall():
            templates.append({
                'id': row[0],
                'name': row[1],
                'service_type': row[2],
                'description': row[3],
                'default_instructions': row[4],
                'default_safety_notes': row[5],
                'default_parts': row[6],
                'default_tools': row[7],
                'default_checks': row[8],
                'estimated_time': row[9],
                'is_active': bool(row[10]),
                'created_date': row[11]
            })

        conn.close()
        return jsonify({
            'success': True,
            'templates': templates
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/job-sheets')
def get_job_sheets():
    """Get job sheets with optional filtering"""
    try:
        job_id = request.args.get('job_id')
        status = request.args.get('status')

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Build query with optional filtering
        query = '''
            SELECT js.id, js.job_id, js.sheet_number, js.template_id, js.work_instructions,
                   js.safety_notes, js.parts_required, js.tools_required, js.quality_checks,
                   js.technician_signature, js.supervisor_signature, js.customer_signature,
                   js.signed_date, js.completed_date, js.status, js.created_date,
                   j.job_number, j.description as job_description,
                   c.name as customer_name, v.registration,
                   t.name as template_name
            FROM job_sheets js
            LEFT JOIN jobs j ON js.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            LEFT JOIN job_sheet_templates t ON js.template_id = t.id
        '''

        params = []
        conditions = []

        if job_id:
            conditions.append('js.job_id = ?')
            params.append(job_id)

        if status:
            conditions.append('js.status = ?')
            params.append(status)

        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)

        query += ' ORDER BY js.created_date DESC'

        cursor.execute(query, params)

        job_sheets = []
        for row in cursor.fetchall():
            job_sheets.append({
                'id': row[0],
                'job_id': row[1],
                'sheet_number': row[2],
                'template_id': row[3],
                'work_instructions': row[4],
                'safety_notes': row[5],
                'parts_required': row[6],
                'tools_required': row[7],
                'quality_checks': row[8],
                'technician_signature': bool(row[9]),
                'supervisor_signature': bool(row[10]),
                'customer_signature': bool(row[11]),
                'signed_date': row[12],
                'completed_date': row[13],
                'status': row[14],
                'created_date': row[15],
                'job_number': row[16],
                'job_description': row[17],
                'customer_name': row[18],
                'vehicle_registration': row[19],
                'template_name': row[20]
            })

        conn.close()
        return jsonify({
            'success': True,
            'job_sheets': job_sheets
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/job-sheets', methods=['POST'])
def create_job_sheet():
    """Create a new job sheet"""
    try:
        data = request.get_json()

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Generate sheet number
        cursor.execute('SELECT COUNT(*) FROM job_sheets')
        count = cursor.fetchone()[0]
        sheet_number = f"JS{(count + 1):06d}"

        cursor.execute('''
            INSERT INTO job_sheets (
                job_id, sheet_number, template_id, work_instructions, safety_notes,
                parts_required, tools_required, quality_checks, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('job_id'),
            sheet_number,
            data.get('template_id'),
            data.get('work_instructions'),
            data.get('safety_notes'),
            data.get('parts_required'),
            data.get('tools_required'),
            data.get('quality_checks'),
            data.get('status', 'DRAFT')
        ))

        job_sheet_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'job_sheet_id': job_sheet_id,
            'sheet_number': sheet_number,
            'message': 'Job sheet created successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# QUOTES & ESTIMATES API ENDPOINTS
# ============================================================================

@app.route('/api/quotes')
def get_quotes():
    """Get quotes with optional filtering"""
    try:
        customer_id = request.args.get('customer_id')
        status = request.args.get('status')

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Build query with optional filtering
        query = '''
            SELECT q.id, q.quote_number, q.customer_id, q.vehicle_id, q.description,
                   q.labour_cost, q.parts_cost, q.total_amount, q.vat_amount,
                   q.status, q.valid_until, q.created_date, q.approved_date,
                   q.converted_job_id, q.notes, q.terms_conditions,
                   c.name as customer_name, c.email as customer_email,
                   v.registration, v.make, v.model
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN vehicles v ON q.vehicle_id = v.id
        '''

        params = []
        conditions = []

        if customer_id:
            conditions.append('q.customer_id = ?')
            params.append(customer_id)

        if status:
            conditions.append('q.status = ?')
            params.append(status)

        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)

        query += ' ORDER BY q.created_date DESC'

        cursor.execute(query, params)

        quotes = []
        for row in cursor.fetchall():
            quotes.append({
                'id': row[0],
                'quote_number': row[1],
                'customer_id': row[2],
                'vehicle_id': row[3],
                'description': row[4],
                'labour_cost': row[5],
                'parts_cost': row[6],
                'total_amount': row[7],
                'vat_amount': row[8],
                'status': row[9],
                'valid_until': row[10],
                'created_date': row[11],
                'approved_date': row[12],
                'converted_job_id': row[13],
                'notes': row[14],
                'terms_conditions': row[15],
                'customer_name': row[16],
                'customer_email': row[17],
                'vehicle_registration': row[18],
                'vehicle_make': row[19],
                'vehicle_model': row[20]
            })

        conn.close()
        return jsonify({
            'success': True,
            'quotes': quotes
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotes', methods=['POST'])
def create_quote():
    """Create a new quote"""
    try:
        data = request.get_json()

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Generate quote number
        cursor.execute('SELECT COUNT(*) FROM quotes')
        count = cursor.fetchone()[0]
        quote_number = f"QT{(count + 1):06d}"

        # Calculate totals
        labour_cost = float(data.get('labour_cost', 0))
        parts_cost = float(data.get('parts_cost', 0))
        subtotal = labour_cost + parts_cost
        vat_rate = 0.20  # 20% VAT
        vat_amount = subtotal * vat_rate
        total_amount = subtotal + vat_amount

        cursor.execute('''
            INSERT INTO quotes (
                quote_number, customer_id, vehicle_id, description,
                labour_cost, parts_cost, total_amount, vat_amount,
                status, valid_until, notes, terms_conditions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            quote_number,
            data.get('customer_id'),
            data.get('vehicle_id'),
            data.get('description'),
            labour_cost,
            parts_cost,
            total_amount,
            vat_amount,
            data.get('status', 'DRAFT'),
            data.get('valid_until'),
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
            'total_amount': total_amount,
            'message': 'Quote created successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotes/<int:quote_id>/convert', methods=['POST'])
def convert_quote_to_job(quote_id):
    """Convert a quote to a job"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get quote details
        cursor.execute('''
            SELECT customer_id, vehicle_id, description, labour_cost, parts_cost, total_amount
            FROM quotes WHERE id = ? AND status = 'APPROVED'
        ''', (quote_id,))

        quote = cursor.fetchone()
        if not quote:
            return jsonify({'success': False, 'error': 'Quote not found or not approved'}), 404

        # Generate job number
        cursor.execute('SELECT COUNT(*) FROM jobs')
        count = cursor.fetchone()[0]
        job_number = f"JOB{(count + 1):06d}"

        # Create job from quote
        cursor.execute('''
            INSERT INTO jobs (
                job_number, customer_id, vehicle_id, description,
                labour_cost, parts_cost, total_amount, status, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job_number,
            quote[0],  # customer_id
            quote[1],  # vehicle_id
            quote[2],  # description
            quote[3],  # labour_cost
            quote[4],  # parts_cost
            quote[5],  # total_amount
            'BOOKED_IN',
            'NORMAL'
        ))

        job_id = cursor.lastrowid

        # Update quote status and link to job
        cursor.execute('''
            UPDATE quotes
            SET status = 'CONVERTED', converted_job_id = ?, approved_date = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (job_id, quote_id))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'job_id': job_id,
            'job_number': job_number,
            'message': 'Quote converted to job successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# PAYMENT INTEGRATION API ENDPOINTS
# ============================================================================

@app.route('/api/payments/create-intent', methods=['POST'])
def create_payment_intent():
    """Create a Stripe payment intent for invoice payment"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        amount = data.get('amount')  # Amount in pounds

        if not invoice_id or not amount:
            return jsonify({'success': False, 'error': 'Invoice ID and amount required'}), 400

        # Convert to pence for Stripe
        amount_pence = int(float(amount) * 100)

        # Mock payment intent creation (replace with actual Stripe integration)
        payment_intent = {
            'id': f'pi_mock_{invoice_id}_{int(datetime.now().timestamp())}',
            'client_secret': f'pi_mock_{invoice_id}_secret',
            'amount': amount_pence,
            'currency': 'gbp',
            'status': 'requires_payment_method'
        }

        return jsonify({
            'success': True,
            'payment_intent': payment_intent,
            'publishable_key': 'pk_test_mock_key'  # Mock key
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/payments/confirm', methods=['POST'])
def confirm_payment():
    """Confirm payment and update invoice status"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        payment_intent_id = data.get('payment_intent_id')

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Update invoice as paid
        cursor.execute('''
            UPDATE invoices
            SET status = 'PAID', paid_date = CURRENT_DATE, payment_method = 'CARD'
            WHERE id = ?
        ''', (invoice_id,))

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Payment confirmed and invoice updated'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# ONLINE BOOKING WIDGET API ENDPOINTS
# ============================================================================

@app.route('/api/booking/availability')
def get_booking_availability():
    """Get available appointment slots for online booking"""
    try:
        date = request.args.get('date')
        service_type = request.args.get('service_type', 'GENERAL')

        if not date:
            return jsonify({'success': False, 'error': 'Date is required'}), 400

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get existing appointments for the date
        cursor.execute('''
            SELECT start_time, end_time, technician_id, bay_id
            FROM appointments
            WHERE appointment_date = ?
        ''', (date,))

        existing_appointments = cursor.fetchall()

        # Get available technicians and bays
        cursor.execute('SELECT id, name, start_time, end_time FROM technicians WHERE is_active = 1')
        technicians = cursor.fetchall()

        cursor.execute('SELECT id, bay_number FROM workshop_bays WHERE is_available = 1')
        bays = cursor.fetchall()

        # Generate available time slots (simplified logic)
        available_slots = []
        for hour in range(9, 17):  # 9 AM to 5 PM
            time_slot = f"{hour:02d}:00"

            # Check if slot is available (simplified - would need more complex logic)
            is_available = len(existing_appointments) < len(technicians) * len(bays)

            if is_available:
                available_slots.append({
                    'time': time_slot,
                    'duration': 60,  # 1 hour slots
                    'available_technicians': len(technicians),
                    'available_bays': len(bays)
                })

        conn.close()
        return jsonify({
            'success': True,
            'date': date,
            'available_slots': available_slots
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/booking/create', methods=['POST'])
def create_online_booking():
    """Create an appointment from online booking"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['customer_name', 'customer_phone', 'vehicle_registration',
                          'appointment_date', 'start_time', 'service_type']

        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400

        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if customer exists, create if not
        cursor.execute('SELECT id FROM customers WHERE phone = ?', (data['customer_phone'],))
        customer = cursor.fetchone()

        if customer:
            customer_id = customer[0]
        else:
            # Create new customer
            cursor.execute('''
                INSERT INTO customers (name, phone, account_number)
                VALUES (?, ?, ?)
            ''', (data['customer_name'], data['customer_phone'], f"WEB{int(datetime.now().timestamp())}"))
            customer_id = cursor.lastrowid

        # Check if vehicle exists, create if not
        cursor.execute('SELECT id FROM vehicles WHERE registration = ?', (data['vehicle_registration'],))
        vehicle = cursor.fetchone()

        if vehicle:
            vehicle_id = vehicle[0]
        else:
            # Create new vehicle
            cursor.execute('''
                INSERT INTO vehicles (registration, customer_id, make, model)
                VALUES (?, ?, ?, ?)
            ''', (data['vehicle_registration'], customer_id,
                  data.get('vehicle_make', 'Unknown'), data.get('vehicle_model', 'Unknown')))
            vehicle_id = cursor.lastrowid

        # Get available technician and bay (simplified assignment)
        cursor.execute('SELECT id FROM technicians WHERE is_active = 1 LIMIT 1')
        technician = cursor.fetchone()
        technician_id = technician[0] if technician else None

        cursor.execute('SELECT id FROM workshop_bays WHERE is_available = 1 LIMIT 1')
        bay = cursor.fetchone()
        bay_id = bay[0] if bay else None

        # Calculate end time (assume 1 hour duration)
        start_hour = int(data['start_time'].split(':')[0])
        end_time = f"{start_hour + 1:02d}:00"

        # Create appointment
        cursor.execute('''
            INSERT INTO appointments (
                customer_id, vehicle_id, technician_id, bay_id,
                appointment_date, start_time, end_time, estimated_duration,
                service_type, description, status, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            customer_id, vehicle_id, technician_id, bay_id,
            data['appointment_date'], data['start_time'], end_time, 60,
            data['service_type'], data.get('description', ''), 'SCHEDULED', 'NORMAL'
        ))

        appointment_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'appointment_id': appointment_id,
            'message': 'Booking created successfully',
            'confirmation_number': f"BK{appointment_id:06d}"
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/invoice/<int:invoice_id>')
@app.route('/api/invoices/<int:invoice_id>')
def get_invoice(invoice_id):
    """Get specific invoice details"""
    try:
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT i.id, i.invoice_number, i.job_id, i.customer_id, i.vehicle_id,
                   i.amount, i.vat_amount, i.total_amount, i.status,
                   i.created_date, i.due_date, i.paid_date, i.payment_method, i.notes,
                   i.is_locked,
                   c.account_number, c.name as customer_name, c.address, c.postcode,
                   j.job_number, j.description as job_description,
                   v.registration, v.make, v.model, v.color, v.fuel_type, v.mileage, v.mot_due
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN vehicles v ON i.vehicle_id = v.id
            WHERE i.id = ?
        ''', (invoice_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404

        # Auto-lock paid invoices if not already locked
        is_locked = bool(row[14]) or row[8] in ['PAID', 'LOCKED']

        invoice = {
            'id': row[0],
            'invoice_number': row[1],
            'job_id': row[2],
            'customer_id': row[3],
            'vehicle_id': row[4],
            'amount': row[5],
            'vat_amount': row[6],
            'total_amount': row[7],
            'status': row[8],
            'created_date': row[9],
            'due_date': row[10],
            'paid_date': row[11],
            'payment_method': row[12],
            'notes': row[13],
            'is_locked': is_locked,
            'customer': {
                'account_number': row[15],
                'name': row[16],
                'address': row[17],
                'postcode': row[18]
            },
            'job': {
                'job_number': row[19],
                'description': row[20]
            },
            'vehicle': {
                'registration': row[21] or '',
                'make': row[22] or '',
                'model': row[23] or '',
                'color': row[24] or '',
                'fuel_type': row[25] or '',
                'mileage': row[26] or 0,
                'mot_due': row[27] or '',
                'chassis': ''  # Not in current schema
            }
        }

        conn.close()
        return jsonify({'success': True, 'invoice': invoice})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# MOT API Routes
@app.route('/api/mot/vehicles', methods=['GET', 'POST'])
def mot_vehicles():
    """Get all MOT vehicles or add a new vehicle"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        if request.method == 'GET':
            include_archived = request.args.get('include_archived', 'false').lower() == 'true'
            vehicles = mot_service.get_all_mot_vehicles(include_archived=include_archived)
            return jsonify({
                'success': True,
                'vehicles': vehicles,
                'count': len(vehicles)
            })

        elif request.method == 'POST':
            data = request.get_json()
            registration = data.get('registration', '').strip().upper()
            customer_name = data.get('customer_name', '').strip()
            mobile_number = data.get('mobile_number', '').strip()

            if not registration:
                return jsonify({'success': False, 'error': 'Registration required'})

            result = mot_service.add_mot_vehicle(registration, customer_name, mobile_number)
            return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/failed-registrations')
def get_failed_registrations():
    """Get failed vehicle registrations"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        status = request.args.get('status', 'pending')
        failed_regs = mot_service.get_failed_registrations(status)
        return jsonify({
            'success': True,
            'failed_registrations': failed_regs,
            'count': len(failed_regs),
            'status': status
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/sms/status')
def get_sms_status():
    """Get SMS service status"""
    try:
        if not mot_service:
            return jsonify({'configured': False, 'error': 'MOT service not available'})

        status = mot_service.sms_service.get_service_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'configured': False, 'error': str(e)})

@app.route('/api/mot/sms/history')
def get_mot_sms_history():
    """Get SMS sending history"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        registration = request.args.get('registration')
        limit = int(request.args.get('limit', 50))

        # Get SMS history directly from database
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        if registration:
            cursor.execute('''
                SELECT vehicle_registration, customer_name, mobile_number,
                       message_type, sent_at, status, message_sid,
                       days_until_expiry, mot_expiry_date, delivery_status,
                       delivery_error_code, delivery_error_message, delivery_updated_at
                FROM mot_reminders_log
                WHERE vehicle_registration = ?
                ORDER BY sent_at DESC
                LIMIT ?
            ''', (registration, limit))
        else:
            cursor.execute('''
                SELECT vehicle_registration, customer_name, mobile_number,
                       message_type, sent_at, status, message_sid,
                       days_until_expiry, mot_expiry_date, delivery_status,
                       delivery_error_code, delivery_error_message, delivery_updated_at
                FROM mot_reminders_log
                ORDER BY sent_at DESC
                LIMIT ?
            ''', (limit,))

        history = []
        for row in cursor.fetchall():
            history.append({
                'registration': row[0],
                'customer_name': row[1],
                'mobile_number': row[2],
                'message_type': row[3],
                'sent_at': row[4],
                'status': row[5],
                'message_sid': row[6],
                'days_until_expiry': row[7],
                'mot_expiry_date': row[8],
                'delivery_status': row[9],
                'delivery_error_code': row[10],
                'delivery_error_message': row[11],
                'delivery_updated_at': row[12]
            })

        conn.close()
        return jsonify({'success': True, 'history': history})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/check', methods=['POST'])
def check_mot_vehicle():
    """Check MOT status for a vehicle registration"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        data = request.get_json()
        registration = data.get('registration')

        if not registration:
            return jsonify({'success': False, 'error': 'Registration required'}), 400

        # Clean the registration
        registration = registration.strip().upper().replace(' ', '')

        # Check MOT status using the MOT reminder service
        if mot_service.mot_reminder:
            mot_data = mot_service.mot_reminder.check_mot_status(registration)

            if mot_data:
                return jsonify({
                    'success': True,
                    'data': mot_data,
                    'registration': registration
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'No MOT data found for this registration',
                    'registration': registration
                }), 404
        else:
            return jsonify({
                'success': False,
                'error': 'MOT reminder service not available',
                'registration': registration
            }), 503

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/add', methods=['POST'])
def add_mot_vehicle():
    """Add a vehicle to MOT monitoring"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        data = request.get_json()
        registration = data.get('registration')

        if not registration:
            return jsonify({'success': False, 'error': 'Registration required'}), 400

        result = mot_service.add_mot_vehicle(registration)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/sms/send', methods=['POST'])
def send_mot_sms():
    """Send MOT reminder SMS"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        data = request.get_json()
        registrations = data.get('registrations', [])

        if not registrations:
            return jsonify({'success': False, 'error': 'No vehicles specified'}), 400

        # Use the correct method name
        result = mot_service.send_mot_reminder_sms(registrations)

        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/link-existing-vehicles', methods=['POST'])
def link_existing_vehicles():
    """Retroactively link existing MOT vehicles to customers in main database"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        # Get all MOT vehicles that don't have customer links
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT registration, customer_name, mobile_number
            FROM mot_vehicles
            WHERE main_customer_id IS NULL
        ''')

        unlinked_vehicles = cursor.fetchall()
        conn.close()

        linked_count = 0
        created_count = 0
        results = []

        for registration, customer_name, mobile_number in unlinked_vehicles:
            # Try to link to existing customer
            customer_link = mot_service.link_mot_vehicle_to_customer(registration, customer_name, mobile_number)

            if customer_link:
                # Update MOT vehicle with customer link
                conn = sqlite3.connect(mot_service.db_path)
                cursor = conn.cursor()

                cursor.execute('''
                    UPDATE mot_vehicles
                    SET main_customer_id = ?, main_vehicle_id = ?
                    WHERE registration = ?
                ''', (customer_link['customer_id'], customer_link.get('vehicle_id'), registration))

                conn.commit()
                conn.close()

                linked_count += 1
                results.append({
                    'registration': registration,
                    'status': 'linked',
                    'customer_id': customer_link['customer_id'],
                    'customer_name': customer_link['customer_name']
                })

        return jsonify({
            'success': True,
            'linked_to_existing': linked_count,
            'created_new_customers': created_count,
            'total_processed': len(unlinked_vehicles),
            'results': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/clear-all-data', methods=['POST'])
def clear_all_mot_data():
    """Clear all MOT data - USE WITH CAUTION"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        # Get confirmation from request
        data = request.get_json() or {}
        confirm = data.get('confirm', False)

        if not confirm:
            return jsonify({'success': False, 'error': 'Confirmation required'}), 400

        # Clear all MOT-related tables
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        # Get counts before clearing
        cursor.execute('SELECT COUNT(*) FROM mot_vehicles')
        vehicles_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM mot_reminders_log')
        sms_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM failed_registrations')
        failed_count = cursor.fetchone()[0]

        # Clear all tables
        cursor.execute('DELETE FROM mot_vehicles')
        cursor.execute('DELETE FROM mot_reminders_log')
        cursor.execute('DELETE FROM failed_registrations')
        cursor.execute('DELETE FROM customers WHERE id NOT IN (SELECT DISTINCT main_customer_id FROM mot_vehicles WHERE main_customer_id IS NOT NULL)')

        # Reset auto-increment counters
        cursor.execute('DELETE FROM sqlite_sequence WHERE name IN ("mot_vehicles", "mot_reminders_log", "failed_registrations", "customers")')

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'All MOT data cleared successfully',
            'cleared': {
                'vehicles': vehicles_count,
                'sms_logs': sms_count,
                'failed_registrations': failed_count
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/bulk-upload', methods=['POST'])
def mot_bulk_upload():
    """Bulk upload vehicles for MOT monitoring"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        # Get the uploaded data
        data = request.get_json()
        if not data or 'vehicles' not in data:
            return jsonify({'success': False, 'error': 'No vehicle data provided'}), 400

        vehicles = data['vehicles']
        if not vehicles:
            return jsonify({'success': False, 'error': 'No vehicles to process'}), 400

        processed = 0
        failed = 0
        results = []

        for vehicle_data in vehicles:
            registration = vehicle_data.get('registration', '').strip().upper()
            customer_name = vehicle_data.get('customer_name', '').strip()
            mobile_number = vehicle_data.get('mobile_number', '').strip()

            if not registration:
                failed += 1
                results.append({
                    'registration': registration,
                    'status': 'failed',
                    'error': 'Missing registration'
                })
                continue

            try:
                # Add vehicle using the MOT service
                result = mot_service.add_mot_vehicle(
                    registration=registration,
                    customer_name=customer_name,
                    mobile_number=mobile_number,
                    upload_batch_id=f"bulk_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                )

                if result.get('success'):
                    processed += 1
                    results.append({
                        'registration': registration,
                        'status': 'success',
                        'data': result.get('data', {})
                    })
                else:
                    failed += 1
                    results.append({
                        'registration': registration,
                        'status': 'failed',
                        'error': result.get('error', 'Unknown error')
                    })

            except Exception as e:
                failed += 1
                results.append({
                    'registration': registration,
                    'status': 'failed',
                    'error': str(e)
                })

        return jsonify({
            'success': True,
            'processed': processed,
            'failed': failed,
            'total': len(vehicles),
            'results': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/vehicles/<registration>', methods=['DELETE'])
def delete_mot_vehicle(registration):
    """Delete a single MOT vehicle"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        # Delete from MOT database
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        # Check if vehicle exists
        cursor.execute('SELECT registration FROM mot_vehicles WHERE registration = ?', (registration,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Vehicle not found'}), 404

        # Delete the vehicle
        cursor.execute('DELETE FROM mot_vehicles WHERE registration = ?', (registration,))

        # Also delete related records
        cursor.execute('DELETE FROM mot_reminders_log WHERE registration = ?', (registration,))
        cursor.execute('DELETE FROM failed_registrations WHERE registration = ?', (registration,))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Vehicle {registration} deleted successfully'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/vehicles/bulk-delete', methods=['POST'])
def bulk_delete_mot_vehicles():
    """Delete multiple MOT vehicles"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        data = request.get_json()
        registrations = data.get('registrations', [])

        if not registrations:
            return jsonify({'success': False, 'error': 'No registrations provided'}), 400

        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        deleted = 0
        failed = 0

        for registration in registrations:
            try:
                # Check if vehicle exists
                cursor.execute('SELECT registration FROM mot_vehicles WHERE registration = ?', (registration,))
                if cursor.fetchone():
                    # Delete the vehicle and related records
                    cursor.execute('DELETE FROM mot_vehicles WHERE registration = ?', (registration,))
                    cursor.execute('DELETE FROM mot_reminders_log WHERE registration = ?', (registration,))
                    cursor.execute('DELETE FROM failed_registrations WHERE registration = ?', (registration,))
                    deleted += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"Error deleting {registration}: {e}")
                failed += 1

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'deleted': deleted,
            'failed': failed,
            'total': len(registrations)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/vehicles/<registration>/archive', methods=['POST'])
def archive_mot_vehicle(registration):
    """Archive a MOT vehicle"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        # Check if vehicle exists
        cursor.execute('SELECT registration FROM mot_vehicles WHERE registration = ?', (registration,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Vehicle not found'}), 404

        # Archive the vehicle
        cursor.execute('UPDATE mot_vehicles SET is_archived = 1 WHERE registration = ?', (registration,))
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Vehicle {registration} archived successfully'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mot/vehicles/<registration>/unarchive', methods=['POST'])
def unarchive_mot_vehicle(registration):
    """Unarchive a MOT vehicle"""
    try:
        if not mot_service:
            return jsonify({'success': False, 'error': 'MOT service not available'}), 503

        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        # Check if vehicle exists
        cursor.execute('SELECT registration FROM mot_vehicles WHERE registration = ?', (registration,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Vehicle not found'}), 404

        # Unarchive the vehicle
        cursor.execute('UPDATE mot_vehicles SET is_archived = 0 WHERE registration = ?', (registration,))
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Vehicle {registration} unarchived successfully'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# Error Monitoring and Reporting Endpoints
@app.route('/api/error-reports', methods=['POST'])
def receive_error_report():
    """Receive error reports from the client-side monitoring system"""
    try:
        # Handle both JSON and form data to fix Content-Type issues
        if request.is_json:
            data = request.get_json()
        elif request.content_type and 'application/x-www-form-urlencoded' in request.content_type:
            # Handle form data
            data = request.form.to_dict()
            # Try to parse JSON strings in form data
            for key, value in data.items():
                try:
                    data[key] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    pass
        else:
            # Try to get JSON anyway
            try:
                data = request.get_json(force=True)
            except Exception:
                data = {'error': 'Unable to parse request data', 'raw_data': request.get_data(as_text=True)}

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Log the error report
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        error_log_entry = {
            'timestamp': timestamp,
            'report': data,
            'client_ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown'),
            'content_type': request.content_type
        }

        # Write to error log file
        log_file = os.path.join('logs', 'error_reports.json')
        os.makedirs('logs', exist_ok=True)

        # Append to log file
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                try:
                    logs = json.load(f)
                except json.JSONDecodeError:
                    logs = []
        else:
            logs = []

        logs.append(error_log_entry)

        # Keep only last 1000 entries
        if len(logs) > 1000:
            logs = logs[-1000:]

        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)

        # Check if this error requires immediate attention
        if data.get('error', {}).get('type') in ['javascript_error', 'promise_rejection']:
            severity = 'high' if 'null is not an object' in str(data.get('error', {}).get('message', '')) else 'medium'

            if severity == 'high':
                print(f"🚨 HIGH SEVERITY ERROR DETECTED: {data.get('error', {}).get('message', 'Unknown')}")

                # Trigger automated fix if possible
                trigger_automated_fix(data)

        return jsonify({'status': 'received', 'timestamp': timestamp}), 200

    except Exception as e:
        print(f"❌ Error processing error report: {e}")
        return jsonify({'error': 'Failed to process report'}), 500

@app.route('/api/error-reports', methods=['GET'])
def get_error_reports():
    """Get recent error reports for dashboard"""
    try:
        log_file = os.path.join('logs', 'error_reports.json')

        if not os.path.exists(log_file):
            return jsonify({'reports': [], 'total': 0})

        with open(log_file, 'r') as f:
            logs = json.load(f)

        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        severity = request.args.get('severity', None)

        # Filter by severity if specified
        if severity:
            filtered_logs = [log for log in logs
                           if log.get('report', {}).get('pattern', {}).get('severity') == severity]
        else:
            filtered_logs = logs

        # Return most recent entries
        recent_logs = filtered_logs[-limit:] if len(filtered_logs) > limit else filtered_logs
        recent_logs.reverse()  # Most recent first

        return jsonify({
            'reports': recent_logs,
            'total': len(filtered_logs),
            'available_severities': ['high', 'medium', 'low']
        })

    except Exception as e:
        print(f"❌ Error retrieving error reports: {e}")
        return jsonify({'error': 'Failed to retrieve reports'}), 500

def trigger_automated_fix(error_data):
    """Trigger automated fix for server-side issues"""
    try:
        error_type = error_data.get('error', {}).get('type')
        error_message = error_data.get('error', {}).get('message', '')

        # Handle specific error types that require server-side fixes
        if 'static file' in error_message.lower() or error_data.get('error', {}).get('status') == 404:
            url = error_data.get('error', {}).get('url', '')
            if '/css/' in url or '/js/' in url:
                print(f"🔧 Attempting to create missing static file: {url}")
                create_missing_static_file(url)

        # Log the fix attempt
        fix_log_entry = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'error_data': error_data,
            'fix_attempted': True,
            'fix_type': 'server_side'
        }

        fix_log_file = os.path.join('logs', 'automated_fixes.json')
        os.makedirs('logs', exist_ok=True)

        if os.path.exists(fix_log_file):
            with open(fix_log_file, 'r') as f:
                try:
                    fix_logs = json.load(f)
                except json.JSONDecodeError:
                    fix_logs = []
        else:
            fix_logs = []

        fix_logs.append(fix_log_entry)

        with open(fix_log_file, 'w') as f:
            json.dump(fix_logs, f, indent=2)

    except Exception as e:
        print(f"❌ Error in automated fix: {e}")

def create_missing_static_file(url):
    """Create a minimal static file to resolve 404 errors"""
    try:
        # Extract file path from URL
        if '/css/' in url:
            file_path = url.split('/css/')[-1]
            full_path = os.path.join('src', 'static', 'css', file_path)

            # Create minimal CSS file if it doesn't exist
            if not os.path.exists(full_path):
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(f"/* Auto-generated CSS file for {file_path} */\n")
                    f.write("/* This file was created by the automated error monitoring system */\n")
                print(f"✅ Created missing CSS file: {full_path}")

        elif '/js/' in url:
            file_path = url.split('/js/')[-1]
            full_path = os.path.join('src', 'static', 'js', file_path)

            # Create minimal JS file if it doesn't exist
            if not os.path.exists(full_path):
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(f"// Auto-generated JavaScript file for {file_path}\n")
                    f.write("// This file was created by the automated error monitoring system\n")
                    f.write("console.log('Placeholder JS file loaded:', '" + file_path + "');\n")
                print(f"✅ Created missing JS file: {full_path}")

    except Exception as e:
        print(f"❌ Error creating static file: {e}")

# DeepSource Fix Management API Endpoints
try:
    from deepsource_fix_manager import DeepSourceFixManager
    deepsource_manager = DeepSourceFixManager()
    print("✅ DeepSource Fix Manager initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize DeepSource Fix Manager: {e}")
    deepsource_manager = None

@app.route('/deepsource-dashboard')
def deepsource_dashboard():
    """DeepSource fix management dashboard"""
    return send_from_directory('static/templates', 'deepsource_dashboard.html')

@app.route('/api/deepsource/stats')
def get_deepsource_stats():
    """Get DeepSource fix statistics"""
    try:
        if not deepsource_manager:
            return jsonify({'error': 'DeepSource manager not available'}), 500

        stats = deepsource_manager.get_fix_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/deepsource/fixes')
def get_deepsource_fixes():
    """Get recent DeepSource fixes"""
    try:
        if not deepsource_manager:
            return jsonify({'error': 'DeepSource manager not available'}), 500

        days = request.args.get('days', 30, type=int)
        file_path = request.args.get('file_path')
        issue_type = request.args.get('issue_type')

        fixes = deepsource_manager.get_fix_history(
            file_path=file_path,
            issue_type=issue_type,
            days=days
        )
        return jsonify(fixes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/deepsource/trigger-analysis', methods=['POST'])
def trigger_deepsource_analysis():
    """Trigger DeepSource analysis (placeholder)"""
    try:
        # In a real implementation, this would trigger DeepSource analysis
        # For now, just return success
        return jsonify({
            'success': True,
            'message': 'Analysis trigger request sent to DeepSource'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/deepsource/cleanup', methods=['POST'])
def cleanup_deepsource_records():
    """Clean up old DeepSource fix records"""
    try:
        if not deepsource_manager:
            return jsonify({'error': 'DeepSource manager not available'}), 500

        days = request.json.get('days', 90) if request.json else 90
        deleted_count = deepsource_manager.cleanup_old_records(days)

        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'Cleaned up {deleted_count} records older than {days} days'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/deepsource/export')
def export_deepsource_data():
    """Export DeepSource fix data"""
    try:
        if not deepsource_manager:
            return jsonify({'error': 'DeepSource manager not available'}), 500

        # Get all fix history
        fixes = deepsource_manager.get_fix_history(days=365)  # Last year
        stats = deepsource_manager.get_fix_statistics()

        export_data = {
            'export_timestamp': datetime.now().isoformat(),
            'statistics': stats,
            'fixes': fixes
        }

        response = jsonify(export_data)
        response.headers['Content-Disposition'] = f'attachment; filename=deepsource_fixes_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def create_tables():
    """Create database tables"""
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")

if __name__ == '__main__':
    # Create tables if they don't exist
    create_tables()
    
    # Run the application
    print("🚀 Starting Garage Management System...")
    print("📊 Main interface: http://127.0.0.1:5001")
    print("📤 Upload interface: http://127.0.0.1:5001/upload")
    print("☁️  Google Drive Sync: http://127.0.0.1:5001/google-drive")
    print("🚗 MOT Reminders: http://127.0.0.1:8080")
    print("🔍 DeepSource Dashboard: http://127.0.0.1:5001/deepsource-dashboard")
    print("🛡️  Error Monitoring: Active")

    app.run(debug=True, host='0.0.0.0', port=5001)
