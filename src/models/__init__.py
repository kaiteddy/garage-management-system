from datetime import datetime, time, timezone

from .db import db
from .vehicle import Vehicle
from .user import User

# Import models after db initialization to avoid circular imports


def utc_now():
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


def safe_date_format(date_value):
    """Safely format a date value to ISO format, handling empty strings and None values."""
    if not date_value:
        return None

    # Handle string values
    if isinstance(date_value, str):
        date_str = date_value.strip()
        if not date_str or date_str == '' or date_str == '?' or len(date_str) < 8:
            return None
        try:
            # Try to parse the string as a date
            parsed_date = datetime.fromisoformat(date_str)
            return parsed_date.date().isoformat()
        except (ValueError, TypeError):
            try:
                # Try alternative parsing
                from datetime import datetime
                parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
                return parsed_date.date().isoformat()
            except (ValueError, TypeError):
                return None

    # Handle date objects
    try:
        if hasattr(date_value, 'date'):
            return date_value.date().isoformat()
        elif hasattr(date_value, 'isoformat'):
            return date_value.isoformat()
        else:
            return str(date_value) if date_value else None
    except (AttributeError, ValueError, TypeError):
        return None


class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    account_number = db.Column(db.String(50), unique=True)
    name = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(100))
    address = db.Column(db.Text)
    postcode = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    mobile = db.Column(db.String(20))
    email = db.Column(db.String(100))
    created_date = db.Column(db.Date, default=utc_now)
    updated_date = db.Column(db.Date, default=utc_now, onupdate=utc_now)

    # Relationships
    vehicles = db.relationship('Vehicle', backref='customer', lazy=True)
    jobs = db.relationship('Job', backref='customer', lazy=True)
    invoices = db.relationship('Invoice', backref='customer', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'account_number': self.account_number,
            'name': self.name,
            'company': self.company,
            'address': self.address,
            'postcode': self.postcode,
            'phone': self.phone,
            'mobile': self.mobile,
            'email': self.email,
            'created_date': safe_date_format(self.created_date),
            'updated_date': safe_date_format(self.updated_date)
        }


class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    job_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'))
    description = db.Column(db.Text)
    # Enhanced status workflow
    status = db.Column(db.String(20), default='BOOKED_IN')
    # URGENT, HIGH, NORMAL, LOW
    priority = db.Column(db.String(10), default='NORMAL')
    assigned_technician = db.Column(db.String(100))  # Technician assignment
    estimated_hours = db.Column(db.Float, default=0.0)  # Time estimation
    actual_hours = db.Column(db.Float, default=0.0)  # Actual time spent
    labour_cost = db.Column(db.Float, default=0.0)
    parts_cost = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, default=0.0)
    created_date = db.Column(db.Date, default=utc_now)
    started_date = db.Column(db.Date)  # When work actually started
    completed_date = db.Column(db.Date)
    due_date = db.Column(db.Date)  # Expected completion date
    notes = db.Column(db.Text)
    internal_notes = db.Column(db.Text)  # Private technician notes
    customer_authorization = db.Column(
        db.Boolean, default=False)  # Customer approval for work
    bay_number = db.Column(db.String(10))  # Workshop bay assignment

    # Relationships
    invoices = db.relationship('Invoice', backref='job', lazy=True)
    job_parts = db.relationship('JobPart', backref='job', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'job_number': self.job_number,
            'customer_id': self.customer_id,
            'vehicle_id': self.vehicle_id,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'assigned_technician': self.assigned_technician,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'labour_cost': self.labour_cost,
            'parts_cost': self.parts_cost,
            'total_amount': self.total_amount,
            'created_date': safe_date_format(self.created_date),
            'started_date': safe_date_format(self.started_date),
            'completed_date': safe_date_format(self.completed_date),
            'due_date': safe_date_format(self.due_date),
            'notes': self.notes,
            'internal_notes': self.internal_notes,
            'customer_authorization': self.customer_authorization,
            'bay_number': self.bay_number
        }


class Technician(db.Model):
    __tablename__ = 'technicians'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    # MOT, Diagnostics, Bodywork, etc.
    specialization = db.Column(db.String(100))
    hourly_rate = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    start_time = db.Column(db.Time, default=time(8, 0))  # Default 8:00 AM
    end_time = db.Column(db.Time, default=time(17, 0))   # Default 5:00 PM
    created_date = db.Column(db.Date, default=utc_now)

    # Relationships
    appointments = db.relationship(
        'Appointment', backref='technician', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'specialization': self.specialization,
            'hourly_rate': self.hourly_rate,
            'is_active': self.is_active,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else '08:00',
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else '17:00',
            'created_date': safe_date_format(self.created_date)
        }


class WorkshopBay(db.Model):
    __tablename__ = 'workshop_bays'

    id = db.Column(db.Integer, primary_key=True)
    bay_number = db.Column(db.String(10), unique=True, nullable=False)
    bay_name = db.Column(db.String(50))
    # GENERAL, MOT, LIFT, DIAGNOSTIC
    bay_type = db.Column(db.String(20), default='GENERAL')
    is_available = db.Column(db.Boolean, default=True)
    equipment = db.Column(db.Text)  # JSON string of equipment list
    notes = db.Column(db.Text)

    # Relationships
    appointments = db.relationship('Appointment', backref='bay', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'bay_number': self.bay_number,
            'bay_name': self.bay_name,
            'bay_type': self.bay_type,
            'is_available': self.is_available,
            'equipment': self.equipment,
            'notes': self.notes
        }


class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'))
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'))
    technician_id = db.Column(db.Integer, db.ForeignKey('technicians.id'))
    bay_id = db.Column(db.Integer, db.ForeignKey('workshop_bays.id'))

    appointment_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    estimated_duration = db.Column(db.Integer, default=60)  # minutes

    service_type = db.Column(db.String(100))  # MOT, Service, Repair, etc.
    description = db.Column(db.Text)
    # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    status = db.Column(db.String(20), default='SCHEDULED')
    priority = db.Column(db.String(10), default='NORMAL')

    customer_notified = db.Column(db.Boolean, default=False)
    reminder_sent = db.Column(db.Boolean, default=False)

    created_date = db.Column(db.Date, default=utc_now)
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'customer_id': self.customer_id,
            'vehicle_id': self.vehicle_id,
            'technician_id': self.technician_id,
            'bay_id': self.bay_id,
            'appointment_date': safe_date_format(self.appointment_date),
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else '',
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else '',
            'estimated_duration': self.estimated_duration,
            'service_type': self.service_type,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'customer_notified': self.customer_notified,
            'reminder_sent': self.reminder_sent,
            'created_date': safe_date_format(self.created_date),
            'notes': self.notes
        }


class JobSheet(db.Model):
    __tablename__ = 'job_sheets'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    sheet_number = db.Column(db.String(50), unique=True, nullable=False)
    template_id = db.Column(
        db.Integer, db.ForeignKey('job_sheet_templates.id'))

    work_instructions = db.Column(db.Text)
    safety_notes = db.Column(db.Text)
    parts_required = db.Column(db.Text)  # JSON string
    tools_required = db.Column(db.Text)  # JSON string
    quality_checks = db.Column(db.Text)  # JSON string

    technician_signature = db.Column(db.Text)  # Base64 encoded signature
    supervisor_signature = db.Column(db.Text)  # Base64 encoded signature
    customer_signature = db.Column(db.Text)  # Base64 encoded signature

    signed_date = db.Column(db.DateTime)
    completed_date = db.Column(db.DateTime)

    # DRAFT, ACTIVE, COMPLETED, ARCHIVED
    status = db.Column(db.String(20), default='DRAFT')
    created_date = db.Column(db.Date, default=utc_now)

    # Relationships
    job = db.relationship('Job', backref='job_sheets', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'sheet_number': self.sheet_number,
            'template_id': self.template_id,
            'work_instructions': self.work_instructions,
            'safety_notes': self.safety_notes,
            'parts_required': self.parts_required,
            'tools_required': self.tools_required,
            'quality_checks': self.quality_checks,
            # Don't expose actual signature
            'technician_signature': bool(self.technician_signature),
            'supervisor_signature': bool(self.supervisor_signature),
            'customer_signature': bool(self.customer_signature),
            'signed_date': self.signed_date.isoformat() if self.signed_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'status': self.status,
            'created_date': safe_date_format(self.created_date)
        }


class Quote(db.Model):
    __tablename__ = 'quotes'

    id = db.Column(db.Integer, primary_key=True)
    quote_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'))

    description = db.Column(db.Text)
    labour_cost = db.Column(db.Float, default=0.0)
    parts_cost = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, default=0.0)
    vat_amount = db.Column(db.Float, default=0.0)
    final_total = db.Column(db.Float, default=0.0)

    # DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    status = db.Column(db.String(20), default='DRAFT')
    valid_until = db.Column(db.Date)
    created_date = db.Column(db.Date, default=utc_now)
    sent_date = db.Column(db.Date)
    accepted_date = db.Column(db.Date)

    notes = db.Column(db.Text)
    terms_conditions = db.Column(db.Text)

    # Relationships
    customer = db.relationship('Customer', backref='quotes', lazy=True)
    vehicle = db.relationship('Vehicle', backref='quotes', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'quote_number': self.quote_number,
            'customer_id': self.customer_id,
            'vehicle_id': self.vehicle_id,
            'description': self.description,
            'labour_cost': self.labour_cost,
            'parts_cost': self.parts_cost,
            'total_amount': self.total_amount,
            'vat_amount': self.vat_amount,
            'final_total': self.final_total,
            'status': self.status,
            'valid_until': safe_date_format(self.valid_until),
            'created_date': safe_date_format(self.created_date),
            'sent_date': safe_date_format(self.sent_date),
            'accepted_date': safe_date_format(self.accepted_date),
            'notes': self.notes,
            'terms_conditions': self.terms_conditions
        }


class JobSheetTemplate(db.Model):
    __tablename__ = 'job_sheet_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    service_type = db.Column(db.String(50))  # MOT, Service, Repair, etc.
    description = db.Column(db.Text)

    default_instructions = db.Column(db.Text)
    default_safety_notes = db.Column(db.Text)
    default_parts = db.Column(db.Text)  # JSON string
    default_tools = db.Column(db.Text)  # JSON string
    default_checks = db.Column(db.Text)  # JSON string

    estimated_time = db.Column(db.Integer, default=60)  # minutes
    is_active = db.Column(db.Boolean, default=True)
    created_date = db.Column(db.Date, default=utc_now)

    # Relationships
    job_sheets = db.relationship('JobSheet', backref='template', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'service_type': self.service_type,
            'description': self.description,
            'default_instructions': self.default_instructions,
            'default_safety_notes': self.default_safety_notes,
            'default_parts': self.default_parts,
            'default_tools': self.default_tools,
            'default_checks': self.default_checks,
            'estimated_time': self.estimated_time,
            'is_active': self.is_active,
            'created_date': safe_date_format(self.created_date)
        }


class Invoice(db.Model):
    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'))
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'))
    amount = db.Column(db.Float, nullable=False)
    vat_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, nullable=False)
    # PENDING, PAID, OVERDUE, CANCELLED
    status = db.Column(db.String(20), default='PENDING')
    created_date = db.Column(db.Date, default=utc_now)
    due_date = db.Column(db.Date)
    paid_date = db.Column(db.Date)
    payment_method = db.Column(db.String(50))
    notes = db.Column(db.Text)
    is_locked = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'job_id': self.job_id,
            'customer_id': self.customer_id,
            'vehicle_id': self.vehicle_id,
            'amount': self.amount,
            'vat_amount': self.vat_amount,
            'total_amount': self.total_amount,
            'status': self.status,
            'created_date': safe_date_format(self.created_date),
            'due_date': safe_date_format(self.due_date),
            'paid_date': safe_date_format(self.paid_date),
            'payment_method': self.payment_method,
            'notes': self.notes,
            'is_locked': self.is_locked
        }


class Part(db.Model):
    __tablename__ = 'parts'

    id = db.Column(db.Integer, primary_key=True)
    part_number = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'))
    cost_price = db.Column(db.Float, default=0.0)
    sell_price = db.Column(db.Float, default=0.0)
    stock_quantity = db.Column(db.Integer, default=0)
    min_stock_level = db.Column(db.Integer, default=0)
    location = db.Column(db.String(100))
    created_date = db.Column(db.Date, default=utc_now)

    # Relationships
    job_parts = db.relationship('JobPart', backref='part', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'part_number': self.part_number,
            'name': self.name,
            'description': self.description,
            'supplier_id': self.supplier_id,
            'cost_price': self.cost_price,
            'sell_price': self.sell_price,
            'stock_quantity': self.stock_quantity,
            'min_stock_level': self.min_stock_level,
            'location': self.location,
            'created_date': self.created_date.isoformat() if self.created_date else None
        }


class JobPart(db.Model):
    __tablename__ = 'job_parts'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    part_id = db.Column(db.Integer, db.ForeignKey('parts.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(db.Float, nullable=False)
    total_price = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'part_id': self.part_id,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price
        }


class Supplier(db.Model):
    __tablename__ = 'suppliers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact_person = db.Column(db.String(100))
    address = db.Column(db.Text)
    postcode = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    website = db.Column(db.String(200))
    account_number = db.Column(db.String(50))
    payment_terms = db.Column(db.String(100))
    created_date = db.Column(db.Date, default=utc_now)

    # Relationships
    parts = db.relationship('Part', backref='supplier', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact_person': self.contact_person,
            'address': self.address,
            'postcode': self.postcode,
            'phone': self.phone,
            'email': self.email,
            'website': self.website,
            'account_number': self.account_number,
            'payment_terms': self.payment_terms,
            'created_date': self.created_date.isoformat() if self.created_date else None
        }


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    expense_number = db.Column(db.String(50), unique=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'))
    category = db.Column(db.String(100))
    description = db.Column(db.Text)
    amount = db.Column(db.Float, nullable=False)
    vat_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, nullable=False)
    expense_date = db.Column(db.Date, default=utc_now)
    payment_method = db.Column(db.String(50))
    receipt_number = db.Column(db.String(100))
    created_date = db.Column(db.Date, default=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'expense_number': self.expense_number,
            'supplier_id': self.supplier_id,
            'category': self.category,
            'description': self.description,
            'amount': self.amount,
            'vat_amount': self.vat_amount,
            'total_amount': self.total_amount,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'payment_method': self.payment_method,
            'receipt_number': self.receipt_number,
            'created_date': self.created_date.isoformat() if self.created_date else None
        }
