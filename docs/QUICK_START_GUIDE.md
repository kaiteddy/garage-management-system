# Quick Start Guide - MOT Reminders Integration

## 🚀 Getting Started

### 1. Open the Application
- Open `src/static/index.html` in your web browser
- Navigate to **"MOT Reminders"** in the sidebar

### 2. Test the System

#### **Empty System Start**
- The system starts completely empty with no vehicles
- All statistics show zero (0 Expired, 0 Critical, 0 Due Soon, 0 Valid)
- You'll see a helpful empty state with buttons to add vehicles

#### **Add Single Vehicle**
1. Click **"Add Vehicle"** button
2. Enter a registration number (e.g., "TEST123")
3. Optionally add customer name and mobile number
4. Click **"Add Vehicle"** - system will simulate DVSA API call

#### **Test Bulk Upload**
1. Click **"Bulk Upload"** button
2. Download the CSV template by clicking **"CSV Template"**
3. Use the provided `test_bulk_upload.csv` file or create your own
4. Drag and drop the file or click to select
5. Preview the data and click **"Upload Vehicles"**

#### **Test SMS Functionality**
1. Select vehicles using checkboxes
2. Click **"Send SMS"** button
3. Review selected vehicles
4. Click **"Send SMS"** - messages will be logged to browser console (demo mode)

### 3. CSV File Format

Your CSV file should have these columns:
```csv
registration,customer_name,mobile_number
AB12CDE,John Smith,07123456789
XY98ZYZ,Sarah Johnson,07987654321
```

**Required:**
- `registration` - Vehicle registration number

**Optional:**
- `customer_name` - Customer name for personalized SMS
- `mobile_number` - Mobile number for SMS notifications

### 4. Features Available

#### **View Modes**
- **List View**: Comprehensive table with all details
- **Card View**: Visual cards with color-coded status

#### **Sorting Options**
- By Urgency (default)
- By Expiry Date
- By Registration
- By Customer

#### **Status Indicators**
- 🚨 **EXPIRED**: Red background, urgent attention needed
- ⚠️ **CRITICAL**: Orange background, expires within 7 days
- 📅 **DUE SOON**: Yellow background, expires within 30 days
- ✅ **VALID**: Green background, MOT valid for 30+ days

#### **SMS Templates**
Different message templates based on urgency:
- **Expired**: Urgent warning about expired MOT
- **Critical**: Warning for MOTs expiring within 7 days
- **Due Soon**: Reminder for MOTs expiring within 30 days
- **General**: Standard reminder for valid MOTs

### 5. Troubleshooting

#### **Data Not Loading**
- Check browser console for error messages
- Ensure you're on the "MOT Reminders" page
- Try refreshing the page

#### **Bulk Upload Issues**
- Ensure CSV has 'registration' column header
- Check file format (CSV or Excel)
- Verify data preview shows correctly

#### **SMS Not Working**
- System runs in demo mode by default
- Check browser console for SMS message logs
- Configure Twilio credentials for real SMS

### 6. Real DVSA API Integration (Recommended)

To enable real DVSA MOT data instead of simulated data:

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start DVSA Backend Service**:
   ```bash
   python start_mot_service.py
   ```
   This will:
   - Start the backend service with real DVSA API integration
   - Use pre-configured DVSA credentials
   - Provide real MOT data for UK vehicles

3. **Configure Additional Credentials** (Optional):
   - Edit `src/.env` file for SMS functionality
   - DVSA credentials are already pre-configured

### 7. Sample Test Data

Use this sample data for testing:

```csv
registration,customer_name,mobile_number
TEST001,Alice Johnson,07111222333
TEST002,Bob Smith,07444555666
TEST003,Carol Davis,07777888999
TEST004,David Wilson,07000111222
TEST005,Emma Brown,07333444555
```

## 🎯 Expected Results

After following this guide, you should see:

1. **Empty System Start**: Clean interface with zero statistics and helpful empty state
2. **Real DVSA Integration**: Vehicles added with authentic MOT data from DVSA API
3. **Working Bulk Upload**: Successfully import vehicles from CSV files with real data
4. **SMS Demo**: Console logs showing SMS messages being sent
5. **Responsive UI**: Clean, modern interface matching the main system
6. **Authentic MOT Data**: Real MOT expiry dates, test results, and vehicle details from DVLA

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify CSV file format matches template
3. Ensure all required columns are present
4. Try with smaller test files first

The system is designed to work offline with demo data, so you can test all functionality without external API dependencies.
