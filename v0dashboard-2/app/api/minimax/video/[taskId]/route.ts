import { NextResponse } from 'next/server';
import { getMinimaxClient } from '@/lib/minimax-client';

/**
 * Minimax Video Status Check API
 * GET /api/minimax/video/[taskId]
 * 
 * Check the status of a video generation task
 */
export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;
    
    console.log(`[MINIMAX-VIDEO-STATUS-API] Checking status for task: ${taskId}`);
    
    // Validate task ID
    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid task ID is required' 
        },
        { status: 400 }
      );
    }

    const minimaxClient = getMinimaxClient();
    const result = await minimaxClient.checkVideoStatus(taskId);

    console.log(`[MINIMAX-VIDEO-STATUS-API] Status check completed for task: ${taskId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        task_id: taskId,
        status: result.status,
        video_url: result.video_url,
        error: result.error
      },
      metadata: {
        is_completed: result.status === 'completed',
        is_processing: result.status === 'processing',
        is_failed: result.status === 'failed',
        has_video: !!result.video_url
      },
      instructions: {
        next_steps: result.status === 'processing' 
          ? 'Video is still generating. Check again in 30-60 seconds.'
          : result.status === 'completed'
          ? 'Video is ready! Use the video_url to access the generated content.'
          : 'Video generation failed. Check the error message for details.',
        polling_interval: result.status === 'processing' ? '30-60 seconds' : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MINIMAX-VIDEO-STATUS-API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check video status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
