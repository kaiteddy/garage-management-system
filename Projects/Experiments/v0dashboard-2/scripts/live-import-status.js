require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function getLiveStatus() {
  try {
    console.clear();
    console.log('🔴 LIVE IMPORT STATUS MONITOR');
    console.log('============================');
    console.log(`⏰ ${new Date().toLocaleTimeString()}\n`);

    // Get current counts
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned
    `;

    const current = stats[0];
    
    // Target numbers from GA4 Export
    const targets = {
      customers: 7143,
      vehicles: 10550,
      documents: 33196
    };

    // Calculate progress percentages
    const customerProgress = Math.round((current.customers / targets.customers) * 100);
    const vehicleProgress = Math.round((current.vehicles / targets.vehicles) * 100);
    const documentProgress = Math.round((current.documents / targets.documents) * 100);

    console.log('📊 IMPORT PROGRESS:');
    console.log('');
    
    // Customer progress bar
    const customerBar = createProgressBar(customerProgress);
    console.log(`👥 CUSTOMERS: ${current.customers.toLocaleString()}/${targets.customers.toLocaleString()} (${customerProgress}%)`);
    console.log(`   ${customerBar}`);
    console.log('');

    // Vehicle progress bar
    const vehicleBar = createProgressBar(vehicleProgress);
    console.log(`🚗 VEHICLES: ${current.vehicles.toLocaleString()}/${targets.vehicles.toLocaleString()} (${vehicleProgress}%)`);
    console.log(`   ${vehicleBar}`);
    if (current.vehicles > 0) {
      const assignmentPercent = Math.round((current.vehicles_assigned / current.vehicles) * 100);
      console.log(`   🔗 Assigned to customers: ${current.vehicles_assigned.toLocaleString()} (${assignmentPercent}%)`);
    }
    console.log('');

    // Document progress bar
    const documentBar = createProgressBar(documentProgress);
    console.log(`📄 DOCUMENTS: ${current.documents.toLocaleString()}/${targets.documents.toLocaleString()} (${documentProgress}%)`);
    console.log(`   ${documentBar}`);
    console.log('');

    // Overall progress
    const totalCurrent = current.customers + current.vehicles + current.documents;
    const totalTarget = targets.customers + targets.vehicles + targets.documents;
    const overallProgress = Math.round((totalCurrent / totalTarget) * 100);
    
    console.log('🎯 OVERALL PROGRESS:');
    const overallBar = createProgressBar(overallProgress);
    console.log(`   ${totalCurrent.toLocaleString()}/${totalTarget.toLocaleString()} records (${overallProgress}%)`);
    console.log(`   ${overallBar}`);
    console.log('');

    // Status indicators
    console.log('📈 STATUS INDICATORS:');
    
    if (customerProgress >= 100) {
      console.log('   ✅ Customer import: COMPLETE');
    } else if (customerProgress >= 50) {
      console.log('   🔄 Customer import: IN PROGRESS (good progress)');
    } else if (customerProgress > 0) {
      console.log('   🔄 Customer import: IN PROGRESS (early stage)');
    } else {
      console.log('   ⏳ Customer import: NOT STARTED');
    }

    if (vehicleProgress >= 100) {
      console.log('   ✅ Vehicle import: COMPLETE');
    } else if (vehicleProgress > 0) {
      console.log('   🔄 Vehicle import: IN PROGRESS');
    } else {
      console.log('   ⏳ Vehicle import: NOT STARTED');
    }

    if (documentProgress >= 100) {
      console.log('   ✅ Document import: COMPLETE');
    } else if (documentProgress > 0) {
      console.log('   🔄 Document import: IN PROGRESS');
    } else {
      console.log('   ⏳ Document import: NOT STARTED');
    }

    console.log('');

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (customerProgress < 100) {
      console.log('   🔧 Continue running customer import fix');
      const remaining = targets.customers - current.customers;
      console.log(`   📊 ${remaining.toLocaleString()} customers remaining`);
    } else if (vehicleProgress < 100) {
      console.log('   🚗 Start vehicle import with customer assignments');
    } else if (documentProgress < 100) {
      console.log('   📄 Start document import with relationships');
    } else {
      console.log('   🎉 All imports complete! Ready for WhatsApp integration!');
    }

    console.log('');
    console.log('🔄 Refreshing in 10 seconds... (Ctrl+C to stop)');

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

function createProgressBar(percentage, width = 40) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let bar = '[';
  bar += '█'.repeat(filled);
  bar += '░'.repeat(empty);
  bar += ']';
  
  // Color coding
  if (percentage >= 100) {
    return `🟢 ${bar} COMPLETE`;
  } else if (percentage >= 75) {
    return `🟡 ${bar} ${percentage}%`;
  } else if (percentage >= 25) {
    return `🟠 ${bar} ${percentage}%`;
  } else if (percentage > 0) {
    return `🔴 ${bar} ${percentage}%`;
  } else {
    return `⚫ ${bar} 0%`;
  }
}

// Run live monitoring
async function startLiveMonitoring() {
  console.log('🚀 Starting live import status monitoring...');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  // Initial status
  await getLiveStatus();
  
  // Update every 10 seconds
  const interval = setInterval(async () => {
    await getLiveStatus();
  }, 10000);

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n👋 Live monitoring stopped');
    clearInterval(interval);
    process.exit(0);
  });
}

startLiveMonitoring();
