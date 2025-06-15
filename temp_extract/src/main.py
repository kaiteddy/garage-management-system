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
        
        # Check if we have data
        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]
        
        if customer_count == 0:
            # Insert sample data
            sample_customers = [
                ('ACM001', 'A.c.m Autos Limited', 'A.c.m Autos Limited', '14 Holmfield Avenue, Hendon, London', 'NW4 2LN', '07816768877', 'info@acmautos.com', '2023-01-15'),
                ('ACM002', 'Acm Sparks Ltd', 'Acm Sparks Ltd', '241 Haydons Road, London', 'SW19 8TY', '07904651884', 'contact@acmsparks.com', '2023-02-20'),
                ('ACT001', 'Action 365', 'Action 365', '592 North End Road Finchley Road, Golders Green, London', 'NW11 7RX', '07903771232', 'info@action365.com', '2023-03-10'),
                ('ADM001', 'Admiral Insurance', 'Admiral Insurance', '5 Glenham Road, London', 'SW13 9JB', '07812147078', 'claims@admiral.com', '2023-04-05'),
                ('AGE001', 'Ageas Insurance Limited', 'Ageas Insurance Limited', '12 Priory Avenue, Wembley', 'HA0 2SB', '07342212131', 'support@ageas.com', '2023-05-12'),
                ('ALE001', 'Alex', 'Alex', '26 Midford House, Hendon, London', 'NW4 2BG', '07751865149', 'alex@email.com', '2023-06-18'),
                ('ALI001', 'Alice', 'Alice', '18a Nant Road, Granville Place, London', 'NW2 2AT', '07398201776', 'alice@email.com', '2023-07-22'),
                ('UNA001', 'Unal Altun', 'Unal Altun', '1 Forest Way, London', 'N19 5XG', '07506577918', 'unal@email.com', '2023-08-15'),
                ('JOE001', 'Joel Alterman', 'Joel Alterman', '14 Lodge Road, Hendon, London', 'NW4 4EF', '07968437789', 'joel@email.com', '2023-09-10'),
                ('AMA001', 'Amanda', 'Amanda', 'Mob: 07891234850', '', '', '07891234850', 'amanda@email.com', '2023-10-05')
            ]
            
            cursor.executemany('''
                INSERT INTO customers (account_number, name, company, address, postcode, phone, email, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', sample_customers)
            
            sample_vehicles = [
                ('EY20VBO', 'Volkswagen', 'Polo Match Tsi Dsg', 'Grey', 'Petrol', '2024-03-15', 16967, 1),
                ('Y905SLB', 'Ford', 'Focus', 'Blue', 'Petrol', '2024-06-20', 125789, 2),
                ('BF51XYZ', 'Vauxhall', 'Astra', 'Silver', 'Petrol', '2024-08-12', 67234, 3),
                ('LE21FXA', 'Skoda', 'Kodiaq Se L Tsi Dsg', 'White', 'Petrol', '2024-09-03', 12469, 4),
                ('KF69HTE', 'Mercedes', 'Gle-Class Gle', 'Black', 'Diesel', '2024-05-04', 30045, 5),
                ('RV02ATF', 'Rover', '25', 'Red', 'Petrol', '2024-07-18', 89456, 6),
                ('WX51ABC', 'BMW', '320i', 'Blue', 'Petrol', '2024-11-22', 45678, 7),
                ('DE03XYZ', 'Audi', 'A4', 'Black', 'Diesel', '2024-12-15', 78901, 8),
                ('FG55DEF', 'Toyota', 'Corolla', 'White', 'Hybrid', '2024-10-30', 23456, 9),
                ('HI07GHI', 'Honda', 'Civic', 'Silver', 'Petrol', '2024-09-25', 56789, 10)
            ]
            
            cursor.executemany('''
                INSERT INTO vehicles (registration, make, model, color, fuel_type, mot_due, mileage, customer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', sample_vehicles)
            
            sample_jobs = [
                ('J001', 1, 1, 'Carry Out Mot Repairs - Remove Rear Offside Seat Assembly', 'COMPLETED', 678.00, '2025-01-16'),
                ('J002', 1, 1, 'Carry Out Mot', 'COMPLETED', 45.00, '2025-01-08'),
                ('J003', 2, 2, 'Annual Service', 'COMPLETED', 150.00, '2024-12-15'),
                ('J004', 3, 3, 'Brake Pad Replacement', 'COMPLETED', 120.00, '2024-11-20'),
                ('J005', 4, 4, 'Oil Change', 'COMPLETED', 80.00, '2024-10-25'),
                ('J006', 5, 5, 'MOT Test', 'COMPLETED', 45.00, '2024-09-30'),
                ('J007', 6, 6, 'Timing Belt Replacement', 'COMPLETED', 350.00, '2024-08-15'),
                ('J008', 7, 7, 'Clutch Repair', 'IN_PROGRESS', 450.00, '2024-12-01'),
                ('J009', 8, 8, 'Exhaust System Repair', 'PENDING', 200.00, '2024-11-10'),
                ('J010', 9, 9, 'Battery Replacement', 'COMPLETED', 90.00, '2024-10-05')
            ]
            
            cursor.executemany('''
                INSERT INTO jobs (job_number, vehicle_id, customer_id, description, status, total_amount, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', sample_jobs)
            
            sample_invoices = [
                ('88187', 1, 1, 1, 678.00, 'PARTIAL', '2025-01-16'),
                ('88139', 2, 1, 1, 45.00, 'PAID', '2025-01-08'),
                ('87542', 3, 2, 2, 150.00, 'PAID', '2024-12-15'),
                ('86916', 4, 3, 3, 120.00, 'PAID', '2024-11-20'),
                ('86001', 5, 4, 4, 80.00, 'PAID', '2024-10-25'),
                ('85789', 6, 5, 5, 45.00, 'PAID', '2024-09-30'),
                ('85234', 7, 6, 6, 350.00, 'PAID', '2024-08-15'),
                ('84567', 8, 7, 7, 450.00, 'PENDING', '2024-12-01'),
                ('84123', 9, 8, 8, 200.00, 'PENDING', '2024-11-10'),
                ('83890', 10, 9, 9, 90.00, 'PAID', '2024-10-05')
            ]
            
            cursor.executemany('''
                INSERT INTO invoices (invoice_number, job_id, customer_id, vehicle_id, amount, status, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', sample_invoices)
        
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
                'last_invoice': row['last_invoice']
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
                'mot_due': row['mot_due'],
                'mileage': row['mileage'],
                'customer_name': row['customer_name'],
                'customer_company': row['customer_company'],
                'last_service': row['last_service']
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
                'created_date': row['created_date']
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
            SELECT j.*, v.registration 
            FROM jobs j 
            LEFT JOIN vehicles v ON j.vehicle_id = v.id 
            WHERE j.customer_id = ? 
            ORDER BY j.created_date DESC
        ''', (customer['id'],))
        jobs = [dict(row) for row in cursor.fetchall()]
        
        # Get customer invoices
        cursor.execute('''
            SELECT i.*, v.registration, j.description as job_description
            FROM invoices i 
            LEFT JOIN vehicles v ON i.vehicle_id = v.id 
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.customer_id = ? 
            ORDER BY i.created_date DESC
        ''', (customer['id'],))
        invoices = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'customer': dict(customer),
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
        jobs = [dict(row) for row in cursor.fetchall()]
        
        # Get vehicle invoices
        cursor.execute('''
            SELECT i.*, j.description as job_description
            FROM invoices i 
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.vehicle_id = ? 
            ORDER BY i.created_date DESC
        ''', (vehicle['id'],))
        invoices = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'vehicle': dict(vehicle),
            'jobs': jobs,
            'invoices': invoices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    app.run(host='0.0.0.0', port=5000, debug=False)

