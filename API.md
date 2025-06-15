# Garage Management System - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, no authentication is required. Future versions will include API key authentication.

## Response Format
All API responses are in JSON format with the following structure:

### Success Response
```json
{
  "data": {...},
  "status": "success"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": "error"
}
```

## Endpoints

### Dashboard

#### Get Dashboard Statistics
```http
GET /api/dashboard
```

**Response:**
```json
{
  "customers": 7037,
  "vehicles": 10364,
  "revenue": 8595448.03,
  "documents": 30354
}
```

### Customers

#### Get Customer List
```http
GET /api/customers
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 50)
- `search` (optional): Search term for name, company, or account number

**Response:**
```json
{
  "customers": [
    {
      "id": 1,
      "account_number": "ACM001",
      "name": "A.c.m Autos Limited",
      "company": "A.c.m Autos Limited",
      "address": "14 Holmfield Avenue, Hendon, London",
      "postcode": "NW4 2LN",
      "phone": "07816768877",
      "email": "info@acmautos.com",
      "vehicle_count": 2,
      "document_count": 5,
      "last_invoice": "2025-01-16"
    }
  ],
  "total": 10,
  "page": 1,
  "per_page": 50,
  "pages": 1
}
```

#### Get Customer Details
```http
GET /api/customers/{customer_id}
```

**Response:**
```json
{
  "customer": {
    "id": 1,
    "account_number": "ACM001",
    "name": "A.c.m Autos Limited",
    "company": "A.c.m Autos Limited",
    "address": "14 Holmfield Avenue, Hendon, London",
    "postcode": "NW4 2LN",
    "phone": "07816768877",
    "email": "info@acmautos.com"
  },
  "vehicles": [
    {
      "id": 1,
      "registration": "EY20VBO",
      "make": "Volkswagen",
      "model": "Polo Match Tsi Dsg",
      "color": "Grey",
      "fuel_type": "Petrol",
      "mot_due": "2024-03-15",
      "mileage": 16967
    }
  ],
  "jobs": [
    {
      "id": 1,
      "job_number": "J001",
      "registration": "EY20VBO",
      "description": "Carry Out Mot Repairs",
      "status": "COMPLETED",
      "total_amount": 678.00,
      "created_date": "2025-01-16"
    }
  ],
  "invoices": [
    {
      "id": 1,
      "invoice_number": "88187",
      "registration": "EY20VBO",
      "job_description": "Carry Out Mot Repairs",
      "amount": 678.00,
      "status": "PARTIAL",
      "created_date": "2025-01-16"
    }
  ]
}
```

### Vehicles

#### Get Vehicle List
```http
GET /api/vehicles
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 50)
- `search` (optional): Search term for registration, make, or model

**Response:**
```json
{
  "vehicles": [
    {
      "id": 1,
      "registration": "EY20VBO",
      "make": "Volkswagen",
      "model": "Polo Match Tsi Dsg",
      "color": "Grey",
      "fuel_type": "Petrol",
      "mot_due": "2024-03-15",
      "mileage": 16967,
      "customer_name": "A.c.m Autos Limited",
      "customer_company": "A.c.m Autos Limited",
      "last_service": "2025-01-16"
    }
  ],
  "total": 10,
  "page": 1,
  "per_page": 50,
  "pages": 1
}
```

#### Get Vehicle Details
```http
GET /api/vehicles/{vehicle_id}
```

**Response:**
```json
{
  "vehicle": {
    "id": 1,
    "registration": "EY20VBO",
    "make": "Volkswagen",
    "model": "Polo Match Tsi Dsg",
    "color": "Grey",
    "fuel_type": "Petrol",
    "mot_due": "2024-03-15",
    "mileage": 16967,
    "customer_name": "A.c.m Autos Limited",
    "customer_company": "A.c.m Autos Limited",
    "account_number": "ACM001"
  },
  "jobs": [
    {
      "id": 1,
      "job_number": "J001",
      "customer_name": "A.c.m Autos Limited",
      "description": "Carry Out Mot Repairs",
      "status": "COMPLETED",
      "total_amount": 678.00,
      "created_date": "2025-01-16"
    }
  ],
  "invoices": [
    {
      "id": 1,
      "invoice_number": "88187",
      "job_description": "Carry Out Mot Repairs",
      "amount": 678.00,
      "status": "PARTIAL",
      "created_date": "2025-01-16"
    }
  ]
}
```

### Jobs

#### Get Job List
```http
GET /api/jobs
```

**Response:**
```json
{
  "jobs": [
    {
      "id": 1,
      "job_number": "J001",
      "registration": "EY20VBO",
      "customer_name": "A.c.m Autos Limited",
      "customer_company": "A.c.m Autos Limited",
      "description": "Carry Out Mot Repairs - Remove Rear Offside Seat Assembly",
      "status": "COMPLETED",
      "total_amount": 678.00,
      "created_date": "2025-01-16"
    }
  ]
}
```

### Invoices

#### Get Invoice List
```http
GET /api/invoices
```

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoice_number": "88187",
      "registration": "EY20VBO",
      "customer_name": "A.c.m Autos Limited",
      "customer_company": "A.c.m Autos Limited",
      "job_description": "Carry Out Mot Repairs",
      "amount": 678.00,
      "status": "PARTIAL",
      "created_date": "2025-01-16"
    }
  ]
}
```

### Health Check

#### System Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "customers": 10,
  "vehicles": 10
}
```

## Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Error Handling

All endpoints include comprehensive error handling:

```json
{
  "error": "Database connection failed",
  "status": "error"
}
```

## Rate Limiting

Currently no rate limiting is implemented. Future versions will include:
- 100 requests per minute per IP
- 1000 requests per hour per IP

## Examples

### cURL Examples

```bash
# Get dashboard statistics
curl -X GET http://localhost:5000/api/dashboard

# Get customer list with search
curl -X GET "http://localhost:5000/api/customers?search=acm&page=1&per_page=25"

# Get specific customer details
curl -X GET http://localhost:5000/api/customers/ACM001

# Get vehicle list
curl -X GET http://localhost:5000/api/vehicles

# Get specific vehicle details
curl -X GET http://localhost:5000/api/vehicles/EY20VBO

# Health check
curl -X GET http://localhost:5000/api/health
```

### JavaScript Examples

```javascript
// Get dashboard data
fetch('/api/dashboard')
  .then(response => response.json())
  .then(data => console.log(data));

// Search customers
fetch('/api/customers?search=acm&page=1')
  .then(response => response.json())
  .then(data => console.log(data.customers));

// Get customer details
fetch('/api/customers/ACM001')
  .then(response => response.json())
  .then(data => {
    console.log('Customer:', data.customer);
    console.log('Vehicles:', data.vehicles);
    console.log('Jobs:', data.jobs);
  });
```

## Future API Features

### Planned Endpoints
- `POST /api/customers` - Create new customer
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/{id}` - Update vehicle
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/{id}` - Update job status
- `POST /api/invoices` - Generate invoice

### Authentication
- API key authentication
- JWT token support
- Role-based access control

### Advanced Features
- Webhook support
- Bulk operations
- Data export endpoints
- Real-time notifications

---

**For more information, see the main README.md file.**

