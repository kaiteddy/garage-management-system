#!/usr/bin/env python3
"""
DeepSource Fix Manager - Automated fix tracking and management system
Prevents duplicate fixes and maintains comprehensive fix history
"""

import os
import json
import sqlite3
import requests
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class FixRecord:
    """Record of a DeepSource fix"""
    fix_id: str
    issue_type: str
    file_path: str
    line_number: Optional[int]
    fix_description: str
    fix_method: str  # 'auto', 'manual', 'ignored'
    applied_at: str
    pr_number: Optional[int]
    commit_sha: Optional[str]
    success: bool
    error_message: Optional[str] = None

class DeepSourceFixManager:
    """Manages DeepSource fixes with logging and duplicate prevention"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or os.path.dirname(os.path.dirname(__file__)))
        self.db_path = self.project_root / 'logs' / 'deepsource_fixes.db'
        self.log_file = self.project_root / 'logs' / 'deepsource_fixes.json'
        self.config_file = self.project_root / 'config' / 'deepsource_config.json'
        
        # Ensure directories exist
        self.db_path.parent.mkdir(exist_ok=True)
        self.config_file.parent.mkdir(exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.project_root / 'logs' / 'fix_manager.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Initialize database
        self._init_database()
        
        # Load configuration
        self.config = self._load_config()
    
    def _init_database(self):
        """Initialize SQLite database for fix tracking"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS fixes (
                    fix_id TEXT PRIMARY KEY,
                    issue_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    line_number INTEGER,
                    fix_description TEXT NOT NULL,
                    fix_method TEXT NOT NULL,
                    applied_at TEXT NOT NULL,
                    pr_number INTEGER,
                    commit_sha TEXT,
                    success BOOLEAN NOT NULL,
                    error_message TEXT,
                    file_hash TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS fix_patterns (
                    pattern_id TEXT PRIMARY KEY,
                    issue_type TEXT NOT NULL,
                    pattern_description TEXT NOT NULL,
                    fix_strategy TEXT NOT NULL,
                    success_rate REAL DEFAULT 0.0,
                    last_used TEXT,
                    usage_count INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_fixes_file_path ON fixes(file_path);
                CREATE INDEX IF NOT EXISTS idx_fixes_issue_type ON fixes(issue_type);
                CREATE INDEX IF NOT EXISTS idx_fixes_applied_at ON fixes(applied_at);
            ''')
    
    def _load_config(self) -> Dict:
        """Load DeepSource configuration"""
        default_config = {
            "auto_merge_enabled": True,
            "auto_fix_types": [
                "style",
                "formatting",
                "import_organization",
                "unused_imports"
            ],
            "manual_review_types": [
                "security",
                "performance",
                "antipattern"
            ],
            "ignored_files": [
                "test_*.py",
                "*_test.js",
                "migrations/*"
            ],
            "max_auto_fixes_per_day": 50,
            "notification_webhook": None
        }
        
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
                # Merge with defaults
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
        except FileNotFoundError:
            # Create default config
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
    
    def generate_fix_id(self, file_path: str, line_number: Optional[int], 
                       issue_type: str) -> str:
        """Generate unique fix ID based on file, line, and issue type"""
        content = f"{file_path}:{line_number or 0}:{issue_type}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def is_fix_already_applied(self, fix_id: str) -> bool:
        """Check if a fix has already been applied successfully"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT success FROM fixes WHERE fix_id = ? AND success = 1',
                (fix_id,)
            )
            return cursor.fetchone() is not None
    
    def record_fix(self, fix_record: FixRecord) -> bool:
        """Record a fix attempt in the database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Calculate file hash for change detection
                file_hash = None
                if os.path.exists(fix_record.file_path):
                    with open(fix_record.file_path, 'rb') as f:
                        file_hash = hashlib.md5(f.read()).hexdigest()
                
                conn.execute('''
                    INSERT OR REPLACE INTO fixes 
                    (fix_id, issue_type, file_path, line_number, fix_description,
                     fix_method, applied_at, pr_number, commit_sha, success,
                     error_message, file_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    fix_record.fix_id,
                    fix_record.issue_type,
                    fix_record.file_path,
                    fix_record.line_number,
                    fix_record.fix_description,
                    fix_record.fix_method,
                    fix_record.applied_at,
                    fix_record.pr_number,
                    fix_record.commit_sha,
                    fix_record.success,
                    fix_record.error_message,
                    file_hash
                ))
                
                # Also log to JSON for easy viewing
                self._log_to_json(fix_record)
                
                self.logger.info(f"Recorded fix: {fix_record.fix_id} - {fix_record.fix_description}")
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to record fix: {e}")
            return False
    
    def _log_to_json(self, fix_record: FixRecord):
        """Log fix to JSON file for easy viewing"""
        try:
            # Load existing logs
            logs = []
            if self.log_file.exists():
                with open(self.log_file, 'r') as f:
                    logs = json.load(f)
            
            # Add new log entry
            logs.append(asdict(fix_record))
            
            # Keep only last 1000 entries
            if len(logs) > 1000:
                logs = logs[-1000:]
            
            # Save back to file
            with open(self.log_file, 'w') as f:
                json.dump(logs, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to log to JSON: {e}")
    
    def get_fix_history(self, file_path: Optional[str] = None, 
                       issue_type: Optional[str] = None,
                       days: int = 30) -> List[Dict]:
        """Get fix history with optional filtering"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            query = '''
                SELECT * FROM fixes 
                WHERE applied_at >= datetime('now', '-{} days')
            '''.format(days)
            
            params = []
            
            if file_path:
                query += ' AND file_path = ?'
                params.append(file_path)
            
            if issue_type:
                query += ' AND issue_type = ?'
                params.append(issue_type)
            
            query += ' ORDER BY applied_at DESC'
            
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_fix_statistics(self) -> Dict:
        """Get comprehensive fix statistics"""
        with sqlite3.connect(self.db_path) as conn:
            stats = {}
            
            # Total fixes
            cursor = conn.execute('SELECT COUNT(*) FROM fixes')
            stats['total_fixes'] = cursor.fetchone()[0]
            
            # Success rate
            cursor = conn.execute('SELECT COUNT(*) FROM fixes WHERE success = 1')
            successful_fixes = cursor.fetchone()[0]
            stats['success_rate'] = (successful_fixes / stats['total_fixes'] * 100) if stats['total_fixes'] > 0 else 0
            
            # Fixes by type
            cursor = conn.execute('''
                SELECT issue_type, COUNT(*) as count, 
                       SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
                FROM fixes 
                GROUP BY issue_type 
                ORDER BY count DESC
            ''')
            stats['by_type'] = [
                {
                    'type': row[0],
                    'count': row[1],
                    'successful': row[2],
                    'success_rate': (row[2] / row[1] * 100) if row[1] > 0 else 0
                }
                for row in cursor.fetchall()
            ]
            
            # Recent activity (last 7 days)
            cursor = conn.execute('''
                SELECT COUNT(*) FROM fixes 
                WHERE applied_at >= datetime('now', '-7 days')
            ''')
            stats['recent_fixes'] = cursor.fetchone()[0]
            
            return stats
    
    def should_auto_fix(self, issue_type: str, file_path: str) -> bool:
        """Determine if an issue should be auto-fixed"""
        # Check if auto-fix is enabled
        if not self.config.get('auto_merge_enabled', True):
            return False
        
        # Check if issue type is in auto-fix list
        if issue_type not in self.config.get('auto_fix_types', []):
            return False
        
        # Check if file is ignored
        ignored_patterns = self.config.get('ignored_files', [])
        for pattern in ignored_patterns:
            if self._matches_pattern(file_path, pattern):
                return False
        
        # Check daily limit
        today = datetime.now().strftime('%Y-%m-%d')
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                SELECT COUNT(*) FROM fixes 
                WHERE date(applied_at) = ? AND fix_method = 'auto'
            ''', (today,))
            daily_count = cursor.fetchone()[0]
            
            max_daily = self.config.get('max_auto_fixes_per_day', 50)
            if daily_count >= max_daily:
                self.logger.warning(f"Daily auto-fix limit reached: {daily_count}/{max_daily}")
                return False
        
        return True
    
    def _matches_pattern(self, file_path: str, pattern: str) -> bool:
        """Check if file path matches a glob pattern"""
        import fnmatch
        return fnmatch.fnmatch(file_path, pattern)
    
    def cleanup_old_records(self, days: int = 90):
        """Clean up old fix records"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                DELETE FROM fixes 
                WHERE applied_at < datetime('now', '-{} days')
            '''.format(days))
            
            deleted_count = cursor.rowcount
            self.logger.info(f"Cleaned up {deleted_count} old fix records")
            return deleted_count

if __name__ == '__main__':
    # Command line interface
    import argparse
    
    parser = argparse.ArgumentParser(description='DeepSource Fix Manager')
    parser.add_argument('--stats', action='store_true', help='Show fix statistics')
    parser.add_argument('--history', action='store_true', help='Show recent fix history')
    parser.add_argument('--cleanup', type=int, help='Clean up records older than N days')
    
    args = parser.parse_args()
    
    manager = DeepSourceFixManager()
    
    if args.stats:
        stats = manager.get_fix_statistics()
        print(json.dumps(stats, indent=2))
    
    if args.history:
        history = manager.get_fix_history(days=7)
        print(json.dumps(history, indent=2))
    
    if args.cleanup:
        deleted = manager.cleanup_old_records(args.cleanup)
        print(f"Cleaned up {deleted} old records")
