import { NextResponse } from 'next/server';
import { getMinimaxClient, type MinimaxSpeechRequest } from '@/lib/minimax-client';

/**
 * Minimax Speech Generation API
 * POST /api/minimax/speech
 * 
 * Convert text to high-quality speech using Minimax's advanced TTS model
 * Perfect for automated phone messages, voice reminders, and accessibility features
 */
export async function POST(request: Request) {
  try {
    console.log('[MINIMAX-SPEECH-API] Processing speech generation request...');
    
    const body = await request.json();
    const { 
      text, 
      model, 
      voice_id, 
      speed, 
      vol, 
      pitch, 
      audio_sample_rate, 
      bitrate, 
      format 
    } = body;

    // Validate required fields
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text is required and cannot be empty' 
        },
        { status: 400 }
      );
    }

    // Validate text length (reasonable limit for TTS)
    if (text.length > 5000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text is too long. Maximum 5000 characters allowed.' 
        },
        { status: 400 }
      );
    }

    const minimaxClient = getMinimaxClient();
    
    const speechRequest: MinimaxSpeechRequest = {
      text: text.trim(),
      model,
      voice_id,
      speed,
      vol,
      pitch,
      audio_sample_rate,
      bitrate,
      format
    };

    const result = await minimaxClient.generateSpeech(speechRequest);

    console.log('[MINIMAX-SPEECH-API] Speech generation completed successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        trace_id: result.trace_id,
        audio_file: result.audio_file,
        extra_info: result.extra_info
      },
      metadata: {
        text_length: text.length,
        voice_id: voice_id || 'male-qn-qingse',
        format: format || 'mp3',
        sample_rate: audio_sample_rate || 32000
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MINIMAX-SPEECH-API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Speech generation failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Get Minimax speech model information and available voices
 * GET /api/minimax/speech
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      service: 'Minimax Speech Generation',
      model: process.env.MINIMAX_SPEECH_MODEL || 'speech-02',
      capabilities: [
        'High-quality text-to-speech conversion',
        'Multiple voice options',
        'Customizable speech parameters',
        'Multi-language support',
        'Professional audio quality'
      ],
      voice_options: [
        {
          id: 'male-qn-qingse',
          name: 'Male - Professional',
          description: 'Clear, professional male voice suitable for business communications'
        },
        {
          id: 'female-shaonv',
          name: 'Female - Friendly',
          description: 'Warm, friendly female voice perfect for customer service'
        },
        {
          id: 'male-qn-jingying',
          name: 'Male - Authoritative',
          description: 'Strong, authoritative male voice for important announcements'
        },
        {
          id: 'female-yujie',
          name: 'Female - Professional',
          description: 'Professional female voice for business applications'
        }
      ],
      audio_formats: ['mp3', 'wav', 'pcm'],
      sample_rates: [16000, 22050, 32000, 44100, 48000],
      parameters: {
        speed: {
          range: '0.5 - 2.0',
          default: 1.0,
          description: 'Speech speed multiplier'
        },
        volume: {
          range: '0.1 - 2.0',
          default: 1.0,
          description: 'Audio volume level'
        },
        pitch: {
          range: '-12 to +12',
          default: 0,
          description: 'Pitch adjustment in semitones'
        }
      },
      use_cases: [
        'Automated phone system messages',
        'MOT reminder voice calls',
        'Customer service announcements',
        'Accessibility features for visually impaired users',
        'Multi-language customer communications',
        'Training and educational content'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MINIMAX-SPEECH-API] GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get speech model information'
      },
      { status: 500 }
    );
  }
}
