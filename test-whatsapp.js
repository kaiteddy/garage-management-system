#!/usr/bin/env node

// Test WhatsApp functionality for ELI MOTORS LTD

const testWhatsApp = async () => {
  console.log('🚗 Testing ELI MOTORS LTD WhatsApp Integration...\n');

  // Test 1: WhatsApp Sandbox Test
  console.log('📱 Test 1: WhatsApp Sandbox Test');
  try {
    const response = await fetch('https://garage-manager.eu.ngrok.io/api/whatsapp-sandbox-test', {
      method: 'POST'
    });
    const result = await response.json();

    if (result.success) {
      console.log('✅ Sandbox test successful!');
      console.log(`   Message SID: ${result.message_sid}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   From: ${result.sandbox_info.from}`);
      console.log(`   To: ${result.sandbox_info.to}`);
    } else {
      console.log('❌ Sandbox test failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Error testing sandbox:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: MOT Reminder Message
  console.log('📅 Test 2: MOT Reminder Message');
  try {
    const motMessage = {
      to: '+447843275372',
      message: `🚗 ELI MOTORS LTD - MOT Reminder

📅 Your vehicle MOT expires soon!

🔍 Vehicle: Test Vehicle
📍 Registration: AB12 CDE
⏰ MOT Due: 25th July 2025

📞 Book now: 0208 203 6449
🌐 Check MOT: https://garage-manager.eu.ngrok.io/mot-check

📱 Reply STOP to opt out
🏢 ELI MOTORS LTD - Serving Hendon since 1979`
    };

    const response = await fetch('https://garage-manager.eu.ngrok.io/api/sms/test-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(motMessage)
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ MOT reminder sent successfully!');
      console.log(`   Message SID: ${result.message_sid}`);
      console.log(`   Channel: ${result.channel}`);
    } else {
      console.log('❌ MOT reminder failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Error sending MOT reminder:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: WhatsApp Business Status
  console.log('🏢 Test 3: WhatsApp Business Status');
  try {
    const response = await fetch('https://garage-manager.eu.ngrok.io/api/whatsapp-business-status', {
      method: 'POST'
    });
    const result = await response.json();

    console.log('📊 Current Status:');
    console.log(`   Twilio Account: ${result.current_status.twilio_account}`);
    console.log(`   Business Number: ${result.current_status.business_number}`);
    console.log(`   SMS Capability: ${result.current_status.sms_capability}`);
    console.log(`   WhatsApp Sandbox: ${result.current_status.whatsapp_sandbox}`);
    console.log(`   WhatsApp Business: ${result.current_status.whatsapp_business_sender}`);

    console.log('\n🎯 Next Steps:');
    result.required_steps.forEach((step, index) => {
      console.log(`   ${step.step}. ${step.action}`);
      console.log(`      ${step.description}`);
    });

  } catch (error) {
    console.log('❌ Error checking business status:', error.message);
  }

  console.log('\n🎉 WhatsApp Integration Test Complete!');
  console.log('📱 Check your phone (+447843275372) for test messages');
  console.log('🌐 Visit: https://garage-manager.eu.ngrok.io/whatsapp-management');
};

// Run the test
testWhatsApp().catch(console.error);
