import { NextResponse } from 'next/server';
import { clearUploadedData } from '@/lib/database/upload-store';

export async function POST() {
  try {
    // Clear in-memory uploaded data
    clearUploadedData();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to clear cache'
  });
}
