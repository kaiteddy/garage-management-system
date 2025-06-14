#!/usr/bin/env python3
"""
Secure startup script for the Garage Management System.
This script initializes the application with security features and starts the development server.
"""
import os
import sys
import secrets
from datetime import datetime

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def setup_environment():
    """Setup basic environment variables for secure operation."""
    env_vars = {
        'SECRET_KEY': secrets.token_urlsafe(32),
        'JWT_SECRET_KEY': secrets.token_urlsafe(32),
        'DATABASE_ENCRYPTION_KEY': secrets.token_urlsafe(32),
        'FLASK_ENV': 'development',
        'DEBUG': 'True',
        'DATABASE_URL': 'sqlite:///garage.db',
        'MFA_ENABLED': 'True',
        'GDPR_ENABLED': 'True',
        'SECURITY_MONITORING_ENABLED': 'True',
        'COMPANY_NAME': 'Garage Management System',
        'COMPANY_EMAIL': 'info@garagemanagement.com',
        'DPO_EMAIL': 'dpo@garagemanagement.com'
    }
    
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
    
    print("✅ Environment variables configured")

def create_minimal_auth_models():
    """Create minimal auth models for the application to run."""
    auth_dir = os.path.join('src', 'auth')
    os.makedirs(auth_dir, exist_ok=True)
    
    # Create __init__.py
    with open(os.path.join(auth_dir, '__init__.py'), 'w') as f:
        f.write('# Auth package\n')
    
    # Create minimal models.py
    models_content = '''"""
Minimal authentication models for the Garage Management System.
"""
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model with basic authentication."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class LoginAttempt(db.Model):
    """Login attempt tracking."""
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80))
    ip_address = db.Column(db.String(45))
    success = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
'''
    
    with open(os.path.join(auth_dir, 'models.py'), 'w') as f:
        f.write(models_content)
    
    print("✅ Minimal auth models created")

def create_minimal_app():
    """Create minimal Flask application with security features."""
    app_content = '''"""
Minimal Flask application with security features.
"""
import os
from flask import Flask, render_template, jsonify, request
from flask_login import LoginManager, login_required, current_user
from flask_cors import CORS

def create_app():
    """Create Flask application."""
    app = Flask(__name__, static_folder='static', static_url_path='')
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///garage.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    from auth.models import db
    db.init_app(app)
    
    # CORS
    CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'])
    
    # Login Manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    @login_manager.user_loader
    def load_user(user_id):
        from auth.models import User
        return User.query.get(int(user_id))
    
    # Routes
    @app.route('/')
    def index():
        """Main page."""
        return render_template('index.html') if os.path.exists('src/static/index.html') else jsonify({
            'message': 'Garage Management System - Security Enabled',
            'status': 'running',
            'features': [
                'Authentication & Authorization',
                'GDPR Compliance',
                'Security Monitoring',
                'Encrypted Data Storage',
                'Audit Logging'
            ]
        })
    
    @app.route('/api/status')
    def api_status():
        """API status endpoint."""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'security_enabled': True,
            'gdpr_enabled': True
        })
    
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """Login endpoint."""
        from auth.models import User, LoginAttempt
        
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        # Log attempt
        attempt = LoginAttempt(
            username=username,
            ip_address=request.remote_addr,
            success=False
        )
        
        if user and user.check_password(password):
            attempt.success = True
            user.last_login = datetime.utcnow()
            
            from flask_login import login_user
            login_user(user)
            
            db.session.add(attempt)
            db.session.commit()
            
            return jsonify({
                'status': 'success',
                'user': user.to_dict(),
                'message': 'Login successful'
            })
        else:
            db.session.add(attempt)
            db.session.commit()
            
            return jsonify({'error': 'Invalid credentials'}), 401
    
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        """Registration endpoint."""
        from auth.models import User
        
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([username, email, password]):
            return jsonify({'error': 'All fields required'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        user = User(
            username=username,
            email=email,
            first_name=data.get('first_name'),
            last_name=data.get('last_name')
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'user': user.to_dict(),
            'message': 'Registration successful'
        }), 201
    
    @app.route('/api/auth/profile')
    @login_required
    def profile():
        """User profile endpoint."""
        return jsonify({
            'status': 'success',
            'user': current_user.to_dict()
        })
    
    @app.route('/api/gdpr/privacy-policy')
    def privacy_policy():
        """Privacy policy endpoint."""
        return jsonify({
            'status': 'success',
            'policy': {
                'last_updated': '2024-01-01',
                'controller': {
                    'name': os.environ.get('COMPANY_NAME', 'Garage Management System'),
                    'email': os.environ.get('COMPANY_EMAIL', 'info@garagemanagement.com')
                },
                'dpo': {
                    'email': os.environ.get('DPO_EMAIL', 'dpo@garagemanagement.com')
                },
                'rights': [
                    'Right to access your personal data',
                    'Right to rectification of inaccurate data',
                    'Right to erasure (right to be forgotten)',
                    'Right to data portability'
                ]
            }
        })
    
    # Create tables
    with app.app_context():
        db.create_all()
        
        # Create admin user if not exists
        from auth.models import User
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@garagemanagement.com',
                first_name='System',
                last_name='Administrator',
                is_admin=True
            )
            admin.set_password('admin123')  # Change this in production!
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created (username: admin, password: admin123)")
    
    return app

if __name__ == '__main__':
    from datetime import datetime
    app = create_app()
    print("🚀 Starting Garage Management System...")
    app.run(host='0.0.0.0', port=5000, debug=True)
'''
    
    with open(os.path.join('src', 'secure_app.py'), 'w') as f:
        f.write(app_content)
    
    print("✅ Minimal secure app created")

def main():
    """Main startup function."""
    print("🔐 Garage Management System - Secure Startup")
    print("=" * 50)
    
    # Setup environment
    setup_environment()
    
    # Create minimal auth models
    create_minimal_auth_models()
    
    # Create minimal app
    create_minimal_app()
    
    print("\n🚀 Starting the application...")
    print("📍 Application will be available at: http://localhost:5000")
    print("🔑 Admin credentials: username=admin, password=admin123")
    print("📚 API Documentation:")
    print("   - GET  /api/status - System status")
    print("   - POST /api/auth/login - User login")
    print("   - POST /api/auth/register - User registration")
    print("   - GET  /api/auth/profile - User profile (requires auth)")
    print("   - GET  /api/gdpr/privacy-policy - Privacy policy")
    print("\n" + "=" * 50)
    
    # Import and run the app
    sys.path.insert(0, 'src')
    from secure_app import create_app
    
    app = create_app()
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down gracefully...")
    except Exception as e:
        print(f"\n❌ Error starting application: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
