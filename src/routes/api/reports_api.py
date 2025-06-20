"""
Reports API Routes
Handles all reporting and analytics endpoints
"""

import os
import sqlite3
from datetime import datetime, timedelta

from flask import Blueprint, jsonify

reports_api_bp = Blueprint('reports_api', __name__)


def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')


@reports_api_bp.route('/api/reports')
def get_reports():
    """Get available reports"""
    return jsonify({
        'success': True,
        'reports': [
            {
                'id': 'revenue',
                'name': 'Revenue Report',
                'description': 'Monthly and yearly revenue analysis',
                'endpoint': '/api/reports/revenue'
            },
            {
                'id': 'jobs',
                'name': 'Jobs Report',
                'description': 'Job completion and status analysis',
                'endpoint': '/api/reports/jobs'
            },
            {
                'id': 'customers',
                'name': 'Customer Report',
                'description': 'Customer activity and retention analysis',
                'endpoint': '/api/reports/customers'
            },
            {
                'id': 'vehicles',
                'name': 'Vehicle Report',
                'description': 'Vehicle service history and MOT analysis',
                'endpoint': '/api/reports/vehicles'
            }
        ]
    })


@reports_api_bp.route('/api/reports/revenue')
def get_revenue_report():
    """Get revenue report"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Monthly revenue for the last 12 months
        cursor.execute('''
            SELECT 
                strftime('%Y-%m', created_date) as month,
                COUNT(*) as invoice_count,
                SUM(total_amount) as total_revenue,
                SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as paid_revenue
            FROM invoices
            WHERE created_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', created_date)
            ORDER BY month DESC
        ''')

        monthly_data = []
        for row in cursor.fetchall():
            monthly_data.append({
                'month': row[0],
                'invoice_count': row[1],
                'total_revenue': row[2] or 0,
                'paid_revenue': row[3] or 0
            })

        # Year-to-date summary
        cursor.execute('''
            SELECT 
                COUNT(*) as total_invoices,
                SUM(total_amount) as total_revenue,
                SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as paid_revenue,
                SUM(CASE WHEN status = 'PENDING' THEN total_amount ELSE 0 END) as pending_revenue
            FROM invoices
            WHERE strftime('%Y', created_date) = strftime('%Y', 'now')
        ''')

        ytd_row = cursor.fetchone()
        ytd_summary = {
            'total_invoices': ytd_row[0] or 0,
            'total_revenue': ytd_row[1] or 0,
            'paid_revenue': ytd_row[2] or 0,
            'pending_revenue': ytd_row[3] or 0
        }

        conn.close()

        return jsonify({
            'success': True,
            'monthly_data': monthly_data,
            'ytd_summary': ytd_summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reports_api_bp.route('/api/reports/jobs')
def get_jobs_report():
    """Get jobs report"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Job status breakdown
        cursor.execute('''
            SELECT status, COUNT(*) as count
            FROM jobs
            GROUP BY status
        ''')

        status_breakdown = {}
        for row in cursor.fetchall():
            status_breakdown[row[0]] = row[1]

        # Monthly job completion
        cursor.execute('''
            SELECT 
                strftime('%Y-%m', completed_date) as month,
                COUNT(*) as completed_jobs,
                AVG(actual_hours) as avg_hours,
                AVG(total_amount) as avg_value
            FROM jobs
            WHERE completed_date IS NOT NULL
            AND completed_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', completed_date)
            ORDER BY month DESC
        ''')

        monthly_completion = []
        for row in cursor.fetchall():
            monthly_completion.append({
                'month': row[0],
                'completed_jobs': row[1],
                'avg_hours': round(row[2] or 0, 2),
                'avg_value': round(row[3] or 0, 2)
            })

        # Top technicians by job count
        cursor.execute('''
            SELECT 
                assigned_technician,
                COUNT(*) as job_count,
                AVG(actual_hours) as avg_hours
            FROM jobs
            WHERE assigned_technician IS NOT NULL
            AND completed_date >= date('now', '-3 months')
            GROUP BY assigned_technician
            ORDER BY job_count DESC
            LIMIT 10
        ''')

        top_technicians = []
        for row in cursor.fetchall():
            top_technicians.append({
                'technician': row[0],
                'job_count': row[1],
                'avg_hours': round(row[2] or 0, 2)
            })

        conn.close()

        return jsonify({
            'success': True,
            'status_breakdown': status_breakdown,
            'monthly_completion': monthly_completion,
            'top_technicians': top_technicians
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reports_api_bp.route('/api/reports/customers')
def get_customers_report():
    """Get customers report"""
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Customer growth
        cursor.execute('''
            SELECT 
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as new_customers
            FROM customers
            WHERE created_at >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
        ''')

        customer_growth = []
        for row in cursor.fetchall():
            customer_growth.append({
                'month': row[0],
                'new_customers': row[1]
            })

        # Top customers by revenue
        cursor.execute('''
            SELECT 
                c.name,
                c.account_number,
                COUNT(i.id) as invoice_count,
                SUM(i.total_amount) as total_spent
            FROM customers c
            LEFT JOIN invoices i ON c.id = i.customer_id
            WHERE i.created_date >= date('now', '-12 months')
            GROUP BY c.id, c.name, c.account_number
            ORDER BY total_spent DESC
            LIMIT 10
        ''')

        top_customers = []
        for row in cursor.fetchall():
            top_customers.append({
                'name': row[0],
                'account_number': row[1],
                'invoice_count': row[2] or 0,
                'total_spent': row[3] or 0
            })

        conn.close()

        return jsonify({
            'success': True,
            'customer_growth': customer_growth,
            'top_customers': top_customers
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
