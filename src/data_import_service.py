#!/usr/bin/env python3
"""
Data Import Service for Garage Management System
Handles importing real customer, vehicle, and job data from CSV and Excel files
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataImportService:
    """Service for importing real data into the garage management system"""

    def __init__(self, data_dir: str = "."):
        self.data_dir = Path(data_dir)
        self.imported_data = {
            "customers": [],
            "vehicles": [],
            "jobs": [],
            "invoices": [],
            "documents": []
        }

    def import_eli_motors_customers(self, file_path: str = "eli_motors_customers_sample.csv") -> List[Dict]:
        """Import customer data from ELI MOTORS CSV file"""
        try:
            file_path = self.data_dir / file_path
            if not file_path.exists():
                logger.warning(f"Customer file not found: {file_path}")
                return []

            df = pd.read_csv(file_path)
            customers = []

            for _, row in df.iterrows():
                customer = {
                    "id": len(customers) + 1,
                    "name": self._build_customer_name(row),
                    "email": self._clean_email(row.get('contactEmail', '')),
                    "phone": self._clean_phone(row.get('contactTelephone', '')),
                    "mobile": self._clean_phone(row.get('contactMobile', '')),
                    "address": self._build_address(row),
                    "account_number": row.get('AccountNumber', ''),
                    "account_status": row.get('AccountStatus', 0),
                    "credit_limit": row.get('AccountCreditLimit', 30),
                    "classification": row.get('classification', 'Retail Customer'),
                    "created_date": self._parse_date(row.get('sys_TimeStamp_Creation', '')),
                    "last_invoice_date": self._parse_date(row.get('status_LastInvoiceDate', '')),
                    "notes": row.get('Notes', ''),
                    "regular_customer": bool(row.get('regularCustomer', 1)),
                    "reminders_allowed": bool(row.get('remindersAllowed', 1))
                }
                customers.append(customer)

            self.imported_data["customers"] = customers
            logger.info(f"Imported {len(customers)} customers from ELI MOTORS")
            return customers

        except Exception as e:
            logger.error(f"Error importing customers: {e}")
            return []

    def import_eli_motors_vehicles(self, file_path: str = "eli_motors_vehicles_sample.csv") -> List[Dict]:
        """Import vehicle data from ELI MOTORS CSV file"""
        try:
            file_path = self.data_dir / file_path
            if not file_path.exists():
                logger.warning(f"Vehicle file not found: {file_path}")
                return []

            df = pd.read_csv(file_path)
            vehicles = []

            for _, row in df.iterrows():
                vehicle = {
                    "id": len(vehicles) + 1,
                    "registration": row.get('Registration', '').upper().strip(),
                    "make": row.get('Make', ''),
                    "model": row.get('Model', ''),
                    "year": self._parse_year(row.get('Year', '')),
                    "vin": row.get('VIN', ''),
                    "engine_size": row.get('EngineSize', ''),
                    "fuel_type": row.get('FuelType', ''),
                    "colour": row.get('Colour', ''),
                    "customer_id": self._link_to_customer(row),
                    "customer_name": row.get('CustomerName', ''),
                    "mot_expiry": self._parse_date(row.get('MOTExpiry', '')),
                    "tax_expiry": self._parse_date(row.get('TaxExpiry', '')),
                    "last_service": self._parse_date(row.get('LastService', '')),
                    "mileage": self._parse_int(row.get('Mileage', 0)),
                    "archived": False,
                    "notes": row.get('Notes', '')
                }
                vehicles.append(vehicle)

            self.imported_data["vehicles"] = vehicles
            logger.info(f"Imported {len(vehicles)} vehicles from ELI MOTORS")
            return vehicles

        except Exception as e:
            logger.error(f"Error importing vehicles: {e}")
            return []

    def import_eli_motors_documents(self, file_path: str = "eli_motors_documents_sample.csv") -> List[Dict]:
        """Import job/invoice documents from ELI MOTORS CSV file"""
        try:
            file_path = self.data_dir / file_path
            if not file_path.exists():
                logger.warning(f"Documents file not found: {file_path}")
                return []

            df = pd.read_csv(file_path)
            jobs = []
            invoices = []

            for _, row in df.iterrows():
                doc_type = row.get('Type', '').lower()

                if 'invoice' in doc_type or 'job' in doc_type:
                    # Create job record
                    job = {
                        "id": len(jobs) + 1,
                        "job_number": row.get('DocumentNumber', f"JOB-{len(jobs)+1:04d}"),
                        "customer_name": row.get('CustomerName', ''),
                        "customer_id": self._link_to_customer(row),
                        "vehicle_registration": row.get('Registration', ''),
                        "description": row.get('Description', ''),
                        "status": self._determine_job_status(row),
                        "created_date": self._parse_date(row.get('Date', '')),
                        "total_amount": self._parse_float(row.get('Total', 0)),
                        "labour_amount": self._parse_float(row.get('Labour', 0)),
                        "parts_amount": self._parse_float(row.get('Parts', 0)),
                        "vat_amount": self._parse_float(row.get('VAT', 0)),
                        "notes": row.get('Notes', '')
                    }
                    jobs.append(job)

                    # Create invoice record if it's an invoice
                    if 'invoice' in doc_type:
                        invoice = {
                            "id": len(invoices) + 1,
                            "invoice_number": row.get('DocumentNumber', f"INV-{len(invoices)+1:04d}"),
                            "job_id": job["id"],
                            "customer_name": job["customer_name"],
                            "customer_id": job["customer_id"],
                            "amount": job["total_amount"],
                            "status": "PAID" if row.get('Paid', False) else "PENDING",
                            "date": job["created_date"],
                            "due_date": self._calculate_due_date(job["created_date"]),
                            "vat_amount": job["vat_amount"],
                            "subtotal": job["total_amount"] - job["vat_amount"]
                        }
                        invoices.append(invoice)

            self.imported_data["jobs"] = jobs
            self.imported_data["invoices"] = invoices
            logger.info(
                f"Imported {len(jobs)} jobs and {len(invoices)} invoices from ELI MOTORS")
            return {"jobs": jobs, "invoices": invoices}

        except Exception as e:
            logger.error(f"Error importing documents: {e}")
            return {"jobs": [], "invoices": []}

    def import_ga4_data(self, data_dir: str = "ga4_complete_data") -> Dict[str, List]:
        """Import data from GA4 complete data Excel files"""
        try:
            ga4_dir = self.data_dir / data_dir
            if not ga4_dir.exists():
                logger.warning(f"GA4 data directory not found: {ga4_dir}")
                return {}

            results = {}

            # Import customers from Excel
            customers_file = ga4_dir / "customers.xlsx"
            if customers_file.exists():
                df = pd.read_excel(customers_file)
                customers = self._process_ga4_customers(df)
                results["customers"] = customers
                self.imported_data["customers"].extend(customers)

            # Import vehicles from Excel
            vehicles_file = ga4_dir / "vehicles.xlsx"
            if vehicles_file.exists():
                df = pd.read_excel(vehicles_file)
                vehicles = self._process_ga4_vehicles(df)
                results["vehicles"] = vehicles
                self.imported_data["vehicles"].extend(vehicles)

            # Import documents from Excel
            documents_file = ga4_dir / "documents.xlsx"
            if documents_file.exists():
                df = pd.read_excel(documents_file)
                docs = self._process_ga4_documents(df)
                results.update(docs)
                self.imported_data["jobs"].extend(docs.get("jobs", []))
                self.imported_data["invoices"].extend(docs.get("invoices", []))

            logger.info(f"Imported GA4 data: {len(results)} datasets")
            return results

        except Exception as e:
            logger.error(f"Error importing GA4 data: {e}")
            return {}

    def get_imported_data(self) -> Dict[str, List]:
        """Get all imported data"""
        return self.imported_data

    def export_to_json(self, output_file: str = "imported_data.json") -> bool:
        """Export imported data to JSON file"""
        try:
            output_path = self.data_dir / output_file
            with open(output_path, 'w') as f:
                json.dump(self.imported_data, f, indent=2, default=str)
            logger.info(f"Exported data to {output_path}")
            return True
        except Exception as e:
            logger.error(f"Error exporting data: {e}")
            return False

    # Helper methods
    def _build_customer_name(self, row) -> str:
        """Build customer name from row data"""
        title = row.get('nameTitle', '')
        forename = row.get('nameForename', '')
        surname = row.get('nameSurname', '')
        company = row.get('nameCompany', '')

        if company:
            return company

        name_parts = [title, forename, surname]
        return ' '.join([part for part in name_parts if part]).strip()

    def _build_address(self, row) -> str:
        """Build address from row data"""
        parts = [
            row.get('addressHouseNo', ''),
            row.get('addressRoad', ''),
            row.get('addressLocality', ''),
            row.get('addressTown', ''),
            row.get('addressCounty', ''),
            row.get('addressPostCode', '')
        ]
        return ', '.join([part for part in parts if part]).strip()

    def _clean_email(self, email: str) -> str:
        """Clean and validate email"""
        if pd.isna(email) or not email:
            return ""
        return str(email).strip().lower()

    def _clean_phone(self, phone: str) -> str:
        """Clean phone number"""
        if pd.isna(phone) or not phone:
            return ""
        return str(phone).strip()

    def _parse_date(self, date_str: str) -> str:
        """Parse date string to ISO format"""
        if pd.isna(date_str) or not date_str:
            return ""
        try:
            # Handle various date formats
            if isinstance(date_str, str):
                # Try common formats
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                    try:
                        dt = pd.to_datetime(date_str, format=fmt)
                        return dt.strftime('%Y-%m-%d')
                    except:
                        continue
            return str(date_str)
        except:
            return ""

    def _parse_year(self, year_str: str) -> int:
        """Parse year from string"""
        try:
            return int(float(str(year_str)))
        except:
            return 0

    def _parse_int(self, value) -> int:
        """Parse integer from value"""
        try:
            return int(float(str(value)))
        except:
            return 0

    def _parse_float(self, value) -> float:
        """Parse float from value"""
        try:
            return float(str(value))
        except:
            return 0.0

    def _link_to_customer(self, row) -> int:
        """Link record to customer by matching name or other criteria"""
        # Simple linking - in real implementation would use more sophisticated matching
        customer_name = row.get('CustomerName', '')
        for i, customer in enumerate(self.imported_data["customers"]):
            if customer["name"].lower() == customer_name.lower():
                return customer["id"]
        return 1  # Default to first customer if no match

    def _determine_job_status(self, row) -> str:
        """Determine job status from row data"""
        if row.get('Completed', False):
            return "COMPLETED"
        elif row.get('InProgress', False):
            return "IN_PROGRESS"
        else:
            return "PENDING"

    def _calculate_due_date(self, date_str: str) -> str:
        """Calculate due date (30 days from invoice date)"""
        try:
            dt = pd.to_datetime(date_str)
            due_dt = dt + pd.Timedelta(days=30)
            return due_dt.strftime('%Y-%m-%d')
        except:
            return date_str

    def _process_ga4_customers(self, df: pd.DataFrame) -> List[Dict]:
        """Process GA4 customers data"""
        customers = []
        for _, row in df.iterrows():
            customer = {
                "id": len(self.imported_data["customers"]) + len(customers) + 1,
                "name": str(row.get('Name', f'Customer {len(customers)+1}')),
                "email": self._clean_email(row.get('Email', '')),
                "phone": self._clean_phone(row.get('Phone', '')),
                "address": str(row.get('Address', '')),
                "created_date": self._parse_date(row.get('Created', '')),
                "classification": "Retail Customer",
                "regular_customer": True,
                "reminders_allowed": True
            }
            customers.append(customer)
        return customers

    def _process_ga4_vehicles(self, df: pd.DataFrame) -> List[Dict]:
        """Process GA4 vehicles data"""
        vehicles = []
        for _, row in df.iterrows():
            vehicle = {
                "id": len(self.imported_data["vehicles"]) + len(vehicles) + 1,
                "registration": str(row.get('Registration', '')).upper().strip(),
                "make": str(row.get('Make', '')),
                "model": str(row.get('Model', '')),
                "year": self._parse_year(row.get('Year', '')),
                "customer_id": self._link_to_customer(row),
                "mot_expiry": self._parse_date(row.get('MOT_Expiry', '')),
                "last_service": self._parse_date(row.get('Last_Service', '')),
                "archived": False
            }
            vehicles.append(vehicle)
        return vehicles

    def _process_ga4_documents(self, df: pd.DataFrame) -> Dict[str, List]:
        """Process GA4 documents data"""
        jobs = []
        invoices = []

        for _, row in df.iterrows():
            job = {
                "id": len(self.imported_data["jobs"]) + len(jobs) + 1,
                "job_number": str(row.get('Job_Number', f'JOB-{len(jobs)+1:04d}')),
                "customer_name": str(row.get('Customer', '')),
                "description": str(row.get('Description', '')),
                "status": "COMPLETED",
                "created_date": self._parse_date(row.get('Date', '')),
                "total_amount": self._parse_float(row.get('Total', 0))
            }
            jobs.append(job)

        return {"jobs": jobs, "invoices": invoices}


if __name__ == "__main__":
    # Test the import service
    service = DataImportService()

    # Import ELI MOTORS data
    customers = service.import_eli_motors_customers()
    vehicles = service.import_eli_motors_vehicles()
    documents = service.import_eli_motors_documents()

    # Import GA4 data
    ga4_data = service.import_ga4_data()

    # Export to JSON
    service.export_to_json()

    print(f"Import complete:")
    print(f"- Customers: {len(service.imported_data['customers'])}")
    print(f"- Vehicles: {len(service.imported_data['vehicles'])}")
    print(f"- Jobs: {len(service.imported_data['jobs'])}")
    print(f"- Invoices: {len(service.imported_data['invoices'])}")
