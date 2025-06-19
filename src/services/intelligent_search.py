"""
Intelligent Search Engine for Garage Management System
Provides fuzzy matching, multi-field search, and data linking capabilities
"""

import re
import sqlite3
from typing import List, Dict, Any, Tuple, Optional
from difflib import SequenceMatcher
import unicodedata


class IntelligentSearchEngine:
    """
    Advanced search engine with fuzzy matching and multi-field capabilities
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.search_weights = {
            'mobile_phone': 1.0,      # Highest priority for customer identification
            'registration': 0.9,       # High priority for vehicle linking
            'email': 0.8,             # Good secondary identifier
            'postal_code': 0.7,       # Geographic matching
            'name': 0.6,              # Name matching (can be ambiguous)
            'account_number': 0.9     # High priority business identifier
        }
        
    def normalize_text(self, text: str) -> str:
        """Normalize text for consistent matching"""
        if not text:
            return ""
        
        # Convert to lowercase and remove accents
        text = unicodedata.normalize('NFD', str(text).lower())
        text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def normalize_phone(self, phone: str) -> str:
        """Normalize phone numbers for consistent matching"""
        if not phone:
            return ""
        
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', str(phone))
        
        # Handle UK numbers - remove leading country codes
        if digits_only.startswith('44'):
            digits_only = '0' + digits_only[2:]
        elif digits_only.startswith('0044'):
            digits_only = '0' + digits_only[4:]
        
        return digits_only
    
    def normalize_registration(self, reg: str) -> str:
        """Normalize vehicle registration numbers"""
        if not reg:
            return ""
        
        # Remove spaces, dashes, and convert to uppercase
        normalized = re.sub(r'[^A-Z0-9]', '', str(reg).upper())
        return normalized
    
    def normalize_postal_code(self, postcode: str) -> str:
        """Normalize postal codes"""
        if not postcode:
            return ""
        
        # Remove spaces and convert to uppercase
        normalized = re.sub(r'\s+', '', str(postcode).upper())
        return normalized
    
    def calculate_similarity(self, text1: str, text2: str, fuzzy: bool = True) -> float:
        """Calculate similarity between two text strings"""
        if not text1 or not text2:
            return 0.0
        
        text1_norm = self.normalize_text(text1)
        text2_norm = self.normalize_text(text2)
        
        # Exact match
        if text1_norm == text2_norm:
            return 1.0
        
        if not fuzzy:
            return 0.0
        
        # Fuzzy matching using sequence matcher
        similarity = SequenceMatcher(None, text1_norm, text2_norm).ratio()
        
        # Boost score for partial matches
        if text1_norm in text2_norm or text2_norm in text1_norm:
            similarity = max(similarity, 0.8)
        
        # Boost score for word-level matches
        words1 = set(text1_norm.split())
        words2 = set(text2_norm.split())
        if words1 & words2:  # Common words
            word_similarity = len(words1 & words2) / len(words1 | words2)
            similarity = max(similarity, word_similarity * 0.9)
        
        return similarity
    
    def search_customers(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search customers with intelligent matching"""
        if not query or len(query.strip()) < 2:
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all customers
        cursor.execute('''
            SELECT id, account_number, name, phone, mobile, email,
                   address, postcode, created_date
            FROM customers
            ORDER BY id DESC
            LIMIT 1000
        ''')
        
        customers = []
        for row in cursor.fetchall():
            customers.append({
                'id': row[0],
                'account_number': row[1],
                'name': row[2],
                'phone': row[3],
                'mobile': row[4],
                'email': row[5],
                'address': row[6],
                'postcode': row[7],
                'created_at': row[8]
            })
        
        conn.close()
        
        # Score and rank customers
        scored_customers = []
        for customer in customers:
            score = self._score_customer_match(customer, query)
            if score > 0.3:  # Minimum threshold
                customer['search_score'] = score
                scored_customers.append(customer)
        
        # Sort by score and return top results
        scored_customers.sort(key=lambda x: x['search_score'], reverse=True)
        return scored_customers[:limit]
    
    def search_vehicles(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search vehicles with intelligent matching"""
        if not query or len(query.strip()) < 2:
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get vehicles with customer info
        cursor.execute('''
            SELECT v.id, v.registration, v.make, v.model, v.year, v.color,
                   v.customer_id, v.created_at,
                   c.name as customer_name, c.mobile, c.account_number
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            ORDER BY v.id DESC
            LIMIT 1000
        ''')
        
        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'id': row[0],
                'registration': row[1],
                'make': row[2],
                'model': row[3],
                'year': row[4],
                'color': row[5],
                'customer_id': row[6],
                'created_at': row[7],
                'customer_name': row[8],
                'customer_mobile': row[9],
                'customer_account': row[10]
            })
        
        conn.close()
        
        # Score and rank vehicles
        scored_vehicles = []
        for vehicle in vehicles:
            score = self._score_vehicle_match(vehicle, query)
            if score > 0.3:  # Minimum threshold
                vehicle['search_score'] = score
                scored_vehicles.append(vehicle)
        
        # Sort by score and return top results
        scored_vehicles.sort(key=lambda x: x['search_score'], reverse=True)
        return scored_vehicles[:limit]
    
    def _score_customer_match(self, customer: Dict[str, Any], query: str) -> float:
        """Score how well a customer matches the search query"""
        max_score = 0.0
        
        # Normalize query
        query_norm = self.normalize_text(query)
        query_phone = self.normalize_phone(query)
        query_postal = self.normalize_postal_code(query)
        
        # Check mobile phone (highest priority)
        if customer.get('mobile'):
            mobile_norm = self.normalize_phone(customer['mobile'])
            if mobile_norm and query_phone:
                similarity = self.calculate_similarity(mobile_norm, query_phone, fuzzy=False)
                if similarity > 0.8:  # High threshold for phone numbers
                    max_score = max(max_score, similarity * self.search_weights['mobile_phone'])
        
        # Check regular phone
        if customer.get('phone'):
            phone_norm = self.normalize_phone(customer['phone'])
            if phone_norm and query_phone:
                similarity = self.calculate_similarity(phone_norm, query_phone, fuzzy=False)
                if similarity > 0.8:
                    max_score = max(max_score, similarity * self.search_weights['mobile_phone'] * 0.9)
        
        # Check email
        if customer.get('email'):
            email_similarity = self.calculate_similarity(customer['email'], query)
            max_score = max(max_score, email_similarity * self.search_weights['email'])
        
        # Check postal code
        if customer.get('postcode'):
            postal_norm = self.normalize_postal_code(customer['postcode'])
            if postal_norm and query_postal:
                postal_similarity = self.calculate_similarity(postal_norm, query_postal, fuzzy=False)
                max_score = max(max_score, postal_similarity * self.search_weights['postal_code'])
        
        # Check name (split into words for better matching)
        if customer.get('name'):
            name_similarity = self.calculate_similarity(customer['name'], query)
            max_score = max(max_score, name_similarity * self.search_weights['name'])
        
        # Check account number
        if customer.get('account_number'):
            account_similarity = self.calculate_similarity(str(customer['account_number']), query, fuzzy=False)
            max_score = max(max_score, account_similarity * self.search_weights['account_number'])
        
        return max_score
    
    def _score_vehicle_match(self, vehicle: Dict[str, Any], query: str) -> float:
        """Score how well a vehicle matches the search query"""
        max_score = 0.0
        
        # Normalize query
        query_norm = self.normalize_text(query)
        query_reg = self.normalize_registration(query)
        
        # Check registration (high priority)
        if vehicle.get('registration'):
            reg_norm = self.normalize_registration(vehicle['registration'])
            if reg_norm and query_reg:
                reg_similarity = self.calculate_similarity(reg_norm, query_reg, fuzzy=False)
                if reg_similarity > 0.8:  # High threshold for registration
                    max_score = max(max_score, reg_similarity * self.search_weights['registration'])
        
        # Check make and model
        if vehicle.get('make'):
            make_similarity = self.calculate_similarity(vehicle['make'], query)
            max_score = max(max_score, make_similarity * 0.6)
        
        if vehicle.get('model'):
            model_similarity = self.calculate_similarity(vehicle['model'], query)
            max_score = max(max_score, model_similarity * 0.6)
        
        # Check customer information
        if vehicle.get('customer_name'):
            name_similarity = self.calculate_similarity(vehicle['customer_name'], query)
            max_score = max(max_score, name_similarity * 0.5)
        
        if vehicle.get('customer_mobile'):
            query_phone = self.normalize_phone(query)
            mobile_norm = self.normalize_phone(vehicle['customer_mobile'])
            if mobile_norm and query_phone:
                phone_similarity = self.calculate_similarity(mobile_norm, query_phone, fuzzy=False)
                max_score = max(max_score, phone_similarity * 0.8)
        
        return max_score

    def unified_search(self, query: str, entity_types: List[str] = None, limit: int = 20) -> Dict[str, List[Dict[str, Any]]]:
        """Perform unified search across multiple entity types"""
        if entity_types is None:
            entity_types = ['customers', 'vehicles', 'jobs']

        results = {}

        if 'customers' in entity_types:
            results['customers'] = self.search_customers(query, limit)

        if 'vehicles' in entity_types:
            results['vehicles'] = self.search_vehicles(query, limit)

        if 'jobs' in entity_types:
            results['jobs'] = self.search_jobs(query, limit)

        return results

    def search_jobs(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search jobs with intelligent matching"""
        if not query or len(query.strip()) < 2:
            return []

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Get jobs with customer and vehicle info
        cursor.execute('''
            SELECT j.id, j.job_number, j.description, j.status, j.customer_id, j.vehicle_id,
                   j.created_date, j.assigned_technician,
                   c.name as customer_name, c.mobile, c.account_number,
                   v.registration, v.make, v.model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            ORDER BY j.id DESC
            LIMIT 1000
        ''')

        jobs = []
        for row in cursor.fetchall():
            jobs.append({
                'id': row[0],
                'job_number': row[1],
                'description': row[2],
                'status': row[3],
                'customer_id': row[4],
                'vehicle_id': row[5],
                'created_date': row[6],
                'assigned_technician': row[7],
                'customer_name': row[8],
                'customer_mobile': row[9],
                'customer_account': row[10],
                'vehicle_registration': row[11],
                'vehicle_make': row[12],
                'vehicle_model': row[13]
            })

        conn.close()

        # Score and rank jobs
        scored_jobs = []
        for job in jobs:
            score = self._score_job_match(job, query)
            if score > 0.3:  # Minimum threshold
                job['search_score'] = score
                scored_jobs.append(job)

        # Sort by score and return top results
        scored_jobs.sort(key=lambda x: x['search_score'], reverse=True)
        return scored_jobs[:limit]

    def _score_job_match(self, job: Dict[str, Any], query: str) -> float:
        """Score how well a job matches the search query"""
        max_score = 0.0

        # Check job number
        if job.get('job_number'):
            job_num_similarity = self.calculate_similarity(str(job['job_number']), query, fuzzy=False)
            max_score = max(max_score, job_num_similarity * 0.9)

        # Check description
        if job.get('description'):
            desc_similarity = self.calculate_similarity(job['description'], query)
            max_score = max(max_score, desc_similarity * 0.7)

        # Check customer information
        if job.get('customer_name'):
            name_similarity = self.calculate_similarity(job['customer_name'], query)
            max_score = max(max_score, name_similarity * 0.6)

        if job.get('customer_mobile'):
            query_phone = self.normalize_phone(query)
            mobile_norm = self.normalize_phone(job['customer_mobile'])
            if mobile_norm and query_phone:
                phone_similarity = self.calculate_similarity(mobile_norm, query_phone, fuzzy=False)
                max_score = max(max_score, phone_similarity * 0.8)

        # Check vehicle information
        if job.get('vehicle_registration'):
            query_reg = self.normalize_registration(query)
            reg_norm = self.normalize_registration(job['vehicle_registration'])
            if reg_norm and query_reg:
                reg_similarity = self.calculate_similarity(reg_norm, query_reg, fuzzy=False)
                max_score = max(max_score, reg_similarity * 0.8)

        return max_score

    def find_customer_matches(self, customer_data: Dict[str, Any], threshold: float = 0.8) -> List[Tuple[int, float]]:
        """Find potential customer matches for data linking"""
        matches = []

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, account_number, name, phone, mobile, email, postcode
            FROM customers
        ''')

        for row in cursor.fetchall():
            existing_customer = {
                'id': row[0],
                'account_number': row[1],
                'name': row[2],
                'phone': row[3],
                'mobile': row[4],
                'email': row[5],
                'postcode': row[6]
            }

            score = self._calculate_customer_link_score(customer_data, existing_customer)
            if score >= threshold:
                matches.append((existing_customer['id'], score))

        conn.close()

        # Sort by score (highest first)
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def find_vehicle_matches(self, vehicle_data: Dict[str, Any], threshold: float = 0.9) -> List[Tuple[int, float]]:
        """Find potential vehicle matches for data linking"""
        matches = []

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, registration, make, model, customer_id
            FROM vehicles
        ''')

        for row in cursor.fetchall():
            existing_vehicle = {
                'id': row[0],
                'registration': row[1],
                'make': row[2],
                'model': row[3],
                'customer_id': row[4]
            }

            score = self._calculate_vehicle_link_score(vehicle_data, existing_vehicle)
            if score >= threshold:
                matches.append((existing_vehicle['id'], score))

        conn.close()

        # Sort by score (highest first)
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def _calculate_customer_link_score(self, new_data: Dict[str, Any], existing_data: Dict[str, Any]) -> float:
        """Calculate linking score between customer records using priority weighting"""
        scores = []

        # Mobile phone (highest priority)
        if new_data.get('mobile') and existing_data.get('mobile'):
            mobile1 = self.normalize_phone(new_data['mobile'])
            mobile2 = self.normalize_phone(existing_data['mobile'])
            if mobile1 and mobile2:
                similarity = self.calculate_similarity(mobile1, mobile2, fuzzy=False)
                if similarity > 0.9:  # Very high threshold for phone matching
                    scores.append(similarity * self.search_weights['mobile_phone'])

        # Email (secondary priority)
        if new_data.get('email') and existing_data.get('email'):
            email_similarity = self.calculate_similarity(new_data['email'], existing_data['email'], fuzzy=False)
            if email_similarity > 0.9:
                scores.append(email_similarity * self.search_weights['email'])

        # Postal code (tertiary priority)
        if new_data.get('postcode') and existing_data.get('postcode'):
            postal1 = self.normalize_postal_code(new_data['postcode'])
            postal2 = self.normalize_postal_code(existing_data['postcode'])
            if postal1 and postal2:
                postal_similarity = self.calculate_similarity(postal1, postal2, fuzzy=False)
                if postal_similarity > 0.9:
                    scores.append(postal_similarity * self.search_weights['postal_code'])

        # Name matching (lower priority, more fuzzy)
        if new_data.get('name') and existing_data.get('name'):
            name_similarity = self.calculate_similarity(new_data['name'], existing_data['name'])
            if name_similarity > 0.8:
                scores.append(name_similarity * self.search_weights['name'])

        # Return highest score (best match)
        return max(scores) if scores else 0.0

    def _calculate_vehicle_link_score(self, new_data: Dict[str, Any], existing_data: Dict[str, Any]) -> float:
        """Calculate linking score between vehicle records"""
        scores = []

        # Registration number (highest priority for vehicles)
        if new_data.get('registration') and existing_data.get('registration'):
            reg1 = self.normalize_registration(new_data['registration'])
            reg2 = self.normalize_registration(existing_data['registration'])
            if reg1 and reg2:
                similarity = self.calculate_similarity(reg1, reg2, fuzzy=False)
                if similarity > 0.95:  # Very high threshold for registration
                    scores.append(similarity * self.search_weights['registration'])

        # Make and model combination (secondary)
        if (new_data.get('make') and existing_data.get('make') and
            new_data.get('model') and existing_data.get('model')):
            make_sim = self.calculate_similarity(new_data['make'], existing_data['make'])
            model_sim = self.calculate_similarity(new_data['model'], existing_data['model'])
            if make_sim > 0.8 and model_sim > 0.8:
                combined_score = (make_sim + model_sim) / 2
                scores.append(combined_score * 0.6)

        # Return highest score (best match)
        return max(scores) if scores else 0.0
