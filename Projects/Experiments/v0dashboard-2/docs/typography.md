# Typography System

This document outlines the consistent typography system used throughout the GarageManager Pro application.

## Font Stack

### Primary Font (Sans-serif)
- **Font**: Inter
- **Fallbacks**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
- **Usage**: All body text, headings, UI elements
- **Features**: OpenType features enabled for better readability

### Monospace Font
- **Font**: JetBrains Mono
- **Fallbacks**: Fira Code, SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace
- **Usage**: Registration numbers, VINs, currency values, code snippets
- **Features**: Ligatures disabled for better character distinction

## Typography Classes

### Headings
- `.text-heading-xl` - 3xl, bold, tight tracking (Page titles)
- `.text-heading-lg` - 2xl, semibold, tight tracking (Section headers)
- `.text-heading-md` - xl, semibold, tight tracking (Card titles)
- `.text-heading-sm` - lg, medium, tight tracking (Subsection headers)
- `.text-heading` - Base heading style, semibold, tight tracking

### Specialized Text
- `.text-registration` - Monospace, small, medium weight, wide tracking, uppercase (Vehicle registrations)
- `.text-vin` - Monospace, small, wider tracking (VIN numbers)
- `.text-currency` - Monospace, small, tabular numbers (Currency values)
- `.text-body` - Relaxed line height (Body paragraphs)
- `.text-muted` - Muted foreground color, small (Secondary text)

## Usage Guidelines

### Vehicle Registrations
```tsx
<span className="text-registration">AB12 CDE</span>
```

### VIN Numbers
```tsx
<span className="text-vin">1HGBH41JXMN109186</span>
```

### Currency Values
```tsx
<span className="text-currency">£1,234.56</span>
```

### Page Titles
```tsx
<h1 className="text-heading-xl">Vehicle Details</h1>
```

### Card Titles
```tsx
<h3 className="text-heading-md">MOT Status</h3>
```

### Body Text
```tsx
<p className="text-body">This is a paragraph with relaxed line height.</p>
```

### Secondary Text
```tsx
<span className="text-muted">Last updated 2 hours ago</span>
```

## Font Loading

- Inter is loaded via Next.js Google Fonts with display: 'swap' for optimal performance
- Font weights: 300, 400, 500, 600, 700
- CSS variables are used for consistent font application
- Antialiasing is enabled for crisp text rendering

## Best Practices

1. **Consistency**: Always use the predefined typography classes
2. **Hierarchy**: Use appropriate heading levels for content structure
3. **Readability**: Maintain sufficient contrast and spacing
4. **Performance**: Leverage font-display: swap for better loading
5. **Accessibility**: Ensure text meets WCAG contrast requirements

## Migration Notes

- Replaced inconsistent Arial/Helvetica declarations with Inter
- Standardized monospace usage for technical data
- Added proper font feature settings for optimal rendering
- Implemented CSS variables for maintainable font management
