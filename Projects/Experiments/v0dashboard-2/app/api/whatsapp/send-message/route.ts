import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/whatsapp-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      to, 
      message, 
      customerId, 
      customerName, 
      messageType = 'customer_contact',
      urgencyLevel = 'medium',
      vehicleRegistration 
    } = body

    console.log(`[WHATSAPP-API] Sending message to ${customerName} (${to})`)
    console.log(`[WHATSAPP-API] Message content: ${message}`)

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and message are required'
      }, { status: 400 })
    }

    // Format phone number properly for Twilio
    let formattedTo = to.replace(/\s+/g, '').replace(/^\+/, '');
    if (!formattedTo.startsWith('44') && formattedTo.startsWith('0')) {
      formattedTo = '44' + formattedTo.substring(1); // Remove leading 0 and add UK country code
    } else if (!formattedTo.startsWith('44') && formattedTo.startsWith('7')) {
      formattedTo = '44' + formattedTo; // Add UK country code
    }

    // Ensure we have the + prefix for Twilio
    if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo;
    }

    console.log(`[WHATSAPP-API] Formatted phone number: ${to} -> ${formattedTo}`)

    // Send WhatsApp message using the existing WhatsApp service
    console.log(`[WHATSAPP-API] Sending to WhatsApp service with number: ${formattedTo}`)
    const result = await WhatsAppService.sendWhatsAppMessage({
      to: formattedTo,
      content: message,
      customerId: customerId,
      vehicleRegistration: vehicleRegistration,
      messageType: messageType
    })

    if (result.success) {
      console.log(`[WHATSAPP-API] ✅ Message sent successfully to ${customerName}`)
      
      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        conversationId: result.conversationId,
        cost: result.cost,
        channel: result.channel,
        message: 'WhatsApp message sent successfully'
      })
    } else {
      console.error(`[WHATSAPP-API] Failed to send message to ${customerName}:`, result.error)
      
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send WhatsApp message',
        channel: result.channel
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[WHATSAPP-API] Error in send-message endpoint:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while sending WhatsApp message'
    }, { status: 500 })
  }
}
