import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrateExistingPartsData() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔄 Starting migration of existing parts data to pricing history...');

    // Step 1: Check what data sources we have
    console.log('📊 Analyzing existing data sources...');
    
    // Check document_line_items for parts data
    const docLineItemsCount = await sql`SELECT COUNT(*) as count FROM document_line_items WHERE item_type = 'Parts'`;
    console.log(`📦 Document line items (Parts): ${docLineItemsCount[0].count}`);

    // Check line_items for all data
    const lineItemsCount = await sql`SELECT COUNT(*) as count FROM line_items`;
    console.log(`📦 Line items (All): ${lineItemsCount[0].count}`);

    // Step 2: Migrate from document_line_items if available
    if (docLineItemsCount[0].count > 0) {
      console.log('🔄 Migrating from document_line_items...');
      
      const partsFromDocs = await sql`
        SELECT 
          dli.*,
          d.created_at as document_date,
          d.id as document_id,
          d.type as document_type
        FROM document_line_items dli
        JOIN documents d ON dli.document_id = d.id
        WHERE dli.item_type = 'Parts' AND dli.description IS NOT NULL
        ORDER BY d.created_at DESC
      `;

      console.log(`📦 Found ${partsFromDocs.length} parts to migrate from documents`);

      for (const part of partsFromDocs) {
        try {
          // Generate part number from description
          const partNumber = part.description
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 20);

          // Insert into parts_master if not exists
          await sql`
            INSERT INTO parts_master (part_number, part_name, description)
            VALUES (${partNumber}, ${part.description}, ${part.description})
            ON CONFLICT (part_number) DO NOTHING
          `;

          // Insert into parts_pricing_history
          await sql`
            INSERT INTO parts_pricing_history (
              part_number,
              part_name,
              price_charged,
              quantity_sold,
              date_sold,
              job_sheet_id,
              customer_type,
              notes
            ) VALUES (
              ${partNumber},
              ${part.description},
              ${part.net_price || 0},
              ${part.qty || 1},
              ${part.document_date || new Date().toISOString()},
              ${part.document_id},
              'retail',
              ${`Migrated from ${part.document_type || 'document'}`}
            )
          `;

          console.log(`✅ Migrated: ${part.description} - £${part.net_price}`);

        } catch (error) {
          console.error(`❌ Error migrating part ${part.description}:`, error.message);
        }
      }
    }

    // Step 3: Migrate from line_items if available
    if (lineItemsCount[0].count > 0) {
      console.log('🔄 Migrating from line_items...');

      // Get items that look like parts (not pure labour)
      const partsFromLineItems = await sql`
        SELECT *
        FROM line_items
        WHERE description IS NOT NULL
        AND description NOT ILIKE '%labour%'
        AND unit_price > 0
        ORDER BY id DESC
      `;

      console.log(`📦 Found ${partsFromLineItems.length} parts/services to migrate from line_items`);

      for (const part of partsFromLineItems) {
        try {
          // Generate part number from description
          const partNumber = part.description
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 20);

          // Insert into parts_master if not exists
          await sql`
            INSERT INTO parts_master (part_number, part_name, description)
            VALUES (${partNumber}, ${part.description}, ${part.description})
            ON CONFLICT (part_number) DO NOTHING
          `;

          // Insert into parts_pricing_history
          await sql`
            INSERT INTO parts_pricing_history (
              part_number,
              part_name,
              price_charged,
              quantity_sold,
              date_sold,
              job_sheet_id,
              customer_type,
              notes
            ) VALUES (
              ${partNumber},
              ${part.description},
              ${part.unit_price || 0},
              ${part.quantity || 1},
              ${new Date().toISOString()},
              ${part.document_id || part.id},
              'retail',
              'Migrated from line_items'
            )
          `;

          console.log(`✅ Migrated: ${part.description} - £${part.unit_price}`);

        } catch (error) {
          console.error(`❌ Error migrating part ${part.description}:`, error.message);
        }
      }
    }

    // Step 4: Calculate analytics for migrated data
    console.log('📊 Calculating analytics for migrated data...');
    
    const uniqueParts = await sql`
      SELECT DISTINCT part_number 
      FROM parts_pricing_history
    `;

    for (const part of uniqueParts) {
      try {
        await sql`
          INSERT INTO parts_pricing_analytics (
            part_number,
            part_name,
            current_suggested_price,
            average_price_all_time,
            most_recent_price,
            most_recent_sale_date,
            highest_price,
            lowest_price,
            total_sales_count,
            total_quantity_sold,
            total_revenue,
            last_calculated
          )
          SELECT 
            part_number,
            part_name,
            AVG(price_charged) as current_suggested_price,
            AVG(price_charged) as average_price_all_time,
            (SELECT price_charged FROM parts_pricing_history p2 WHERE p2.part_number = p1.part_number ORDER BY date_sold DESC LIMIT 1) as most_recent_price,
            (SELECT date_sold FROM parts_pricing_history p2 WHERE p2.part_number = p1.part_number ORDER BY date_sold DESC LIMIT 1) as most_recent_sale_date,
            MAX(price_charged) as highest_price,
            MIN(price_charged) as lowest_price,
            COUNT(*) as total_sales_count,
            SUM(quantity_sold) as total_quantity_sold,
            SUM(price_charged * quantity_sold) as total_revenue,
            CURRENT_TIMESTAMP as last_calculated
          FROM parts_pricing_history p1
          WHERE part_number = ${part.part_number}
          GROUP BY part_number, part_name
          ON CONFLICT (part_number) DO UPDATE SET
            current_suggested_price = EXCLUDED.current_suggested_price,
            average_price_all_time = EXCLUDED.average_price_all_time,
            most_recent_price = EXCLUDED.most_recent_price,
            most_recent_sale_date = EXCLUDED.most_recent_sale_date,
            highest_price = EXCLUDED.highest_price,
            lowest_price = EXCLUDED.lowest_price,
            total_sales_count = EXCLUDED.total_sales_count,
            total_quantity_sold = EXCLUDED.total_quantity_sold,
            total_revenue = EXCLUDED.total_revenue,
            last_calculated = EXCLUDED.last_calculated
        `;
      } catch (error) {
        console.error(`❌ Error calculating analytics for ${part.part_number}:`, error.message);
      }
    }

    // Step 5: Summary
    console.log('📊 Migration Summary:');
    
    const finalCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM parts_master) as total_parts,
        (SELECT COUNT(*) FROM parts_pricing_history) as total_history_records,
        (SELECT COUNT(*) FROM parts_pricing_analytics) as total_analytics_records
    `;

    console.log(`✅ Parts Master: ${finalCounts[0].total_parts} parts`);
    console.log(`✅ Pricing History: ${finalCounts[0].total_history_records} records`);
    console.log(`✅ Analytics: ${finalCounts[0].total_analytics_records} parts analyzed`);

    // Show top parts by usage
    const topParts = await sql`
      SELECT 
        part_name,
        total_sales_count,
        average_price_all_time,
        total_revenue
      FROM parts_pricing_analytics
      ORDER BY total_sales_count DESC
      LIMIT 10
    `;

    if (topParts.length > 0) {
      console.log('\\n🏆 Top 10 parts by usage:');
      topParts.forEach((part, index) => {
        console.log(`${index + 1}. ${part.part_name}`);
        console.log(`   Used ${part.total_sales_count} times | Avg: £${parseFloat(part.average_price_all_time).toFixed(2)} | Revenue: £${parseFloat(part.total_revenue).toFixed(2)}`);
      });
    }

    console.log('\\n🎉 Migration completed successfully!');
    console.log('💡 The parts pricing history system is now populated with your existing data.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the migration
migrateExistingPartsData();
