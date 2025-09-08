const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ProSearch Intelligence - ELI MOTORS LTD</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .logo {
                font-size: 2.5em;
                font-weight: bold;
                margin-bottom: 10px;
                background: linear-gradient(45deg, #FFD700, #FFA500);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle {
                font-size: 1.2em;
                opacity: 0.9;
                margin-bottom: 5px;
            }
            .company {
                font-size: 0.9em;
                opacity: 0.7;
            }
            .features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 40px 0;
            }
            .feature {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .feature h3 {
                margin-top: 0;
                color: #FFD700;
            }
            .status {
                background: rgba(0, 255, 0, 0.2);
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                margin: 20px 0;
                border: 1px solid rgba(0, 255, 0, 0.3);
            }
            .api-endpoints {
                background: rgba(0, 0, 0, 0.2);
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .endpoint {
                background: rgba(255, 255, 255, 0.1);
                padding: 10px;
                margin: 10px 0;
                border-radius: 5px;
                font-family: monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔍 ProSearch Intelligence</div>
                <div class="subtitle">Advanced Analytics & Search Platform</div>
                <div class="company">ELI MOTORS LTD - Serving Hendon since 1979</div>
            </div>

            <div class="status">
                ✅ Professional Tunnel Active: <strong>https://pro-search.eu.ngrok.io</strong>
            </div>

            <div class="features">
                <div class="feature">
                    <h3>🎯 Intelligence Analytics</h3>
                    <p>Advanced data processing and analytics for customer insights, vehicle patterns, and business intelligence.</p>
                </div>
                <div class="feature">
                    <h3>🔍 Smart Search</h3>
                    <p>Powerful search capabilities across customer data, vehicle records, and historical information.</p>
                </div>
                <div class="feature">
                    <h3>📊 Real-time Monitoring</h3>
                    <p>Live monitoring of MOT schedules, customer interactions, and business performance metrics.</p>
                </div>
                <div class="feature">
                    <h3>🔒 Secure Integration</h3>
                    <p>Secure API endpoints with HTTPS encryption and professional ngrok infrastructure.</p>
                </div>
            </div>

            <div class="api-endpoints">
                <h3>🌐 API Endpoints</h3>
                <div class="endpoint">GET /api/analytics - Business analytics data</div>
                <div class="endpoint">GET /api/search - Advanced search functionality</div>
                <div class="endpoint">GET /api/intelligence - AI-powered insights</div>
                <div class="endpoint">GET /api/status - System status and health</div>
            </div>

            <div style="text-align: center; margin-top: 40px; opacity: 0.8;">
                <p>🏢 Professional tunnel powered by ngrok</p>
                <p>Reserved domain: <strong>pro-search.eu.ngrok.io</strong></p>
                <p>Local development: <strong>localhost:3001</strong></p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// API Routes
app.get('/api/analytics', (req, res) => {
  res.json({
    success: true,
    platform: 'ProSearch Intelligence',
    company: 'ELI MOTORS LTD',
    analytics: {
      totalCustomers: 7000,
      activeVehicles: 8500,
      motReminders: 245,
      recentActivity: 'High',
      systemHealth: 'Excellent'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  res.json({
    success: true,
    query: q || 'No query provided',
    results: [
      { type: 'customer', name: 'John Smith', registration: 'AB12 CDE' },
      { type: 'vehicle', registration: 'XY98 ZAB', customer: 'Jane Doe' },
      { type: 'mot', registration: 'CD34 EFG', status: 'Due Soon' }
    ],
    totalResults: 3,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/intelligence', (req, res) => {
  res.json({
    success: true,
    intelligence: {
      predictiveAnalytics: 'Active',
      customerInsights: 'Processing',
      motPredictions: 'Updated',
      businessTrends: 'Positive'
    },
    recommendations: [
      'Focus on customers with vehicles due for MOT in next 30 days',
      'WhatsApp engagement rate is 85% - continue using this channel',
      'Peak service times: Tuesday-Thursday 10am-2pm'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    platform: 'ProSearch Intelligence',
    company: 'ELI MOTORS LTD',
    tunnel: {
      type: 'Professional ngrok',
      domain: 'pro-search.eu.ngrok.io',
      features: ['Reserved Domain', 'HTTPS', 'Analytics', 'Priority Support']
    },
    uptime: '99.9%',
    lastUpdated: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔍 ProSearch Intelligence starting...`);
  console.log(`🏢 ELI MOTORS LTD - Intelligence Platform`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  console.log(`🌐 Professional Tunnel: https://pro-search.eu.ngrok.io`);
  console.log(`✅ Server running on port ${PORT}`);
});
