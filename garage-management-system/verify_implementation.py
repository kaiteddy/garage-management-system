#!/usr/bin/env python3
"""
Verification script to check if all security implementation files are properly saved.
"""
import os
from pathlib import Path

def check_file_exists(file_path, description=""):
    """Check if a file exists and return status."""
    if os.path.exists(file_path):
        size = os.path.getsize(file_path)
        return f"✅ {file_path} ({size} bytes) {description}"
    else:
        return f"❌ {file_path} - MISSING {description}"

def main():
    """Main verification function."""
    print("🔍 Garage Management System - Implementation Verification")
    print("=" * 70)
    
    # Define all expected files
    files_to_check = [
        # Core Application
        ("src/app.py", "Main application factory"),
        ("src/config/base.py", "Base configuration"),
        ("src/config/security.py", "Security configuration"),
        ("run_secure.py", "Secure startup script"),
        
        # Authentication System
        ("src/auth/__init__.py", "Auth package init"),
        ("src/auth/models.py", "User and auth models"),
        ("src/auth/decorators.py", "Auth decorators"),
        
        # Security Infrastructure
        ("src/security/__init__.py", "Security package init"),
        ("src/security/middleware.py", "Security middleware"),
        ("src/security/encryption.py", "Encryption service"),
        ("src/security/backup.py", "Backup system"),
        ("src/security/monitoring.py", "Security monitoring"),
        
        # GDPR Compliance
        ("src/gdpr/__init__.py", "GDPR package init"),
        ("src/gdpr/models.py", "GDPR data models"),
        ("src/gdpr/utils.py", "GDPR utilities"),
        ("src/gdpr/compliance.py", "GDPR compliance service"),
        
        # API Routes
        ("src/routes/auth.py", "Authentication routes"),
        ("src/routes/gdpr.py", "GDPR compliance routes"),
        ("src/routes/admin.py", "Admin management routes"),
        
        # Frontend Assets
        ("src/static/js/security-dashboard.js", "Security dashboard JS"),
        ("src/static/css/security-dashboard.css", "Security dashboard CSS"),
        
        # Documentation
        ("docs/SECURITY_IMPLEMENTATION.md", "Security implementation guide"),
        ("docs/DEPLOYMENT_GUIDE.md", "Production deployment guide"),
        ("SECURITY_SUMMARY.md", "Implementation summary"),
        
        # Scripts
        ("scripts/setup_security.py", "Security setup script"),
        ("scripts/security_audit.py", "Security audit tool"),
        
        # Tests
        ("tests/test_security.py", "Security test suite"),
    ]
    
    # Check each file
    missing_files = []
    existing_files = []
    total_size = 0
    
    for file_path, description in files_to_check:
        full_path = os.path.join("garage-management-system", file_path)
        result = check_file_exists(full_path, description)
        print(result)
        
        if result.startswith("✅"):
            existing_files.append(file_path)
            if os.path.exists(full_path):
                total_size += os.path.getsize(full_path)
        else:
            missing_files.append(file_path)
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"Total Files Expected: {len(files_to_check)}")
    print(f"✅ Files Present: {len(existing_files)}")
    print(f"❌ Files Missing: {len(missing_files)}")
    print(f"📁 Total Size: {total_size:,} bytes ({total_size/1024:.1f} KB)")
    
    completion_percentage = (len(existing_files) / len(files_to_check)) * 100
    print(f"🎯 Implementation Completion: {completion_percentage:.1f}%")
    
    if missing_files:
        print(f"\n⚠️  MISSING FILES:")
        for file_path in missing_files:
            print(f"   - {file_path}")
    
    # Check directory structure
    print(f"\n📁 DIRECTORY STRUCTURE:")
    directories = [
        "src/auth",
        "src/security", 
        "src/gdpr",
        "src/routes",
        "src/config",
        "src/static/js",
        "src/static/css",
        "docs",
        "scripts",
        "tests"
    ]
    
    for directory in directories:
        full_dir = os.path.join("garage-management-system", directory)
        if os.path.exists(full_dir):
            file_count = len([f for f in os.listdir(full_dir) if f.endswith('.py') or f.endswith('.md') or f.endswith('.js') or f.endswith('.css')])
            print(f"   ✅ {directory}/ ({file_count} files)")
        else:
            print(f"   ❌ {directory}/ - MISSING")
    
    # Feature status
    print(f"\n🔐 SECURITY FEATURES STATUS:")
    features = [
        ("Authentication & Authorization", len([f for f in existing_files if 'auth' in f]) >= 3),
        ("Data Protection & Encryption", 'src/security/encryption.py' in existing_files),
        ("Security Middleware", 'src/security/middleware.py' in existing_files),
        ("GDPR Compliance", len([f for f in existing_files if 'gdpr' in f]) >= 3),
        ("Security Monitoring", 'src/security/monitoring.py' in existing_files),
        ("Backup System", 'src/security/backup.py' in existing_files),
        ("Admin Dashboard", 'src/routes/admin.py' in existing_files),
        ("Security Testing", 'tests/test_security.py' in existing_files),
        ("Documentation", len([f for f in existing_files if f.startswith('docs/') or f.endswith('.md')]) >= 2),
        ("Deployment Guide", 'docs/DEPLOYMENT_GUIDE.md' in existing_files)
    ]
    
    for feature, status in features:
        status_icon = "✅" if status else "❌"
        print(f"   {status_icon} {feature}")
    
    # Overall status
    print(f"\n🎯 OVERALL STATUS:")
    if completion_percentage >= 90:
        print("   🎉 EXCELLENT - Implementation is nearly complete!")
    elif completion_percentage >= 75:
        print("   ✅ GOOD - Most features implemented, minor gaps remain")
    elif completion_percentage >= 50:
        print("   ⚠️  PARTIAL - Core features present, significant work needed")
    else:
        print("   ❌ INCOMPLETE - Major implementation gaps")
    
    # Next steps
    if missing_files:
        print(f"\n📋 NEXT STEPS:")
        print("   1. Create missing security module files")
        print("   2. Run security setup script")
        print("   3. Test the application")
        print("   4. Run security audit")
    else:
        print(f"\n🚀 READY TO RUN:")
        print("   1. python3 run_secure.py")
        print("   2. python3 scripts/security_audit.py")
        print("   3. Access http://localhost:5000")
    
    return len(missing_files) == 0

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
