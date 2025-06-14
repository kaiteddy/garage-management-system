"""
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
