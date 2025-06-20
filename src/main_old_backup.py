#!/usr/bin/env python3
"""
Main entry point for the Garage Management System
Imports and runs the modular Flask application
"""

import os
import sys

from app import app

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the modular application

if __name__ == '__main__':
    print("🚀 Starting Integrated Garage Management System...")
    print("📊 Main interface: http://127.0.0.1:5001")
    print("🚗 MOT Reminders: http://127.0.0.1:5001/mot")
    print("📤 Upload interface: http://127.0.0.1:5001/upload")
    print("✅ All systems integrated and ready!")
    app.run(host='0.0.0.0', port=5001, debug=False)

# Import and register MOT blueprint
try:
    # Import from the mot_reminder directory
    mot_path = os.path.join(os.path.dirname(
        os.path.dirname(__file__)), 'mot_reminder')
    if mot_path not in sys.path:
        sys.path.insert(0, mot_path)

    # Import the MOT blueprint from the mot_reminder app
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "mot_app", os.path.join(mot_path, "app.py"))
    mot_app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mot_app)

    app.register_blueprint(mot_app.mot_bp)
    mot_app.init_mot_blueprint(app)
    print("✅ MOT Reminder system integrated successfully")
except ImportError as e:
    print(f"⚠️ MOT Reminder system not available: {e}")
except Exception as e:
    print(f"⚠️ Error integrating MOT system: {e}")

# Import and register Upload blueprint
try:
    from routes.upload_routes import upload_bp
    app.register_blueprint(upload_bp, url_prefix='/upload')
    print("✅ Upload blueprint registered successfully")
except ImportError as e:
    print(f"⚠️ Upload system not available: {e}")
except Exception as e:
    print(f"⚠️ Error integrating Upload system: {e}")

# Import and register Google Drive blueprint
try:
    from routes.google_drive_routes import google_drive_bp
    app.register_blueprint(google_drive_bp, url_prefix='/google-drive')
    print("✅ Google Drive blueprint registered successfully")
except ImportError as e:
    print(f"⚠️ Google Drive system not available: {e}")
except Exception as e:
    print(f"⚠️ Error integrating Google Drive system: {e}")

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


@app.route('/health')
def health_check():
    """Health check endpoint for monitoring and load balancers"""
    try:
        # Test database connection
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            db_status = "healthy"
        else:
            db_status = "unhealthy"

        # Check if MOT system is available
        mot_status = "available" if 'mot_bp' in [
            bp.name for bp in app.blueprints.values()] else "unavailable"

        status = {
            "status": "healthy" if db_status == "healthy" else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "database": db_status,
            "mot_system": mot_status,
            "uptime": "running"
        }

        return jsonify(status), 200 if status["status"] == "healthy" else 503

    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }), 503


@app.route('/test')
def test():
    return "<h1>Test Route Working</h1><script>alert('Test route JavaScript');</script>"


@app.route('/legacy')
def legacy():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/modern')
def modern_dashboard():
    from flask import render_template
    return render_template('dashboard/modern.html')


@app.route('/mot-dashboard')
def mot_dashboard():
    try:
        return render_template('mot_dashboard.html')
    except Exception as e:
        print(f"Error rendering MOT dashboard: {e}")
        return f"<h1>MOT Dashboard</h1><p>Template error: {e}</p>", 500


@app.route('/sms-centre')
def sms_centre():
    try:
        return render_template('sms_centre.html')
    except Exception as e:
        print(f"Error rendering SMS centre: {e}")
        return f"<h1>SMS Centre</h1><p>Template error: {e}</p>", 500


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

        cursor.execute(
            "SELECT SUM(amount) FROM invoices WHERE status = 'PAID'")
        total_revenue = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM invoices")
        document_count = cursor.fetchone()[0]

        conn.close()

        return jsonify({
            'success': True,
            'stats': {
                'customers': customer_count,
                'vehicles': vehicle_count,
                'revenue': total_revenue,
                'documents': document_count
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add alias for /api/stats (frontend expects this endpoint)


@app.route('/api/stats')
def stats():
    return dashboard()


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
            'success': True,
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
            'success': True,
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
        return jsonify({
            'success': True,
            'jobs': jobs
        })
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
        return jsonify({
            'success': True,
            'invoices': invoices
        })
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
                i.is_locked,
                i.vat_amount,
                i.total_amount,
                i.due_date,
                i.paid_date,
                i.payment_method,
                i.notes,
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
            'is_locked': bool(row['is_locked']) if row['is_locked'] is not None else (row['status'] in ['PAID', 'LOCKED']),
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
        cursor.execute(
            "SELECT * FROM customers WHERE id = ? OR account_number = ?", (customer_id, customer_id))
        customer = cursor.fetchone()

        if not customer:
            return jsonify({
                'success': False,
                'error': 'Customer not found',
                'message': f'No customer found with ID or account number: {customer_id}'
            }), 200

        # Get customer vehicles
        cursor.execute(
            "SELECT * FROM vehicles WHERE customer_id = ?", (customer['id'],))
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
            invoice['created_date'] = format_date_for_display(
                invoice['created_date'])
            invoices.append(invoice)

        conn.close()

        # Format customer dates
        customer_dict = dict(customer)
        customer_dict['created_date'] = format_date_for_display(
            customer_dict['created_date'])

        return jsonify({
            'success': True,
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
            invoice['created_date'] = format_date_for_display(
                invoice['created_date'])
            invoices.append(invoice)

        conn.close()

        # Format vehicle dates
        vehicle_dict = dict(vehicle)
        vehicle_dict['mot_due'] = format_date_for_display(
            vehicle_dict['mot_due'])

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
def api_health_check():
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

# SMS Centre API endpoints


@app.route('/api/mot/sms/send-bulk', methods=['POST'])
def send_bulk_sms():
    """Send bulk SMS to selected vehicles"""
    try:
        data = request.get_json()
        registrations = data.get('registrations', [])

        if not registrations:
            return jsonify({'success': False, 'error': 'No vehicles selected'}), 400

        # Import MOT service to send SMS
        from mot_service import IntegratedMOTService
        mot_service = IntegratedMOTService()

        if not mot_service.sms_service:
            return jsonify({'success': False, 'error': 'SMS service not available'}), 503

        # Get vehicle data for selected registrations
        vehicles = mot_service.get_all_mot_vehicles(
            include_flagged=True, include_archived=False)
        selected_vehicles = [v for v in vehicles if v['registration']
                             in registrations and v.get('mobile_number')]

        if not selected_vehicles:
            return jsonify({'success': False, 'error': 'No vehicles with mobile numbers found'}), 400

        # Send bulk SMS
        sent_count = 0
        failed_count = 0
        errors = []

        for vehicle in selected_vehicles:
            try:
                result = mot_service.sms_service.send_mot_reminder(
                    vehicle_info=vehicle,
                    mobile_number=vehicle['mobile_number'],
                    customer_name=vehicle.get('customer_name')
                )

                if result['success']:
                    sent_count += 1
                else:
                    failed_count += 1
                    errors.append(
                        f"{vehicle['registration']}: {result.get('error', 'Unknown error')}")

            except Exception as e:
                failed_count += 1
                errors.append(f"{vehicle['registration']}: {str(e)}")

        return jsonify({
            'success': True,
            'sent': sent_count,
            'failed': failed_count,
            'errors': errors[:5]  # Limit error messages
        })

    except Exception as e:
        print(f"Error in send_bulk_sms: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/mot/sms/send', methods=['POST'])
def send_single_sms():
    """Send SMS to a single vehicle"""
    try:
        data = request.get_json()
        registration = data.get('registration')
        mobile_number = data.get('mobile_number')
        customer_name = data.get('customer_name', '')

        if not registration or not mobile_number:
            return jsonify({'success': False, 'error': 'Registration and mobile number required'}), 400

        # Import MOT service to send SMS
        from mot_service import IntegratedMOTService
        mot_service = IntegratedMOTService()

        if not mot_service.sms_service:
            return jsonify({'success': False, 'error': 'SMS service not available'}), 503

        # Get vehicle data
        vehicles = mot_service.get_all_mot_vehicles(
            include_flagged=True, include_archived=False)
        vehicle = next(
            (v for v in vehicles if v['registration'] == registration), None)

        if not vehicle:
            return jsonify({'success': False, 'error': 'Vehicle not found'}), 404

        # Send SMS
        result = mot_service.sms_service.send_mot_reminder(
            vehicle_info=vehicle,
            mobile_number=mobile_number,
            customer_name=customer_name
        )

        return jsonify(result)

    except Exception as e:
        print(f"Error in send_single_sms: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/mot/sms/history')
def get_sms_history():
    """Get SMS history"""
    try:
        # Import MOT service to get SMS history
        from mot_service import IntegratedMOTService
        mot_service = IntegratedMOTService()

        # Get SMS history from database
        import sqlite3
        conn = sqlite3.connect(mot_service.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT vehicle_registration, customer_name, mobile_number,
                   message_type, status, sent_at
            FROM mot_reminders_log
            ORDER BY sent_at DESC
            LIMIT 100
        ''')

        history = []
        for row in cursor.fetchall():
            history.append({
                'registration': row[0],
                'customer_name': row[1],
                'mobile_number': row[2],
                'message_type': row[3],
                'status': row[4],
                'sent_at': row[5]
            })

        conn.close()

        return jsonify({
            'success': True,
            'history': history,
            'count': len(history)
        })

    except Exception as e:
        print(f"Error in get_sms_history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Note: MOT API endpoints are now handled by the MOT blueprint at /mot/api/*


# Error Monitoring and Reporting Endpoints
@app.route('/api/error-reports', methods=['POST'])
def receive_error_report():
    """Receive error reports from the client-side monitoring system"""
    try:
        # Handle both JSON and form data to fix Content-Type issues
        if request.is_json:
            data = request.get_json()
        else:
            # Try to parse as JSON even if Content-Type is not set correctly
            try:
                data = request.get_json(force=True)
            except:
                # Fallback to form data
                data = request.form.to_dict()

        if not data:
            return jsonify({'error': 'No data received'}), 400

        # Create logs directory if it doesn't exist
        import os
        os.makedirs('logs', exist_ok=True)

        # Log the error report
        import json
        from datetime import datetime

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'report': data,
            'user_agent': request.headers.get('User-Agent', ''),
            'ip_address': request.remote_addr
        }

        log_file = os.path.join('logs', 'error_reports.json')

        # Read existing logs
        logs = []
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    logs = json.load(f)
            except:
                logs = []

        # Add new log entry
        logs.append(log_entry)

        # Keep only last 1000 entries
        logs = logs[-1000:]

        # Write back to file
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)

        return jsonify({'success': True, 'message': 'Error report received'})

    except Exception as e:
        print(f"❌ Error processing error report: {e}")
        return jsonify({'error': 'Failed to process report'}), 500


@app.route('/api/error-reports', methods=['GET'])
def get_error_reports():
    """Get recent error reports for dashboard"""
    try:
        import json
        import os

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

        # Sort by timestamp (newest first) and limit
        filtered_logs = sorted(filtered_logs, key=lambda x: x.get(
            'timestamp', ''), reverse=True)[:limit]

        return jsonify({
            'reports': filtered_logs,
            'total': len(logs),
            'filtered': len(filtered_logs)
        })

    except Exception as e:
        print(f"❌ Error retrieving error reports: {e}")
        return jsonify({'error': 'Failed to retrieve reports'}), 500

# Phase 3 Feature Endpoints (Placeholder implementations)


@app.route('/api/jobs/kanban')
def get_jobs_kanban():
    """Get jobs in kanban format - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'columns': [
            {'id': 'pending', 'title': 'Pending', 'jobs': []},
            {'id': 'in_progress', 'title': 'In Progress', 'jobs': []},
            {'id': 'completed', 'title': 'Completed', 'jobs': []}
        ],
        'message': 'Kanban board feature coming in Phase 3'
    })


@app.route('/api/technicians')
def get_technicians():
    """Get technicians - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'technicians': [],
        'message': 'Technician management feature coming in Phase 3'
    })


@app.route('/api/workshop-bays')
def get_workshop_bays():
    """Get workshop bays - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'bays': [],
        'message': 'Workshop bay management feature coming in Phase 3'
    })


@app.route('/api/appointments')
def get_appointments():
    """Get appointments - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'appointments': [],
        'message': 'Appointment scheduling feature coming in Phase 3'
    })


@app.route('/api/job-sheet-templates')
def get_job_sheet_templates():
    """Get job sheet templates - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'templates': [],
        'message': 'Job sheet templates feature coming in Phase 3'
    })


@app.route('/api/job-sheets')
def get_job_sheets():
    """Get job sheets - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'job_sheets': [],
        'message': 'Digital job sheets feature coming in Phase 3'
    })


@app.route('/api/quotes')
def get_quotes():
    """Get quotes - placeholder for Phase 3"""
    return jsonify({
        'success': True,
        'quotes': [],
        'message': 'Quotes & estimates feature coming in Phase 3'
    })


# Initialize database on startup
init_db()

if __name__ == '__main__':
    print("🚀 Starting Integrated Garage Management System...")
    print("📊 Main interface: http://127.0.0.1:5001")
    print("🚗 MOT Reminders: http://127.0.0.1:5001/mot")
    print("📤 Upload interface: http://127.0.0.1:5001/upload")
    print("✅ All systems integrated and ready!")
    app.run(host='0.0.0.0', port=5001, debug=False)
