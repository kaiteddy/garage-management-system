#!/usr/bin/env python3
"""
Database migration script to add new job fields for Kanban functionality
"""

import sqlite3
import os
import sys

def migrate_job_fields():
    """Add new fields to the jobs table for enhanced Kanban workflow"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    if not os.path.exists(db_path):
        print("❌ Database not found. Please run the main application first to create the database.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Starting job fields migration...")
        
        # Check if new fields already exist
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        new_fields = [
            ('priority', 'VARCHAR(10) DEFAULT "NORMAL"'),
            ('assigned_technician', 'VARCHAR(100)'),
            ('estimated_hours', 'REAL DEFAULT 0.0'),
            ('actual_hours', 'REAL DEFAULT 0.0'),
            ('started_date', 'DATE'),
            ('due_date', 'DATE'),
            ('internal_notes', 'TEXT'),
            ('customer_authorization', 'BOOLEAN DEFAULT 0'),
            ('bay_number', 'VARCHAR(10)')
        ]
        
        # Add missing fields
        for field_name, field_definition in new_fields:
            if field_name not in columns:
                try:
                    cursor.execute(f'ALTER TABLE jobs ADD COLUMN {field_name} {field_definition}')
                    print(f"✅ Added field: {field_name}")
                except sqlite3.Error as e:
                    print(f"⚠️  Warning: Could not add field {field_name}: {e}")
        
        # Update existing jobs to use new status values
        print("🔄 Updating job statuses to new workflow...")
        
        # Map old statuses to new Kanban statuses
        status_mapping = {
            'PENDING': 'BOOKED_IN',
            'IN_PROGRESS': 'IN_PROGRESS',
            'COMPLETED': 'COMPLETED',
            'CANCELLED': 'COMPLETED'  # Map cancelled to completed for now
        }
        
        for old_status, new_status in status_mapping.items():
            cursor.execute('UPDATE jobs SET status = ? WHERE status = ?', (new_status, old_status))
            updated_count = cursor.rowcount
            if updated_count > 0:
                print(f"✅ Updated {updated_count} jobs from {old_status} to {new_status}")
        
        # Set default priorities for existing jobs
        cursor.execute('UPDATE jobs SET priority = "NORMAL" WHERE priority IS NULL OR priority = ""')
        priority_count = cursor.rowcount
        if priority_count > 0:
            print(f"✅ Set default priority for {priority_count} jobs")
        
        # Commit changes
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Show summary
        cursor.execute('SELECT COUNT(*) FROM jobs')
        total_jobs = cursor.fetchone()[0]
        
        cursor.execute('SELECT status, COUNT(*) FROM jobs GROUP BY status')
        status_counts = cursor.fetchall()
        
        print(f"\n📊 Job Summary ({total_jobs} total jobs):")
        for status, count in status_counts:
            print(f"   {status}: {count} jobs")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Job Fields Migration Script")
    print("=" * 50)
    
    success = migrate_job_fields()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now use the enhanced Kanban job management features.")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
