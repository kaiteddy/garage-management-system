"""
Database utilities for common database operations.
"""
from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError
from models import db
import logging

logger = logging.getLogger(__name__)


class DatabaseUtils:
    """Utility class for database operations."""
    
    @staticmethod
    def execute_raw_sql(query, params=None):
        """
        Execute raw SQL query safely.
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            Query result
            
        Raises:
            SQLAlchemyError: If query execution fails
        """
        try:
            result = db.session.execute(text(query), params or {})
            db.session.commit()
            return result
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database query failed: {e}")
            raise

    @staticmethod
    def bulk_insert(model_class, data_list, batch_size=1000):
        """
        Perform bulk insert operation.
        
        Args:
            model_class: SQLAlchemy model class
            data_list: List of dictionaries with data to insert
            batch_size: Number of records to insert per batch
            
        Returns:
            Number of records inserted
        """
        try:
            total_inserted = 0
            
            for i in range(0, len(data_list), batch_size):
                batch = data_list[i:i + batch_size]
                db.session.bulk_insert_mappings(model_class, batch)
                total_inserted += len(batch)
                
                # Commit each batch
                db.session.commit()
                logger.info(f"Inserted batch of {len(batch)} records")
            
            logger.info(f"Total records inserted: {total_inserted}")
            return total_inserted
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Bulk insert failed: {e}")
            raise

    @staticmethod
    def bulk_update(model_class, data_list, batch_size=1000):
        """
        Perform bulk update operation.
        
        Args:
            model_class: SQLAlchemy model class
            data_list: List of dictionaries with data to update (must include id)
            batch_size: Number of records to update per batch
            
        Returns:
            Number of records updated
        """
        try:
            total_updated = 0
            
            for i in range(0, len(data_list), batch_size):
                batch = data_list[i:i + batch_size]
                db.session.bulk_update_mappings(model_class, batch)
                total_updated += len(batch)
                
                # Commit each batch
                db.session.commit()
                logger.info(f"Updated batch of {len(batch)} records")
            
            logger.info(f"Total records updated: {total_updated}")
            return total_updated
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Bulk update failed: {e}")
            raise

    @staticmethod
    def get_table_info(table_name):
        """
        Get information about a database table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            Dictionary with table information
        """
        try:
            inspector = inspect(db.engine)
            
            # Check if table exists
            if table_name not in inspector.get_table_names():
                return None
            
            # Get table information
            columns = inspector.get_columns(table_name)
            indexes = inspector.get_indexes(table_name)
            foreign_keys = inspector.get_foreign_keys(table_name)
            primary_key = inspector.get_pk_constraint(table_name)
            
            return {
                'name': table_name,
                'columns': columns,
                'indexes': indexes,
                'foreign_keys': foreign_keys,
                'primary_key': primary_key
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to get table info for {table_name}: {e}")
            return None

    @staticmethod
    def create_index(table_name, column_names, index_name=None, unique=False):
        """
        Create database index.
        
        Args:
            table_name: Name of the table
            column_names: List of column names or single column name
            index_name: Name of the index (auto-generated if None)
            unique: Whether the index should be unique
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if isinstance(column_names, str):
                column_names = [column_names]
            
            if not index_name:
                index_name = f"idx_{table_name}_{'_'.join(column_names)}"
            
            columns_str = ', '.join(column_names)
            unique_str = 'UNIQUE' if unique else ''
            
            query = f"CREATE {unique_str} INDEX {index_name} ON {table_name} ({columns_str})"
            
            db.session.execute(text(query))
            db.session.commit()
            
            logger.info(f"Created index {index_name} on {table_name}({columns_str})")
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Failed to create index: {e}")
            return False

    @staticmethod
    def drop_index(index_name):
        """
        Drop database index.
        
        Args:
            index_name: Name of the index to drop
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = f"DROP INDEX {index_name}"
            db.session.execute(text(query))
            db.session.commit()
            
            logger.info(f"Dropped index {index_name}")
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Failed to drop index {index_name}: {e}")
            return False

    @staticmethod
    def optimize_database():
        """
        Perform database optimization tasks.
        
        Returns:
            Dictionary with optimization results
        """
        results = {
            'indexes_created': 0,
            'tables_analyzed': 0,
            'errors': []
        }
        
        try:
            # Create common indexes for better performance
            common_indexes = [
                ('customers', ['account_number'], 'idx_customers_account_number', True),
                ('customers', ['email'], 'idx_customers_email'),
                ('customers', ['phone'], 'idx_customers_phone'),
                ('customers', ['mobile'], 'idx_customers_mobile'),
                ('vehicles', ['registration'], 'idx_vehicles_registration', True),
                ('vehicles', ['customer_id'], 'idx_vehicles_customer_id'),
                ('vehicles', ['mot_expiry'], 'idx_vehicles_mot_expiry'),
                ('jobs', ['customer_id'], 'idx_jobs_customer_id'),
                ('jobs', ['vehicle_id'], 'idx_jobs_vehicle_id'),
                ('jobs', ['status'], 'idx_jobs_status'),
                ('jobs', ['created_at'], 'idx_jobs_created_at'),
                ('estimates', ['customer_id'], 'idx_estimates_customer_id'),
                ('estimates', ['vehicle_id'], 'idx_estimates_vehicle_id'),
                ('estimates', ['job_id'], 'idx_estimates_job_id'),
                ('estimates', ['status'], 'idx_estimates_status'),
                ('estimates', ['valid_until'], 'idx_estimates_valid_until'),
                ('invoices', ['customer_id'], 'idx_invoices_customer_id'),
                ('invoices', ['vehicle_id'], 'idx_invoices_vehicle_id'),
                ('invoices', ['job_id'], 'idx_invoices_job_id'),
                ('invoices', ['estimate_id'], 'idx_invoices_estimate_id'),
                ('invoices', ['status'], 'idx_invoices_status'),
                ('invoices', ['created_at'], 'idx_invoices_created_at')
            ]
            
            for table_name, columns, index_name, *unique in common_indexes:
                is_unique = unique[0] if unique else False
                
                # Check if index already exists
                table_info = DatabaseUtils.get_table_info(table_name)
                if table_info:
                    existing_indexes = [idx['name'] for idx in table_info['indexes']]
                    if index_name not in existing_indexes:
                        if DatabaseUtils.create_index(table_name, columns, index_name, is_unique):
                            results['indexes_created'] += 1
                
                results['tables_analyzed'] += 1
            
            # Run ANALYZE on tables to update statistics (SQLite specific)
            try:
                db.session.execute(text("ANALYZE"))
                db.session.commit()
                logger.info("Database statistics updated")
            except SQLAlchemyError as e:
                results['errors'].append(f"Failed to analyze database: {e}")
            
            logger.info(f"Database optimization completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            results['errors'].append(str(e))
            return results

    @staticmethod
    def get_database_stats():
        """
        Get database statistics.
        
        Returns:
            Dictionary with database statistics
        """
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            stats = {
                'total_tables': len(tables),
                'tables': {}
            }
            
            for table_name in tables:
                try:
                    # Get row count
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    row_count = result.scalar()
                    
                    # Get table info
                    table_info = DatabaseUtils.get_table_info(table_name)
                    
                    stats['tables'][table_name] = {
                        'row_count': row_count,
                        'column_count': len(table_info['columns']) if table_info else 0,
                        'index_count': len(table_info['indexes']) if table_info else 0
                    }
                    
                except SQLAlchemyError as e:
                    logger.error(f"Failed to get stats for table {table_name}: {e}")
                    stats['tables'][table_name] = {'error': str(e)}
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {'error': str(e)}

    @staticmethod
    def backup_table(table_name, backup_name=None):
        """
        Create a backup of a table.
        
        Args:
            table_name: Name of the table to backup
            backup_name: Name of the backup table (auto-generated if None)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not backup_name:
                from datetime import datetime
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_name = f"{table_name}_backup_{timestamp}"
            
            query = f"CREATE TABLE {backup_name} AS SELECT * FROM {table_name}"
            db.session.execute(text(query))
            db.session.commit()
            
            logger.info(f"Created backup table {backup_name} from {table_name}")
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Failed to backup table {table_name}: {e}")
            return False

    @staticmethod
    def cleanup_old_data(table_name, date_column, days_to_keep):
        """
        Clean up old data from a table.
        
        Args:
            table_name: Name of the table
            date_column: Name of the date column
            days_to_keep: Number of days of data to keep
            
        Returns:
            Number of records deleted
        """
        try:
            query = f"""
                DELETE FROM {table_name} 
                WHERE {date_column} < datetime('now', '-{days_to_keep} days')
            """
            
            result = db.session.execute(text(query))
            deleted_count = result.rowcount
            db.session.commit()
            
            logger.info(f"Deleted {deleted_count} old records from {table_name}")
            return deleted_count
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Failed to cleanup old data from {table_name}: {e}")
            return 0
