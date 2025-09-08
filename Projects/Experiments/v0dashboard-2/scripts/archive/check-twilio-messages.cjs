#!/usr/bin/env node

// Check Twilio for incoming messages to business number
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC1572c0e5e4b55bb7440c3d9da482fd36';
const authToken = process.env.TWILIO_AUTH_TOKEN || '70abf8e7b760180b3a02ae0478b101a8';
const businessNumber = '+447488896449';

const client = twilio(accountSid, authToken);

async function checkIncomingMessages() {
  console.log('🔍 Checking Twilio for incoming messages to', businessNumber);
  console.log('⏰ Looking for messages in the last 30 minutes...\n');

  try {
    // Check for incoming messages to the business number
    const messages = await client.messages.list({
      to: businessNumber,
      limit: 20,
      dateSentAfter: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
    });

    if (messages.length > 0) {
      console.log(`📱 Found ${messages.length} recent incoming message(s):\n`);
      
      messages.forEach((message, index) => {
        console.log(`📨 Message ${index + 1}:`);
        console.log(`   📅 Received: ${message.dateCreated}`);
        console.log(`   📞 From: ${message.from}`);
        console.log(`   📱 To: ${message.to}`);
        console.log(`   💬 Body: ${message.body}`);
        console.log(`   📊 Status: ${message.status}`);
        console.log(`   🆔 SID: ${message.sid}`);
        console.log();

        // Check if this looks like a verification code
        if (message.body && /\b\d{6}\b/.test(message.body)) {
          const codeMatch = message.body.match(/\b(\d{6})\b/);
          if (codeMatch) {
            console.log(`🎯 POTENTIAL VERIFICATION CODE FOUND: ${codeMatch[1]}`);
            console.log(`   📱 From: ${message.from}`);
            console.log(`   📅 Time: ${message.dateCreated}`);
            console.log();
          }
        }
      });
    } else {
      console.log('❌ No incoming messages found in the last 30 minutes');
      console.log('\n💡 Possible reasons:');
      console.log('   1. Code is still being delivered (can take 1-5 minutes)');
      console.log('   2. Code was sent to a different number');
      console.log('   3. Message was filtered by carrier');
      console.log('   4. Facebook is using a different delivery method');
      console.log('\n🔄 You can try:');
      console.log('   1. Wait a few more minutes and run this check again');
      console.log('   2. Request a new code in Facebook (after the timer expires)');
      console.log('   3. Check if you have access to the physical phone +447488896449');
    }

    // Also check all recent messages (not just to business number)
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Checking ALL recent incoming messages...\n');

    const allMessages = await client.messages.list({
      limit: 10,
      dateSentAfter: new Date(Date.now() - 30 * 60 * 1000)
    });

    const incomingMessages = allMessages.filter(msg => 
      msg.direction === 'inbound' || 
      msg.from.includes('facebook') || 
      msg.from.includes('meta') ||
      /\b\d{6}\b/.test(msg.body)
    );

    if (incomingMessages.length > 0) {
      console.log(`📨 Found ${incomingMessages.length} potentially relevant message(s):`);
      incomingMessages.forEach((msg, index) => {
        console.log(`\n📱 Message ${index + 1}:`);
        console.log(`   📞 From: ${msg.from} → To: ${msg.to}`);
        console.log(`   💬 Body: ${msg.body}`);
        console.log(`   📅 Time: ${msg.dateCreated}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking messages:', error.message);
  }
}

checkIncomingMessages();
