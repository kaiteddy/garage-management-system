"""Importer for test document data."""
from typing import Dict, Any, Optional
import logging

from .base_importer import BaseImporter

logger = logging.getLogger(__name__)

class TestDocumentImporter(BaseImporter):
    """Importer for test document data."""
    
    CONFIG_FILE = 'test_documents.yml'
    TABLE_NAME = 'documents'
    
    def _process_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single test document record before import."""
        # Let the parent class handle basic processing
        processed = super()._process_record(record)
        if not processed:
            return None
        
        # Add any test document-specific processing here
        return processed
