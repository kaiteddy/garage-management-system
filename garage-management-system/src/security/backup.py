"""
Basic backup service for the Garage Management System.
"""
import os
import json
import shutil
import tempfile
from datetime import datetime
from flask import current_app


class SecureBackupService:
    """Basic backup service for the application."""
    
    def __init__(self, app=None):
        self.app = app
        self.backup_dir = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize backup service with Flask app."""
        self.app = app
        self.backup_dir = app.config.get('BACKUP_DIRECTORY', 'backups')
        
        # Ensure backup directory exists
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir, mode=0o700)
    
    def create_full_backup(self, include_logs=True):
        """Create a basic backup of the system."""
        try:
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            backup_name = f"garage_backup_{timestamp}"
            
            # Create backup directory
            backup_path = os.path.join(self.backup_dir, backup_name)
            os.makedirs(backup_path, exist_ok=True)
            
            # Backup database (if SQLite)
            db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
            if db_uri.startswith('sqlite:///'):
                db_file = db_uri.replace('sqlite:///', '')
                if os.path.exists(db_file):
                    shutil.copy2(db_file, os.path.join(backup_path, 'database.db'))
            
            # Backup configuration files
            config_files = ['src/config/', 'requirements/']
            for config_dir in config_files:
                if os.path.exists(config_dir):
                    dest_dir = os.path.join(backup_path, os.path.basename(config_dir))
                    shutil.copytree(config_dir, dest_dir, ignore_errors=True)
            
            # Create manifest
            manifest = {
                'backup_name': backup_name,
                'timestamp': timestamp,
                'created_at': datetime.utcnow().isoformat(),
                'version': '1.0',
                'components': {
                    'database': os.path.exists(os.path.join(backup_path, 'database.db')),
                    'configuration': os.path.exists(os.path.join(backup_path, 'config'))
                }
            }
            
            with open(os.path.join(backup_path, 'manifest.json'), 'w') as f:
                json.dump(manifest, f, indent=2)
            
            # Create archive
            archive_path = f"{backup_path}.tar.gz"
            shutil.make_archive(backup_path, 'gztar', backup_path)
            
            # Clean up temporary directory
            shutil.rmtree(backup_path)
            
            return {
                'success': True,
                'backup_path': archive_path,
                'backup_name': backup_name,
                'size': os.path.getsize(archive_path) if os.path.exists(archive_path) else 0
            }
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Backup creation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_backups(self):
        """List available backups."""
        try:
            backups = []
            if os.path.exists(self.backup_dir):
                for filename in os.listdir(self.backup_dir):
                    if filename.startswith('garage_backup_') and filename.endswith('.tar.gz'):
                        file_path = os.path.join(self.backup_dir, filename)
                        stat = os.stat(file_path)
                        
                        backups.append({
                            'name': filename,
                            'size': stat.st_size,
                            'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
            
            return sorted(backups, key=lambda x: x['created_at'], reverse=True)
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"List backups failed: {str(e)}")
            return []
    
    def _cleanup_old_backups(self):
        """Clean up old backups based on retention policy."""
        try:
            retention_days = 30  # Keep backups for 30 days
            cutoff_time = datetime.utcnow().timestamp() - (retention_days * 24 * 3600)
            
            if os.path.exists(self.backup_dir):
                for filename in os.listdir(self.backup_dir):
                    if filename.startswith('garage_backup_'):
                        file_path = os.path.join(self.backup_dir, filename)
                        if os.path.getmtime(file_path) < cutoff_time:
                            os.remove(file_path)
                            if current_app:
                                current_app.logger.info(f"Deleted old backup: {filename}")
                                
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Backup cleanup failed: {str(e)}")


# Global backup service instance
backup_service = SecureBackupService()
