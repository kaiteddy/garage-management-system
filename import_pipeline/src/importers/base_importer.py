"""Base importer class for all data importers."""
import os
import yaml
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
from tqdm import tqdm
import logging

from ..db import get_db
from ..parsers import parse_value

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('import.log')
    ]
)
logger = logging.getLogger(__name__)

class BaseImporter:
    """Base class for all data importers."""
    
    # Override these in subclasses
    CONFIG_FILE = None
    TABLE_NAME = None
    
    def __init__(self, file_path: str):
        """Initialize the importer with a file path."""
        self.file_path = file_path
        self.db = get_db()
        self.config = self._load_config()
        
        # Track stats
        self.stats = {
            'total': 0,
            'imported': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        if not self.CONFIG_FILE:
            raise ValueError("CONFIG_FILE must be set in the subclass")
            
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'config',
            'column_maps',
            self.CONFIG_FILE
        )
        
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.error(f"Config file not found: {config_path}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"Error parsing YAML config: {e}")
            raise
    
    def _process_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single record before import."""
        processed = {}
        
        # Map fields according to config
        for csv_field, db_field in self.config.get('field_mappings', {}).items():
            if csv_field in record:
                processed[db_field] = record[csv_field]
        
        # Apply type casting
        for field, type_name in self.config.get('type_casting', {}).items():
            if field in processed:
                processed[field] = parse_value(processed[field], type_name)
        
        # Apply defaults for missing fields
        for field, default in self.config.get('defaults', {}).items():
            if field not in processed or processed[field] is None:
                processed[field] = default
        
        # Check required fields
        for field in self.config.get('required_fields', []):
            if field not in processed or processed[field] is None:
                logger.warning(f"Skipping record - missing required field: {field}")
                return None
        
        return processed
    
    def _import_batch(self, batch: List[Dict[str, Any]]) -> Tuple[int, int]:
        """Import a batch of records."""
        if not batch:
            return 0, 0
            
        # Get column names from the first record
        columns = list(batch[0].keys())
        
        # Generate placeholders for the query
        placeholders = [f'%({col})s' for col in columns]
        
        # Build the query
        query = f"""
        INSERT INTO {self.TABLE_NAME} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        ON CONFLICT (id) DO UPDATE SET
            {', '.join(f"{col} = EXCLUDED.{col}" for col in columns if col != 'id')}
        """
        
        try:
            with self.db.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.executemany(query, batch)
            return len(batch), 0
        except Exception as e:
            logger.error(f"Error importing batch: {e}")
            return 0, len(batch)
    
    def run(self) -> Dict[str, int]:
        """Run the import process."""
        logger.info(f"Starting import of {self.__class__.__name__} from {self.file_path}")
        
        # Load configuration
        logger.info(f"Loaded configuration from {self.CONFIG_FILE}")
        
        # Initialize statistics
        self.stats = {
            'total': 0,
            'imported': 0,
            'skipped': 0,
            'errors': 0
        }
        
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"File not found: {self.file_path}")
        
        logger.info(f"Starting import from {self.file_path}")
        
        # Read the CSV in chunks
        chunk_size = int(os.getenv('BATCH_SIZE', 1000))
        logger.info(f"Processing CSV file in chunks of {chunk_size} records")
        
        total_rows = sum(1 for _ in open(self.file_path, 'r', encoding='utf-8')) - 1  # Subtract header
        logger.info(f"Total rows to process: {total_rows}")
        
        with pd.read_csv(
            self.file_path, 
            chunksize=chunk_size,
            dtype=str,
            keep_default_na=False,
            na_values=['', 'NA', 'N/A', 'NULL', 'None']
        ) as reader:
            with tqdm(total=total_rows, desc=f"Importing {self.TABLE_NAME}") as pbar:
                for chunk in reader:
                    # Convert chunk to list of dicts
                    records = chunk.replace({pd.NA: None}).to_dict('records')
                    
                    # Process records
                    processed_records = []
                    for record in records:
                        self.stats['total'] += 1
                        processed = self._process_record(record)
                        if processed:
                            processed_records.append(processed)
                        else:
                            self.stats['skipped'] += 1
                            logger.debug(f"Skipped record {self.stats['total']}: {record}")
                    
                    # Import the batch
                    if processed_records:
                        imported, errors = self._import_batch(processed_records)
                        self.stats['imported'] += imported
                        self.stats['errors'] += errors
                        logger.info(f"Processed {self.stats['total']} records (imported: {self.stats['imported']}, skipped: {self.stats['skipped']}, errors: {self.stats['errors']})")
                    
                    pbar.update(len(records))
        
        # Log summary
        logger.info(
            f"Import complete: {self.stats['imported']} imported, "
            f"{self.stats['skipped']} skipped, {self.stats['errors']} errors"
        )
        
        return self.stats
