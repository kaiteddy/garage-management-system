#!/usr/bin/env python3
"""
Legacy main.py for backward compatibility.
This file maintains compatibility with the old deployment structure.
"""
import os
import sys

# DON'T CHANGE THIS PATH - it's required for the deployment environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

# Create application instance
app = create_app()

# For backward compatibility, also create legacy database tables
with app.app_context():
    from services.database_service import create_legacy_tables
    create_legacy_tables()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
