import os
import sys
# DON'T CHANGE THIS PATH - it's required for the deployment environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timedelta
import random

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, origins="*")

# Database path - use absolute path for deployment
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'garage.db')

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

def init_db():
    """Initialize database with sample data if it doesn't exist"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_number TEXT UNIQUE,
                name TEXT,
                company TEXT,
                address TEXT,
                postcode TEXT,
                phone TEXT,
                email TEXT,
                created_date TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration TEXT UNIQUE,
                make TEXT,
                model TEXT,
                color TEXT,
                fuel_type TEXT,
                mot_due TEXT,
                mileage INTEGER,
                customer_id INTEGER,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')

        cursor.execute('''
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
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE,
                job_id INTEGER,
                customer_id INTEGER,
                vehicle_id INTEGER,
                amount REAL,
                status TEXT,
                created_date TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')

        # Create new tables for detailed parts and labour information
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS parts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER,
                job_id INTEGER,
                part_number TEXT,
                description TEXT,
                quantity REAL,
                unit_price REAL,
                total_price REAL,
                supplier TEXT,
                created_date TEXT,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS labour (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER,
                job_id INTEGER,
                description TEXT,
                hours REAL,
                rate REAL,
                total_price REAL,
                technician TEXT,
                created_date TEXT,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS advisories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER,
                job_id INTEGER,
                vehicle_id INTEGER,
                description TEXT,
                severity TEXT,
                recommendation TEXT,
                created_date TEXT,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (job_id) REFERENCES jobs (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Database initialization error: {e}")
        return False

def get_db_connection():
    """Get database connection with error handling"""
    try:
        if not os.path.exists(DB_PATH):
            init_db()
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/dashboard')
def dashboard():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Get counts
        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM vehicles")
        vehicle_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(amount) FROM invoices WHERE status = 'PAID'")
        total_revenue = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM invoices")
        document_count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'customers': customer_count,
            'vehicles': vehicle_count,
            'revenue': total_revenue,
            'documents': document_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/customers')
def get_customers():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        search = request.args.get('search', '')
        
        cursor = conn.cursor()
        
        # Build query with search
        base_query = '''
            SELECT c.*, 
                   COUNT(DISTINCT v.id) as vehicle_count,
                   COUNT(DISTINCT i.id) as document_count,
                   MAX(i.created_date) as last_invoice
            FROM customers c
            LEFT JOIN vehicles v ON c.id = v.customer_id
            LEFT JOIN invoices i ON c.id = i.customer_id
        '''
        
        if search:
            base_query += " WHERE c.name LIKE ? OR c.company LIKE ? OR c.account_number LIKE ?"
            search_param = f'%{search}%'
            params = [search_param, search_param, search_param]
        else:
            params = []
        
        base_query += " GROUP BY c.id ORDER BY c.name"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Get paginated results
        offset = (page - 1) * per_page
        paginated_query = f"{base_query} LIMIT ? OFFSET ?"
        cursor.execute(paginated_query, params + [per_page, offset])
        
        customers = []
        for row in cursor.fetchall():
            customers.append({
                'id': row['id'],
                'account_number': row['account_number'],
                'name': row['name'],
                'company': row['company'],
                'address': row['address'],
                'postcode': row['postcode'],
                'phone': row['phone'],
                'email': row['email'],
                'vehicle_count': row['vehicle_count'],
                'document_count': row['document_count'],
                'last_invoice': format_date_for_display(row['last_invoice'])
            })
        
        conn.close()
        
        return jsonify({
            'customers': customers,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles')
def get_vehicles():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        search = request.args.get('search', '')
        
        cursor = conn.cursor()
        
        # Build query with search
        base_query = '''
            SELECT v.*, c.name as customer_name, c.company as customer_company,
                   MAX(j.created_date) as last_service
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            LEFT JOIN jobs j ON v.id = j.vehicle_id
        '''
        
        if search:
            base_query += " WHERE v.registration LIKE ? OR v.make LIKE ? OR v.model LIKE ?"
            search_param = f'%{search}%'
            params = [search_param, search_param, search_param]
        else:
            params = []
        
        base_query += " GROUP BY v.id ORDER BY v.registration"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Get paginated results
        offset = (page - 1) * per_page
        paginated_query = f"{base_query} LIMIT ? OFFSET ?"
        cursor.execute(paginated_query, params + [per_page, offset])
        
        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'id': row['id'],
                'registration': row['registration'],
                'make': row['make'],
                'model': row['model'],
                'color': row['color'],
                'fuel_type': row['fuel_type'],
                'mot_due': format_date_for_display(row['mot_due']),
                'mileage': row['mileage'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'last_service': format_date_for_display(row['last_service'])
            })
        
        conn.close()
        
        return jsonify({
            'vehicles': vehicles,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs')
def get_jobs():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            SELECT j.*, v.registration, c.name as customer_name, c.company as customer_company
            FROM jobs j
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            LEFT JOIN customers c ON j.customer_id = c.id
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
                'created_date': format_date_for_display(row['created_date'])
            })
        
        conn.close()
        return jsonify({'jobs': jobs})
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
                   j.description as job_description
            FROM invoices i
            LEFT JOIN vehicles v ON i.vehicle_id = v.id
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
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
                'amount': row['amount'],
                'status': row['status'],
                'created_date': format_date_for_display(row['created_date'])
            })
        
        conn.close()
        return jsonify({'invoices': invoices})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>')
def get_invoice_detail(invoice_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor()

        # Get invoice details with related data using explicit column aliases
        cursor.execute('''
            SELECT
                i.id as invoice_id,
                i.invoice_number,
                i.job_id,
                i.customer_id,
                i.vehicle_id,
                i.amount,
                i.status,
                i.created_date as invoice_date,
                v.id as vehicle_table_id,
                v.registration,
                v.make,
                v.model,
                v.color,
                v.fuel_type,
                v.mot_due,
                v.mileage,
                c.id as customer_table_id,
                c.account_number,
                c.name as customer_name,
                c.company as customer_company,
                c.address,
                c.postcode,
                c.phone,
                c.email,
                j.job_number,
                j.description as job_description,
                j.total_amount as job_total
            FROM invoices i
            LEFT JOIN vehicles v ON i.vehicle_id = v.id
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.id = ?
        ''', (invoice_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({'error': 'Invoice not found'}), 404

        # Build invoice object with proper data extraction
        invoice = {
            'id': row['invoice_id'],
            'invoice_number': row['invoice_number'],
            'job_id': row['job_id'],
            'customer_id': row['customer_id'],
            'vehicle_id': row['vehicle_id'],
            'amount': row['amount'],
            'status': row['status'],
            'created_date': format_date_for_display(row['invoice_date']),
            'is_locked': row['status'] in ['PAID', 'LOCKED'],  # Auto-lock paid invoices
            'vehicle': {
                'id': row['vehicle_id'],
                'registration': row['registration'] or '',
                'make': row['make'] or '',
                'model': row['model'] or '',
                'color': row['color'] or '',
                'fuel_type': row['fuel_type'] or '',
                'mileage': row['mileage'] or 0,
                'mot_due': format_date_for_display(row['mot_due']) if row['mot_due'] else '',
                'chassis': '',  # Not in current schema
                'engine_cc': ''  # Not in current schema
            },
            'customer': {
                'id': row['customer_id'],
                'account_number': row['account_number'] or '',
                'name': row['customer_name'] or '',
                'company': row['customer_company'] or '',
                'address': row['address'] or '',
                'postcode': row['postcode'] or '',
                'phone': row['phone'] or '',
                'email': row['email'] or ''
            },
            'job': {
                'id': row['job_id'],
                'job_number': row['job_number'] or '',
                'total_amount': row['job_total'] or 0
            },
            'description': row['job_description'] or '',
            'parts': [],  # Will be populated below
            'labour': [],  # Will be populated below
            'advisories': [],  # Will be populated below
            'history': []  # Service history for this vehicle
        }

        # Get parts for this invoice/job
        cursor.execute('''
            SELECT * FROM parts
            WHERE invoice_id = ? OR job_id = ?
            ORDER BY created_date DESC
        ''', (invoice_id, invoice['job_id']))

        parts = []
        for part_row in cursor.fetchall():
            parts.append({
                'id': part_row['id'],
                'part_number': part_row['part_number'] or '',
                'description': part_row['description'] or '',
                'quantity': part_row['quantity'] or 0,
                'unit_price': part_row['unit_price'] or 0,
                'total_price': part_row['total_price'] or 0,
                'supplier': part_row['supplier'] or '',
                'created_date': format_date_for_display(part_row['created_date'])
            })
        invoice['parts'] = parts

        # Get labour for this invoice/job
        cursor.execute('''
            SELECT * FROM labour
            WHERE invoice_id = ? OR job_id = ?
            ORDER BY created_date DESC
        ''', (invoice_id, invoice['job_id']))

        labour = []
        for labour_row in cursor.fetchall():
            labour.append({
                'id': labour_row['id'],
                'description': labour_row['description'] or '',
                'hours': labour_row['hours'] or 0,
                'rate': labour_row['rate'] or 0,
                'total_price': labour_row['total_price'] or 0,
                'technician': labour_row['technician'] or '',
                'created_date': format_date_for_display(labour_row['created_date'])
            })
        invoice['labour'] = labour

        # Get advisories for this invoice/job/vehicle
        cursor.execute('''
            SELECT * FROM advisories
            WHERE invoice_id = ? OR job_id = ? OR vehicle_id = ?
            ORDER BY created_date DESC
        ''', (invoice_id, invoice['job_id'], invoice['vehicle_id']))

        advisories = []
        for advisory_row in cursor.fetchall():
            advisories.append({
                'id': advisory_row['id'],
                'description': advisory_row['description'] or '',
                'severity': advisory_row['severity'] or 'INFO',
                'recommendation': advisory_row['recommendation'] or '',
                'created_date': format_date_for_display(advisory_row['created_date'])
            })
        invoice['advisories'] = advisories

        # Get service history for this vehicle
        if invoice['vehicle']['id']:
            cursor.execute('''
                SELECT
                    i2.created_date,
                    i2.invoice_number,
                    i2.amount,
                    i2.status,
                    j2.description,
                    j2.total_amount as job_amount,
                    v2.mileage
                FROM invoices i2
                LEFT JOIN jobs j2 ON i2.job_id = j2.id
                LEFT JOIN vehicles v2 ON i2.vehicle_id = v2.id
                WHERE i2.vehicle_id = ? AND i2.id != ?
                ORDER BY i2.created_date DESC
                LIMIT 10
            ''', (invoice['vehicle']['id'], invoice_id))

            history = []
            for hist_row in cursor.fetchall():
                history.append({
                    'date': format_date_for_display(hist_row['created_date']),
                    'doc_no': hist_row['invoice_number'],
                    'mileage': hist_row['mileage'] or 0,
                    'description': hist_row['description'] or 'Service',
                    'total': hist_row['amount'] or hist_row['job_amount'] or 0,
                    'status': hist_row['status']
                })
            invoice['history'] = history

        conn.close()
        return jsonify({'invoice': invoice})
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
        vehicles = []
        for row in cursor.fetchall():
            vehicle = dict(row)
            vehicle['mot_due'] = format_date_for_display(vehicle['mot_due'])
            vehicles.append(vehicle)
        
        # Get customer jobs
        cursor.execute('''
            SELECT j.*, v.registration 
            FROM jobs j 
            LEFT JOIN vehicles v ON j.vehicle_id = v.id 
            WHERE j.customer_id = ? 
            ORDER BY j.created_date DESC
        ''', (customer['id'],))
        jobs = []
        for row in cursor.fetchall():
            job = dict(row)
            job['created_date'] = format_date_for_display(job['created_date'])
            jobs.append(job)
        
        # Get customer invoices
        cursor.execute('''
            SELECT i.*, v.registration, j.description as job_description
            FROM invoices i 
            LEFT JOIN vehicles v ON i.vehicle_id = v.id 
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.customer_id = ? 
            ORDER BY i.created_date DESC
        ''', (customer['id'],))
        invoices = []
        for row in cursor.fetchall():
            invoice = dict(row)
            invoice['created_date'] = format_date_for_display(invoice['created_date'])
            invoices.append(invoice)
        
        conn.close()
        
        # Format customer dates
        customer_dict = dict(customer)
        customer_dict['created_date'] = format_date_for_display(customer_dict['created_date'])
        
        return jsonify({
            'customer': customer_dict,
            'vehicles': vehicles,
            'jobs': jobs,
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
            SELECT j.*, c.name as customer_name 
            FROM jobs j 
            LEFT JOIN customers c ON j.customer_id = c.id 
            WHERE j.vehicle_id = ? 
            ORDER BY j.created_date DESC
        ''', (vehicle['id'],))
        jobs = []
        for row in cursor.fetchall():
            job = dict(row)
            job['created_date'] = format_date_for_display(job['created_date'])
            jobs.append(job)
        
        # Get vehicle invoices
        cursor.execute('''
            SELECT i.*, j.description as job_description
            FROM invoices i 
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.vehicle_id = ? 
            ORDER BY i.created_date DESC
        ''', (vehicle['id'],))
        invoices = []
        for row in cursor.fetchall():
            invoice = dict(row)
            invoice['created_date'] = format_date_for_display(invoice['created_date'])
            invoices.append(invoice)
        
        conn.close()
        
        # Format vehicle dates
        vehicle_dict = dict(vehicle)
        vehicle_dict['mot_due'] = format_date_for_display(vehicle_dict['mot_due'])
        
        return jsonify({
            'vehicle': vehicle_dict,
            'jobs': jobs,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-date')
def test_date():
    """Test endpoint for date formatting"""
    test_date = '2020-07-10'
    formatted_date = format_date_for_display(test_date)
    return jsonify({
        'original': test_date,
        'formatted': formatted_date,
        'function_exists': 'format_date_for_display' in globals()
    })

@app.route('/api/health')
def health_check():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM vehicles")
        vehicle_count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'customers': customer_count,
            'vehicles': vehicle_count
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Initialize database on startup
init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)

