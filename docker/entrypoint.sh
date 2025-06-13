#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432}; do
  sleep 1
done
echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
cd src
python -c "
from app import create_app
from models import db
app = create_app()
with app.app_context():
    db.create_all()
    print('Database tables created/updated successfully')
"

# Optimize database
echo "Optimizing database..."
python ../scripts/optimize_database.py

# Start monitoring
echo "Starting system monitoring..."
python -c "
from utils.monitoring import start_monitoring
start_monitoring()
print('System monitoring started')
" &

# Start the application
echo "Starting Garage Management System..."
exec gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 100 app:app
