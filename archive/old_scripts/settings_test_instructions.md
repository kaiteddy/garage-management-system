# Settings Page Test Instructions

## How to Test the Settings Page

1. **Open the Application**
   - Go to http://127.0.0.1:5001
   - Wait for the page to fully load

2. **Test Navigation to Settings**
   - Click on the "Settings" item in the left sidebar (gear icon)
   - The settings page should appear with tabs at the top

3. **Test Settings Tabs**
   - You should see 4 tabs: "MOT Reminders", "System", "Garage Info", "User Account"
   - Click on each tab to verify they switch content
   - The "MOT Reminders" tab should be active by default

4. **Test Settings Functionality**
   - Try changing some settings (e.g., date format, garage name)
   - Click "Save All Settings" button
   - Refresh the page and navigate back to settings
   - Verify that your changes were saved

5. **Browser Console Test**
   - Open browser developer tools (F12)
   - Go to the Console tab
   - Type: `testSettingsPage()`
   - Press Enter
   - This will run a comprehensive test and show results in the console

6. **Manual Verification**
   - Check that all form fields are visible and editable
   - Verify that the DVLA API credentials are pre-filled
   - Test the "Test Connection" button (should show a status message)
   - Try the export/import functions

## Expected Behavior

- Settings page should load without errors
- All tabs should be clickable and show different content
- Form fields should be populated with default or saved values
- Save/Reset buttons should work
- Settings should persist after page refresh

## Troubleshooting

If the settings page is not working:

1. **Check Browser Console**
   - Look for JavaScript errors in the console
   - Run `testSettingsPage()` to get detailed diagnostics

2. **Check Page Elements**
   - Verify the settings page element exists: `document.getElementById('settings')`
   - Check if tabs exist: `document.querySelectorAll('.settings-tab-btn').length`

3. **Check Functions**
   - Verify functions exist: `typeof showPage`, `typeof showSettingsTab`

4. **Check localStorage**
   - Test localStorage: `localStorage.setItem('test', 'value'); localStorage.getItem('test')`

## Common Issues and Solutions

1. **Settings page not showing**: Check if `showPage('settings')` is being called correctly
2. **Tabs not switching**: Verify `showSettingsTab()` function is working
3. **Settings not saving**: Check localStorage permissions and `saveAllSettings()` function
4. **Form fields empty**: Verify `loadSettings()` and `populateSettingsForm()` functions

## Debug Commands

Run these in the browser console for debugging:

```javascript
// Test page navigation
showPage('settings');

// Test tab switching
showSettingsTab('system-settings');

// Test settings loading
loadSettings();

// Test settings saving
saveAllSettings();

// Check current settings data
console.log(settingsData);

// Run comprehensive test
testSettingsPage();
```
