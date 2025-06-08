import os
import sys
# DON'T CHANGE THIS PATH - it's required for the deployment environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
from datetime import datetime, timedelta
from models.vehicle import Vehicle
from models import db
from config import config

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, origins="*")

# Load configuration
app.config.from_object(config['development'])

# Initialize SQLAlchemy
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()
    cursor = db.session.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_number TEXT UNIQUE,
            vehicle_id INTEGER,
            customer_id INTEGER,
            description TEXT,
            status TEXT,
            total_amount REAL,
            created_date TEXT,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS estimates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estimate_number TEXT UNIQUE,
            job_id INTEGER,
            customer_id INTEGER,
            vehicle_id INTEGER,
            description TEXT,
            status TEXT,
            total_amount REAL,
            created_date TEXT,
            valid_until TEXT,
            FOREIGN KEY (job_id) REFERENCES jobs (id),
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE,
            job_id INTEGER,
            estimate_id INTEGER,
            customer_id INTEGER,
            vehicle_id INTEGER,
            amount REAL,
            status TEXT,
            created_date TEXT,
            FOREIGN KEY (job_id) REFERENCES jobs (id),
            FOREIGN KEY (estimate_id) REFERENCES estimates (id),
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
        )
    ''')

def format_date_for_display(date_string):
    """Convert date from YYYY-MM-DD to DD-MM-YYYY format for display"""
    if not date_string or date_string == '-' or date_string == '':
        return '-'
    
    try:
        # Parse the date string
        if '-' in date_string:
            # Handle YYYY-MM-DD format
            date_obj = datetime.strptime(date_string, '%Y-%m-%d')
        elif '/' in date_string:
            # Handle MM/DD/YYYY or DD/MM/YYYY format
            date_obj = datetime.strptime(date_string, '%m/%d/%Y')
        else:
            return date_string  # Return as-is if format is unrecognized
        
        # Format as DD-MM-YYYY
        return date_obj.strftime('%d-%m-%Y')
    except ValueError:
        return date_string  # Return original if parsing fails

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    """Get all vehicles with optional filtering"""
    try:
        # Get query parameters
        registration = request.args.get('registration')
        customer_id = request.args.get('customer_id')
        
        # Base query
        query = Vehicle.query
        
        # Apply filters if provided
        if registration:
            query = query.filter(Vehicle.registration.ilike(f'%{registration}%'))
        if customer_id:
            query = query.filter(Vehicle.customer_id == customer_id)
        
        # Execute query
        vehicles = query.all()
        
        # Format response
        vehicle_list = []
        for vehicle in vehicles:
            vehicle_data = vehicle.to_dict()
            vehicle_data['mot_due'] = format_date_for_display(vehicle_data['mot_expiry'])
            vehicle_data['tax_due'] = format_date_for_display(vehicle_data['tax_due'])
            vehicle_list.append(vehicle_data)
        
        return jsonify({
            'status': 'success',
            'data': vehicle_list
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/customers/<customer_id>', methods=['GET'])
def get_customer_detail(customer_id):
    """Get detailed information about a specific customer, including vehicles, jobs, and invoices"""
    try:
        from models.vehicle import Vehicle
        from models import db
        customer = db.session.execute(db.select(db.Model).where(db.Model.__tablename__ == 'customers').where(db.Model.id == customer_id)).scalar()
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        # Get vehicles
        vehicles = Vehicle.query.filter_by(customer_id=customer.id).all()
        vehicles_list = [v.to_dict() for v in vehicles]
        # Get jobs
        jobs = db.session.execute(db.text('SELECT * FROM jobs WHERE customer_id = :cid'), {'cid': customer.id}).fetchall()
        jobs_list = [dict(row) for row in jobs]
        # Get invoices
        invoices = db.session.execute(db.text('SELECT * FROM invoices WHERE customer_id = :cid'), {'cid': customer.id}).fetchall()
        invoices_list = [dict(row) for row in invoices]
        # Format customer
        customer_dict = dict(customer)
        return jsonify({
            'customer': customer_dict,
            'vehicles': vehicles_list,
            'jobs': jobs_list,
            'invoices': invoices_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles/<vehicle_id>', methods=['GET'])
def get_vehicle_detail(vehicle_id):
    """Get detailed information about a specific vehicle, including jobs and invoices"""
    try:
        from models.vehicle import Vehicle
        from models import db
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
        # Get jobs
        jobs = db.session.execute(db.text('SELECT * FROM jobs WHERE vehicle_id = :vid'), {'vid': vehicle.id}).fetchall()
        jobs_list = [dict(row) for row in jobs]
        # Get invoices
        invoices = db.session.execute(db.text('SELECT * FROM invoices WHERE vehicle_id = :vid'), {'vid': vehicle.id}).fetchall()
        invoices_list = [dict(row) for row in invoices]
        # Format vehicle
        vehicle_dict = vehicle.to_dict()
        return jsonify({
            'vehicle': vehicle_dict,
            'jobs': jobs_list,
            'invoices': invoices_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles', methods=['POST'])
def create_vehicle():
    """Create a new vehicle with DVLA data"""
    try:
        data = request.get_json()
        
        if not data or 'registration' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Registration number is required'
            }), 400
        
        # Create new vehicle (this will automatically fetch DVLA data)
        vehicle = Vehicle(registration=data['registration'])
        
        # Add customer_id if provided
        if 'customer_id' in data:
            vehicle.customer_id = data['customer_id']
        
        # Save to database
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': vehicle.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/vehicles/<vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update vehicle information"""
    try:
        vehicle = Vehicle.query.get(vehicle_id)
        
        if not vehicle:
            return jsonify({
                'status': 'error',
                'message': 'Vehicle not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'registration' in data:
            vehicle.registration = data['registration']
            # Fetch new DVLA data
            vehicle.fetch_dvla_data()
        
        if 'customer_id' in data:
            vehicle.customer_id = data['customer_id']
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': vehicle.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/jobs')
def get_jobs():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT j.*, v.registration, c.name as customer_name, c.company as customer_company,
                   e.estimate_number, e.status as estimate_status
            FROM jobs j
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN estimates e ON j.id = e.job_id
            ORDER BY j.created_date DESC
        ''')
        
        jobs = []
        for row in cursor.fetchall():
            jobs.append({
                'id': row['id'],
                'job_number': row['job_number'],
                'registration': row['registration'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'description': row['description'],
                'status': row['status'],
                'total_amount': row['total_amount'],
                'created_date': row['created_date'],
                'estimate_number': row['estimate_number'],
                'estimate_status': row['estimate_status']
            })
        
        conn.close()
        return jsonify({'jobs': jobs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/estimates')
def get_estimates():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT e.*, v.registration, c.name as customer_name, c.company as customer_company,
                   j.job_number, j.description as job_description
            FROM estimates e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN customers c ON e.customer_id = c.id
            LEFT JOIN jobs j ON e.job_id = j.id
            ORDER BY e.created_date DESC
        ''')
        
        estimates = []
        for row in cursor.fetchall():
            estimates.append({
                'id': row['id'],
                'estimate_number': row['estimate_number'],
                'job_number': row['job_number'],
                'registration': row['registration'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'description': row['description'],
                'status': row['status'],
                'total_amount': row['total_amount'],
                'created_date': row['created_date'],
                'valid_until': row['valid_until'],
                'job_description': row['job_description']
            })
        
        conn.close()
        return jsonify({'estimates': estimates})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices')
def get_invoices():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT i.*, v.registration, c.name as customer_name, c.company as customer_company,
                   j.description as job_description, e.estimate_number
            FROM invoices i
            LEFT JOIN vehicles v ON i.vehicle_id = v.id
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN estimates e ON i.estimate_id = e.id
            ORDER BY i.created_date DESC
        ''')
        
        invoices = []
        for row in cursor.fetchall():
            invoices.append({
                'id': row['id'],
                'invoice_number': row['invoice_number'],
                'registration': row['registration'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'job_description': row['job_description'],
                'estimate_number': row['estimate_number'],
                'amount': row['amount'],
                'status': row['status'],
                'created_date': row['created_date']
            })
        
        conn.close()
        return jsonify({'invoices': invoices})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/customers/<customer_id>')
def get_customer_detail(customer_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Get customer details
        cursor.execute("SELECT * FROM customers WHERE id = ? OR account_number = ?", (customer_id, customer_id))
        customer = cursor.fetchone()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Get customer vehicles
        cursor.execute("SELECT * FROM vehicles WHERE customer_id = ?", (customer['id'],))
        vehicles = [dict(row) for row in cursor.fetchall()]
        
        # Get customer jobs
        cursor.execute('''
            SELECT j.*, v.registration, e.estimate_number, e.status as estimate_status
            FROM jobs j 
            LEFT JOIN vehicles v ON j.vehicle_id = v.id 
            LEFT JOIN estimates e ON j.id = e.job_id
            WHERE j.customer_id = ? 
            ORDER BY j.created_date DESC
        ''', (customer['id'],))
        jobs = [dict(row) for row in cursor.fetchall()]
        
        # Get customer estimates
        cursor.execute('''
            SELECT e.*, v.registration, j.job_number
            FROM estimates e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            LEFT JOIN jobs j ON e.job_id = j.id
            WHERE e.customer_id = ? 
            ORDER BY e.created_date DESC
        ''', (customer['id'],))
        estimates = [dict(row) for row in cursor.fetchall()]
        
        # Get customer invoices
        cursor.execute('''
            SELECT i.*, v.registration, j.description as job_description, e.estimate_number
            FROM invoices i 
            LEFT JOIN vehicles v ON i.vehicle_id = v.id 
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN estimates e ON i.estimate_id = e.id
            WHERE i.customer_id = ? 
            ORDER BY i.created_date DESC
        ''', (customer['id'],))
        invoices = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'customer': dict(customer),
            'vehicles': vehicles,
            'jobs': jobs,
            'estimates': estimates,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles/<vehicle_id>')
def get_vehicle_detail(vehicle_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Get vehicle details with customer info
        cursor.execute('''
            SELECT v.*, c.name as customer_name, c.company as customer_company, c.account_number
            FROM vehicles v 
            LEFT JOIN customers c ON v.customer_id = c.id 
            WHERE v.id = ? OR v.registration = ?
        ''', (vehicle_id, vehicle_id))
        vehicle = cursor.fetchone()
        
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
        
        # Get vehicle jobs
        cursor.execute('''
            SELECT j.*, c.name as customer_name, e.estimate_number, e.status as estimate_status
            FROM jobs j 
            LEFT JOIN customers c ON j.customer_id = c.id 
            LEFT JOIN estimates e ON j.id = e.job_id
            WHERE j.vehicle_id = ? 
            ORDER BY j.created_date DESC
        ''', (vehicle['id'],))
        jobs = [dict(row) for row in cursor.fetchall()]
        
        # Get vehicle estimates
        cursor.execute('''
            SELECT e.*, c.name as customer_name, j.job_number
            FROM estimates e 
            LEFT JOIN customers c ON e.customer_id = c.id 
            LEFT JOIN jobs j ON e.job_id = j.id
            WHERE e.vehicle_id = ? 
            ORDER BY e.created_date DESC
        ''', (vehicle['id'],))
        estimates = [dict(row) for row in cursor.fetchall()]
        
        # Get vehicle invoices
        cursor.execute('''
            SELECT i.*, j.description as job_description, e.estimate_number
            FROM invoices i 
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN estimates e ON i.estimate_id = e.id
            WHERE i.vehicle_id = ? 
            ORDER BY i.created_date DESC
        ''', (vehicle['id'],))
        invoices = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'vehicle': dict(vehicle),
            'jobs': jobs,
            'estimates': estimates,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)

