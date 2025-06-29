#!/usr/bin/env python3
"""
Database initialization script for Garage Management System
Creates SQLite database and ensures permissions are correct
"""

import os
import sqlite3
import sys
from pathlib import Path


def initialize_database():
    """Initialize SQLite database and ensure it's writable"""
    # Define database directory and path
    db_dir = Path(os.environ.get('GMS_DB_DIR', 'data'))
    db_path = Path(os.environ.get('GMS_DB_PATH', str(db_dir / 'garage.db')))

    # Create database directory if it doesn't exist
    print(f"📁 Creating database directory at {db_dir}...")
    os.makedirs(db_dir, exist_ok=True)

    # Ensure directory has correct permissions
    try:
        os.chmod(db_dir, 0o777)  # Full permissions for testing
        print("✅ Set directory permissions")
    except Exception as e:
        print(f"⚠️ Could not set directory permissions: {e}")

    # Initialize SQLite database
    print(f"🗄️ Initializing database at {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create a test table to verify database works
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_info (
            id INTEGER PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # Insert version information
        cursor.execute(
            "INSERT OR REPLACE INTO system_info (id, key, value) VALUES (1, 'version', '1.0.0')")
        cursor.execute(
            "INSERT OR REPLACE INTO system_info (id, key, value) VALUES (2, 'initialized_at', CURRENT_TIMESTAMP)")

        conn.commit()
        conn.close()
        print("✅ Database initialized successfully")

        # Ensure database file has correct permissions
        os.chmod(db_path, 0o666)  # Make readable/writable
        print("✅ Set database file permissions")

        return True
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        return False


def test_database_connection():
    """Test database connection"""
    db_path = Path(os.environ.get('GMS_DB_PATH', 'data/garage.db'))

    try:
        print(f"🔍 Testing database connection to {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT value FROM system_info WHERE key = 'version'")
        version = cursor.fetchone()[0]

        cursor.execute(
            "SELECT value FROM system_info WHERE key = 'initialized_at'")
        init_time = cursor.fetchone()[0]

        conn.close()

        print(
            f"✅ Database connection successful! Version: {version}, Initialized at: {init_time}")
        return True
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False


if __name__ == '__main__':
    print("🚀 Starting database initialization...")

    if initialize_database():
        test_database_connection()
        print("✅ Database setup complete")
        sys.exit(0)
    else:
        print("❌ Database setup failed")
        sys.exit(1)
