#!/usr/bin/env tsx

/**
 * Minimax Integration Test Script
 * Tests all Minimax AI capabilities in GarageManager Pro
 * 
 * Usage: npm run test:minimax
 */

import { getMinimaxClient } from '../lib/minimax-client';

async function testMinimaxIntegration() {
  console.log('🤖 Testing Minimax AI Integration for GarageManager Pro');
  console.log('=' .repeat(60));

  try {
    const minimaxClient = getMinimaxClient();
    console.log('✅ Minimax client initialized successfully');

    // Test 1: Text Generation
    console.log('\n📝 Testing Text Generation...');
    try {
      const textResponse = await minimaxClient.generateText({
        messages: [
          {
            role: 'system',
            content: 'You are an automotive service advisor for ELI MOTORS LTD.'
          },
          {
            role: 'user',
            content: 'Generate a brief welcome message for new customers visiting our garage.'
          }
        ],
        max_tokens: 200
      });

      console.log('✅ Text generation successful');
      console.log('Generated text:', textResponse.choices[0]?.message?.content?.substring(0, 100) + '...');
      console.log('Tokens used:', textResponse.usage?.total_tokens);
    } catch (error) {
      console.error('❌ Text generation failed:', error);
    }

    // Test 2: Speech Generation
    console.log('\n🎤 Testing Speech Generation...');
    try {
      const speechResponse = await minimaxClient.generateSpeech({
        text: 'Hello, this is ELI MOTORS LTD. Your MOT is due for renewal soon. Please call us at 0208 203 6449 to book your appointment.',
        voice_id: 'male-qn-qingse',
        format: 'mp3'
      });

      console.log('✅ Speech generation successful');
      console.log('Audio file size:', speechResponse.audio_file?.length || 0, 'characters (base64)');
      console.log('Trace ID:', speechResponse.trace_id);
    } catch (error) {
      console.error('❌ Speech generation failed:', error);
    }

    // Test 3: Video Generation (initiate only)
    console.log('\n🎬 Testing Video Generation...');
    try {
      const videoResponse = await minimaxClient.generateVideo({
        prompt: 'A professional automotive garage with mechanics working on cars, modern equipment, clean environment, ELI MOTORS branding visible',
        prompt_optimizer: true
      });

      console.log('✅ Video generation initiated successfully');
      console.log('Task ID:', videoResponse.task_id);
      console.log('Status:', videoResponse.status);
      
      // Check status after a brief delay
      setTimeout(async () => {
        try {
          const statusResponse = await minimaxClient.checkVideoStatus(videoResponse.task_id);
          console.log('Video status update:', statusResponse.status);
        } catch (error) {
          console.log('Video status check failed:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('❌ Video generation failed:', error);
    }

    // Test 4: Automotive Service Summary
    console.log('\n🔧 Testing Automotive Service Summary...');
    try {
      const mockVehicleData = {
        registration: 'AB12 CDE',
        make: 'Ford',
        model: 'Focus',
        year: 2018,
        motExpiryDate: '2025-08-15',
        mileage: 45000
      };

      const mockServiceHistory = [
        { date: '2024-12-01', description: 'Annual service and oil change' },
        { date: '2024-08-15', description: 'MOT test - passed with advisories' },
        { date: '2024-06-10', description: 'Brake pad replacement' }
      ];

      const serviceSummary = await minimaxClient.generateServiceSummary(mockVehicleData, mockServiceHistory);
      
      console.log('✅ Service summary generation successful');
      console.log('Summary preview:', serviceSummary.substring(0, 150) + '...');
    } catch (error) {
      console.error('❌ Service summary generation failed:', error);
    }

    // Test 5: MOT Reminder Generation
    console.log('\n📅 Testing MOT Reminder Generation...');
    try {
      const mockVehicleData = {
        registration: 'XY98 ZAB',
        make: 'Vauxhall',
        model: 'Corsa',
        motExpiryDate: '2025-08-01',
        daysUntilExpiry: 10
      };

      const mockCustomerData = {
        firstName: 'John',
        lastName: 'Smith'
      };

      const motReminder = await minimaxClient.generateMOTReminder(mockVehicleData, mockCustomerData);
      
      console.log('✅ MOT reminder generation successful');
      console.log('Reminder preview:', motReminder.substring(0, 150) + '...');
    } catch (error) {
      console.error('❌ MOT reminder generation failed:', error);
    }

    console.log('\n🎉 Minimax Integration Test Complete!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Minimax integration test failed:', error);
    process.exit(1);
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Test dashboard endpoint
  try {
    const dashboardResponse = await fetch(`${baseUrl}/api/minimax/dashboard`);
    if (dashboardResponse.ok) {
      console.log('✅ Dashboard endpoint working');
    } else {
      console.log('❌ Dashboard endpoint failed:', dashboardResponse.status);
    }
  } catch (error) {
    console.log('❌ Dashboard endpoint error:', error);
  }

  // Test text endpoint info
  try {
    const textInfoResponse = await fetch(`${baseUrl}/api/minimax/text`);
    if (textInfoResponse.ok) {
      console.log('✅ Text endpoint info working');
    } else {
      console.log('❌ Text endpoint info failed:', textInfoResponse.status);
    }
  } catch (error) {
    console.log('❌ Text endpoint info error:', error);
  }

  // Test speech endpoint info
  try {
    const speechInfoResponse = await fetch(`${baseUrl}/api/minimax/speech`);
    if (speechInfoResponse.ok) {
      console.log('✅ Speech endpoint info working');
    } else {
      console.log('❌ Speech endpoint info failed:', speechInfoResponse.status);
    }
  } catch (error) {
    console.log('❌ Speech endpoint info error:', error);
  }
}

// Environment check
function checkEnvironment() {
  console.log('\n🔧 Environment Configuration Check...');
  
  const requiredEnvVars = [
    'MINIMAX_API_KEY',
    'MINIMAX_TEXT_API_URL',
    'MINIMAX_SPEECH_API_URL',
    'MINIMAX_VIDEO_API_URL'
  ];

  let allConfigured = true;
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Configured`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      allConfigured = false;
    }
  });

  if (!allConfigured) {
    console.log('\n⚠️  Some environment variables are missing. Please check your .env.local file.');
    return false;
  }

  console.log('\n✅ All environment variables configured correctly');
  return true;
}

// Main execution
async function main() {
  console.log('🚀 Starting Minimax Integration Tests for GarageManager Pro');
  console.log('🏢 ELI MOTORS LTD - Advanced AI Integration');
  console.log('=' .repeat(60));

  // Check environment first
  if (!checkEnvironment()) {
    console.log('\n❌ Environment check failed. Exiting...');
    process.exit(1);
  }

  // Run integration tests
  await testMinimaxIntegration();
  
  // Test API endpoints (if server is running)
  await testAPIEndpoints();

  console.log('\n🎯 All tests completed!');
  console.log('📊 Check the output above for any failures');
  console.log('🔗 Visit /api/minimax/dashboard for full integration overview');
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { testMinimaxIntegration, testAPIEndpoints, checkEnvironment };
