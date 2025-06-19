#!/usr/bin/env python3
"""
Main entry point for the Garage Management System
Imports and runs the modular Flask application
"""

import os
import sys

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the modular application
from app import app

if __name__ == '__main__':
    print("🚀 Starting Integrated Garage Management System...")
    print("📊 Main interface: http://127.0.0.1:5001")
    print("🚗 MOT Reminders: http://127.0.0.1:5001/mot")
    print("📤 Upload interface: http://127.0.0.1:5001/upload")
    print("✅ All systems integrated and ready!")
    app.run(host='0.0.0.0', port=5001, debug=False)
