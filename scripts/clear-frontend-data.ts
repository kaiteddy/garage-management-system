import { clearUploadedData, invalidateDataCache } from '../lib/database/upload-store';

console.log('🧹 Clearing frontend data sources...');

// Clear in-memory uploaded data
clearUploadedData();
console.log('✅ Cleared in-memory uploaded data');

// The invalidateDataCache is called automatically by clearUploadedData
console.log('✅ Invalidated data cache');

console.log('🎉 Frontend data cleared! Refresh your browser to see the changes.');
