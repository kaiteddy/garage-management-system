# Minimax AI Integration - GarageManager Pro

## Overview

GarageManager Pro now includes comprehensive integration with Minimax AI, providing advanced text, speech, and video generation capabilities specifically tailored for automotive service management.

## Features

### 🤖 Text Generation (MiniMax-M1)
- **Advanced Language Model**: Global top-tier performance with ultra-long context
- **Automotive Expertise**: Specialized in vehicle service analysis and recommendations
- **Customer Communications**: Generate personalized messages and reminders
- **Technical Documentation**: Automated report generation and analysis

### 🎤 Speech Generation (Speech-02)
- **High-Quality TTS**: Natural language text-to-speech conversion
- **Multiple Voices**: Professional male and female voice options
- **Customizable Parameters**: Speed, volume, pitch control
- **Multi-Channel Support**: Perfect for phone systems and accessibility

### 🎬 Video Generation (MiniMax Hailuo 02)
- **HD Quality**: 1080p video generation up to 10 seconds
- **Marketing Content**: Create engaging promotional videos
- **Training Materials**: Generate educational content
- **Service Demonstrations**: Visual explanations of automotive procedures

## API Endpoints

### Core Services

#### Text Generation
```
POST /api/minimax/text
GET  /api/minimax/text (info)
```

#### Speech Generation
```
POST /api/minimax/speech
GET  /api/minimax/speech (info)
```

#### Video Generation
```
POST /api/minimax/video
GET  /api/minimax/video (info)
GET  /api/minimax/video/[taskId] (status check)
```

### Automotive-Specific Integrations

#### Service Summary Generator
```
POST /api/minimax/automotive/service-summary
```
Generates intelligent service summaries based on:
- Vehicle data and specifications
- Service history analysis
- MOT compliance checking
- Maintenance recommendations

#### MOT Reminder Generator
```
POST /api/minimax/automotive/mot-reminder
```
Creates personalized MOT reminders with:
- Urgency-based messaging
- Multi-channel support (text/speech)
- Customer personalization
- Professional branding

#### Dashboard Overview
```
GET /api/minimax/dashboard
```
Provides complete integration status and capabilities overview.

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Minimax AI Configuration
MINIMAX_API_KEY=your_minimax_api_key_here
MINIMAX_TEXT_API_URL=https://api.minimax.chat/v1/text/chatcompletion_v2
MINIMAX_SPEECH_API_URL=https://api.minimax.chat/v1/t2a_v2
MINIMAX_VIDEO_API_URL=https://api.minimax.chat/v1/video_generation

# Model Configuration
MINIMAX_TEXT_MODEL=abab6.5s-chat
MINIMAX_SPEECH_MODEL=speech-02
MINIMAX_VIDEO_MODEL=video-01
```

### API Key Setup

Your Minimax API key has been configured:
```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJBZGFtIE1vdG9ycyIsIlVzZXJOYW1lIjoiQWRhbSBNb3RvcnMiLCJBY2NvdW50IjoiIiwiU3ViamVjdElEIjoiMTk0NzcwNzE0NzA1NTc5NjY1OCIsIlBob25lIjoiIiwiR3JvdXBJRCI6IjE5NDc3MDcxNDcwNDc0MDgwNTAiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJhZGFtQGVsaW1vdG9ycy5jby51ayIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA3LTIzIDAyOjMzOjA1IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.drEYj7gLaV7faA273ZOGDWV0adgcjePapb1-Frq9mjl5Bm5dw_YkXf1du5VpuND96KTgc3tsoGtbVqCXRZgr43FQ5_TTHjjtl2indoYQvn8kZIJa71E4l2-HNo-LFlC160cL6K4yVZmOgpURnfUKvHv5L-g96sAjhcsjf9T1fvf7eUZ7wZqdWd-PriRhyVMlUOWMbELl9s_FwLgR-MO6rCC3cpImFTtOdK7qN69mXIcXLxohEx7wWcO17ZQHbb6D2Dh1mFyKm4vCJjPyJoDqd7c2NE6eBxKyn_iv_Y24mwDQbWBI2kjNJTdCUFhRkXS7gkT0ZozLuCWVctg9QaSj7g
```

## Usage Examples

### 1. Generate Service Summary

```javascript
const response = await fetch('/api/minimax/automotive/service-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    registration: 'AB12 CDE',
    include_recommendations: true
  })
});

const result = await response.json();
console.log(result.data.summary);
```

### 2. Create MOT Reminder

```javascript
const response = await fetch('/api/minimax/automotive/mot-reminder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vehicle_id: 123,
    include_speech: true,
    voice_id: 'male-qn-qingse',
    urgency_level: 'high'
  })
});

const result = await response.json();
console.log('Text reminder:', result.data.reminders.text);
console.log('Audio file:', result.data.reminders.audio_file);
```

### 3. Generate Marketing Video

```javascript
const response = await fetch('/api/minimax/video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Professional automotive garage with ELI MOTORS branding, mechanics working on modern cars, clean and organized workspace',
    prompt_optimizer: true
  })
});

const result = await response.json();
const taskId = result.data.task_id;

// Check status
const statusResponse = await fetch(`/api/minimax/video/${taskId}`);
const status = await statusResponse.json();
```

### 4. Text-to-Speech for Phone System

```javascript
const response = await fetch('/api/minimax/speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Thank you for calling ELI MOTORS LTD. Your MOT is due for renewal. Please press 1 to speak to our service team.',
    voice_id: 'male-qn-qingse',
    speed: 0.9,
    format: 'mp3'
  })
});

const result = await response.json();
const audioBase64 = result.data.audio_file;
```

## Business Applications

### Customer Service
- **Automated Reminders**: AI-generated MOT and service reminders
- **Voice Messages**: Professional phone system announcements
- **Personalized Communications**: Tailored messages based on customer history

### Marketing & Sales
- **Video Content**: Promotional videos for social media
- **Service Explanations**: Visual demonstrations of automotive procedures
- **Customer Education**: Training materials and safety videos

### Operations
- **Service Documentation**: Automated report generation
- **Technical Analysis**: AI-powered vehicle diagnostics summaries
- **Staff Training**: Educational content creation

### Accessibility
- **Voice Features**: Text-to-speech for visually impaired customers
- **Multi-language Support**: Communications in various languages
- **Audio Descriptions**: Voice explanations of visual content

## Testing

Run the comprehensive test suite:

```bash
npm run test:minimax
```

This will test:
- ✅ Environment configuration
- ✅ Text generation capabilities
- ✅ Speech synthesis
- ✅ Video generation initiation
- ✅ Automotive-specific integrations
- ✅ API endpoint functionality

## Integration with Existing Features

### MOT Reminder System
- Enhanced with AI-generated personalized messages
- Multi-channel delivery (SMS, email, voice calls)
- Urgency-based messaging strategies

### Customer Communications
- Intelligent message generation for WhatsApp/SMS
- Professional voice messages for phone system
- Automated follow-up sequences

### Service Management
- AI-powered service summaries and recommendations
- Automated documentation generation
- Predictive maintenance suggestions

## Performance & Limits

### Text Generation
- **Context Length**: Ultra-long context support
- **Response Time**: Typically 1-3 seconds
- **Token Limits**: Up to 4000 tokens per request

### Speech Generation
- **Audio Quality**: 32kHz, 128kbps MP3
- **Text Limit**: 5000 characters maximum
- **Generation Time**: 2-5 seconds

### Video Generation
- **Resolution**: 1080p HD
- **Duration**: Up to 10 seconds
- **Generation Time**: 30-120 seconds
- **Format**: MP4

## Support & Documentation

- **Minimax API Documentation**: https://api.minimax.chat/docs
- **Support Contact**: api@minimax.io
- **Status Page**: https://status.minimax.chat
- **Integration Dashboard**: `/api/minimax/dashboard`

## Security & Privacy

- **API Key Security**: Stored securely in environment variables
- **Data Protection**: Customer data handled according to GDPR compliance
- **Audit Trail**: All AI generations logged for quality assurance
- **Rate Limiting**: Built-in protection against API abuse

## Future Enhancements

- **Real-time Voice Calls**: Integration with Twilio for live AI conversations
- **Video Personalization**: Customer-specific video content
- **Multi-language Support**: Expanded language capabilities
- **Advanced Analytics**: AI-powered business insights
- **Custom Voice Training**: ELI MOTORS branded voice models

---

**ELI MOTORS LTD** - Serving Hendon since 1979  
*Powered by Minimax AI - Advanced Automotive Intelligence*
