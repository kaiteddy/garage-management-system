#!/usr/bin/env python3
"""
Platform Launch Script
Comprehensive launch sequence for the Garage Management System
"""
import sys
import os
import time
import subprocess
import json
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def print_banner():
    """Print launch banner."""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    🚀 GARAGE MANAGEMENT SYSTEM PLATFORM LAUNCH 🚀           ║
    ║                                                              ║
    ║    Professional • Modern • Production-Ready                  ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)
    print(f"🕒 Launch initiated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)


def print_step(step_num, title, description=""):
    """Print a formatted step."""
    print(f"\n🔄 STEP {step_num}: {title}")
    if description:
        print(f"   {description}")
    print("-" * 60)


def run_command(command, description, capture_output=True):
    """Run a shell command and return result."""
    print(f"   ▶️  {description}")
    try:
        if capture_output:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=120)
        else:
            result = subprocess.run(command, shell=True, timeout=120)
            result.stdout = ""
            result.stderr = ""
        
        if result.returncode == 0:
            print(f"   ✅ {description} - SUCCESS")
            return True, result.stdout, result.stderr
        else:
            print(f"   ❌ {description} - FAILED")
            if result.stderr:
                print(f"   Error: {result.stderr.strip()}")
            return False, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        print(f"   ⏰ {description} - TIMEOUT")
        return False, "", "Command timed out"
    except Exception as e:
        print(f"   ❌ {description} - ERROR: {e}")
        return False, "", str(e)


def check_system_requirements():
    """Check system requirements."""
    print_step(1, "SYSTEM REQUIREMENTS CHECK", "Verifying environment and dependencies")
    
    requirements_met = True
    
    # Check Python version
    python_version = sys.version_info
    if python_version >= (3, 8):
        print(f"   ✅ Python {python_version.major}.{python_version.minor}.{python_version.micro} - OK")
    else:
        print(f"   ❌ Python {python_version.major}.{python_version.minor} - REQUIRES 3.8+")
        requirements_met = False
    
    # Check required files
    required_files = [
        'src/app.py',
        'src/static/css/design-system.css',
        'src/static/css/components.css',
        'src/static/css/modern-layout.css',
        'src/templates/layouts/modern.html',
        'requirements.txt'
    ]
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"   ✅ {file_path} - EXISTS")
        else:
            print(f"   ❌ {file_path} - MISSING")
            requirements_met = False
    
    return requirements_met


def install_dependencies():
    """Install Python dependencies."""
    print_step(2, "DEPENDENCY INSTALLATION", "Installing required Python packages")
    
    # Install main dependencies
    success, stdout, stderr = run_command(
        "pip install -r requirements.txt",
        "Installing main dependencies"
    )
    
    if not success:
        return False
    
    # Install additional production dependencies
    production_deps = [
        "gunicorn>=20.1.0",
        "psycopg2-binary>=2.9.0",
        "redis>=4.0.0",
        "celery>=5.2.0",
        "flask-limiter>=2.0.0"
    ]
    
    for dep in production_deps:
        success, stdout, stderr = run_command(
            f"pip install {dep}",
            f"Installing {dep}"
        )
        if not success:
            print(f"   ⚠️  Optional dependency {dep} failed to install")
    
    return True


def setup_database():
    """Setup and initialize database."""
    print_step(3, "DATABASE SETUP", "Initializing database and running migrations")
    
    # Create database tables
    success, stdout, stderr = run_command(
        "python -c \"from src.app import create_app; from src.models import db; app = create_app(); app.app_context().push(); db.create_all(); print('Database initialized')\"",
        "Creating database tables"
    )
    
    if not success:
        return False
    
    # Run database optimization
    if os.path.exists('scripts/optimize_database.py'):
        success, stdout, stderr = run_command(
            "python scripts/optimize_database.py",
            "Optimizing database performance"
        )
    
    return True


def run_tests():
    """Run comprehensive test suite."""
    print_step(4, "TESTING SUITE", "Running comprehensive tests to ensure quality")
    
    test_results = []
    
    # Run GUI tests
    if os.path.exists('scripts/test_modern_gui.py'):
        success, stdout, stderr = run_command(
            "python scripts/test_modern_gui.py",
            "Running GUI tests"
        )
        test_results.append(('GUI Tests', success))
    
    # Run comprehensive tests
    if os.path.exists('scripts/run_comprehensive_tests.py'):
        success, stdout, stderr = run_command(
            "python scripts/run_comprehensive_tests.py",
            "Running comprehensive test suite"
        )
        test_results.append(('Comprehensive Tests', success))
    
    # Run unit tests if available
    if os.path.exists('tests/'):
        success, stdout, stderr = run_command(
            "python -m pytest tests/ -v --tb=short",
            "Running unit tests"
        )
        test_results.append(('Unit Tests', success))
    
    # Check test results
    passed_tests = sum(1 for _, success in test_results if success)
    total_tests = len(test_results)
    
    if total_tests > 0:
        success_rate = (passed_tests / total_tests) * 100
        print(f"   📊 Test Results: {passed_tests}/{total_tests} passed ({success_rate:.1f}%)")
        return success_rate >= 75  # Require 75% pass rate
    
    return True


def build_static_assets():
    """Build and optimize static assets."""
    print_step(5, "STATIC ASSETS", "Building and optimizing CSS/JS assets")
    
    # Create optimized CSS bundle
    css_files = [
        'src/static/css/design-system.css',
        'src/static/css/components.css',
        'src/static/css/modern-layout.css'
    ]
    
    try:
        combined_css = ""
        for css_file in css_files:
            if os.path.exists(css_file):
                with open(css_file, 'r') as f:
                    combined_css += f.read() + "\n"
        
        # Create production CSS bundle
        os.makedirs('src/static/dist', exist_ok=True)
        with open('src/static/dist/app.min.css', 'w') as f:
            f.write(combined_css)
        
        print("   ✅ CSS bundle created - SUCCESS")
    except Exception as e:
        print(f"   ❌ CSS bundle creation - FAILED: {e}")
        return False
    
    # Copy critical JavaScript files
    js_files = [
        'src/static/js/core/app.js',
        'src/static/js/core/error-handler.js',
        'src/static/js/services/api-service.js',
        'src/static/js/components/modern-layout.js'
    ]
    
    try:
        for js_file in js_files:
            if os.path.exists(js_file):
                filename = os.path.basename(js_file)
                subprocess.run(f"cp {js_file} src/static/dist/{filename}", shell=True)
        
        print("   ✅ JavaScript files copied - SUCCESS")
    except Exception as e:
        print(f"   ❌ JavaScript copy - FAILED: {e}")
        return False
    
    return True


def create_production_config():
    """Create production configuration."""
    print_step(6, "PRODUCTION CONFIG", "Creating production configuration files")
    
    # Create production environment file
    env_content = """# Production Environment Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-secret-key-here-change-this
DATABASE_URL=sqlite:///garage_management.db
REDIS_URL=redis://localhost:6379/0

# Security Settings
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Performance Settings
SEND_FILE_MAX_AGE_DEFAULT=31536000
PERMANENT_SESSION_LIFETIME=3600

# Monitoring
MONITORING_ENABLED=True
LOG_LEVEL=INFO
"""
    
    try:
        with open('.env.production', 'w') as f:
            f.write(env_content)
        print("   ✅ Production environment file created - SUCCESS")
    except Exception as e:
        print(f"   ❌ Environment file creation - FAILED: {e}")
        return False
    
    # Create Gunicorn configuration
    gunicorn_config = """# Gunicorn Configuration
bind = "0.0.0.0:8000"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"
"""
    
    try:
        with open('gunicorn.conf.py', 'w') as f:
            f.write(gunicorn_config)
        print("   ✅ Gunicorn configuration created - SUCCESS")
    except Exception as e:
        print(f"   ❌ Gunicorn config creation - FAILED: {e}")
        return False
    
    return True


def create_systemd_service():
    """Create systemd service file for production deployment."""
    print_step(7, "SYSTEM SERVICE", "Creating systemd service for production")
    
    service_content = f"""[Unit]
Description=Garage Management System
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory={os.getcwd()}
Environment=PATH={os.getcwd()}/venv/bin
ExecStart={os.getcwd()}/venv/bin/gunicorn --config gunicorn.conf.py src.app:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
    
    try:
        with open('garage-management.service', 'w') as f:
            f.write(service_content)
        print("   ✅ Systemd service file created - SUCCESS")
        print("   ℹ️  To install: sudo cp garage-management.service /etc/systemd/system/")
        print("   ℹ️  To enable: sudo systemctl enable garage-management")
        print("   ℹ️  To start: sudo systemctl start garage-management")
    except Exception as e:
        print(f"   ❌ Service file creation - FAILED: {e}")
        return False
    
    return True


def create_nginx_config():
    """Create Nginx configuration."""
    print_step(8, "WEB SERVER CONFIG", "Creating Nginx configuration")
    
    nginx_config = """server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration (update paths)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Static files
    location /static/ {
        alias /path/to/garage-management-system/src/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:8000/health;
    }
}
"""
    
    try:
        with open('nginx-garage-management.conf', 'w') as f:
            f.write(nginx_config)
        print("   ✅ Nginx configuration created - SUCCESS")
        print("   ℹ️  To install: sudo cp nginx-garage-management.conf /etc/nginx/sites-available/")
        print("   ℹ️  To enable: sudo ln -s /etc/nginx/sites-available/nginx-garage-management.conf /etc/nginx/sites-enabled/")
        print("   ℹ️  To reload: sudo nginx -t && sudo systemctl reload nginx")
    except Exception as e:
        print(f"   ❌ Nginx config creation - FAILED: {e}")
        return False
    
    return True


def start_application():
    """Start the application."""
    print_step(9, "APPLICATION STARTUP", "Starting the Garage Management System")
    
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    # Start the application in development mode for testing
    print("   🚀 Starting application in development mode...")
    print("   ℹ️  For production, use: gunicorn --config gunicorn.conf.py src.app:app")
    
    try:
        # Test that the app can start
        success, stdout, stderr = run_command(
            "python -c \"from src.app import create_app; app = create_app(); print('Application created successfully')\"",
            "Testing application startup"
        )
        
        if success:
            print("   ✅ Application startup test - SUCCESS")
            return True
        else:
            print("   ❌ Application startup test - FAILED")
            return False
    except Exception as e:
        print(f"   ❌ Application startup - ERROR: {e}")
        return False


def generate_launch_report(results):
    """Generate launch report."""
    print_step(10, "LAUNCH REPORT", "Generating comprehensive launch report")
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'launch_results': results,
        'summary': {
            'total_steps': len(results),
            'successful_steps': sum(1 for r in results if r['success']),
            'failed_steps': sum(1 for r in results if not r['success']),
            'success_rate': 0
        },
        'next_steps': [],
        'production_checklist': [
            'Update SECRET_KEY in .env.production',
            'Configure SSL certificates',
            'Set up database backups',
            'Configure monitoring and alerting',
            'Set up log rotation',
            'Configure firewall rules',
            'Test disaster recovery procedures'
        ]
    }
    
    if report['summary']['total_steps'] > 0:
        report['summary']['success_rate'] = (
            report['summary']['successful_steps'] / report['summary']['total_steps'] * 100
        )
    
    # Determine next steps based on results
    if report['summary']['success_rate'] >= 90:
        report['next_steps'] = [
            'Deploy to production server',
            'Configure SSL certificates',
            'Set up monitoring and backups',
            'Train users on the new interface'
        ]
    elif report['summary']['success_rate'] >= 75:
        report['next_steps'] = [
            'Fix failed steps',
            'Re-run launch sequence',
            'Deploy to staging for testing'
        ]
    else:
        report['next_steps'] = [
            'Review and fix critical issues',
            'Check system requirements',
            'Contact support if needed'
        ]
    
    # Save report
    report_file = f"launch_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report, report_file


def main():
    """Main launch sequence."""
    start_time = time.time()
    
    print_banner()
    
    # Change to project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Launch sequence
    launch_steps = [
        ('System Requirements Check', check_system_requirements),
        ('Dependency Installation', install_dependencies),
        ('Database Setup', setup_database),
        ('Testing Suite', run_tests),
        ('Static Assets Build', build_static_assets),
        ('Production Configuration', create_production_config),
        ('System Service Creation', create_systemd_service),
        ('Web Server Configuration', create_nginx_config),
        ('Application Startup', start_application)
    ]
    
    results = []
    
    for step_name, step_function in launch_steps:
        try:
            success = step_function()
            results.append({
                'step': step_name,
                'success': success,
                'timestamp': datetime.now().isoformat()
            })
            
            if not success:
                print(f"   ⚠️  {step_name} failed - continuing with remaining steps")
        
        except Exception as e:
            print(f"   ❌ {step_name} - CRITICAL ERROR: {e}")
            results.append({
                'step': step_name,
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    # Generate launch report
    report, report_file = generate_launch_report(results)
    
    # Print final results
    end_time = time.time()
    duration = end_time - start_time
    
    print("\n" + "=" * 80)
    print("🎯 LAUNCH SEQUENCE COMPLETE")
    print("=" * 80)
    
    print(f"⏱️  Total Duration: {duration:.2f} seconds")
    print(f"📊 Success Rate: {report['summary']['success_rate']:.1f}%")
    print(f"✅ Successful Steps: {report['summary']['successful_steps']}")
    print(f"❌ Failed Steps: {report['summary']['failed_steps']}")
    print(f"📄 Detailed Report: {report_file}")
    
    # Print status
    if report['summary']['success_rate'] >= 90:
        print("\n🎉 LAUNCH SUCCESSFUL! Platform is ready for production deployment.")
        print("\n🚀 NEXT STEPS:")
        for step in report['next_steps']:
            print(f"   • {step}")
        
        print("\n🌐 ACCESS YOUR APPLICATION:")
        print("   • Development: http://localhost:5000")
        print("   • Production: Configure domain and SSL")
        
        return 0
    
    elif report['summary']['success_rate'] >= 75:
        print("\n⚠️  LAUNCH PARTIALLY SUCCESSFUL - Some issues need attention.")
        print("\n🔧 NEXT STEPS:")
        for step in report['next_steps']:
            print(f"   • {step}")
        
        return 1
    
    else:
        print("\n❌ LAUNCH FAILED - Critical issues need resolution.")
        print("\n🆘 NEXT STEPS:")
        for step in report['next_steps']:
            print(f"   • {step}")
        
        return 2


if __name__ == '__main__':
    sys.exit(main())
