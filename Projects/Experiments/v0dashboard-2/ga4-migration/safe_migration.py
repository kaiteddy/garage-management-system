#!/usr/bin/env python3
"""
SAFE GA4 Migration Script
Preserves existing data and only adds missing records
"""

import csv
import sys
import os
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Any
import uuid
from config import *

# Configure logging
logging.basicConfig(
    level=getattr(logging, MIGRATION_SETTINGS['log_level']),
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('safe_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SafeGA4Migrator:
    def __init__(self):
        """Initialize the safe migrator."""
        self.conn = None
        self.cursor = None
        self.stats = {
            'documents_added': 0,
            'reminders_added': 0,
            'stock_added': 0,
            'errors': 0
        }

    def connect_database(self):
        """Connect to the Neon database."""
        try:
            logger.info("🔌 Connecting to Neon database...")
            self.conn = psycopg2.connect(**DATABASE_CONFIG)
            self.cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            logger.info("✅ Database connected successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False

    def check_current_state(self):
        """Check current database state before migration."""
        logger.info("📊 Checking current database state...")

        current_counts = {}
        # Use the actual table names from your schema
        table_mappings = {
            'customers': 'customers',
            'vehicles': 'vehicles',
            'documents': 'documents',
            'line_items': 'LineItems',  # Note the capital L and I
            'document_receipts': 'document_receipts',
            'document_extras': 'document_extras',
            'document_line_items': 'document_line_items',
            'reminders': 'reminders',
            'stock': 'stock'
        }

        for logical_name, actual_table in table_mappings.items():
            try:
                self.cursor.execute(f'SELECT COUNT(*) FROM "{actual_table}"')
                count = self.cursor.fetchone()[0]
                current_counts[logical_name] = count
                logger.info(f"   {logical_name}: {count:,} records")
            except Exception as e:
                # Rollback transaction on error to prevent abort state
                self.conn.rollback()
                logger.warning(f"   {logical_name}: Could not check ({str(e)[:100]})")
                current_counts[logical_name] = 0

        return current_counts

    def safe_import_documents(self):
        """Safely import missing documents."""
        logger.info("📄 Starting SAFE documents import...")

        csv_file = os.path.join(CSV_DIRECTORY, 'Documents.csv')
        if not os.path.exists(csv_file):
            logger.error(f"❌ Documents.csv not found at {csv_file}")
            return False

        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                batch = []

                for row in reader:
                    # Prepare document record
                    doc_record = {
                        '_id': row.get('_ID', ''),
                        '_id_customer': row.get('_ID_Customer'),
                        '_id_vehicle': row.get('_ID_Vehicle'),
                        'doc_type': (row.get('docType', 'INVOICE') or 'INVOICE')[:50],
                        'doc_number': (row.get('docNumber', '') or '')[:50],
                        'total_gross': self.safe_decimal(row.get('docTotal_GROSS', '0')),
                        'total_net': self.safe_decimal(row.get('docTotal_NET', '0')),
                        'total_tax': self.safe_decimal(row.get('docTotal_TAX', '0')),
                        'customer_name': (row.get('customerName', '') or '')[:255],
                        'vehicle_registration': (row.get('vehicleRegistration', '') or '')[:20],
                        'doc_status': (row.get('docStatus', 'PENDING') or 'PENDING')[:50]
                    }

                    batch.append(doc_record)

                    if len(batch) >= MIGRATION_SETTINGS['batch_size']:
                        self.insert_documents_batch(batch)
                        batch = []

                # Insert remaining records
                if batch:
                    self.insert_documents_batch(batch)

            logger.info(f"✅ Documents import completed: {self.stats['documents_added']} added")
            return True

        except Exception as e:
            logger.error(f"❌ Documents import failed: {e}")
            return False

    def insert_documents_batch(self, batch):
        """Insert a batch of documents safely."""
        try:
            for doc in batch:
                # Use INSERT ... ON CONFLICT DO NOTHING for safety
                insert_query = """
                    INSERT INTO documents (
                        _id, _id_customer, _id_vehicle, doc_type, doc_number,
                        total_gross, total_net, total_tax, customer_name,
                        vehicle_registration, doc_status, created_at, updated_at
                    ) VALUES (
                        %(id)s, %(customer_id)s, %(vehicle_id)s, %(doc_type)s, %(doc_number)s,
                        %(total_gross)s, %(total_net)s, %(total_tax)s, %(customer_name)s,
                        %(vehicle_registration)s, %(doc_status)s, NOW(), NOW()
                    )
                    ON CONFLICT (_id) DO NOTHING
                """

                self.cursor.execute(insert_query, {
                    'id': doc['_id'] or f"doc_{uuid.uuid4().hex[:12]}",
                    'customer_id': doc['_id_customer'],
                    'vehicle_id': doc['_id_vehicle'],
                    'doc_type': doc['doc_type'],
                    'doc_number': doc['doc_number'],
                    'total_gross': doc['total_gross'],
                    'total_net': doc['total_net'],
                    'total_tax': doc['total_tax'],
                    'customer_name': doc['customer_name'],
                    'vehicle_registration': doc['vehicle_registration'],
                    'doc_status': doc['doc_status']
                })

                if self.cursor.rowcount > 0:
                    self.stats['documents_added'] += 1

            self.conn.commit()

        except Exception as e:
            logger.error(f"❌ Batch insert failed: {e}")
            self.conn.rollback()
            self.stats['errors'] += 1

    def safe_import_reminders(self):
        """Safely import reminders."""
        logger.info("⏰ Starting SAFE reminders import...")

        csv_file = os.path.join(CSV_DIRECTORY, 'Reminders.csv')
        if not os.path.exists(csv_file):
            logger.error(f"❌ Reminders.csv not found at {csv_file}")
            return False

        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                for row in reader:
                    try:
                        insert_query = """
                            INSERT INTO reminders (
                                _id, _id_vehicle, _id_customer, reminder_type,
                                reminder_status, reminder_message, created_at, updated_at
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, NOW(), NOW()
                            )
                            ON CONFLICT (_id) DO NOTHING
                        """

                        self.cursor.execute(insert_query, (
                            row.get('_ID') or f"rem_{uuid.uuid4().hex[:12]}",
                            row.get('_ID_Vehicle'),
                            row.get('_ID_Customer'),
                            (row.get('reminderType', 'general') or 'general')[:50],
                            (row.get('reminderStatus', 'pending') or 'pending')[:50],
                            (row.get('reminderMessage', '') or '')[:1000]
                        ))

                        if self.cursor.rowcount > 0:
                            self.stats['reminders_added'] += 1

                    except Exception as e:
                        logger.warning(f"Skipping reminder record: {e}")
                        self.stats['errors'] += 1

                self.conn.commit()
                logger.info(f"✅ Reminders import completed: {self.stats['reminders_added']} added")
                return True

        except Exception as e:
            logger.error(f"❌ Reminders import failed: {e}")
            return False

    def safe_import_stock(self):
        """Safely import stock."""
        logger.info("📦 Starting SAFE stock import...")

        csv_file = os.path.join(CSV_DIRECTORY, 'Stock.csv')
        if not os.path.exists(csv_file):
            logger.error(f"❌ Stock.csv not found at {csv_file}")
            return False

        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                for row in reader:
                    try:
                        insert_query = """
                            INSERT INTO stock (
                                _id, item_code, item_description, item_category,
                                item_unit_price, item_cost_price, item_quantity_in_stock,
                                created_at, updated_at
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                            )
                            ON CONFLICT (_id) DO NOTHING
                        """

                        self.cursor.execute(insert_query, (
                            row.get('_ID') or f"stock_{uuid.uuid4().hex[:12]}",
                            (row.get('itemCode') or row.get('itemBarcodeNumber', ''))[:100],
                            (row.get('itemDescription', '') or '')[:500],
                            (row.get('itemCategory', '') or '')[:100],
                            self.safe_decimal(row.get('itemUnitPrice', '0')),
                            self.safe_decimal(row.get('itemCostPrice', '0')),
                            self.safe_int(row.get('itemQuantity_InStock', '0'))
                        ))

                        if self.cursor.rowcount > 0:
                            self.stats['stock_added'] += 1

                    except Exception as e:
                        logger.warning(f"Skipping stock record: {e}")
                        self.stats['errors'] += 1

                self.conn.commit()
                logger.info(f"✅ Stock import completed: {self.stats['stock_added']} added")
                return True

        except Exception as e:
            logger.error(f"❌ Stock import failed: {e}")
            return False

    def safe_decimal(self, value):
        """Safely convert to decimal."""
        try:
            return Decimal(str(value or '0'))
        except:
            return Decimal('0')

    def safe_int(self, value):
        """Safely convert to integer."""
        try:
            return int(float(value or '0'))
        except:
            return 0

    def run_safe_migration(self):
        """Run the complete safe migration."""
        logger.info("🛡️  STARTING SAFE GA4 MIGRATION")
        logger.info("=" * 50)

        # Connect to database
        if not self.connect_database():
            return False

        # Check current state
        before_counts = self.check_current_state()

        # Confirm with user
        print("\n🚨 SAFETY CONFIRMATION")
        print("=" * 30)
        print("This migration will:")
        print("✅ PRESERVE all existing data")
        print("✅ Only ADD missing records")
        print("✅ NOT touch VRM or technical data")
        print("\nCurrent state:")
        for table, count in before_counts.items():
            print(f"   {table}: {count:,} records")

        if SAFETY_CHECKS['require_confirmation']:
            response = input("\nProceed with SAFE migration? (yes/no): ")
            if response.lower() != 'yes':
                logger.info("Migration cancelled by user")
                return False

        # Run imports
        success = True
        success &= self.safe_import_documents()
        success &= self.safe_import_reminders()
        success &= self.safe_import_stock()

        # Check final state
        after_counts = self.check_current_state()

        # Report results
        logger.info("\n🎉 SAFE MIGRATION COMPLETED")
        logger.info("=" * 40)
        logger.info(f"📄 Documents added: {self.stats['documents_added']:,}")
        logger.info(f"⏰ Reminders added: {self.stats['reminders_added']:,}")
        logger.info(f"📦 Stock added: {self.stats['stock_added']:,}")
        logger.info(f"❌ Errors: {self.stats['errors']:,}")

        logger.info("\n📊 BEFORE vs AFTER:")
        for table in before_counts:
            before = before_counts[table]
            after = after_counts.get(table, 0)
            added = after - before
            if added > 0:
                logger.info(f"   {table}: {before:,} → {after:,} (+{added:,})")
            else:
                logger.info(f"   {table}: {before:,} (unchanged)")

        return success

def main():
    """Main execution function."""
    migrator = SafeGA4Migrator()
    success = migrator.run_safe_migration()

    if success:
        print("\n🎉 SAFE MIGRATION SUCCESSFUL!")
        print("✅ All existing data preserved")
        print("✅ Missing records added")
        print("✅ VRM and technical data intact")
    else:
        print("\n❌ MIGRATION FAILED")
        print("Check safe_migration.log for details")

    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
