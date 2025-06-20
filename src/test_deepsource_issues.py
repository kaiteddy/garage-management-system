#!/usr/bin/env python3
"""
Test file with intentional code quality issues for DeepSource analysis
This file contains various issues that DeepSource should detect and potentially autofix
"""

import os
import sys
import json
import sqlite3
import requests
import datetime
from typing import List, Dict, Any, Optional
import re

# Unused imports (DeepSource should detect these)
import math
import random
import time

class CustomerManager:
    """Customer management class with various code quality issues"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self.connection = None
        
    def connect_database(self):
        """Connect to database with poor error handling"""
        try:
            self.connection = sqlite3.connect(self.db_path)
        except:  # Bare except clause (bad practice)
            print("Database connection failed")
            
    def get_customers(self):
        """Get customers with SQL injection vulnerability"""
        customer_id = "1 OR 1=1"  # Simulated user input
        # SQL injection vulnerability - should use parameterized queries
        query = f"SELECT * FROM customers WHERE id = {customer_id}"
        cursor = self.connection.cursor()
        cursor.execute(query)
        return cursor.fetchall()
        
    def validate_email(self, email):
        """Email validation with inefficient regex"""
        # Inefficient regex pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(pattern, email):
            return True
        else:
            return False  # Unnecessary else after return
            
    def process_customer_data(self, customers):
        """Process customer data with various issues"""
        result = []
        for customer in customers:
            # Mutable default argument issue
            customer_info = self.format_customer(customer, {})
            result.append(customer_info)
        return result
        
    def format_customer(self, customer, metadata={}):  # Mutable default argument
        """Format customer with mutable default argument"""
        metadata['processed_at'] = datetime.datetime.now()
        return {
            'id': customer[0],
            'name': customer[1],
            'email': customer[2],
            'metadata': metadata
        }
        
    def calculate_discount(self, amount, discount_type):
        """Calculate discount with redundant conditions"""
        if discount_type == 'percentage':
            if amount > 100:
                return amount * 0.1
            else:
                return 0
        elif discount_type == 'fixed':
            if amount > 50:
                return 10
            else:
                return 0
        else:
            return 0
            
    def send_notification(self, customer_email, message):
        """Send notification with hardcoded credentials"""
        # Hardcoded credentials (security issue)
        api_key = "sk-1234567890abcdef"
        api_url = "https://api.example.com/send"
        
        payload = {
            'to': customer_email,
            'message': message,
            'api_key': api_key
        }
        
        # No error handling for HTTP request
        response = requests.post(api_url, json=payload)
        return response.json()
        
    def cleanup_old_records(self):
        """Cleanup with resource leak"""
        # Resource leak - file not properly closed
        log_file = open('cleanup.log', 'w')
        log_file.write('Starting cleanup...')
        
        # Missing file.close() or context manager
        
def process_file_data(filename):
    """Function with various issues"""
    # File handling without context manager
    file = open(filename, 'r')
    data = file.read()
    file.close()
    
    # Inefficient string concatenation
    result = ""
    lines = data.split('\n')
    for line in lines:
        result = result + line + "\n"  # Should use join()
        
    return result

def compare_values(a, b):
    """Function with comparison issues"""
    # Using 'is' for value comparison instead of '=='
    if a is 100:
        return True
    if b is None:
        return False
    return a == b

def handle_exceptions():
    """Poor exception handling examples"""
    try:
        result = 10 / 0
    except Exception as e:
        pass  # Empty except block
        
    try:
        data = json.loads('invalid json')
    except:
        print("JSON error")  # Bare except
        
def unused_variables():
    """Function with unused variables"""
    x = 10  # Unused variable
    y = 20  # Unused variable
    z = x + y
    return 42  # Not using z

# Global variables (not recommended)
GLOBAL_COUNTER = 0
global_data = {}

def modify_global():
    """Function modifying global variables"""
    global GLOBAL_COUNTER
    GLOBAL_COUNTER += 1
    global_data['count'] = GLOBAL_COUNTER

# Duplicate code (should be refactored)
def calculate_tax_method1(amount):
    tax_rate = 0.2
    return amount * tax_rate

def calculate_tax_method2(price):
    tax_percentage = 0.2
    return price * tax_percentage

# Main execution
if __name__ == "__main__":
    # Poor command line argument handling
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        db_path = "default.db"
        
    manager = CustomerManager(db_path)
    manager.connect_database()
    
    # Potential issues that DeepSource should catch:
    # 1. Unused imports
    # 2. SQL injection vulnerability
    # 3. Bare except clauses
    # 4. Mutable default arguments
    # 5. Hardcoded credentials
    # 6. Resource leaks
    # 7. Inefficient string operations
    # 8. Poor comparison practices
    # 9. Empty except blocks
    # 10. Unused variables
    # 11. Global variable usage
    # 12. Code duplication
