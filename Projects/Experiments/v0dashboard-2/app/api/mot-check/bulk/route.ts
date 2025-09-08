import { NextResponse } from 'next/server';
import { bulkCheckMOTs } from '@/lib/utils/bulk-mot-check';

export interface BulkMOTCheckRequest {
  registrations: string[];
  saveToDatabase?: boolean;
}

export async function POST(request: Request) {
  try {
    console.log('[BULK-MOT] Starting bulk MOT check');
    
    // Parse the request body
    const { registrations, saveToDatabase = true } = await request.json() as BulkMOTCheckRequest;
    
    if (!registrations || !Array.isArray(registrations) || registrations.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No registration numbers provided',
          details: 'Please provide an array of vehicle registration numbers'
        },
        { status: 400 }
      );
    }

    console.log(`[BULK-MOT] Processing ${registrations.length} vehicles`);
    
    // Process the bulk MOT check
    const { results, errors } = await bulkCheckMOTs(registrations, saveToDatabase);
    
    console.log(`[BULK-MOT] Completed bulk MOT check. Success: ${results.length}, Failed: ${errors.length}`);
    
    return NextResponse.json({
      success: true,
      processed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
    
  } catch (error) {
    console.error('[BULK-MOT] Error in bulk MOT check:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process bulk MOT check',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
