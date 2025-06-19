#!/usr/bin/env python3
"""
Enhanced Workshop Diary Service
Professional scheduling system with drag-and-drop, bay allocation, and technician management
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class TimeSlot:
    """Time slot structure"""
    start_time: time
    end_time: time
    duration_minutes: int
    available: bool
    technician_id: Optional[int] = None
    bay_id: Optional[int] = None

@dataclass
class WorkshopResource:
    """Workshop resource (technician or bay)"""
    id: int
    name: str
    type: str  # 'technician' or 'bay'
    skills: List[str]
    availability: Dict[str, List[TimeSlot]]
    active: bool

class WorkshopDiaryService:
    """Enhanced workshop diary service"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_workshop_tables()
    
    def _ensure_workshop_tables(self):
        """Create enhanced workshop tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Enhanced technicians table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS technicians (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100),
                    phone VARCHAR(20),
                    skills TEXT,
                    hourly_rate REAL DEFAULT 0.0,
                    start_time TIME DEFAULT '08:00',
                    end_time TIME DEFAULT '17:00',
                    lunch_start TIME DEFAULT '12:00',
                    lunch_end TIME DEFAULT '13:00',
                    active BOOLEAN DEFAULT 1,
                    created_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Enhanced workshop bays table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS workshop_bays (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bay_number VARCHAR(10) NOT NULL,
                    bay_name VARCHAR(100),
                    bay_type VARCHAR(50),
                    equipment TEXT,
                    max_vehicle_size VARCHAR(20) DEFAULT 'STANDARD',
                    lift_capacity INTEGER DEFAULT 2000,
                    active BOOLEAN DEFAULT 1,
                    created_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Technician availability table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS technician_availability (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    technician_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    availability_type VARCHAR(20) DEFAULT 'AVAILABLE',
                    notes TEXT,
                    created_date DATE DEFAULT CURRENT_DATE,
                    FOREIGN KEY (technician_id) REFERENCES technicians (id)
                )
            ''')
            
            # Bay availability table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS bay_availability (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bay_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    availability_type VARCHAR(20) DEFAULT 'AVAILABLE',
                    maintenance_reason TEXT,
                    created_date DATE DEFAULT CURRENT_DATE,
                    FOREIGN KEY (bay_id) REFERENCES workshop_bays (id)
                )
            ''')
            
            # Service templates table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS service_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    estimated_duration INTEGER DEFAULT 60,
                    required_skills TEXT,
                    bay_requirements TEXT,
                    default_price REAL DEFAULT 0.0,
                    active BOOLEAN DEFAULT 1,
                    created_date DATE DEFAULT CURRENT_DATE
                )
            ''')
            
            # Appointment conflicts table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS appointment_conflicts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    appointment_id INTEGER NOT NULL,
                    conflict_type VARCHAR(50) NOT NULL,
                    conflict_description TEXT,
                    resolved BOOLEAN DEFAULT 0,
                    resolution_notes TEXT,
                    created_date DATE DEFAULT CURRENT_DATE,
                    FOREIGN KEY (appointment_id) REFERENCES appointments (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error creating workshop tables: {str(e)}")
    
    def get_technicians(self, active_only: bool = True) -> List[Dict]:
        """Get all technicians with their skills and availability"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT id, name, email, phone, skills, hourly_rate,
                       start_time, end_time, lunch_start, lunch_end, active
                FROM technicians
            '''
            
            if active_only:
                query += ' WHERE active = 1'
            
            query += ' ORDER BY name'
            
            cursor.execute(query)
            
            technicians = []
            for row in cursor.fetchall():
                skills = json.loads(row[4]) if row[4] else []
                
                technicians.append({
                    'id': row[0],
                    'name': row[1],
                    'email': row[2],
                    'phone': row[3],
                    'skills': skills,
                    'hourly_rate': row[5],
                    'start_time': row[6],
                    'end_time': row[7],
                    'lunch_start': row[8],
                    'lunch_end': row[9],
                    'active': bool(row[10])
                })
            
            conn.close()
            return technicians
            
        except Exception as e:
            print(f"Error getting technicians: {str(e)}")
            return []
    
    def get_workshop_bays(self, active_only: bool = True) -> List[Dict]:
        """Get all workshop bays with their specifications"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT id, bay_number, bay_name, bay_type, equipment,
                       max_vehicle_size, lift_capacity, active
                FROM workshop_bays
            '''
            
            if active_only:
                query += ' WHERE active = 1'
            
            query += ' ORDER BY bay_number'
            
            cursor.execute(query)
            
            bays = []
            for row in cursor.fetchall():
                equipment = json.loads(row[4]) if row[4] else []
                
                bays.append({
                    'id': row[0],
                    'bay_number': row[1],
                    'bay_name': row[2],
                    'bay_type': row[3],
                    'equipment': equipment,
                    'max_vehicle_size': row[5],
                    'lift_capacity': row[6],
                    'active': bool(row[7])
                })
            
            conn.close()
            return bays
            
        except Exception as e:
            print(f"Error getting workshop bays: {str(e)}")
            return []
    
    def get_appointments_for_period(self, start_date: str, end_date: str) -> List[Dict]:
        """Get appointments for a specific period with full details"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT a.id, a.job_id, a.customer_id, a.vehicle_id, a.technician_id, a.bay_id,
                       a.appointment_date, a.start_time, a.end_time, a.estimated_duration,
                       a.service_type, a.description, a.status, a.priority,
                       a.customer_notified, a.reminder_sent, a.notes,
                       c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                       v.registration, v.make, v.model, v.color,
                       t.name as technician_name, t.skills as technician_skills,
                       b.bay_number, b.bay_name, b.bay_type,
                       j.job_number, j.labour_cost, j.parts_cost, j.total_amount
                FROM appointments a
                LEFT JOIN customers c ON a.customer_id = c.id
                LEFT JOIN vehicles v ON a.vehicle_id = v.id
                LEFT JOIN technicians t ON a.technician_id = t.id
                LEFT JOIN workshop_bays b ON a.bay_id = b.id
                LEFT JOIN jobs j ON a.job_id = j.id
                WHERE a.appointment_date BETWEEN ? AND ?
                ORDER BY a.appointment_date, a.start_time
            ''', (start_date, end_date))
            
            appointments = []
            for row in cursor.fetchall():
                technician_skills = json.loads(row[18]) if row[18] else []
                
                appointments.append({
                    'id': row[0],
                    'job_id': row[1],
                    'customer_id': row[2],
                    'vehicle_id': row[3],
                    'technician_id': row[4],
                    'bay_id': row[5],
                    'appointment_date': row[6],
                    'start_time': row[7],
                    'end_time': row[8],
                    'estimated_duration': row[9],
                    'service_type': row[10],
                    'description': row[11],
                    'status': row[12],
                    'priority': row[13],
                    'customer_notified': bool(row[14]),
                    'reminder_sent': bool(row[15]),
                    'notes': row[16],
                    'customer': {
                        'name': row[17],
                        'phone': row[18],
                        'email': row[19]
                    },
                    'vehicle': {
                        'registration': row[20],
                        'make': row[21],
                        'model': row[22],
                        'color': row[23]
                    },
                    'technician': {
                        'name': row[24],
                        'skills': technician_skills
                    },
                    'bay': {
                        'bay_number': row[26],
                        'bay_name': row[27],
                        'bay_type': row[28]
                    },
                    'job': {
                        'job_number': row[29],
                        'labour_cost': row[30],
                        'parts_cost': row[31],
                        'total_amount': row[32]
                    }
                })
            
            conn.close()
            return appointments
            
        except Exception as e:
            print(f"Error getting appointments: {str(e)}")
            return []
    
    def check_availability(self, date: str, start_time: str, end_time: str,
                          technician_id: int = None, bay_id: int = None) -> Dict:
        """Check availability for a specific time slot"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            conflicts = []
            
            # Check for appointment conflicts
            cursor.execute('''
                SELECT id, customer_id, technician_id, bay_id, start_time, end_time, service_type
                FROM appointments
                WHERE appointment_date = ?
                AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))
                AND (technician_id = ? OR bay_id = ?)
            ''', (date, end_time, start_time, start_time, end_time, technician_id, bay_id))
            
            for row in cursor.fetchall():
                conflicts.append({
                    'type': 'appointment',
                    'appointment_id': row[0],
                    'customer_id': row[1],
                    'technician_id': row[2],
                    'bay_id': row[3],
                    'start_time': row[4],
                    'end_time': row[5],
                    'service_type': row[6]
                })
            
            # Check technician availability
            if technician_id:
                cursor.execute('''
                    SELECT availability_type, start_time, end_time, notes
                    FROM technician_availability
                    WHERE technician_id = ? AND date = ?
                    AND ((start_time <= ? AND end_time >= ?) OR (start_time <= ? AND end_time >= ?))
                ''', (technician_id, date, start_time, start_time, end_time, end_time))
                
                for row in cursor.fetchall():
                    if row[0] != 'AVAILABLE':
                        conflicts.append({
                            'type': 'technician_unavailable',
                            'availability_type': row[0],
                            'start_time': row[1],
                            'end_time': row[2],
                            'notes': row[3]
                        })
            
            # Check bay availability
            if bay_id:
                cursor.execute('''
                    SELECT availability_type, start_time, end_time, maintenance_reason
                    FROM bay_availability
                    WHERE bay_id = ? AND date = ?
                    AND ((start_time <= ? AND end_time >= ?) OR (start_time <= ? AND end_time >= ?))
                ''', (bay_id, date, start_time, start_time, end_time, end_time))
                
                for row in cursor.fetchall():
                    if row[0] != 'AVAILABLE':
                        conflicts.append({
                            'type': 'bay_unavailable',
                            'availability_type': row[0],
                            'start_time': row[1],
                            'end_time': row[2],
                            'maintenance_reason': row[3]
                        })
            
            conn.close()
            
            return {
                'available': len(conflicts) == 0,
                'conflicts': conflicts
            }
            
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }

    def move_appointment(self, appointment_id: int, new_date: str, new_start_time: str,
                        new_technician_id: int = None, new_bay_id: int = None) -> Dict:
        """Move an appointment to a new time slot (drag and drop functionality)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get current appointment details
            cursor.execute('''
                SELECT appointment_date, start_time, end_time, estimated_duration,
                       technician_id, bay_id, customer_id, service_type
                FROM appointments WHERE id = ?
            ''', (appointment_id,))

            appointment = cursor.fetchone()
            if not appointment:
                return {'success': False, 'error': 'Appointment not found'}

            # Calculate new end time
            duration = appointment[3]  # estimated_duration
            new_start = datetime.strptime(new_start_time, '%H:%M').time()
            new_end = (datetime.combine(datetime.today(), new_start) + timedelta(minutes=duration)).time()
            new_end_time = new_end.strftime('%H:%M')

            # Use existing resources if not specified
            final_technician_id = new_technician_id or appointment[4]
            final_bay_id = new_bay_id or appointment[5]

            # Check availability at new time slot
            availability = self.check_availability(
                new_date, new_start_time, new_end_time,
                final_technician_id, final_bay_id
            )

            if not availability['available']:
                return {
                    'success': False,
                    'error': 'Time slot not available',
                    'conflicts': availability['conflicts']
                }

            # Update appointment
            cursor.execute('''
                UPDATE appointments
                SET appointment_date = ?, start_time = ?, end_time = ?,
                    technician_id = ?, bay_id = ?
                WHERE id = ?
            ''', (new_date, new_start_time, new_end_time,
                  final_technician_id, final_bay_id, appointment_id))

            conn.commit()
            conn.close()

            return {
                'success': True,
                'message': 'Appointment moved successfully',
                'appointment_id': appointment_id,
                'new_date': new_date,
                'new_start_time': new_start_time,
                'new_end_time': new_end_time
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_optimal_scheduling_suggestions(self, service_type: str, estimated_duration: int,
                                         preferred_date: str = None) -> List[Dict]:
        """Get optimal scheduling suggestions based on workload and resources"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get service template requirements
            cursor.execute('''
                SELECT required_skills, bay_requirements
                FROM service_templates
                WHERE name = ? OR description LIKE ?
            ''', (service_type, f'%{service_type}%'))

            template = cursor.fetchone()
            required_skills = json.loads(template[0]) if template and template[0] else []
            bay_requirements = json.loads(template[1]) if template and template[1] else []

            # Get suitable technicians
            suitable_technicians = []
            technicians = self.get_technicians()

            for tech in technicians:
                if not required_skills or any(skill in tech['skills'] for skill in required_skills):
                    suitable_technicians.append(tech['id'])

            # Get suitable bays
            suitable_bays = []
            bays = self.get_workshop_bays()

            for bay in bays:
                if not bay_requirements or any(req in bay['equipment'] for req in bay_requirements):
                    suitable_bays.append(bay['id'])

            # Generate suggestions for next 7 days
            suggestions = []
            start_date = datetime.strptime(preferred_date, '%Y-%m-%d') if preferred_date else datetime.now()

            for day_offset in range(7):
                check_date = start_date + timedelta(days=day_offset)
                date_str = check_date.strftime('%Y-%m-%d')

                # Skip weekends (optional - can be configured)
                if check_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                    continue

                # Check time slots from 8 AM to 5 PM
                for hour in range(8, 17):
                    start_time = f"{hour:02d}:00"
                    end_time = f"{(hour + (estimated_duration // 60)):02d}:{(estimated_duration % 60):02d}"

                    # Find available technician and bay combinations
                    for tech_id in suitable_technicians:
                        for bay_id in suitable_bays:
                            availability = self.check_availability(
                                date_str, start_time, end_time, tech_id, bay_id
                            )

                            if availability['available']:
                                # Calculate workload score (lower is better)
                                workload_score = self._calculate_workload_score(date_str, tech_id, bay_id)

                                suggestions.append({
                                    'date': date_str,
                                    'start_time': start_time,
                                    'end_time': end_time,
                                    'technician_id': tech_id,
                                    'bay_id': bay_id,
                                    'workload_score': workload_score,
                                    'day_name': check_date.strftime('%A'),
                                    'optimal': workload_score < 0.7  # Less than 70% capacity
                                })

            # Sort by workload score (best suggestions first)
            suggestions.sort(key=lambda x: x['workload_score'])

            conn.close()
            return suggestions[:10]  # Return top 10 suggestions

        except Exception as e:
            print(f"Error getting scheduling suggestions: {str(e)}")
            return []

    def _calculate_workload_score(self, date: str, technician_id: int, bay_id: int) -> float:
        """Calculate workload score for a given date and resources"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get total scheduled time for technician on this date
            cursor.execute('''
                SELECT SUM(estimated_duration)
                FROM appointments
                WHERE appointment_date = ? AND technician_id = ?
            ''', (date, technician_id))

            tech_minutes = cursor.fetchone()[0] or 0

            # Get total scheduled time for bay on this date
            cursor.execute('''
                SELECT SUM(estimated_duration)
                FROM appointments
                WHERE appointment_date = ? AND bay_id = ?
            ''', (date, bay_id))

            bay_minutes = cursor.fetchone()[0] or 0

            conn.close()

            # Calculate utilization (assuming 8-hour working day = 480 minutes)
            working_minutes = 480
            tech_utilization = tech_minutes / working_minutes
            bay_utilization = bay_minutes / working_minutes

            # Return the higher utilization as the workload score
            return max(tech_utilization, bay_utilization)

        except Exception as e:
            return 1.0  # Return high score on error

    def create_service_template(self, name: str, description: str, estimated_duration: int,
                               required_skills: List[str], bay_requirements: List[str],
                               default_price: float = 0.0) -> Dict:
        """Create a new service template"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO service_templates
                (name, description, estimated_duration, required_skills, bay_requirements, default_price)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                name, description, estimated_duration,
                json.dumps(required_skills), json.dumps(bay_requirements), default_price
            ))

            template_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return {
                'success': True,
                'template_id': template_id,
                'message': 'Service template created successfully'
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_workshop_utilization(self, start_date: str, end_date: str) -> Dict:
        """Get workshop utilization statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get total appointments and duration
            cursor.execute('''
                SELECT COUNT(*), SUM(estimated_duration), AVG(estimated_duration)
                FROM appointments
                WHERE appointment_date BETWEEN ? AND ?
                AND status != 'CANCELLED'
            ''', (start_date, end_date))

            stats = cursor.fetchone()
            total_appointments = stats[0] or 0
            total_duration = stats[1] or 0
            avg_duration = stats[2] or 0

            # Get technician utilization
            cursor.execute('''
                SELECT t.name, COUNT(a.id), SUM(a.estimated_duration)
                FROM technicians t
                LEFT JOIN appointments a ON t.id = a.technician_id
                    AND a.appointment_date BETWEEN ? AND ?
                    AND a.status != 'CANCELLED'
                WHERE t.active = 1
                GROUP BY t.id, t.name
                ORDER BY t.name
            ''', (start_date, end_date))

            technician_stats = []
            for row in cursor.fetchall():
                technician_stats.append({
                    'name': row[0],
                    'appointments': row[1],
                    'total_minutes': row[2] or 0,
                    'utilization_percent': round((row[2] or 0) / (480 * 7) * 100, 1)  # 7 days, 8 hours each
                })

            # Get bay utilization
            cursor.execute('''
                SELECT b.bay_number, b.bay_name, COUNT(a.id), SUM(a.estimated_duration)
                FROM workshop_bays b
                LEFT JOIN appointments a ON b.id = a.bay_id
                    AND a.appointment_date BETWEEN ? AND ?
                    AND a.status != 'CANCELLED'
                WHERE b.active = 1
                GROUP BY b.id, b.bay_number, b.bay_name
                ORDER BY b.bay_number
            ''', (start_date, end_date))

            bay_stats = []
            for row in cursor.fetchall():
                bay_stats.append({
                    'bay_number': row[0],
                    'bay_name': row[1],
                    'appointments': row[2],
                    'total_minutes': row[3] or 0,
                    'utilization_percent': round((row[3] or 0) / (480 * 7) * 100, 1)
                })

            conn.close()

            return {
                'success': True,
                'period': {'start_date': start_date, 'end_date': end_date},
                'overall': {
                    'total_appointments': total_appointments,
                    'total_duration_minutes': total_duration,
                    'average_duration_minutes': round(avg_duration, 1)
                },
                'technician_utilization': technician_stats,
                'bay_utilization': bay_stats
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
