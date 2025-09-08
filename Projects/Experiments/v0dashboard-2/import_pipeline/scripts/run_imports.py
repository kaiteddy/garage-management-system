#!/usr/bin/env python3
"""Main script for running data imports."""
import argparse
import os
import sys
import logging
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.importers.document_importer import DocumentImporter
from src.importers.line_item_importer import LineItemImporter
from src.importers.document_extra_importer import DocumentExtraImporter
from src.importers.test_document_importer import TestDocumentImporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Map import types to their respective importer classes
IMPORTERS = {
    'documents': DocumentImporter,
    'line_items': LineItemImporter,
    'document_extras': DocumentExtraImporter,
    'test_documents': TestDocumentImporter,
}

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Import data from CSV files into the database.')
    
    parser.add_argument(
        '--type', 
        choices=IMPORTERS.keys(),
        required=True,
        help='Type of data to import'
    )
    
    parser.add_argument(
        '--file',
        required=True,
        help='Path to the CSV file to import'
    )
    
    parser.add_argument(
        '--config-dir',
        default=None,
        help='Directory containing the configuration files (default: config/column_maps/)'
    )
    
    return parser.parse_args()

def main():
    """Run the import process."""
    args = parse_arguments()
    
    # Check if the file exists
    if not os.path.isfile(args.file):
        logger.error(f"File not found: {args.file}")
        return 1
    
    # Get the appropriate importer class
    importer_class = IMPORTERS.get(args.type)
    if not importer_class:
        logger.error(f"No importer found for type: {args.type}")
        return 1
    
    try:
        # Create and run the importer
        importer = importer_class(args.file)
        stats = importer.run()
        
        # Log summary
        logger.info("\nImport Summary:")
        logger.info(f"  Total records: {stats['total']}")
        logger.info(f"  Imported: {stats['imported']}")
        logger.info(f"  Skipped: {stats['skipped']}")
        logger.info(f"  Errors: {stats['errors']}")
        
        return 0 if stats['errors'] == 0 else 1
        
    except Exception as e:
        logger.error(f"Error during import: {e}", exc_info=True)
        return 1

if __name__ == '__main__':
    sys.exit(main())
