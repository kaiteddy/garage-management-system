#!/bin/bash

# Garage Management System Deployment Script
# Choose your deployment method by uncommenting the appropriate section

set -e

echo "🚀 Garage Management System Deployment Script"
echo "=============================================="

# Create necessary directories
mkdir -p logs
mkdir -p instance

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Set permissions
chmod +x deploy.sh

echo ""
echo "Choose your deployment method:"
echo "1. Systemd Service (Recommended for Linux servers)"
echo "2. PM2 Process Manager"
echo "3. Docker Container"
echo "4. Gunicorn + Nginx (Production)"
echo "5. Simple Background Process"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🔧 Setting up Systemd service..."
        
        # Update the service file with correct paths
        sed -i "s|/path/to/your/garage-management-system|$(pwd)|g" garage-management.service
        
        # Copy service file to systemd directory
        sudo cp garage-management.service /etc/systemd/system/
        
        # Reload systemd and enable service
        sudo systemctl daemon-reload
        sudo systemctl enable garage-management.service
        sudo systemctl start garage-management.service
        
        echo "✅ Service started! Check status with: sudo systemctl status garage-management"
        echo "📋 View logs with: sudo journalctl -u garage-management -f"
        ;;
        
    2)
        echo "🔧 Setting up PM2..."
        
        # Install PM2 if not installed
        if ! command -v pm2 &> /dev/null; then
            echo "Installing PM2..."
            npm install -g pm2
        fi
        
        # Update ecosystem config with correct path
        sed -i "s|/path/to/your/garage-management-system|$(pwd)|g" ecosystem.config.js
        
        # Start with PM2
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        
        echo "✅ PM2 started! Check status with: pm2 status"
        echo "📋 View logs with: pm2 logs garage-management-system"
        ;;
        
    3)
        echo "🔧 Setting up Docker..."
        
        # Build and start with Docker Compose
        docker-compose up -d --build
        
        echo "✅ Docker container started! Check status with: docker-compose ps"
        echo "📋 View logs with: docker-compose logs -f garage-management"
        ;;
        
    4)
        echo "🔧 Setting up Gunicorn + Nginx..."
        
        # Install Gunicorn
        pip3 install gunicorn
        
        # Create Gunicorn systemd service
        cat > /tmp/gunicorn-garage.service << EOF
[Unit]
Description=Gunicorn instance to serve Garage Management System
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
ExecStart=$(which gunicorn) --config gunicorn.conf.py src.main:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
EOF
        
        sudo mv /tmp/gunicorn-garage.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable gunicorn-garage.service
        sudo systemctl start gunicorn-garage.service
        
        echo "✅ Gunicorn started! Configure Nginx with the provided nginx.conf"
        echo "📋 View logs with: sudo journalctl -u gunicorn-garage -f"
        ;;
        
    5)
        echo "🔧 Starting simple background process..."
        
        # Create a simple startup script
        cat > start_garage.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export FLASK_ENV=production
export PORT=5001
nohup python3 src/main.py > logs/app.log 2>&1 &
echo $! > logs/app.pid
echo "Garage Management System started with PID $(cat logs/app.pid)"
EOF
        
        chmod +x start_garage.sh
        ./start_garage.sh
        
        echo "✅ Background process started!"
        echo "📋 View logs with: tail -f logs/app.log"
        echo "🛑 Stop with: kill \$(cat logs/app.pid)"
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Your Garage Management System should now be running permanently."
echo "Access it at: http://your-server-ip:5001"
echo ""
echo "📚 Management commands:"
case $choice in
    1)
        echo "  Start:   sudo systemctl start garage-management"
        echo "  Stop:    sudo systemctl stop garage-management"
        echo "  Restart: sudo systemctl restart garage-management"
        echo "  Status:  sudo systemctl status garage-management"
        echo "  Logs:    sudo journalctl -u garage-management -f"
        ;;
    2)
        echo "  Start:   pm2 start garage-management-system"
        echo "  Stop:    pm2 stop garage-management-system"
        echo "  Restart: pm2 restart garage-management-system"
        echo "  Status:  pm2 status"
        echo "  Logs:    pm2 logs garage-management-system"
        ;;
    3)
        echo "  Start:   docker-compose up -d"
        echo "  Stop:    docker-compose down"
        echo "  Restart: docker-compose restart"
        echo "  Status:  docker-compose ps"
        echo "  Logs:    docker-compose logs -f"
        ;;
    4)
        echo "  Start:   sudo systemctl start gunicorn-garage"
        echo "  Stop:    sudo systemctl stop gunicorn-garage"
        echo "  Restart: sudo systemctl restart gunicorn-garage"
        echo "  Status:  sudo systemctl status gunicorn-garage"
        echo "  Logs:    sudo journalctl -u gunicorn-garage -f"
        ;;
    5)
        echo "  Start:   ./start_garage.sh"
        echo "  Stop:    kill \$(cat logs/app.pid)"
        echo "  Logs:    tail -f logs/app.log"
        ;;
esac
