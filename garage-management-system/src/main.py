import os
import sys
# DON'T CHANGE THIS PATH - it's required for the deployment environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
from datetime import datetime, timedelta
from models.vehicle import Vehicle
from models import db
from config import config

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, origins="*")

# Load configuration
app.config.from_object(config['development'])

# Initialize SQLAlchemy
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

def format_date_for_display(date_string):
    """Convert date from YYYY-MM-DD to DD-MM-YYYY format for display"""
    if not date_string or date_string == '-' or date_string == '':
        return '-'
    
    try:
        # Parse the date string
        if '-' in date_string:
            # Handle YYYY-MM-DD format
            date_obj = datetime.strptime(date_string, '%Y-%m-%d')
        elif '/' in date_string:
            # Handle MM/DD/YYYY or DD/MM/YYYY format
            date_obj = datetime.strptime(date_string, '%m/%d/%Y')
        else:
            return date_string  # Return as-is if format is unrecognized
        
        # Format as DD-MM-YYYY
        return date_obj.strftime('%d-%m-%Y')
    except ValueError:
        return date_string  # Return original if parsing fails

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    """Get all vehicles with optional filtering"""
    try:
        # Get query parameters
        registration = request.args.get('registration')
        customer_id = request.args.get('customer_id')
        
        # Base query
        query = Vehicle.query
        
        # Apply filters if provided
        if registration:
            query = query.filter(Vehicle.registration.ilike(f'%{registration}%'))
        if customer_id:
            query = query.filter(Vehicle.customer_id == customer_id)
        
        # Execute query
        vehicles = query.all()
        
        # Format response
        vehicle_list = []
        for vehicle in vehicles:
            vehicle_data = vehicle.to_dict()
            vehicle_data['mot_due'] = format_date_for_display(vehicle_data['mot_expiry'])
            vehicle_data['tax_due'] = format_date_for_display(vehicle_data['tax_due'])
            vehicle_list.append(vehicle_data)
        
        return jsonify({
            'status': 'success',
            'data': vehicle_list
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/vehicles/<vehicle_id>', methods=['GET'])
def get_vehicle_detail(vehicle_id):
    """Get detailed information about a specific vehicle"""
    try:
        vehicle = Vehicle.query.get(vehicle_id)
        
        if not vehicle:
            return jsonify({
                'status': 'error',
                'message': 'Vehicle not found'
            }), 404
        
        vehicle_data = vehicle.to_dict()
        vehicle_data['mot_due'] = format_date_for_display(vehicle_data['mot_expiry'])
        vehicle_data['tax_due'] = format_date_for_display(vehicle_data['tax_due'])
        
        return jsonify({
            'status': 'success',
            'data': vehicle_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/vehicles', methods=['POST'])
def create_vehicle():
    """Create a new vehicle with DVLA data"""
    try:
        data = request.get_json()
        
        if not data or 'registration' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Registration number is required'
            }), 400
        
        # Create new vehicle (this will automatically fetch DVLA data)
        vehicle = Vehicle(registration=data['registration'])
        
        # Add customer_id if provided
        if 'customer_id' in data:
            vehicle.customer_id = data['customer_id']
        
        # Save to database
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': vehicle.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/vehicles/<vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update vehicle information"""
    try:
        vehicle = Vehicle.query.get(vehicle_id)
        
        if not vehicle:
            return jsonify({
                'status': 'error',
                'message': 'Vehicle not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'registration' in data:
            vehicle.registration = data['registration']
            # Fetch new DVLA data
            vehicle.fetch_dvla_data()
        
        if 'customer_id' in data:
            vehicle.customer_id = data['customer_id']
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': vehicle.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)

