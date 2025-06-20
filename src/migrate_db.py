import os
import sqlite3
import sys
from datetime import datetime

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from config import config
from models.vehicle import Vehicle

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


app = Flask(__name__)
app.config.from_object(config['development'])
db = SQLAlchemy(app)


def migrate_database():
    """Migrate the existing database to the new schema and fetch DVLA data"""
    try:
        # Connect to the old database
        old_db_path = os.path.join(os.path.dirname(
            os.path.abspath(__file__)), 'garage.db')
        conn = sqlite3.connect(old_db_path)
        cursor = conn.cursor()

        # Get all existing vehicles
        cursor.execute(
            'SELECT id, registration, make, model, color, fuel_type, mot_due, mileage, customer_id FROM vehicles')
        vehicles = cursor.fetchall()

        # Create new tables
        db.create_all()

        # Migrate each vehicle
        for vehicle in vehicles:
            # vehicle[1] is registration
            print(f"Processing vehicle: {vehicle[1]}")

            # Create new vehicle instance
            new_vehicle = Vehicle(registration=vehicle[1])

            # If DVLA fetch failed, use existing data
            if not new_vehicle.make:
                new_vehicle.make = vehicle[2]
                new_vehicle.model = vehicle[3]
                new_vehicle.color = vehicle[4]
                new_vehicle.fuel_type = vehicle[5]
                if vehicle[6]:  # mot_due
                    try:
                        new_vehicle.mot_expiry = datetime.strptime(
                            vehicle[6], '%Y-%m-%d').date()
                    except ValueError:
                        pass

            # Add customer_id
            new_vehicle.customer_id = vehicle[8]

            # Save to database
            db.session.add(new_vehicle)

        # Commit changes
        db.session.commit()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration error: {e}")
        db.session.rollback()
    finally:
        conn.close()


if __name__ == '__main__':
    with app.app_context():
        migrate_database()
