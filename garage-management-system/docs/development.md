# Development Guide

This guide explains how to work with the reorganized Garage Management System codebase.

## Architecture Overview

The system follows a layered architecture with clear separation of concerns:

### 1. Models Layer (`src/models/`)
- **Purpose**: Database entities and relationships
- **Base Model**: All models inherit from `BaseModel` for common functionality
- **Features**: Automatic timestamps, common CRUD operations, serialization

### 2. Services Layer (`src/services/`)
- **Purpose**: Business logic and complex operations
- **Pattern**: Service classes with static methods
- **Features**: Validation, error handling, data transformation

### 3. Routes Layer (`src/routes/`)
- **Purpose**: HTTP request handling
- **Organization**: Separate blueprints for API and frontend routes
- **Features**: Request validation, response formatting, error handling

### 4. Utils Layer (`src/utils/`)
- **Purpose**: Reusable utility functions
- **Categories**: Date utilities, validators, custom exceptions
- **Features**: Input validation, date formatting, error handling

## Adding New Features

### 1. Adding a New Model

```python
# src/models/new_model.py
from . import db
from .base import BaseModel

class NewModel(BaseModel):
    __tablename__ = 'new_models'
    
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    def to_dict(self):
        data = super().to_dict()
        # Add any computed fields
        return data
```

### 2. Adding a Service

```python
# src/services/new_service.py
from models import NewModel, db
from utils.exceptions import ValidationError, NotFoundError

class NewService:
    @staticmethod
    def get_all(page=1, per_page=20, search=None):
        # Implementation
        pass
    
    @staticmethod
    def create(data):
        # Validation and creation logic
        pass
```

### 3. Adding API Routes

```python
# src/routes/api/new_routes.py
from flask import Blueprint, request, jsonify
from services.new_service import NewService

new_api = Blueprint('new_api', __name__)

@new_api.route('/new-items', methods=['GET'])
def get_items():
    # Implementation
    pass
```

### 4. Adding Frontend Components

```javascript
// src/static/js/components/new_component.js
function showNewItemModal() {
    // Implementation
}

// Export functions
window.showNewItemModal = showNewItemModal;
```

## Code Style Guidelines

### Python Code Style
- Follow PEP 8
- Use type hints where appropriate
- Document functions with docstrings
- Use meaningful variable names

### JavaScript Code Style
- Use ES6+ features
- Document functions with JSDoc comments
- Use consistent naming conventions
- Organize code into modules

### CSS Organization
- Use BEM methodology for class names
- Organize styles by component
- Use CSS custom properties for theming
- Follow mobile-first responsive design

## Testing

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_models/test_customer.py
```

### Writing Tests
```python
# tests/test_services/test_customer_service.py
import pytest
from services.customer_service import CustomerService

def test_create_customer(app):
    with app.app_context():
        data = {'name': 'Test Customer'}
        customer = CustomerService.create_customer(data)
        assert customer.name == 'Test Customer'
```

## Database Management

### Creating Migrations
```python
# scripts/create_migration.py
# Add new migration script for schema changes
```

### Running Migrations
```bash
python scripts/migrate_db.py
```

## Configuration Management

### Environment Variables
```env
# .env
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///garage_dev.db
DVLA_API_KEY=your-api-key
```

### Configuration Classes
- `BaseConfig`: Common settings
- `DevelopmentConfig`: Development-specific settings
- `ProductionConfig`: Production-specific settings
- `TestingConfig`: Testing-specific settings

## API Documentation

### Response Format
```json
{
    "status": "success|error",
    "data": {},
    "message": "Optional message"
}
```

### Error Handling
```python
try:
    # Operation
    pass
except ValidationError as e:
    return jsonify({
        'status': 'error',
        'message': e.message,
        'error_code': e.error_code
    }), 400
```

## Frontend Development

### Adding New Pages
1. Add HTML structure to `index.html`
2. Create CSS styles in appropriate stylesheet
3. Add JavaScript functionality
4. Update navigation

### API Communication
```javascript
// Use the API module
const response = await API.customers.getAll({page: 1});
if (response.status === 'success') {
    // Handle success
} else {
    // Handle error
}
```

## Deployment

### Development
```bash
python run.py
```

### Production
```bash
# Set environment variables
export FLASK_ENV=production
export SECRET_KEY=your-production-secret

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 "src.app:create_app()"
```

## Best Practices

1. **Always use services for business logic**
2. **Validate input at the service layer**
3. **Handle errors gracefully**
4. **Write tests for new functionality**
5. **Follow the established code organization**
6. **Use meaningful commit messages**
7. **Document complex functionality**

## Troubleshooting

### Common Issues
1. **Import errors**: Check Python path and module structure
2. **Database errors**: Ensure database is initialized
3. **API errors**: Check request format and validation
4. **Frontend errors**: Check browser console for JavaScript errors

### Debug Mode
```bash
export FLASK_ENV=development
python run.py
```

This will enable debug mode with detailed error messages and auto-reload.
