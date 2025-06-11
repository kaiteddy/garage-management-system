#!/usr/bin/env python3
"""
Application entry point for the Garage Management System.
"""
import os
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from src.app import create_app

# Create application instance
app = create_app()

if __name__ == '__main__':
    # Get configuration from environment
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"Starting Garage Management System on {host}:{port}")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"Debug mode: {debug}")
    
    app.run(host=host, port=port, debug=debug)
