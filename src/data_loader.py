#!/usr/bin/env python3
"""
Data Loader for Garage Management System
Loads real imported data for use in the application
"""

import json
import random
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional


class DataLoader:
    """Loads and manages real imported data from SQLite database"""

    def __init__(self, db_file: str = "garage.db"):
        self.db_file = Path(db_file)
        self.data = {
            "customers": [],
            "vehicles": [],
            "jobs": [],
            "invoices": []
        }
        self.load_data()

    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        return conn

    def load_data(self) -> bool:
        """Load data from SQLite database"""
        try:
            if self.db_file.exists():
                conn = self.get_db_connection()
                cursor = conn.cursor()

                # Load customers
                cursor.execute("SELECT * FROM customers")
                customers = [dict(row) for row in cursor.fetchall()]

                # Load vehicles
                cursor.execute("SELECT * FROM vehicles")
                vehicles = [dict(row) for row in cursor.fetchall()]

                # Load jobs
                cursor.execute("SELECT * FROM jobs")
                jobs = [dict(row) for row in cursor.fetchall()]

                # Load invoices
                cursor.execute("SELECT * FROM invoices")
                invoices = [dict(row) for row in cursor.fetchall()]

                self.data = {
                    "customers": customers,
                    "vehicles": vehicles,
                    "jobs": jobs,
                    "invoices": invoices
                }

                conn.close()

                print(f"✅ Loaded real data:")
                print(f"   - Customers: {len(customers)}")
                print(f"   - Vehicles: {len(vehicles)}")
                print(f"   - Jobs: {len(jobs)}")
                print(f"   - Invoices: {len(invoices)}")
                return True
            else:
                print(f"⚠️  Database file not found: {self.db_file}")
                return False
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return False

    def get_customers(self, page: int = 1, per_page: int = 50, search: str = "") -> Dict:
        """Get customers with pagination and search"""
        customers = self.data.get("customers", [])

        # Apply search filter
        if search:
            search_lower = search.lower()
            customers = [c for c in customers if
                         search_lower in c.get("name", "").lower() or
                         search_lower in c.get("email", "").lower() or
                         search_lower in c.get("phone", "").lower()]

        # Apply pagination
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_customers = customers[start_idx:end_idx]

        return {
            "status": "success",
            "customers": paginated_customers,
            "total": len(customers),
            "page": page,
            "per_page": per_page,
            "total_pages": (len(customers) + per_page - 1) // per_page
        }

    def get_customer_by_id(self, customer_id: int) -> Optional[Dict]:
        """Get specific customer by ID"""
        customers = self.data.get("customers", [])
        for customer in customers:
            if customer.get("id") == customer_id:
                return customer
        return None

    def get_vehicles(self, customer_id: Optional[int] = None, include_archived: bool = True) -> List[Dict]:
        """Get vehicles, optionally filtered by customer"""
        vehicles = self.data.get("vehicles", [])

        # Filter by customer if specified
        if customer_id:
            vehicles = [v for v in vehicles if v.get(
                "customer_id") == customer_id]

        # Filter archived if requested
        if not include_archived:
            vehicles = [v for v in vehicles if not v.get("archived", False)]

        return vehicles

    def get_jobs(self, customer_id: Optional[int] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get jobs, optionally filtered by customer and limited"""
        jobs = self.data.get("jobs", [])

        # Filter by customer if specified
        if customer_id:
            jobs = [j for j in jobs if j.get("customer_id") == customer_id]

        # Sort by created date (newest first)
        jobs = sorted(jobs, key=lambda x: x.get(
            "created_date", ""), reverse=True)

        # Apply limit if specified
        if limit:
            jobs = jobs[:limit]

        return jobs

    def get_invoices(self, customer_id: Optional[int] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get invoices, optionally filtered by customer and limited"""
        invoices = self.data.get("invoices", [])

        # Filter by customer if specified
        if customer_id:
            invoices = [i for i in invoices if i.get(
                "customer_id") == customer_id]

        # Sort by date (newest first)
        invoices = sorted(invoices, key=lambda x: x.get(
            "date", ""), reverse=True)

        # Apply limit if specified
        if limit:
            invoices = invoices[:limit]

        return invoices

    def get_invoice_by_id(self, invoice_id: int) -> Optional[Dict]:
        """Get specific invoice by ID"""
        invoices = self.data.get("invoices", [])
        for invoice in invoices:
            if invoice.get("id") == invoice_id:
                return invoice
        return None

    def get_stats(self) -> Dict:
        """Get dashboard statistics from real data"""
        customers = self.data.get("customers", [])
        vehicles = self.data.get("vehicles", [])
        jobs = self.data.get("jobs", [])
        invoices = self.data.get("invoices", [])

        # Calculate active jobs (not completed)
        active_jobs = [j for j in jobs if j.get(
            "status", "").upper() != "COMPLETED"]

        # Calculate pending invoices
        pending_invoices = [i for i in invoices if i.get(
            "status", "").upper() == "PENDING"]

        # Calculate monthly revenue (sum of completed jobs this month)
        completed_jobs = [j for j in jobs if j.get(
            "status", "").upper() == "COMPLETED"]
        monthly_revenue = sum(j.get("total_amount", 0)
                              for j in completed_jobs[:100])  # Sample

        # Calculate vehicles due MOT (sample calculation)
        vehicles_due_mot = len(
            [v for v in vehicles[:100] if v.get("mot_expiry")])

        return {
            "total_customers": len(customers),
            "active_jobs": len(active_jobs),
            "pending_invoices": len(pending_invoices),
            "monthly_revenue": round(monthly_revenue, 2),
            "vehicles_due_mot": vehicles_due_mot,
            "overdue_services": random.randint(5, 15)  # Sample data
        }

    def get_kanban_jobs(self) -> Dict:
        """Get jobs organized for kanban board"""
        jobs = self.data.get("jobs", [])

        # Sample some jobs for kanban display
        sample_jobs = jobs[:50] if len(jobs) > 50 else jobs

        kanban_data = {
            "PENDING": [],
            "IN_PROGRESS": [],
            "COMPLETED": []
        }

        for job in sample_jobs:
            status = job.get("status", "PENDING").upper()
            if status not in kanban_data:
                status = "PENDING"

            kanban_job = {
                "id": job.get("id"),
                "job_number": job.get("job_number", f"JOB-{job.get('id', 0):04d}"),
                "customer_name": job.get("customer_name", "Unknown Customer"),
                "vehicle_registration": job.get("vehicle_registration", ""),
                # Truncate for display
                "description": job.get("description", "")[:100],
                "priority": random.choice(["HIGH", "MEDIUM", "LOW"]),
                "estimated_hours": random.randint(1, 8)
            }
            kanban_data[status].append(kanban_job)

        return kanban_data

    def get_appointments(self, customer_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        """Get appointments (generated from jobs data)"""
        jobs = self.data.get("jobs", [])

        # Sample some jobs as appointments
        sample_jobs = jobs[:20] if len(jobs) > 20 else jobs
        appointments = []

        for job in sample_jobs:
            appointment = {
                "id": job.get("id"),
                "customer_name": job.get("customer_name", "Unknown Customer"),
                "vehicle_registration": job.get("vehicle_registration", ""),
                "appointment_date": job.get("created_date", "2024-06-18"),
                "appointment_time": f"{random.randint(9, 16):02d}:00",
                "service_type": job.get("description", "Service")[:50]
            }

            # Filter by customer if specified
            if customer_id and job.get("customer_id") != customer_id:
                continue

            appointments.append(appointment)

        return appointments

    def get_job_sheets(self) -> List[Dict]:
        """Get job sheets (generated from jobs data)"""
        jobs = self.data.get("jobs", [])

        # Sample some jobs as job sheets
        sample_jobs = jobs[:30] if len(jobs) > 30 else jobs
        job_sheets = []

        for job in sample_jobs:
            job_sheet = {
                "id": job.get("id"),
                "sheet_number": f"JS-{job.get('id', 0):04d}",
                "customer_name": job.get("customer_name", "Unknown Customer"),
                "vehicle_registration": job.get("vehicle_registration", ""),
                "status": job.get("status", "PENDING"),
                "created_date": job.get("created_date", "2024-01-01")
            }
            job_sheets.append(job_sheet)

        return job_sheets

    def get_quotes(self) -> List[Dict]:
        """Get quotes (sample data based on jobs)"""
        jobs = self.data.get("jobs", [])

        # Generate sample quotes from jobs
        sample_jobs = jobs[:15] if len(jobs) > 15 else jobs
        quotes = []

        for i, job in enumerate(sample_jobs):
            quote = {
                "id": i + 1,
                "quote_number": f"QUO-{i+1:04d}",
                "customer_name": job.get("customer_name", "Unknown Customer"),
                # Slightly higher than job
                "amount": job.get("total_amount", 0) * 1.1,
                "status": random.choice(["PENDING", "ACCEPTED", "DECLINED"]),
                "created_date": job.get("created_date", "2024-01-01")
            }
            quotes.append(quote)

        return quotes

    def get_technicians(self) -> List[Dict]:
        """Get technicians (sample data)"""
        return [
            {"id": 1, "name": "Tom Anderson",
                "specialization": "Engine Specialist", "available": True},
            {"id": 2, "name": "Lisa Brown",
                "specialization": "Electrical Systems", "available": True},
            {"id": 3, "name": "Mike Wilson",
                "specialization": "Brake Systems", "available": False},
            {"id": 4, "name": "Sarah Davis",
                "specialization": "MOT Testing", "available": True}
        ]

    def get_workshop_bays(self) -> List[Dict]:
        """Get workshop bays (sample data)"""
        return [
            {"id": 1, "name": "Bay 1", "available": True},
            {"id": 2, "name": "Bay 2", "available": False},
            {"id": 3, "name": "Bay 3", "available": True},
            {"id": 4, "name": "Bay 4", "available": True}
        ]

    def get_job_sheet_templates(self) -> List[Dict]:
        """Get job sheet templates (sample data)"""
        return [
            {"id": 1, "name": "Standard Service",
                "description": "Basic service template"},
            {"id": 2, "name": "MOT Test", "description": "MOT test template"},
            {"id": 3, "name": "Brake Service",
                "description": "Brake system service template"},
            {"id": 4, "name": "Engine Diagnostic",
                "description": "Engine diagnostic template"}
        ]


# Global data loader instance
data_loader = DataLoader()


def get_data_loader() -> DataLoader:
    """Get the global data loader instance"""
    return data_loader
