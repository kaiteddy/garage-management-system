"""
Unified API Routes
Provides missing API endpoints for the integrated system
"""

import os
import sqlite3
from datetime import datetime

from flask import Blueprint, jsonify, request

unified_api_bp = Blueprint('unified_api', __name__)


def get_unified_db_path():
    """Get the unified database path"""
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'garage_management.db')


@unified_api_bp.route('/api/customers')
def get_customers():
    """Get all customers from unified database"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Get customers with proper column handling for actual schema
            cursor.execute('''
                SELECT
                    id,
                    COALESCE(first_name, '') as first_name,
                    COALESCE(last_name, '') as last_name,
                    COALESCE(name, first_name || ' ' || last_name, '') as name,
                    COALESCE(email, '') as email,
                    COALESCE(phone_primary, mobile, '') as phone,
                    COALESCE(address_line1, address, '') as address,
                    COALESCE(postcode, '') as postcode,
                    COALESCE(is_active, 1) as is_active,
                    created_at
                FROM customers
                WHERE COALESCE(is_active, 1) = 1
                ORDER BY id DESC
                LIMIT 100
            ''')

            customers = []
            for row in cursor.fetchall():
                customers.append({
                    'id': row[0],
                    # Generate account number
                    'account_number': f"CUST{row[0]:04d}",
                    'first_name': row[1],
                    'last_name': row[2],
                    'name': row[3],
                    'email': row[4],
                    'phone': row[5],
                    'address': row[6],
                    'postcode': row[7],
                    'is_active': bool(row[8]),
                    'created_at': row[9]
                })

            return jsonify({
                'success': True,
                'customers': customers,
                'count': len(customers)
            })

    except Exception as e:
        print(f"Error getting customers: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@unified_api_bp.route('/api/vehicles')
def get_vehicles():
    """Get all vehicles from unified database"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Get vehicles with customer information
            cursor.execute('''
                SELECT 
                    v.id,
                    v.registration,
                    COALESCE(v.make, '') as make,
                    COALESCE(v.model, '') as model,
                    COALESCE(v.year, 0) as year,
                    COALESCE(v.colour, v.color, '') as colour,
                    COALESCE(v.fuel_type, '') as fuel_type,
                    v.mot_expiry,
                    v.tax_due,
                    COALESCE(v.mileage, 0) as mileage,
                    v.customer_id,
                    v.created_at,
                    COALESCE(c.first_name || ' ' || c.last_name, c.name, '') as customer_name,
                    '' as customer_account
                FROM vehicles v
                LEFT JOIN customers c ON v.customer_id = c.id
                WHERE COALESCE(v.is_active, 1) = 1
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
                    'colour': row[5],
                    'fuel_type': row[6],
                    'mot_expiry': row[7],
                    'tax_due': row[8],
                    'mileage': row[9],
                    'customer_id': row[10],
                    'created_at': row[11],
                    'customer_name': row[12],
                    'customer_account': row[13]
                })

            return jsonify({
                'success': True,
                'vehicles': vehicles,
                'count': len(vehicles)
            })

    except Exception as e:
        print(f"Error getting vehicles: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@unified_api_bp.route('/api/customers/<int:customer_id>')
def get_customer(customer_id):
    """Get specific customer details"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Get customer details
            cursor.execute('''
                SELECT
                    id, first_name, last_name, name, email,
                    phone_primary, mobile, address_line1, address, postcode,
                    is_active, created_at
                FROM customers
                WHERE id = ?
            ''', (customer_id,))

            row = cursor.fetchone()
            if not row:
                return jsonify({
                    'success': False,
                    'error': 'Customer not found'
                }), 404

            customer = {
                'id': row[0],
                # Generate account number
                'account_number': f"CUST{row[0]:04d}",
                'first_name': row[1] or '',
                'last_name': row[2] or '',
                'name': row[3] or f"{row[1] or ''} {row[2] or ''}".strip(),
                'email': row[4] or '',
                'phone': row[5] or row[6] or '',
                'address': row[7] or row[8] or '',
                'postcode': row[9] or '',
                'is_active': bool(row[10] if row[10] is not None else 1),
                'created_at': row[11]
            }

            # Get customer's vehicles
            cursor.execute('''
                SELECT id, registration, make, model, year, colour, color
                FROM vehicles 
                WHERE customer_id = ? AND COALESCE(is_active, 1) = 1
            ''', (customer_id,))

            vehicles = []
            for v_row in cursor.fetchall():
                vehicles.append({
                    'id': v_row[0],
                    'registration': v_row[1],
                    'make': v_row[2] or '',
                    'model': v_row[3] or '',
                    'year': v_row[4] or 0,
                    'colour': v_row[5] or v_row[6] or ''
                })

            return jsonify({
                'success': True,
                'customer': customer,
                'vehicles': vehicles
            })

    except Exception as e:
        print(f"Error getting customer {customer_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@unified_api_bp.route('/api/vehicles/<int:vehicle_id>')
def get_vehicle(vehicle_id):
    """Get specific vehicle details"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Get vehicle details with customer info
            cursor.execute('''
                SELECT 
                    v.id, v.registration, v.make, v.model, v.year, v.colour, v.color,
                    v.fuel_type, v.mot_expiry, v.tax_due, v.mileage, v.customer_id,
                    v.created_at, v.vin, v.engine_size,
                    c.first_name, c.last_name, c.name, c.email, c.phone_primary, c.mobile
                FROM vehicles v
                LEFT JOIN customers c ON v.customer_id = c.id
                WHERE v.id = ?
            ''', (vehicle_id,))

            row = cursor.fetchone()
            if not row:
                return jsonify({
                    'success': False,
                    'error': 'Vehicle not found'
                }), 404

            vehicle = {
                'id': row[0],
                'registration': row[1],
                'make': row[2] or '',
                'model': row[3] or '',
                'year': row[4] or 0,
                'colour': row[5] or row[6] or '',
                'fuel_type': row[7] or '',
                'mot_expiry': row[8],
                'tax_due': row[9],
                'mileage': row[10] or 0,
                'customer_id': row[11],
                'created_at': row[12],
                'vin': row[13] or '',
                'engine_size': row[14] or '',
                'customer': {
                    'name': row[17] or f"{row[15] or ''} {row[16] or ''}".strip(),
                    'email': row[18] or '',
                    'phone': row[19] or row[20] or ''
                } if row[11] else None
            }

            return jsonify({
                'success': True,
                'vehicle': vehicle
            })

    except Exception as e:
        print(f"Error getting vehicle {vehicle_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# JOBS API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/jobs')
def get_jobs():
    """Get all jobs from unified database"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Check if jobs table exists, create if not
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'")
            if not cursor.fetchone():
                cursor.execute('''
                    CREATE TABLE jobs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        job_number TEXT UNIQUE,
                        customer_id INTEGER,
                        vehicle_id INTEGER,
                        description TEXT,
                        status TEXT DEFAULT 'pending',
                        priority TEXT DEFAULT 'normal',
                        assigned_technician INTEGER,
                        estimated_hours REAL,
                        actual_hours REAL,
                        labour_cost REAL DEFAULT 0,
                        parts_cost REAL DEFAULT 0,
                        total_amount REAL DEFAULT 0,
                        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        started_date TIMESTAMP,
                        completed_date TIMESTAMP,
                        due_date DATE,
                        notes TEXT,
                        internal_notes TEXT,
                        customer_authorization BOOLEAN DEFAULT 0,
                        bay_number INTEGER,
                        FOREIGN KEY (customer_id) REFERENCES customers (id),
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                        FOREIGN KEY (assigned_technician) REFERENCES technicians (id)
                    )
                ''')
                conn.commit()

            # Get jobs with customer and vehicle information
            cursor.execute('''
                SELECT
                    j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                    j.status, j.priority, j.assigned_technician, j.estimated_hours, j.actual_hours,
                    j.labour_cost, j.parts_cost, j.total_amount,
                    j.created_date, j.started_date, j.completed_date, j.due_date,
                    j.notes, j.internal_notes, j.customer_authorization, j.bay_number,
                    COALESCE(c.first_name || ' ' || c.last_name, c.name, '') as customer_name,
                    v.registration, v.make, v.model,
                    COALESCE(t.first_name || ' ' || t.last_name, '') as technician_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                LEFT JOIN technicians t ON j.assigned_technician = t.id
                ORDER BY j.created_date DESC
                LIMIT 100
            ''')

            jobs = []
            for row in cursor.fetchall():
                jobs.append({
                    'id': row[0],
                    'job_number': row[1] or f"JOB{row[0]:04d}",
                    'customer_id': row[2],
                    'vehicle_id': row[3],
                    'description': row[4] or '',
                    'status': row[5] or 'pending',
                    'priority': row[6] or 'normal',
                    'assigned_technician': row[7],
                    'estimated_hours': row[8] or 0,
                    'actual_hours': row[9] or 0,
                    'labour_cost': row[10] or 0,
                    'parts_cost': row[11] or 0,
                    'total_amount': row[12] or 0,
                    'created_date': row[13],
                    'started_date': row[14],
                    'completed_date': row[15],
                    'due_date': row[16],
                    'notes': row[17] or '',
                    'internal_notes': row[18] or '',
                    'customer_authorization': bool(row[19]),
                    'bay_number': row[20],
                    'customer_name': row[21],
                    'vehicle_registration': row[22],
                    'vehicle_make': row[23],
                    'vehicle_model': row[24],
                    'technician_name': row[25]
                })

            return jsonify({
                'success': True,
                'jobs': jobs,
                'count': len(jobs)
            })

    except Exception as e:
        print(f"Error getting jobs: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@unified_api_bp.route('/api/jobs/<int:job_id>')
def get_job(job_id):
    """Get specific job details"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT
                    j.id, j.job_number, j.customer_id, j.vehicle_id, j.description,
                    j.status, j.priority, j.assigned_technician, j.estimated_hours, j.actual_hours,
                    j.labour_cost, j.parts_cost, j.total_amount,
                    j.created_date, j.started_date, j.completed_date, j.due_date,
                    j.notes, j.internal_notes, j.customer_authorization, j.bay_number,
                    COALESCE(c.first_name || ' ' || c.last_name, c.name, '') as customer_name,
                    COALESCE(c.phone_primary, c.mobile, '') as customer_phone,
                    COALESCE(c.email, '') as customer_email,
                    v.registration, v.make, v.model, v.year,
                    COALESCE(t.first_name || ' ' || t.last_name, '') as technician_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                LEFT JOIN technicians t ON j.assigned_technician = t.id
                WHERE j.id = ?
            ''', (job_id,))

            row = cursor.fetchone()
            if not row:
                return jsonify({
                    'success': False,
                    'error': 'Job not found'
                }), 404

            job = {
                'id': row[0],
                'job_number': row[1] or f"JOB{row[0]:04d}",
                'customer_id': row[2],
                'vehicle_id': row[3],
                'description': row[4] or '',
                'status': row[5] or 'pending',
                'priority': row[6] or 'normal',
                'assigned_technician': row[7],
                'estimated_hours': row[8] or 0,
                'actual_hours': row[9] or 0,
                'labour_cost': row[10] or 0,
                'parts_cost': row[11] or 0,
                'total_amount': row[12] or 0,
                'created_date': row[13],
                'started_date': row[14],
                'completed_date': row[15],
                'due_date': row[16],
                'notes': row[17] or '',
                'internal_notes': row[18] or '',
                'customer_authorization': bool(row[19]),
                'bay_number': row[20],
                'customer': {
                    'name': row[21],
                    'phone': row[22],
                    'email': row[23]
                } if row[2] else None,
                'vehicle': {
                    'registration': row[24],
                    'make': row[25],
                    'model': row[26],
                    'year': row[27]
                } if row[3] else None,
                'technician': {
                    'name': row[28]
                } if row[7] else None
            }

            return jsonify({
                'success': True,
                'job': job
            })

    except Exception as e:
        print(f"Error getting job {job_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@unified_api_bp.route('/api/health')
def api_health():
    """API health check"""
    try:
        db_path = get_unified_db_path()
        db_available = os.path.exists(db_path)

        # Test database connection
        if db_available:
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM customers")
                customer_count = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM vehicles")
                vehicle_count = cursor.fetchone()[0]
        else:
            customer_count = 0
            vehicle_count = 0

        return jsonify({
            'success': True,
            'service': 'Unified API',
            'status': 'healthy',
            'database_available': db_available,
            'statistics': {
                'customers': customer_count,
                'vehicles': vehicle_count
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# APPOINTMENTS API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/appointments')
def get_appointments():
    """Get appointments with optional date filtering"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        customer_id = request.args.get('customer_id')

        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Build query with filters - using actual schema
            query = '''
                SELECT
                    a.id, a.customer_id, a.vehicle_id, a.technician,
                    a.appointment_date, a.appointment_time, a.estimated_duration,
                    a.service_type, a.description, a.status,
                    a.created_at, a.notes,
                    COALESCE(c.first_name || ' ' || c.last_name, c.name, '') as customer_name,
                    COALESCE(c.phone_primary, c.mobile, '') as customer_phone,
                    v.registration, v.make, v.model
                FROM appointments a
                LEFT JOIN customers c ON a.customer_id = c.id
                LEFT JOIN vehicles v ON a.vehicle_id = v.id
                WHERE 1=1
            '''

            params = []
            if start_date:
                query += " AND a.appointment_date >= ?"
                params.append(start_date)
            if end_date:
                query += " AND a.appointment_date <= ?"
                params.append(end_date)
            if customer_id:
                query += " AND a.customer_id = ?"
                params.append(customer_id)

            query += " ORDER BY a.appointment_date, a.appointment_time LIMIT 100"

            cursor.execute(query, params)

            appointments = []
            for row in cursor.fetchall():
                appointments.append({
                    'id': row[0],
                    'customer_id': row[1],
                    'vehicle_id': row[2],
                    'technician': row[3] or '',
                    'appointment_date': row[4],
                    'appointment_time': row[5],
                    'estimated_duration': row[6] or 0,
                    'service_type': row[7] or '',
                    'description': row[8] or '',
                    'status': row[9] or 'scheduled',
                    'created_at': row[10],
                    'notes': row[11] or '',
                    'customer': {
                        'name': row[12],
                        'phone': row[13]
                    } if row[12] else None,
                    'vehicle': {
                        'registration': row[14],
                        'make': row[15],
                        'model': row[16]
                    } if row[14] else None
                })

            return jsonify({
                'success': True,
                'appointments': appointments,
                'count': len(appointments),
                'filters': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'customer_id': customer_id
                }
            })

    except Exception as e:
        print(f"Error getting appointments: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# TECHNICIANS API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/technicians')
def get_technicians():
    """Get all technicians"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT
                    id, first_name, last_name, email, phone, specializations, hourly_rate,
                    is_active, created_at
                FROM technicians
                WHERE COALESCE(is_active, 1) = 1
                ORDER BY first_name, last_name
            ''')

            technicians = []
            for row in cursor.fetchall():
                technicians.append({
                    'id': row[0],
                    'first_name': row[1] or '',
                    'last_name': row[2] or '',
                    'name': f"{row[1] or ''} {row[2] or ''}".strip(),
                    'email': row[3] or '',
                    'phone': row[4] or '',
                    'specializations': row[5] or '',
                    'hourly_rate': row[6] or 0,
                    'is_active': bool(row[7] if row[7] is not None else 1),
                    'created_at': row[8]
                })

            return jsonify({
                'success': True,
                'technicians': technicians,
                'count': len(technicians)
            })

    except Exception as e:
        print(f"Error getting technicians: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# WORKSHOP BAYS API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/workshop-bays')
def get_workshop_bays():
    """Get all workshop bays"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT
                    id, bay_name, bay_type, is_available,
                    equipment, notes, created_at
                FROM workshop_bays
                WHERE COALESCE(is_available, 1) = 1
                ORDER BY bay_name
            ''')

            bays = []
            for row in cursor.fetchall():
                bays.append({
                    'id': row[0],
                    'bay_name': row[1] or '',
                    'bay_type': row[2] or 'general',
                    'is_available': bool(row[3] if row[3] is not None else 1),
                    'equipment': row[4] or '',
                    'notes': row[5] or '',
                    'created_at': row[6]
                })

            return jsonify({
                'success': True,
                'workshop_bays': bays,
                'count': len(bays)
            })

    except Exception as e:
        print(f"Error getting workshop bays: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# QUOTES API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/quotes')
def get_quotes():
    """Get all quotes"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Check if quotes table exists, create if not
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='quotes'")
            if not cursor.fetchone():
                cursor.execute('''
                    CREATE TABLE quotes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        quote_number TEXT UNIQUE,
                        customer_id INTEGER,
                        vehicle_id INTEGER,
                        description TEXT,
                        status TEXT DEFAULT 'pending',
                        labour_cost REAL DEFAULT 0,
                        parts_cost REAL DEFAULT 0,
                        total_amount REAL DEFAULT 0,
                        valid_until DATE,
                        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        notes TEXT,
                        FOREIGN KEY (customer_id) REFERENCES customers (id),
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                    )
                ''')
                conn.commit()

            cursor.execute('''
                SELECT
                    q.id, q.quote_number, q.customer_id, q.vehicle_id, q.description,
                    q.status, q.labour_cost, q.parts_cost, q.total_amount,
                    q.valid_until, q.created_date, q.notes,
                    COALESCE(c.first_name || ' ' || c.last_name, c.name, '') as customer_name,
                    v.registration, v.make, v.model
                FROM quotes q
                LEFT JOIN customers c ON q.customer_id = c.id
                LEFT JOIN vehicles v ON q.vehicle_id = v.id
                ORDER BY q.created_date DESC
                LIMIT 100
            ''')

            quotes = []
            for row in cursor.fetchall():
                quotes.append({
                    'id': row[0],
                    'quote_number': row[1] or f"QUO{row[0]:04d}",
                    'customer_id': row[2],
                    'vehicle_id': row[3],
                    'description': row[4] or '',
                    'status': row[5] or 'pending',
                    'labour_cost': row[6] or 0,
                    'parts_cost': row[7] or 0,
                    'total_amount': row[8] or 0,
                    'valid_until': row[9],
                    'created_date': row[10],
                    'notes': row[11] or '',
                    'customer_name': row[12],
                    'vehicle_registration': row[13],
                    'vehicle_make': row[14],
                    'vehicle_model': row[15]
                })

            return jsonify({
                'success': True,
                'quotes': quotes,
                'count': len(quotes)
            })

    except Exception as e:
        print(f"Error getting quotes: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# JOB SHEETS API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/job-sheets')
def get_job_sheets():
    """Get all job sheets"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT
                    js.id, js.customer_id, js.vehicle_id, js.job_number,
                    js.description, js.status, js.priority, js.estimated_cost,
                    js.actual_cost, js.labour_hours, js.parts_cost,
                    js.assigned_technician, js.start_date, js.completion_date,
                    js.notes, js.created_at,
                    COALESCE(c.first_name || ' ' || c.last_name, c.name, '') as customer_name,
                    v.registration, v.make, v.model
                FROM job_sheets js
                LEFT JOIN customers c ON js.customer_id = c.id
                LEFT JOIN vehicles v ON js.vehicle_id = v.id
                ORDER BY js.created_at DESC
                LIMIT 100
            ''')

            job_sheets = []
            for row in cursor.fetchall():
                job_sheets.append({
                    'id': row[0],
                    'customer_id': row[1],
                    'vehicle_id': row[2],
                    'job_number': row[3],
                    'description': row[4] or '',
                    'status': row[5] or 'pending',
                    'priority': row[6] or 'normal',
                    'estimated_cost': row[7] or 0,
                    'actual_cost': row[8] or 0,
                    'labour_hours': row[9] or 0,
                    'parts_cost': row[10] or 0,
                    'assigned_technician': row[11] or '',
                    'start_date': row[12],
                    'completion_date': row[13],
                    'notes': row[14] or '',
                    'created_at': row[15],
                    'customer_name': row[16],
                    'vehicle_registration': row[17],
                    'vehicle_make': row[18],
                    'vehicle_model': row[19]
                })

            return jsonify({
                'success': True,
                'job_sheets': job_sheets,
                'count': len(job_sheets)
            })

    except Exception as e:
        print(f"Error getting job sheets: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@unified_api_bp.route('/api/job-sheet-templates')
def get_job_sheet_templates():
    """Get job sheet templates"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Check if job_sheet_templates table exists, create if not
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='job_sheet_templates'")
            if not cursor.fetchone():
                cursor.execute('''
                    CREATE TABLE job_sheet_templates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        service_type TEXT,
                        description TEXT,
                        default_instructions TEXT,
                        default_safety_notes TEXT,
                        default_parts TEXT,
                        default_tools TEXT,
                        default_checks TEXT,
                        estimated_time INTEGER,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Insert some default templates
                cursor.execute('''
                    INSERT INTO job_sheet_templates
                    (name, service_type, description, default_instructions, estimated_time)
                    VALUES
                    ('Basic Service', 'service', 'Standard vehicle service', 'Check oil, filters, fluids', 120),
                    ('MOT Test', 'mot', 'Ministry of Transport test', 'Complete MOT inspection', 60),
                    ('Brake Service', 'repair', 'Brake system service', 'Check pads, discs, fluid', 90)
                ''')
                conn.commit()

            cursor.execute('''
                SELECT
                    id, name, service_type, description, default_instructions,
                    default_safety_notes, default_parts, default_tools, default_checks,
                    estimated_time, is_active, created_at
                FROM job_sheet_templates
                WHERE COALESCE(is_active, 1) = 1
                ORDER BY name
            ''')

            templates = []
            for row in cursor.fetchall():
                templates.append({
                    'id': row[0],
                    'name': row[1],
                    'service_type': row[2] or '',
                    'description': row[3] or '',
                    'default_instructions': row[4] or '',
                    'default_safety_notes': row[5] or '',
                    'default_parts': row[6] or '',
                    'default_tools': row[7] or '',
                    'default_checks': row[8] or '',
                    'estimated_time': row[9] or 0,
                    'is_active': bool(row[10] if row[10] is not None else 1),
                    'created_at': row[11]
                })

            return jsonify({
                'success': True,
                'templates': templates,
                'count': len(templates)
            })

    except Exception as e:
        print(f"Error getting job sheet templates: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# PARTS/INVENTORY API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/parts')
def get_parts():
    """Get parts/inventory"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Check if parts table exists, create if not
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='parts'")
            if not cursor.fetchone():
                cursor.execute('''
                    CREATE TABLE parts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        part_number TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        category TEXT,
                        supplier TEXT,
                        cost_price DECIMAL(10,2),
                        selling_price DECIMAL(10,2),
                        stock_quantity INTEGER DEFAULT 0,
                        minimum_stock INTEGER DEFAULT 0,
                        location TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                conn.commit()

            cursor.execute('''
                SELECT
                    id, part_number, name, description, category, supplier,
                    cost_price, selling_price, stock_quantity, minimum_stock,
                    location, is_active, created_at
                FROM parts
                WHERE COALESCE(is_active, 1) = 1
                ORDER BY name
                LIMIT 100
            ''')

            parts = []
            for row in cursor.fetchall():
                parts.append({
                    'id': row[0],
                    'part_number': row[1],
                    'name': row[2] or '',
                    'description': row[3] or '',
                    'category': row[4] or '',
                    'supplier': row[5] or '',
                    'cost_price': row[6] or 0,
                    'selling_price': row[7] or 0,
                    'stock_quantity': row[8] or 0,
                    'minimum_stock': row[9] or 0,
                    'location': row[10] or '',
                    'is_active': bool(row[11] if row[11] is not None else 1),
                    'created_at': row[12],
                    'low_stock': (row[8] or 0) <= (row[9] or 0)
                })

            return jsonify({
                'success': True,
                'parts': parts,
                'count': len(parts)
            })

    except Exception as e:
        print(f"Error getting parts: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# SERVICES API ENDPOINTS
# ============================================================================


@unified_api_bp.route('/api/services')
def get_services():
    """Get available services"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Check if services table exists, create if not
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='services'")
            if not cursor.fetchone():
                cursor.execute('''
                    CREATE TABLE services (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT,
                        category TEXT,
                        price DECIMAL(10,2),
                        duration_minutes INTEGER,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Insert some default services
                cursor.execute('''
                    INSERT INTO services (name, description, category, price, duration_minutes)
                    VALUES
                    ('Oil Change', 'Engine oil and filter change', 'Maintenance', 45.00, 30),
                    ('MOT Test', 'Ministry of Transport test', 'Testing', 54.85, 60),
                    ('Brake Inspection', 'Full brake system check', 'Safety', 25.00, 45),
                    ('Tyre Fitting', 'Tyre removal and fitting', 'Tyres', 15.00, 20),
                    ('Battery Test', 'Battery health check', 'Electrical', 10.00, 15)
                ''')
                conn.commit()

            cursor.execute('''
                SELECT
                    id, name, description, category, price, duration_minutes,
                    is_active, created_at
                FROM services
                WHERE COALESCE(is_active, 1) = 1
                ORDER BY category, name
            ''')

            services = []
            for row in cursor.fetchall():
                services.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2] or '',
                    'category': row[3] or '',
                    'price': row[4] or 0,
                    'duration_minutes': row[5] or 0,
                    'is_active': bool(row[6] if row[6] is not None else 1),
                    'created_at': row[7]
                })

            return jsonify({
                'success': True,
                'services': services,
                'count': len(services)
            })

    except Exception as e:
        print(f"Error getting services: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# DASHBOARD STATISTICS API ENDPOINT
# ============================================================================


@unified_api_bp.route('/api/dashboard/stats')
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        db_path = get_unified_db_path()
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Get basic counts
            stats = {}

            # Customer count
            cursor.execute(
                "SELECT COUNT(*) FROM customers WHERE COALESCE(is_active, 1) = 1")
            stats['customers'] = cursor.fetchone()[0]

            # Vehicle count
            cursor.execute(
                "SELECT COUNT(*) FROM vehicles WHERE COALESCE(is_active, 1) = 1")
            stats['vehicles'] = cursor.fetchone()[0]

            # Jobs count by status
            cursor.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status")
            job_stats = dict(cursor.fetchall())
            stats['jobs'] = {
                'total': sum(job_stats.values()),
                'pending': job_stats.get('pending', 0),
                'in_progress': job_stats.get('in_progress', 0),
                'completed': job_stats.get('completed', 0)
            }

            # Appointments today
            cursor.execute(
                "SELECT COUNT(*) FROM appointments WHERE appointment_date = date('now')")
            stats['appointments_today'] = cursor.fetchone()[0]

            # MOT expiring soon (next 30 days)
            cursor.execute('''
                SELECT COUNT(*) FROM vehicles
                WHERE mot_expiry BETWEEN date('now') AND date('now', '+30 days')
            ''')
            stats['mot_expiring_soon'] = cursor.fetchone()[0]

            # Recent activity (last 7 days)
            cursor.execute('''
                SELECT COUNT(*) FROM jobs
                WHERE created_date >= date('now', '-7 days')
            ''')
            stats['recent_jobs'] = cursor.fetchone()[0]

            return jsonify({
                'success': True,
                'statistics': stats,
                'generated_at': datetime.now().isoformat()
            })

    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
