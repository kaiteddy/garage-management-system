"""Importer for document data."""
from typing import Dict, Any, Optional
import logging

from .base_importer import BaseImporter

logger = logging.getLogger(__name__)

class DocumentImporter(BaseImporter):
    """Importer for document data."""
    
    CONFIG_FILE = 'documents.yml'
    TABLE_NAME = 'documents'
    
    def _process_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single document record before import."""
        # Let the parent class handle basic processing
        processed = super()._process_record(record)
        if not processed:
            return None
        
        # Add any document-specific processing here
        # For example, ensure dates are in the correct format
        
        return processed
