"""
Dashboard API Routes
Handles dashboard statistics and overview data
"""

import os
import sqlite3
from datetime import datetime
from flask import Blueprint, jsonify

dashboard_api_bp = Blueprint('dashboard_api', __name__)

def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')

@dashboard_api_bp.route('/api/stats')
def get_stats():
    """Get dashboard statistics"""
    try:
        # Use direct SQLite query for now
        db_path = get_db_path()
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

@dashboard_api_bp.route('/api/recent-activity')
def get_recent_activity():
    """Get recent activity for dashboard"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        activities = []

        # Get recent jobs (last 5)
        cursor.execute('''
            SELECT j.id, j.description, j.status, j.created_date, c.name as customer_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            ORDER BY j.created_date DESC
            LIMIT 5
        ''')

        for row in cursor.fetchall():
            activities.append({
                'type': 'job',
                'icon': 'tools',
                'title': f'Job #{row["id"]} - {row["status"]}',
                'subtitle': row['description'][:50] + '...' if row['description'] and len(row['description']) > 50 else row['description'],
                'date': row['created_date'],
                'customer': row['customer_name']
            })

        # Get recent invoices (last 5)
        cursor.execute('''
            SELECT i.id, i.invoice_number, i.status, i.created_date, c.name as customer_name, i.total_amount
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            ORDER BY i.created_date DESC
            LIMIT 5
        ''')

        for row in cursor.fetchall():
            activities.append({
                'type': 'invoice',
                'icon': 'file-invoice-dollar',
                'title': f'Invoice {row["invoice_number"]} - {row["status"]}',
                'subtitle': f'£{row["total_amount"]:.2f}' if row['total_amount'] else '£0.00',
                'date': row['created_date'],
                'customer': row['customer_name']
            })

        conn.close()

        # Sort all activities by date (most recent first)
        activities.sort(key=lambda x: x['date'], reverse=True)

        return jsonify({
            'success': True,
            'activities': activities[:10]  # Return top 10 most recent
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'activities': []
        }), 500

@dashboard_api_bp.route('/api/dashboard')
def get_dashboard_data():
    """Get comprehensive dashboard data"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get recent jobs
        cursor.execute('''
            SELECT j.id, j.job_number, j.description, j.status, j.created_date,
                   c.name as customer_name, v.registration
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            ORDER BY j.created_date DESC
            LIMIT 10
        ''')

        recent_jobs = []
        for row in cursor.fetchall():
            recent_jobs.append({
                'id': row[0],
                'job_number': row[1],
                'description': row[2],
                'status': row[3],
                'created_date': row[4],
                'customer_name': row[5],
                'vehicle_registration': row[6]
            })

        # Get recent invoices
        cursor.execute('''
            SELECT i.id, i.invoice_number, i.total_amount, i.status, i.created_date,
                   c.name as customer_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            ORDER BY i.created_date DESC
            LIMIT 10
        ''')

        recent_invoices = []
        for row in cursor.fetchall():
            recent_invoices.append({
                'id': row[0],
                'invoice_number': row[1],
                'total_amount': row[2],
                'status': row[3],
                'created_date': row[4],
                'customer_name': row[5]
            })

        # Get job status breakdown
        cursor.execute('''
            SELECT status, COUNT(*) as count
            FROM jobs
            GROUP BY status
        ''')

        job_status_breakdown = {}
        for row in cursor.fetchall():
            job_status_breakdown[row[0]] = row[1]

        conn.close()

        return jsonify({
            'success': True,
            'recent_jobs': recent_jobs,
            'recent_invoices': recent_invoices,
            'job_status_breakdown': job_status_breakdown
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_api_bp.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Simple query to test database connection
        cursor.execute('SELECT COUNT(*) FROM customers')
        customer_count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'customer_count': customer_count,
            'timestamp': str(datetime.now())
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': str(datetime.now())
        }), 500
