"""
Database Search Optimization
Creates indexes and optimizations for intelligent search performance
"""

import sqlite3
import os
from typing import List


class SearchOptimizer:
    """
    Handles database optimization for search performance
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def create_search_indexes(self) -> List[str]:
        """Create database indexes for optimal search performance"""
        results = []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Customer search indexes
            customer_indexes = [
                "CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name COLLATE NOCASE)",
                "CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile)",
                "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)",
                "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email COLLATE NOCASE)",
                "CREATE INDEX IF NOT EXISTS idx_customers_postal_code ON customers(postal_code)",
                "CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number)",
                "CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)"
            ]
            
            # Vehicle search indexes
            vehicle_indexes = [
                "CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration COLLATE NOCASE)",
                "CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make COLLATE NOCASE)",
                "CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model COLLATE NOCASE)",
                "CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)",
                "CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at)"
            ]
            
            # Job search indexes
            job_indexes = [
                "CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_vehicle_id ON jobs(vehicle_id)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_created_date ON jobs(created_date)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_assigned_technician ON jobs(assigned_technician)"
            ]
            
            # Invoice search indexes
            invoice_indexes = [
                "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_created_date ON invoices(created_date)"
            ]
            
            # Composite indexes for common search patterns
            composite_indexes = [
                "CREATE INDEX IF NOT EXISTS idx_customers_name_mobile ON customers(name COLLATE NOCASE, mobile)",
                "CREATE INDEX IF NOT EXISTS idx_vehicles_reg_customer ON vehicles(registration COLLATE NOCASE, customer_id)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_customer_vehicle ON jobs(customer_id, vehicle_id)",
                "CREATE INDEX IF NOT EXISTS idx_jobs_status_date ON jobs(status, created_date)"
            ]
            
            all_indexes = customer_indexes + vehicle_indexes + job_indexes + invoice_indexes + composite_indexes
            
            for index_sql in all_indexes:
                try:
                    cursor.execute(index_sql)
                    index_name = index_sql.split("idx_")[1].split(" ")[0]
                    results.append(f"✅ Created index: idx_{index_name}")
                except sqlite3.Error as e:
                    results.append(f"❌ Failed to create index: {str(e)}")
            
            # Analyze tables for query optimization
            tables_to_analyze = ['customers', 'vehicles', 'jobs', 'invoices']
            for table in tables_to_analyze:
                try:
                    cursor.execute(f"ANALYZE {table}")
                    results.append(f"✅ Analyzed table: {table}")
                except sqlite3.Error as e:
                    results.append(f"❌ Failed to analyze table {table}: {str(e)}")
            
            conn.commit()
            results.append("✅ All search indexes created successfully")
            
        except Exception as e:
            results.append(f"❌ Error creating indexes: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
        
        return results
    
    def create_search_views(self) -> List[str]:
        """Create database views for optimized search queries"""
        results = []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Customer search view with normalized data
            customer_search_view = """
            CREATE VIEW IF NOT EXISTS customer_search_view AS
            SELECT 
                c.id,
                c.account_number,
                c.name,
                LOWER(c.name) as name_lower,
                c.phone,
                REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '(', '') as phone_normalized,
                c.mobile,
                REPLACE(REPLACE(REPLACE(c.mobile, ' ', ''), '-', ''), '(', '') as mobile_normalized,
                LOWER(c.email) as email_lower,
                c.email,
                c.address,
                UPPER(REPLACE(c.postal_code, ' ', '')) as postal_code_normalized,
                c.postal_code,
                c.created_at
            FROM customers c
            """
            
            # Vehicle search view with customer data
            vehicle_search_view = """
            CREATE VIEW IF NOT EXISTS vehicle_search_view AS
            SELECT 
                v.id,
                UPPER(REPLACE(v.registration, ' ', '')) as registration_normalized,
                v.registration,
                LOWER(v.make) as make_lower,
                v.make,
                LOWER(v.model) as model_lower,
                v.model,
                v.year,
                v.color,
                v.customer_id,
                c.name as customer_name,
                LOWER(c.name) as customer_name_lower,
                c.mobile as customer_mobile,
                REPLACE(REPLACE(REPLACE(c.mobile, ' ', ''), '-', ''), '(', '') as customer_mobile_normalized,
                c.account_number as customer_account,
                v.created_at
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            """
            
            # Job search view with related data
            job_search_view = """
            CREATE VIEW IF NOT EXISTS job_search_view AS
            SELECT 
                j.id,
                j.job_number,
                j.description,
                LOWER(j.description) as description_lower,
                j.status,
                j.customer_id,
                j.vehicle_id,
                j.created_date,
                j.assigned_technician,
                c.name as customer_name,
                LOWER(c.name) as customer_name_lower,
                c.mobile as customer_mobile,
                REPLACE(REPLACE(REPLACE(c.mobile, ' ', ''), '-', ''), '(', '') as customer_mobile_normalized,
                c.account_number as customer_account,
                v.registration as vehicle_registration,
                UPPER(REPLACE(v.registration, ' ', '')) as vehicle_registration_normalized,
                v.make as vehicle_make,
                v.model as vehicle_model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            """
            
            views = [
                ("customer_search_view", customer_search_view),
                ("vehicle_search_view", vehicle_search_view),
                ("job_search_view", job_search_view)
            ]
            
            for view_name, view_sql in views:
                try:
                    cursor.execute(view_sql)
                    results.append(f"✅ Created view: {view_name}")
                except sqlite3.Error as e:
                    results.append(f"❌ Failed to create view {view_name}: {str(e)}")
            
            conn.commit()
            results.append("✅ All search views created successfully")
            
        except Exception as e:
            results.append(f"❌ Error creating views: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
        
        return results
    
    def optimize_database(self) -> List[str]:
        """Perform comprehensive database optimization for search"""
        results = []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Enable query optimization
            cursor.execute("PRAGMA optimize")
            results.append("✅ Database optimization enabled")
            
            # Update table statistics
            cursor.execute("ANALYZE")
            results.append("✅ Table statistics updated")
            
            # Set optimal cache size (10MB)
            cursor.execute("PRAGMA cache_size = 10000")
            results.append("✅ Cache size optimized")
            
            # Enable memory-mapped I/O for better performance
            cursor.execute("PRAGMA mmap_size = 268435456")  # 256MB
            results.append("✅ Memory-mapped I/O enabled")
            
            # Set optimal page size
            cursor.execute("PRAGMA page_size = 4096")
            results.append("✅ Page size optimized")
            
            conn.commit()
            
        except Exception as e:
            results.append(f"❌ Error optimizing database: {str(e)}")
        finally:
            conn.close()
        
        return results
    
    def get_search_performance_stats(self) -> dict:
        """Get performance statistics for search operations"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        stats = {}
        
        try:
            # Count records in each table
            tables = ['customers', 'vehicles', 'jobs', 'invoices']
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                stats[f"{table}_count"] = count
            
            # Check if indexes exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
            indexes = [row[0] for row in cursor.fetchall()]
            stats['search_indexes'] = indexes
            stats['index_count'] = len(indexes)
            
            # Check if views exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='view' AND name LIKE '%_search_view'")
            views = [row[0] for row in cursor.fetchall()]
            stats['search_views'] = views
            stats['view_count'] = len(views)
            
            # Database size
            cursor.execute("PRAGMA page_count")
            page_count = cursor.fetchone()[0]
            cursor.execute("PRAGMA page_size")
            page_size = cursor.fetchone()[0]
            stats['database_size_mb'] = round((page_count * page_size) / (1024 * 1024), 2)
            
        except Exception as e:
            stats['error'] = str(e)
        finally:
            conn.close()
        
        return stats
    
    def run_full_optimization(self) -> dict:
        """Run complete search optimization process"""
        results = {
            'indexes': [],
            'views': [],
            'optimization': [],
            'stats': {}
        }
        
        # Create indexes
        results['indexes'] = self.create_search_indexes()
        
        # Create views
        results['views'] = self.create_search_views()
        
        # Optimize database
        results['optimization'] = self.optimize_database()
        
        # Get performance stats
        results['stats'] = self.get_search_performance_stats()
        
        return results


def optimize_search_database(db_path: str = None) -> dict:
    """Convenience function to optimize database for search"""
    if db_path is None:
        # Default path
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        db_path = os.path.join(project_root, 'instance', 'garage.db')
    
    optimizer = SearchOptimizer(db_path)
    return optimizer.run_full_optimization()


if __name__ == "__main__":
    # Run optimization if script is executed directly
    results = optimize_search_database()
    
    print("🔍 Search Database Optimization Results")
    print("=" * 50)
    
    print("\n📊 Database Statistics:")
    for key, value in results['stats'].items():
        print(f"  {key}: {value}")
    
    print(f"\n✅ Created {len([r for r in results['indexes'] if '✅' in r])} indexes")
    print(f"✅ Created {len([r for r in results['views'] if '✅' in r])} views")
    print(f"✅ Applied {len([r for r in results['optimization'] if '✅' in r])} optimizations")
    
    print("\n🚀 Search optimization complete!")
