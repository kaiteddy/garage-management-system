# 🚗 GarageManager Pro - Complete Garage Management System

A comprehensive, modern garage management system built with Python Flask, featuring MOT reminders, customer management, SMS notifications, and a beautiful Apple-inspired user interface.

## 🌟 Key Features

### 🎯 **Unified Management Interface**
- **Single Dashboard**: All garage operations in one unified interface
- **Modern UI**: Apple-inspired design with blue and white color scheme
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live data synchronization across all modules
- **Professional Design**: Clean, minimalistic interface with proper spacing

### 🔔 **MOT Reminder System**
- **DVSA API Integration**: Real-time MOT data from official DVLA sources
- **SMS Notifications**: Automated reminders via Twilio integration
- **Bulk Processing**: Handle hundreds of vehicles efficiently
- **Smart Filtering**: Urgent, due soon, and completed status tracking
- **Completion Tracking**: Mark reminders as sent and track history
- **Archive System**: Hide completed reminders for better organization

### 👥 **Customer & Vehicle Management**
- **Complete Customer Database**: Detailed customer profiles and history
- **Vehicle Tracking**: Comprehensive vehicle records with MOT integration
- **Service History**: Track all jobs, invoices, and maintenance
- **Advanced Search**: Find customers and vehicles quickly
- **Data Linking**: Intelligent connection between customers, vehicles, and jobs
- **Import/Export**: CSV bulk operations with validation

### 📊 **Business Intelligence Dashboard**
- **Key Metrics**: Customer count, vehicle tracking, revenue monitoring
- **Quick Actions**: Fast access to common operations
- **Activity Overview**: Recent jobs, invoices, and system activity
- **Performance Tracking**: Business analytics and insights
- **Modern Cards**: Clean, professional data presentation

### 🔧 **Advanced Data Management**
- **CSV Import/Export**: Bulk data operations with intelligent validation
- **Google Drive Integration**: Seamless cloud data synchronization
- **Data Validation**: Intelligent error detection and correction
- **Backup & Restore**: Secure data protection and recovery
- **Real-time Linking**: Automatic customer-vehicle-job connections

### ⚙️ **Comprehensive Settings System**
- **MOT Configuration**: DVSA API setup and SMS service configuration
- **System Preferences**: Date formats, UI themes, and display options
- **Garage Information**: Business details and operating hours
- **User Account**: Personal settings and security preferences
- **Data Management**: Import/export tools and backup options

## 🛠️ Technology Stack

### **Backend**
- **Flask**: Python web framework with modular route structure
- **SQLite**: Lightweight, reliable database with automatic initialization
- **Python 3.7+**: Modern Python with type hints and async support

### **Frontend**
- **HTML5**: Semantic markup with modern standards
- **CSS3**: Apple San Francisco font family, CSS Grid, Flexbox
- **JavaScript**: ES6+ with modern DOM manipulation
- **Responsive Design**: Mobile-first approach with breakpoints

### **Integrations**
- **DVSA API**: Official UK government MOT data integration
- **Twilio SMS**: Professional SMS notification service
- **Google Drive API**: Cloud storage and data synchronization
- **Font Awesome**: Professional icon library

### **Design System**
- **Apple Design Language**: Consistent with iOS/macOS aesthetics
- **Blue & White Theme**: Professional color scheme
- **Typography**: San Francisco font family (SF Pro, SF Compact, SF Mono)
- **Spacing**: Consistent padding, margins, and layout density options

## 📋 Prerequisites

- **Python 3.7+**: Modern Python with pip package installer
- **Git**: For repository cloning and version control
- **Web Browser**: Chrome, Firefox, Safari, or Edge (modern browsers)

## 🚀 Quick Start

### **1. Clone & Setup**
```bash
git clone https://github.com/kaiteddy/garage-management-system.git
cd garage-management-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### **2. Initialize Database**
```bash
# Initialize the database with sample data
python src/init_database.py
```

### **3. Run the Application**
```bash
# Start the main application
python src/main.py
```

### **4. Access the System**
- **Main Application**: `http://localhost:5001`
- **MOT Reminder Service**: `http://localhost:5003` (if running separately)

### **5. Optional: Configure Integrations**
```bash
# Set up Google Drive integration (optional)
python setup_google_drive.py

# Test DVSA API connection (optional)
python mot_reminder/test_api_connection.py

# Test SMS service (optional)
python test_twilio_credentials.py
```

## 📁 Project Structure

```
garage-management-system/
├── src/
│   ├── main.py              # Flask application
│   └── static/
│       └── index.html       # Frontend application
├── requirements.txt         # Python dependencies
├── README.md               # This file
└── LICENSE                 # MIT License
```

## 🔧 Configuration

The application uses SQLite database which is automatically created on first run with sample data including:

- 10 sample customers (A.c.m Autos Limited, Acm Sparks Ltd, etc.)
- 10 sample vehicles with MOT tracking
- Job records and service history
- Invoice data with payment tracking

## 📊 API Endpoints

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Customers
- `GET /api/customers` - Get paginated customer list
- `GET /api/customers/<id>` - Get customer details with vehicles and history

### Vehicles
- `GET /api/vehicles` - Get paginated vehicle list
- `GET /api/vehicles/<id>` - Get vehicle details with service history

### Jobs
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create new job

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice

### Health Check
- `GET /api/health` - Check system health and database connection

## 🎨 Design Features

- **Professional Interface**: TechmanGMS-inspired design with modern styling
- **Dark Sidebar**: Professional navigation with icons and badges
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Modern Cards**: Clean card-based layout for data display
- **Color Coding**: Status indicators with appropriate colors
- **Hover Effects**: Interactive elements with smooth animations

## 🔒 Security Features

- CORS configuration for secure API access
- Input validation and sanitization
- Error handling with appropriate HTTP status codes
- Database connection security

## 🚀 Deployment

The application can be deployed to various platforms:

### Local Development
```bash
python src/main.py
```

### Production Deployment
1. Set environment variables for production
2. Use a production WSGI server like Gunicorn
3. Configure reverse proxy (nginx)
4. Set up SSL certificates

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "src/main.py"]
```

## 📝 Usage

1. **Dashboard**: View business overview and statistics
2. **Customers**: Add, edit, and manage customer information
3. **Vehicles**: Track vehicles, MOT dates, and service history
4. **Jobs**: Create and manage service jobs
5. **Invoices**: Generate and track invoices and payments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🔄 Updates

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added invoice management and payment tracking
- **v1.2.0**: Enhanced UI with modern design and responsive layout
- **v1.3.0**: Added comprehensive API endpoints and documentation

## 🙏 Acknowledgments

- TechmanGMS for design inspiration
- FontAwesome for icons
- Flask community for excellent documentation
- Contributors and testers

---

**Built with ❤️ for automotive service businesses**

