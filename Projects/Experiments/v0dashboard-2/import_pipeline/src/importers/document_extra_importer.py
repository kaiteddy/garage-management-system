"""Importer for document extra data."""
from typing import Dict, Any, Optional
import logging

from .base_importer import BaseImporter

logger = logging.getLogger(__name__)

class DocumentExtraImporter(BaseImporter):
    """Importer for document extra data."""
    
    CONFIG_FILE = 'document_extras.yml'
    TABLE_NAME = 'document_extras'
    
    def _process_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single document extra record before import."""
        # Let the parent class handle basic processing
        processed = super()._process_record(record)
        if not processed:
            return None
        
        # Add any document extra-specific processing here
        # For example, clean up notes or descriptions
        
        return processed
