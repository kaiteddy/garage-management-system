# Deployment Guide - Garage Management System

## Overview

This guide provides comprehensive instructions for deploying the Garage Management System with full security, privacy, and GDPR compliance features in production environments.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Python**: 3.8 or higher
- **Database**: PostgreSQL 12+ (recommended) or SQLite for development
- **Web Server**: Nginx (recommended)
- **Process Manager**: Gunicorn + Supervisor
- **SSL Certificate**: Let's Encrypt or commercial certificate
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 20GB (with backup space)

### Dependencies

```bash
# System packages
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib supervisor redis-server
```

## Production Deployment

### 1. Environment Setup

#### Create Application User
```bash
sudo useradd -m -s /bin/bash garage
sudo usermod -aG sudo garage
```

#### Setup Application Directory
```bash
sudo mkdir -p /opt/garage-management
sudo chown garage:garage /opt/garage-management
cd /opt/garage-management
```

#### Clone Repository
```bash
git clone https://github.com/your-org/garage-management-system.git .
```

### 2. Python Environment

#### Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements/production.txt
```

### 3. Database Setup

#### PostgreSQL Configuration
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE garage_management;
CREATE USER garage_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE garage_management TO garage_user;
ALTER USER garage_user CREATEDB;
\q
```

#### Database Security
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/12/main/postgresql.conf
```

Add/modify:
```
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

### 4. Application Configuration

#### Environment Variables
```bash
sudo nano /opt/garage-management/.env
```

```bash
# Production Environment Configuration
FLASK_ENV=production
DEBUG=False

# Security Keys (Generate unique values)
SECRET_KEY=your-super-secure-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_ENCRYPTION_KEY=your-database-encryption-key-here
PSEUDONYMIZATION_SALT=your-pseudonymization-salt-here

# Database
DATABASE_URL=postgresql://garage_user:secure_password_here@localhost/garage_management

# Security Settings
FORCE_HTTPS=true
MFA_ENABLED=true
GDPR_ENABLED=true
ENCRYPT_SENSITIVE_FIELDS=true

# CORS (Adjust for your domain)
CORS_ORIGINS=https://yourdomain.com

# Rate Limiting
REDIS_URL=redis://localhost:6379/0
RATELIMIT_DEFAULT=1000 per hour
RATELIMIT_LOGIN_ATTEMPTS=5 per minute
RATELIMIT_API_CALLS=2000 per hour

# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Company Information
COMPANY_NAME=Your Garage Name
COMPANY_EMAIL=info@yourgarage.com
COMPANY_ADDRESS=Your Address
COMPANY_PHONE=+44 1234 567890
DPO_EMAIL=dpo@yourgarage.com

# Backup Configuration
BACKUP_DIRECTORY=/opt/garage-management/backups
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_RETENTION_DAYS=90

# Monitoring
SECURITY_MONITORING_ENABLED=true
SECURITY_ALERTS_ENABLED=true
SECURITY_EMAIL_SENDER=security@yourgarage.com
ADMIN_EMAIL=admin@yourgarage.com

# Feature Flags
ENABLE_REGISTRATION=false
ENABLE_PASSWORD_RESET=true
ENABLE_EMAIL_VERIFICATION=true
```

#### Set Secure Permissions
```bash
chmod 600 /opt/garage-management/.env
chown garage:garage /opt/garage-management/.env
```

### 5. Initialize Application

#### Run Security Setup
```bash
cd /opt/garage-management
source venv/bin/activate
python scripts/setup_security.py
```

#### Initialize Database
```bash
python -c "
from src.app import create_app
from src.models import db
app = create_app('production')
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"
```

### 6. Web Server Configuration

#### Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/garage-management
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    # Main Application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API Rate Limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Login Rate Limiting
    location /auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files
    location /static/ {
        alias /opt/garage-management/src/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File Upload Size
    client_max_body_size 16M;

    # Logging
    access_log /var/log/nginx/garage-management.access.log;
    error_log /var/log/nginx/garage-management.error.log;
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/garage-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate

#### Using Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Auto-renewal
```bash
sudo crontab -e
```

Add:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Application Service

#### Gunicorn Configuration
```bash
sudo nano /opt/garage-management/gunicorn.conf.py
```

```python
bind = "127.0.0.1:8000"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True
user = "garage"
group = "garage"
tmp_upload_dir = None
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}
```

#### Supervisor Configuration
```bash
sudo nano /etc/supervisor/conf.d/garage-management.conf
```

```ini
[program:garage-management]
command=/opt/garage-management/venv/bin/gunicorn --config /opt/garage-management/gunicorn.conf.py src.app:app
directory=/opt/garage-management
user=garage
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/garage-management/app.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
environment=PATH="/opt/garage-management/venv/bin"
```

#### Create Log Directory
```bash
sudo mkdir -p /var/log/garage-management
sudo chown garage:garage /var/log/garage-management
```

#### Start Services
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start garage-management
```

### 9. Backup Configuration

#### Automated Backup Script
```bash
sudo nano /opt/garage-management/scripts/backup.sh
```

```bash
#!/bin/bash
cd /opt/garage-management
source venv/bin/activate

# Create backup
python -c "
from src.security.backup import backup_service
from src.app import create_app
app = create_app('production')
with app.app_context():
    result = backup_service.create_full_backup()
    if result['success']:
        print(f'Backup created: {result[\"backup_name\"]}')
    else:
        print(f'Backup failed: {result[\"error\"]}')
        exit(1)
"
```

#### Schedule Backups
```bash
sudo chmod +x /opt/garage-management/scripts/backup.sh
sudo crontab -e
```

Add:
```
# Daily backup at 2 AM
0 2 * * * /opt/garage-management/scripts/backup.sh >> /var/log/garage-management/backup.log 2>&1

# Weekly cleanup at 3 AM on Sundays
0 3 * * 0 /opt/garage-management/venv/bin/python -c "from src.security.backup import backup_service; backup_service._cleanup_old_backups()"
```

### 10. Monitoring Setup

#### Log Rotation
```bash
sudo nano /etc/logrotate.d/garage-management
```

```
/var/log/garage-management/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 garage garage
    postrotate
        supervisorctl restart garage-management
    endscript
}
```

#### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs fail2ban

# Configure fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/garage-management.error.log
maxretry = 10
findtime = 600
bantime = 7200
```

## Security Checklist

### Pre-Deployment
- [ ] Generate unique encryption keys
- [ ] Configure secure database passwords
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Review CORS settings
- [ ] Test backup and restore procedures

### Post-Deployment
- [ ] Verify HTTPS enforcement
- [ ] Test authentication and authorization
- [ ] Verify rate limiting
- [ ] Check security headers
- [ ] Test GDPR compliance features
- [ ] Verify audit logging
- [ ] Test backup creation and restoration
- [ ] Configure monitoring alerts

### Ongoing Maintenance
- [ ] Regular security updates
- [ ] Monitor security logs
- [ ] Review user access
- [ ] Test disaster recovery
- [ ] Update SSL certificates
- [ ] Review and update security policies

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
sudo supervisorctl tail -f garage-management

# Check configuration
sudo supervisorctl status
```

#### Database Connection Issues
```bash
# Test database connection
sudo -u postgres psql -d garage_management -c "SELECT version();"

# Check PostgreSQL status
sudo systemctl status postgresql
```

#### SSL Certificate Issues
```bash
# Test SSL configuration
sudo nginx -t
openssl s_client -connect yourdomain.com:443
```

#### Performance Issues
```bash
# Monitor resources
htop
iotop
sudo netstat -tulpn
```

## Maintenance

### Regular Tasks

#### Daily
- Monitor application logs
- Check system resources
- Verify backup completion

#### Weekly
- Review security logs
- Update system packages
- Check SSL certificate expiry

#### Monthly
- Review user access
- Update application dependencies
- Test disaster recovery procedures
- Review and update security policies

### Updates

#### Application Updates
```bash
cd /opt/garage-management
git pull origin main
source venv/bin/activate
pip install -r requirements/production.txt
sudo supervisorctl restart garage-management
```

#### Security Updates
```bash
sudo apt update && sudo apt upgrade
sudo systemctl restart nginx
sudo supervisorctl restart garage-management
```

## Support

For deployment support and security questions:
- **Technical Support**: support@garagemanagement.com
- **Security Issues**: security@garagemanagement.com
- **Documentation**: https://docs.garagemanagement.com
