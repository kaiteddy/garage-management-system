#!/usr/bin/env python3
"""
Security audit script for the Garage Management System.
This script performs comprehensive security checks and generates a security report.
"""
import os
import sys
import json
import requests
import subprocess
from datetime import datetime
import ssl
import socket
from urllib.parse import urlparse

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


class SecurityAuditor:
    """Comprehensive security auditor for the garage management system."""
    
    def __init__(self, base_url='http://localhost:5000'):
        self.base_url = base_url.rstrip('/')
        self.results = {
            'timestamp': datetime.utcnow().isoformat(),
            'base_url': base_url,
            'checks': {},
            'summary': {
                'total_checks': 0,
                'passed': 0,
                'failed': 0,
                'warnings': 0
            }
        }
    
    def run_all_checks(self):
        """Run all security checks."""
        print("🔐 Starting Security Audit...")
        print("=" * 50)
        
        # Infrastructure checks
        self.check_ssl_configuration()
        self.check_security_headers()
        self.check_cors_configuration()
        
        # Authentication checks
        self.check_authentication_endpoints()
        self.check_password_policies()
        self.check_rate_limiting()
        
        # Authorization checks
        self.check_authorization_controls()
        self.check_admin_endpoints()
        
        # Data protection checks
        self.check_input_validation()
        self.check_sql_injection_protection()
        self.check_xss_protection()
        
        # GDPR compliance checks
        self.check_gdpr_endpoints()
        self.check_privacy_policy()
        
        # Application security checks
        self.check_error_handling()
        self.check_file_upload_security()
        
        # Generate summary
        self.generate_summary()
        
        return self.results
    
    def check_ssl_configuration(self):
        """Check SSL/TLS configuration."""
        check_name = "SSL Configuration"
        print(f"Checking {check_name}...")
        
        try:
            parsed_url = urlparse(self.base_url)
            if parsed_url.scheme == 'https':
                hostname = parsed_url.hostname
                port = parsed_url.port or 443
                
                # Check SSL certificate
                context = ssl.create_default_context()
                with socket.create_connection((hostname, port), timeout=10) as sock:
                    with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        cert = ssock.getpeercert()
                        
                        # Check certificate validity
                        not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                        days_until_expiry = (not_after - datetime.utcnow()).days
                        
                        if days_until_expiry > 30:
                            self.add_result(check_name, "PASS", f"SSL certificate valid for {days_until_expiry} days")
                        elif days_until_expiry > 0:
                            self.add_result(check_name, "WARNING", f"SSL certificate expires in {days_until_expiry} days")
                        else:
                            self.add_result(check_name, "FAIL", "SSL certificate has expired")
            else:
                self.add_result(check_name, "FAIL", "HTTPS not enabled")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"SSL check failed: {str(e)}")
    
    def check_security_headers(self):
        """Check security headers."""
        check_name = "Security Headers"
        print(f"Checking {check_name}...")
        
        try:
            response = requests.get(self.base_url, timeout=10)
            headers = response.headers
            
            required_headers = {
                'Strict-Transport-Security': 'HSTS header missing',
                'X-Content-Type-Options': 'X-Content-Type-Options header missing',
                'X-Frame-Options': 'X-Frame-Options header missing',
                'X-XSS-Protection': 'X-XSS-Protection header missing',
                'Content-Security-Policy': 'CSP header missing'
            }
            
            missing_headers = []
            for header, message in required_headers.items():
                if header not in headers:
                    missing_headers.append(message)
            
            if not missing_headers:
                self.add_result(check_name, "PASS", "All security headers present")
            else:
                self.add_result(check_name, "FAIL", f"Missing headers: {', '.join(missing_headers)}")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"Header check failed: {str(e)}")
    
    def check_cors_configuration(self):
        """Check CORS configuration."""
        check_name = "CORS Configuration"
        print(f"Checking {check_name}...")
        
        try:
            # Test CORS with a malicious origin
            headers = {'Origin': 'http://malicious-site.com'}
            response = requests.options(f"{self.base_url}/api/dashboard", headers=headers, timeout=10)
            
            cors_origin = response.headers.get('Access-Control-Allow-Origin')
            
            if cors_origin == '*':
                self.add_result(check_name, "FAIL", "CORS allows all origins (*)")
            elif cors_origin == 'http://malicious-site.com':
                self.add_result(check_name, "FAIL", "CORS allows unauthorized origins")
            else:
                self.add_result(check_name, "PASS", "CORS properly configured")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"CORS check failed: {str(e)}")
    
    def check_authentication_endpoints(self):
        """Check authentication endpoints."""
        check_name = "Authentication Endpoints"
        print(f"Checking {check_name}...")
        
        try:
            # Test login endpoint
            login_data = {
                'username': 'nonexistent',
                'password': 'wrongpassword'
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 401:
                data = response.json()
                if 'error_code' in data and data['error_code'] == 'INVALID_CREDENTIALS':
                    self.add_result(check_name, "PASS", "Authentication properly rejects invalid credentials")
                else:
                    self.add_result(check_name, "WARNING", "Authentication response format unexpected")
            else:
                self.add_result(check_name, "FAIL", f"Unexpected response code: {response.status_code}")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"Authentication check failed: {str(e)}")
    
    def check_password_policies(self):
        """Check password policy enforcement."""
        check_name = "Password Policies"
        print(f"Checking {check_name}...")
        
        try:
            # Test weak password
            register_data = {
                'username': 'testuser123',
                'email': 'test@example.com',
                'password': '123',  # Weak password
                'gdpr_consent': True
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=register_data, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if 'error_code' in data and data['error_code'] == 'WEAK_PASSWORD':
                    self.add_result(check_name, "PASS", "Password policy properly enforced")
                else:
                    self.add_result(check_name, "WARNING", "Password policy response unexpected")
            else:
                self.add_result(check_name, "FAIL", "Weak passwords accepted")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"Password policy check failed: {str(e)}")
    
    def check_rate_limiting(self):
        """Check rate limiting implementation."""
        check_name = "Rate Limiting"
        print(f"Checking {check_name}...")
        
        try:
            # Make rapid requests to test rate limiting
            login_data = {
                'username': 'testuser',
                'password': 'wrongpassword'
            }
            
            rate_limited = False
            for i in range(10):
                response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=5)
                if response.status_code == 429:
                    rate_limited = True
                    break
            
            if rate_limited:
                self.add_result(check_name, "PASS", "Rate limiting is active")
            else:
                self.add_result(check_name, "WARNING", "Rate limiting not detected (may be configured differently)")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"Rate limiting check failed: {str(e)}")
    
    def check_authorization_controls(self):
        """Check authorization controls."""
        check_name = "Authorization Controls"
        print(f"Checking {check_name}...")
        
        try:
            # Try to access protected endpoint without authentication
            response = requests.get(f"{self.base_url}/admin/users", timeout=10)
            
            if response.status_code in [401, 403]:
                self.add_result(check_name, "PASS", "Protected endpoints require authentication")
            else:
                self.add_result(check_name, "FAIL", f"Protected endpoint accessible without auth: {response.status_code}")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"Authorization check failed: {str(e)}")
    
    def check_admin_endpoints(self):
        """Check admin endpoint protection."""
        check_name = "Admin Endpoint Protection"
        print(f"Checking {check_name}...")
        
        try:
            admin_endpoints = [
                '/admin/users',
                '/admin/security/metrics',
                '/admin/backup/create'
            ]
            
            protected_count = 0
            for endpoint in admin_endpoints:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in [401, 403]:
                    protected_count += 1
            
            if protected_count == len(admin_endpoints):
                self.add_result(check_name, "PASS", "All admin endpoints properly protected")
            else:
                self.add_result(check_name, "FAIL", f"Some admin endpoints not protected: {protected_count}/{len(admin_endpoints)}")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"Admin endpoint check failed: {str(e)}")
    
    def check_input_validation(self):
        """Check input validation."""
        check_name = "Input Validation"
        print(f"Checking {check_name}...")
        
        try:
            # Test with malicious input
            malicious_data = {
                'username': '<script>alert("xss")</script>',
                'email': 'test@example.com',
                'password': 'ValidPass123!',
                'gdpr_consent': True
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=malicious_data, timeout=10)
            
            # Should either reject the input or sanitize it
            if response.status_code == 400:
                self.add_result(check_name, "PASS", "Malicious input properly rejected")
            elif response.status_code == 201:
                # Check if input was sanitized
                data = response.json()
                if '<script>' not in str(data):
                    self.add_result(check_name, "PASS", "Input properly sanitized")
                else:
                    self.add_result(check_name, "FAIL", "XSS vulnerability detected")
            else:
                self.add_result(check_name, "WARNING", f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"Input validation check failed: {str(e)}")
    
    def check_sql_injection_protection(self):
        """Check SQL injection protection."""
        check_name = "SQL Injection Protection"
        print(f"Checking {check_name}...")
        
        try:
            # Test SQL injection in login
            sql_injection_data = {
                'username': "admin'; DROP TABLE users; --",
                'password': 'password'
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=sql_injection_data, timeout=10)
            
            # Should not cause server error
            if response.status_code in [400, 401]:
                self.add_result(check_name, "PASS", "SQL injection attempt properly handled")
            elif response.status_code == 500:
                self.add_result(check_name, "FAIL", "SQL injection may have caused server error")
            else:
                self.add_result(check_name, "WARNING", f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"SQL injection check failed: {str(e)}")
    
    def check_xss_protection(self):
        """Check XSS protection."""
        check_name = "XSS Protection"
        print(f"Checking {check_name}...")
        
        try:
            response = requests.get(self.base_url, timeout=10)
            
            # Check for XSS protection headers
            xss_protection = response.headers.get('X-XSS-Protection')
            csp_header = response.headers.get('Content-Security-Policy')
            
            if xss_protection and csp_header:
                self.add_result(check_name, "PASS", "XSS protection headers present")
            else:
                missing = []
                if not xss_protection:
                    missing.append("X-XSS-Protection")
                if not csp_header:
                    missing.append("Content-Security-Policy")
                self.add_result(check_name, "WARNING", f"Missing XSS protection: {', '.join(missing)}")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"XSS protection check failed: {str(e)}")
    
    def check_gdpr_endpoints(self):
        """Check GDPR compliance endpoints."""
        check_name = "GDPR Endpoints"
        print(f"Checking {check_name}...")
        
        try:
            gdpr_endpoints = [
                '/gdpr/privacy-policy',
                '/gdpr/consent',
                '/gdpr/data-request'
            ]
            
            accessible_count = 0
            for endpoint in gdpr_endpoints:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in [200, 401, 405]:  # 405 for POST-only endpoints
                    accessible_count += 1
            
            if accessible_count == len(gdpr_endpoints):
                self.add_result(check_name, "PASS", "GDPR endpoints accessible")
            else:
                self.add_result(check_name, "WARNING", f"Some GDPR endpoints not accessible: {accessible_count}/{len(gdpr_endpoints)}")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"GDPR endpoint check failed: {str(e)}")
    
    def check_privacy_policy(self):
        """Check privacy policy availability."""
        check_name = "Privacy Policy"
        print(f"Checking {check_name}...")
        
        try:
            response = requests.get(f"{self.base_url}/gdpr/privacy-policy", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'policy' in data and 'controller' in data['policy']:
                    self.add_result(check_name, "PASS", "Privacy policy available and structured")
                else:
                    self.add_result(check_name, "WARNING", "Privacy policy format unexpected")
            else:
                self.add_result(check_name, "FAIL", f"Privacy policy not accessible: {response.status_code}")
                
        except Exception as e:
            self.add_result(check_name, "FAIL", f"Privacy policy check failed: {str(e)}")
    
    def check_error_handling(self):
        """Check error handling."""
        check_name = "Error Handling"
        print(f"Checking {check_name}...")
        
        try:
            # Test 404 error
            response = requests.get(f"{self.base_url}/nonexistent-endpoint", timeout=10)
            
            if response.status_code == 404:
                # Check if error reveals sensitive information
                response_text = response.text.lower()
                sensitive_info = ['traceback', 'stack trace', 'debug', 'exception']
                
                if any(info in response_text for info in sensitive_info):
                    self.add_result(check_name, "FAIL", "Error responses reveal sensitive information")
                else:
                    self.add_result(check_name, "PASS", "Error handling properly configured")
            else:
                self.add_result(check_name, "WARNING", f"Unexpected response for 404: {response.status_code}")
                
        except Exception as e:
            self.add_result(check_name, "WARNING", f"Error handling check failed: {str(e)}")
    
    def check_file_upload_security(self):
        """Check file upload security."""
        check_name = "File Upload Security"
        print(f"Checking {check_name}...")
        
        # This is a placeholder - actual implementation would depend on file upload endpoints
        self.add_result(check_name, "INFO", "File upload security check requires specific endpoint testing")
    
    def add_result(self, check_name, status, message):
        """Add a check result."""
        self.results['checks'][check_name] = {
            'status': status,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Update summary
        self.results['summary']['total_checks'] += 1
        if status == 'PASS':
            self.results['summary']['passed'] += 1
        elif status == 'FAIL':
            self.results['summary']['failed'] += 1
        elif status in ['WARNING', 'INFO']:
            self.results['summary']['warnings'] += 1
        
        # Print result
        status_emoji = {
            'PASS': '✅',
            'FAIL': '❌',
            'WARNING': '⚠️',
            'INFO': 'ℹ️'
        }
        print(f"  {status_emoji.get(status, '?')} {check_name}: {message}")
    
    def generate_summary(self):
        """Generate audit summary."""
        summary = self.results['summary']
        total = summary['total_checks']
        passed = summary['passed']
        failed = summary['failed']
        warnings = summary['warnings']
        
        print("\n" + "=" * 50)
        print("🔐 Security Audit Summary")
        print("=" * 50)
        print(f"Total Checks: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warnings}")
        
        if failed == 0:
            print("\n🎉 No critical security issues found!")
        else:
            print(f"\n⚠️  {failed} critical security issues require attention!")
        
        # Calculate security score
        if total > 0:
            score = ((passed + warnings * 0.5) / total) * 100
            self.results['security_score'] = round(score, 1)
            print(f"Security Score: {score:.1f}%")
    
    def save_report(self, filename='security_audit_report.json'):
        """Save audit report to file."""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n📄 Report saved to: {filename}")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Security audit for Garage Management System')
    parser.add_argument('--url', default='http://localhost:5000', help='Base URL to audit')
    parser.add_argument('--output', default='security_audit_report.json', help='Output file for report')
    
    args = parser.parse_args()
    
    auditor = SecurityAuditor(args.url)
    results = auditor.run_all_checks()
    auditor.save_report(args.output)
    
    # Exit with error code if critical issues found
    if results['summary']['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
