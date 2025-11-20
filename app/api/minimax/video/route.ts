import { NextResponse } from 'next/server';
import { getMinimaxClient, type MinimaxVideoRequest } from '@/lib/minimax-client';

/**
 * Minimax Video Generation API
 * POST /api/minimax/video
 * 
 * Generate high-definition videos from text prompts using Minimax Hailuo 02
 * Perfect for marketing content, service demonstrations, and customer education
 */
export async function POST(request: Request) {
  try {
    console.log('[MINIMAX-VIDEO-API] Processing video generation request...');
    
    const body = await request.json();
    const { prompt, model, prompt_optimizer } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Prompt is required and cannot be empty' 
        },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length > 2000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Prompt is too long. Maximum 2000 characters allowed.' 
        },
        { status: 400 }
      );
    }

    const minimaxClient = getMinimaxClient();
    
    const videoRequest: MinimaxVideoRequest = {
      prompt: prompt.trim(),
      model,
      prompt_optimizer
    };

    const result = await minimaxClient.generateVideo(videoRequest);

    console.log('[MINIMAX-VIDEO-API] Video generation initiated successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        task_id: result.task_id,
        status: result.status,
        video_url: result.video_url,
        error: result.error
      },
      metadata: {
        prompt_length: prompt.length,
        model: model || process.env.MINIMAX_VIDEO_MODEL,
        prompt_optimizer: prompt_optimizer !== false
      },
      instructions: {
        status_check: `Use GET /api/minimax/video/${result.task_id} to check generation status`,
        estimated_time: '30-120 seconds for completion',
        video_specs: '1080p HD, up to 10 seconds duration'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MINIMAX-VIDEO-API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Video generation failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Get Minimax video model information
 * GET /api/minimax/video
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      service: 'Minimax Video Generation',
      model: process.env.MINIMAX_VIDEO_MODEL || 'video-01',
      capabilities: [
        'High-definition 1080p video generation',
        'Up to 10 seconds duration',
        'Text-to-video conversion',
        'Prompt optimization',
        'Professional quality output'
      ],
      specifications: {
        resolution: '1080p (1920x1080)',
        max_duration: '10 seconds',
        format: 'MP4',
        frame_rate: '24-30 FPS',
        quality: 'High-definition'
      },
      features: {
        'Prompt Optimization': 'Automatically enhances prompts for better results',
        'High Quality': 'Professional-grade video output',
        'Fast Generation': 'Typical completion in 30-120 seconds',
        'Versatile Content': 'Supports various video styles and subjects'
      },
      use_cases: [
        'Marketing and promotional videos',
        'Service demonstration videos',
        'Customer education content',
        'Social media content creation',
        'Training material videos',
        'Product showcase videos'
      ],
      automotive_applications: [
        'MOT process explanation videos',
        'Service procedure demonstrations',
        'Customer testimonial recreations',
        'Garage facility showcases',
        'Safety instruction videos',
        'Maintenance tip videos'
      ],
      prompt_tips: [
        'Be specific about the scene and actions',
        'Include details about lighting and camera angles',
        'Mention the style or mood you want',
        'Keep prompts clear and descriptive',
        'Use automotive terminology for garage-related content'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MINIMAX-VIDEO-API] GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get video model information'
      },
      { status: 500 }
    );
  }
}
