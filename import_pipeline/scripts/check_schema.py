#!/usr/bin/env python3
"""Script to check the database schema."""
import os
import sys
import logging
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db import DatabaseConnection

# Create a database connection
db = DatabaseConnection()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_table_schema(table_name):
    """Check the schema of a table."""
    try:
        conn = db.get_connection()
        with conn.cursor() as cur:
            # Get column information
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = cur.fetchall()
            
            if not columns:
                logger.error(f"Table '{table_name}' not found")
                return
                
            logger.info(f"\nTable: {table_name}")
            logger.info("-" * 80)
            logger.info(f"{'Column':<30} {'Type':<20} {'Nullable':<10} {'Default'}")
            logger.info("-" * 80)
            
            for col in columns:
                col_name, data_type, is_nullable, col_default = col
                logger.info(f"{col_name:<30} {data_type:<20} {is_nullable:<10} {col_default}")
            
            logger.info("-" * 80)
            
    except Exception as e:
        logger.error(f"Error checking table schema: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <table_name>")
        sys.exit(1)
    
    table_name = sys.argv[1]
    check_table_schema(table_name)
