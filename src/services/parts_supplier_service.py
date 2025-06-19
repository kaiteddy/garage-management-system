#!/usr/bin/env python3
"""
Parts Supplier Integration Service
Framework for integrating with GSF Car Parts, Euro Car Parts, and other suppliers
"""

import os
import json
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import hashlib

@dataclass
class PartSearchResult:
    """Part search result structure"""
    part_number: str
    description: str
    brand: str
    price: float
    availability: str
    supplier: str
    supplier_part_id: str
    image_url: str = None
    specifications: Dict = None

@dataclass
class SupplierConfig:
    """Supplier configuration"""
    name: str
    api_endpoint: str
    api_key: str
    username: str = None
    password: str = None
    active: bool = True

class PartsSupplierService:
    """Service for parts supplier integration"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_parts_tables()
        self.suppliers = self._load_supplier_configs()
    
    def _ensure_parts_tables(self):
        """Create parts-related tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Supplier configurations table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS supplier_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    api_endpoint TEXT,
                    api_key TEXT,
                    username VARCHAR(100),
                    password VARCHAR(100),
                    active BOOLEAN DEFAULT 1,
                    created_date DATE DEFAULT CURRENT_DATE,
                    updated_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Parts catalog table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS parts_catalog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    part_number VARCHAR(100) NOT NULL,
                    description TEXT,
                    brand VARCHAR(100),
                    category VARCHAR(100),
                    price REAL,
                    cost_price REAL,
                    markup_percent REAL DEFAULT 25.0,
                    supplier_id INTEGER,
                    supplier_part_id VARCHAR(100),
                    availability VARCHAR(50),
                    stock_level INTEGER DEFAULT 0,
                    reorder_level INTEGER DEFAULT 5,
                    image_url TEXT,
                    specifications TEXT,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (supplier_id) REFERENCES supplier_configs (id)
                )
            ''')
            
            # Parts orders table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS parts_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_number VARCHAR(50) UNIQUE NOT NULL,
                    supplier_id INTEGER NOT NULL,
                    job_id INTEGER,
                    order_date DATE DEFAULT CURRENT_DATE,
                    expected_delivery DATE,
                    actual_delivery DATE,
                    total_amount REAL DEFAULT 0.0,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    notes TEXT,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (supplier_id) REFERENCES supplier_configs (id),
                    FOREIGN KEY (job_id) REFERENCES jobs (id)
                )
            ''')
            
            # Parts order items table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS parts_order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    part_id INTEGER,
                    part_number VARCHAR(100) NOT NULL,
                    description TEXT,
                    quantity INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    total_price REAL NOT NULL,
                    received_quantity INTEGER DEFAULT 0,
                    FOREIGN KEY (order_id) REFERENCES parts_orders (id),
                    FOREIGN KEY (part_id) REFERENCES parts_catalog (id)
                )
            ''')
            
            # Parts usage tracking table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS parts_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    part_id INTEGER,
                    part_number VARCHAR(100) NOT NULL,
                    description TEXT,
                    quantity_used INTEGER NOT NULL,
                    unit_cost REAL,
                    total_cost REAL,
                    usage_date DATE DEFAULT CURRENT_DATE,
                    technician VARCHAR(100),
                    FOREIGN KEY (job_id) REFERENCES jobs (id),
                    FOREIGN KEY (part_id) REFERENCES parts_catalog (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error creating parts tables: {str(e)}")
    
    def _load_supplier_configs(self) -> Dict[str, SupplierConfig]:
        """Load supplier configurations from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, name, api_endpoint, api_key, username, password, active
                FROM supplier_configs
                WHERE active = 1
            ''')
            
            suppliers = {}
            for row in cursor.fetchall():
                suppliers[row[1]] = SupplierConfig(
                    name=row[1],
                    api_endpoint=row[2],
                    api_key=row[3],
                    username=row[4],
                    password=row[5],
                    active=bool(row[6])
                )
            
            conn.close()
            return suppliers
            
        except Exception as e:
            print(f"Error loading supplier configs: {str(e)}")
            return {}
    
    def add_supplier_config(self, name: str, api_endpoint: str, api_key: str,
                           username: str = None, password: str = None) -> Dict:
        """Add a new supplier configuration"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO supplier_configs 
                (name, api_endpoint, api_key, username, password)
                VALUES (?, ?, ?, ?, ?)
            ''', (name, api_endpoint, api_key, username, password))
            
            supplier_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Reload supplier configs
            self.suppliers = self._load_supplier_configs()
            
            return {
                'success': True,
                'supplier_id': supplier_id,
                'message': f'Supplier {name} added successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_parts_gsf(self, search_term: str, vehicle_reg: str = None) -> List[PartSearchResult]:
        """Search parts using GSF Car Parts API (mock implementation)"""
        try:
            # Mock GSF API integration - replace with actual API calls
            mock_results = [
                PartSearchResult(
                    part_number="GSF001234",
                    description="Brake Pads Front Set",
                    brand="Bosch",
                    price=45.99,
                    availability="In Stock",
                    supplier="GSF Car Parts",
                    supplier_part_id="BP001234",
                    image_url="https://example.com/brake-pads.jpg",
                    specifications={"material": "Ceramic", "warranty": "2 years"}
                ),
                PartSearchResult(
                    part_number="GSF001235",
                    description="Brake Discs Front Pair",
                    brand="Brembo",
                    price=89.99,
                    availability="In Stock",
                    supplier="GSF Car Parts",
                    supplier_part_id="BD001235",
                    image_url="https://example.com/brake-discs.jpg",
                    specifications={"diameter": "280mm", "thickness": "25mm"}
                )
            ]
            
            # Filter results based on search term
            filtered_results = [
                result for result in mock_results 
                if search_term.lower() in result.description.lower()
            ]
            
            return filtered_results
            
        except Exception as e:
            print(f"Error searching GSF parts: {str(e)}")
            return []
    
    def search_parts_euro_car_parts(self, search_term: str, vehicle_reg: str = None) -> List[PartSearchResult]:
        """Search parts using Euro Car Parts API (mock implementation)"""
        try:
            # Mock Euro Car Parts API integration
            mock_results = [
                PartSearchResult(
                    part_number="ECP567890",
                    description="Oil Filter",
                    brand="Mann Filter",
                    price=12.99,
                    availability="In Stock",
                    supplier="Euro Car Parts",
                    supplier_part_id="OF567890",
                    image_url="https://example.com/oil-filter.jpg",
                    specifications={"thread": "M20x1.5", "height": "95mm"}
                ),
                PartSearchResult(
                    part_number="ECP567891",
                    description="Air Filter",
                    brand="K&N",
                    price=24.99,
                    availability="Limited Stock",
                    supplier="Euro Car Parts",
                    supplier_part_id="AF567891",
                    image_url="https://example.com/air-filter.jpg",
                    specifications={"dimensions": "200x150x50mm", "washable": True}
                )
            ]
            
            filtered_results = [
                result for result in mock_results 
                if search_term.lower() in result.description.lower()
            ]
            
            return filtered_results
            
        except Exception as e:
            print(f"Error searching Euro Car Parts: {str(e)}")
            return []
    
    def search_parts_all_suppliers(self, search_term: str, vehicle_reg: str = None) -> List[PartSearchResult]:
        """Search parts across all configured suppliers"""
        all_results = []
        
        # Search GSF Car Parts
        gsf_results = self.search_parts_gsf(search_term, vehicle_reg)
        all_results.extend(gsf_results)
        
        # Search Euro Car Parts
        euro_results = self.search_parts_euro_car_parts(search_term, vehicle_reg)
        all_results.extend(euro_results)
        
        # Sort by price (lowest first)
        all_results.sort(key=lambda x: x.price)
        
        return all_results
    
    def add_part_to_catalog(self, part_result: PartSearchResult, markup_percent: float = 25.0) -> Dict:
        """Add a part from search results to the local catalog"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get supplier ID
            cursor.execute('SELECT id FROM supplier_configs WHERE name = ?', (part_result.supplier,))
            supplier_row = cursor.fetchone()
            supplier_id = supplier_row[0] if supplier_row else None
            
            # Calculate selling price with markup
            cost_price = part_result.price
            selling_price = cost_price * (1 + markup_percent / 100)
            
            cursor.execute('''
                INSERT INTO parts_catalog 
                (part_number, description, brand, price, cost_price, markup_percent,
                 supplier_id, supplier_part_id, availability, image_url, specifications)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                part_result.part_number,
                part_result.description,
                part_result.brand,
                selling_price,
                cost_price,
                markup_percent,
                supplier_id,
                part_result.supplier_part_id,
                part_result.availability,
                part_result.image_url,
                json.dumps(part_result.specifications) if part_result.specifications else None
            ))
            
            part_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'part_id': part_id,
                'selling_price': round(selling_price, 2),
                'message': 'Part added to catalog successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_parts_order(self, supplier_name: str, parts_list: List[Dict], job_id: int = None) -> Dict:
        """Create a parts order with a supplier"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get supplier ID
            cursor.execute('SELECT id FROM supplier_configs WHERE name = ?', (supplier_name,))
            supplier_row = cursor.fetchone()
            if not supplier_row:
                return {'success': False, 'error': 'Supplier not found'}
            
            supplier_id = supplier_row[0]
            
            # Generate order number
            order_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{supplier_id:03d}"
            
            # Create order
            cursor.execute('''
                INSERT INTO parts_orders 
                (order_number, supplier_id, job_id, status)
                VALUES (?, ?, ?, ?)
            ''', (order_number, supplier_id, job_id, 'PENDING'))
            
            order_id = cursor.lastrowid
            total_amount = 0.0
            
            # Add order items
            for part in parts_list:
                quantity = part['quantity']
                unit_price = part['unit_price']
                total_price = quantity * unit_price
                total_amount += total_price
                
                cursor.execute('''
                    INSERT INTO parts_order_items 
                    (order_id, part_number, description, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    order_id,
                    part['part_number'],
                    part['description'],
                    quantity,
                    unit_price,
                    total_price
                ))
            
            # Update order total
            cursor.execute('''
                UPDATE parts_orders SET total_amount = ? WHERE id = ?
            ''', (total_amount, order_id))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'order_id': order_id,
                'order_number': order_number,
                'total_amount': round(total_amount, 2),
                'message': 'Parts order created successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_parts_catalog(self, category: str = None, supplier: str = None) -> List[Dict]:
        """Get parts from local catalog with optional filtering"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = '''
                SELECT p.id, p.part_number, p.description, p.brand, p.category,
                       p.price, p.cost_price, p.markup_percent, p.stock_level,
                       p.reorder_level, p.availability, p.image_url,
                       s.name as supplier_name
                FROM parts_catalog p
                LEFT JOIN supplier_configs s ON p.supplier_id = s.id
                WHERE p.active = 1
            '''
            params = []

            if category:
                query += ' AND p.category = ?'
                params.append(category)

            if supplier:
                query += ' AND s.name = ?'
                params.append(supplier)

            query += ' ORDER BY p.description'

            cursor.execute(query, params)

            parts = []
            for row in cursor.fetchall():
                parts.append({
                    'id': row[0],
                    'part_number': row[1],
                    'description': row[2],
                    'brand': row[3],
                    'category': row[4],
                    'price': row[5],
                    'cost_price': row[6],
                    'markup_percent': row[7],
                    'stock_level': row[8],
                    'reorder_level': row[9],
                    'availability': row[10],
                    'image_url': row[11],
                    'supplier_name': row[12]
                })

            conn.close()
            return parts

        except Exception as e:
            print(f"Error getting parts catalog: {str(e)}")
            return []

    def get_low_stock_parts(self) -> List[Dict]:
        """Get parts that are below reorder level"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT p.id, p.part_number, p.description, p.brand,
                       p.stock_level, p.reorder_level, s.name as supplier_name
                FROM parts_catalog p
                LEFT JOIN supplier_configs s ON p.supplier_id = s.id
                WHERE p.active = 1 AND p.stock_level <= p.reorder_level
                ORDER BY p.stock_level ASC
            ''')

            low_stock_parts = []
            for row in cursor.fetchall():
                low_stock_parts.append({
                    'id': row[0],
                    'part_number': row[1],
                    'description': row[2],
                    'brand': row[3],
                    'stock_level': row[4],
                    'reorder_level': row[5],
                    'supplier_name': row[6]
                })

            conn.close()
            return low_stock_parts

        except Exception as e:
            print(f"Error getting low stock parts: {str(e)}")
            return []
