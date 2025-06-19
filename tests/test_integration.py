#!/usr/bin/env python3
"""
Integration Tests for Enhanced Garage Management System
Tests all new services and their interactions
"""

import unittest
import tempfile
import os
import json
from datetime import datetime, timedelta

# Import all services for testing
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.vat_service import VATService
from services.gdpr_service import GDPRService
from services.enhanced_dvsa_service import EnhancedDVSAService
from services.audit_service import AuditService
from services.workshop_diary_service import WorkshopDiaryService
from services.digital_job_sheets_service import DigitalJobSheetsService
from services.parts_supplier_service import PartsSupplierService
from services.customer_portal_service import CustomerPortalService
from services.error_monitoring_service import ErrorMonitoringService

class TestServiceIntegration(unittest.TestCase):
    """Test integration between all enhanced services"""
    
    def setUp(self):
        """Set up test database and services"""
        self.test_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.test_db.close()
        self.db_path = self.test_db.name
        
        # Initialize all services
        self.vat_service = VATService(self.db_path)
        self.gdpr_service = GDPRService(self.db_path)
        self.dvsa_service = EnhancedDVSAService(self.db_path)
        self.audit_service = AuditService(self.db_path)
        self.workshop_service = WorkshopDiaryService(self.db_path)
        self.job_sheets_service = DigitalJobSheetsService(self.db_path)
        self.parts_service = PartsSupplierService(self.db_path)
        self.portal_service = CustomerPortalService(self.db_path)
        self.monitoring_service = ErrorMonitoringService(self.db_path)
        
        # Create test data
        self._create_test_data()
    
    def tearDown(self):
        """Clean up test database"""
        try:
            os.unlink(self.db_path)
        except:
            pass
    
    def _create_test_data(self):
        """Create test data for integration tests"""
        import sqlite3
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create basic tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                created_date DATE DEFAULT CURRENT_DATE
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                registration VARCHAR(10),
                make VARCHAR(50),
                model VARCHAR(50),
                year INTEGER,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                vehicle_id INTEGER,
                job_number VARCHAR(50),
                description TEXT,
                status VARCHAR(20) DEFAULT 'PENDING',
                labour_cost REAL DEFAULT 0,
                parts_cost REAL DEFAULT 0,
                total_amount REAL DEFAULT 0,
                created_date DATE DEFAULT CURRENT_DATE,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                vehicle_id INTEGER,
                job_id INTEGER,
                appointment_date DATE,
                start_time TIME,
                end_time TIME,
                estimated_duration INTEGER DEFAULT 60,
                status VARCHAR(20) DEFAULT 'SCHEDULED',
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        
        # Insert test customer
        cursor.execute('''
            INSERT INTO customers (id, name, email, phone, address)
            VALUES (1, 'Test Customer', 'test@example.com', '01234567890', 'Test Address')
        ''')
        
        # Insert test vehicle
        cursor.execute('''
            INSERT INTO vehicles (id, customer_id, registration, make, model, year)
            VALUES (1, 1, 'TEST123', 'Test Make', 'Test Model', 2020)
        ''')
        
        # Insert test job
        cursor.execute('''
            INSERT INTO jobs (id, customer_id, vehicle_id, job_number, description, labour_cost, parts_cost, total_amount)
            VALUES (1, 1, 1, 'JOB001', 'Test Service', 100.0, 50.0, 150.0)
        ''')
        
        conn.commit()
        conn.close()
    
    def test_vat_service_integration(self):
        """Test VAT service functionality"""
        # Test VAT calculation
        calculation = self.vat_service.calculate_vat(100.0, 'STANDARD')
        self.assertEqual(calculation['net_amount'], 100.0)
        self.assertEqual(calculation['vat_amount'], 20.0)
        self.assertEqual(calculation['gross_amount'], 120.0)
        
        # Test VAT registration
        vat_data = {
            'vat_number': '123456789',
            'business_name': 'Test Garage',
            'business_address': 'Test Address'
        }
        result = self.vat_service.update_vat_registration(vat_data)
        self.assertTrue(result)
        
        # Test VAT return generation
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')
        vat_return = self.vat_service.generate_vat_return_data(start_date, end_date)
        self.assertTrue(vat_return['success'])
    
    def test_gdpr_service_integration(self):
        """Test GDPR service functionality"""
        # Test consent recording
        result = self.gdpr_service.record_consent(
            customer_id=1,
            purpose='marketing',
            granted=True,
            ip_address='127.0.0.1'
        )
        self.assertTrue(result)
        
        # Test data export
        export_result = self.gdpr_service.export_customer_data(1)
        self.assertTrue(export_result['success'])
        self.assertIn('customer', export_result['data'])
        
        # Test consent retrieval
        consents = self.gdpr_service.get_customer_consents(1)
        self.assertEqual(len(consents), 1)
        self.assertEqual(consents[0]['purpose'], 'marketing')
    
    def test_workshop_diary_integration(self):
        """Test workshop diary service functionality"""
        # Test technician creation
        import sqlite3
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO technicians (id, name, skills)
            VALUES (1, 'Test Technician', '["brakes", "engine"]')
        ''')
        conn.commit()
        conn.close()
        
        # Test availability checking
        availability = self.workshop_service.check_availability(
            date='2024-01-15',
            start_time='09:00',
            end_time='10:00',
            technician_id=1
        )
        self.assertTrue(availability['available'])
        
        # Test scheduling suggestions
        suggestions = self.workshop_service.get_optimal_scheduling_suggestions(
            service_type='brake_service',
            estimated_duration=60
        )
        self.assertIsInstance(suggestions, list)
    
    def test_job_sheets_integration(self):
        """Test digital job sheets service functionality"""
        # Test template creation
        template_result = self.job_sheets_service.create_job_sheet_template(
            name='Brake Service Template',
            service_type='brake_service',
            description='Standard brake service template',
            default_instructions='Check brake pads and discs',
            default_safety_notes='Use proper lifting equipment',
            default_parts=['brake_pads', 'brake_fluid'],
            default_tools=['jack', 'wrench_set'],
            default_checks=['brake_pad_thickness', 'brake_fluid_level']
        )
        self.assertTrue(template_result['success'])
        
        # Test job sheet creation
        sheet_result = self.job_sheets_service.create_job_sheet_from_template(
            job_id=1,
            template_id=template_result['template_id']
        )
        self.assertTrue(sheet_result['success'])
        
        # Test digital signature
        signature_result = self.job_sheets_service.add_digital_signature(
            job_sheet_id=sheet_result['job_sheet_id'],
            signature_type='TECHNICIAN',
            signature_data='base64_signature_data',
            signer_name='Test Technician',
            signer_role='Technician'
        )
        self.assertTrue(signature_result['success'])
    
    def test_parts_supplier_integration(self):
        """Test parts supplier service functionality"""
        # Test supplier configuration
        supplier_result = self.parts_service.add_supplier_config(
            name='Test Supplier',
            api_endpoint='https://api.testsupplier.com',
            api_key='test_api_key'
        )
        self.assertTrue(supplier_result['success'])
        
        # Test parts search (mock)
        search_results = self.parts_service.search_parts_gsf('brake pads')
        self.assertIsInstance(search_results, list)
        
        # Test parts catalog
        catalog = self.parts_service.get_parts_catalog()
        self.assertIsInstance(catalog, list)
    
    def test_customer_portal_integration(self):
        """Test customer portal service functionality"""
        # Test session creation
        session_result = self.portal_service.create_customer_session(
            customer_email='test@example.com',
            ip_address='127.0.0.1'
        )
        self.assertTrue(session_result['success'])
        
        # Test session validation
        validation_result = self.portal_service.validate_session(
            session_result['session_token']
        )
        self.assertTrue(validation_result['success'])
        
        # Test customer jobs retrieval
        jobs = self.portal_service.get_customer_jobs(1)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]['job_number'], 'JOB001')
    
    def test_audit_service_integration(self):
        """Test audit service functionality"""
        from services.audit_service import AuditEvent, AuditEventType, AuditSeverity
        
        # Test audit event logging
        event = AuditEvent(
            event_type=AuditEventType.DATA_ACCESS,
            severity=AuditSeverity.LOW,
            user_id='test_user',
            resource_type='customer',
            resource_id='1',
            action='view_customer_data',
            details={'customer_id': 1},
            ip_address='127.0.0.1',
            user_agent='test_agent',
            timestamp=datetime.now()
        )
        
        result = self.audit_service.log_event(event)
        self.assertTrue(result)
        
        # Test audit trail retrieval
        trail = self.audit_service.get_audit_trail(
            resource_type='customer',
            resource_id='1',
            limit=10
        )
        self.assertEqual(len(trail), 1)
    
    def test_error_monitoring_integration(self):
        """Test error monitoring service functionality"""
        # Test health metric logging
        self.monitoring_service.log_system_health_metric(
            metric_name='cpu_usage',
            value=45.5,
            unit='percent',
            warning_threshold=70.0,
            critical_threshold=90.0
        )
        
        # Test error report creation
        try:
            raise ValueError("Test error for monitoring")
        except Exception as e:
            report = self.monitoring_service.create_error_report(
                error=e,
                endpoint='test_endpoint',
                user_id='test_user'
            )
            self.assertIn('Error report created', report)
        
        # Test health report generation
        health_report = self.monitoring_service.get_system_health_report(hours=1)
        self.assertTrue(health_report['success'])
    
    def test_cross_service_integration(self):
        """Test integration between multiple services"""
        # Test workflow: Customer portal -> Job creation -> Workshop scheduling -> Job sheets
        
        # 1. Customer creates online booking
        booking_result = self.portal_service.create_online_booking({
            'customer_name': 'Test Customer',
            'customer_email': 'test@example.com',
            'customer_phone': '01234567890',
            'vehicle_registration': 'TEST123',
            'vehicle_make': 'Test Make',
            'vehicle_model': 'Test Model',
            'service_type': 'brake_service',
            'preferred_date': '2024-01-15',
            'preferred_time': '09:00',
            'description': 'Brake service required'
        })
        self.assertTrue(booking_result['success'])
        
        # 2. Create job sheet for the service
        template_result = self.job_sheets_service.create_job_sheet_template(
            name='Integration Test Template',
            service_type='brake_service',
            description='Integration test template'
        )
        self.assertTrue(template_result['success'])
        
        sheet_result = self.job_sheets_service.create_job_sheet_from_template(
            job_id=1,
            template_id=template_result['template_id']
        )
        self.assertTrue(sheet_result['success'])
        
        # 3. Record parts usage
        parts_result = self.parts_service.record_parts_usage(
            job_id=1,
            parts_used=[{
                'part_number': 'BP001',
                'description': 'Brake Pads',
                'quantity': 1,
                'unit_cost': 25.0
            }],
            technician='Test Technician'
        )
        self.assertTrue(parts_result['success'])
        
        # 4. Log audit trail for the workflow
        from services.audit_service import AuditEvent, AuditEventType, AuditSeverity
        
        workflow_event = AuditEvent(
            event_type=AuditEventType.DATA_MODIFY,
            severity=AuditSeverity.LOW,
            user_id='system',
            resource_type='job',
            resource_id='1',
            action='complete_service_workflow',
            details={
                'booking_id': booking_result['booking_id'],
                'job_sheet_id': sheet_result['job_sheet_id'],
                'parts_cost': parts_result['total_parts_cost']
            },
            ip_address='127.0.0.1',
            user_agent='integration_test',
            timestamp=datetime.now()
        )
        
        audit_result = self.audit_service.log_event(workflow_event)
        self.assertTrue(audit_result)
        
        # 5. Generate VAT calculation for the completed job
        vat_calc = self.vat_service.calculate_vat(150.0, 'STANDARD')  # Job total
        self.assertEqual(vat_calc['gross_amount'], 180.0)  # 150 + 30 VAT

if __name__ == '__main__':
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    unittest.main(verbosity=2)
