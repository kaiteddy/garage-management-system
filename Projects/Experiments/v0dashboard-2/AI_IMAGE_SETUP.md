# Real Vehicle Image System Setup

## Overview

The system implements a **real-images-only** approach with two reliable sources:

1. **Tier 1: HaynesPro Images** - Real vehicle photos from HaynesPro SVGZ files (highest quality)
2. **Tier 1.5: SWS API Images** - Additional real vehicle images from SWS Solutions
3. **No Fake Images** - No AI-generated or placeholder images are provided

**Important**: This system only provides authentic vehicle images. If no real image is available, the API returns `success: false` instead of generating fake content.

## Environment Variables

Add these to your `.env.local` file:

```bash
# SWS API Configuration (for additional vehicle data)
SWS_API_KEY=your_sws_api_key_here
SWS_API_ENABLED=true

# Note: AI image generation has been disabled
# The system now only provides real vehicle images
```

## Configuration Options

### `OPENAI_API_KEY`
- **Required**: Your OpenAI API key for DALL-E 3 access
- **Get it from**: https://platform.openai.com/api-keys
- **Cost**: ~$0.04 per 1024x1024 image with DALL-E 3

### `AI_IMAGE_GENERATION_ENABLED`
- **Default**: `false`
- **Options**: `true` or `false`
- **Purpose**: Master switch to enable/disable AI generation

### `AI_IMAGE_DAILY_LIMIT`
- **Default**: `50`
- **Purpose**: Maximum AI images generated per day
- **Cost Control**: 50 images = ~$2.00/day

### `AI_IMAGE_MONTHLY_LIMIT`
- **Default**: `1000`
- **Purpose**: Maximum AI images generated per month
- **Cost Control**: 1000 images = ~$40.00/month

### `SWS_API_KEY`
- **Required**: Your SWS Solutions API key for vehicle data access
- **Get it from**: https://www.sws-solutions.co.uk/
- **Purpose**: Access comprehensive vehicle technical data and images

### `SWS_API_ENABLED`
- **Default**: `false`
- **Options**: `true` or `false`
- **Purpose**: Enable/disable SWS API integration

## Cost Analysis

### DALL-E 3 Pricing (as of 2024)
- **Standard Quality**: $0.040 per image (1024×1024)
- **HD Quality**: $0.080 per image (1024×1024)

### Recommended Limits
- **Small Garage**: 25 daily / 500 monthly (~$20/month)
- **Medium Garage**: 50 daily / 1000 monthly (~$40/month)
- **Large Garage**: 100 daily / 2000 monthly (~$80/month)

## Caching Strategy

### HaynesPro Images
- **Cache Duration**: 24 hours
- **Reason**: May be updated occasionally

### AI-Generated Images
- **Cache Duration**: 30 days
- **Reason**: Won't change, expensive to regenerate

### Placeholders
- **Cache Duration**: 24 hours
- **Reason**: Lightweight, can regenerate easily

## Monitoring

### View Statistics
Visit: `http://localhost:3000/api/admin/ai-image-stats`

### Key Metrics
- Daily/monthly usage vs limits
- Cache hit rates
- Image source distribution
- Recent AI generations

## Image Quality Enhancement

The system automatically enhances AI prompts using available vehicle data:

### Data Sources
1. **Database**: Make, model, year, color from existing vehicle records
2. **DVLA API**: Could be integrated for additional data
3. **VRM Parsing**: Basic vehicle type inference

### Prompt Enhancement
```
Base prompt: "A realistic, high-quality photograph of a"
+ Year: "2019"
+ Make: "BMW"
+ Model: "X5"
+ Color: "in metallic blue color"
+ Body Type: "SUV"
+ Style: "parked in a clean, professional setting..."
```

## Fallback Logic

```
1. Try HaynesPro SVGZ extraction
   ↓ (if no image found)
2. Check AI generation limits
   ↓ (if within limits)
3. Generate AI image with enhanced prompt
   ↓ (if AI fails or limits exceeded)
4. Use professional SVG placeholder
```

## Testing

### Test Different Scenarios
1. **Real VRM with HaynesPro data**: Should get Tier 1
2. **Real VRM without HaynesPro image**: Should get Tier 2 (AI)
3. **Fake VRM**: Should get Tier 2 (AI) or Tier 3 (placeholder)
4. **When limits exceeded**: Should get Tier 3 (placeholder)

### Test Page
Visit: `http://localhost:3000/test-vehicle-images`

## Production Considerations

### Security
- Store OpenAI API key securely
- Monitor usage to prevent abuse
- Implement user-based rate limiting if needed

### Performance
- Consider Redis for caching in production
- Implement image CDN for faster delivery
- Monitor API response times

### Cost Management
- Set up OpenAI usage alerts
- Monitor daily/monthly spending
- Adjust limits based on business needs
- Consider batch processing for bulk operations

## Troubleshooting

### AI Generation Not Working
1. Check `OPENAI_API_KEY` is set correctly
2. Verify `AI_IMAGE_GENERATION_ENABLED=true`
3. Check daily/monthly limits not exceeded
4. Review OpenAI account billing status

### Poor Image Quality
1. Enhance vehicle data in database
2. Adjust AI prompts in code
3. Consider upgrading to HD quality (2x cost)

### High Costs
1. Reduce daily/monthly limits
2. Improve caching hit rates
3. Only generate for important VRMs
4. Consider alternative AI services
