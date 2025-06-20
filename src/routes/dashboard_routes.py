"""
Dashboard API Routes
Extracted from monolithic app.py
"""

import os
import sqlite3
from datetime import datetime, timedelta

from flask import Blueprint, jsonify

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/api/stats')
def get_stats():
    """Get dashboard statistics"""
    try:
        # Use direct SQLite query for now
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
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
        cursor.execute(
            'SELECT SUM(total_amount) FROM invoices WHERE status = "PAID"')
        total_revenue = cursor.fetchone()[0] or 0

        # Get linking statistics
        cursor.execute(
            'SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL')
        linked_vehicles = cursor.fetchone()[0]

        cursor.execute(
            'SELECT COUNT(*) FROM jobs WHERE customer_id IS NOT NULL')
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


@dashboard_bp.route('/api/recent-activity')
def get_recent_activity():
    """Get recent activity for dashboard"""
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        activities = []

        # Get recent jobs
        cursor.execute('''
            SELECT j.id, j.job_number, j.description, j.status, j.created_date,
                   c.name as customer_name, v.registration
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            ORDER BY j.created_date DESC
            LIMIT 5
        ''')

        for row in cursor.fetchall():
            activities.append({
                'type': 'job',
                'icon': 'wrench',
                'title': f"Job {row[1]} - {row[3]}",
                'subtitle': f"{row[6] or 'Unknown Vehicle'} - {row[5] or 'Unknown Customer'}",
                'date': format_date(row[4]),
                'timestamp': row[4]
            })

        # Get recent invoices
        cursor.execute('''
            SELECT i.id, i.invoice_number, i.total_amount, i.status, i.created_date,
                   c.name as customer_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            ORDER BY i.created_date DESC
            LIMIT 5
        ''')

        for row in cursor.fetchall():
            activities.append({
                'type': 'invoice',
                'icon': 'file-invoice',
                'title': f"Invoice {row[1]} - {row[3]}",
                'subtitle': f"£{row[2]:.2f} - {row[5] or 'Unknown Customer'}",
                'date': format_date(row[4]),
                'timestamp': row[4]
            })

        conn.close()

        # Sort by timestamp and limit to 10 most recent
        activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        activities = activities[:10]

        # Remove timestamp from response
        for activity in activities:
            activity.pop('timestamp', None)

        return jsonify({
            'success': True,
            'activities': activities
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'activities': []
        }), 500


@dashboard_bp.route('/api/dashboard-summary')
def get_dashboard_summary():
    """Get comprehensive dashboard summary"""
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'instance', 'garage.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get current month stats
        current_month = datetime.now().strftime('%Y-%m')

        # Jobs this month
        cursor.execute('''
            SELECT COUNT(*), SUM(total_amount)
            FROM jobs 
            WHERE strftime('%Y-%m', created_date) = ?
        ''', (current_month,))
        jobs_this_month, revenue_this_month = cursor.fetchone()
        revenue_this_month = revenue_this_month or 0

        # Pending jobs
        cursor.execute(
            "SELECT COUNT(*) FROM jobs WHERE status IN ('PENDING', 'IN_PROGRESS')")
        pending_jobs = cursor.fetchone()[0]

        # Overdue invoices
        cursor.execute('''
            SELECT COUNT(*), SUM(total_amount)
            FROM invoices 
            WHERE status = 'PENDING' AND due_date < date('now')
        ''')
        overdue_invoices, overdue_amount = cursor.fetchone()
        overdue_amount = overdue_amount or 0

        # MOT reminders (vehicles expiring in next 30 days)
        thirty_days_from_now = (
            datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT COUNT(*) 
            FROM vehicles 
            WHERE mot_expiry IS NOT NULL 
            AND mot_expiry <= ? 
            AND mot_expiry >= date('now')
        ''', (thirty_days_from_now,))
        mot_reminders = cursor.fetchone()[0]

        conn.close()

        summary = {
            'jobs_this_month': jobs_this_month or 0,
            'revenue_this_month': f"£{revenue_this_month:,.2f}",
            'pending_jobs': pending_jobs,
            'overdue_invoices': overdue_invoices or 0,
            'overdue_amount': f"£{overdue_amount:,.2f}",
            'mot_reminders': mot_reminders
        }

        return jsonify({
            'success': True,
            'summary': summary
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def format_date(date_string):
    """Format date string for display"""
    if not date_string:
        return 'Unknown'

    try:
        # Parse the date string
        if 'T' in date_string:
            date_obj = datetime.fromisoformat(
                date_string.replace('Z', '+00:00'))
        else:
            date_obj = datetime.strptime(date_string, '%Y-%m-%d')

        # Calculate time difference
        now = datetime.now()
        diff = now - date_obj.replace(tzinfo=None)

        if diff.days == 0:
            if diff.seconds < 3600:  # Less than 1 hour
                minutes = diff.seconds // 60
                return f"{minutes} minutes ago" if minutes > 1 else "Just now"
            else:  # Less than 24 hours
                hours = diff.seconds // 3600
                return f"{hours} hours ago" if hours > 1 else "1 hour ago"
        elif diff.days == 1:
            return "Yesterday"
        elif diff.days < 7:
            return f"{diff.days} days ago"
        else:
            return date_obj.strftime('%d/%m/%Y')

    except Exception:
        return date_string
