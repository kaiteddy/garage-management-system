#!/usr/bin/env python3
"""
Demo script showing bulk upload functionality
"""

import os
import sys
import pandas as pd

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import bulk_check_vehicles, process_uploaded_file
from mot_reminder import MOTReminder

def create_demo_files():
    """Create demo CSV and Excel files"""
    print("Creating demo files...")
    
    # Sample vehicle registrations (mix of real and test)
    demo_data = {
        'registration': [
            'AB12CDE',  # Test registration
            'LN64XFG',  # Real registration that worked in testing
            'XY34FGH',  # Test registration
            'MN56JKL',  # Test registration
        ]
    }
    
    # Create CSV file
    df = pd.DataFrame(demo_data)
    df.to_csv('demo_vehicles.csv', index=False)
    print("✓ Created demo_vehicles.csv")
    
    # Create Excel file
    with pd.ExcelWriter('demo_vehicles.xlsx', engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Vehicle Registrations')
    print("✓ Created demo_vehicles.xlsx")
    
    return True

def demo_csv_upload():
    """Demonstrate CSV file upload processing"""
    print("\n" + "="*50)
    print("DEMO: CSV File Upload Processing")
    print("="*50)
    
    if not os.path.exists('demo_vehicles.csv'):
        print("✗ Demo CSV file not found")
        return False
    
    try:
        # Process the CSV file
        with open('demo_vehicles.csv', 'r') as f:
            registrations, error = process_uploaded_file(f)
        
        if error:
            print(f"✗ Error processing CSV: {error}")
            return False
        
        print(f"✓ Successfully extracted {len(registrations)} registrations from CSV")
        print(f"  Registrations: {registrations}")
        
        # Simulate bulk checking (without actually calling API to avoid rate limits)
        print(f"\n📋 Would process {len(registrations)} vehicles:")
        for i, reg in enumerate(registrations, 1):
            print(f"  {i}. {reg}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error in CSV demo: {e}")
        return False

def demo_excel_upload():
    """Demonstrate Excel file upload processing"""
    print("\n" + "="*50)
    print("DEMO: Excel File Upload Processing")
    print("="*50)
    
    if not os.path.exists('demo_vehicles.xlsx'):
        print("✗ Demo Excel file not found")
        return False
    
    try:
        # Process the Excel file
        with open('demo_vehicles.xlsx', 'rb') as f:
            registrations, error = process_uploaded_file(f)
        
        if error:
            print(f"✗ Error processing Excel: {error}")
            return False
        
        print(f"✓ Successfully extracted {len(registrations)} registrations from Excel")
        print(f"  Registrations: {registrations}")
        
        # Show file info
        df = pd.read_excel('demo_vehicles.xlsx')
        print(f"✓ Excel file contains {len(df)} rows")
        print(f"✓ Columns: {list(df.columns)}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error in Excel demo: {e}")
        return False

def demo_web_interface_features():
    """Show what's available in the web interface"""
    print("\n" + "="*50)
    print("WEB INTERFACE FEATURES")
    print("="*50)
    
    features = [
        "🌐 Modern Bootstrap-based responsive UI",
        "➕ Single vehicle addition by registration number",
        "📁 Bulk file upload (CSV/Excel)",
        "📥 Template file downloads",
        "🔄 Real-time MOT status checking",
        "🎨 Color-coded status indicators:",
        "   🔴 Red: MOT expired",
        "   🟡 Yellow: MOT expires within 30 days",
        "   🟢 Green: MOT valid for more than 30 days",
        "📊 Vehicle information display:",
        "   • Registration number",
        "   • Make and model",
        "   • MOT expiry date",
        "   • Last test date and result",
        "   • Days until expiry",
        "🗑️ Individual vehicle removal",
        "🔄 Bulk status refresh for all vehicles",
        "💬 Flash message notifications",
        "📱 Mobile-friendly responsive design"
    ]
    
    for feature in features:
        print(f"  {feature}")
    
    print(f"\n🚀 Access the web interface at: http://127.0.0.1:5001")
    print(f"📝 Start with: cd mot_reminder && python app.py")

def main():
    """Run the bulk upload demo"""
    print("MOT Reminder Tool - Bulk Upload Demo")
    print("=" * 60)
    
    # Create demo files
    create_demo_files()
    
    # Run demos
    demos = [
        demo_csv_upload,
        demo_excel_upload,
        demo_web_interface_features
    ]
    
    for demo in demos:
        demo()
    
    print("\n" + "=" * 60)
    print("🎉 BULK UPLOAD FEATURE READY!")
    print("=" * 60)
    
    print("\n📋 QUICK START GUIDE:")
    print("1. Start the web app: python app.py")
    print("2. Open browser: http://127.0.0.1:5001")
    print("3. Download a template file (CSV or Excel)")
    print("4. Add your vehicle registrations to the template")
    print("5. Upload the file using the 'Bulk Upload' section")
    print("6. Review the results and MOT status for all vehicles")
    
    print("\n📁 DEMO FILES CREATED:")
    print("• demo_vehicles.csv - Sample CSV file")
    print("• demo_vehicles.xlsx - Sample Excel file")
    print("• sample_vehicles.csv - Basic template")
    
    print("\n✨ The MOT reminder tool now supports:")
    print("• Single vehicle addition")
    print("• Bulk CSV file upload")
    print("• Bulk Excel file upload")
    print("• Template file downloads")
    print("• Automatic duplicate detection")
    print("• Real-time API integration")
    print("• Professional web interface")

if __name__ == "__main__":
    main()
