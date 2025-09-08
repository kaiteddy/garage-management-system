import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function simpleLiveTracker() {
  const sql = neon(process.env.DATABASE_URL);
  
  let lastCount = 60180;
  const targetTotal = 90062;
  const startCount = 57195;

  console.log('🔴 SIMPLE LIVE IMPORT TRACKER');
  console.log('=============================');
  console.log('Updates every 15 seconds...\n');

  setInterval(async () => {
    try {
      const stats = await sql`
        SELECT 
          COUNT(*) as total_items,
          SUM(total_amount) as total_value,
          COUNT(CASE WHEN line_type = '2' AND total_amount > 0 THEN 1 END) as parts_count
        FROM line_items
      `;

      const current = parseInt(stats[0].total_items);
      const percentage = (current / targetTotal * 100);
      const totalNew = current - startCount;
      const recentNew = current - lastCount;
      lastCount = current;

      // Progress bar
      const width = 40;
      const filled = Math.floor((percentage / 100) * width);
      const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);

      console.clear();
      console.log('🔴 SIMPLE LIVE IMPORT TRACKER');
      console.log('=============================');
      console.log(`[${bar}] ${percentage.toFixed(1)}%`);
      console.log('');
      console.log(`📦 Records: ${current.toLocaleString()} / ${targetTotal.toLocaleString()}`);
      console.log(`💰 Value: £${parseFloat(stats[0].total_value).toLocaleString()}`);
      console.log(`🔧 Parts: ${stats[0].parts_count.toLocaleString()}`);
      console.log(`📈 Total New: +${totalNew.toLocaleString()}`);
      console.log(`🔄 Recent: +${recentNew}`);
      console.log('');
      
      if (current >= targetTotal) {
        console.log('🎉 ✅ IMPORT COMPLETE! ✅');
        process.exit(0);
      } else if (percentage >= 95) {
        console.log('🔥 95%+ COMPLETE!');
      } else if (recentNew > 0) {
        console.log('🚀 IMPORT ACTIVE!');
      } else if (totalNew > 2500) {
        console.log('✅ MAJOR SUCCESS!');
      } else {
        console.log('⚡ Monitoring...');
      }

      console.log(`\n⏰ ${new Date().toLocaleTimeString()}`);
      console.log('Press Ctrl+C to stop');

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }, 15000); // Every 15 seconds
}

simpleLiveTracker();
