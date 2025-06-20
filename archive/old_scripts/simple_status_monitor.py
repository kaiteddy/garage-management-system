#!/usr/bin/env python3
"""
Simple Status Monitor for Garage Management System
Monitors system health and prevents crashes
"""

import json
import os
import time
from datetime import datetime

import requests


class SimpleStatusMonitor:
    def __init__(self):
        self.base_url = "http://127.0.0.1:5001"
        self.endpoints = [
            "/api/stats",
            "/api/customers",
            "/api/vehicles",
            "/api/jobs",
            "/api/invoices"
        ]
        self.status_log = []

    def check_endpoint(self, endpoint):
        """Check if an endpoint is responding"""
        try:
            response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
            return {
                'endpoint': endpoint,
                'status': response.status_code,
                'response_time': response.elapsed.total_seconds(),
                'success': response.status_code == 200
            }
        except Exception as e:
            return {
                'endpoint': endpoint,
                'status': 'ERROR',
                'response_time': None,
                'success': False,
                'error': str(e)
            }

    def check_system_health(self):
        """Check overall system health"""
        print(
            f"\n🔍 System Health Check - {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 50)

        results = []
        total_endpoints = len(self.endpoints)
        successful_endpoints = 0

        for endpoint in self.endpoints:
            result = self.check_endpoint(endpoint)
            results.append(result)

            if result['success']:
                successful_endpoints += 1
                status_icon = "✅"
                print(
                    f"{status_icon} {endpoint:<20} {result['status']} ({result['response_time']:.2f}s)")
            else:
                status_icon = "❌"
                error_msg = result.get('error', 'Unknown error')
                print(
                    f"{status_icon} {endpoint:<20} {result['status']} - {error_msg}")

        # Calculate health percentage
        health_percentage = (successful_endpoints / total_endpoints) * 100

        print(
            f"\n📊 System Health: {health_percentage:.1f}% ({successful_endpoints}/{total_endpoints} endpoints)")

        # Health status
        if health_percentage >= 90:
            print("🟢 Status: EXCELLENT")
        elif health_percentage >= 70:
            print("🟡 Status: GOOD")
        elif health_percentage >= 50:
            print("🟠 Status: WARNING")
        else:
            print("🔴 Status: CRITICAL")

        return {
            'timestamp': datetime.now().isoformat(),
            'health_percentage': health_percentage,
            'successful_endpoints': successful_endpoints,
            'total_endpoints': total_endpoints,
            'results': results
        }

    def save_status_log(self, status):
        """Save status to log file"""
        try:
            log_file = "system_health_log.json"

            # Load existing log
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    log_data = json.load(f)
            else:
                log_data = []

            # Add new status
            log_data.append(status)

            # Keep only last 100 entries
            if len(log_data) > 100:
                log_data = log_data[-100:]

            # Save log
            with open(log_file, 'w') as f:
                json.dump(log_data, f, indent=2)

        except Exception as e:
            print(f"❌ Failed to save log: {e}")

    def monitor_continuously(self, interval=30):
        """Monitor system continuously"""
        print("🚀 Starting continuous system monitoring...")
        print(f"📊 Checking every {interval} seconds")
        print("Press Ctrl+C to stop")

        try:
            while True:
                status = self.check_system_health()
                self.save_status_log(status)

                # Alert if health is poor
                if status['health_percentage'] < 70:
                    print("⚠️  ALERT: System health is below 70%!")

                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")
        except Exception as e:
            print(f"\n❌ Monitoring error: {e}")

    def quick_check(self):
        """Perform a quick health check"""
        status = self.check_system_health()
        self.save_status_log(status)
        return status


def main():
    monitor = SimpleStatusMonitor()

    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--continuous":
        monitor.monitor_continuously()
    else:
        monitor.quick_check()


if __name__ == "__main__":
    main()
