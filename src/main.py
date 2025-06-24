#!/usr/bin/env python3
"""
Main entry point for the Garage Management System
Imports and runs the modular Flask application
"""

import os
import sys
import argparse

from app import app

# Add the src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the modular application

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Garage Management System')
    parser.add_argument('--port', type=int, default=5002, help='Port to run the server on')
    args = parser.parse_args()
    
    port = args.port  # Use the port from command line arguments
    print("🚀 Starting Integrated Garage Management System...")
    print(f"📊 Main interface: http://127.0.0.1:{port}")
    print(f"🚗 MOT Reminders: http://127.0.0.1:{port}/mot")
    print(f"📤 Upload interface: http://127.0.0.1:{port}/upload")
    print("✅ All systems integrated and ready!")
    app.run(host='0.0.0.0', port=port, debug=False)
