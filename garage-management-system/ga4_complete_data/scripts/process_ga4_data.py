#!/usr/bin/env python3
"""
GA4 Data Processing Script

This script processes raw GA4 data exports and prepares them for analysis.
"""

import pandas as pd
import os
from datetime import datetime
import logging
import numpy as np

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GA4DataProcessor:
    def __init__(self):
        # Update paths to be relative to the script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.base_dir = os.path.dirname(script_dir)
        self.raw_data_dir = os.path.join(self.base_dir, 'raw_data')
        self.processed_data_dir = os.path.join(self.base_dir, 'processed_data')
        self.reports_dir = os.path.join(self.base_dir, 'reports')
        
        # Create directories if they don't exist
        for directory in [self.raw_data_dir, self.processed_data_dir, self.reports_dir]:
            os.makedirs(directory, exist_ok=True)
        
        logging.info(f"Initialized GA4DataProcessor with directories:")
        logging.info(f"Raw data directory: {self.raw_data_dir}")
        logging.info(f"Processed data directory: {self.processed_data_dir}")
        logging.info(f"Reports directory: {self.reports_dir}")

    def load_raw_data(self, file_path):
        """Load raw GA4 data from CSV file."""
        try:
            df = pd.read_csv(file_path)
            logging.info(f"Successfully loaded data from {file_path}")
            return df
        except Exception as e:
            logging.error(f"Error loading data from {file_path}: {str(e)}")
            raise

    def process_data(self, df):
        """Process and clean GA4 data."""
        try:
            # Convert date column to datetime
            df['date'] = pd.to_datetime(df['date'])
            
            # Calculate conversion rates
            total_sessions = df['session_id'].nunique()
            total_purchases = df[df['event_name'] == 'purchase']['event_count'].sum()
            conversion_rate = (total_purchases / total_sessions) * 100 if total_sessions > 0 else 0
            
            # Aggregate device statistics
            device_stats = df.groupby('device_category')['event_count'].sum().reset_index()
            
            # Aggregate country statistics
            country_stats = df.groupby('country')['event_count'].sum().reset_index()
            
            # Calculate daily event counts
            daily_events = df.groupby('date')['event_count'].sum().reset_index()
            
            logging.info("Data processing completed successfully")
            return {
                'conversion_rate': conversion_rate,
                'device_stats': device_stats,
                'country_stats': country_stats,
                'daily_events': daily_events
            }
        except Exception as e:
            logging.error(f"Error processing data: {str(e)}")
            raise

    def save_processed_data(self, processed_data, filename):
        """Save processed data to CSV files."""
        try:
            # Save device statistics
            device_stats_path = os.path.join(self.processed_data_dir, f'device_stats_{filename}')
            processed_data['device_stats'].to_csv(device_stats_path, index=False)
            
            # Save country statistics
            country_stats_path = os.path.join(self.processed_data_dir, f'country_stats_{filename}')
            processed_data['country_stats'].to_csv(country_stats_path, index=False)
            
            # Save daily events
            daily_events_path = os.path.join(self.processed_data_dir, f'daily_events_{filename}')
            processed_data['daily_events'].to_csv(daily_events_path, index=False)
            
            # Save summary statistics
            summary_path = os.path.join(self.reports_dir, f'summary_{filename}')
            with open(summary_path, 'w') as f:
                f.write(f"Conversion Rate: {processed_data['conversion_rate']:.2f}%\n")
                f.write("\nDevice Statistics:\n")
                f.write(processed_data['device_stats'].to_string())
                f.write("\n\nCountry Statistics:\n")
                f.write(processed_data['country_stats'].to_string())
            
            logging.info(f"Processed data saved successfully to {self.processed_data_dir}")
        except Exception as e:
            logging.error(f"Error saving processed data: {str(e)}")
            raise

def main():
    processor = GA4DataProcessor()
    
    # Process each CSV file in the raw data directory
    for filename in os.listdir(processor.raw_data_dir):
        if filename.endswith('.csv'):
            file_path = os.path.join(processor.raw_data_dir, filename)
            logging.info(f"Processing file: {filename}")
            
            try:
                # Load and process data
                raw_data = processor.load_raw_data(file_path)
                processed_data = processor.process_data(raw_data)
                
                # Save processed data
                base_filename = os.path.splitext(filename)[0]
                processor.save_processed_data(processed_data, base_filename)
                
                logging.info(f"Successfully processed {filename}")
            except Exception as e:
                logging.error(f"Error processing {filename}: {str(e)}")
                continue

if __name__ == "__main__":
    main() 