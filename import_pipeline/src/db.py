"""Database connection and utility functions."""
import os
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2 import sql
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseConnection:
    """Handles database connections and operations."""
    
    def __init__(self, dsn: str = None):
        """Initialize with a connection string or use DATABASE_URL from environment."""
        self.dsn = dsn or os.getenv('DATABASE_URL')
        if not self.dsn:
            raise ValueError("Database connection string not provided and DATABASE_URL not found in environment")
    
    def get_connection(self):
        """Get a new database connection."""
        return psycopg2.connect(self.dsn)
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = True):
        """Execute a query and return results."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cursor:
                cursor.execute(query, params or ())
                if fetch and cursor.description:
                    return cursor.fetchall()
                return None
    
    def execute_many(self, query: str, params_list: List[tuple]):
        """Execute a query multiple times with different parameters."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.executemany(query, params_list)
    
    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the database."""
        query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE  table_schema = 'public'
            AND    table_name   = %s
        );
        """
        result = self.execute_query(query, (table_name,))
        return result[0][0] if result else False
    
    def get_table_columns(self, table_name: str) -> List[str]:
        """Get column names for a table."""
        if not self.table_exists(table_name):
            return []
            
        query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = %s;
        """
        results = self.execute_query(query, (table_name,))
        return [row[0] for row in results] if results else []
    
    def create_table_from_mapping(self, table_name: str, mapping: Dict[str, Any]):
        """Create a table based on a mapping configuration."""
        # This is a simplified version - you'd want to expand this to handle different field types
        fields = []
        for field, field_type in mapping.get('type_casting', {}).items():
            pg_type = {
                'integer': 'INTEGER',
                'decimal': 'DECIMAL(10,2)',
                'date': 'DATE',
                'text': 'TEXT',
                'boolean': 'BOOLEAN'
            }.get(field_type, 'TEXT')
            
            fields.append(f"{field} {pg_type}")
        
        # Add ID field if not specified
        id_field = mapping.get('id_field', 'id')
        if id_field not in [f.split()[0] for f in fields]:
            fields.insert(0, f"{id_field} TEXT PRIMARY KEY")
        
        create_sql = f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            {', '.join(fields)}
        );
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(create_sql)

# Singleton instance
db = DatabaseConnection()

def get_db() -> DatabaseConnection:
    """Get the database connection instance."""
    return db
