#!/usr/bin/env python3
"""
Simple MOT API service that bypasses database issues
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add mot_reminder to path
sys.path.append('mot_reminder')

from mot_reminder import MOTReminder
from dotenv import load_dotenv

# Load environment variables
load_dotenv('mot_reminder/.env')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize MOT reminder
mot_reminder = MOTReminder()

@app.route('/api/mot/vehicles', methods=['POST'])
def check_mot_vehicle():
    """Check MOT status for a vehicle"""
    try:
        data = request.get_json()
        if not data or 'registration' not in data:
            return jsonify({
                'success': False,
                'error': 'Registration number is required'
            }), 400
        
        registration = data['registration'].strip().upper().replace(' ', '')
        print(f"🔍 Checking MOT for: {registration}")
        
        # Get MOT data from DVLA
        mot_data = mot_reminder.check_mot_status(registration)
        
        if mot_data:
            print(f"✅ Found data for {registration}: {mot_data['make']} {mot_data['model']}")
            return jsonify({
                'success': True,
                'data': mot_data
            })
        else:
            print(f"❌ No data found for {registration}")
            return jsonify({
                'success': False,
                'error': f'No MOT data found for registration {registration}'
            }), 404
            
    except Exception as e:
        print(f"💥 Error checking MOT: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error checking MOT status: {str(e)}'
        }), 500

@app.route('/api/mot/vehicles', methods=['GET'])
def list_vehicles():
    """List vehicles (placeholder)"""
    return jsonify({
        'success': True,
        'vehicles': []
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'MOT API',
        'dvla_integration': 'active'
    })

@app.route('/api/test/<registration>', methods=['GET'])
def test_registration(registration):
    """Test endpoint for quick registration checks"""
    try:
        registration = registration.strip().upper().replace(' ', '')
        print(f"🧪 Testing registration: {registration}")
        
        mot_data = mot_reminder.check_mot_status(registration)
        
        if mot_data:
            return jsonify({
                'success': True,
                'registration': registration,
                'data': mot_data
            })
        else:
            return jsonify({
                'success': False,
                'registration': registration,
                'error': 'No data found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'registration': registration,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Simple MOT API Service...")
    print("📡 DVLA Integration: Active")
    print("🌐 API URL: http://127.0.0.1:5002/api")
    print("🔧 Test endpoint: http://127.0.0.1:5002/api/test/EJ13UYV")
    print("⏹️  Press Ctrl+C to stop")
    
    app.run(host='127.0.0.1', port=5002, debug=True)
