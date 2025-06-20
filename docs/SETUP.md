# Garage Management System - Setup Guide

## Quick Start

1. **Clone and Setup**

   ```bash
   git clone https://github.com/yourusername/garage-management-system.git
   cd garage-management-system
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Run Application**

   ```bash
   python src/main.py
   ```

3. **Access System**
   - Open browser to `http://localhost:5000`
   - System will auto-create database with sample data

## Sample Data Included

### Customers (10 records)

- A.c.m Autos Limited (ACM001)
- Acm Sparks Ltd (ACM002)
- Action 365 (ACT001)
- Admiral Insurance (ADM001)
- Ageas Insurance Limited (AGE001)
- And 5 more...

### Vehicles (10 records)

- EY20VBO - Volkswagen Polo Match Tsi Dsg
- Y905SLB - Ford Focus
- BF51XYZ - Vauxhall Astra
- And 7 more with MOT tracking...

### Jobs & Invoices

- Complete service history
- MOT repairs and maintenance
- Payment tracking and status

## Features Overview

- **Dashboard**: Business metrics and overview
- **Customer Management**: Complete customer database
- **Vehicle Tracking**: MOT dates and service history
- **Job Management**: Service job tracking
- **Invoice System**: Payment and billing management

## API Testing

Test endpoints with curl:

```bash
# Dashboard stats
curl http://localhost:5000/api/dashboard

# Customer list
curl http://localhost:5000/api/customers

# Vehicle list
curl http://localhost:5000/api/vehicles

# Health check
curl http://localhost:5000/api/health
```

## Troubleshooting

### Database Issues

- Database auto-creates on first run
- Check `garage.db` file exists
- Restart application if connection fails

### Port Issues

- Default port is 5000
- Change in `src/main.py` if needed
- Ensure port is not in use

### Permission Issues

- Ensure write permissions in directory
- Check virtual environment activation

## Production Deployment

### Using Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 src.main:app
```

### Using Docker

```bash
docker build -t garage-management .
docker run -p 5000:5000 garage-management
```

### Environment Variables

```bash
export FLASK_ENV=production
export DATABASE_URL=sqlite:///garage.db
```

## Development

### Adding New Features

1. Backend: Add routes in `src/main.py`
2. Frontend: Update `src/static/index.html`
3. Database: Modify schema in `init_db()` function

### Code Structure

- `src/main.py`: Flask application and API routes
- `src/static/index.html`: Complete frontend application
- Database: SQLite with auto-initialization

## Support

For issues or questions:

1. Check this setup guide
2. Review README.md
3. Open GitHub issue
4. Contact development team

---

**Happy garage managing! 🚗🔧**
