# GarageManager Pro - Professional Garage Management System

A comprehensive garage management system built with Flask backend and modern HTML/CSS/JavaScript frontend. This system provides complete customer, vehicle, job, and invoice management for automotive service businesses.

## 🚀 Features

### 📊 Dashboard
- Real-time overview of business metrics
- Customer, vehicle, and revenue statistics
- Recent activity tracking
- Professional modern interface

### 👥 Customer Management
- Complete customer database with search and pagination
- Customer details with contact information
- Service history tracking
- Vehicle ownership management
- Invoice and payment tracking

### 🚙 Vehicle Management
- Comprehensive vehicle database
- MOT due date tracking
- Service history for each vehicle
- Mileage tracking
- Customer linking

### 💼 Job Management
- Job creation and tracking
- Status management (Pending, In Progress, Completed)
- Service descriptions and notes
- Cost tracking and invoicing

### 📄 Invoice System
- Automatic invoice generation from jobs
- Payment status tracking (Paid, Partial, Pending)
- Customer and vehicle linking
- Financial reporting

### 🔧 Additional Features
- **Modern Professional GUI**: Beautiful, clean interface with professional aesthetics
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Charts**: Revenue trends and analytics with Chart.js
- **Advanced Search**: Real-time search across all customer and vehicle data
- **Component Library**: Professional UI components (buttons, cards, forms, tables)
- **System Monitoring**: Health checks and performance metrics
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation
- **Demo Mode**: Comprehensive demo with sample data
- Search functionality across all sections
- Pagination for large datasets
- Error handling and validation
- CORS support for API access

## 🛠️ Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite
- **Frontend**: HTML5, CSS3, JavaScript
- **Icons**: FontAwesome
- **Styling**: Modern CSS with gradients and animations
- **API**: RESTful JSON API

## 🚀 Quick Start (Modern GUI Demo)

**Experience the modern interface immediately:**

```bash
git clone https://github.com/kaiteddy/garage-management-system.git
cd garage-management-system
python demo_server.py
```

Then visit:
- **Dashboard**: http://localhost:5000/
- **Customer Management**: http://localhost:5000/customers
- **Component Demo**: http://localhost:5000/demo

## 📋 Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kaiteddy/garage-management-system.git
   cd garage-management-system
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   # For development (recommended)
   pip install -r requirements/development.txt

   # Or for production
   pip install -r requirements/production.txt

   # Or use the main requirements file
   pip install -r requirements.txt
   ```

4. **Configure environment (optional)**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (DVLA API key, etc.)
   ```

5. **Run the application**
   ```bash
   # New organized structure (recommended)
   python run.py

   # Or legacy entry point (backward compatibility)
   python src/main.py
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5001`

## 📁 Project Structure

**🎉 NEW: Completely Reorganized Codebase for Better Maintainability!**

The project has been completely restructured following Flask best practices with proper separation of concerns:

```
garage-management-system/
├── src/                          # Application source code
│   ├── app.py                   # Application factory (NEW)
│   ├── main.py                  # Legacy entry point (backward compatibility)
│   ├── config/                  # Configuration management (NEW)
│   │   ├── __init__.py
│   │   ├── base.py             # Base configuration
│   │   ├── development.py      # Development settings
│   │   ├── production.py       # Production settings
│   │   └── testing.py          # Testing configuration
│   ├── models/                  # Database models (REORGANIZED)
│   │   ├── __init__.py
│   │   ├── base.py             # Base model class
│   │   ├── customer.py         # Customer model
│   │   ├── vehicle.py          # Vehicle model
│   │   ├── job.py              # Job model
│   │   ├── estimate.py         # Estimate model
│   │   ├── invoice.py          # Invoice model
│   │   └── user.py             # User model
│   ├── routes/                  # Route handlers (NEW)
│   │   ├── __init__.py
│   │   ├── main.py             # Main routes (frontend)
│   │   └── api/                # API routes
│   │       ├── customers.py    # Customer API
│   │       ├── vehicles.py     # Vehicle API
│   │       ├── jobs.py         # Job API
│   │       ├── estimates.py    # Estimate API
│   │       ├── invoices.py     # Invoice API
│   │       └── dashboard.py    # Dashboard API
│   ├── services/                # Business logic layer (NEW)
│   │   ├── customer_service.py # Customer operations
│   │   ├── vehicle_service.py  # Vehicle operations
│   │   ├── dvla_service.py     # DVLA API integration
│   │   └── database_service.py # Database utilities
│   ├── utils/                   # Utility functions (NEW)
│   │   ├── date_utils.py       # Date formatting utilities
│   │   ├── validators.py       # Input validation
│   │   └── exceptions.py       # Custom exceptions
│   ├── static/                  # Frontend assets (REORGANIZED)
│   │   ├── css/                # Stylesheets (SEPARATED)
│   │   │   ├── main.css        # Main styles
│   │   │   ├── components.css  # Component styles
│   │   │   ├── forms.css       # Form styles
│   │   │   └── responsive.css  # Responsive design
│   │   ├── js/                 # JavaScript modules (SEPARATED)
│   │   │   ├── main.js         # Main application logic
│   │   │   ├── api.js          # API communication
│   │   │   ├── utils.js        # Utility functions
│   │   │   └── components/     # UI components
│   │   │       ├── customers.js
│   │   │       └── vehicles.js
│   │   ├── assets/             # Images and other assets
│   │   └── index.html          # Main HTML template (CLEANED)
│   └── migrations/             # Database migrations (NEW)
├── tests/                       # Test suite (NEW)
│   ├── conftest.py             # Test configuration
│   ├── test_models/            # Model tests
│   ├── test_routes/            # Route tests
│   ├── test_services/          # Service tests
│   └── test_utils/             # Utility tests
├── docs/                        # Documentation (NEW)
├── scripts/                     # Utility scripts (NEW)
│   └── migrate_db.py           # Database migration script
├── requirements/                # Requirements files (ORGANIZED)
│   ├── base.txt                # Base requirements
│   ├── development.txt         # Development requirements
│   └── production.txt          # Production requirements
├── .env.example                # Environment variables example (NEW)
├── run.py                      # Application entry point (NEW)
├── requirements.txt            # Main requirements file
├── README.md                   # This file
└── LICENSE                     # MIT License
```

### 🔄 Migration Benefits

- **Modular Architecture**: Clear separation of models, services, routes, and utilities
- **Scalable Structure**: Easy to add new features and maintain existing code
- **Professional Standards**: Follows Flask and Python best practices
- **Better Testing**: Organized test structure for comprehensive coverage
- **Environment Management**: Proper configuration for different environments
- **Asset Organization**: Separated CSS and JavaScript for better maintainability

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

