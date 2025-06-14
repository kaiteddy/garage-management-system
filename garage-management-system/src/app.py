"""
Application factory for the Garage Management System.
"""
import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

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

    # Initialize logging
    setup_logging(app)

    # Initialize extensions
    initialize_extensions(app)

    # Initialize security
    initialize_security(app)

    # Register blueprints
    register_blueprints(app)

    # Initialize database
    initialize_database_tables(app)

    return app


def setup_logging(app):
    """Setup application logging."""
    if not app.debug and not app.testing:
        # Setup file logging
        if not os.path.exists('logs'):
            os.mkdir('logs')

        file_handler = logging.FileHandler('logs/garage_management.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

        # Setup security logging
        security_handler = logging.FileHandler('logs/security.log')
        security_handler.setFormatter(logging.Formatter(
            '%(asctime)s SECURITY %(levelname)s: %(message)s'
        ))
        security_handler.setLevel(logging.WARNING)

        security_logger = logging.getLogger('security')
        security_logger.addHandler(security_handler)
        security_logger.setLevel(logging.WARNING)

        app.logger.setLevel(logging.INFO)
        app.logger.info('Garage Management System startup')


def initialize_extensions(app):
    """Initialize Flask extensions."""
    # Database
    db.init_app(app)

    # CORS with security-conscious settings
    CORS(app,
         origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
         allow_headers=app.config.get('CORS_ALLOW_HEADERS', ['Content-Type', 'Authorization']),
         methods=app.config.get('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
         supports_credentials=True)

    # Rate Limiting
    limiter = Limiter(
        app,
        key_func=get_remote_address,
        default_limits=[app.config.get('RATELIMIT_DEFAULT', '100 per hour')],
        storage_uri=app.config.get('RATELIMIT_STORAGE_URL', 'memory://')
    )

    # Login Manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

    @login_manager.user_loader
    def load_user(user_id):
        from auth.models import User
        return User.query.get(int(user_id))


def initialize_security(app):
    """Initialize security components."""
    # Security Headers (Talisman)
    if app.config.get('FORCE_HTTPS', False):
        Talisman(app,
                force_https=True,
                strict_transport_security=True,
                content_security_policy=app.config.get('CONTENT_SECURITY_POLICY'))

    # Security Middleware
    from security.middleware import SecurityMiddleware
    security_middleware = SecurityMiddleware(app)

    # Encryption Service
    from security.encryption import encryption_service
    encryption_service.init_app(app)

    # Authentication Manager
    from auth.auth_manager import AuthManager
    auth_manager = AuthManager(app)

    # Audit Logger
    from auth.audit import audit_logger
    audit_logger.init_app(app)

    # GDPR Compliance
    from gdpr.compliance import GDPRCompliance
    gdpr_compliance = GDPRCompliance(app)

    # Security Monitoring
    from security.monitoring import security_monitor
    security_monitor.init_app(app)

    # Backup Service
    from security.backup import backup_service
    backup_service.init_app(app)


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

    # Register authentication routes
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    # Register GDPR routes
    from routes.gdpr import gdpr_bp
    app.register_blueprint(gdpr_bp, url_prefix='/gdpr')

    # Register admin routes
    from routes.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')


def initialize_database_tables(app):
    """Initialize database tables and default data."""
    with app.app_context():
        # Create all tables
        db.create_all()

        # Initialize database with sample data if needed
        from services.database_service import initialize_database
        initialize_database()

        # Create default security data
        create_default_security_data()


def create_default_security_data():
    """Create default security data (roles, permissions, etc.)."""
    try:
        from auth.models import Role, Permission
        from gdpr.models import DataProcessingRecord, DataRetentionPolicy
        import json

        # Create default data processing records for GDPR compliance
        default_processing_activities = [
            {
                'activity_name': 'Customer Management',
                'purpose': 'Managing customer relationships and service history',
                'legal_basis': 'Contract',
                'data_categories': ['Personal identifiers', 'Contact details', 'Vehicle information'],
                'data_subjects': ['Customers'],
                'recipients': ['Internal staff'],
                'retention_period': '7 years after last service',
                'security_measures': ['Encryption at rest', 'Access controls', 'Audit logging']
            },
            {
                'activity_name': 'Vehicle Service Records',
                'purpose': 'Maintaining vehicle service history and MOT records',
                'legal_basis': 'Contract',
                'data_categories': ['Vehicle registration', 'Service history', 'MOT data'],
                'data_subjects': ['Vehicle owners'],
                'recipients': ['Internal staff', 'DVLA (for MOT data)'],
                'retention_period': '10 years for MOT records',
                'security_measures': ['Encryption at rest', 'Access controls', 'Regular backups']
            }
        ]

        for activity in default_processing_activities:
            existing = DataProcessingRecord.query.filter_by(
                activity_name=activity['activity_name']
            ).first()

            if not existing:
                record = DataProcessingRecord(
                    activity_name=activity['activity_name'],
                    purpose=activity['purpose'],
                    legal_basis=activity['legal_basis'],
                    data_categories=json.dumps(activity['data_categories']),
                    data_subjects=json.dumps(activity['data_subjects']),
                    recipients=json.dumps(activity['recipients']),
                    retention_period=activity['retention_period'],
                    security_measures=json.dumps(activity['security_measures']),
                    controller_name=app.config.get('COMPANY_NAME', 'Garage Management System'),
                    controller_contact=app.config.get('COMPANY_EMAIL', 'info@garagemanagement.com'),
                    dpo_contact=app.config.get('DPO_EMAIL', 'dpo@garagemanagement.com')
                )
                db.session.add(record)

        # Create default data retention policies
        default_retention_policies = [
            {
                'name': 'Customer Data Retention',
                'description': 'Retention policy for customer personal data',
                'data_category': 'customer_data',
                'retention_period_days': 2555,  # 7 years
                'trigger_event': 'last_service',
                'action_on_expiry': 'anonymize'
            },
            {
                'name': 'Audit Log Retention',
                'description': 'Retention policy for audit logs',
                'data_category': 'audit_logs',
                'retention_period_days': 2555,  # 7 years
                'trigger_event': 'log_creation',
                'action_on_expiry': 'delete'
            },
            {
                'name': 'Session Data Retention',
                'description': 'Retention policy for user sessions',
                'data_category': 'session_data',
                'retention_period_days': 30,
                'trigger_event': 'session_end',
                'action_on_expiry': 'delete'
            }
        ]

        for policy in default_retention_policies:
            existing = DataRetentionPolicy.query.filter_by(
                name=policy['name']
            ).first()

            if not existing:
                retention_policy = DataRetentionPolicy(
                    name=policy['name'],
                    description=policy['description'],
                    data_category=policy['data_category'],
                    retention_period_days=policy['retention_period_days'],
                    trigger_event=policy['trigger_event'],
                    action_on_expiry=policy['action_on_expiry']
                )
                db.session.add(retention_policy)

        db.session.commit()

    except Exception as e:
        app.logger.error(f"Failed to create default security data: {str(e)}")
        db.session.rollback()
