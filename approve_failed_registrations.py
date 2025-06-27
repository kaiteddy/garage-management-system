#!/usr/bin/env python3
"""
Approve failed registrations and add them as active MOT vehicles
"""

import json
from datetime import datetime, timedelta

import requests


def approve_failed_registrations():
    """Approve failed registrations and add them as active vehicles"""
    base_url = "http://localhost:8001"

    print("🔧 Approving failed registrations...")

    # Get failed registrations
    try:
        response = requests.get(f"{base_url}/api/mot/failed-registrations")
        if response.status_code != 200:
            print(
                f"❌ Failed to get failed registrations: {response.status_code}")
            return

        data = response.json()
        failed_registrations = data.get("failed_registrations", [])

        if not failed_registrations:
            print("ℹ️ No failed registrations to approve")
            return

        print(f"📋 Found {len(failed_registrations)} failed registrations")

        # Sample MOT expiry dates for different statuses
        sample_expiry_dates = {
            # Expired
            "LN64XFG": (datetime.now() + timedelta(days=-5)).strftime("%Y-%m-%d"),
            # Critical
            "FG34HIJ": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            # Due Soon
            "KL56MNO": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            # Valid
            "PQ78RST": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
            # Valid
            "UV90WXY": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
            # Expired
            "ZA12BCD": (datetime.now() + timedelta(days=-15)).strftime("%Y-%m-%d"),
            # Critical
            "EF34GHI": (datetime.now() + timedelta(days=6)).strftime("%Y-%m-%d"),
            # Due Soon
            "JK56LMN": (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d"),
        }

        # Sample vehicle data
        sample_vehicle_data = {
            "LN64XFG": {"make": "Ford", "model": "Focus", "year": 2018},
            "FG34HIJ": {"make": "Vauxhall", "model": "Astra", "year": 2019},
            "KL56MNO": {"make": "BMW", "model": "320i", "year": 2020},
            "PQ78RST": {"make": "Audi", "model": "A4", "year": 2021},
            "UV90WXY": {"make": "Toyota", "model": "Corolla", "year": 2019},
            "ZA12BCD": {"make": "Honda", "model": "Civic", "year": 2017},
            "EF34GHI": {"make": "Nissan", "model": "Qashqai", "year": 2020},
            "JK56LMN": {"make": "Mercedes", "model": "C-Class", "year": 2021},
        }

        # Process each failed registration
        for failed_reg in failed_registrations:
            registration = failed_reg["original_registration"]
            customer_name = failed_reg["customer_name"]
            mobile_number = failed_reg["mobile_number"]
            failed_id = failed_reg["id"]

            print(f"🔧 Processing {registration}...")

            # Get vehicle data for this registration
            vehicle_data = sample_vehicle_data.get(
                registration, {"make": "Unknown", "model": "Vehicle", "year": 2020})
            mot_expiry = sample_expiry_dates.get(
                registration, (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"))

            # Create manual vehicle data
            manual_vehicle_data = {
                "registration": registration,
                "customer_name": customer_name,
                "mobile_number": mobile_number,
                "make": vehicle_data["make"],
                "model": vehicle_data["model"],
                "year": vehicle_data["year"],
                "mot_expiry": mot_expiry,
                "manual_entry": True,
                "bypass_dvla": True
            }

            try:
                # Try to add vehicle manually
                response = requests.post(
                    f"{base_url}/api/mot/vehicles/manual",
                    json=manual_vehicle_data,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        print(f"✅ Added {registration} manually")

                        # Mark failed registration as resolved
                        resolve_data = {
                            "action": "resolved",
                            "corrected_registration": registration
                        }

                        resolve_response = requests.post(
                            f"{base_url}/api/mot/failed-registrations/{failed_id}/resolve",
                            json=resolve_data,
                            headers={"Content-Type": "application/json"}
                        )

                        if resolve_response.status_code == 200:
                            print(f"✅ Marked {registration} as resolved")
                        else:
                            print(
                                f"⚠️ Added {registration} but couldn't mark as resolved")
                    else:
                        print(
                            f"❌ Failed to add {registration}: {result.get('error', 'Unknown error')}")
                else:
                    print(
                        f"❌ HTTP error for {registration}: {response.status_code}")

            except Exception as e:
                print(f"❌ Error processing {registration}: {e}")

        print("\n📊 Processing complete!")

        # Check final count
        try:
            response = requests.get(f"{base_url}/api/mot/vehicles")
            if response.status_code == 200:
                data = response.json()
                print(
                    f"📋 Total vehicles in system: {data.get('total_count', 0)}")
            else:
                print("❌ Could not verify vehicle count")
        except Exception as e:
            print(f"❌ Error checking vehicle count: {e}")

    except Exception as e:
        print(f"❌ Error getting failed registrations: {e}")


if __name__ == "__main__":
    approve_failed_registrations()
