# Postcode Lookup System

This document outlines the comprehensive postcode lookup system implemented in GarageManager Pro for auto-filling UK addresses.

## Overview

The postcode lookup system provides automatic address completion based on UK postcodes using the free postcodes.io API. This significantly improves user experience when entering customer addresses across the application.

## Components

### 1. API Endpoint (`/api/postcode-lookup`)

**Location**: `app/api/postcode-lookup/route.ts`

**Functionality**:
- Validates and cleans UK postcodes
- Fetches postcode data from postcodes.io API
- Returns town, county, region, and coordinates
- Optionally attempts to fetch specific addresses (when available)

**Usage**:
```
GET /api/postcode-lookup?postcode=SW1A%201AA
GET /api/postcode-lookup?postcode=SW1A%201AA&addresses=true
```

**Response Format**:
```json
{
  "success": true,
  "postcode": "SW1A 1AA",
  "town": "Westminster",
  "county": null,
  "region": "London",
  "country": "England",
  "coordinates": {
    "latitude": 51.50101,
    "longitude": -0.141563
  }
}
```

### 2. PostcodeLookup Component

**Location**: `components/ui/postcode-lookup.tsx`

**Features**:
- Real-time postcode validation
- Visual feedback (green/red indicators)
- Auto-fill town and county from postcode
- Address selection dropdown (when available)
- Manual address field editing
- Keyboard support (Enter to lookup)
- Loading states and error handling

**Props**:
```typescript
interface PostcodeLookupProps {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  onAddressSelect: (address: AddressData) => void
  addressData: AddressData
  onAddressChange: (field: keyof AddressData, value: string) => void
  className?: string
  disabled?: boolean
}
```

## Integration Points

### 1. Customer Edit Page
**Location**: `app/customers/[id]/edit/page.tsx`

- Full postcode lookup with address selection
- Maps to customer address fields:
  - `addressHouseNo`
  - `addressRoad`
  - `addressLocality`
  - `addressTown`
  - `addressCounty`
  - `addressPostCode`

### 2. Job Sheet Forms
**Location**: `components/job-sheet/job-sheet-form.tsx`

- Full postcode lookup integration
- Maps to job sheet customer fields
- Supports all address components

### 3. Clean Job Sheet Form
**Location**: `components/job-sheet/clean-job-sheet-form.tsx`

- Simplified postcode lookup (button-based)
- Auto-fills county from postcode
- Maintains existing address field structure

### 4. Enhanced Vehicle Page
**Location**: `components/vehicle/enhanced-vehicle-page.tsx`

- Postcode lookup in customer editing mode
- Maps to customer address fields in vehicle context

## Features

### ✅ **Postcode Validation**
- UK postcode format validation using regex
- Real-time validation feedback
- Visual indicators (green checkmark/red X)

### ✅ **Auto-Fill Functionality**
- Automatic town and county population
- Postcode formatting and cleanup
- Coordinate data available for mapping

### ✅ **Address Selection**
- Dropdown list of specific addresses (when available)
- One-click address selection
- Fallback to manual entry

### ✅ **User Experience**
- Loading states during API calls
- Success/error toast notifications
- Keyboard shortcuts (Enter to lookup)
- Disabled state support

### ✅ **Error Handling**
- API failure graceful degradation
- Invalid postcode feedback
- Network error handling

## Usage Examples

### Basic Implementation
```tsx
<PostcodeLookup
  postcode={formData.postcode}
  onPostcodeChange={(postcode) => setFormData({...formData, postcode})}
  onAddressSelect={(address) => {
    setFormData({
      ...formData,
      houseNo: address.houseNo,
      road: address.road,
      town: address.town,
      county: address.county,
      postcode: address.postCode
    })
  }}
  addressData={formData}
  onAddressChange={(field, value) => {
    setFormData({...formData, [field]: value})
  }}
/>
```

### Simplified Button Lookup
```tsx
<Button onClick={async () => {
  const response = await fetch(`/api/postcode-lookup?postcode=${postcode}`)
  const data = await response.json()
  if (data.success) {
    setCounty(data.county)
    toast.success(`Found: ${data.town}, ${data.county}`)
  }
}}>
  <Search className="w-4 h-4" />
</Button>
```

## API Dependencies

### postcodes.io API
- **Free service**: No API key required
- **Rate limits**: Reasonable for typical usage
- **Coverage**: All UK postcodes
- **Data**: Town, county, region, coordinates
- **Addresses**: Limited availability (not all postcodes)

## Benefits

### 🚀 **User Experience**
- Faster address entry
- Reduced typing errors
- Consistent address formatting
- Professional appearance

### 📊 **Data Quality**
- Standardized town/county names
- Validated postcodes
- Consistent address structure
- Reduced data entry errors

### ⚡ **Performance**
- Fast API responses
- Minimal network requests
- Efficient caching potential
- Graceful fallbacks

## Future Enhancements

### Potential Improvements
1. **Caching**: Implement client-side postcode caching
2. **Offline Support**: Store common postcodes locally
3. **Address Validation**: Full address validation service
4. **International**: Support for non-UK addresses
5. **Autocomplete**: Postcode suggestions as you type

## Troubleshooting

### Common Issues
1. **API Unavailable**: Falls back to manual entry
2. **Invalid Postcode**: Shows validation error
3. **No Addresses**: Uses basic postcode data only
4. **Network Error**: Graceful error handling with toast

### Testing
- Test with various UK postcodes
- Verify error handling with invalid postcodes
- Check fallback behavior when API is unavailable
- Validate address field mapping in each form

The postcode lookup system significantly enhances the user experience for address entry while maintaining data quality and consistency across the application.
