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
- Modern responsive design
- Professional TechmanGMS-inspired interface
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

## 📋 Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/garage-management-system.git
   cd garage-management-system
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python src/main.py
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

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

