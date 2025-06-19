"""
Intelligent Data Linking Service
Uses the intelligent search engine for improved data import and linking
"""

import sqlite3
import csv
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from services.intelligent_search import IntelligentSearchEngine
import logging


class IntelligentDataLinker:
    """
    Enhanced data linking using intelligent search capabilities
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.search_engine = IntelligentSearchEngine(db_path)
        self.linking_stats = {
            'customers_processed': 0,
            'customers_linked': 0,
            'customers_created': 0,
            'vehicles_processed': 0,
            'vehicles_linked': 0,
            'vehicles_created': 0,
            'jobs_processed': 0,
            'jobs_linked': 0,
            'jobs_created': 0,
            'linking_confidence_scores': []
        }
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def import_customers_with_linking(self, customer_data: List[Dict[str, Any]], 
                                    confidence_threshold: float = 0.8) -> Dict[str, Any]:
        """Import customers with intelligent linking to existing records"""
        results = {
            'success': True,
            'processed': 0,
            'linked': 0,
            'created': 0,
            'errors': [],
            'linking_details': []
        }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for customer in customer_data:
                try:
                    self.linking_stats['customers_processed'] += 1
                    results['processed'] += 1
                    
                    # Find potential matches
                    matches = self.search_engine.find_customer_matches(customer, confidence_threshold)
                    
                    if matches:
                        # Link to existing customer
                        customer_id, confidence = matches[0]  # Best match
                        self.linking_stats['customers_linked'] += 1
                        self.linking_stats['linking_confidence_scores'].append(confidence)
                        results['linked'] += 1
                        
                        # Update existing customer with new data
                        self._update_customer_record(cursor, customer_id, customer)
                        
                        results['linking_details'].append({
                            'action': 'linked',
                            'customer_id': customer_id,
                            'confidence': confidence,
                            'data': customer
                        })
                        
                        self.logger.info(f"Linked customer {customer.get('name', 'Unknown')} to existing ID {customer_id} (confidence: {confidence:.3f})")
                        
                    else:
                        # Create new customer
                        customer_id = self._create_customer_record(cursor, customer)
                        self.linking_stats['customers_created'] += 1
                        results['created'] += 1
                        
                        results['linking_details'].append({
                            'action': 'created',
                            'customer_id': customer_id,
                            'confidence': 0.0,
                            'data': customer
                        })
                        
                        self.logger.info(f"Created new customer {customer.get('name', 'Unknown')} with ID {customer_id}")
                
                except Exception as e:
                    error_msg = f"Error processing customer {customer.get('name', 'Unknown')}: {str(e)}"
                    results['errors'].append(error_msg)
                    self.logger.error(error_msg)
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            results['success'] = False
            results['errors'].append(f"Database error: {str(e)}")
            self.logger.error(f"Database error during customer import: {str(e)}")
        finally:
            conn.close()
        
        return results
    
    def import_vehicles_with_linking(self, vehicle_data: List[Dict[str, Any]], 
                                   confidence_threshold: float = 0.9) -> Dict[str, Any]:
        """Import vehicles with intelligent linking to existing records and customers"""
        results = {
            'success': True,
            'processed': 0,
            'linked': 0,
            'created': 0,
            'errors': [],
            'linking_details': []
        }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for vehicle in vehicle_data:
                try:
                    self.linking_stats['vehicles_processed'] += 1
                    results['processed'] += 1
                    
                    # Find potential vehicle matches
                    vehicle_matches = self.search_engine.find_vehicle_matches(vehicle, confidence_threshold)
                    
                    if vehicle_matches:
                        # Link to existing vehicle
                        vehicle_id, confidence = vehicle_matches[0]  # Best match
                        self.linking_stats['vehicles_linked'] += 1
                        self.linking_stats['linking_confidence_scores'].append(confidence)
                        results['linked'] += 1
                        
                        # Update existing vehicle
                        self._update_vehicle_record(cursor, vehicle_id, vehicle)
                        
                        results['linking_details'].append({
                            'action': 'linked',
                            'vehicle_id': vehicle_id,
                            'confidence': confidence,
                            'data': vehicle
                        })
                        
                        self.logger.info(f"Linked vehicle {vehicle.get('registration', 'Unknown')} to existing ID {vehicle_id} (confidence: {confidence:.3f})")
                        
                    else:
                        # Try to link to customer first
                        customer_id = self._find_or_create_customer_for_vehicle(cursor, vehicle)
                        
                        # Create new vehicle
                        vehicle['customer_id'] = customer_id
                        vehicle_id = self._create_vehicle_record(cursor, vehicle)
                        self.linking_stats['vehicles_created'] += 1
                        results['created'] += 1
                        
                        results['linking_details'].append({
                            'action': 'created',
                            'vehicle_id': vehicle_id,
                            'customer_id': customer_id,
                            'confidence': 0.0,
                            'data': vehicle
                        })
                        
                        self.logger.info(f"Created new vehicle {vehicle.get('registration', 'Unknown')} with ID {vehicle_id}")
                
                except Exception as e:
                    error_msg = f"Error processing vehicle {vehicle.get('registration', 'Unknown')}: {str(e)}"
                    results['errors'].append(error_msg)
                    self.logger.error(error_msg)
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            results['success'] = False
            results['errors'].append(f"Database error: {str(e)}")
            self.logger.error(f"Database error during vehicle import: {str(e)}")
        finally:
            conn.close()
        
        return results
    
    def import_jobs_with_linking(self, job_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Import jobs with intelligent linking to customers and vehicles"""
        results = {
            'success': True,
            'processed': 0,
            'linked': 0,
            'created': 0,
            'errors': [],
            'linking_details': []
        }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for job in job_data:
                try:
                    self.linking_stats['jobs_processed'] += 1
                    results['processed'] += 1
                    
                    # Find customer and vehicle for this job
                    customer_id = self._find_customer_for_job(job)
                    vehicle_id = self._find_vehicle_for_job(job, customer_id)
                    
                    if customer_id or vehicle_id:
                        # Create job with links
                        job['customer_id'] = customer_id
                        job['vehicle_id'] = vehicle_id
                        job_id = self._create_job_record(cursor, job)
                        
                        self.linking_stats['jobs_created'] += 1
                        results['created'] += 1
                        
                        results['linking_details'].append({
                            'action': 'created',
                            'job_id': job_id,
                            'customer_id': customer_id,
                            'vehicle_id': vehicle_id,
                            'data': job
                        })
                        
                        self.logger.info(f"Created job {job.get('job_number', 'Unknown')} with customer_id={customer_id}, vehicle_id={vehicle_id}")
                    
                    else:
                        error_msg = f"Could not link job {job.get('job_number', 'Unknown')} to customer or vehicle"
                        results['errors'].append(error_msg)
                        self.logger.warning(error_msg)
                
                except Exception as e:
                    error_msg = f"Error processing job {job.get('job_number', 'Unknown')}: {str(e)}"
                    results['errors'].append(error_msg)
                    self.logger.error(error_msg)
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            results['success'] = False
            results['errors'].append(f"Database error: {str(e)}")
            self.logger.error(f"Database error during job import: {str(e)}")
        finally:
            conn.close()
        
        return results
    
    def _find_customer_for_job(self, job: Dict[str, Any]) -> Optional[int]:
        """Find customer ID for a job using intelligent search"""
        # Try different customer identification methods
        search_data = {}
        
        # Extract customer info from job data
        if job.get('customer_name'):
            search_data['name'] = job['customer_name']
        if job.get('customer_mobile'):
            search_data['mobile'] = job['customer_mobile']
        if job.get('customer_phone'):
            search_data['phone'] = job['customer_phone']
        if job.get('customer_email'):
            search_data['email'] = job['customer_email']
        if job.get('customer_account'):
            search_data['account_number'] = job['customer_account']
        
        if search_data:
            matches = self.search_engine.find_customer_matches(search_data, threshold=0.7)
            if matches:
                return matches[0][0]  # Return best match ID
        
        return None
    
    def _find_vehicle_for_job(self, job: Dict[str, Any], customer_id: Optional[int] = None) -> Optional[int]:
        """Find vehicle ID for a job using intelligent search"""
        search_data = {}
        
        # Extract vehicle info from job data
        if job.get('vehicle_registration'):
            search_data['registration'] = job['vehicle_registration']
        if job.get('vehicle_make'):
            search_data['make'] = job['vehicle_make']
        if job.get('vehicle_model'):
            search_data['model'] = job['vehicle_model']
        
        if search_data:
            matches = self.search_engine.find_vehicle_matches(search_data, threshold=0.8)
            if matches:
                # If we have a customer_id, prefer vehicles owned by that customer
                if customer_id:
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    for vehicle_id, score in matches:
                        cursor.execute("SELECT customer_id FROM vehicles WHERE id = ?", (vehicle_id,))
                        result = cursor.fetchone()
                        if result and result[0] == customer_id:
                            conn.close()
                            return vehicle_id
                    conn.close()
                
                return matches[0][0]  # Return best match ID
        
        return None

    def _find_or_create_customer_for_vehicle(self, cursor, vehicle: Dict[str, Any]) -> Optional[int]:
        """Find or create customer for a vehicle"""
        # Try to find existing customer
        customer_data = {}
        if vehicle.get('customer_name'):
            customer_data['name'] = vehicle['customer_name']
        if vehicle.get('customer_mobile'):
            customer_data['mobile'] = vehicle['customer_mobile']
        if vehicle.get('customer_phone'):
            customer_data['phone'] = vehicle['customer_phone']
        if vehicle.get('customer_email'):
            customer_data['email'] = vehicle['customer_email']

        if customer_data:
            matches = self.search_engine.find_customer_matches(customer_data, threshold=0.7)
            if matches:
                return matches[0][0]  # Return existing customer ID

            # Create new customer
            return self._create_customer_record(cursor, customer_data)

        return None

    def _create_customer_record(self, cursor, customer: Dict[str, Any]) -> int:
        """Create a new customer record"""
        cursor.execute('''
            INSERT INTO customers (account_number, name, phone, mobile, email, address, postcode, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
        ''', (
            customer.get('account_number'),
            customer.get('name'),
            customer.get('phone'),
            customer.get('mobile'),
            customer.get('email'),
            customer.get('address'),
            customer.get('postcode')
        ))
        return cursor.lastrowid

    def _create_vehicle_record(self, cursor, vehicle: Dict[str, Any]) -> int:
        """Create a new vehicle record"""
        cursor.execute('''
            INSERT INTO vehicles (registration, make, model, year, color, fuel_type,
                                customer_id, mot_expiry, tax_due, mileage, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ''', (
            vehicle.get('registration'),
            vehicle.get('make'),
            vehicle.get('model'),
            vehicle.get('year'),
            vehicle.get('color'),
            vehicle.get('fuel_type'),
            vehicle.get('customer_id'),
            vehicle.get('mot_expiry'),
            vehicle.get('tax_due'),
            vehicle.get('mileage')
        ))
        return cursor.lastrowid

    def _create_job_record(self, cursor, job: Dict[str, Any]) -> int:
        """Create a new job record"""
        cursor.execute('''
            INSERT INTO jobs (job_number, description, status, customer_id, vehicle_id,
                            labour_cost, parts_cost, total_amount, created_date, assigned_technician)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        ''', (
            job.get('job_number'),
            job.get('description'),
            job.get('status', 'PENDING'),
            job.get('customer_id'),
            job.get('vehicle_id'),
            job.get('labour_cost', 0),
            job.get('parts_cost', 0),
            job.get('total_amount', 0),
            job.get('assigned_technician')
        ))
        return cursor.lastrowid

    def get_linking_statistics(self) -> Dict[str, Any]:
        """Get comprehensive linking statistics"""
        stats = self.linking_stats.copy()

        # Calculate linking rates
        if stats['customers_processed'] > 0:
            stats['customer_linking_rate'] = stats['customers_linked'] / stats['customers_processed']
        else:
            stats['customer_linking_rate'] = 0

        if stats['vehicles_processed'] > 0:
            stats['vehicle_linking_rate'] = stats['vehicles_linked'] / stats['vehicles_processed']
        else:
            stats['vehicle_linking_rate'] = 0

        # Calculate average confidence
        if stats['linking_confidence_scores']:
            stats['average_confidence'] = sum(stats['linking_confidence_scores']) / len(stats['linking_confidence_scores'])
            stats['min_confidence'] = min(stats['linking_confidence_scores'])
            stats['max_confidence'] = max(stats['linking_confidence_scores'])
        else:
            stats['average_confidence'] = 0
            stats['min_confidence'] = 0
            stats['max_confidence'] = 0

        return stats
