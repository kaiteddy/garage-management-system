import io
import os
import sys
import threading
import time

import pandas as pd
import schedule
from flask import (Blueprint, current_app, flash, jsonify, redirect,
                   render_template, request, send_file, url_for)
from werkzeug.utils import secure_filename

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from sms_service import SMSService

    from mot_reminder import MOTReminder
except ImportError as e:
    print(f"Error importing modules: {e}")
    # Don't exit, just set to None for graceful degradation
    MOTReminder = None
    SMSService = None

# Try to import the integrated MOT service
try:
    # Add the src directory to path to import mot_service
    src_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src')
    if src_path not in sys.path:
        sys.path.append(src_path)
    from mot_service import IntegratedMOTService
    integrated_mot_service = IntegratedMOTService()
    print("✅ Integrated MOT service loaded successfully")
except ImportError as e:
    print(f"⚠️ Could not import integrated MOT service: {e}")
    integrated_mot_service = None
except Exception as e:
    print(f"⚠️ Error initializing integrated MOT service: {e}")
    integrated_mot_service = None

# Create Blueprint instead of Flask app
mot_bp = Blueprint('mot', __name__,
                   template_folder=os.path.join(
                       os.path.dirname(__file__), 'templates'),
                   static_folder=os.path.join(
                       os.path.dirname(__file__), 'static'),
                   url_prefix='/mot')


def format_date_for_display(date_string):
    """Convert date from various formats to DD-MM-YYYY format for display"""
    if not date_string or date_string == '-' or date_string == '' or date_string == 'Unknown':
        return '-'

    # If already in DD-MM-YYYY format, return as-is
    if isinstance(date_string, str) and len(date_string) == 10:
        parts = date_string.split('-')
        if len(parts) == 3 and len(parts[0]) == 2 and len(parts[1]) == 2 and len(parts[2]) == 4:
            return date_string

    try:
        from datetime import datetime
        date_obj = None

        # Handle different date formats
        if 'T' in str(date_string):
            # Handle ISO format with timezone first (before checking for dashes)
            try:
                date_str = str(date_string)

                # Try different approaches for ISO parsing
                try:
                    # First try: replace Z with +00:00
                    if date_str.endswith('Z'):
                        date_str_fixed = date_str[:-1] + '+00:00'
                        date_obj = datetime.fromisoformat(date_str_fixed)
                    else:
                        date_obj = datetime.fromisoformat(date_str)
                except (ValueError, AttributeError):
                    # Fallback: parse just the date part
                    try:
                        date_part = date_str.split('T')[0]
                        date_obj = datetime.strptime(date_part, '%Y-%m-%d')
                    except ValueError:
                        pass
            except (ValueError, TypeError):
                pass
        elif '.' in str(date_string):
            # Handle YYYY.MM.DD format (DVSA API format)
            try:
                date_obj = datetime.strptime(str(date_string), '%Y.%m.%d')
            except ValueError:
                # Try DD.MM.YYYY format
                try:
                    date_obj = datetime.strptime(str(date_string), '%d.%m.%Y')
                except ValueError:
                    pass
        elif '-' in str(date_string):
            # Handle various dash formats
            parts = str(date_string).split('-')
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    # YYYY-MM-DD format
                    try:
                        date_obj = datetime.strptime(
                            str(date_string), '%Y-%m-%d')
                    except ValueError:
                        pass
                elif len(parts[2]) == 4:
                    # DD-MM-YYYY format (already formatted)
                    return str(date_string)
        elif '/' in str(date_string):
            # Handle slash formats
            try:
                # Try MM/DD/YYYY format first
                date_obj = datetime.strptime(str(date_string), '%m/%d/%Y')
            except ValueError:
                try:
                    # Try DD/MM/YYYY format
                    date_obj = datetime.strptime(str(date_string), '%d/%m/%Y')
                except ValueError:
                    try:
                        # Try YYYY/MM/DD format
                        date_obj = datetime.strptime(
                            str(date_string), '%Y/%m/%d')
                    except ValueError:
                        pass
        else:
            # Try basic date parsing for numeric formats
            try:
                date_obj = datetime.strptime(str(date_string), '%Y%m%d')
            except (ValueError, TypeError):
                pass

        if date_obj:
            # Format as DD-MM-YYYY
            return date_obj.strftime('%d-%m-%Y')
        else:
            # If all parsing fails, return original
            return str(date_string)

    except Exception:
        return str(date_string)  # Return original if parsing fails


# Allowed file extensions
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

# Initialize MOT Reminder and SMS Service
reminder = None
sms_service = None


def init_mot_services():
    """Initialize MOT services when blueprint is registered"""
    global reminder, sms_service
    try:
        if MOTReminder:
            reminder = MOTReminder()
        if SMSService:
            sms_service = SMSService()
        print("✅ MOT services initialized successfully")
    except Exception as e:
        print(f"⚠️ Error initializing MOT services: {e}")
        # Continue without services for graceful degradation


# Store vehicles in memory (in production, use a database)
vehicles = []


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def process_uploaded_file(file):
    """Process uploaded CSV or Excel file and extract registration numbers"""
    try:
        print(f"Processing file: {file}")

        # Handle both file objects and file-like objects
        if hasattr(file, 'filename'):
            filename = file.filename.lower()
        else:
            # For testing with file paths
            filename = getattr(file, 'name', 'unknown.csv').lower()

        print(f"Detected filename: {filename}")

        if filename.endswith('.csv'):
            print("Reading as CSV file...")
            # Read CSV file
            df = pd.read_csv(file)
        elif filename.endswith(('.xlsx', '.xls')):
            print("Reading as Excel file...")
            # Read Excel file
            df = pd.read_excel(file)
        else:
            return None, "Unsupported file format"

        print(f"File read successfully. Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")

        # Look for registration numbers in various column names
        possible_reg_columns = ['registration', 'reg', 'registration_number', 'reg_number',
                                'vehicle_registration', 'number_plate', 'plate', 'vrm']

        # Look for mobile number columns
        possible_mobile_columns = ['mobile', 'phone', 'mobile_number', 'phone_number',
                                   'cell', 'cellular', 'contact_number', 'tel', 'telephone']

        # Look for customer name columns
        possible_name_columns = ['customer', 'name', 'customer_name', 'client', 'client_name',
                                 'owner', 'owner_name', 'contact_name', 'full_name']

        print(f"Looking for registration column in: {possible_reg_columns}")
        print(f"Looking for mobile column in: {possible_mobile_columns}")
        print(f"Looking for name column in: {possible_name_columns}")

        # Find registration column
        registration_column = None
        for col in df.columns:
            if col.lower().strip() in possible_reg_columns:
                registration_column = col
                print(f"Found registration column: {registration_column}")
                break

        if registration_column is None:
            registration_column = df.columns[0]
            print(
                f"No matching registration column found, using first column: {registration_column}")

        # Find mobile column
        mobile_column = None
        for col in df.columns:
            if col.lower().strip() in possible_mobile_columns:
                mobile_column = col
                print(f"Found mobile column: {mobile_column}")
                break

        # Find customer name column
        name_column = None
        for col in df.columns:
            if col.lower().strip() in possible_name_columns:
                name_column = col
                print(f"Found name column: {name_column}")
                break

        print(
            f"Using columns - Registration: '{registration_column}', Mobile: '{mobile_column}', Name: '{name_column}'")

        # Extract vehicle data with contact information
        vehicle_data = []
        for i, row in df.iterrows():
            reg = row[registration_column]
            if pd.isna(reg):
                continue

            reg_clean = str(reg).strip().upper().replace(' ', '')
            if not reg_clean or len(reg_clean) < 3:
                print(f"Skipping invalid registration: '{reg_clean}'")
                continue

            # Extract mobile number if available
            mobile = None
            if mobile_column and not pd.isna(row[mobile_column]):
                mobile = str(row[mobile_column]).strip()

            # Extract customer name if available
            customer_name = None
            if name_column and not pd.isna(row[name_column]):
                customer_name = str(row[name_column]).strip()

                # If no mobile column found, try to extract mobile from customer field
                print(
                    f"  -> Checking mobile extraction: mobile={mobile}, customer_name={customer_name}")
                if not mobile and customer_name:
                    import re
                    print(
                        f"  -> Attempting to extract mobile from: {customer_name}")
                    # Look for mobile numbers in the customer field (format: m: 07xxxxxxxxx)
                    mobile_match = re.search(r'm:\s*(07\d{9})', customer_name)
                    if mobile_match:
                        mobile = mobile_match.group(1)
                        print(
                            f"  -> Extracted mobile from customer field: {mobile}")
                        # Clean up customer name by removing the contact info part
                        # Split on 't:' and take the first part (the actual name)
                        if 't:' in customer_name:
                            customer_name = customer_name.split('t:')[
                                0].strip()
                            print(
                                f"  -> Cleaned customer name: {customer_name}")
                        elif 'm:' in customer_name:
                            customer_name = customer_name.split('m:')[
                                0].strip()
                            print(
                                f"  -> Cleaned customer name: {customer_name}")
                    else:
                        print(f"  -> No mobile number found in customer field")
                else:
                    print(
                        f"  -> Skipping mobile extraction: mobile={mobile}, customer_name={customer_name}")

            vehicle_data.append({
                'registration': reg_clean,
                'mobile_number': mobile,
                'customer_name': customer_name
            })

            print(
                f"Row {i}: {reg_clean} | Mobile: {mobile} | Customer: {customer_name}")

            # Debug: Show what we extracted
            if mobile:
                print(f"  -> Extracted mobile: {mobile}")
            if customer_name and customer_name != str(row[name_column]).strip():
                print(f"  -> Cleaned customer name: {customer_name}")

        print(
            f"Final vehicle data: {len(vehicle_data)} vehicles with contact info")
        return vehicle_data, None

    except Exception as e:
        return None, f"Error processing file: {str(e)}"


def bulk_check_vehicles(vehicle_data_list):
    """Check MOT status for multiple vehicles and persist them"""
    results = {
        'success': [],
        'failed': [],
        'duplicates': []
    }

    existing_regs = {v['registration'] for v in vehicles}

    for vehicle_data in vehicle_data_list:
        reg = vehicle_data['registration']
        mobile = vehicle_data.get('mobile_number')
        customer_name = vehicle_data.get('customer_name')

        try:
            if reg in existing_regs:
                results['duplicates'].append(reg)
                continue

            if integrated_mot_service:
                add_result = integrated_mot_service.add_mot_vehicle(
                    reg,
                    customer_name=customer_name,
                    mobile_number=mobile,
                    upload_batch_id='bulk_upload'
                )

                if add_result.get('success'):
                    mot_data = add_result.get('data', {})
                    mot_data['registration'] = reg
                    mot_data['customer_name'] = customer_name
                    mot_data['mobile_number'] = mobile
                    vehicles.append(mot_data)
                    results['success'].append(reg)
                    existing_regs.add(reg)
                else:
                    results['failed'].append(reg)
                continue

            vehicle_info = reminder.check_mot_status(reg)
            if vehicle_info:
                vehicle_info['mobile_number'] = mobile
                vehicle_info['customer_name'] = customer_name
                vehicles.append(vehicle_info)
                results['success'].append(reg)
                existing_regs.add(reg)
            else:
                results['failed'].append(reg)

        except Exception as e:
            print(f"Error checking {reg}: {e}")
            results['failed'].append(reg)

    return results


def run_schedule():
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)
        except Exception as e:
            print(f"Error in scheduler: {e}")
            time.sleep(60)  # Wait before retrying


# Start the scheduler in a separate thread
try:
    scheduler_thread = threading.Thread(target=run_schedule)
    scheduler_thread.daemon = True
    scheduler_thread.start()
except Exception as e:
    print(f"Error starting scheduler thread: {e}")


@mot_bp.route('/')
def index():
    """Show the integrated MOT Reminder Page"""
    try:
        # Create a custom HTML page that loads the integrated dashboard
        # and automatically navigates to the MOT section
        mot_page_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MOT Reminders - Garage Management System</title>
    <script>
        // Redirect to integrated dashboard with MOT section
        window.location.href = '/integrated#mot-reminders';
    </script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f8fafc;
        }
        .loading {
            text-align: center;
            color: #64748b;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>Loading MOT Reminder Page...</p>
        <p><small>If you are not redirected automatically, <a href="/integrated#mot-reminders">click here</a>.</small></p>
    </div>
</body>
</html>
        '''
        return mot_page_html
    except Exception as e:
        print(f"Error loading MOT page: {e}")
        # Fallback to old interface if redirect fails
        return render_template('index.html', vehicles=[], stats={})


@mot_bp.route('/test')
def test():
    return "MOT Reminder app is working!"


@mot_bp.route('/add_vehicle', methods=['POST'])
def add_vehicle():
    try:
        registration = request.form.get('registration', '').strip().upper()
        if not registration:
            flash('Please enter a registration number', 'error')
            return redirect(url_for('mot.index'))

        # Check if vehicle already exists
        if any(v['registration'] == registration for v in vehicles):
            flash('Vehicle already exists', 'error')
            return redirect(url_for('mot.index'))

        # Check vehicle details
        vehicle_info = reminder.check_mot_status(registration)
        if not vehicle_info:
            flash('Could not find vehicle details', 'error')
            return redirect(url_for('mot.index'))

        vehicles.append(vehicle_info)
        flash('Vehicle added successfully', 'success')
        return redirect(url_for('mot.index'))
    except Exception as e:
        print(f"Error adding vehicle: {str(e)}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('mot.index'))


@mot_bp.route('/remove_vehicle/<registration>')
def remove_vehicle(registration):
    try:
        global vehicles
        vehicles = [v for v in vehicles if v['registration'] != registration]
        flash('Vehicle removed successfully', 'success')
        return redirect(url_for('mot.index'))
    except Exception as e:
        print(f"Error removing vehicle: {str(e)}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('mot.index'))


@mot_bp.route('/check_vehicle/<registration>')
def check_vehicle(registration):
    try:
        if not reminder:
            return jsonify({'error': 'MOT service not available'}), 503
        vehicle_info = reminder.check_mot_status(registration)
        if vehicle_info:
            # Update the vehicle in the list
            for i, v in enumerate(vehicles):
                if v['registration'] == registration:
                    vehicles[i] = vehicle_info
                    break
            return jsonify(vehicle_info)
        return jsonify({'error': 'Could not fetch vehicle details'}), 404
    except Exception as e:
        print(f"Error checking vehicle: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/check_all')
def check_all():
    try:
        if not reminder:
            flash('MOT service not available', 'error')
            return redirect(url_for('mot.index'))
        for vehicle in vehicles:
            vehicle_info = reminder.check_mot_status(vehicle['registration'])
            if vehicle_info:
                # Update the vehicle in the list
                for i, v in enumerate(vehicles):
                    if v['registration'] == vehicle['registration']:
                        vehicles[i] = vehicle_info
                        break
        return redirect(url_for('mot.index'))
    except Exception as e:
        print(f"Error checking all vehicles: {str(e)}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('mot.index'))


@mot_bp.route('/upload_file', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'GET':
        flash('Please use the upload form to submit files', 'warning')
        return redirect(url_for('mot.index'))
    print("=== FILE UPLOAD STARTED ===")
    try:
        print(f"Request files: {request.files}")
        print(f"Request form: {request.form}")

        if 'file' not in request.files:
            print("ERROR: No file in request")
            flash('No file selected', 'error')
            return redirect(url_for('mot.index'))

        file = request.files['file']
        print(f"File object: {file}")
        print(f"Filename: {file.filename}")

        if file.filename == '':
            print("ERROR: Empty filename")
            flash('No file selected', 'error')
            return redirect(url_for('mot.index'))

        if not allowed_file(file.filename):
            print(f"ERROR: File type not allowed: {file.filename}")
            flash('Invalid file type. Please upload CSV or Excel files only.', 'error')
            return redirect(url_for('mot.index'))

        print("Processing file...")
        # Process the file
        vehicle_data_list, error = process_uploaded_file(file)
        print(
            f"Processing result - vehicle_data: {len(vehicle_data_list) if vehicle_data_list else 0} vehicles, error: {error}")

        if error:
            print(f"ERROR in processing: {error}")
            flash(error, 'error')
            return redirect(url_for('mot.index'))

        if not vehicle_data_list:
            print("ERROR: No vehicle data found")
            flash('No valid vehicle data found in the file', 'error')
            return redirect(url_for('mot.index'))

        print(f"Found {len(vehicle_data_list)} vehicles with contact info")

        # Bulk check vehicles
        print("Starting bulk check...")
        results = bulk_check_vehicles(vehicle_data_list)
        print(f"Bulk check results: {results}")

        # Create summary message
        message_parts = []
        if results['success']:
            message_parts.append(
                f"Successfully added {len(results['success'])} vehicles")
        if results['failed']:
            message_parts.append(
                f"{len(results['failed'])} vehicles could not be found")
        if results['duplicates']:
            message_parts.append(
                f"{len(results['duplicates'])} vehicles were already in the system")

        final_message = '. '.join(
            message_parts) if message_parts else "No vehicles processed"
        print(f"Final message: {final_message}")

        # Store the message in the URL parameters instead of using flash
        if results['success']:
            message_type = 'success'
        elif results['failed'] or results['duplicates']:
            message_type = 'warning'
        else:
            final_message = 'No vehicles were processed'
            message_type = 'warning'

        print("=== FILE UPLOAD COMPLETED ===")
        return redirect(url_for('mot.index', message=final_message, message_type=message_type))

    except Exception as e:
        print(f"EXCEPTION in upload_file: {str(e)}")
        import traceback
        traceback.print_exc()
        error_message = f'Error processing file: {str(e)}'
        return redirect(url_for('mot.index', message=error_message, message_type='error'))


@mot_bp.route('/download_template/<file_type>')
def download_template(file_type):
    """Download template file for vehicle registrations"""
    try:
        # Create sample data
        sample_data = {
            'registration': ['AB12CDE', 'XY34FGH', 'MN56JKL']
        }
        df = pd.DataFrame(sample_data)

        if file_type == 'csv':
            # Create CSV in memory
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)

            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype='text/csv',
                as_attachment=True,
                download_name='vehicle_registrations_template.csv'
            )
        elif file_type == 'excel':
            # Create Excel in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False,
                            sheet_name='Vehicle Registrations')
            output.seek(0)

            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name='vehicle_registrations_template.xlsx'
            )
        else:
            flash('Invalid template type', 'error')
            return redirect(url_for('mot.index'))

    except Exception as e:
        print(f"Error creating template: {str(e)}")
        flash(f'Error creating template: {str(e)}', 'error')
        return redirect(url_for('mot.index'))


@mot_bp.route('/sms')
def sms_dashboard():
    """SMS management dashboard"""
    try:
        # Get vehicles with mobile numbers
        vehicles_with_mobile = [v for v in vehicles if v.get('mobile_number')]

        # Get SMS service status
        sms_status = sms_service.get_service_status()

        # Calculate SMS statistics
        booked_in_vehicles = [v for v in vehicles if v.get('is_booked_in')]
        booked_in_with_mobile = [
            v for v in vehicles_with_mobile if v.get('is_booked_in')]
        available_for_sms = [
            v for v in vehicles_with_mobile if not v.get('is_booked_in')]

        sms_stats = {
            'total_vehicles': len(vehicles),
            'vehicles_with_mobile': len(vehicles_with_mobile),
            'vehicles_without_mobile': len(vehicles) - len(vehicles_with_mobile),
            'urgent_with_mobile': len([v for v in available_for_sms if v.get('is_expired') or v.get('days_until_expiry', 999) <= 7]),
            'due_soon_with_mobile': len([v for v in available_for_sms if not v.get('is_expired') and 7 < v.get('days_until_expiry', 999) <= 30]),
            'booked_in_total': len(booked_in_vehicles),
            'booked_in_with_mobile': len(booked_in_with_mobile),
            'available_for_sms': len(available_for_sms)
        }

        return render_template('sms_dashboard.html',
                               vehicles=vehicles_with_mobile,
                               sms_status=sms_status,
                               sms_stats=sms_stats)
    except Exception as e:
        print(f"Error rendering SMS dashboard: {str(e)}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('index'))


@mot_bp.route('/send_sms/<registration>')
def send_single_sms(registration):
    """Send SMS for a single vehicle"""
    try:
        # Find the vehicle
        vehicle = next(
            (v for v in vehicles if v['registration'] == registration), None)
        if not vehicle:
            flash('Vehicle not found', 'error')
            return redirect(url_for('mot.sms_dashboard'))

        if not vehicle.get('mobile_number'):
            flash('No mobile number available for this vehicle', 'error')
            return redirect(url_for('mot.sms_dashboard'))

        # Send SMS
        result = sms_service.send_mot_reminder(
            vehicle_info=vehicle,
            mobile_number=vehicle['mobile_number'],
            customer_name=vehicle.get('customer_name')
        )

        if result['success']:
            flash(
                f'SMS sent successfully to {vehicle["mobile_number"]}', 'success')
        else:
            flash(f'Failed to send SMS: {result["error"]}', 'error')

        return redirect(url_for('mot.sms_dashboard'))

    except Exception as e:
        print(f"Error sending SMS: {str(e)}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('mot.sms_dashboard'))


@mot_bp.route('/send_bulk_sms', methods=['POST'])
def send_bulk_sms():
    """Send bulk SMS to selected vehicles"""
    try:
        # Get selected vehicles from form
        selected_registrations = request.form.getlist('selected_vehicles')

        if not selected_registrations:
            flash('No vehicles selected', 'error')
            return redirect(url_for('mot.sms_dashboard'))

        # Prepare vehicles with contact info
        vehicles_with_contacts = []
        for reg in selected_registrations:
            vehicle = next(
                (v for v in vehicles if v['registration'] == reg), None)
            if vehicle and vehicle.get('mobile_number'):
                vehicles_with_contacts.append({
                    'vehicle_info': vehicle,
                    'mobile_number': vehicle['mobile_number'],
                    'customer_name': vehicle.get('customer_name')
                })

        if not vehicles_with_contacts:
            flash('No vehicles with mobile numbers found in selection', 'error')
            return redirect(url_for('mot.sms_dashboard'))

        # Send bulk SMS
        results = sms_service.send_bulk_reminders(vehicles_with_contacts)

        # Create summary message
        message = f"Bulk SMS completed: {results['sent']} sent, {results['failed']} failed"
        if results['errors']:
            message += f". Errors: {'; '.join(results['errors'][:3])}"
            if len(results['errors']) > 3:
                message += f" and {len(results['errors']) - 3} more"

        if results['sent'] > 0:
            flash(message, 'success')
        else:
            flash(message, 'error')

        return redirect(url_for('mot.sms_dashboard'))

    except Exception as e:
        print(f"Error sending bulk SMS: {str(e)}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('mot.sms_dashboard'))


@mot_bp.route('/api/vehicle/<registration>/complete', methods=['POST'])
def mark_vehicle_complete(registration):
    """Mark a vehicle as completed (for frontend completion tracking)"""
    try:
        data = request.get_json()
        completed = data.get('completed', False)

        # This is handled by frontend localStorage, but we can log it
        print(
            f"Vehicle {registration} marked as {'completed' if completed else 'not completed'}")

        return jsonify({'success': True, 'registration': registration, 'completed': completed})
    except Exception as e:
        print(f"Error updating completion status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/vehicle/<registration>/archive', methods=['POST'])
def archive_vehicle(registration):
    """Archive a vehicle (for frontend archiving)"""
    try:
        # This is handled by frontend localStorage, but we can log it
        print(f"Vehicle {registration} archived")

        return jsonify({'success': True, 'registration': registration, 'archived': True})
    except Exception as e:
        print(f"Error archiving vehicle: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/vehicles')
def get_vehicles_api():
    """Get vehicles for MOT reminders via API"""
    try:
        include_archived = request.args.get(
            'include_archived', 'false').lower() == 'true'
        include_flagged = request.args.get(
            'include_flagged', 'true').lower() == 'true'

        # Use integrated MOT service to get vehicles with booked in data
        if integrated_mot_service:
            vehicles_data = integrated_mot_service.get_all_mot_vehicles(
                include_flagged=include_flagged,
                include_archived=include_archived
            )
        else:
            # Fallback to global vehicles list
            vehicles_data = vehicles
            if not include_archived:
                vehicles_data = [
                    v for v in vehicles if not v.get('archived', False)]

        return jsonify({
            'success': True,
            'vehicles': vehicles_data,
            'count': len(vehicles_data)
        })
    except Exception as e:
        print(f"Error getting vehicles via API: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/vehicles/<registration>/archive', methods=['POST'])
def archive_vehicle_api(registration):
    """Archive a vehicle via API"""
    try:
        # This is handled by frontend localStorage, but we can log it
        print(f"Vehicle {registration} archived via API")
        return jsonify({'success': True, 'registration': registration, 'archived': True})
    except Exception as e:
        print(f"Error archiving vehicle via API: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/vehicles/<registration>/unarchive', methods=['POST'])
def unarchive_vehicle_api(registration):
    """Unarchive a vehicle via API"""
    try:
        # This is handled by frontend localStorage, but we can log it
        print(f"Vehicle {registration} unarchived via API")
        return jsonify({'success': True, 'registration': registration, 'archived': False})
    except Exception as e:
        print(f"Error unarchiving vehicle via API: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/vehicles/archive/bulk', methods=['POST'])
def bulk_archive_vehicles_api():
    """Bulk archive vehicles via API"""
    try:
        data = request.get_json()
        registrations = data.get('registrations', [])

        # This is handled by frontend localStorage, but we can log it
        print(f"Bulk archiving {len(registrations)} vehicles via API")

        return jsonify({
            'success': True,
            'archived_count': len(registrations),
            'registrations': registrations
        })
    except Exception as e:
        print(f"Error bulk archiving vehicles via API: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/failed-registrations')
def get_failed_registrations():
    """Get failed vehicle registrations"""
    try:
        status = request.args.get('status', 'all')

        # For now, return empty list since we don't have persistent storage
        # In a real implementation, this would query a database
        return jsonify({
            'success': True,
            'failed_registrations': [],
            'count': 0
        })
    except Exception as e:
        print(f"Error getting failed registrations: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/failed-registrations/<int:failed_id>', methods=['PUT'])
def update_failed_registration(failed_id):
    """Update a failed registration"""
    try:
        data = request.get_json()
        corrected_registration = data.get('corrected_registration', '')

        print(
            f"Updating failed registration {failed_id} with corrected registration: {corrected_registration}")

        return jsonify({
            'success': True,
            'failed_id': failed_id,
            'corrected_registration': corrected_registration
        })
    except Exception as e:
        print(f"Error updating failed registration: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/failed-registrations/bulk', methods=['POST'])
def bulk_update_failed_registrations():
    """Bulk update failed registrations"""
    try:
        data = request.get_json()
        updates = data.get('updates', [])

        print(f"Bulk updating {len(updates)} failed registrations")

        return jsonify({
            'success': True,
            'updated_count': len(updates),
            'updates': updates
        })
    except Exception as e:
        print(f"Error bulk updating failed registrations: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/sms/status')
def get_sms_status():
    """Get SMS service status"""
    try:
        if not sms_service:
            return jsonify({
                'success': False,
                'status': 'unavailable',
                'message': 'SMS service not configured'
            })

        return jsonify({
            'success': True,
            'status': 'available',
            'message': 'SMS service ready'
        })
    except Exception as e:
        print(f"Error checking SMS status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/sms/send', methods=['POST'])
def send_sms_api():
    """Send SMS via API"""
    try:
        if not sms_service:
            return jsonify({
                'success': False,
                'error': 'SMS service not available'
            }), 503

        data = request.get_json()
        registration = data.get('registration')
        mobile_number = data.get('mobile_number')
        customer_name = data.get('customer_name', '')

        # Find the vehicle
        vehicle = next(
            (v for v in vehicles if v['registration'] == registration), None)
        if not vehicle:
            return jsonify({
                'success': False,
                'error': 'Vehicle not found'
            }), 404

        # Send SMS
        result = sms_service.send_mot_reminder(
            vehicle_info=vehicle,
            mobile_number=mobile_number,
            customer_name=customer_name
        )

        return jsonify(result)
    except Exception as e:
        print(f"Error sending SMS via API: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/sms/history')
def get_sms_history():
    """Get SMS history"""
    try:
        limit = int(request.args.get('limit', 50))

        # For now, return empty history since we don't have persistent storage
        # In a real implementation, this would query a database
        return jsonify({
            'success': True,
            'history': [],
            'count': 0
        })
    except Exception as e:
        print(f"Error getting SMS history: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/api/sms/check-delivery-status', methods=['POST'])
def check_delivery_status():
    """Check SMS delivery status"""
    try:
        data = request.get_json()
        message_ids = data.get('message_ids', [])

        # For now, return success status for all messages
        # In a real implementation, this would check with Twilio
        return jsonify({
            'success': True,
            'delivery_status': {msg_id: 'delivered' for msg_id in message_ids}
        })
    except Exception as e:
        print(f"Error checking delivery status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@mot_bp.route('/set_booked_status/<registration>', methods=['POST'])
def set_vehicle_booked_status(registration):
    """Set booked in status for a specific vehicle"""
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
            is_booked_in = data.get('is_booked_in', False)
            notes = data.get('notes', '')
        else:
            is_booked_in = request.form.get(
                'is_booked_in', 'false').lower() == 'true'
            notes = request.form.get('notes', '')

        # Use integrated MOT service to handle booked status
        if integrated_mot_service:
            result = integrated_mot_service.set_vehicle_booked_status(
                registration, is_booked_in, notes)

            if result.get('success'):
                if request.is_json:
                    return jsonify(result)
                else:
                    flash(result.get(
                        'message', 'Status updated successfully'), 'success')
                    return redirect(url_for('mot.index'))
            else:
                if request.is_json:
                    return jsonify(result), 400
                else:
                    flash(result.get('error', 'Failed to update status'), 'error')
                    return redirect(url_for('mot.index'))
        else:
            error_msg = 'MOT service not available'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 503
            else:
                flash(error_msg, 'error')
                return redirect(url_for('mot.index'))

    except Exception as e:
        print(f"Error in set_vehicle_booked_status: {e}")
        error_msg = str(e)
        if request.is_json:
            return jsonify({'success': False, 'error': error_msg}), 500
        else:
            flash(f'Error: {error_msg}', 'error')
            return redirect(url_for('mot.index'))


@mot_bp.route('/bulk_set_booked_status', methods=['POST'])
def bulk_set_booked_status():
    """Set booked in status for multiple vehicles"""
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
            registrations = data.get('registrations', [])
            is_booked_in = data.get('is_booked_in', False)
            notes = data.get('notes', '')
        else:
            registrations = request.form.getlist('registrations')
            is_booked_in = request.form.get(
                'is_booked_in', 'false').lower() == 'true'
            notes = request.form.get('notes', '')

        if not registrations:
            error_msg = 'No vehicles specified'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 400
            else:
                flash(error_msg, 'error')
                return redirect(url_for('mot.index'))

        # Use integrated MOT service to handle bulk booked status
        if integrated_mot_service:
            result = integrated_mot_service.bulk_set_booked_status(
                registrations, is_booked_in, notes)

            if result.get('success'):
                if request.is_json:
                    return jsonify(result)
                else:
                    flash(result.get(
                        'message', 'Bulk status updated successfully'), 'success')
                    return redirect(url_for('mot.index'))
            else:
                if request.is_json:
                    return jsonify(result), 400
                else:
                    flash(result.get('error', 'Failed to update bulk status'), 'error')
                    return redirect(url_for('mot.index'))
        else:
            error_msg = 'MOT service not available'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 503
            else:
                flash(error_msg, 'error')
                return redirect(url_for('mot.index'))

    except Exception as e:
        print(f"Error in bulk_set_booked_status: {e}")
        error_msg = str(e)
        if request.is_json:
            return jsonify({'success': False, 'error': error_msg}), 500
        else:
            flash(f'Error: {error_msg}', 'error')
            return redirect(url_for('mot.index'))

# Alternative form-based endpoints for better compatibility


@mot_bp.route('/book_vehicle', methods=['POST'])
def book_vehicle():
    """Form-based endpoint to book a vehicle"""
    try:
        registration = request.form.get('registration')
        notes = request.form.get('notes', '')

        if not registration:
            flash('Vehicle registration is required', 'error')
            return redirect(url_for('mot.index'))

        if integrated_mot_service:
            result = integrated_mot_service.set_vehicle_booked_status(
                registration, True, notes)

            if result.get('success'):
                flash(result.get('message', 'Vehicle booked successfully'), 'success')
            else:
                flash(result.get('error', 'Failed to book vehicle'), 'error')
        else:
            flash('MOT service not available', 'error')

        return redirect(url_for('mot.index'))

    except Exception as e:
        flash(f'Error booking vehicle: {str(e)}', 'error')
        return redirect(url_for('mot.index'))


@mot_bp.route('/unbook_vehicle', methods=['POST'])
def unbook_vehicle():
    """Form-based endpoint to unbook a vehicle"""
    try:
        registration = request.form.get('registration')

        if not registration:
            flash('Vehicle registration is required', 'error')
            return redirect(url_for('mot.index'))

        if integrated_mot_service:
            result = integrated_mot_service.set_vehicle_booked_status(
                registration, False, '')

            if result.get('success'):
                flash(result.get('message', 'Vehicle unbooked successfully'), 'success')
            else:
                flash(result.get('error', 'Failed to unbook vehicle'), 'error')
        else:
            flash('MOT service not available', 'error')

        return redirect(url_for('mot.index'))

    except Exception as e:
        flash(f'Error unbooking vehicle: {str(e)}', 'error')
        return redirect(url_for('mot.index'))

# Blueprint initialization function


def init_mot_blueprint(app):
    """Initialize the MOT blueprint with the main app"""
    # Initialize services
    init_mot_services()

    # Add the filter to Jinja2
    app.jinja_env.filters['format_date'] = format_date_for_display

    # Create uploads directory if it doesn't exist
    upload_folder = os.path.join(app.instance_path, 'mot_uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    print("✅ MOT Blueprint initialized successfully")


# For standalone testing
if __name__ == '__main__':
    from flask import Flask
    app = Flask(__name__)
    app.secret_key = os.urandom(24)
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

    init_mot_blueprint(app)
    app.register_blueprint(mot_bp)

    print("🚗 Starting MOT Reminder standalone...")
    app.run(debug=True, port=5001, host='127.0.0.1')
