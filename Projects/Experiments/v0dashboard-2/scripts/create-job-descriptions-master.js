import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createJobDescriptionsMaster() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔧 Creating job_descriptions_master table...');

    // Create job descriptions master table
    await sql`
      CREATE TABLE IF NOT EXISTS job_descriptions_master (
        id SERIAL PRIMARY KEY,
        canonical_description TEXT NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        work_type VARCHAR(50) NOT NULL DEFAULT 'other',
        description_variations TEXT[] DEFAULT '{}',
        total_usage_count INTEGER DEFAULT 0,
        average_price DECIMAL(10,2) DEFAULT 0,
        price_range_min DECIMAL(10,2) DEFAULT 0,
        price_range_max DECIMAL(10,2) DEFAULT 0,
        last_used_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ job_descriptions_master table created');

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_category 
      ON job_descriptions_master(category)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_work_type 
      ON job_descriptions_master(work_type)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_canonical 
      ON job_descriptions_master(canonical_description)
    `;

    console.log('✅ Indexes created');

    // Create job analytics table for business intelligence
    await sql`
      CREATE TABLE IF NOT EXISTS job_analytics (
        id SERIAL PRIMARY KEY,
        canonical_description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        work_type VARCHAR(50) NOT NULL,
        time_period VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        job_count INTEGER DEFAULT 0,
        total_revenue DECIMAL(12,2) DEFAULT 0,
        average_price DECIMAL(10,2) DEFAULT 0,
        min_price DECIMAL(10,2) DEFAULT 0,
        max_price DECIMAL(10,2) DEFAULT 0,
        unique_customers INTEGER DEFAULT 0,
        repeat_customers INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(canonical_description, time_period, period_start)
      )
    `;

    console.log('✅ job_analytics table created');

    // Populate with initial data from existing line_items
    console.log('📊 Analyzing existing job descriptions...');

    const existingJobs = await sql`
      SELECT 
        description,
        COUNT(*) as usage_count,
        AVG(unit_price) as avg_price,
        MIN(unit_price) as min_price,
        MAX(unit_price) as max_price,
        MAX(created_at) as last_used
      FROM line_items 
      WHERE total_amount > 0
      AND description IS NOT NULL
      AND LENGTH(description) > 3
      GROUP BY description
      HAVING COUNT(*) >= 2
      ORDER BY usage_count DESC
      LIMIT 50
    `;

    console.log(`📋 Found ${existingJobs.length} job descriptions to categorize`);

    // Categorization logic
    const categorizeJob = (description) => {
      const desc = description.toLowerCase();
      
      if (desc.includes('mechanical') || desc.includes('engine') || desc.includes('transmission')) {
        return { category: 'mechanical', workType: 'repair' };
      } else if (desc.includes('body') || desc.includes('paint') || desc.includes('panel')) {
        return { category: 'bodywork', workType: 'repair' };
      } else if (desc.includes('electrical') || desc.includes('wiring') || desc.includes('battery')) {
        return { category: 'electrical', workType: 'repair' };
      } else if (desc.includes('brake') || desc.includes('disc') || desc.includes('pad')) {
        return { category: 'braking', workType: 'replace' };
      } else if (desc.includes('service') || desc.includes('oil') || desc.includes('filter')) {
        return { category: 'service', workType: 'service' };
      } else if (desc.includes('diagnostic') || desc.includes('scan') || desc.includes('fault')) {
        return { category: 'diagnostic', workType: 'diagnostic' };
      } else if (desc.includes('labour') || desc.includes('labor')) {
        if (desc.includes('specialist')) return { category: 'specialist', workType: 'repair' };
        if (desc.includes('internal')) return { category: 'internal', workType: 'other' };
        return { category: 'general', workType: 'repair' };
      }
      
      return { category: 'general', workType: 'other' };
    };

    // Insert categorized jobs
    for (const job of existingJobs) {
      const { category, workType } = categorizeJob(job.description);
      
      try {
        await sql`
          INSERT INTO job_descriptions_master (
            canonical_description,
            category,
            work_type,
            total_usage_count,
            average_price,
            price_range_min,
            price_range_max,
            last_used_date
          ) VALUES (
            ${job.description},
            ${category},
            ${workType},
            ${job.usage_count},
            ${job.avg_price || 0},
            ${job.min_price || 0},
            ${job.max_price || 0},
            ${job.last_used || new Date()}
          )
          ON CONFLICT (canonical_description) DO UPDATE SET
            total_usage_count = EXCLUDED.total_usage_count,
            average_price = EXCLUDED.average_price,
            price_range_min = EXCLUDED.price_range_min,
            price_range_max = EXCLUDED.price_range_max,
            last_used_date = EXCLUDED.last_used_date,
            updated_at = NOW()
        `;
      } catch (error) {
        console.error(`Error inserting job: ${job.description}`, error.message);
      }
    }

    // Get summary statistics
    const summary = await sql`
      SELECT 
        category,
        COUNT(*) as job_types,
        SUM(total_usage_count) as total_jobs,
        AVG(average_price) as avg_price
      FROM job_descriptions_master
      GROUP BY category
      ORDER BY total_jobs DESC
    `;

    console.log('\n📊 Job Categories Summary:');
    summary.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.job_types} types, ${cat.total_jobs} total jobs, £${parseFloat(cat.avg_price).toFixed(2)} avg`);
    });

    const totalRecords = await sql`SELECT COUNT(*) as count FROM job_descriptions_master`;
    console.log(`\n✅ Successfully created job descriptions master with ${totalRecords[0].count} records`);

    console.log('\n🎉 Job descriptions master table setup complete!');
    console.log('💡 You can now use the Smart Job Description Matcher to consolidate variations');

  } catch (error) {
    console.error('❌ Failed to create job descriptions master:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the setup
createJobDescriptionsMaster();
