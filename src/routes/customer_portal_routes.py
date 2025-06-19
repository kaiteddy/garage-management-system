#!/usr/bin/env python3
"""
Customer Self-Service Portal API Routes
Customer portal for work approval, communication, and online booking
"""

import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request
from services.customer_portal_service import CustomerPortalService

customer_portal_bp = Blueprint('customer_portal', __name__)

# Initialize customer portal service
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
portal_service = CustomerPortalService(db_path)

@customer_portal_bp.route('/api/customer-portal/login', methods=['POST'])
def customer_login():
    """Customer portal login"""
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400
        
        # Get client information
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        user_agent = request.headers.get('User-Agent')
        
        result = portal_service.create_customer_session(
            customer_email=data['email'],
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/validate-session', methods=['POST'])
def validate_session():
    """Validate customer session"""
    try:
        data = request.get_json()
        
        if not data.get('session_token'):
            return jsonify({
                'success': False,
                'error': 'Session token is required'
            }), 400
        
        result = portal_service.validate_session(data['session_token'])
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/dashboard')
def get_customer_dashboard():
    """Get customer dashboard data"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({
                'success': False,
                'error': 'Session token required'
            }), 401
        
        # Validate session
        session_result = portal_service.validate_session(session_token)
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        
        # Get dashboard data
        recent_jobs = portal_service.get_customer_jobs(customer_id)[:5]
        pending_approvals = portal_service.get_pending_approvals(customer_id)
        unread_communications = portal_service.get_customer_communications(customer_id, unread_only=True)
        vehicles = portal_service.get_customer_vehicles(customer_id)
        
        return jsonify({
            'success': True,
            'dashboard': {
                'customer_info': {
                    'name': session_result['customer_name'],
                    'email': session_result['customer_email']
                },
                'recent_jobs': recent_jobs,
                'pending_approvals': pending_approvals,
                'unread_communications': unread_communications,
                'vehicles': vehicles,
                'summary': {
                    'total_jobs': len(recent_jobs),
                    'pending_approvals_count': len(pending_approvals),
                    'unread_messages_count': len(unread_communications),
                    'vehicles_count': len(vehicles)
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/jobs')
def get_customer_jobs():
    """Get customer jobs"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        status = request.args.get('status')
        
        jobs = portal_service.get_customer_jobs(customer_id, status)
        
        return jsonify({
            'success': True,
            'jobs': jobs,
            'count': len(jobs),
            'filter': {'status': status}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/approvals')
def get_pending_approvals():
    """Get pending work approvals"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        approvals = portal_service.get_pending_approvals(customer_id)
        
        return jsonify({
            'success': True,
            'approvals': approvals,
            'count': len(approvals)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/approvals/<int:approval_id>/approve', methods=['POST'])
def approve_work(approval_id):
    """Approve or reject work"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        data = request.get_json()
        customer_id = session_result['customer_id']
        
        result = portal_service.approve_work(
            approval_id=approval_id,
            customer_id=customer_id,
            approved=data.get('approved', False),
            notes=data.get('notes')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/communications')
def get_customer_communications():
    """Get customer communications"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        communications = portal_service.get_customer_communications(customer_id, unread_only)
        
        return jsonify({
            'success': True,
            'communications': communications,
            'count': len(communications)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/communications/<int:communication_id>/read', methods=['POST'])
def mark_communication_read(communication_id):
    """Mark communication as read"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        
        result = portal_service.mark_communication_read(communication_id, customer_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/vehicles')
def get_customer_vehicles():
    """Get customer vehicles"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        vehicles = portal_service.get_customer_vehicles(customer_id)
        
        return jsonify({
            'success': True,
            'vehicles': vehicles,
            'count': len(vehicles)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/invoices')
def get_customer_invoices():
    """Get customer invoices"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session_result = portal_service.validate_session(session_token)
        
        if not session_result['success']:
            return jsonify(session_result), 401
        
        customer_id = session_result['customer_id']
        status = request.args.get('status')
        
        invoices = portal_service.get_customer_invoices(customer_id, status)
        
        return jsonify({
            'success': True,
            'invoices': invoices,
            'count': len(invoices),
            'filter': {'status': status}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_portal_bp.route('/api/customer-portal/booking', methods=['POST'])
def create_online_booking():
    """Create an online booking request"""
    try:
        data = request.get_json()
        
        required_fields = ['customer_name', 'customer_email', 'customer_phone', 
                          'vehicle_registration', 'service_type', 'preferred_date']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        result = portal_service.create_online_booking(data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
