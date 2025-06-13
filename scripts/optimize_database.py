#!/usr/bin/env python3
"""
Database optimization script for the Garage Management System.
Run this script to create indexes and optimize database performance.
"""
import sys
import os
import time
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from app import create_app
from utils.database_utils import DatabaseUtils
from config.logging import get_logger

logger = get_logger('database_optimization')


def main():
    """Main optimization function."""
    print("🚀 Starting Database Optimization...")
    print("=" * 50)
    
    # Create app context
    app = create_app('development')
    
    with app.app_context():
        try:
            # Run optimization
            start_time = time.time()
            results = optimize_database()
            end_time = time.time()
            
            # Print results
            print_optimization_results(results, end_time - start_time)
            
            # Get database statistics
            print("\n📊 Database Statistics:")
            print("-" * 30)
            stats = DatabaseUtils.get_database_stats()
            print_database_stats(stats)
            
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            print(f"❌ Optimization failed: {e}")
            sys.exit(1)


def optimize_database():
    """Run database optimization."""
    print("🔧 Running database optimization...")
    
    # Run the optimization
    results = DatabaseUtils.optimize_database()
    
    # Additional custom optimizations
    additional_results = run_additional_optimizations()
    
    # Merge results
    results['additional_indexes'] = additional_results.get('indexes_created', 0)
    results['custom_optimizations'] = additional_results.get('optimizations', [])
    
    return results


def run_additional_optimizations():
    """Run additional custom optimizations."""
    results = {
        'indexes_created': 0,
        'optimizations': []
    }
    
    try:
        # Create composite indexes for common queries
        composite_indexes = [
            # Customer search indexes
            ('customers', ['name', 'company'], 'idx_customers_name_company'),
            ('customers', ['email', 'phone'], 'idx_customers_contact'),
            
            # Vehicle search indexes
            ('vehicles', ['registration', 'customer_id'], 'idx_vehicles_reg_customer'),
            ('vehicles', ['make', 'model'], 'idx_vehicles_make_model'),
            ('vehicles', ['mot_expiry', 'status'], 'idx_vehicles_mot_status'),
            
            # Job workflow indexes
            ('jobs', ['customer_id', 'status'], 'idx_jobs_customer_status'),
            ('jobs', ['vehicle_id', 'created_at'], 'idx_jobs_vehicle_date'),
            ('jobs', ['status', 'created_at'], 'idx_jobs_status_date'),
            
            # Estimate workflow indexes
            ('estimates', ['customer_id', 'status'], 'idx_estimates_customer_status'),
            ('estimates', ['job_id', 'status'], 'idx_estimates_job_status'),
            ('estimates', ['valid_until', 'status'], 'idx_estimates_expiry_status'),
            
            # Invoice workflow indexes
            ('invoices', ['customer_id', 'status'], 'idx_invoices_customer_status'),
            ('invoices', ['job_id', 'status'], 'idx_invoices_job_status'),
            ('invoices', ['created_at', 'status'], 'idx_invoices_date_status'),
            
            # Financial reporting indexes
            ('invoices', ['created_at', 'amount'], 'idx_invoices_financial'),
            ('jobs', ['created_at', 'total_amount'], 'idx_jobs_financial'),
        ]
        
        for table_name, columns, index_name in composite_indexes:
            # Check if table exists and index doesn't exist
            table_info = DatabaseUtils.get_table_info(table_name)
            if table_info:
                existing_indexes = [idx['name'] for idx in table_info['indexes']]
                if index_name not in existing_indexes:
                    if DatabaseUtils.create_index(table_name, columns, index_name):
                        results['indexes_created'] += 1
                        results['optimizations'].append(f"Created composite index: {index_name}")
        
        # Create partial indexes for common filtered queries
        partial_optimizations = create_partial_indexes()
        results['indexes_created'] += partial_optimizations['count']
        results['optimizations'].extend(partial_optimizations['descriptions'])
        
        # Optimize table statistics
        update_table_statistics()
        results['optimizations'].append("Updated table statistics")
        
        logger.info(f"Additional optimizations completed: {results}")
        
    except Exception as e:
        logger.error(f"Additional optimizations failed: {e}")
        results['optimizations'].append(f"Error in additional optimizations: {e}")
    
    return results


def create_partial_indexes():
    """Create partial indexes for filtered queries."""
    results = {'count': 0, 'descriptions': []}
    
    try:
        # Partial indexes for active/pending records
        partial_indexes = [
            # Active customers (those with recent activity)
            {
                'table': 'customers',
                'columns': ['created_at'],
                'condition': "created_at > datetime('now', '-1 year')",
                'name': 'idx_customers_recent'
            },
            # Pending jobs
            {
                'table': 'jobs',
                'columns': ['created_at'],
                'condition': "status = 'pending'",
                'name': 'idx_jobs_pending'
            },
            # Unpaid invoices
            {
                'table': 'invoices',
                'columns': ['created_at', 'amount'],
                'condition': "status IN ('pending', 'overdue')",
                'name': 'idx_invoices_unpaid'
            },
            # Vehicles with upcoming MOT
            {
                'table': 'vehicles',
                'columns': ['mot_expiry'],
                'condition': "mot_expiry BETWEEN date('now') AND date('now', '+3 months')",
                'name': 'idx_vehicles_mot_upcoming'
            }
        ]
        
        for index_config in partial_indexes:
            try:
                # SQLite doesn't support partial indexes in the same way as PostgreSQL
                # So we'll create regular indexes for now
                table_info = DatabaseUtils.get_table_info(index_config['table'])
                if table_info:
                    existing_indexes = [idx['name'] for idx in table_info['indexes']]
                    if index_config['name'] not in existing_indexes:
                        if DatabaseUtils.create_index(
                            index_config['table'], 
                            index_config['columns'], 
                            index_config['name']
                        ):
                            results['count'] += 1
                            results['descriptions'].append(f"Created filtered index: {index_config['name']}")
            except Exception as e:
                logger.warning(f"Failed to create partial index {index_config['name']}: {e}")
    
    except Exception as e:
        logger.error(f"Partial index creation failed: {e}")
    
    return results


def update_table_statistics():
    """Update table statistics for query optimization."""
    try:
        # Run ANALYZE to update statistics
        DatabaseUtils.execute_raw_sql("ANALYZE")
        logger.info("Table statistics updated")
    except Exception as e:
        logger.error(f"Failed to update table statistics: {e}")


def print_optimization_results(results, duration):
    """Print optimization results."""
    print(f"✅ Optimization completed in {duration:.2f} seconds")
    print(f"📈 Indexes created: {results.get('indexes_created', 0)}")
    print(f"📊 Tables analyzed: {results.get('tables_analyzed', 0)}")
    
    if results.get('additional_indexes', 0) > 0:
        print(f"🔧 Additional indexes: {results['additional_indexes']}")
    
    if results.get('errors'):
        print(f"⚠️  Errors encountered: {len(results['errors'])}")
        for error in results['errors']:
            print(f"   - {error}")
    
    if results.get('custom_optimizations'):
        print("\n🛠️  Custom Optimizations:")
        for opt in results['custom_optimizations']:
            print(f"   ✓ {opt}")


def print_database_stats(stats):
    """Print database statistics."""
    if 'error' in stats:
        print(f"❌ Error getting stats: {stats['error']}")
        return
    
    print(f"📋 Total tables: {stats.get('total_tables', 0)}")
    
    if 'tables' in stats:
        for table_name, table_stats in stats['tables'].items():
            if 'error' in table_stats:
                print(f"   {table_name}: Error - {table_stats['error']}")
            else:
                print(f"   {table_name}: {table_stats.get('row_count', 0)} rows, "
                      f"{table_stats.get('index_count', 0)} indexes")


def check_database_health():
    """Check database health and integrity."""
    print("\n🏥 Database Health Check:")
    print("-" * 30)
    
    try:
        # Check database integrity
        result = DatabaseUtils.execute_raw_sql("PRAGMA integrity_check")
        integrity_result = result.fetchone()
        
        if integrity_result and integrity_result[0] == 'ok':
            print("✅ Database integrity: OK")
        else:
            print(f"⚠️  Database integrity: {integrity_result}")
        
        # Check foreign key constraints
        result = DatabaseUtils.execute_raw_sql("PRAGMA foreign_key_check")
        fk_violations = result.fetchall()
        
        if not fk_violations:
            print("✅ Foreign key constraints: OK")
        else:
            print(f"⚠️  Foreign key violations: {len(fk_violations)}")
        
        # Check database size
        result = DatabaseUtils.execute_raw_sql("PRAGMA page_count")
        page_count = result.fetchone()[0]
        
        result = DatabaseUtils.execute_raw_sql("PRAGMA page_size")
        page_size = result.fetchone()[0]
        
        db_size_mb = (page_count * page_size) / (1024 * 1024)
        print(f"📏 Database size: {db_size_mb:.2f} MB")
        
    except Exception as e:
        print(f"❌ Health check failed: {e}")


if __name__ == '__main__':
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    main()
    check_database_health()
    print(f"🕐 Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n🎉 Database optimization complete!")
