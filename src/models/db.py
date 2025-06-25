from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy
db = SQLAlchemy()

def get_db_path():
    """Get the path to the SQLite database file"""
    # Use data directory for database file
    data_dir = Path('data')
    # Ensure directory exists
    os.makedirs(data_dir, exist_ok=True)
    return str(data_dir / 'garage.db')
# Initialize SQLAlchemy
db = SQLAlchemy()
db = SQLAlchemy() 