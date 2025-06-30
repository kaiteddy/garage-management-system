import os
import tempfile

from flask import (Blueprint, flash, jsonify, redirect, render_template,
                   request, url_for)
from werkzeug.utils import secure_filename

try:
    from services.csv_import_service import CSVImportService
except ImportError:
    CSVImportService = None

upload_bp = Blueprint('upload', __name__)

# Configuration
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
# 100MB (increased for large ELI MOTORS files)
MAX_FILE_SIZE = 100 * 1024 * 1024


@upload_bp.route('/test')
def test_route():
    """Test route to verify blueprint is working"""
    return jsonify({'message': 'Upload blueprint is working!', 'success': True})


@upload_bp.route('/debug')
def debug_route():
    """Debug route to check blueprint registration"""
    return jsonify({
        'message': 'Upload blueprint debug endpoint',
        'blueprint_name': 'upload',
        'success': True,
        'csv_service_available': CSVImportService is not None
    })


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('/')
@upload_bp.route('/upload')
def upload_page():
    """Display the upload page and inject Google client ID"""
    from flask import current_app
    google_client_id = getattr(current_app.config, 'GOOGLE_CLIENT_ID', None)
    google_project_id = getattr(current_app.config, 'GOOGLE_PROJECT_ID', None)
    return render_template('upload.html', google_client_id=google_client_id, google_project_id=google_project_id)


@upload_bp.route('/csv', methods=['POST'])
def upload_csv():
    """Handle multiple file uploads with automatic table detection"""
    try:
        # Check if files were uploaded
        if 'files[]' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No files selected'
            }), 400

        files = request.files.getlist('files[]')
        results = []

        for file in files:
            if file.filename == '':
                results.append({
                    'filename': file.filename or 'unnamed',
                    'success': False,
                    'error': 'Empty file'
                })
                continue

            if not allowed_file(file.filename):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'Invalid file type. Please upload CSV or Excel files only.'
                })
                continue

            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            if file_size > MAX_FILE_SIZE:
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.'
                })
                continue

            # Save file temporarily
            filename = secure_filename(file.filename)
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, filename)

            try:
                file.save(temp_path)

                # Import the CSV using the correct database path
                db_path = os.path.join(os.path.dirname(
                    os.path.dirname(__file__)), 'data', 'garage.db')
                
                # Ensure the database directory exists
                os.makedirs(os.path.dirname(db_path), exist_ok=True)
                
                csv_service = CSVImportService(db_path)
                
                # Try to detect the table name from filename
                filename_lower = filename.lower()
                if 'customer' in filename_lower:
                    table_name = 'customers'
                elif 'vehicle' in filename_lower:
                    table_name = 'vehicles'
                elif 'job' in filename_lower or 'service' in filename_lower:
                    table_name = 'jobs'
                else:
                    table_name = 'customers'  # Default
                
                # Import the file
                result = csv_service.import_from_file(temp_path, table_name)
                
                if result['success']:
                    results.append({
                        'filename': filename,
                        'success': True,
                        'table': table_name,
                        'imported': result.get('imported_count', 0),
                        'message': f"Successfully imported {result.get('imported_count', 0)} records to {table_name}",
                        'stats': result.get('stats', {})
                    })
                else:
                    results.append({
                        'filename': filename,
                        'success': False,
                        'error': result.get('error', 'Unknown error during import')
                    })
                    
            except Exception as e:
                results.append({
                    'filename': filename,
                    'success': False,
                    'error': f'Error processing file: {str(e)}'
                })
                
            finally:
                # Always clean up temp file
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                except Exception as e:
                    print(f"Warning: Could not remove temp file {temp_path}: {e}")
        
        # Check if any files were processed successfully
        success_count = sum(1 for r in results if r.get('success', False))
        
        return jsonify({
            'success': success_count > 0,
            'results': results,
            'total_files': len(files),
            'successful_imports': success_count,
            'failed_imports': len(files) - success_count
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }), 500


@upload_bp.route('/templates/<table_name>')
def download_template(table_name):
    """Download CSV template for specified table"""
    templates = {
        'customers': {
            'filename': 'customers_template.csv',
            'headers': ['Account Number', 'Name', 'Company', 'Address', 'Postcode', 'Phone', 'Mobile', 'Email']
        },
        'vehicles': {
            'filename': 'vehicles_template.csv',
            'headers': ['Registration', 'Make', 'Model', 'Year', 'Color', 'Fuel Type', 'MOT Expiry', 'Tax Due', 'Mileage', 'Customer Account']
        },
        'jobs': {
            'filename': 'jobs_template.csv',
            'headers': ['Job Number', 'Customer Account', 'Registration', 'Description', 'Status', 'Labour Cost', 'Parts Cost', 'Total Amount']
        },
        'invoices': {
            'filename': 'invoices_template.csv',
            'headers': ['Invoice Number', 'Job Number', 'Customer Account', 'Registration', 'Amount', 'VAT Amount', 'Total Amount', 'Status']
        },
        'parts': {
            'filename': 'parts_template.csv',
            'headers': ['Part Number', 'Name', 'Description', 'Supplier', 'Cost Price', 'Sell Price', 'Stock Quantity', 'Min Stock Level', 'Location']
        },
        'suppliers': {
            'filename': 'suppliers_template.csv',
            'headers': ['Name', 'Contact Person', 'Address', 'Postcode', 'Phone', 'Email', 'Website', 'Account Number', 'Payment Terms']
        },
        'expenses': {
            'filename': 'expenses_template.csv',
            'headers': ['Expense Number', 'Supplier', 'Category', 'Description', 'Amount', 'VAT Amount', 'Total Amount', 'Expense Date', 'Payment Method']
        },
        'document_extras': {
            'filename': 'document_extras_template.csv',
            'headers': ['_ID', 'Labour Description', 'docNotes']
        },
        'documents': {
            'filename': 'documents_template.csv',
            'headers': ['_ID', 'custAccountNumber', 'vehRegistration', 'vehMake', 'vehModel', 'vehMileage', 'docType', 'docStatus', 'docNumber_Jobsheet', 'docNumber_Invoice', 'docDate_Created', 'docDate_Issued', 'docDate_Paid', 'us_SubTotal_LabourNET', 'us_SubTotal_PartsNET', 'us_TotalNET', 'us_TotalTAX', 'us_TotalGROSS']
        },
        'receipts': {
            'filename': 'receipts_template.csv',
            'headers': ['_ID', '_ID_Document', 'Amount', 'Date', 'Description', 'Method', 'Reconciled', 'Reconciled_Date', 'Reconciled_Ref', 'SurchargeApplied', 'SurchargeGROSS', 'SurchargeNET', 'SurchargeTAX', 'TotalReceipt']
        }
    }

    if table_name not in templates:
        return jsonify({'error': 'Invalid table name'}), 400

    template = templates[table_name]

    # Create CSV content
    csv_content = ','.join(template['headers']) + '\n'

    # Add sample row for guidance
    if table_name == 'customers':
        csv_content += 'CUST001,John Smith,Smith Motors,123 Main St,SW1A 1AA,02012345678,07123456789,john@example.com\n'
    elif table_name == 'vehicles':
        csv_content += 'AB12CDE,Ford,Focus,2020,Blue,Petrol,2025-03-15,2024-12-31,45000,CUST001\n'
    elif table_name == 'jobs':
        csv_content += 'J001,CUST001,AB12CDE,Annual Service,COMPLETED,150.00,75.50,225.50\n'
    elif table_name == 'document_extras':
        csv_content += 'OOTOSBT1OR6V4CLOYY5J,MOT TEST,Additional notes here\n'
    elif table_name == 'documents':
        csv_content += 'OOTOSBT1OR6V4CLOYY5J,GEO001,AB12CDE,Ford,Focus,45000,SI,Issued,60001,60001,07/04/2011,07/04/2011,12/04/2011,150.00,75.50,225.50,45.10,270.60\n'
    elif table_name == 'receipts':
        csv_content += '003F35FBF43C9A4499040F0D390DA97B,GZLM884LRLRJOIQC74JTT8,857.82,12/04/2011,Card,Card,1,28/06/2016,001,0,0,0,0,857.82\n'

    from flask import Response
    return Response(
        csv_content,
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename={template["filename"]}'}
    )


@upload_bp.route('/status')
def upload_status():
    """Get upload status and statistics"""
    try:
        # Use unified database path
        db_path = os.path.join(os.path.dirname(
            os.path.dirname(__file__)), 'garage_management.db')
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get table counts for unified database
        tables = ['customers', 'vehicles', 'mot_records', 'job_sheets',
                  'appointments', 'sms_communications', 'parts_inventory']
        counts = {}

        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cursor.fetchone()[0]

        conn.close()

        return jsonify({
            'success': True,
            'counts': counts
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@upload_bp.route('/bulk')
def bulk_upload_page():
    """Get bulk upload information and available tables"""
    try:
        # Return information about bulk upload capabilities
        available_tables = ['customers', 'vehicles',
                            'mot_records', 'job_sheets', 'appointments']

        return jsonify({
            'success': True,
            'message': 'Bulk upload endpoint available',
            'available_tables': available_tables,
            'max_files': 10,
            'supported_formats': ['csv'],
            'endpoints': {
                'upload': '/api/bulk/process',
                'templates': '/api/templates/<table_name>',
                'status': '/api/status'
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@upload_bp.route('/bulk/process', methods=['POST'])
def process_bulk_upload():
    """Process multiple CSV files at once"""
    try:
        files = request.files.getlist('files[]')
        table_mappings = request.form.getlist('table_mappings[]')

        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'No files selected'
            }), 400

        results = []
        # Use the correct database path
        db_path = os.path.join(os.path.dirname(
            os.path.dirname(__file__)), 'data', 'garage.db')
        
        # Ensure the database directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        if not CSVImportService:
            print("CSV Import Service not available")
            return jsonify({
                'success': False,
                'error': 'CSV import service not available. Please check server logs.'
            }), 503

        import_service = CSVImportService(db_path)

        for i, file in enumerate(files):
            if file.filename == '':
                continue

            if not allowed_file(file.filename):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'Invalid file type'
                })
                continue

            # Get table mapping for this file
            table_name = table_mappings[i] if i < len(
                table_mappings) else 'customers'

            # Save file temporarily
            filename = secure_filename(file.filename)
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, f"{i}_{filename}")

            file.save(temp_path)

            try:
                # Import the CSV
                result = import_service.import_csv_file(temp_path, table_name)
                result['filename'] = file.filename
                result['table'] = table_name
                results.append(result)

            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'table': table_name,
                    'success': False,
                    'error': str(e)
                })
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        return jsonify({
            'success': True,
            'results': results
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Bulk upload failed: {str(e)}'
        }), 500
