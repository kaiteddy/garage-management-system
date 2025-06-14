"""
Security tests for the Garage Management System.
"""
import pytest
import json
from datetime import datetime, timedelta
from flask import url_for
from auth.models import User, Role, Permission, LoginAttempt
from auth.utils import generate_password_hash, verify_password
from gdpr.models import ConsentRecord, DataSubjectRequest
from security.encryption import encryption_service


class TestAuthentication:
    """Test authentication functionality."""
    
    def test_user_registration(self, client, app):
        """Test user registration."""
        with app.app_context():
            response = client.post('/auth/register', json={
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'SecurePass123!',
                'first_name': 'Test',
                'last_name': 'User',
                'gdpr_consent': True
            })
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'user' in data
    
    def test_user_login(self, client, app, test_user):
        """Test user login."""
        with app.app_context():
            response = client.post('/auth/login', json={
                'username': test_user.username,
                'password': 'testpassword'
            })
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'jwt_token' in data
    
    def test_invalid_login(self, client, app, test_user):
        """Test login with invalid credentials."""
        with app.app_context():
            response = client.post('/auth/login', json={
                'username': test_user.username,
                'password': 'wrongpassword'
            })
            
            assert response.status_code == 401
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert data['error_code'] == 'INVALID_CREDENTIALS'
    
    def test_password_strength_validation(self, client, app):
        """Test password strength validation."""
        with app.app_context():
            # Test weak password
            response = client.post('/auth/register', json={
                'username': 'testuser2',
                'email': 'test2@example.com',
                'password': '123',  # Weak password
                'gdpr_consent': True
            })
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['error_code'] == 'WEAK_PASSWORD'
    
    def test_account_lockout(self, client, app, test_user):
        """Test account lockout after failed attempts."""
        with app.app_context():
            # Make multiple failed login attempts
            for _ in range(6):  # Exceed the limit
                client.post('/auth/login', json={
                    'username': test_user.username,
                    'password': 'wrongpassword'
                })
            
            # Check that account is locked
            response = client.post('/auth/login', json={
                'username': test_user.username,
                'password': 'testpassword'  # Correct password
            })
            
            assert response.status_code == 403
            data = json.loads(response.data)
            assert data['error_code'] == 'ACCOUNT_LOCKED'


class TestAuthorization:
    """Test authorization and RBAC functionality."""
    
    def test_role_based_access(self, client, app, test_user, admin_user):
        """Test role-based access control."""
        with app.app_context():
            # Login as regular user
            response = client.post('/auth/login', json={
                'username': test_user.username,
                'password': 'testpassword'
            })
            user_token = json.loads(response.data)['jwt_token']
            
            # Try to access admin endpoint
            response = client.get('/gdpr/admin/data-requests', 
                                headers={'Authorization': f'Bearer {user_token}'})
            assert response.status_code == 403
            
            # Login as admin
            response = client.post('/auth/login', json={
                'username': admin_user.username,
                'password': 'adminpassword'
            })
            admin_token = json.loads(response.data)['jwt_token']
            
            # Access admin endpoint
            response = client.get('/gdpr/admin/data-requests',
                                headers={'Authorization': f'Bearer {admin_token}'})
            assert response.status_code == 200
    
    def test_api_key_authentication(self, client, app, test_user):
        """Test API key authentication."""
        with app.app_context():
            # Generate API key
            api_key = test_user.generate_api_key()
            
            # Use API key to access protected endpoint
            response = client.get('/auth/profile',
                                headers={'X-API-Key': api_key})
            assert response.status_code == 200
            
            # Test invalid API key
            response = client.get('/auth/profile',
                                headers={'X-API-Key': 'invalid-key'})
            assert response.status_code == 401


class TestDataProtection:
    """Test data protection and encryption."""
    
    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = 'TestPassword123!'
        hashed = generate_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password('wrongpassword', hashed)
    
    def test_data_encryption(self, app):
        """Test data encryption functionality."""
        with app.app_context():
            sensitive_data = "This is sensitive information"
            
            # Encrypt data
            encrypted = encryption_service.encrypt_string(sensitive_data)
            assert encrypted != sensitive_data
            
            # Decrypt data
            decrypted = encryption_service.decrypt_string(encrypted)
            assert decrypted == sensitive_data
    
    def test_secure_token_generation(self, app):
        """Test secure token generation."""
        with app.app_context():
            token1 = encryption_service.generate_secure_token()
            token2 = encryption_service.generate_secure_token()
            
            assert len(token1) > 0
            assert len(token2) > 0
            assert token1 != token2


class TestInputValidation:
    """Test input validation and sanitization."""
    
    def test_sql_injection_prevention(self, client, app):
        """Test SQL injection prevention."""
        with app.app_context():
            # Attempt SQL injection in login
            response = client.post('/auth/login', json={
                'username': "admin'; DROP TABLE users; --",
                'password': 'password'
            })
            
            # Should not cause server error
            assert response.status_code in [400, 401]
    
    def test_xss_prevention(self, client, app, authenticated_user):
        """Test XSS prevention."""
        with app.app_context():
            # Attempt XSS in profile update
            response = client.put('/auth/profile', 
                                json={
                                    'first_name': '<script>alert("xss")</script>',
                                    'last_name': 'User'
                                },
                                headers={'Authorization': f'Bearer {authenticated_user["token"]}'})
            
            # Should sanitize input
            assert response.status_code == 200
            data = json.loads(response.data)
            assert '<script>' not in data['user']['first_name']
    
    def test_file_upload_validation(self, client, app, authenticated_user):
        """Test file upload validation."""
        with app.app_context():
            # Test malicious file upload (if file upload endpoints exist)
            # This would be implemented based on actual file upload functionality
            pass


class TestGDPRCompliance:
    """Test GDPR compliance functionality."""
    
    def test_consent_recording(self, client, app, test_user):
        """Test consent recording."""
        with app.app_context():
            response = client.post('/gdpr/consent', json={
                'consent_type': 'data_processing',
                'purpose': 'Service provision',
                'granted': True,
                'email': test_user.email
            })
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
    
    def test_data_export(self, client, app, authenticated_user):
        """Test data export functionality."""
        with app.app_context():
            response = client.post('/gdpr/export-data',
                                 headers={'Authorization': f'Bearer {authenticated_user["token"]}'})
            
            assert response.status_code == 200
            assert response.mimetype == 'application/zip'
    
    def test_data_subject_request(self, client, app, authenticated_user):
        """Test data subject request submission."""
        with app.app_context():
            response = client.post('/gdpr/data-request',
                                 json={
                                     'request_type': 'access',
                                     'description': 'I want to access my personal data'
                                 },
                                 headers={'Authorization': f'Bearer {authenticated_user["token"]}'})
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'request_id' in data
    
    def test_consent_withdrawal(self, client, app, authenticated_user):
        """Test consent withdrawal."""
        with app.app_context():
            # First create a consent record
            consent = ConsentRecord(
                user_id=authenticated_user['user'].id,
                consent_type='marketing',
                purpose='Marketing communications',
                granted=True,
                granted_at=datetime.utcnow()
            )
            from models import db
            db.session.add(consent)
            db.session.commit()
            
            # Withdraw consent
            response = client.post('/gdpr/consent/withdraw',
                                 json={'consent_id': consent.id},
                                 headers={'Authorization': f'Bearer {authenticated_user["token"]}'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'


class TestSecurityHeaders:
    """Test security headers."""
    
    def test_security_headers_present(self, client, app):
        """Test that security headers are present."""
        with app.app_context():
            response = client.get('/')
            
            # Check for security headers
            assert 'X-Content-Type-Options' in response.headers
            assert 'X-Frame-Options' in response.headers
            assert 'X-XSS-Protection' in response.headers
            assert response.headers['X-Content-Type-Options'] == 'nosniff'
            assert response.headers['X-Frame-Options'] == 'DENY'
    
    def test_cors_configuration(self, client, app):
        """Test CORS configuration."""
        with app.app_context():
            response = client.options('/api/dashboard',
                                    headers={'Origin': 'http://localhost:3000'})
            
            # Should allow configured origins
            assert response.status_code == 200
            
            # Test unauthorized origin
            response = client.options('/api/dashboard',
                                    headers={'Origin': 'http://malicious-site.com'})
            
            # Should reject unauthorized origins
            assert 'Access-Control-Allow-Origin' not in response.headers or \
                   response.headers['Access-Control-Allow-Origin'] != 'http://malicious-site.com'


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_login_rate_limiting(self, client, app, test_user):
        """Test rate limiting on login attempts."""
        with app.app_context():
            # Make rapid login attempts
            responses = []
            for _ in range(10):
                response = client.post('/auth/login', json={
                    'username': test_user.username,
                    'password': 'wrongpassword'
                })
                responses.append(response.status_code)
            
            # Should eventually get rate limited
            assert 429 in responses
    
    def test_api_rate_limiting(self, client, app, authenticated_user):
        """Test API rate limiting."""
        with app.app_context():
            # Make rapid API requests
            responses = []
            for _ in range(150):  # Exceed typical rate limit
                response = client.get('/api/dashboard',
                                    headers={'Authorization': f'Bearer {authenticated_user["token"]}'})
                responses.append(response.status_code)
            
            # Should eventually get rate limited
            assert 429 in responses


class TestAuditLogging:
    """Test audit logging functionality."""
    
    def test_login_attempt_logging(self, client, app, test_user):
        """Test that login attempts are logged."""
        with app.app_context():
            # Make login attempt
            client.post('/auth/login', json={
                'username': test_user.username,
                'password': 'testpassword'
            })
            
            # Check that login attempt was logged
            attempt = LoginAttempt.query.filter_by(
                username=test_user.username,
                success=True
            ).first()
            
            assert attempt is not None
            assert attempt.success is True
    
    def test_failed_login_logging(self, client, app, test_user):
        """Test that failed login attempts are logged."""
        with app.app_context():
            # Make failed login attempt
            client.post('/auth/login', json={
                'username': test_user.username,
                'password': 'wrongpassword'
            })
            
            # Check that failed attempt was logged
            attempt = LoginAttempt.query.filter_by(
                username=test_user.username,
                success=False
            ).first()
            
            assert attempt is not None
            assert attempt.success is False
            assert attempt.failure_reason is not None


# Fixtures for testing
@pytest.fixture
def test_user(app):
    """Create a test user."""
    with app.app_context():
        from models import db
        from auth.models import Role
        
        user_role = Role.query.filter_by(name='user').first()
        if not user_role:
            user_role = Role(name='user', description='Regular user')
            db.session.add(user_role)
            db.session.commit()
        
        user = User(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            role_id=user_role.id,
            is_active=True,
            gdpr_consent=True
        )
        user.set_password('testpassword')
        
        db.session.add(user)
        db.session.commit()
        
        yield user
        
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def admin_user(app):
    """Create an admin user."""
    with app.app_context():
        from models import db
        from auth.models import Role
        
        admin_role = Role.query.filter_by(name='admin').first()
        if not admin_role:
            admin_role = Role(name='admin', description='Administrator')
            db.session.add(admin_role)
            db.session.commit()
        
        user = User(
            username='admin',
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            role_id=admin_role.id,
            is_active=True,
            gdpr_consent=True
        )
        user.set_password('adminpassword')
        
        db.session.add(user)
        db.session.commit()
        
        yield user
        
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def authenticated_user(client, app, test_user):
    """Create an authenticated user session."""
    with app.app_context():
        response = client.post('/auth/login', json={
            'username': test_user.username,
            'password': 'testpassword'
        })
        
        data = json.loads(response.data)
        return {
            'user': test_user,
            'token': data['jwt_token']
        }
