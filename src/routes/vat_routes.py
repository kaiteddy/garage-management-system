#!/usr/bin/env python3
"""
VAT/MTD API Routes
Handles VAT calculations, MTD submissions, and compliance reporting
"""

import json
import os
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from services.vat_service import VATService

vat_bp = Blueprint('vat', __name__)

# Initialize VAT service
db_path = os.path.join(os.path.dirname(os.path.dirname(
    os.path.dirname(__file__))), 'instance', 'garage.db')
vat_service = VATService(db_path)


@vat_bp.route('/api/vat/calculate', methods=['POST'])
def calculate_vat():
    """Calculate VAT for given amount and rate"""
    try:
        data = request.get_json()
        net_amount = data.get('net_amount', 0)
        vat_rate_code = data.get('vat_rate_code', 'STANDARD')

        if not isinstance(net_amount, (int, float)) or net_amount < 0:
            return jsonify({
                'success': False,
                'error': 'Invalid net amount'
            }), 400

        calculation = vat_service.calculate_vat(net_amount, vat_rate_code)

        return jsonify({
            'success': True,
            'calculation': {
                'net_amount': float(calculation['net_amount']),
                'vat_amount': float(calculation['vat_amount']),
                'gross_amount': float(calculation['gross_amount']),
                'vat_rate': float(calculation['vat_rate']),
                'vat_rate_code': calculation['vat_rate_code'],
                'vat_rate_description': calculation['vat_rate_description']
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/rates')
def get_vat_rates():
    """Get available VAT rates"""
    try:
        rates = {}
        for code, rate_info in vat_service.VAT_RATES.items():
            rates[code] = {
                'rate': float(rate_info.rate),
                'description': rate_info.description,
                'code': rate_info.code
            }

        return jsonify({
            'success': True,
            'vat_rates': rates
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/registration')
def get_vat_registration():
    """Get VAT registration information"""
    try:
        vat_info = vat_service.get_vat_registration_info()

        return jsonify({
            'success': True,
            'vat_registration': vat_info
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/registration', methods=['POST'])
def update_vat_registration():
    """Update VAT registration information"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['vat_number', 'business_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        # Validate VAT number format (basic UK VAT number validation)
        vat_number = data['vat_number'].replace(' ', '').upper()
        if not (len(vat_number) == 9 and vat_number[:2] == 'GB' and vat_number[2:].isdigit()):
            if not (len(vat_number) == 9 and vat_number.isdigit()):
                return jsonify({
                    'success': False,
                    'error': 'Invalid UK VAT number format'
                }), 400

        success = vat_service.update_vat_registration(data)

        if success:
            return jsonify({
                'success': True,
                'message': 'VAT registration updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update VAT registration'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/transactions')
def get_vat_transactions():
    """Get VAT transactions for a period"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not start_date or not end_date:
            # Default to current quarter
            today = datetime.now()
            quarter_start = datetime(
                today.year, ((today.month - 1) // 3) * 3 + 1, 1)
            quarter_end = quarter_start + \
                timedelta(days=92)  # Approximate quarter end
            start_date = quarter_start.strftime('%Y-%m-%d')
            end_date = quarter_end.strftime('%Y-%m-%d')

        transactions = vat_service.get_vat_transactions(start_date, end_date)

        # Calculate summary
        total_net = sum(t['net_amount'] for t in transactions)
        total_vat = sum(t['vat_amount'] for t in transactions)
        total_gross = sum(t['gross_amount'] for t in transactions)

        return jsonify({
            'success': True,
            'transactions': transactions,
            'summary': {
                'period_start': start_date,
                'period_end': end_date,
                'transaction_count': len(transactions),
                'total_net': round(total_net, 2),
                'total_vat': round(total_vat, 2),
                'total_gross': round(total_gross, 2)
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/return/generate', methods=['POST'])
def generate_vat_return():
    """Generate VAT return data for MTD submission"""
    try:
        data = request.get_json()
        period_start = data.get('period_start')
        period_end = data.get('period_end')

        if not period_start or not period_end:
            return jsonify({
                'success': False,
                'error': 'Period start and end dates are required'
            }), 400

        # Validate date format
        try:
            datetime.strptime(period_start, '%Y-%m-%d')
            datetime.strptime(period_end, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }), 400

        vat_return_data = vat_service.generate_vat_return_data(
            period_start, period_end)

        return jsonify(vat_return_data)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/return/submit', methods=['POST'])
def submit_vat_return():
    """Submit VAT return to HMRC"""
    try:
        data = request.get_json()
        vat_return_data = data.get('vat_return_data')

        if not vat_return_data:
            return jsonify({
                'success': False,
                'error': 'VAT return data is required'
            }), 400

        # Validate VAT registration
        vat_info = vat_service.get_vat_registration_info()
        if not vat_info.get('vat_number'):
            return jsonify({
                'success': False,
                'error': 'VAT registration number not configured'
            }), 400

        submission_result = vat_service.submit_vat_return(vat_return_data)

        return jsonify(submission_result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/submissions')
def get_vat_submissions():
    """Get VAT submission history"""
    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, period_key, submission_date, status, processing_date, created_date
            FROM vat_submissions
            ORDER BY created_date DESC
            LIMIT 50
        ''')

        submissions = []
        for row in cursor.fetchall():
            submissions.append({
                'id': row[0],
                'period_key': row[1],
                'submission_date': row[2],
                'status': row[3],
                'processing_date': row[4],
                'created_date': row[5]
            })

        conn.close()

        return jsonify({
            'success': True,
            'submissions': submissions
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/export/csv')
def export_vat_csv():
    """Export VAT transactions as CSV for accountants"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not start_date or not end_date:
            return jsonify({
                'success': False,
                'error': 'Start and end dates are required'
            }), 400

        transactions = vat_service.get_vat_transactions(start_date, end_date)

        # Generate CSV content
        csv_content = "Date,Invoice Number,Customer,Description,Net Amount,VAT Amount,Gross Amount,Status\n"

        for transaction in transactions:
            csv_content += f"{transaction['date']},{transaction['invoice_number']},{transaction['customer_name']},{transaction['description']},{transaction['net_amount']},{transaction['vat_amount']},{transaction['gross_amount']},{transaction['status']}\n"

        return jsonify({
            'success': True,
            'csv_content': csv_content,
            'filename': f'vat_transactions_{start_date}_to_{end_date}.csv'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@vat_bp.route('/api/vat/compliance/check')
def check_vat_compliance():
    """Check VAT compliance status"""
    try:
        vat_info = vat_service.get_vat_registration_info()

        compliance_checks = {
            'vat_registered': bool(vat_info.get('vat_number')),
            'business_details_complete': bool(vat_info.get('business_name') and vat_info.get('business_address')),
            'accounting_period_set': bool(vat_info.get('accounting_period_start') and vat_info.get('accounting_period_end')),
            'hmrc_credentials_configured': bool(vat_service.hmrc_client_id and vat_service.hmrc_client_secret)
        }

        overall_compliance = all(compliance_checks.values())

        return jsonify({
            'success': True,
            'compliance_status': {
                'overall_compliant': overall_compliance,
                'checks': compliance_checks,
                'recommendations': [
                    'Configure VAT registration number' if not compliance_checks[
                        'vat_registered'] else None,
                    'Complete business details' if not compliance_checks[
                        'business_details_complete'] else None,
                    'Set accounting periods' if not compliance_checks['accounting_period_set'] else None,
                    'Configure HMRC API credentials' if not compliance_checks[
                        'hmrc_credentials_configured'] else None
                ]
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
