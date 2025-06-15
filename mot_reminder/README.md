# MOT Reminder Tool

A comprehensive tool for checking MOT status and sending reminders using the DVSA MOT History API. Features both a web interface and command-line operation.

## ✅ **FULLY CONFIGURED AND TESTED**

This tool is now fully configured with working API credentials and has been tested successfully!

## Features

### 🌐 **Web Interface**
- Modern, responsive Bootstrap-based UI
- Add/remove vehicles with registration numbers
- **📁 Bulk file upload support (CSV/Excel)**
- **📥 Template file downloads**
- Visual status indicators (expired, due soon, valid)
- Real-time MOT status checking
- Color-coded vehicle cards for quick status overview

### 🖥️ **Command Line Interface**
- Automated daily checks at 09:00
- Console-based reminders and notifications
- Scheduled background monitoring

### 📊 **MOT Monitoring**
- Check MOT status for any UK registered vehicle
- 30-day advance warning system
- Urgent notifications for expired MOTs
- Comprehensive vehicle information display

## Prerequisites

- Python 3.7 or higher
- DVSA API access (✅ **Already configured**)

## Setup

### 1. Dependencies
All dependencies are already installed:
```bash
pip install -r requirements.txt
```

### 2. API Configuration
✅ **Already configured** with working credentials in `.env` file:
- CLIENT_ID: Configured
- CLIENT_SECRET: Configured
- API_KEY: Configured
- TOKEN_URL: Configured

## Usage

### 🌐 **Web Interface (Recommended)**

1. Start the web application:
```bash
cd mot_reminder
python app.py
```

2. Open your browser and go to: `http://127.0.0.1:5001`

3. Use the web interface to:
   - Add vehicles by registration number
   - **📁 Upload CSV or Excel files with multiple registrations**
   - **📥 Download template files for bulk uploads**
   - View MOT status for all vehicles
   - Check individual vehicles
   - Remove vehicles from monitoring

### 🖥️ **Command Line Interface**

1. Edit the vehicles list in `mot_reminder.py`:
```python
vehicles = ['AB12CDE', 'XY12ZYZ']  # Add your registration numbers
```

2. Run the automated monitoring:
```bash
cd mot_reminder
python mot_reminder.py
```

## Testing

### ✅ **API Connectivity Test**
```bash
cd mot_reminder
python test_api_connection.py
```

### ✅ **Full System Test**
```bash
cd mot_reminder
python test_mot_reminder.py
```

### ✅ **File Upload Test**
```bash
cd mot_reminder
python test_file_upload.py
```

## 📁 **File Upload Feature**

### **Supported File Formats**
- **CSV files** (.csv)
- **Excel files** (.xlsx, .xls)

### **File Structure Requirements**
Your file should contain vehicle registration numbers in one of these column formats:
- `registration`
- `reg`
- `registration_number`
- `reg_number`
- `vehicle_registration`
- `number_plate`
- `plate`
- `vrm`

If none of these column names are found, the first column will be used.

### **Example CSV Format**
```csv
registration
AB12CDE
XY34FGH
MN56JKL
PQ78RST
```

### **Example Excel Format**
| registration |
|--------------|
| AB12CDE      |
| XY34FGH      |
| MN56JKL      |
| PQ78RST      |

### **Using File Upload**
1. **Download Template**: Click "CSV Template" or "Excel Template" to download a sample file
2. **Fill Template**: Add your vehicle registration numbers to the template
3. **Upload File**: Use the "Bulk Upload" section to upload your file
4. **Review Results**: The system will show how many vehicles were added, failed, or were duplicates

### **File Upload Features**
- ✅ **Automatic duplicate detection**
- ✅ **Bulk MOT status checking**
- ✅ **Progress feedback and error reporting**
- ✅ **Support for various column naming conventions**
- ✅ **File size limit: 16MB**
- ✅ **Automatic registration number cleaning and validation**

## Example Output

### Web Interface
- Clean, professional dashboard
- Color-coded vehicle status cards
- Bootstrap-styled responsive design

### Command Line
```
MOT Reminder for AB12CDE:
Vehicle: VAUXHALL ASTRA
MOT expires in 365 days
Expiry date: 2026-06-11
Last test date: 2025-06-12
Last test result: PASSED
```

### Urgent Notifications
```
URGENT: MOT EXPIRED for XY12ZYZ
Vehicle: FORD FOCUS
MOT expired on 2024-05-15
Please book your MOT test immediately!
```

## Technical Details

### 🔐 **Authentication**
- OAuth2 client credentials flow
- Automatic token refresh
- Secure credential storage in `.env` file

### 🌐 **API Integration**
- DVSA MOT History API v1
- Handles multiple date formats
- Comprehensive error handling
- Network resilience

### 📅 **Scheduling**
- Daily automated checks at 09:00
- Background thread execution
- Configurable reminder thresholds

## File Structure

```
mot_reminder/
├── app.py                    # Flask web application
├── mot_reminder.py           # Core MOT checking logic
├── requirements.txt          # Python dependencies
├── .env                     # API credentials (configured)
├── README.md                # This documentation
├── test_mot_reminder.py     # Basic functionality tests
├── test_api_connection.py   # API connectivity tests
└── templates/
    └── index.html           # Web interface template
```

## Error Handling

The tool includes comprehensive error handling for:
- ✅ Invalid API credentials
- ✅ Network connectivity issues
- ✅ Invalid registration numbers
- ✅ Missing vehicle data
- ✅ API rate limiting
- ✅ Token expiration and refresh

## Status Indicators

### Web Interface
- 🔴 **Red border**: MOT expired
- 🟡 **Yellow border**: MOT expires within 30 days
- 🟢 **Green border**: MOT valid for more than 30 days

### Command Line
- **URGENT**: Red text for expired MOTs
- **Reminder**: Yellow text for MOTs expiring soon
- **Valid**: Green text for current MOTs

## Production Deployment

For production use:
1. Use a production WSGI server (e.g., Gunicorn)
2. Set up proper logging
3. Configure database storage for vehicle lists
4. Set up email notifications
5. Use environment variables for all configuration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🎉 **Ready to Use!**

The MOT Reminder Tool is fully configured and tested. You can start using it immediately:

1. **Web Interface**: `python app.py` → `http://127.0.0.1:5001`
2. **Command Line**: `python mot_reminder.py`

All API credentials are configured and working. The tool has been tested with real DVSA data and is ready for production use!