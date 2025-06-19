#!/usr/bin/env python3
"""
Enhanced DVSA API Routes
Handles comprehensive vehicle data, tax status, and automated reminders
"""

import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request
from services.enhanced_dvsa_service import EnhancedDVSAService

enhanced_dvsa_bp = Blueprint('enhanced_dvsa', __name__)

# Initialize enhanced DVSA service
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'garage.db')
dvsa_service = EnhancedDVSAService(db_path)

@enhanced_dvsa_bp.route('/api/dvsa/vehicle/<registration>')
def get_comprehensive_vehicle_data(registration):
    """Get comprehensive vehicle data from DVSA and DVLA"""
    try:
        registration = registration.replace(' ', '').upper()
        
        result = dvsa_service.get_comprehensive_vehicle_data(registration)
        
        if result['success']:
            # Store the data for future reference
            dvsa_service.store_vehicle_data(result['vehicle_data'])
            
            return jsonify({
                'success': True,
                'vehicle_data': result['vehicle_data'],
                'data_sources': result['data_sources'],
                'last_updated': result['vehicle_data']['last_updated']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/vehicle/<registration>/mot')
def get_mot_data_only(registration):
    """Get MOT data only from DVSA"""
    try:
        registration = registration.replace(' ', '').upper()
        
        mot_data = dvsa_service.get_mot_data(registration)
        
        if mot_data:
            return jsonify({
                'success': True,
                'mot_data': mot_data,
                'registration': registration
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No MOT data found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/vehicle/<registration>/tax')
def get_tax_data_only(registration):
    """Get tax data only from DVLA"""
    try:
        registration = registration.replace(' ', '').upper()
        
        tax_data = dvsa_service.get_tax_data(registration)
        
        if tax_data:
            return jsonify({
                'success': True,
                'tax_data': tax_data,
                'registration': registration
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No tax data found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/vehicle/<registration>/reminders', methods=['POST'])
def schedule_vehicle_reminders(registration):
    """Schedule automated reminders for a vehicle"""
    try:
        data = request.get_json() or {}
        customer_id = data.get('customer_id')
        
        registration = registration.replace(' ', '').upper()
        
        result = dvsa_service.schedule_automated_reminders(registration, customer_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'scheduled_reminders': result['scheduled_reminders'],
                'vehicle_registration': registration,
                'message': f"Scheduled {len(result['scheduled_reminders'])} reminders"
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/reminders/pending')
def get_pending_reminders():
    """Get all pending reminders"""
    try:
        pending_reminders = dvsa_service.get_pending_reminders()
        
        return jsonify({
            'success': True,
            'pending_reminders': pending_reminders,
            'count': len(pending_reminders)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/reminders/<int:reminder_id>/sent', methods=['POST'])
def mark_reminder_sent(reminder_id):
    """Mark a reminder as sent"""
    try:
        success = dvsa_service.mark_reminder_sent(reminder_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Reminder marked as sent'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update reminder status'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/vehicle/<registration>/history')
def get_vehicle_history(registration):
    """Get vehicle history events"""
    try:
        registration = registration.replace(' ', '').upper()
        
        history = dvsa_service.get_vehicle_history(registration)
        
        return jsonify({
            'success': True,
            'vehicle_history': history,
            'registration': registration,
            'count': len(history)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/bulk-update', methods=['POST'])
def bulk_update_vehicles():
    """Bulk update multiple vehicles from DVSA/DVLA"""
    try:
        data = request.get_json()
        registrations = data.get('registrations', [])
        
        if not registrations:
            return jsonify({
                'success': False,
                'error': 'No registrations provided'
            }), 400
        
        results = {
            'success': True,
            'total_requested': len(registrations),
            'successful': 0,
            'failed': 0,
            'results': []
        }
        
        for registration in registrations:
            try:
                registration = registration.replace(' ', '').upper()
                
                # Get comprehensive data
                result = dvsa_service.get_comprehensive_vehicle_data(registration)
                
                if result['success']:
                    # Store the data
                    stored = dvsa_service.store_vehicle_data(result['vehicle_data'])
                    
                    if stored:
                        results['successful'] += 1
                        results['results'].append({
                            'registration': registration,
                            'status': 'success',
                            'data_sources': result['data_sources']
                        })
                    else:
                        results['failed'] += 1
                        results['results'].append({
                            'registration': registration,
                            'status': 'failed',
                            'error': 'Failed to store data'
                        })
                else:
                    results['failed'] += 1
                    results['results'].append({
                        'registration': registration,
                        'status': 'failed',
                        'error': result['error']
                    })
                    
            except Exception as e:
                results['failed'] += 1
                results['results'].append({
                    'registration': registration,
                    'status': 'failed',
                    'error': str(e)
                })
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/service-status')
def get_service_status():
    """Get DVSA/DVLA service status"""
    try:
        # Test DVSA connection
        dvsa_status = 'unknown'
        dvla_status = 'unknown'
        
        try:
            token = dvsa_service.get_dvsa_access_token()
            dvsa_status = 'available' if token else 'unavailable'
        except:
            dvsa_status = 'unavailable'
        
        # Test DVLA connection (simple check)
        dvla_status = 'available' if dvsa_service.dvla_api_key else 'not_configured'
        
        return jsonify({
            'success': True,
            'service_status': {
                'dvsa_mot_api': {
                    'status': dvsa_status,
                    'description': 'DVSA MOT History API'
                },
                'dvla_vehicle_api': {
                    'status': dvla_status,
                    'description': 'DVLA Vehicle Enquiry API'
                },
                'overall_status': 'available' if dvsa_status == 'available' or dvla_status == 'available' else 'limited'
            },
            'credentials_configured': {
                'dvsa_client_id': bool(dvsa_service.dvsa_client_id),
                'dvsa_client_secret': bool(dvsa_service.dvsa_client_secret),
                'dvsa_api_key': bool(dvsa_service.dvsa_api_key),
                'dvla_api_key': bool(dvsa_service.dvla_api_key)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@enhanced_dvsa_bp.route('/api/dvsa/statistics')
def get_dvsa_statistics():
    """Get DVSA integration statistics"""
    try:
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get vehicle data statistics
        cursor.execute('SELECT COUNT(*) FROM enhanced_vehicle_data')
        total_vehicles = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM enhanced_vehicle_data WHERE mot_expiry IS NOT NULL')
        vehicles_with_mot = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM enhanced_vehicle_data WHERE tax_due IS NOT NULL')
        vehicles_with_tax = cursor.fetchone()[0]
        
        # Get reminder statistics
        cursor.execute('SELECT COUNT(*) FROM reminder_schedule WHERE status = "PENDING"')
        pending_reminders = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM reminder_schedule WHERE status = "SENT"')
        sent_reminders = cursor.fetchone()[0]
        
        # Get recent activity
        cursor.execute('''
            SELECT COUNT(*) FROM enhanced_vehicle_data 
            WHERE last_updated > datetime('now', '-7 days')
        ''')
        recent_updates = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_vehicles': total_vehicles,
                'vehicles_with_mot_data': vehicles_with_mot,
                'vehicles_with_tax_data': vehicles_with_tax,
                'pending_reminders': pending_reminders,
                'sent_reminders': sent_reminders,
                'recent_updates_7_days': recent_updates,
                'mot_data_coverage': f"{(vehicles_with_mot/total_vehicles*100):.1f}%" if total_vehicles > 0 else "0%",
                'tax_data_coverage': f"{(vehicles_with_tax/total_vehicles*100):.1f}%" if total_vehicles > 0 else "0%"
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
