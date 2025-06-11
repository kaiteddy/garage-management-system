"""
Application factory for the Garage Management System.
"""
import os
from flask import Flask
from flask_cors import CORS

from models import db
from config import get_config


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__, static_folder='static', static_url_path='')
    
    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins="*")
    
    # Register blueprints
    register_blueprints(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
        # Initialize database with sample data if needed
        from services.database_service import initialize_database
        initialize_database()
    
    return app


def register_blueprints(app):
    """Register all application blueprints."""
    from routes.main import main_bp
    from routes.api.customers import customers_api
    from routes.api.vehicles import vehicles_api
    from routes.api.jobs import jobs_api
    from routes.api.estimates import estimates_api
    from routes.api.invoices import invoices_api
    from routes.api.dashboard import dashboard_api
    
    # Register main routes
    app.register_blueprint(main_bp)
    
    # Register API routes
    app.register_blueprint(customers_api, url_prefix='/api')
    app.register_blueprint(vehicles_api, url_prefix='/api')
    app.register_blueprint(jobs_api, url_prefix='/api')
    app.register_blueprint(estimates_api, url_prefix='/api')
    app.register_blueprint(invoices_api, url_prefix='/api')
    app.register_blueprint(dashboard_api, url_prefix='/api')
