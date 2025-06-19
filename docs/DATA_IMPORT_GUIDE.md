# Data Import Guide for Garage Management System

## Overview

This guide explains how to import detailed parts, labour, and advisory information from your existing garage management system into the new enhanced invoice system.

## Database Schema

The system now supports detailed breakdown of invoices with the following new tables:

### Parts Table
- `part_number`: Part identification number
- `description`: Part description
- `quantity`: Number of parts used
- `unit_price`: Price per unit
- `total_price`: Total cost for this part
- `supplier`: Parts supplier name

### Labour Table
- `description`: Work description
- `hours`: Time spent on work
- `rate`: Hourly rate
- `total_price`: Total labour cost
- `technician`: Technician who performed the work

### Advisories Table
- `description`: Advisory description
- `severity`: Severity level (INFO, MINOR, MAJOR, CRITICAL)
- `recommendation`: Recommended action
- `vehicle_id`: Associated vehicle

## Data Import Process

### Step 1: Prepare Your Data

Export your existing garage data into CSV format with the following structures:

#### Parts CSV Format
```csv
invoice_number,job_number,part_number,description,quantity,unit_price,total_price,supplier
90941,J-90941,BP001,Brake Pads - Front Set,1,45.50,45.50,Euro Car Parts
88769,J-88769,OF002,Oil Filter,1,12.99,12.99,GSF
```

#### Labour CSV Format
```csv
invoice_number,job_number,description,hours,rate,total_price,technician
90941,J-90941,Brake Pad Replacement,1.5,65.00,97.50,John Smith
88769,J-88769,Oil Change Service,0.5,65.00,32.50,Mike Jones
```

#### Advisories CSV Format
```csv
invoice_number,job_number,vehicle_registration,description,severity,recommendation
90941,J-90941,LS18 ZZA,Rear brake discs showing wear,MINOR,Replace within 6 months
88769,J-88769,RF53 FJO,Air filter requires replacement,ADVISORY,Replace at next service
```

### Step 2: Generate Template Files

Run the following command to create template CSV files:

```bash
python3 import_detailed_data.py create_templates
```

This creates:
- `parts_template.csv`
- `labour_template.csv`
- `advisories_template.csv`

### Step 3: Import Your Data

Use the import script to load your data:

```bash
# Import parts data
python3 import_detailed_data.py import_parts your_parts_data.csv

# Import labour data
python3 import_detailed_data.py import_labour your_labour_data.csv

# Import advisories data
python3 import_detailed_data.py import_advisories your_advisories_data.csv
```

## Data Mapping

The import script automatically maps your data to existing invoices and jobs using:

- **Invoice Number**: Links parts/labour to specific invoices
- **Job Number**: Links parts/labour to specific jobs
- **Vehicle Registration**: Links advisories to specific vehicles

## Extracting Data from Your Current System

Based on the screenshot you provided, your current system contains detailed information that can be extracted:

### From Job Sheets
- Parts used with quantities and prices
- Labour hours and descriptions
- Technician assignments
- Advisory items and recommendations

### Recommended Export Process

1. **Export Service History**: Extract all service records with detailed breakdowns
2. **Export Parts Usage**: Get parts data with supplier information
3. **Export Labour Records**: Get time tracking and technician assignments
4. **Export Advisories**: Get MOT advisories and recommendations

## Data Validation

The import script includes validation to ensure:

- Invoice numbers exist in the database
- Job numbers are valid
- Vehicle registrations are found
- Numeric values are properly formatted
- Required fields are present

## Troubleshooting

### Common Issues

1. **Invoice Not Found**: Ensure invoice numbers match exactly
2. **Job Not Found**: Verify job number format (e.g., "J-90941")
3. **Vehicle Not Found**: Check vehicle registration format
4. **Data Format Errors**: Ensure CSV files use proper formatting

### Error Messages

- `Invoice not found`: The invoice number doesn't exist in the database
- `Job not found`: The job number doesn't exist in the database
- `Invalid data format`: Check CSV column headers and data types

## Integration with Existing Data

The enhanced system maintains compatibility with your existing data while adding detailed breakdown capabilities:

- **Existing invoices** continue to work normally
- **New detailed data** enhances invoice views with parts/labour tabs
- **Service history** now shows more comprehensive information
- **Clickable invoices** provide complete job details

## Next Steps

1. **Export your current data** in the required CSV format
2. **Test with small datasets** first to verify the import process
3. **Import all historical data** to get complete service records
4. **Verify data integrity** by checking invoice details in the web interface

## Support

If you encounter issues during the import process:

1. Check the CSV file format matches the templates
2. Verify that invoice/job numbers exist in the database
3. Ensure data types are correct (numbers for prices, dates for dates)
4. Review the console output for specific error messages

The system is now ready to display the detailed parts, labour, and advisory information just like in your original garage management system screenshot.
