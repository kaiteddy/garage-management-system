#!/usr/bin/env python3
"""
VAT/MTD Compliance Service
Handles VAT calculations, MTD submissions, and HMRC API integration
"""

import os
import json
import requests
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
import sqlite3
from dataclasses import dataclass

@dataclass
class VATRate:
    """VAT rate configuration"""
    rate: Decimal
    description: str
    code: str

class VATService:
    """Service for VAT calculations and MTD compliance"""
    
    # UK VAT rates as of 2024
    VAT_RATES = {
        'STANDARD': VATRate(Decimal('0.20'), 'Standard Rate', 'S'),
        'REDUCED': VATRate(Decimal('0.05'), 'Reduced Rate', 'R'),
        'ZERO': VATRate(Decimal('0.00'), 'Zero Rate', 'Z'),
        'EXEMPT': VATRate(Decimal('0.00'), 'Exempt', 'E')
    }
    
    def __init__(self, db_path: str, hmrc_client_id: str = None, hmrc_client_secret: str = None):
        self.db_path = db_path
        self.hmrc_client_id = hmrc_client_id or os.getenv('HMRC_CLIENT_ID')
        self.hmrc_client_secret = hmrc_client_secret or os.getenv('HMRC_CLIENT_SECRET')
        self.hmrc_base_url = 'https://api.service.hmrc.gov.uk'
        self.hmrc_sandbox_url = 'https://test-api.service.hmrc.gov.uk'
        self.is_sandbox = os.getenv('HMRC_SANDBOX', 'true').lower() == 'true'
        
    def calculate_vat(self, net_amount: float, vat_rate_code: str = 'STANDARD') -> Dict[str, Decimal]:
        """
        Calculate VAT amounts with precision
        
        Args:
            net_amount: Net amount before VAT
            vat_rate_code: VAT rate code (STANDARD, REDUCED, ZERO, EXEMPT)
            
        Returns:
            Dict with net, vat, and gross amounts
        """
        try:
            net = Decimal(str(net_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            vat_rate = self.VAT_RATES.get(vat_rate_code, self.VAT_RATES['STANDARD'])
            
            vat_amount = (net * vat_rate.rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            gross_amount = net + vat_amount
            
            return {
                'net_amount': net,
                'vat_amount': vat_amount,
                'gross_amount': gross_amount,
                'vat_rate': vat_rate.rate,
                'vat_rate_code': vat_rate_code,
                'vat_rate_description': vat_rate.description
            }
        except Exception as e:
            raise ValueError(f"VAT calculation error: {str(e)}")
    
    def get_vat_registration_info(self) -> Dict[str, str]:
        """Get VAT registration information from settings"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT setting_key, setting_value 
                FROM system_settings 
                WHERE setting_key LIKE 'vat_%'
            ''')
            
            vat_settings = {}
            for row in cursor.fetchall():
                vat_settings[row[0]] = row[1]
            
            conn.close()
            
            return {
                'vat_number': vat_settings.get('vat_registration_number', ''),
                'vat_scheme': vat_settings.get('vat_scheme', 'STANDARD'),
                'accounting_period_start': vat_settings.get('vat_period_start', ''),
                'accounting_period_end': vat_settings.get('vat_period_end', ''),
                'business_name': vat_settings.get('business_name', ''),
                'business_address': vat_settings.get('business_address', '')
            }
        except Exception as e:
            return {}
    
    def update_vat_registration(self, vat_data: Dict[str, str]) -> bool:
        """Update VAT registration information"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create settings table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key VARCHAR(100) UNIQUE NOT NULL,
                    setting_value TEXT,
                    setting_type VARCHAR(50) DEFAULT 'string',
                    description TEXT,
                    created_date DATE DEFAULT CURRENT_DATE,
                    updated_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Update VAT settings
            vat_settings = [
                ('vat_registration_number', vat_data.get('vat_number', '')),
                ('vat_scheme', vat_data.get('vat_scheme', 'STANDARD')),
                ('vat_period_start', vat_data.get('accounting_period_start', '')),
                ('vat_period_end', vat_data.get('accounting_period_end', '')),
                ('business_name', vat_data.get('business_name', '')),
                ('business_address', vat_data.get('business_address', ''))
            ]
            
            for key, value in vat_settings:
                cursor.execute('''
                    INSERT OR REPLACE INTO system_settings 
                    (setting_key, setting_value, setting_type, description, updated_date)
                    VALUES (?, ?, 'string', ?, CURRENT_DATE)
                ''', (key, value, f'VAT {key.replace("_", " ").title()}'))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error updating VAT registration: {str(e)}")
            return False
    
    def get_vat_transactions(self, start_date: str, end_date: str) -> List[Dict]:
        """Get VAT transactions for a period"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT i.id, i.invoice_number, i.amount, i.vat_amount, i.total_amount,
                       i.created_date, i.status, c.name as customer_name,
                       c.account_number, j.description as job_description
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                LEFT JOIN jobs j ON i.job_id = j.id
                WHERE i.created_date BETWEEN ? AND ?
                AND i.status != 'CANCELLED'
                ORDER BY i.created_date
            ''', (start_date, end_date))
            
            transactions = []
            for row in cursor.fetchall():
                transactions.append({
                    'id': row[0],
                    'invoice_number': row[1],
                    'net_amount': float(row[2]),
                    'vat_amount': float(row[3]),
                    'gross_amount': float(row[4]),
                    'date': row[5],
                    'status': row[6],
                    'customer_name': row[7],
                    'customer_account': row[8],
                    'description': row[9]
                })
            
            conn.close()
            return transactions
            
        except Exception as e:
            print(f"Error getting VAT transactions: {str(e)}")
            return []
    
    def generate_vat_return_data(self, period_start: str, period_end: str) -> Dict:
        """Generate VAT return data for MTD submission"""
        try:
            transactions = self.get_vat_transactions(period_start, period_end)
            
            # Calculate totals
            total_vat_due = sum(t['vat_amount'] for t in transactions)
            total_value_sales_ex_vat = sum(t['net_amount'] for t in transactions)
            total_value_sales_inc_vat = sum(t['gross_amount'] for t in transactions)
            
            # VAT return data structure for HMRC
            vat_return = {
                'periodKey': self._generate_period_key(period_start, period_end),
                'vatDueSales': round(total_vat_due, 2),  # Box 1
                'vatDueAcquisitions': 0.00,  # Box 2 - EU acquisitions
                'totalVatDue': round(total_vat_due, 2),  # Box 3
                'vatReclaimedCurrPeriod': 0.00,  # Box 4 - VAT reclaimed
                'netVatDue': round(total_vat_due, 2),  # Box 5
                'totalValueSalesExVAT': int(total_value_sales_ex_vat),  # Box 6
                'totalValuePurchasesExVAT': 0,  # Box 7 - purchases
                'totalValueGoodsSuppliedExVAT': 0,  # Box 8 - EU supplies
                'totalAcquisitionsExVAT': 0,  # Box 9 - EU acquisitions
                'finalised': True
            }
            
            return {
                'success': True,
                'vat_return': vat_return,
                'period_start': period_start,
                'period_end': period_end,
                'transaction_count': len(transactions),
                'transactions': transactions
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_period_key(self, start_date: str, end_date: str) -> str:
        """Generate period key for HMRC submission"""
        # Format: #001 for first quarter, #002 for second, etc.
        start = datetime.strptime(start_date, '%Y-%m-%d')
        quarter = ((start.month - 1) // 3) + 1
        return f"#{quarter:03d}"
    
    def submit_vat_return(self, vat_return_data: Dict) -> Dict:
        """Submit VAT return to HMRC (sandbox/production)"""
        try:
            if not self.hmrc_client_id or not self.hmrc_client_secret:
                return {
                    'success': False,
                    'error': 'HMRC credentials not configured'
                }
            
            # Get access token
            token_response = self._get_hmrc_access_token()
            if not token_response.get('success'):
                return token_response
            
            access_token = token_response['access_token']
            
            # Submit VAT return
            base_url = self.hmrc_sandbox_url if self.is_sandbox else self.hmrc_base_url
            vat_info = self.get_vat_registration_info()
            vat_number = vat_info.get('vat_number')
            
            if not vat_number:
                return {
                    'success': False,
                    'error': 'VAT registration number not configured'
                }
            
            url = f"{base_url}/organisations/vat/{vat_number}/returns"
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.hmrc.1.0+json'
            }
            
            response = requests.post(url, json=vat_return_data, headers=headers)
            
            if response.status_code == 201:
                # Log successful submission
                self._log_vat_submission(vat_return_data, response.json())
                
                return {
                    'success': True,
                    'submission_id': response.json().get('processingDate'),
                    'receipt': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f'HMRC API error: {response.status_code} - {response.text}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'VAT submission error: {str(e)}'
            }
    
    def _get_hmrc_access_token(self) -> Dict:
        """Get OAuth access token from HMRC"""
        try:
            base_url = self.hmrc_sandbox_url if self.is_sandbox else self.hmrc_base_url
            url = f"{base_url}/oauth/token"
            
            data = {
                'grant_type': 'client_credentials',
                'client_id': self.hmrc_client_id,
                'client_secret': self.hmrc_client_secret,
                'scope': 'write:vat'
            }
            
            response = requests.post(url, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                return {
                    'success': True,
                    'access_token': token_data['access_token'],
                    'expires_in': token_data.get('expires_in', 3600)
                }
            else:
                return {
                    'success': False,
                    'error': f'Token request failed: {response.status_code} - {response.text}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Token request error: {str(e)}'
            }
    
    def _log_vat_submission(self, vat_return_data: Dict, response_data: Dict):
        """Log VAT submission for audit trail"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create VAT submissions log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vat_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    period_key VARCHAR(10),
                    submission_date DATE DEFAULT CURRENT_DATE,
                    vat_return_data TEXT,
                    hmrc_response TEXT,
                    status VARCHAR(20) DEFAULT 'SUBMITTED',
                    processing_date VARCHAR(50),
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                INSERT INTO vat_submissions 
                (period_key, vat_return_data, hmrc_response, processing_date)
                VALUES (?, ?, ?, ?)
            ''', (
                vat_return_data.get('periodKey'),
                json.dumps(vat_return_data),
                json.dumps(response_data),
                response_data.get('processingDate')
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error logging VAT submission: {str(e)}")
