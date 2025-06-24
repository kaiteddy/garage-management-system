"""
Google Drive Integration Service for Garage Management System

This service provides automatic synchronization with Google Drive folders,
allowing real-time updates of CSV data files.
"""

import json
import logging
import os
import pickle
import tempfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

try:
    import io

    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaIoBaseDownload
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logging.warning(
        "Google Drive dependencies not installed. Install with: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")

from .csv_import_service import CSVImportService


class GoogleDriveService:
    """Service for Google Drive integration and automatic file synchronization"""

    # Google Drive API scopes
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

    def __init__(self, db_path: str, credentials_path: str = None, token_path: str = None):
        """
        Initialize Google Drive service

        Args:
            db_path: Path to the garage database
            credentials_path: Path to Google OAuth2 credentials JSON file
            token_path: Path to store OAuth2 tokens
        """
        self.db_path = db_path
        self.credentials_path = credentials_path or 'config/google_credentials.json'
        self.token_path = token_path or 'config/google_token.pickle'
        self.config_path = 'config/google_drive_config.json'

        self.service = None
        self.csv_import_service = CSVImportService(db_path)
        self.logger = logging.getLogger(__name__)

        # Default folder mappings
        self.default_folder_mappings = {
            'customers': 'ELI_MOTORS_Customers',
            'vehicles': 'ELI_MOTORS_Vehicles',
            'jobs': 'ELI_MOTORS_Jobs',
            'invoices': 'ELI_MOTORS_Invoices',
            'documents': 'ELI_MOTORS_Documents',
            'receipts': 'ELI_MOTORS_Receipts',
            'parts': 'ELI_MOTORS_Parts',
            'suppliers': 'ELI_MOTORS_Suppliers',
            'expenses': 'ELI_MOTORS_Expenses'
        }

        # Initialize service if Google libraries are available
        if GOOGLE_AVAILABLE:
            self._initialize_service()

    def is_available(self) -> bool:
        """Check if Google Drive integration is available"""
        return GOOGLE_AVAILABLE and self.service is not None

    def _initialize_service(self):
        """Initialize Google Drive API service"""
        try:
            creds = None

            # Load existing token
            if os.path.exists(self.token_path):
                with open(self.token_path, 'rb') as token:
                    creds = pickle.load(token)

            # If there are no (valid) credentials available, let the user log in
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not os.path.exists(self.credentials_path):
                        self.logger.warning(
                            f"Google credentials file not found: {self.credentials_path}")
                        return False

                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, self.SCOPES)
                    creds = flow.run_local_server(port=0)

                # Save the credentials for the next run
                os.makedirs(os.path.dirname(self.token_path), exist_ok=True)
                with open(self.token_path, 'wb') as token:
                    pickle.dump(creds, token)

            self.service = build('drive', 'v3', credentials=creds)
            self.logger.info("Google Drive service initialized successfully")
            return True

        except Exception as e:
            self.logger.error(
                f"Failed to initialize Google Drive service: {e}")
            return False

    def get_connection_status(self) -> Dict:
        """Get Google Drive connection status"""
        if not GOOGLE_AVAILABLE:
            return {
                'connected': False,
                'error': 'Google Drive dependencies not installed',
                'last_sync': None
            }

        if not self.service:
            return {
                'connected': False,
                'error': 'Google Drive service not initialized',
                'last_sync': None
            }

        try:
            # Test connection by getting user info
            about = self.service.about().get(fields="user").execute()
            config = self.load_config()

            return {
                'connected': True,
                'user_email': about.get('user', {}).get('emailAddress'),
                'last_sync': config.get('last_sync'),
                'folder_mappings': config.get('folder_mappings', {}),
                'auto_sync_enabled': config.get('auto_sync_enabled', False)
            }

        except Exception as e:
            return {
                'connected': False,
                'error': str(e),
                'last_sync': None
            }

    def load_config(self) -> Dict:
        """Load Google Drive configuration"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")

        return {
            'folder_mappings': {},
            'auto_sync_enabled': False,
            'sync_interval_minutes': 30,
            'last_sync': None
        }

    def save_config(self, config: Dict):
        """Save Google Drive configuration"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save config: {e}")

    def search_folders(self, query: str = None) -> List[Dict]:
        """Search for folders in Google Drive"""
        if not self.service:
            return []

        try:
            search_query = "mimeType='application/vnd.google-apps.folder'"
            if query:
                search_query += f" and name contains '{query}'"

            results = self.service.files().list(
                q=search_query,
                fields="files(id, name, parents, modifiedTime)"
            ).execute()

            folders = results.get('files', [])

            # Get folder paths
            for folder in folders:
                folder['path'] = self._get_folder_path(folder['id'])

            return folders

        except Exception as e:
            self.logger.error(f"Failed to search folders: {e}")
            return []

    def _get_folder_path(self, folder_id: str) -> str:
        """Get the full path of a folder"""
        try:
            path_parts = []
            current_id = folder_id

            while current_id:
                folder = self.service.files().get(
                    fileId=current_id,
                    fields="name, parents"
                ).execute()

                path_parts.insert(0, folder['name'])

                parents = folder.get('parents', [])
                current_id = parents[0] if parents else None

                # Stop at root or if we've gone too deep
                if not current_id or len(path_parts) > 10:
                    break

            return ' / '.join(path_parts)

        except Exception as e:
            self.logger.error(f"Failed to get folder path: {e}")
            return "Unknown Path"

    def configure_folder_mapping(self, data_type: str, folder_id: str, folder_name: str = None):
        """Configure folder mapping for a data type"""
        config = self.load_config()

        if 'folder_mappings' not in config:
            config['folder_mappings'] = {}

        config['folder_mappings'][data_type] = {
            'folder_id': folder_id,
            'folder_name': folder_name or f"Folder_{folder_id}",
            'last_modified': None
        }

        self.save_config(config)
        self.logger.info(
            f"Configured {data_type} to sync with folder: {folder_name}")

    def browse_folders(self, folder_id: str = 'root') -> List[Dict]:
        """Browse folders in Google Drive"""
        if not self.service:
            return []

        try:
            # Search for folders only
            if folder_id == 'root':
                query = "mimeType='application/vnd.google-apps.folder' and 'root' in parents"
            else:
                query = f"mimeType='application/vnd.google-apps.folder' and '{folder_id}' in parents"

            results = self.service.files().list(
                q=query,
                fields="files(id, name, parents, modifiedTime)",
                orderBy="name"
            ).execute()

            folders = results.get('files', [])

            # Add path information for each folder
            for folder in folders:
                folder['path'] = self._get_folder_path(folder['id'])

            return folders

        except Exception as e:
            self.logger.error(f"Failed to browse folders: {e}")
            return []

    def get_folder_files(self, folder_id: str) -> List[Dict]:
        """Get CSV/Excel files from a specific folder"""
        if not self.service:
            return []

        try:
            # Search for CSV and Excel files in the folder
            query = f"'{folder_id}' in parents and (name contains '.csv' or name contains '.xlsx' or name contains '.xls')"

            results = self.service.files().list(
                q=query,
                fields="files(id, name, modifiedTime, size, mimeType)",
                orderBy="modifiedTime desc"
            ).execute()

            return results.get('files', [])

        except Exception as e:
            self.logger.error(f"Failed to get folder files: {e}")
            return []

    def analyze_folder_contents(self, folder_id: str) -> Dict:
        """Analyze folder contents and categorize CSV files by name patterns"""
        if not self.service:
            return {'categorization': {}, 'all_files': []}

        try:
            # Get all CSV/Excel files from the folder
            files = self.get_folder_files(folder_id)

            if not files:
                return {'categorization': {}, 'all_files': []}

            # Define categorization patterns
            patterns = {
                'customers': [
                    'customer', 'client', 'contact', 'account', 'eli_motors_customers'
                ],
                'vehicles': [
                    'vehicle', 'car', 'auto', 'registration', 'eli_motors_vehicles'
                ],
                'jobs': [
                    'job', 'work', 'order', 'service', 'repair', 'eli_motors_jobs'
                ],
                'invoices': [
                    'invoice', 'bill', 'eli_motors_invoices'
                ],
                'documents': [
                    'document', 'doc', 'eli_motors_documents'
                ],
                'receipts': [
                    'receipt', 'payment', 'transaction', 'eli_motors_receipts'
                ],
                'parts': [
                    'part', 'stock', 'inventory', 'component', 'eli_motors_parts'
                ],
                'suppliers': [
                    'supplier', 'vendor', 'eli_motors_suppliers'
                ],
                'expenses': [
                    'expense', 'cost', 'eli_motors_expenses'
                ]
            }

            # Categorize files
            categorization = {}

            for file in files:
                file_name_lower = file['name'].lower()
                categorized = False

                # Check each category pattern
                for category, keywords in patterns.items():
                    for keyword in keywords:
                        if keyword in file_name_lower:
                            if category not in categorization:
                                categorization[category] = []
                            categorization[category].append(file)
                            categorized = True
                            break
                    if categorized:
                        break

                # If not categorized, add to unknown
                if not categorized:
                    if 'unknown' not in categorization:
                        categorization['unknown'] = []
                    categorization['unknown'].append(file)

            self.logger.info(
                f"Analyzed {len(files)} files, found {len(categorization)} categories")
            self.logger.debug(f"Categorization result: {categorization}")

            return {
                'categorization': categorization,
                'all_files': files
            }

        except Exception as e:
            self.logger.error(f"Failed to analyze folder contents: {e}")
            return {'categorization': {}, 'all_files': []}

    def download_file(self, file_id: str, file_name: str) -> Optional[str]:
        """Download a file from Google Drive to temporary location"""
        if not self.service:
            return None

        try:
            # Get file metadata
            file_metadata = self.service.files().get(fileId=file_id).execute()

            # Create temporary file
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, f"gdrive_{file_name}")

            # Download file
            request = self.service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)

            done = False
            while done is False:
                status, done = downloader.next_chunk()

            # Save to temporary file
            with open(temp_path, 'wb') as f:
                f.write(fh.getvalue())

            self.logger.info(f"Downloaded file: {file_name} to {temp_path}")
            return temp_path

        except Exception as e:
            self.logger.error(f"Failed to download file {file_name}: {e}")
            return None

    def sync_folder(self, data_type: str, force: bool = False) -> Dict:
        """Sync a specific data type folder"""
        config = self.load_config()
        folder_mappings = config.get('folder_mappings', {})

        if data_type not in folder_mappings:
            return {
                'success': False,
                'error': f'No folder mapping configured for {data_type}'
            }

        folder_info = folder_mappings[data_type]
        folder_id = folder_info['folder_id']

        try:
            # Get files from folder
            files = self.get_folder_files(folder_id)

            if not files:
                return {
                    'success': True,
                    'message': f'No files found in {data_type} folder',
                    'files_processed': 0
                }

            # For smart mapping (all files in one folder), find the file that matches this data type
            target_file = None

            # Analyze folder contents to find the right file for this data type
            analysis = self.analyze_folder_contents(folder_id)
            categorization = analysis.get('categorization', {})

            if data_type in categorization and categorization[data_type]:
                # Use the most recent file for this data type
                # Files are already sorted by modifiedTime desc
                target_file = categorization[data_type][0]
            else:
                # Fallback: use the most recent file if no specific categorization
                target_file = files[0]

            if not target_file:
                return {
                    'success': True,
                    'message': f'No {data_type} files found in folder',
                    'files_processed': 0
                }

            # Check if we need to sync
            last_modified = folder_info.get('last_modified')
            if not force and last_modified and target_file['modifiedTime'] <= last_modified:
                return {
                    'success': True,
                    'message': f'No updates needed for {data_type}',
                    'files_processed': 0
                }

            # Download and process the file
            temp_path = self.download_file(
                target_file['id'], target_file['name'])
            if not temp_path:
                return {
                    'success': False,
                    'error': f'Failed to download {target_file["name"]}'
                }

            # Import the CSV
            import_options = {
                'clear_existing': False,
                'update_duplicates': True
            }

            result = self.csv_import_service.import_csv_file(
                temp_path, data_type, import_options)

            # Clean up temporary file
            try:
                os.remove(temp_path)
            except:
                pass

            # Update last modified time
            if result.get('success'):
                folder_info['last_modified'] = target_file['modifiedTime']
                config['folder_mappings'][data_type] = folder_info
                config['last_sync'] = datetime.now().isoformat()
                self.save_config(config)

            # Add sync info to result
            result['file_name'] = target_file['name']
            result['file_modified'] = target_file['modifiedTime']
            result['data_type'] = data_type

            return result

        except Exception as e:
            self.logger.error(f"Failed to sync {data_type} folder: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def sync_all_folders(self, force: bool = False) -> Dict:
        """Sync all configured folders"""
        config = self.load_config()
        folder_mappings = config.get('folder_mappings', {})

        if not folder_mappings:
            return {
                'success': False,
                'error': 'No folder mappings configured'
            }

        results = {}
        total_imported = 0
        total_failed = 0

        for data_type in folder_mappings.keys():
            self.logger.info(f"Syncing {data_type}...")
            result = self.sync_folder(data_type, force)
            results[data_type] = result

            if result.get('success'):
                total_imported += result.get('imported', 0)
            else:
                total_failed += 1

        return {
            'success': total_failed == 0,
            'results': results,
            'total_imported': total_imported,
            'total_failed': total_failed,
            'sync_time': datetime.now().isoformat()
        }

    def setup_auto_sync(self, enabled: bool, interval_minutes: int = 30):
        """Configure automatic synchronization"""
        config = self.load_config()
        config['auto_sync_enabled'] = enabled
        config['sync_interval_minutes'] = interval_minutes
        self.save_config(config)

        self.logger.info(
            f"Auto-sync {'enabled' if enabled else 'disabled'} with {interval_minutes} minute interval")

    def get_sync_history(self, limit: int = 10) -> List[Dict]:
        """Get recent sync history"""
        # This would typically be stored in a database
        # For now, return basic info from config
        config = self.load_config()

        history = []
        if config.get('last_sync'):
            history.append({
                'timestamp': config['last_sync'],
                'type': 'manual_sync',
                'status': 'completed',
                'folders_synced': len(config.get('folder_mappings', {}))
            })

        return history

    def get_auth_url(self) -> Optional[str]:
        """Get authorization URL for OAuth flow"""
        if not GOOGLE_AVAILABLE:
            return None

        try:
            # Check if credentials file exists
            if not os.path.exists(self.credentials_path):
                return None

            # Check if we already have valid credentials
            creds = None
            if os.path.exists(self.token_path):
                with open(self.token_path, 'rb') as token:
                    creds = pickle.load(token)

            if creds and creds.valid:
                # Already authenticated
                return None

            # Need to authenticate
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_path, self.SCOPES)

            # Use local server for OAuth flow
            creds = flow.run_local_server(port=0, open_browser=True)

            # Save the credentials for the next run
            os.makedirs(os.path.dirname(self.token_path), exist_ok=True)
            with open(self.token_path, 'wb') as token:
                pickle.dump(creds, token)

            # Initialize service with new credentials
            self.service = build('drive', 'v3', credentials=creds)

            return None  # Authentication completed

        except Exception as e:
            self.logger.error(f"Failed to get auth URL: {e}")
            return None

    def test_connection(self) -> Dict:
        """Test Google Drive connection"""
        if not GOOGLE_AVAILABLE:
            return {
                'success': False,
                'error': 'Google Drive dependencies not installed'
            }

        if not self.service:
            return {
                'success': False,
                'error': 'Google Drive service not initialized'
            }

        try:
            # Test by getting user info
            about = self.service.about().get(fields="user,storageQuota").execute()
            user = about.get('user', {})
            storage = about.get('storageQuota', {})

            return {
                'success': True,
                'user_email': user.get('emailAddress'),
                'display_name': user.get('displayName'),
                'storage_used': storage.get('usage'),
                'storage_limit': storage.get('limit')
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
