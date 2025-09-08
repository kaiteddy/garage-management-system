#!/usr/bin/env python3
"""Script to check imported data in the database."""
import os
import sys
import logging
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db import DatabaseConnection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_imported_documents():
    """Check the imported documents in the database."""
    try:
        # Create a database connection
        db = DatabaseConnection()
        
        # Query to get all documents
        query = """
        SELECT id, document_type, document_number, status, total_amount, paid_amount, balance_due
        FROM documents
        ORDER BY issue_date DESC;
        """
        
        results = db.execute_query(query)
        
        if not results:
            logger.info("No documents found in the database.")
            return
        
        logger.info("\nImported Documents:")
        logger.info("-" * 100)
        logger.info(f"{'ID':<5} {'Type':<10} {'Number':<15} {'Status':<10} {'Total':>10} {'Paid':>10} {'Balance':>10}")
        logger.info("-" * 100)
        
        for row in results:
            doc_id, doc_type, doc_num, status, total, paid, balance = row
            logger.info(f"{doc_id:<5} {doc_type:<10} {str(doc_num or ''):<15} {status:<10} {float(total or 0):>10.2f} {float(paid or 0):>10.2f} {float(balance or 0):>10.2f}")
        
        logger.info("-" * 100)
        logger.info(f"Total documents: {len(results)}")
        
    except Exception as e:
        logger.error(f"Error checking imported documents: {e}")
        raise

if __name__ == '__main__':
    check_imported_documents()
