#!/usr/bin/env python3
"""
Security setup script for the Garage Management System.
This script initializes the security infrastructure and creates default security data.
"""
import os
import sys
import secrets
from datetime import datetime

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from app import create_app
from models import db
from auth.models import User, Role, Permission
from auth.auth_manager import AuthManager
from gdpr.models import DataProcessingRecord, DataRetentionPolicy
from security.encryption import encryption_service
import json


def generate_secure_keys():
    """Generate secure keys for the application."""
    keys = {
        'SECRET_KEY': secrets.token_urlsafe(32),
        'JWT_SECRET_KEY': secrets.token_urlsafe(32),
        'DATABASE_ENCRYPTION_KEY': secrets.token_urlsafe(32),
        'PSEUDONYMIZATION_SALT': secrets.token_urlsafe(16)
    }
    return keys


def create_env_file(keys):
    """Create .env file with secure configuration."""
    env_content = f"""# Security Configuration
SECRET_KEY={keys['SECRET_KEY']}
JWT_SECRET_KEY={keys['JWT_SECRET_KEY']}
DATABASE_ENCRYPTION_KEY={keys['DATABASE_ENCRYPTION_KEY']}
PSEUDONYMIZATION_SALT={keys['PSEUDONYMIZATION_SALT']}

# Database
DATABASE_URL=sqlite:///garage.db

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5000

# Rate Limiting
RATELIMIT_DEFAULT=100 per hour
RATELIMIT_LOGIN_ATTEMPTS=5 per minute
RATELIMIT_API_CALLS=1000 per hour

# Security Features
FORCE_HTTPS=false
MFA_ENABLED=true
GDPR_ENABLED=true
ENCRYPT_SENSITIVE_FIELDS=true

# Company Information
COMPANY_NAME=Garage Management System
COMPANY_EMAIL=info@garagemanagement.com
DPO_EMAIL=dpo@garagemanagement.com

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_PASSWORD_RESET=true
ENABLE_EMAIL_VERIFICATION=false

# Logging
LOG_LEVEL=INFO
AUDIT_LOG_ENABLED=true
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ Created .env file with secure configuration")


def create_default_admin_user():
    """Create default admin user."""
    try:
        # Check if admin user already exists
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user:
            print("ℹ️  Admin user already exists")
            return admin_user
        
        # Get admin role
        admin_role = Role.query.filter_by(name='admin').first()
        if not admin_role:
            print("❌ Admin role not found. Please run database initialization first.")
            return None
        
        # Create admin user
        admin_password = input("Enter password for admin user (or press Enter for random): ").strip()
        if not admin_password:
            admin_password = secrets.token_urlsafe(12)
            print(f"Generated admin password: {admin_password}")
        
        admin_user = User(
            username='admin',
            email='admin@garagemanagement.com',
            first_name='System',
            last_name='Administrator',
            role_id=admin_role.id,
            is_active=True,
            is_verified=True,
            gdpr_consent=True,
            gdpr_consent_date=datetime.utcnow()
        )
        
        admin_user.set_password(admin_password)
        
        db.session.add(admin_user)
        db.session.commit()
        
        print("✅ Created default admin user")
        print(f"   Username: admin")
        print(f"   Email: admin@garagemanagement.com")
        print(f"   Password: {admin_password}")
        
        return admin_user
        
    except Exception as e:
        print(f"❌ Failed to create admin user: {str(e)}")
        db.session.rollback()
        return None


def setup_default_permissions():
    """Set up default permissions and roles."""
    try:
        # Define all permissions
        permissions_data = [
            # Customer permissions
            ('customers.read', 'customers', 'read', 'View customer information'),
            ('customers.write', 'customers', 'write', 'Create and update customers'),
            ('customers.delete', 'customers', 'delete', 'Delete customers'),
            
            # Vehicle permissions
            ('vehicles.read', 'vehicles', 'read', 'View vehicle information'),
            ('vehicles.write', 'vehicles', 'write', 'Create and update vehicles'),
            ('vehicles.delete', 'vehicles', 'delete', 'Delete vehicles'),
            
            # Job permissions
            ('jobs.read', 'jobs', 'read', 'View job information'),
            ('jobs.write', 'jobs', 'write', 'Create and update jobs'),
            ('jobs.delete', 'jobs', 'delete', 'Delete jobs'),
            
            # Estimate permissions
            ('estimates.read', 'estimates', 'read', 'View estimates'),
            ('estimates.write', 'estimates', 'write', 'Create and update estimates'),
            ('estimates.delete', 'estimates', 'delete', 'Delete estimates'),
            
            # Invoice permissions
            ('invoices.read', 'invoices', 'read', 'View invoices'),
            ('invoices.write', 'invoices', 'write', 'Create and update invoices'),
            ('invoices.delete', 'invoices', 'delete', 'Delete invoices'),
            
            # Report permissions
            ('reports.read', 'reports', 'read', 'View reports'),
            ('reports.write', 'reports', 'write', 'Create reports'),
            
            # Admin permissions
            ('admin.users', 'admin', 'users', 'Manage users'),
            ('admin.roles', 'admin', 'roles', 'Manage roles and permissions'),
            ('admin.system', 'admin', 'system', 'System administration'),
            ('admin.security', 'admin', 'security', 'Security management'),
            ('admin.gdpr', 'admin', 'gdpr', 'GDPR compliance management'),
        ]
        
        # Create permissions
        for perm_name, resource, action, description in permissions_data:
            if not Permission.query.filter_by(name=perm_name).first():
                permission = Permission(
                    name=perm_name,
                    resource=resource,
                    action=action,
                    description=description
                )
                db.session.add(permission)
        
        db.session.commit()
        print("✅ Created default permissions")
        
        # Assign permissions to roles
        assign_role_permissions()
        
    except Exception as e:
        print(f"❌ Failed to setup permissions: {str(e)}")
        db.session.rollback()


def assign_role_permissions():
    """Assign permissions to roles."""
    try:
        # Get all permissions
        all_permissions = Permission.query.all()
        
        # Admin gets all permissions
        admin_role = Role.query.filter_by(name='admin').first()
        if admin_role:
            admin_role.permissions = all_permissions
        
        # Manager permissions
        manager_role = Role.query.filter_by(name='manager').first()
        if manager_role:
            manager_permissions = Permission.query.filter(
                Permission.name.in_([
                    'customers.read', 'customers.write', 'customers.delete',
                    'vehicles.read', 'vehicles.write', 'vehicles.delete',
                    'jobs.read', 'jobs.write', 'jobs.delete',
                    'estimates.read', 'estimates.write', 'estimates.delete',
                    'invoices.read', 'invoices.write', 'invoices.delete',
                    'reports.read', 'reports.write'
                ])
            ).all()
            manager_role.permissions = manager_permissions
        
        # Technician permissions
        technician_role = Role.query.filter_by(name='technician').first()
        if technician_role:
            technician_permissions = Permission.query.filter(
                Permission.name.in_([
                    'customers.read', 'vehicles.read',
                    'jobs.read', 'jobs.write',
                    'estimates.read', 'estimates.write'
                ])
            ).all()
            technician_role.permissions = technician_permissions
        
        # User permissions
        user_role = Role.query.filter_by(name='user').first()
        if user_role:
            user_permissions = Permission.query.filter(
                Permission.name.in_([
                    'customers.read', 'vehicles.read',
                    'jobs.read', 'estimates.read'
                ])
            ).all()
            user_role.permissions = user_permissions
        
        db.session.commit()
        print("✅ Assigned permissions to roles")
        
    except Exception as e:
        print(f"❌ Failed to assign role permissions: {str(e)}")
        db.session.rollback()


def setup_gdpr_data():
    """Set up GDPR compliance data."""
    try:
        # Create data processing records
        processing_activities = [
            {
                'activity_name': 'Customer Account Management',
                'purpose': 'Managing customer accounts and providing garage services',
                'legal_basis': 'Contract',
                'data_categories': ['Personal identifiers', 'Contact details', 'Financial information'],
                'data_subjects': ['Customers'],
                'recipients': ['Internal staff', 'Payment processors'],
                'retention_period': '7 years after last service',
                'security_measures': ['Encryption at rest', 'Access controls', 'Audit logging', 'Regular backups']
            },
            {
                'activity_name': 'Vehicle Service Records',
                'purpose': 'Maintaining vehicle service history and MOT compliance',
                'legal_basis': 'Legal obligation',
                'data_categories': ['Vehicle registration', 'Service history', 'MOT data', 'Technical specifications'],
                'data_subjects': ['Vehicle owners'],
                'recipients': ['Internal staff', 'DVLA', 'Insurance companies'],
                'retention_period': '10 years for MOT records, 7 years for service history',
                'security_measures': ['Encryption at rest', 'Access controls', 'Regular backups', 'Secure transmission']
            },
            {
                'activity_name': 'Employee Management',
                'purpose': 'Managing employee accounts and access to the system',
                'legal_basis': 'Contract',
                'data_categories': ['Personal identifiers', 'Contact details', 'Employment details'],
                'data_subjects': ['Employees'],
                'recipients': ['HR department', 'Payroll providers'],
                'retention_period': '7 years after employment ends',
                'security_measures': ['Strong authentication', 'Role-based access', 'Audit logging']
            }
        ]
        
        for activity in processing_activities:
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
                    controller_name='Garage Management System',
                    controller_contact='info@garagemanagement.com',
                    dpo_contact='dpo@garagemanagement.com'
                )
                db.session.add(record)
        
        # Create data retention policies
        retention_policies = [
            {
                'name': 'Customer Data Retention',
                'description': 'Retention policy for customer personal and business data',
                'data_category': 'customer_data',
                'retention_period_days': 2555,  # 7 years
                'trigger_event': 'last_service_date',
                'action_on_expiry': 'anonymize'
            },
            {
                'name': 'Vehicle Service Records',
                'description': 'Retention policy for vehicle service and MOT records',
                'data_category': 'vehicle_data',
                'retention_period_days': 3650,  # 10 years
                'trigger_event': 'last_service_date',
                'action_on_expiry': 'archive'
            },
            {
                'name': 'User Session Data',
                'description': 'Retention policy for user session and login data',
                'data_category': 'session_data',
                'retention_period_days': 90,
                'trigger_event': 'session_end',
                'action_on_expiry': 'delete'
            },
            {
                'name': 'Audit Logs',
                'description': 'Retention policy for system audit logs',
                'data_category': 'audit_logs',
                'retention_period_days': 2555,  # 7 years
                'trigger_event': 'log_creation',
                'action_on_expiry': 'archive'
            }
        ]
        
        for policy in retention_policies:
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
        print("✅ Created GDPR compliance data")
        
    except Exception as e:
        print(f"❌ Failed to setup GDPR data: {str(e)}")
        db.session.rollback()


def main():
    """Main setup function."""
    print("🔐 Garage Management System - Security Setup")
    print("=" * 50)
    
    # Generate secure keys
    print("1. Generating secure keys...")
    keys = generate_secure_keys()
    
    # Create .env file
    print("2. Creating environment configuration...")
    create_env_file(keys)
    
    # Create Flask app
    print("3. Initializing application...")
    app = create_app('development')
    
    with app.app_context():
        # Create database tables
        print("4. Creating database tables...")
        db.create_all()
        
        # Setup permissions and roles
        print("5. Setting up permissions and roles...")
        setup_default_permissions()
        
        # Create admin user
        print("6. Creating admin user...")
        create_default_admin_user()
        
        # Setup GDPR data
        print("7. Setting up GDPR compliance data...")
        setup_gdpr_data()
    
    print("\n✅ Security setup completed successfully!")
    print("\nNext steps:")
    print("1. Review the generated .env file and update as needed")
    print("2. Start the application: python run.py")
    print("3. Login with the admin credentials")
    print("4. Configure additional security settings as needed")
    print("\n⚠️  Important: Keep your encryption keys secure and backed up!")


if __name__ == '__main__':
    main()
