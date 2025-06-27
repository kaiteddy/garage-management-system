#!/usr/bin/env python3
"""
Add sample MOT data for testing
"""

import json
import random
from datetime import datetime, timedelta

import requests

# Sample vehicle data
sample_vehicles = [
    {
        "registration": "LN64XFG",
        "make": "Real Vehicle",
        "model": "Test",
        "customer_name": "John Smith",
        "mobile": "07700900123",
        "email": "john.smith@email.com",
        # Expired
        "mot_expiry": (datetime.now() + timedelta(days=-5)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "FG34HIJ",
        "make": "Vauxhall",
        "model": "Astra",
        "customer_name": "Sarah Johnson",
        "mobile": "07700900456",
        "email": "sarah.johnson@email.com",
        # Critical
        "mot_expiry": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "KL56MNO",
        "make": "BMW",
        "model": "320i",
        "customer_name": "Mike Wilson",
        "mobile": "07700900789",
        "email": "mike.wilson@email.com",
        # Due Soon
        "mot_expiry": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "PQ78RST",
        "make": "Audi",
        "model": "A4",
        "customer_name": "Emma Davis",
        "mobile": "07700900012",
        "email": "emma.davis@email.com",
        # Valid
        "mot_expiry": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "UV90WXY",
        "make": "Toyota",
        "model": "Corolla",
        "customer_name": "David Brown",
        "mobile": "07700900345",
        "email": "david.brown@email.com",
        # Valid
        "mot_expiry": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "ZA12BCD",
        "make": "Honda",
        "model": "Civic",
        "customer_name": "Lisa Taylor",
        "mobile": "07700900678",
        "email": "lisa.taylor@email.com",
        # Expired
        "mot_expiry": (datetime.now() + timedelta(days=-15)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "EF34GHI",
        "make": "Nissan",
        "model": "Qashqai",
        "customer_name": "Robert Miller",
        "mobile": "07700900901",
        "email": "robert.miller@email.com",
        # Critical
        "mot_expiry": (datetime.now() + timedelta(days=6)).strftime("%Y-%m-%d"),
    },
    {
        "registration": "JK56LMN",
        "make": "Mercedes",
        "model": "C-Class",
        "customer_name": "Amanda White",
        "mobile": "07700900234",
        "email": "amanda.white@email.com",
        # Due Soon
        "mot_expiry": (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d"),
    }
]


def add_sample_data():
    """Add sample MOT vehicles to the system"""
    base_url = "http://localhost:8001"  # Use MOT service directly

    print("🚗 Adding sample MOT data...")

    for vehicle in sample_vehicles:
        try:
            # Try to add vehicle via MOT API (using correct parameter names)
            mot_data = {
                "registration": vehicle["registration"],
                "customer_name": vehicle["customer_name"],
                "mobile_number": vehicle["mobile"]
            }
            response = requests.post(
                f"{base_url}/api/mot/vehicles",
                json=mot_data,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print(
                        f"✅ Added vehicle: {vehicle['registration']} - {vehicle['make']} {vehicle['model']}")
                else:
                    print(
                        f"❌ Failed to add {vehicle['registration']}: {result.get('error', 'Unknown error')}")
            else:
                print(
                    f"❌ HTTP error for {vehicle['registration']}: {response.status_code}")

        except Exception as e:
            print(f"❌ Error adding {vehicle['registration']}: {e}")

    print("\n📊 Sample data addition complete!")

    # Check final count
    try:
        response = requests.get(f"{base_url}/api/mot/vehicles")
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Total vehicles in system: {data.get('count', 0)}")
        else:
            print("❌ Could not verify vehicle count")
    except Exception as e:
        print(f"❌ Error checking vehicle count: {e}")


if __name__ == "__main__":
    add_sample_data()
