#!/usr/bin/env python3
"""
Demo script to show urgency sorting and list view functionality
"""

import os
import sys
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def create_demo_vehicles_with_urgency():
    """Create demo vehicles with different urgency levels"""

    # Sample vehicles with different MOT expiry scenarios
    demo_vehicles = [
        {
            'registration': 'EXPIRED1',
            'make': 'FORD',
            'model': 'FOCUS',
            'mot_expiry_date': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
            'days_until_expiry': -30,
            'is_expired': True,
            'last_test_date': (datetime.now() - timedelta(days=395)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'EXPIRED2',
            'make': 'VAUXHALL',
            'model': 'ASTRA',
            'mot_expiry_date': (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d'),
            'days_until_expiry': -5,
            'is_expired': True,
            'last_test_date': (datetime.now() - timedelta(days=370)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'CRITICAL1',
            'make': 'BMW',
            'model': '320D',
            'mot_expiry_date': (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
            'days_until_expiry': 3,
            'is_expired': False,
            'last_test_date': (datetime.now() - timedelta(days=362)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'CRITICAL2',
            'make': 'AUDI',
            'model': 'A4',
            'mot_expiry_date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'days_until_expiry': 7,
            'is_expired': False,
            'last_test_date': (datetime.now() - timedelta(days=358)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'DUESOON1',
            'make': 'TOYOTA',
            'model': 'COROLLA',
            'mot_expiry_date': (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d'),
            'days_until_expiry': 15,
            'is_expired': False,
            'last_test_date': (datetime.now() - timedelta(days=350)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'DUESOON2',
            'make': 'HONDA',
            'model': 'CIVIC',
            'mot_expiry_date': (datetime.now() + timedelta(days=25)).strftime('%Y-%m-%d'),
            'days_until_expiry': 25,
            'is_expired': False,
            'last_test_date': (datetime.now() - timedelta(days=340)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'VALID001',
            'make': 'MERCEDES',
            'model': 'C-CLASS',
            'mot_expiry_date': (datetime.now() + timedelta(days=120)).strftime('%Y-%m-%d'),
            'days_until_expiry': 120,
            'is_expired': False,
            'last_test_date': (datetime.now() - timedelta(days=245)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        },
        {
            'registration': 'VALID002',
            'make': 'VOLKSWAGEN',
            'model': 'GOLF',
            'mot_expiry_date': (datetime.now() + timedelta(days=300)).strftime('%Y-%m-%d'),
            'days_until_expiry': 300,
            'is_expired': False,
            'last_test_date': (datetime.now() - timedelta(days=65)).strftime('%Y-%m-%d'),
            'test_result': 'PASSED'
        }
    ]

    return demo_vehicles


def demonstrate_sorting():
    """Demonstrate the sorting logic"""
    print("MOT Reminder Tool - Urgency Sorting Demo")
    print("=" * 60)

    vehicles = create_demo_vehicles_with_urgency()

    # Sort vehicles by urgency (same logic as in the app)
    sorted_vehicles = sorted(vehicles, key=lambda v: (
        0 if v['is_expired'] else 1,  # Expired vehicles first
        v['days_until_expiry'] if not v['is_expired'] else -v['days_until_expiry']
    ))

    print("\n🚨 VEHICLES SORTED BY URGENCY (Most urgent first):")
    print("-" * 60)

    for i, vehicle in enumerate(sorted_vehicles, 1):
        if vehicle['is_expired']:
            status = f"🔴 EXPIRED ({abs(vehicle['days_until_expiry'])} days ago)"
            urgency = "URGENT"
        elif vehicle['days_until_expiry'] <= 7:
            status = f"🟠 CRITICAL ({vehicle['days_until_expiry']} days left)"
            urgency = "CRITICAL"
        elif vehicle['days_until_expiry'] <= 30:
            status = f"🟡 DUE SOON ({vehicle['days_until_expiry']} days left)"
            urgency = "WARNING"
        else:
            status = f"🟢 VALID ({vehicle['days_until_expiry']} days left)"
            urgency = "OK"

        print(
            f"{i:2d}. {vehicle['registration']:10s} | {vehicle['make']:10s} {vehicle['model']:10s} | {status:30s} | {urgency}")

    # Calculate statistics
    stats = {
        'total': len(sorted_vehicles),
        'expired': len([v for v in sorted_vehicles if v['is_expired']]),
        'critical': len([v for v in sorted_vehicles if not v['is_expired'] and v['days_until_expiry'] <= 7]),
        'due_soon': len([v for v in sorted_vehicles if not v['is_expired'] and 7 < v['days_until_expiry'] <= 30]),
        'valid': len([v for v in sorted_vehicles if not v['is_expired'] and v['days_until_expiry'] > 30])
    }

    print("\n📊 STATISTICS SUMMARY:")
    print("-" * 60)
    print(f"Total Vehicles:     {stats['total']:3d}")
    print(f"🔴 Expired:         {stats['expired']:3d}")
    print(f"🟠 Critical (≤7d):  {stats['critical']:3d}")
    print(f"🟡 Due Soon (8-30d): {stats['due_soon']:3d}")
    print(f"🟢 Valid (>30d):    {stats['valid']:3d}")

    urgent_count = stats['expired'] + stats['critical']
    urgent_percentage = (
        urgent_count / stats['total'] * 100) if stats['total'] > 0 else 0
    print(f"⚠️  Urgent Total:    {urgent_count:3d} ({urgent_percentage:.1f}%)")

    print("\n✨ NEW FEATURES DEMONSTRATED:")
    print("-" * 60)
    print("✅ List view with sortable table")
    print("✅ Urgency-based sorting (expired first)")
    print("✅ Color-coded status indicators")
    print("✅ Statistics summary dashboard")
    print("✅ Pulsing animation for urgent items")
    print("✅ Toggle between list and card views")
    print("✅ Responsive design for mobile")
    print("✅ Enhanced visual hierarchy")

    print(f"\n🌐 View the enhanced interface at: http://127.0.0.1:5001")
    print("📝 The list view shows vehicles sorted by urgency with clear visual indicators!")


if __name__ == "__main__":
    demonstrate_sorting()
