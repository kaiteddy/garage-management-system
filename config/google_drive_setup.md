# Google Drive Integration Setup Guide

This guide will help you set up Google Drive integration for automatic data synchronization.

## Prerequisites

1. **Google Account** - You need a Google account with access to Google Drive
2. **Google Cloud Console Access** - You'll need to create a project and enable APIs

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Give your project a name (e.g., "ELI Motors Garage System")
4. Note down your Project ID

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields:
     - App name: "ELI Motors Garage Management"
     - User support email: Your email
     - Developer contact: Your email
4. For Application type, choose "Desktop application"
5. Give it a name (e.g., "Garage Management Desktop")
6. Click "Create"

## Step 4: Download Credentials

1. After creating the OAuth client, click the download button (⬇️)
2. Save the JSON file as `google_credentials.json`
3. Place it in the `config/` directory of your garage management system

## Step 5: Install Dependencies

Run the following command to install Google Drive dependencies:

```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib google-auth pandas
```

## Step 6: Organize Your Google Drive

Create folders in your Google Drive for each data type:

### Recommended Folder Structure:
```
📁 ELI_MOTORS_Data/
├── 📁 ELI_MOTORS_Customers/
│   └── 📄 customers.csv
├── 📁 ELI_MOTORS_Vehicles/
│   └── 📄 vehicles.csv
├── 📁 ELI_MOTORS_Jobs/
│   └── 📄 jobs.csv
├── 📁 ELI_MOTORS_Invoices/
│   └── 📄 invoices.csv
├── 📁 ELI_MOTORS_Documents/
│   └── 📄 documents.csv
├── 📁 ELI_MOTORS_Receipts/
│   └── 📄 receipts.csv
├── 📁 ELI_MOTORS_Parts/
│   └── 📄 parts.csv
├── 📁 ELI_MOTORS_Suppliers/
│   └── 📄 suppliers.csv
└── 📁 ELI_MOTORS_Expenses/
    └── 📄 expenses.csv
```

## Step 7: First Time Setup

1. Start your garage management system
2. Navigate to the Google Drive integration page
3. Click "Test Connection" - this will open a browser window
4. Sign in to your Google account and grant permissions
5. The system will save your authentication tokens

## Step 8: Configure Folder Mappings

1. In the Google Drive integration interface, click "Configure Folders"
2. For each data type:
   - Select the data type from the dropdown
   - Search for the corresponding folder
   - Click "Select" to map the folder

## Step 9: Test Synchronization

1. Upload a test CSV file to one of your configured folders
2. In the garage management system, click "Sync All Now"
3. Check that the data was imported successfully

## Features

### Automatic Synchronization
- **Real-time Updates**: Files are checked for changes every 30 minutes
- **Manual Sync**: Force synchronization at any time
- **Incremental Updates**: Only processes changed files

### File Management
- **Multiple Formats**: Supports CSV, XLSX, and XLS files
- **Latest File Priority**: Always uses the most recently modified file
- **Backup Safety**: Original data is preserved during updates

### Monitoring
- **Sync History**: Track all synchronization activities
- **Status Dashboard**: Monitor connection and folder status
- **Error Reporting**: Detailed error messages for troubleshooting

## Troubleshooting

### Common Issues

**"Google Drive dependencies not installed"**
- Run: `pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib`

**"Credentials file not found"**
- Ensure `google_credentials.json` is in the `config/` directory
- Check the file path in the error message

**"Permission denied"**
- Re-run the authentication process
- Check that you granted all requested permissions

**"No files found in folder"**
- Verify the folder contains CSV/Excel files
- Check that files are not in subfolders

### Getting Help

If you encounter issues:

1. Check the sync history for error details
2. Test the connection using the "Test Connection" button
3. Verify your folder mappings are correct
4. Ensure your CSV files match the expected format

## Security Notes

- **Credentials**: Keep your `google_credentials.json` file secure
- **Tokens**: Authentication tokens are stored locally in `config/google_token.pickle`
- **Permissions**: The system only requests read-only access to your Google Drive
- **Data**: No data is sent to Google - only file downloads occur

## Benefits

✅ **Automatic Updates**: Your garage system stays current with Google Drive changes
✅ **No Manual Uploads**: Eliminate the need for manual file uploads
✅ **Real-time Sync**: Changes in Google Drive appear in your system within 30 minutes
✅ **Backup Integration**: Use Google Drive as your data backup solution
✅ **Team Collaboration**: Multiple team members can update files in Google Drive
✅ **Version Control**: Google Drive maintains file version history
