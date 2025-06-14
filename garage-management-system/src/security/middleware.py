"""
Basic security middleware for the Garage Management System.
"""
import time
from flask import request, jsonify, g, current_app
from collections import defaultdict, deque
from datetime import datetime, timedelta


class SecurityMiddleware:
    """Basic security middleware."""
    
    def __init__(self, app=None):
        self.app = app
        self.request_counts = defaultdict(deque)
        self.blocked_ips = set()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize security middleware with Flask app."""
        self.app = app
        
        # Register middleware
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Process request before handling."""
        # Record request start time
        g.request_start_time = time.time()
        
        # Get client IP
        client_ip = self.get_client_ip()
        g.client_ip = client_ip
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return jsonify({
                'status': 'error',
                'message': 'Access denied',
                'error_code': 'IP_BLOCKED'
            }), 403
        
        # Basic rate limiting
        if not self.check_rate_limit(client_ip):
            return jsonify({
                'status': 'error',
                'message': 'Rate limit exceeded',
                'error_code': 'RATE_LIMIT_EXCEEDED'
            }), 429
    
    def after_request(self, response):
        """Process response after handling."""
        # Add basic security headers
        response = self.add_security_headers(response)
        return response
    
    def get_client_ip(self):
        """Get client IP address, considering proxies."""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        else:
            return request.remote_addr or '127.0.0.1'
    
    def check_rate_limit(self, client_ip):
        """Basic rate limiting check."""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)
        
        # Clean old requests
        while (self.request_counts[client_ip] and 
               self.request_counts[client_ip][0] < window_start):
            self.request_counts[client_ip].popleft()
        
        # Check current count
        current_count = len(self.request_counts[client_ip])
        rate_limit = 60  # 60 requests per minute
        
        if current_count >= rate_limit:
            return False
        
        # Add current request
        self.request_counts[client_ip].append(now)
        return True
    
    def add_security_headers(self, response):
        """Add basic security headers to response."""
        # Basic security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Remove server information
        response.headers.pop('Server', None)
        
        return response
