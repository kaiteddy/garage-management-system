#!/usr/bin/env python3
"""
Digital Job Sheets API Routes
Enhanced job sheet system with templates, digital signatures, and printable cards
"""

import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file
from services.digital_job_sheets_service import DigitalJobSheetsService
import tempfile

digital_job_sheets_bp = Blueprint('digital_job_sheets', __name__)

# Initialize digital job sheets service
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
job_sheets_service = DigitalJobSheetsService(db_path)

@digital_job_sheets_bp.route('/api/job-sheet-templates')
def get_job_sheet_templates():
    """Get job sheet templates with optional filtering"""
    try:
        service_type = request.args.get('service_type')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        templates = job_sheets_service.get_job_sheet_templates(service_type, active_only)
        
        return jsonify({
            'success': True,
            'templates': templates,
            'count': len(templates)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheet-templates', methods=['POST'])
def create_job_sheet_template():
    """Create a new job sheet template"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'service_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        result = job_sheets_service.create_job_sheet_template(
            name=data['name'],
            service_type=data['service_type'],
            description=data.get('description', ''),
            default_instructions=data.get('default_instructions', ''),
            default_safety_notes=data.get('default_safety_notes', ''),
            default_parts=data.get('default_parts', []),
            default_tools=data.get('default_tools', []),
            default_checks=data.get('default_checks', []),
            estimated_time=data.get('estimated_time', 60)
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets', methods=['POST'])
def create_job_sheet():
    """Create a new job sheet from template or custom"""
    try:
        data = request.get_json()
        
        if not data.get('job_id'):
            return jsonify({
                'success': False,
                'error': 'Job ID is required'
            }), 400
        
        result = job_sheets_service.create_job_sheet_from_template(
            job_id=data['job_id'],
            template_id=data.get('template_id'),
            custom_instructions=data.get('custom_instructions')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/<int:job_sheet_id>')
def get_job_sheet(job_sheet_id):
    """Get a complete job sheet with all details"""
    try:
        result = job_sheets_service.get_job_sheet(job_sheet_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets')
def get_job_sheets():
    """Get job sheets filtered by status"""
    try:
        status = request.args.get('status')
        job_sheets = job_sheets_service.get_job_sheets_by_status(status)
        
        return jsonify({
            'success': True,
            'job_sheets': job_sheets,
            'count': len(job_sheets),
            'filter': {'status': status}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/<int:job_sheet_id>/signature', methods=['POST'])
def add_digital_signature(job_sheet_id):
    """Add a digital signature to a job sheet"""
    try:
        data = request.get_json()
        
        required_fields = ['signature_type', 'signature_data', 'signer_name', 'signer_role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Get client IP
        signer_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        
        result = job_sheets_service.add_digital_signature(
            job_sheet_id=job_sheet_id,
            signature_type=data['signature_type'],
            signature_data=data['signature_data'],
            signer_name=data['signer_name'],
            signer_role=data['signer_role'],
            signer_ip=signer_ip
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/<int:job_sheet_id>/quality-control/<int:item_id>', methods=['PUT'])
def update_quality_control_item(job_sheet_id, item_id):
    """Update a quality control item"""
    try:
        data = request.get_json()
        
        result = job_sheets_service.update_quality_control_item(
            item_id=item_id,
            is_completed=data.get('is_completed', False),
            completed_by=data.get('completed_by'),
            notes=data.get('notes')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/<int:job_sheet_id>/print')
def generate_printable_job_card(job_sheet_id):
    """Generate a printable job card"""
    try:
        result = job_sheets_service.generate_printable_job_card(job_sheet_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        return jsonify({
            'success': True,
            'html_content': result['html_content'],
            'sheet_number': result['sheet_number']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/<int:job_sheet_id>/download')
def download_printable_job_card(job_sheet_id):
    """Download printable job card as HTML file"""
    try:
        result = job_sheets_service.generate_printable_job_card(job_sheet_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        # Create temporary HTML file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False)
        temp_file.write(result['html_content'])
        temp_file.close()
        
        filename = f"job_sheet_{result['sheet_number']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        return send_file(
            temp_file.name,
            as_attachment=True,
            download_name=filename,
            mimetype='text/html'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/statistics')
def get_job_sheet_statistics():
    """Get job sheet statistics"""
    try:
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get status counts
        cursor.execute('''
            SELECT status, COUNT(*) 
            FROM job_sheets 
            GROUP BY status
        ''')
        
        status_counts = {}
        for row in cursor.fetchall():
            status_counts[row[0]] = row[1]
        
        # Get template usage
        cursor.execute('''
            SELECT t.name, COUNT(js.id) as usage_count
            FROM job_sheet_templates t
            LEFT JOIN job_sheets js ON t.id = js.template_id
            WHERE t.is_active = 1
            GROUP BY t.id, t.name
            ORDER BY usage_count DESC
        ''')
        
        template_usage = []
        for row in cursor.fetchall():
            template_usage.append({
                'template_name': row[0],
                'usage_count': row[1]
            })
        
        # Get completion rate
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
            FROM job_sheets
            WHERE created_date >= date('now', '-30 days')
        ''')
        
        completion_stats = cursor.fetchone()
        total_sheets = completion_stats[0]
        completed_sheets = completion_stats[1]
        completion_rate = (completed_sheets / total_sheets * 100) if total_sheets > 0 else 0
        
        # Get signature completion rate
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN technician_signature IS NOT NULL THEN 1 ELSE 0 END) as tech_signed,
                SUM(CASE WHEN customer_signature IS NOT NULL THEN 1 ELSE 0 END) as customer_signed
            FROM job_sheets
            WHERE created_date >= date('now', '-30 days')
        ''')
        
        signature_stats = cursor.fetchone()
        tech_signature_rate = (signature_stats[1] / total_sheets * 100) if total_sheets > 0 else 0
        customer_signature_rate = (signature_stats[2] / total_sheets * 100) if total_sheets > 0 else 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'statistics': {
                'status_distribution': status_counts,
                'template_usage': template_usage,
                'completion_metrics': {
                    'total_sheets_30_days': total_sheets,
                    'completed_sheets': completed_sheets,
                    'completion_rate_percent': round(completion_rate, 1),
                    'technician_signature_rate_percent': round(tech_signature_rate, 1),
                    'customer_signature_rate_percent': round(customer_signature_rate, 1)
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@digital_job_sheets_bp.route('/api/job-sheets/dashboard')
def get_job_sheets_dashboard():
    """Get job sheets dashboard summary"""
    try:
        # Get recent job sheets
        recent_sheets = job_sheets_service.get_job_sheets_by_status()[:10]
        
        # Get pending signatures
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT js.id, js.sheet_number, j.job_number, c.name as customer_name
            FROM job_sheets js
            LEFT JOIN jobs j ON js.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE js.status = 'ACTIVE' 
            AND (js.technician_signature IS NULL OR js.customer_signature IS NULL)
            ORDER BY js.created_date
            LIMIT 10
        ''')
        
        pending_signatures = []
        for row in cursor.fetchall():
            pending_signatures.append({
                'id': row[0],
                'sheet_number': row[1],
                'job_number': row[2],
                'customer_name': row[3]
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'recent_job_sheets': recent_sheets,
                'pending_signatures': pending_signatures,
                'summary': {
                    'recent_count': len(recent_sheets),
                    'pending_signatures_count': len(pending_signatures)
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
