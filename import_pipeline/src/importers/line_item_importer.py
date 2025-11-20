"""Importer for line item data."""
from typing import Dict, Any, Optional
import logging

from .base_importer import BaseImporter

logger = logging.getLogger(__name__)

class LineItemImporter(BaseImporter):
    """Importer for line item data."""
    
    CONFIG_FILE = 'line_items.yml'
    TABLE_NAME = 'line_items'
    
    def _process_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single line item record before import."""
        # Let the parent class handle basic processing
        processed = super()._process_record(record)
        if not processed:
            return None
        
        # Add any line item-specific processing here
        # For example, ensure numeric fields are properly formatted
        
        return processed
