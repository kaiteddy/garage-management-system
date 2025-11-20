import { NextResponse } from 'next/server';
import { getMinimaxClient, type MinimaxTextRequest } from '@/lib/minimax-client';

/**
 * Minimax Text Generation API
 * POST /api/minimax/text
 * 
 * Generate text completions using Minimax's advanced language model
 * Perfect for automotive service summaries, customer communications, and technical analysis
 */
export async function POST(request: Request) {
  try {
    console.log('[MINIMAX-TEXT-API] Processing text generation request...');
    
    const body = await request.json();
    const { messages, model, max_tokens, temperature, top_p, stream } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Messages array is required and cannot be empty' 
        },
        { status: 400 }
      );
    }

    // Validate message format
    for (const message of messages) {
      if (!message.role || !message.content) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Each message must have role and content fields' 
          },
          { status: 400 }
        );
      }
      
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Message role must be system, user, or assistant' 
          },
          { status: 400 }
        );
      }
    }

    const minimaxClient = getMinimaxClient();
    
    const textRequest: MinimaxTextRequest = {
      messages,
      model,
      max_tokens,
      temperature,
      top_p,
      stream
    };

    const result = await minimaxClient.generateText(textRequest);

    console.log('[MINIMAX-TEXT-API] Text generation completed successfully');
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      usage: result.usage
    });

  } catch (error) {
    console.error('[MINIMAX-TEXT-API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Text generation failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Get Minimax text model information
 * GET /api/minimax/text
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      service: 'Minimax Text Generation',
      model: process.env.MINIMAX_TEXT_MODEL || 'abab6.5s-chat',
      capabilities: [
        'Advanced text completion',
        'Automotive service analysis',
        'Customer communication generation',
        'Technical documentation',
        'MOT reminder creation',
        'Service summary generation'
      ],
      features: {
        'Ultra-long context': 'Supports extensive conversation history',
        'Global top-tier performance': 'State-of-the-art language understanding',
        'Reasoning capabilities': 'Advanced logical reasoning and analysis',
        'Multi-language support': 'Supports multiple languages',
        'Customizable parameters': 'Temperature, top_p, max_tokens control'
      },
      usage_examples: [
        'Generate service recommendations based on vehicle history',
        'Create personalized MOT reminders for customers',
        'Analyze technical documentation and manuals',
        'Generate professional customer communications',
        'Summarize complex automotive data'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MINIMAX-TEXT-API] GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get model information'
      },
      { status: 500 }
    );
  }
}
