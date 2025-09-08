#!/usr/bin/env node

// Direct Test of Approved WhatsApp Template
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config({ path: '.env.local' });

async function testDirectTemplate() {
  console.log('🎯 Direct Test - Approved WhatsApp Template\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  
  // Template SID from the test results
  const templateSid = 'HX7989152000fc9771c99762c03f72785d';
  
  try {
    const client = twilio(accountSid, authToken);
    
    console.log('📱 Sending MOT reminder using approved template...');
    console.log(`   Template SID: ${templateSid}`);
    console.log(`   From: Eli Motors Ltd (${whatsappNumber})`);
    console.log(`   To: +447843275372`);
    console.log('');
    
    const templateMessage = await client.messages.create({
      from: whatsappNumber,
      to: 'whatsapp:+447843275372',
      contentSid: templateSid,
      contentVariables: JSON.stringify({
        "1": "John Smith",           // Customer name
        "2": "AB12 CDE",            // Vehicle registration  
        "3": "15th March 2025",     // MOT expiry date
        "4": "14"                   // Days remaining
      })
    });
    
    console.log('🎉 SUCCESS! Template message sent!');
    console.log(`   Message SID: ${templateMessage.sid}`);
    console.log(`   Status: ${templateMessage.status}`);
    console.log(`   Price: ${templateMessage.price || 'Calculating...'}`);
    console.log('');
    
    console.log('📱 Customer receives this message:');
    console.log('=' .repeat(45));
    console.log('🚗 *Eli Motors Ltd* - MOT Reminder');
    console.log('');
    console.log('Hi John Smith,');
    console.log('');
    console.log('Your vehicle AB12 CDE MOT expires on 15th March 2025 (14 days).');
    console.log('');
    console.log('📅 Book your MOT test today');
    console.log('📞 Call: 0208 203 6449');
    console.log('🌐 Visit: www.elimotors.co.uk');
    console.log('📍 Hendon, London');
    console.log('');
    console.log('✨ Serving Hendon since 1979 ✨');
    console.log('');
    console.log('Reply STOP to opt out.');
    console.log('=' .repeat(45));
    console.log('');
    
    console.log('✅ WHATSAPP BUSINESS INTEGRATION COMPLETE!');
    console.log('🎯 Ready to integrate into MOT reminder system');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.code === 63016) {
      console.log('');
      console.log('💡 This error means the template needs approval.');
      console.log('   Please submit for approval in Twilio Console.');
    } else if (error.code === 21211) {
      console.log('');
      console.log('💡 Invalid "To" number format.');
      console.log('   WhatsApp number must be verified.');
    } else {
      console.log('');
      console.log('🔍 Full error details:');
      console.log(error);
    }
  }
}

testDirectTemplate().catch(console.error);
