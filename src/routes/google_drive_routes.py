"""
Google Drive Integration Routes for Garage Management System
"""

import logging
import os

from flask import (Blueprint, flash, jsonify, redirect, render_template,
                   request, url_for)

from services.google_drive_service import GoogleDriveService

google_drive_bp = Blueprint('google_drive', __name__)

# Initialize logger
logger = logging.getLogger(__name__)


def get_google_drive_service():
    """Get Google Drive service instance"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(
        os.path.dirname(__file__))), 'instance', 'garage.db')
    return GoogleDriveService(db_path)


@google_drive_bp.route('/')
def google_drive_page():
    """Display Google Drive integration page"""
    return render_template('google_drive.html')


@google_drive_bp.route('/status')
def get_status():
    """Get Google Drive connection status"""
    try:
        service = get_google_drive_service()
        status = service.get_connection_status()

        return jsonify({
            'success': True,
            'status': status
        })

    except Exception as e:
        logger.error(f"Failed to get Google Drive status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/test-connection')
def test_connection():
    """Test Google Drive connection"""
    try:
        service = get_google_drive_service()
        result = service.test_connection()

        return jsonify(result)

    except Exception as e:
        logger.error(f"Failed to test Google Drive connection: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/search-folders')
def search_folders():
    """Search for folders in Google Drive"""
    try:
        query = request.args.get('query', '')
        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        folders = service.search_folders(query)

        return jsonify({
            'success': True,
            'folders': folders
        })

    except Exception as e:
        logger.error(f"Failed to search folders: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/configure-mapping', methods=['POST'])
def configure_mapping():
    """Configure folder mapping for a data type"""
    try:
        data = request.get_json()
        data_type = data.get('data_type')
        folder_id = data.get('folder_id')
        folder_name = data.get('folder_name')

        if not data_type or not folder_id:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters'
            }), 400

        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        service.configure_folder_mapping(data_type, folder_id, folder_name)

        return jsonify({
            'success': True,
            'message': f'Configured {data_type} mapping to {folder_name}'
        })

    except Exception as e:
        logger.error(f"Failed to configure mapping: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/browse-folders/<folder_id>')
def browse_folders(folder_id):
    """Browse folders in Google Drive"""
    try:
        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        folders = service.browse_folders(folder_id)

        return jsonify({
            'success': True,
            'folders': folders
        })

    except Exception as e:
        logger.error(f"Failed to browse folders: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/folder-files/<folder_id>')
def get_folder_files(folder_id):
    """Get files from a specific folder"""
    try:
        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        files = service.get_folder_files(folder_id)

        return jsonify({
            'success': True,
            'files': files
        })

    except Exception as e:
        logger.error(f"Failed to get folder files: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/sync/<data_type>', methods=['POST'])
def sync_folder(data_type):
    """Sync a specific data type folder"""
    try:
        force = request.json.get('force', False) if request.is_json else False

        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        result = service.sync_folder(data_type, force)

        return jsonify(result)

    except Exception as e:
        logger.error(f"Failed to sync {data_type}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/sync-all', methods=['POST'])
def sync_all_folders():
    """Sync all configured folders"""
    try:
        force = request.json.get('force', False) if request.is_json else False

        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        result = service.sync_all_folders(force)

        return jsonify(result)

    except Exception as e:
        logger.error(f"Failed to sync all folders: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/auto-sync', methods=['POST'])
def configure_auto_sync():
    """Configure automatic synchronization"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', False)
        interval_minutes = data.get('interval_minutes', 30)

        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        service.setup_auto_sync(enabled, interval_minutes)

        return jsonify({
            'success': True,
            'message': f'Auto-sync {"enabled" if enabled else "disabled"}'
        })

    except Exception as e:
        logger.error(f"Failed to configure auto-sync: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/sync-history')
def get_sync_history():
    """Get sync history"""
    try:
        limit = request.args.get('limit', 10, type=int)

        service = get_google_drive_service()
        history = service.get_sync_history(limit)

        return jsonify({
            'success': True,
            'history': history
        })

    except Exception as e:
        logger.error(f"Failed to get sync history: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/config')
def get_config():
    """Get current Google Drive configuration"""
    try:
        service = get_google_drive_service()
        config = service.load_config()

        return jsonify({
            'success': True,
            'config': config
        })

    except Exception as e:
        logger.error(f"Failed to get config: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/upload-credentials', methods=['POST'])
def upload_credentials():
    """Upload Google Cloud credentials file"""
    try:
        if 'credentials' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No credentials file provided'
            }), 400

        file = request.files['credentials']

        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        if not file.filename.endswith('.json'):
            return jsonify({
                'success': False,
                'error': 'File must be a JSON file'
            }), 400

        # Save the credentials file
        config_dir = os.path.join(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__))), 'config')
        os.makedirs(config_dir, exist_ok=True)

        credentials_path = os.path.join(config_dir, 'google_credentials.json')
        file.save(credentials_path)

        # Validate the credentials file
        import json
        try:
            with open(credentials_path, 'r') as f:
                creds = json.load(f)

            if 'installed' not in creds:
                os.remove(credentials_path)
                return jsonify({
                    'success': False,
                    'error': 'Invalid credentials file format'
                }), 400

        except json.JSONDecodeError:
            os.remove(credentials_path)
            return jsonify({
                'success': False,
                'error': 'Invalid JSON file'
            }), 400

        return jsonify({
            'success': True,
            'message': 'Credentials uploaded successfully'
        })

    except Exception as e:
        logger.error(f"Failed to upload credentials: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/connect', methods=['POST'])
def connect_to_drive():
    """Initiate Google Drive connection"""
    try:
        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available. Please upload credentials first.'
            }), 503

        # Try to initialize the service and get auth URL if needed
        auth_url = service.get_auth_url()

        if auth_url:
            return jsonify({
                'success': True,
                'auth_url': auth_url,
                'message': 'Please complete authentication in the opened window'
            })
        else:
            # Already authenticated
            return jsonify({
                'success': True,
                'message': 'Already connected to Google Drive'
            })

    except Exception as e:
        logger.error(f"Failed to connect to Google Drive: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/auth-status')
def check_auth_status():
    """Check authentication status"""
    try:
        service = get_google_drive_service()
        status = service.get_connection_status()

        return jsonify({
            'success': True,
            'authenticated': status.get('connected', False)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/disconnect', methods=['POST'])
def disconnect_from_drive():
    """Disconnect from Google Drive"""
    try:
        service = get_google_drive_service()

        # Remove token file
        token_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), 'config', 'google_token.pickle')
        if os.path.exists(token_path):
            os.remove(token_path)

        return jsonify({
            'success': True,
            'message': 'Disconnected from Google Drive'
        })

    except Exception as e:
        logger.error(f"Failed to disconnect: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/analyze-folder/<folder_id>')
def analyze_folder(folder_id):
    """Analyze folder contents and categorize CSV files"""
    try:
        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        result = service.analyze_folder_contents(folder_id)

        return jsonify({
            'success': True,
            'categorization': result['categorization'],
            'files': result['all_files']
        })

    except Exception as e:
        logger.error(f"Failed to analyze folder: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/setup-smart-mapping', methods=['POST'])
def setup_smart_mapping():
    """Setup smart folder mapping based on file analysis"""
    try:
        data = request.get_json()
        folder_id = data.get('folder_id')
        folder_name = data.get('folder_name')
        categorization = data.get('categorization', {})

        if not folder_id or not categorization:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters'
            }), 400

        service = get_google_drive_service()

        if not service.is_available():
            return jsonify({
                'success': False,
                'error': 'Google Drive service not available'
            }), 503

        # Setup mappings for each detected category
        mappings_created = 0
        for data_type in categorization.keys():
            if data_type != 'unknown':  # Skip unknown files
                service.configure_folder_mapping(
                    data_type, folder_id, folder_name)
                mappings_created += 1

        return jsonify({
            'success': True,
            'message': f'Smart setup complete! Configured {mappings_created} data type mappings.',
            'mappings_created': mappings_created
        })

    except Exception as e:
        logger.error(f"Failed to setup smart mapping: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@google_drive_bp.route('/reset-config', methods=['POST'])
def reset_config():
    """Reset Google Drive configuration"""
    try:
        service = get_google_drive_service()

        # Reset to default config
        default_config = {
            'folder_mappings': {},
            'auto_sync_enabled': False,
            'sync_interval_minutes': 30,
            'last_sync': None
        }

        service.save_config(default_config)

        return jsonify({
            'success': True,
            'message': 'Configuration reset successfully'
        })

    except Exception as e:
        logger.error(f"Failed to reset config: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
