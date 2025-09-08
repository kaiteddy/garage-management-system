import { NextResponse } from 'next/server';
import { getMinimaxClient } from '@/lib/minimax-client';
import { sql } from '@/lib/database/neon-client';

/**
 * AI-Powered MOT Reminder Generator
 * POST /api/minimax/automotive/mot-reminder
 * 
 * Generate personalized MOT reminders using Minimax AI
 * Creates both text and speech versions for multi-channel communication
 */
export async function POST(request: Request) {
  try {
    console.log('[MINIMAX-MOT-REMINDER] Processing MOT reminder generation...');
    
    const body = await request.json();
    const { 
      vehicle_id, 
      registration, 
      reminder_type = 'standard',
      include_speech = false,
      voice_id = 'male-qn-qingse',
      urgency_level = 'normal'
    } = body;

    // Validate input
    if (!vehicle_id && !registration) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either vehicle_id or registration is required' 
        },
        { status: 400 }
      );
    }

    // Get vehicle and customer data
    let vehicleQuery;
    if (vehicle_id) {
      vehicleQuery = await sql`
        SELECT v.*, c.first_name, c.last_name, c.email, c.phone
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.id
        WHERE v.id = ${vehicle_id}
      `;
    } else {
      vehicleQuery = await sql`
        SELECT v.*, c.first_name, c.last_name, c.email, c.phone
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.id
        WHERE v.registration = ${registration}
      `;
    }

    if (vehicleQuery.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Vehicle not found' 
        },
        { status: 404 }
      );
    }

    const vehicleData = vehicleQuery[0];

    // Calculate days until MOT expiry
    const motExpiryDate = new Date(vehicleData.mot_expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((motExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get recent service history for context
    const recentServices = await sql`
      SELECT date, description
      FROM documents
      WHERE vehicle_id = ${vehicleData.id}
      ORDER BY date DESC
      LIMIT 3
    `;

    const minimaxClient = getMinimaxClient();

    // Determine urgency and tone based on days until expiry
    let urgencyContext = '';
    if (daysUntilExpiry < 0) {
      urgencyContext = 'URGENT: MOT has expired';
      urgency_level = 'critical';
    } else if (daysUntilExpiry <= 7) {
      urgencyContext = 'URGENT: MOT expires very soon';
      urgency_level = 'high';
    } else if (daysUntilExpiry <= 30) {
      urgencyContext = 'MOT expires soon';
      urgency_level = 'medium';
    } else {
      urgencyContext = 'MOT renewal reminder';
      urgency_level = 'normal';
    }

    // Generate text reminder
    const customerData = {
      firstName: vehicleData.first_name,
      lastName: vehicleData.last_name,
      email: vehicleData.email,
      phone: vehicleData.phone
    };

    const vehicleInfo = {
      registration: vehicleData.registration,
      make: vehicleData.make,
      model: vehicleData.model,
      motExpiryDate: vehicleData.mot_expiry_date,
      daysUntilExpiry: daysUntilExpiry
    };

    const textReminder = await minimaxClient.generateMOTReminder(vehicleInfo, customerData);

    let speechReminder = null;
    let audioFile = null;

    // Generate speech version if requested
    if (include_speech) {
      console.log('[MINIMAX-MOT-REMINDER] Generating speech version...');
      
      // Create a speech-optimized version of the reminder
      const speechMessages = [
        {
          role: 'system' as const,
          content: `Create a clear, professional phone message for MOT reminders. 
          Use natural speech patterns, appropriate pauses, and clear pronunciation.
          Keep it concise but informative. Include phone number spelled out clearly.`
        },
        {
          role: 'user' as const,
          content: `Create a phone message version of this MOT reminder:
          
          Customer: ${customerData.firstName} ${customerData.lastName}
          Vehicle: ${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.registration})
          MOT Status: ${urgencyContext}
          Days until expiry: ${daysUntilExpiry}
          
          Make it sound natural for a phone call. Include:
          - Greeting with business name "ELI MOTORS LTD"
          - Vehicle and MOT information
          - Clear call to action
          - Phone number: 0208 203 6449 (spell it out clearly)
          - Professional closing`
        }
      ];

      const speechTextResponse = await minimaxClient.generateText({ 
        messages: speechMessages 
      });
      
      const speechText = speechTextResponse.choices[0]?.message?.content;
      
      if (speechText) {
        const speechResult = await minimaxClient.generateSpeech({
          text: speechText,
          voice_id: voice_id,
          speed: 0.9, // Slightly slower for clarity
          vol: 1.0,
          format: 'mp3'
        });
        
        speechReminder = speechText;
        audioFile = speechResult.audio_file;
      }
    }

    // Determine communication channel recommendations
    const channelRecommendations = [];
    
    if (vehicleData.phone) {
      if (urgency_level === 'critical' || urgency_level === 'high') {
        channelRecommendations.push('phone_call', 'sms');
      } else {
        channelRecommendations.push('sms');
      }
    }
    
    if (vehicleData.email) {
      channelRecommendations.push('email');
    }

    console.log('[MINIMAX-MOT-REMINDER] MOT reminder generated successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        vehicle: {
          id: vehicleData.id,
          registration: vehicleData.registration,
          make: vehicleData.make,
          model: vehicleData.model
        },
        customer: {
          name: `${vehicleData.first_name} ${vehicleData.last_name}`,
          email: vehicleData.email,
          phone: vehicleData.phone
        },
        mot_status: {
          expiry_date: vehicleData.mot_expiry_date,
          days_until_expiry: daysUntilExpiry,
          urgency_level: urgency_level,
          is_expired: daysUntilExpiry < 0,
          is_critical: daysUntilExpiry <= 7
        },
        reminders: {
          text: textReminder,
          speech: speechReminder,
          audio_file: audioFile
        },
        communication: {
          recommended_channels: channelRecommendations,
          urgency_context: urgencyContext,
          send_immediately: urgency_level === 'critical' || urgency_level === 'high'
        },
        recent_services: recentServices.map(service => ({
          date: service.date,
          description: service.description
        }))
      },
      metadata: {
        generated_at: new Date().toISOString(),
        ai_model: 'Minimax M1',
        speech_model: include_speech ? 'Minimax Speech-02' : null,
        voice_id: include_speech ? voice_id : null,
        reminder_type: reminder_type,
        urgency_level: urgency_level
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MINIMAX-MOT-REMINDER] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate MOT reminder',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
