import { NextResponse } from 'next/server';

/**
 * Minimax AI Dashboard API
 * GET /api/minimax/dashboard
 * 
 * Provides overview of Minimax AI capabilities and integration status
 */
export async function GET() {
  try {
    console.log('[MINIMAX-DASHBOARD] Generating dashboard overview...');
    
    // Check environment configuration
    const isConfigured = !!(
      process.env.MINIMAX_API_KEY &&
      process.env.MINIMAX_TEXT_API_URL &&
      process.env.MINIMAX_SPEECH_API_URL &&
      process.env.MINIMAX_VIDEO_API_URL
    );

    const configuration = {
      api_key_configured: !!process.env.MINIMAX_API_KEY,
      text_api_configured: !!process.env.MINIMAX_TEXT_API_URL,
      speech_api_configured: !!process.env.MINIMAX_SPEECH_API_URL,
      video_api_configured: !!process.env.MINIMAX_VIDEO_API_URL,
      models: {
        text: process.env.MINIMAX_TEXT_MODEL || 'abab6.5s-chat',
        speech: process.env.MINIMAX_SPEECH_MODEL || 'speech-02',
        video: process.env.MINIMAX_VIDEO_MODEL || 'video-01'
      }
    };

    const services = {
      text_generation: {
        endpoint: '/api/minimax/text',
        status: isConfigured ? 'available' : 'configuration_required',
        capabilities: [
          'Advanced text completion',
          'Automotive service analysis',
          'Customer communication generation',
          'Technical documentation',
          'Multi-language support'
        ],
        use_cases: [
          'Service summaries',
          'MOT reminders',
          'Customer communications',
          'Technical analysis'
        ]
      },
      speech_generation: {
        endpoint: '/api/minimax/speech',
        status: isConfigured ? 'available' : 'configuration_required',
        capabilities: [
          'High-quality text-to-speech',
          'Multiple voice options',
          'Customizable parameters',
          'Professional audio quality'
        ],
        use_cases: [
          'Automated phone messages',
          'Voice reminders',
          'Accessibility features',
          'Customer service announcements'
        ]
      },
      video_generation: {
        endpoint: '/api/minimax/video',
        status: isConfigured ? 'available' : 'configuration_required',
        capabilities: [
          '1080p HD video generation',
          'Up to 10 seconds duration',
          'Text-to-video conversion',
          'Professional quality'
        ],
        use_cases: [
          'Marketing content',
          'Service demonstrations',
          'Training materials',
          'Social media content'
        ]
      }
    };

    const automotive_integrations = {
      service_summary: {
        endpoint: '/api/minimax/automotive/service-summary',
        description: 'AI-powered vehicle service analysis and recommendations',
        status: isConfigured ? 'available' : 'configuration_required',
        features: [
          'Vehicle data analysis',
          'Service history review',
          'MOT compliance checking',
          'Maintenance recommendations'
        ]
      },
      mot_reminder: {
        endpoint: '/api/minimax/automotive/mot-reminder',
        description: 'Intelligent MOT reminder generation with multi-channel support',
        status: isConfigured ? 'available' : 'configuration_required',
        features: [
          'Personalized reminders',
          'Urgency-based messaging',
          'Text and speech generation',
          'Multi-channel delivery'
        ]
      }
    };

    const integration_examples = {
      text_generation: {
        curl_example: `curl -X POST ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/minimax/text \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are an automotive service advisor."
      },
      {
        "role": "user", 
        "content": "Analyze this vehicle service history..."
      }
    ]
  }'`,
        javascript_example: `const response = await fetch('/api/minimax/text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are an automotive expert.' },
      { role: 'user', content: 'Generate a service summary...' }
    ]
  })
});`
      },
      speech_generation: {
        curl_example: `curl -X POST ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/minimax/speech \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello, this is ELI MOTORS LTD. Your MOT is due soon.",
    "voice_id": "male-qn-qingse"
  }'`,
        javascript_example: `const response = await fetch('/api/minimax/speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Your MOT reminder message...',
    voice_id: 'male-qn-qingse'
  })
});`
      },
      automotive_service: {
        curl_example: `curl -X POST ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/minimax/automotive/service-summary \\
  -H "Content-Type: application/json" \\
  -d '{
    "registration": "AB12 CDE",
    "include_recommendations": true
  }'`,
        javascript_example: `const response = await fetch('/api/minimax/automotive/service-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    registration: 'AB12 CDE',
    include_recommendations: true
  })
});`
      }
    };

    console.log('[MINIMAX-DASHBOARD] Dashboard overview generated successfully');
    
    return NextResponse.json({
      success: true,
      minimax_integration: {
        status: isConfigured ? 'fully_configured' : 'configuration_required',
        configuration: configuration,
        services: services,
        automotive_integrations: automotive_integrations
      },
      capabilities: {
        text_models: {
          'MiniMax-M1': 'New Reasoning Model with global top-tier performance and ultra-long context'
        },
        speech_models: {
          'Speech-02': 'High-intelligent model for natural language text-to-speech conversion'
        },
        video_models: {
          'MiniMax Hailuo 02': 'Supports 1080p HD video generation up to 10 seconds duration'
        }
      },
      business_applications: {
        'Customer Communications': 'Generate personalized messages and reminders',
        'Service Analysis': 'AI-powered vehicle service summaries and recommendations',
        'Voice Services': 'Automated phone messages and accessibility features',
        'Marketing Content': 'Create engaging video content for social media and websites',
        'Training Materials': 'Generate educational content for staff and customers',
        'Documentation': 'Automated technical documentation and reports'
      },
      integration_examples: integration_examples,
      getting_started: {
        step_1: 'Ensure MINIMAX_API_KEY is configured in environment variables',
        step_2: 'Test basic text generation with /api/minimax/text',
        step_3: 'Try automotive-specific features with /api/minimax/automotive/*',
        step_4: 'Integrate speech and video generation as needed',
        documentation: 'Visit individual endpoints for detailed API documentation'
      },
      support: {
        contact: 'api@minimax.io',
        documentation: 'https://api.minimax.chat/docs',
        status_page: 'https://status.minimax.chat'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MINIMAX-DASHBOARD] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate dashboard',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
