import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { htmlForm, title, vrm } = await request.json()
    
    if (!htmlForm) {
      return NextResponse.json({
        success: false,
        error: 'No HTML form provided'
      }, { status: 400 })
    }
    
    // Create a complete HTML page that will auto-submit the form
    const completePage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${vrm}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 24px;
        }
        .header p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        .loading {
            text-align: center;
            padding: 40px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .loading h2 {
            color: #007bff;
            margin-bottom: 10px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .form-container {
            display: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Vehicle: ${vrm} | Connecting to HaynesPro Technical Database</p>
    </div>
    
    <div class="loading">
        <h2>Loading Technical Data...</h2>
        <div class="spinner"></div>
        <p>Authenticating with secure tokens and retrieving data...</p>
    </div>
    
    <div class="form-container">
        ${htmlForm}
    </div>
    
    <script>
        // Auto-submit the form after a short delay
        setTimeout(function() {
            const forms = document.querySelectorAll('form');
            if (forms.length > 0) {
                forms[0].submit();
            }
        }, 2000);
    </script>
</body>
</html>`
    
    return new NextResponse(completePage, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('❌ [TECHNICAL-DATA-FORM] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint only accepts POST requests'
  }, { status: 405 })
}
