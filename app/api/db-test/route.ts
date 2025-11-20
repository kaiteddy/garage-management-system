import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a new connection pool
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Test the database connection with a simple query
    const result = await sql`SELECT 1 as test`;
    
    // Log the result for debugging
    console.log('Database test result:', result);
    
    // Check if we got a successful response
    if (Array.isArray(result)) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database connection successful',
        data: result
      });
    } else if (result && typeof result === 'object') {
      // Handle case where the result is a command result or row object
      if ('command' in result || 'rowCount' in result) {
        return NextResponse.json({ 
          success: true, 
          message: 'Database connection successful (command result)',
          data: []
        });
      }
      
      // Handle case where the result is a single row object
      if ('test' in result) {
        return NextResponse.json({ 
          success: true, 
          message: 'Database connection successful (row result)',
          data: [result]
        });
      }
    }
    
    // If we get here, the response format was unexpected
    console.error('Unexpected database response format:', result);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Unexpected database response format',
        data: result
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
