"""
Main routes for serving the frontend application.
"""
from flask import Blueprint, send_from_directory, current_app
import os

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Serve the main application page."""
    return send_from_directory(current_app.static_folder, 'index.html')


@main_bp.route('/<path:filename>')
def static_files(filename):
    """Serve static files."""
    return send_from_directory(current_app.static_folder, filename)


@main_bp.route('/health')
def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'service': 'garage-management-system',
        'version': '1.0.0'
    }
