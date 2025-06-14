"""
Basic encryption service for the Garage Management System.
"""
import os
import base64
import hashlib
from cryptography.fernet import Fernet
from flask import current_app


class EncryptionService:
    """Service for handling encryption and decryption operations."""
    
    def __init__(self, app=None):
        self.app = app
        self._fernet = None
        self._key = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize encryption service with Flask app."""
        self.app = app
        self._initialize_encryption_key()
    
    def _initialize_encryption_key(self):
        """Initialize encryption key from configuration or generate new one."""
        # Try to get key from environment
        key_b64 = os.environ.get('DATABASE_ENCRYPTION_KEY')
        
        if key_b64:
            try:
                self._key = base64.urlsafe_b64decode(key_b64)
                self._fernet = Fernet(key_b64)
                return
            except Exception as e:
                if current_app:
                    current_app.logger.error(f"Invalid encryption key: {str(e)}")
        
        # Generate new key if none exists
        self._key = Fernet.generate_key()
        self._fernet = Fernet(self._key)
        
        if current_app:
            current_app.logger.warning(
                "No encryption key found in configuration. Generated temporary key."
            )
    
    def encrypt_string(self, plaintext):
        """Encrypt a string."""
        if not plaintext:
            return plaintext
        
        try:
            if isinstance(plaintext, str):
                plaintext = plaintext.encode('utf-8')
            
            encrypted = self._fernet.encrypt(plaintext)
            return base64.urlsafe_b64encode(encrypted).decode('utf-8')
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Encryption failed: {str(e)}")
            return plaintext
    
    def decrypt_string(self, encrypted_text):
        """Decrypt a string."""
        if not encrypted_text:
            return encrypted_text
        
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_text.encode('utf-8'))
            decrypted = self._fernet.decrypt(encrypted_bytes)
            return decrypted.decode('utf-8')
            
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Decryption failed: {str(e)}")
            return encrypted_text
    
    def hash_password(self, password, salt=None):
        """Hash a password using PBKDF2."""
        if salt is None:
            salt = os.urandom(32)
        
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return password_hash, salt
    
    def verify_password(self, password, password_hash, salt):
        """Verify a password against its hash."""
        try:
            test_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
            return test_hash == password_hash
        except Exception:
            return False
    
    def generate_secure_token(self, length=32):
        """Generate a cryptographically secure random token."""
        token = os.urandom(length)
        return base64.urlsafe_b64encode(token).decode('utf-8')


# Global encryption service instance
encryption_service = EncryptionService()
