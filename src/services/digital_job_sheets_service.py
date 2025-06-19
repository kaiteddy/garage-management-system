#!/usr/bin/env python3
"""
Digital Job Sheets Service
Enhanced job sheet system with templates, digital signatures, and printable cards
"""

import os
import json
import sqlite3
import base64
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import hashlib

@dataclass
class JobSheetTemplate:
    """Job sheet template structure"""
    id: int
    name: str
    service_type: str
    description: str
    default_instructions: str
    default_safety_notes: str
    default_parts: List[str]
    default_tools: List[str]
    default_checks: List[str]
    estimated_time: int
    is_active: bool

@dataclass
class DigitalSignature:
    """Digital signature structure"""
    signature_data: str  # Base64 encoded signature
    signer_name: str
    signer_role: str
    timestamp: datetime
    ip_address: str

class DigitalJobSheetsService:
    """Service for digital job sheets with templates and signatures"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_job_sheet_tables()
    
    def _ensure_job_sheet_tables(self):
        """Create enhanced job sheet tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Enhanced job sheet templates table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS job_sheet_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    service_type VARCHAR(50),
                    description TEXT,
                    default_instructions TEXT,
                    default_safety_notes TEXT,
                    default_parts TEXT,
                    default_tools TEXT,
                    default_checks TEXT,
                    estimated_time INTEGER DEFAULT 60,
                    is_active BOOLEAN DEFAULT 1,
                    created_date DATE DEFAULT CURRENT_DATE,
                    updated_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Enhanced job sheets table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS job_sheets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    sheet_number VARCHAR(50) UNIQUE NOT NULL,
                    template_id INTEGER,
                    work_instructions TEXT,
                    safety_notes TEXT,
                    parts_required TEXT,
                    tools_required TEXT,
                    quality_checks TEXT,
                    technician_signature TEXT,
                    supervisor_signature TEXT,
                    customer_signature TEXT,
                    signed_date DATETIME,
                    completed_date DATETIME,
                    status VARCHAR(20) DEFAULT 'DRAFT',
                    created_date DATE DEFAULT CURRENT_DATE,
                    updated_date DATE DEFAULT CURRENT_DATE,
                    FOREIGN KEY (job_id) REFERENCES jobs (id),
                    FOREIGN KEY (template_id) REFERENCES job_sheet_templates (id)
                )
            ''')
            
            # Digital signatures table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS digital_signatures (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_sheet_id INTEGER NOT NULL,
                    signature_type VARCHAR(20) NOT NULL,
                    signature_data TEXT NOT NULL,
                    signer_name VARCHAR(100),
                    signer_role VARCHAR(50),
                    signer_ip VARCHAR(45),
                    signature_hash VARCHAR(64),
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    verified BOOLEAN DEFAULT 0,
                    FOREIGN KEY (job_sheet_id) REFERENCES job_sheets (id)
                )
            ''')
            
            # Job sheet attachments table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS job_sheet_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_sheet_id INTEGER NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    file_type VARCHAR(50),
                    file_size INTEGER,
                    file_path TEXT,
                    description TEXT,
                    uploaded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (job_sheet_id) REFERENCES job_sheets (id)
                )
            ''')
            
            # Quality control checklist table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS quality_control_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_sheet_id INTEGER NOT NULL,
                    check_item VARCHAR(200) NOT NULL,
                    check_category VARCHAR(50),
                    is_completed BOOLEAN DEFAULT 0,
                    completed_by VARCHAR(100),
                    completed_date DATETIME,
                    notes TEXT,
                    FOREIGN KEY (job_sheet_id) REFERENCES job_sheets (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error creating job sheet tables: {str(e)}")
    
    def create_job_sheet_template(self, name: str, service_type: str, description: str,
                                 default_instructions: str = "", default_safety_notes: str = "",
                                 default_parts: List[str] = None, default_tools: List[str] = None,
                                 default_checks: List[str] = None, estimated_time: int = 60) -> Dict:
        """Create a new job sheet template"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO job_sheet_templates 
                (name, service_type, description, default_instructions, default_safety_notes,
                 default_parts, default_tools, default_checks, estimated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                name, service_type, description, default_instructions, default_safety_notes,
                json.dumps(default_parts or []), json.dumps(default_tools or []),
                json.dumps(default_checks or []), estimated_time
            ))
            
            template_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'template_id': template_id,
                'message': 'Job sheet template created successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_job_sheet_templates(self, service_type: str = None, active_only: bool = True) -> List[Dict]:
        """Get job sheet templates with optional filtering"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT id, name, service_type, description, default_instructions,
                       default_safety_notes, default_parts, default_tools, default_checks,
                       estimated_time, is_active, created_date
                FROM job_sheet_templates
                WHERE 1=1
            '''
            params = []
            
            if active_only:
                query += ' AND is_active = 1'
            
            if service_type:
                query += ' AND service_type = ?'
                params.append(service_type)
            
            query += ' ORDER BY name'
            
            cursor.execute(query, params)
            
            templates = []
            for row in cursor.fetchall():
                templates.append({
                    'id': row[0],
                    'name': row[1],
                    'service_type': row[2],
                    'description': row[3],
                    'default_instructions': row[4],
                    'default_safety_notes': row[5],
                    'default_parts': json.loads(row[6]) if row[6] else [],
                    'default_tools': json.loads(row[7]) if row[7] else [],
                    'default_checks': json.loads(row[8]) if row[8] else [],
                    'estimated_time': row[9],
                    'is_active': bool(row[10]),
                    'created_date': row[11]
                })
            
            conn.close()
            return templates
            
        except Exception as e:
            print(f"Error getting job sheet templates: {str(e)}")
            return []
    
    def create_job_sheet_from_template(self, job_id: int, template_id: int = None,
                                     custom_instructions: str = None) -> Dict:
        """Create a new job sheet from a template"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate unique sheet number
            sheet_number = f"JS-{datetime.now().strftime('%Y%m%d')}-{job_id:04d}"
            
            # Get template data if template_id provided
            work_instructions = custom_instructions or ""
            safety_notes = ""
            parts_required = "[]"
            tools_required = "[]"
            quality_checks = "[]"
            
            if template_id:
                cursor.execute('''
                    SELECT default_instructions, default_safety_notes, default_parts,
                           default_tools, default_checks
                    FROM job_sheet_templates WHERE id = ?
                ''', (template_id,))
                
                template = cursor.fetchone()
                if template:
                    work_instructions = custom_instructions or template[0] or ""
                    safety_notes = template[1] or ""
                    parts_required = template[2] or "[]"
                    tools_required = template[3] or "[]"
                    quality_checks = template[4] or "[]"
            
            # Create job sheet
            cursor.execute('''
                INSERT INTO job_sheets 
                (job_id, sheet_number, template_id, work_instructions, safety_notes,
                 parts_required, tools_required, quality_checks, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job_id, sheet_number, template_id, work_instructions, safety_notes,
                parts_required, tools_required, quality_checks, 'DRAFT'
            ))
            
            job_sheet_id = cursor.lastrowid
            
            # Create quality control items from template
            if quality_checks != "[]":
                try:
                    checks = json.loads(quality_checks)
                    for check in checks:
                        cursor.execute('''
                            INSERT INTO quality_control_items 
                            (job_sheet_id, check_item, check_category)
                            VALUES (?, ?, ?)
                        ''', (job_sheet_id, check, 'TEMPLATE'))
                except json.JSONDecodeError:
                    pass
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'job_sheet_id': job_sheet_id,
                'sheet_number': sheet_number,
                'message': 'Job sheet created successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_job_sheet(self, job_sheet_id: int) -> Dict:
        """Get a complete job sheet with all details"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get job sheet details
            cursor.execute('''
                SELECT js.id, js.job_id, js.sheet_number, js.template_id, js.work_instructions,
                       js.safety_notes, js.parts_required, js.tools_required, js.quality_checks,
                       js.technician_signature, js.supervisor_signature, js.customer_signature,
                       js.signed_date, js.completed_date, js.status, js.created_date,
                       j.job_number, j.description as job_description, j.assigned_technician,
                       c.name as customer_name, c.phone as customer_phone,
                       v.registration, v.make, v.model,
                       t.name as template_name, t.service_type
                FROM job_sheets js
                LEFT JOIN jobs j ON js.job_id = j.id
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
                LEFT JOIN job_sheet_templates t ON js.template_id = t.id
                WHERE js.id = ?
            ''', (job_sheet_id,))

            sheet_row = cursor.fetchone()
            if not sheet_row:
                return {'success': False, 'error': 'Job sheet not found'}

            # Get quality control items
            cursor.execute('''
                SELECT id, check_item, check_category, is_completed, completed_by,
                       completed_date, notes
                FROM quality_control_items
                WHERE job_sheet_id = ?
                ORDER BY check_category, check_item
            ''', (job_sheet_id,))

            quality_items = []
            for row in cursor.fetchall():
                quality_items.append({
                    'id': row[0],
                    'check_item': row[1],
                    'check_category': row[2],
                    'is_completed': bool(row[3]),
                    'completed_by': row[4],
                    'completed_date': row[5],
                    'notes': row[6]
                })

            # Get digital signatures
            cursor.execute('''
                SELECT signature_type, signer_name, signer_role, timestamp, verified
                FROM digital_signatures
                WHERE job_sheet_id = ?
                ORDER BY timestamp
            ''', (job_sheet_id,))

            signatures = []
            for row in cursor.fetchall():
                signatures.append({
                    'signature_type': row[0],
                    'signer_name': row[1],
                    'signer_role': row[2],
                    'timestamp': row[3],
                    'verified': bool(row[4])
                })

            # Get attachments
            cursor.execute('''
                SELECT id, filename, file_type, file_size, description, uploaded_date
                FROM job_sheet_attachments
                WHERE job_sheet_id = ?
                ORDER BY uploaded_date
            ''', (job_sheet_id,))

            attachments = []
            for row in cursor.fetchall():
                attachments.append({
                    'id': row[0],
                    'filename': row[1],
                    'file_type': row[2],
                    'file_size': row[3],
                    'description': row[4],
                    'uploaded_date': row[5]
                })

            conn.close()

            # Build complete job sheet data
            job_sheet = {
                'id': sheet_row[0],
                'job_id': sheet_row[1],
                'sheet_number': sheet_row[2],
                'template_id': sheet_row[3],
                'work_instructions': sheet_row[4],
                'safety_notes': sheet_row[5],
                'parts_required': json.loads(sheet_row[6]) if sheet_row[6] else [],
                'tools_required': json.loads(sheet_row[7]) if sheet_row[7] else [],
                'quality_checks': json.loads(sheet_row[8]) if sheet_row[8] else [],
                'technician_signature': sheet_row[9],
                'supervisor_signature': sheet_row[10],
                'customer_signature': sheet_row[11],
                'signed_date': sheet_row[12],
                'completed_date': sheet_row[13],
                'status': sheet_row[14],
                'created_date': sheet_row[15],
                'job': {
                    'job_number': sheet_row[16],
                    'description': sheet_row[17],
                    'assigned_technician': sheet_row[18]
                },
                'customer': {
                    'name': sheet_row[19],
                    'phone': sheet_row[20]
                },
                'vehicle': {
                    'registration': sheet_row[21],
                    'make': sheet_row[22],
                    'model': sheet_row[23]
                },
                'template': {
                    'name': sheet_row[24],
                    'service_type': sheet_row[25]
                },
                'quality_control_items': quality_items,
                'digital_signatures': signatures,
                'attachments': attachments
            }

            return {
                'success': True,
                'job_sheet': job_sheet
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def update_quality_control_item(self, item_id: int, is_completed: bool,
                                   completed_by: str = None, notes: str = None) -> Dict:
        """Update a quality control item"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE quality_control_items
                SET is_completed = ?, completed_by = ?, completed_date = ?, notes = ?
                WHERE id = ?
            ''', (
                is_completed,
                completed_by if is_completed else None,
                datetime.now().isoformat() if is_completed else None,
                notes,
                item_id
            ))

            if cursor.rowcount == 0:
                conn.close()
                return {'success': False, 'error': 'Quality control item not found'}

            conn.commit()
            conn.close()

            return {
                'success': True,
                'message': 'Quality control item updated successfully'
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def generate_printable_job_card(self, job_sheet_id: int) -> Dict:
        """Generate a printable job card with all details"""
        try:
            job_sheet_result = self.get_job_sheet(job_sheet_id)
            if not job_sheet_result['success']:
                return job_sheet_result

            job_sheet = job_sheet_result['job_sheet']

            # Generate HTML for printable job card
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Job Sheet {job_sheet['sheet_number']}</title>
                <style>
                    body {{ font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }}
                    .header {{ text-align: center; border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 20px; }}
                    .company-name {{ font-size: 24px; font-weight: bold; color: #007AFF; }}
                    .sheet-number {{ font-size: 18px; margin-top: 10px; }}
                    .section {{ margin-bottom: 20px; }}
                    .section-title {{ font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }}
                    .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
                    .info-item {{ margin-bottom: 10px; }}
                    .label {{ font-weight: 600; color: #64748b; }}
                    .value {{ margin-left: 10px; }}
                    .signature-box {{ border: 1px solid #ccc; height: 60px; margin-top: 10px; }}
                    .quality-checklist {{ list-style: none; padding: 0; }}
                    .quality-item {{ padding: 5px 0; border-bottom: 1px dotted #ccc; }}
                    .checkbox {{ margin-right: 10px; }}
                    @media print {{ body {{ margin: 0; }} }}
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">Eli Motors</div>
                    <div class="sheet-number">Job Sheet: {job_sheet['sheet_number']}</div>
                    <div>Date: {job_sheet['created_date']}</div>
                </div>

                <div class="info-grid">
                    <div class="section">
                        <div class="section-title">Job Information</div>
                        <div class="info-item">
                            <span class="label">Job Number:</span>
                            <span class="value">{job_sheet['job']['job_number']}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Description:</span>
                            <span class="value">{job_sheet['job']['description']}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Technician:</span>
                            <span class="value">{job_sheet['job']['assigned_technician']}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Customer & Vehicle</div>
                        <div class="info-item">
                            <span class="label">Customer:</span>
                            <span class="value">{job_sheet['customer']['name']}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Phone:</span>
                            <span class="value">{job_sheet['customer']['phone']}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Vehicle:</span>
                            <span class="value">{job_sheet['vehicle']['registration']} - {job_sheet['vehicle']['make']} {job_sheet['vehicle']['model']}</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Work Instructions</div>
                    <p>{job_sheet['work_instructions'] or 'No specific instructions'}</p>
                </div>

                <div class="section">
                    <div class="section-title">Safety Notes</div>
                    <p>{job_sheet['safety_notes'] or 'Standard safety procedures apply'}</p>
                </div>

                <div class="info-grid">
                    <div class="section">
                        <div class="section-title">Parts Required</div>
                        <ul>
                            {''.join([f'<li>{part}</li>' for part in job_sheet['parts_required']])}
                        </ul>
                    </div>

                    <div class="section">
                        <div class="section-title">Tools Required</div>
                        <ul>
                            {''.join([f'<li>{tool}</li>' for tool in job_sheet['tools_required']])}
                        </ul>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Quality Control Checklist</div>
                    <ul class="quality-checklist">
                        {''.join([f'<li class="quality-item"><input type="checkbox" class="checkbox" {"checked" if item["is_completed"] else ""}>{item["check_item"]}</li>' for item in job_sheet['quality_control_items']])}
                    </ul>
                </div>

                <div class="info-grid">
                    <div class="section">
                        <div class="section-title">Technician Signature</div>
                        <div class="signature-box"></div>
                        <p>Name: _________________ Date: _________</p>
                    </div>

                    <div class="section">
                        <div class="section-title">Customer Signature</div>
                        <div class="signature-box"></div>
                        <p>Name: _________________ Date: _________</p>
                    </div>
                </div>
            </body>
            </html>
            """

            return {
                'success': True,
                'html_content': html_content,
                'sheet_number': job_sheet['sheet_number']
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_job_sheets_by_status(self, status: str = None) -> List[Dict]:
        """Get job sheets filtered by status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT js.id, js.sheet_number, js.status, js.created_date, js.completed_date,
                       j.job_number, j.description, j.assigned_technician,
                       c.name as customer_name, v.registration
                FROM job_sheets js
                LEFT JOIN jobs j ON js.job_id = j.id
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN vehicles v ON j.vehicle_id = v.id
            '''

            params = []
            if status:
                query += ' WHERE js.status = ?'
                params.append(status)

            query += ' ORDER BY js.created_date DESC'

            cursor.execute(query, params)

            job_sheets = []
            for row in cursor.fetchall():
                job_sheets.append({
                    'id': row[0],
                    'sheet_number': row[1],
                    'status': row[2],
                    'created_date': row[3],
                    'completed_date': row[4],
                    'job_number': row[5],
                    'job_description': row[6],
                    'assigned_technician': row[7],
                    'customer_name': row[8],
                    'vehicle_registration': row[9]
                })

            conn.close()
            return job_sheets

        except Exception as e:
            print(f"Error getting job sheets: {str(e)}")
            return []
    
    def add_digital_signature(self, job_sheet_id: int, signature_type: str,
                             signature_data: str, signer_name: str, signer_role: str,
                             signer_ip: str = None) -> Dict:
        """Add a digital signature to a job sheet"""
        try:
            # Validate signature type
            valid_types = ['TECHNICIAN', 'SUPERVISOR', 'CUSTOMER']
            if signature_type not in valid_types:
                return {
                    'success': False,
                    'error': f'Invalid signature type. Must be one of: {", ".join(valid_types)}'
                }
            
            # Generate signature hash for verification
            signature_hash = hashlib.sha256(
                f"{signature_data}{signer_name}{datetime.now().isoformat()}".encode()
            ).hexdigest()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Store digital signature
            cursor.execute('''
                INSERT INTO digital_signatures 
                (job_sheet_id, signature_type, signature_data, signer_name, signer_role,
                 signer_ip, signature_hash, verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job_sheet_id, signature_type, signature_data, signer_name, signer_role,
                signer_ip, signature_hash, True
            ))
            
            # Update job sheet with signature
            signature_column = f"{signature_type.lower()}_signature"
            cursor.execute(f'''
                UPDATE job_sheets 
                SET {signature_column} = ?, signed_date = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (signature_data, job_sheet_id))
            
            # Check if all required signatures are complete
            cursor.execute('''
                SELECT technician_signature, supervisor_signature, customer_signature
                FROM job_sheets WHERE id = ?
            ''', (job_sheet_id,))
            
            signatures = cursor.fetchone()
            if signatures and all(signatures):
                cursor.execute('''
                    UPDATE job_sheets 
                    SET status = 'COMPLETED', completed_date = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (job_sheet_id,))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'signature_hash': signature_hash,
                'message': f'{signature_type.title()} signature added successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
